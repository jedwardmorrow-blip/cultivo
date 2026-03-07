/*
  # Fix Order Fulfillment Trigger ATP Constraint Violation

  The fulfillment trigger (`fn_fulfill_inventory_on_order_complete`) was updating
  `reserved_qty` in one UPDATE, then inserting a FULFILLMENT movement that triggered
  `fn_update_inventory_on_hand` to decrement `on_hand_qty` in a separate UPDATE.
  The CHECK constraint `chk_atp_consistency` (available_qty = on_hand_qty - reserved_qty)
  fires after each individual UPDATE, causing violations when the two UPDATEs are not atomic.

  ## Fix Strategy
  1. Update all three quantity fields (on_hand_qty, reserved_qty, available_qty) in a SINGLE
     atomic UPDATE within the fulfillment function
  2. Add 'order_fulfillment' to the bypass list in fn_update_inventory_on_hand so the
     movement record is audit-only (no double-decrement of on_hand_qty)
  3. Apply the same pattern to cancellation (release) and revert triggers

  ## Changes
  - `fn_update_inventory_on_hand`: Added 'order_fulfillment' reason_code bypass
  - `fn_fulfill_inventory_on_order_complete`: Single atomic UPDATE for all qty fields
  - `fn_release_inventory_on_order_cancel`: Single atomic UPDATE for all qty fields
  - `fn_reverse_fulfillment_on_order_revert`: Single atomic UPDATE for all qty fields

  ## Important Notes
  - All movements use reason_code='order_fulfillment' to bypass the on_hand trigger
  - The fulfillment function itself handles all quantity changes atomically
  - ATP constraint is maintained because all three fields change in one statement
*/

-- ============================================================
-- 1. Update fn_update_inventory_on_hand to bypass order_fulfillment movements
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_inventory_on_hand()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  target_item_id uuid;
  qty_change numeric;
  current_qty numeric;
BEGIN
  IF NEW.movement_kind IN ('RESERVE', 'RELEASE') THEN
    RAISE NOTICE 'RESERVE/RELEASE movement % - ATP handled by session triggers, no on_hand_qty change', NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.reason_code = 'session_finalization' THEN
    RAISE NOTICE 'Session finalization movement % - audit trail only, quantities set directly', NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.reason_code = 'order_fulfillment' THEN
    RAISE NOTICE 'Order fulfillment movement % - audit trail only, quantities set by fulfillment trigger', NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.dest_item_id IS NOT NULL THEN
    target_item_id := NEW.dest_item_id;
  ELSIF NEW.source_item_id IS NOT NULL THEN
    target_item_id := NEW.source_item_id;
  ELSE
    RAISE EXCEPTION 'Movement must have either source_item_id or dest_item_id';
  END IF;

  SELECT on_hand_qty INTO current_qty
  FROM inventory_items
  WHERE id = target_item_id;

  PERFORM set_config('app.allow_quantity_update', 'true', true);

  BEGIN
    CASE NEW.movement_kind
      WHEN 'ADJUSTMENT', 'RECONCILIATION' THEN
        UPDATE inventory_items
        SET on_hand_qty = NEW.qty,
            last_updated = now()
        WHERE id = target_item_id;
        RAISE NOTICE 'Absolute movement: % -> % for item %', current_qty, NEW.qty, target_item_id;

      WHEN 'RECEIPT', 'PRODUCE', 'RETURN' THEN
        UPDATE inventory_items
        SET on_hand_qty = COALESCE(on_hand_qty, 0) + NEW.qty,
            last_updated = now()
        WHERE id = target_item_id;
        RAISE NOTICE 'Increment movement: % + % = % for item %', current_qty, NEW.qty, (COALESCE(current_qty, 0) + NEW.qty), target_item_id;

      WHEN 'CONSUME', 'FULFILLMENT' THEN
        UPDATE inventory_items
        SET on_hand_qty = GREATEST(0, COALESCE(on_hand_qty, 0) - NEW.qty),
            last_updated = now()
        WHERE id = target_item_id;
        RAISE NOTICE 'Decrement movement: % - % = % for item %', current_qty, NEW.qty, GREATEST(0, COALESCE(current_qty, 0) - NEW.qty), target_item_id;

      ELSE
        RAISE EXCEPTION 'Unknown movement_kind: %', NEW.movement_kind;
    END CASE;

    IF NOT FOUND THEN
      RAISE WARNING 'No inventory item found with id: %', target_item_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM set_config('app.allow_quantity_update', 'false', true);
      RAISE;
  END;

  PERFORM set_config('app.allow_quantity_update', 'false', true);

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION fn_update_inventory_on_hand IS
  'PRIMARY FUNCTION (SECURITY DEFINER): Updates inventory_items.on_hand_qty based on movement_kind.
   RESERVE/RELEASE are NO-OP (ATP tracking only).
   Session finalization movements are NO-OP (audit trail only, quantities set directly).
   Order fulfillment movements are NO-OP (audit trail only, quantities set by fulfillment trigger).
   Updated: 2026-03-01 (added order_fulfillment bypass)';

-- ============================================================
-- 2. Fix fn_fulfill_inventory_on_order_complete: atomic qty update
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
      on_hand_qty = GREATEST(0, COALESCE(on_hand_qty, 0) - v_assignment.quantity_assigned),
      reserved_qty = GREATEST(0, COALESCE(reserved_qty, 0) - v_assignment.quantity_assigned),
      available_qty = GREATEST(0, COALESCE(on_hand_qty, 0) - v_assignment.quantity_assigned)
                      - GREATEST(0, COALESCE(reserved_qty, 0) - v_assignment.quantity_assigned),
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
      'order_fulfillment',
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

-- ============================================================
-- 3. Fix fn_release_inventory_on_order_cancel: atomic qty update
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
      'order_fulfillment',
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

-- ============================================================
-- 4. Fix fn_reverse_fulfillment_on_order_revert: atomic qty update
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

    PERFORM set_config('app.allow_quantity_update', 'true', true);

    UPDATE inventory_items
    SET
      on_hand_qty = COALESCE(on_hand_qty, 0) + v_assignment.quantity_assigned,
      reserved_qty = COALESCE(reserved_qty, 0) + v_assignment.quantity_assigned,
      available_qty = (COALESCE(on_hand_qty, 0) + v_assignment.quantity_assigned)
                      - (COALESCE(reserved_qty, 0) + v_assignment.quantity_assigned),
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
      'RETURN',
      v_inventory_item.id,
      v_assignment.quantity_assigned,
      COALESCE(v_inventory_item.unit, 'unit'),
      NEW.id,
      'order',
      'order_fulfillment',
      format('Returned %s %s of %s — order %s reverted from completed',
        v_assignment.quantity_assigned,
        COALESCE(v_inventory_item.unit, 'unit'),
        v_assignment.package_id,
        COALESCE(NEW.order_number, NEW.id::text)
      ),
      now()
    );

    UPDATE package_assignments
    SET status = 'reserved', updated_at = now()
    WHERE id = v_assignment.id;
  END LOOP;

  RETURN NEW;
END;
$$;
