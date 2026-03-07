/*
  # Order Fulfillment and Cancellation Triggers

  Handles inventory quantity changes when orders transition between statuses:

  ## Trigger: fn_fulfill_inventory_on_order_complete
  - Fires AFTER UPDATE on orders when status changes TO 'completed'
  - For each package_assignment with status='reserved':
    - Releases the soft reservation (reserved_qty -= qty)
    - Records a FULFILLMENT movement (on_hand_qty decremented by existing trigger)
    - Sets assignment status to 'fulfilled'

  ## Trigger: fn_release_inventory_on_order_cancel
  - Fires AFTER UPDATE on orders when status changes TO 'cancelled'
  - For each package_assignment with status='reserved':
    - Restores available_qty, decrements reserved_qty
    - Records a RELEASE movement
    - Sets assignment status to 'released'

  ## Trigger: fn_reverse_fulfillment_on_order_revert
  - Fires AFTER UPDATE on orders when status changes FROM 'completed' back
  - For each package_assignment with status='fulfilled':
    - Records a RETURN movement (on_hand_qty incremented by existing trigger)
    - Re-reserves: increments reserved_qty, decrements available_qty
    - Sets assignment status back to 'reserved'

  ## Important notes
  - FULFILLMENT movement kind is already handled by fn_update_inventory_on_hand (decrements on_hand_qty)
  - RETURN movement kind is already handled by fn_update_inventory_on_hand (increments on_hand_qty)
  - RESERVE/RELEASE movements are no-ops in fn_update_inventory_on_hand (ATP only)
  - All functions use SECURITY DEFINER + set_config for quantity updates
*/

-- ============================================================
-- 1. Fulfill inventory when order completes
-- ============================================================
CREATE OR REPLACE FUNCTION fn_fulfill_inventory_on_order_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment RECORD;
  v_inventory_item RECORD;
BEGIN
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  FOR v_assignment IN
    SELECT * FROM package_assignments
    WHERE order_id = NEW.id AND status = 'reserved'
  LOOP
    SELECT * INTO v_inventory_item
    FROM inventory_items
    WHERE package_id = v_assignment.package_id;

    IF NOT FOUND THEN
      RAISE WARNING 'Inventory item % not found during order completion', v_assignment.package_id;
      CONTINUE;
    END IF;

    PERFORM set_config('app.allow_quantity_update', 'true', true);

    UPDATE inventory_items
    SET
      reserved_qty = GREATEST(0, COALESCE(reserved_qty, 0) - v_assignment.quantity_assigned),
      last_updated = now()
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
      'FULFILLMENT',
      v_inventory_item.id,
      v_assignment.quantity_assigned,
      COALESCE(v_inventory_item.unit, 'unit'),
      NEW.id,
      'order',
      'order_completed',
      format('Fulfilled %s %s of %s for order %s',
        v_assignment.quantity_assigned,
        COALESCE(v_inventory_item.unit, 'unit'),
        v_assignment.package_id,
        COALESCE(NEW.order_number, NEW.id::text)
      ),
      now()
    );

    UPDATE package_assignments
    SET status = 'fulfilled', updated_at = now()
    WHERE id = v_assignment.id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fulfill_inventory_on_order_complete ON orders;
CREATE TRIGGER trg_fulfill_inventory_on_order_complete
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION fn_fulfill_inventory_on_order_complete();

-- ============================================================
-- 2. Release inventory when order is cancelled
-- ============================================================
CREATE OR REPLACE FUNCTION fn_release_inventory_on_order_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment RECORD;
  v_inventory_item RECORD;
BEGIN
  IF NEW.status != 'cancelled' OR OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  FOR v_assignment IN
    SELECT * FROM package_assignments
    WHERE order_id = NEW.id AND status = 'reserved'
  LOOP
    SELECT * INTO v_inventory_item
    FROM inventory_items
    WHERE package_id = v_assignment.package_id;

    IF NOT FOUND THEN
      RAISE WARNING 'Inventory item % not found during order cancellation', v_assignment.package_id;
      CONTINUE;
    END IF;

    PERFORM set_config('app.allow_quantity_update', 'true', true);

    UPDATE inventory_items
    SET
      available_qty = available_qty + v_assignment.quantity_assigned,
      reserved_qty = GREATEST(0, COALESCE(reserved_qty, 0) - v_assignment.quantity_assigned),
      last_updated = now()
    WHERE id = v_inventory_item.id;

    PERFORM set_config('app.allow_quantity_update', 'false', true);

    INSERT INTO inventory_movements (
      movement_kind,
      dest_item_id,
      qty,
      unit,
      reference_id,
      reference_type,
      reason_code,
      notes,
      movement_date
    ) VALUES (
      'RELEASE',
      v_inventory_item.id,
      v_assignment.quantity_assigned,
      COALESCE(v_inventory_item.unit, 'unit'),
      NEW.id,
      'order',
      'order_cancelled',
      format('Released %s %s of %s — order %s cancelled',
        v_assignment.quantity_assigned,
        COALESCE(v_inventory_item.unit, 'unit'),
        v_assignment.package_id,
        COALESCE(NEW.order_number, NEW.id::text)
      ),
      now()
    );

    UPDATE package_assignments
    SET status = 'released', updated_at = now()
    WHERE id = v_assignment.id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_inventory_on_order_cancel ON orders;
