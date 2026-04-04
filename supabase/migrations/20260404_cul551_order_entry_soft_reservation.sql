-- Migration: CUL-551 Order Entry Soft Reservation
-- Purpose: Trigger-based soft inventory reservation when order_items are inserted
--          with a batch_id and the parent order is in an active status.
--          Releases on order cancel, order completion, item delete, or when a
--          package assignment takes over (hard reservation replaces soft hold).
--
-- Double-count prevention: fn_reserve_inventory_on_assignment releases the soft
-- hold BEFORE applying the hard package-level reservation, so reserved_qty is
-- never inflated by both mechanisms simultaneously.
--
-- Key tables:
--   order_item_soft_reservations  - tracks per-item soft holds (system-managed)
--   order_items.soft_reserved_qty - running total per line item (informational)
--   v_inventory_net_available     - view exposing net_available = available_qty
--
-- Movement audit: RESERVE / RELEASE movements are already bypassed in
-- fn_update_inventory_on_hand (kind-level guard), so they are audit-trail only.

-- ============================================================
-- 1. Tracking table
-- ============================================================
CREATE TABLE order_item_soft_reservations (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id     uuid        NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  inventory_item_id uuid        NOT NULL REFERENCES inventory_items(id),
  qty_reserved      numeric     NOT NULL CHECK (qty_reserved > 0),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_oisr_order_item_id     ON order_item_soft_reservations(order_item_id);
CREATE INDEX idx_oisr_inventory_item_id ON order_item_soft_reservations(inventory_item_id);

ALTER TABLE order_item_soft_reservations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read; all writes go through SECURITY DEFINER triggers.
CREATE POLICY "oisr_select_authenticated"
  ON order_item_soft_reservations
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 2. soft_reserved_qty column on order_items
-- ============================================================
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS soft_reserved_qty numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN order_items.soft_reserved_qty IS
  'Total qty currently soft-reserved in inventory_items for this line item. '
  'Managed by triggers; do not update directly.';

-- ============================================================
-- 3. Helper: release ALL soft reservations for one order_item
-- ============================================================
CREATE OR REPLACE FUNCTION fn_release_soft_reserve_for_order_item(
  p_order_item_id uuid,
  p_reason_code   text DEFAULT 'soft_reserve_released'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sr  RECORD;
  v_inv RECORD;
BEGIN
  FOR v_sr IN
    SELECT * FROM order_item_soft_reservations
    WHERE order_item_id = p_order_item_id
    FOR UPDATE
  LOOP
    SELECT id, package_id, unit, available_qty, reserved_qty
    INTO v_inv
    FROM inventory_items
    WHERE id = v_sr.inventory_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE WARNING 'CUL-551: inventory_item % not found releasing soft reserve for order_item %',
        v_sr.inventory_item_id, p_order_item_id;
      CONTINUE;
    END IF;

    PERFORM set_config('app.allow_quantity_update', 'true', true);

    UPDATE inventory_items
    SET
      available_qty = available_qty + v_sr.qty_reserved,
      reserved_qty  = GREATEST(0, COALESCE(reserved_qty, 0) - v_sr.qty_reserved),
      last_updated  = now()
    WHERE id = v_sr.inventory_item_id;

    PERFORM set_config('app.allow_quantity_update', 'false', true);

    -- Audit trail (RELEASE bypassed in fn_update_inventory_on_hand)
    INSERT INTO inventory_movements (
      movement_kind, dest_item_id, qty, unit,
      reference_id, reference_type, reason_code, notes, movement_date
    ) VALUES (
      'RELEASE',
      v_sr.inventory_item_id,
      v_sr.qty_reserved,
      COALESCE(v_inv.unit, 'unit'),
      p_order_item_id,
      'order_item',
      p_reason_code,
      format('Soft hold released: %s %s of %s — order_item %s (%s)',
        v_sr.qty_reserved, COALESCE(v_inv.unit, 'unit'),
        v_inv.package_id, p_order_item_id, p_reason_code),
      now()
    );
  END LOOP;

  -- Remove tracking rows
  DELETE FROM order_item_soft_reservations WHERE order_item_id = p_order_item_id;

  -- Reset counter
  UPDATE order_items SET soft_reserved_qty = 0 WHERE id = p_order_item_id;
END;
$$;

-- ============================================================
-- 4. Trigger function: create soft reservation on order_item INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION fn_soft_reserve_on_order_item_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_status     text;
  v_product_stage_id uuid;
  v_remaining        numeric;
  v_inv              RECORD;
  v_allocate         numeric;
  v_total_reserved   numeric := 0;
  v_unit             text;
BEGIN
  -- Only reserve when a specific batch is named
  IF NEW.batch_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip test-mode orders to avoid polluting real ATP
  IF NEW.test_mode THEN
    RETURN NEW;
  END IF;

  -- Only reserve for active (non-draft) order statuses
  SELECT status INTO v_order_status FROM orders WHERE id = NEW.order_id;
  IF v_order_status NOT IN ('submitted', 'accepted', 'processing') THEN
    RETURN NEW;
  END IF;

  -- Resolve product_stage_id via products.stage_id
  SELECT stage_id INTO v_product_stage_id FROM products WHERE id = NEW.product_id;
  IF v_product_stage_id IS NULL THEN
    RAISE WARNING 'CUL-551: product % has no stage_id — soft reserve skipped for order_item %',
      NEW.product_id, NEW.id;
    RETURN NEW;
  END IF;

  -- Distribute reservation across matching inventory_items (most-available first)
  v_remaining := NEW.quantity;

  FOR v_inv IN
    SELECT id, package_id, unit, available_qty
    FROM inventory_items
    WHERE batch_id         = NEW.batch_id
      AND product_stage_id = v_product_stage_id
      AND available_qty    > 0
      AND test_mode        = NEW.test_mode
    ORDER BY available_qty DESC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_allocate := LEAST(v_remaining, v_inv.available_qty);
    v_unit     := COALESCE(v_inv.unit, 'unit');

    PERFORM set_config('app.allow_quantity_update', 'true', true);

    UPDATE inventory_items
    SET
      available_qty = available_qty - v_allocate,
      reserved_qty  = COALESCE(reserved_qty, 0) + v_allocate,
      last_updated  = now()
    WHERE id = v_inv.id;

    PERFORM set_config('app.allow_quantity_update', 'false', true);

    -- Track for later release
    INSERT INTO order_item_soft_reservations (order_item_id, inventory_item_id, qty_reserved)
    VALUES (NEW.id, v_inv.id, v_allocate);

    -- Audit trail (RESERVE bypassed in fn_update_inventory_on_hand)
    INSERT INTO inventory_movements (
      movement_kind, source_item_id, qty, unit,
      reference_id, reference_type, reason_code, notes, movement_date
    ) VALUES (
      'RESERVE',
      v_inv.id,
      v_allocate,
      v_unit,
      NEW.order_id,
      'order',
      'order_entry',
      format('Soft hold: %s %s of %s — order %s entry (order_item %s)',
        v_allocate, v_unit, v_inv.package_id, NEW.order_id, NEW.id),
      now()
    );

    v_total_reserved := v_total_reserved + v_allocate;
    v_remaining      := v_remaining - v_allocate;
  END LOOP;

  -- Update soft_reserved_qty on the order_item
  IF v_total_reserved > 0 THEN
    UPDATE order_items
    SET soft_reserved_qty = v_total_reserved
    WHERE id = NEW.id;
  END IF;

  -- Warn (non-blocking) on partial coverage
  IF v_remaining > 0 THEN
    RAISE WARNING
      'CUL-551: Partial soft reserve — % of % reserved for order_item % (batch %, stage %)',
      v_total_reserved, NEW.quantity, NEW.id, NEW.batch_id, v_product_stage_id;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. Trigger: soft reserve on INSERT
-- ============================================================
CREATE TRIGGER trg_soft_reserve_on_order_item_insert
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_soft_reserve_on_order_item_insert();

-- ============================================================
-- 6. Trigger function: release soft reserves on order status change
-- ============================================================
CREATE OR REPLACE FUNCTION fn_release_soft_reserves_on_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_oi     RECORD;
  v_reason text;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    v_reason := 'order_cancelled';
  ELSIF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Hard assignments (package_assignments) took over; release any remaining
    -- soft holds that were never upgraded to package assignments.
    v_reason := 'order_completed';
  ELSE
    RETURN NEW;
  END IF;

  FOR v_oi IN
    SELECT id FROM order_items
    WHERE order_id = NEW.id AND soft_reserved_qty > 0
  LOOP
    PERFORM fn_release_soft_reserve_for_order_item(v_oi.id, v_reason);
  END LOOP;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 7. Trigger: release on order cancel or completion
-- ============================================================
CREATE TRIGGER trg_release_soft_reserves_on_order_status_change
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION fn_release_soft_reserves_on_order_status_change();

-- ============================================================
-- 8. Trigger function: release on order_item DELETE
-- ============================================================
CREATE OR REPLACE FUNCTION fn_release_soft_reserve_on_order_item_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.soft_reserved_qty > 0 THEN
    PERFORM fn_release_soft_reserve_for_order_item(OLD.id, 'order_item_deleted');
  END IF;
  RETURN OLD;
END;
$$;

-- ============================================================
-- 9. Trigger: release on order_item DELETE
-- ============================================================
CREATE TRIGGER trg_release_soft_reserve_on_order_item_delete
  BEFORE DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_release_soft_reserve_on_order_item_delete();

-- ============================================================
-- 10. Update fn_reserve_inventory_on_assignment
--     Release soft hold BEFORE applying the hard package reservation.
--     This is the double-count prevention step (CUL-551).
-- ============================================================
CREATE OR REPLACE FUNCTION fn_reserve_inventory_on_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_inventory_item RECORD;
BEGIN
  -- CUL-551: Release any order-entry soft reservation for this order_item
  -- before the hard package-level reservation is applied.
  -- Prevents: soft_hold + hard_hold = 2× reserved_qty for same quantity.
  PERFORM fn_release_soft_reserve_for_order_item(NEW.order_item_id, 'package_assigned');

  SELECT * INTO v_inventory_item
  FROM inventory_items
  WHERE package_id = NEW.package_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item with package_id % not found', NEW.package_id;
  END IF;

  IF v_inventory_item.available_qty < NEW.quantity_assigned THEN
    RAISE EXCEPTION 'Insufficient inventory for package %: available=%, requested=%',
      NEW.package_id,
      v_inventory_item.available_qty,
      NEW.quantity_assigned;
  END IF;

  PERFORM set_config('app.allow_quantity_update', 'true', true);

  UPDATE inventory_items
  SET
    available_qty = available_qty - NEW.quantity_assigned,
    reserved_qty  = COALESCE(reserved_qty, 0) + NEW.quantity_assigned,
    last_updated  = now()
  WHERE id = v_inventory_item.id;

  PERFORM set_config('app.allow_quantity_update', 'false', true);

  INSERT INTO inventory_movements (
    movement_kind,
    source_item_id,
    qty,
    unit,
    reference_id,
    reference_type,
    reason_code,
    notes,
    movement_date
  ) VALUES (
    'RESERVE',
    v_inventory_item.id,
    NEW.quantity_assigned,
    COALESCE(v_inventory_item.unit, 'unit'),
    NEW.order_id,
    'order',
    'package_assignment',
    format('Reserved %s %s of %s for order assignment',
      NEW.quantity_assigned,
      COALESCE(v_inventory_item.unit, 'unit'),
      NEW.package_id
    ),
    now()
  );

  RETURN NEW;
END;
$$;

-- ============================================================
-- 11. View: v_inventory_net_available
--     net_available = available_qty = on_hand_qty - reserved_qty
--     reserved_qty includes BOTH soft order-entry holds AND hard
--     package-assignment holds; there is no double-counting because
--     fn_reserve_inventory_on_assignment releases soft holds first.
-- ============================================================
CREATE OR REPLACE VIEW v_inventory_net_available AS
SELECT
  id,
  package_id,
  batch_id,
  batch_number,
  product_name,
  product_stage_id,
  strain,
  strain_id,
  category,
  on_hand_qty,
  reserved_qty,
  available_qty           AS net_available,  -- = on_hand_qty - reserved_qty
  available_qty,
  unit,
  status,
  test_mode,
  last_updated,
  created_at
FROM inventory_items;

COMMENT ON VIEW v_inventory_net_available IS
  'net_available = available_qty = on_hand_qty - reserved_qty. '
  'reserved_qty includes both soft order-entry holds (CUL-551, reason_code=order_entry) '
  'and hard package-assignment holds (reason_code=package_assignment). '
  'No double-counting: fn_reserve_inventory_on_assignment releases soft holds before '
  'applying hard holds.';