CREATE TRIGGER trg_release_inventory_on_order_cancel
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION fn_release_inventory_on_order_cancel();

-- ============================================================
-- 3. Reverse fulfillment if order reverted from completed
-- ============================================================
CREATE OR REPLACE FUNCTION fn_reverse_fulfillment_on_order_revert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment RECORD;
  v_inventory_item RECORD;
BEGIN
  IF OLD.status != 'completed' OR NEW.status = 'completed' THEN
    RETURN NEW;
  END IF;

  FOR v_assignment IN
    SELECT * FROM package_assignments
    WHERE order_id = NEW.id AND status = 'fulfilled'
  LOOP
    SELECT * INTO v_inventory_item
    FROM inventory_items
    WHERE package_id = v_assignment.package_id;

    IF NOT FOUND THEN
      RAISE WARNING 'Inventory item % not found during order revert', v_assignment.package_id;
      CONTINUE;
    END IF;

    INSERT INTO inventory_movements (
      movement_kind,
      dest_item_id,
      qty,
      unit,
      reference_id,
      reference_type,
      reason_code,
      notes,
      movement_date
    ) VALUES (
      'RETURN',
      v_inventory_item.id,
      v_assignment.quantity_assigned,
      COALESCE(v_inventory_item.unit, 'unit'),
      NEW.id,
      'order',
      'order_revert',
      format('Returned %s %s of %s — order %s reverted from completed',
        v_assignment.quantity_assigned,
        COALESCE(v_inventory_item.unit, 'unit'),
        v_assignment.package_id,
        COALESCE(NEW.order_number, NEW.id::text)
      ),
      now()
    );

    PERFORM set_config('app.allow_quantity_update', 'true', true);

    UPDATE inventory_items
    SET
      reserved_qty = COALESCE(reserved_qty, 0) + v_assignment.quantity_assigned,
      available_qty = GREATEST(0, available_qty - v_assignment.quantity_assigned),
      last_updated = now()
    WHERE id = v_inventory_item.id;

    PERFORM set_config('app.allow_quantity_update', 'false', true);

    UPDATE package_assignments
    SET status = 'reserved', updated_at = now()
    WHERE id = v_assignment.id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reverse_fulfillment_on_order_revert ON orders;
CREATE TRIGGER trg_reverse_fulfillment_on_order_revert
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status = 'completed' AND NEW.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION fn_reverse_fulfillment_on_order_revert();

-- ============================================================
-- 4. Refresh the package_assignments_details view to include status
-- ============================================================
DROP VIEW IF EXISTS package_assignments_with_reservations CASCADE;
DROP VIEW IF EXISTS package_assignments_details CASCADE;

CREATE VIEW package_assignments_details AS
SELECT
  pa.id,
  pa.order_id,
  pa.order_item_id,
  pa.package_id,
  pa.quantity_assigned,
  pa.label_id,
  pa.notes,
  pa.assigned_by,
  pa.assigned_at,
  pa.created_at,
  pa.updated_at,
  pa.status AS assignment_status,
  o.order_number,
  o.customer_id,
  o.scheduled_delivery_date,
  o.status AS order_status,
  oi.quantity AS order_item_quantity,
  oi.unit_price,
  oi.strain AS order_item_strain,
  p.name AS product_name,
  p.type AS product_type,
  ii.id AS inventory_item_id,
  ii.product_name AS inventory_product_name,
  ii.strain,
  ii.batch_number,
  ii.batch_number AS batch,
  ii.status,
  ii.available_qty,
  ii.unit,
  ii.room,
  ii.package_date,
  l.label_number,
  l.qr_code_data AS barcode_data,
  l.printed_at,
  l.voided_at
FROM package_assignments pa
JOIN orders o ON o.id = pa.order_id
JOIN order_items oi ON oi.id = pa.order_item_id
LEFT JOIN products p ON p.id = oi.product_id
LEFT JOIN inventory_items ii ON ii.package_id = pa.package_id
LEFT JOIN labels l ON l.id = pa.label_id;

CREATE VIEW package_assignments_with_reservations AS
SELECT
  pad.*,
  ii.on_hand_qty AS total_qty,
  ii.reserved_qty,
  c.name AS customer_name
FROM package_assignments_details pad
LEFT JOIN inventory_items ii ON ii.package_id = pad.package_id
LEFT JOIN customers c ON c.id = pad.customer_id;
