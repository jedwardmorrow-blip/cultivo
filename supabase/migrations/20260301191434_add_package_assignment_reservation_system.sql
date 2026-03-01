/*
  # Package Assignment Reservation System

  Adds inventory reservation mechanics to the package_assignments table, following
  the same pattern used by session reservations (reserve_inventory_on_session_start).

  ## Changes

  1. New column on `package_assignments`
     - `status` (text) — tracks assignment lifecycle: 'reserved', 'fulfilled', 'released'

  2. New trigger function: `fn_reserve_inventory_on_assignment`
     - Fires AFTER INSERT on package_assignments
     - Decrements available_qty, increments reserved_qty on inventory_items
     - Creates a RESERVE movement in inventory_movements ledger
     - Raises exception if insufficient available_qty (prevents the INSERT)

  3. New trigger function: `fn_release_inventory_on_unassignment`
     - Fires BEFORE DELETE on package_assignments
     - If status = 'reserved': restores available_qty, decrements reserved_qty
     - Creates a RELEASE movement in inventory_movements ledger
     - If status = 'fulfilled': no-op (inventory already permanently deducted)

  ## Security
     - RLS already enabled on package_assignments (existing policies unchanged)
     - Trigger functions run as SECURITY DEFINER to update inventory_items

  ## Important notes
     - Follows the exact same pattern as reserve_inventory_on_session_start
     - Uses set_config('app.allow_quantity_update', ...) to bypass ledger-only constraint
*/

-- ============================================================
-- 1. Add status column to package_assignments
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'package_assignments' AND column_name = 'status'
  ) THEN
    ALTER TABLE package_assignments
      ADD COLUMN status text NOT NULL DEFAULT 'reserved';
  END IF;
END $$;

ALTER TABLE package_assignments
  DROP CONSTRAINT IF EXISTS package_assignments_status_check;

ALTER TABLE package_assignments
  ADD CONSTRAINT package_assignments_status_check
  CHECK (status IN ('reserved', 'fulfilled', 'released'));

-- ============================================================
-- 2. Reserve inventory when package is assigned to an order item
-- ============================================================
CREATE OR REPLACE FUNCTION fn_reserve_inventory_on_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inventory_item RECORD;
BEGIN
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
    reserved_qty = COALESCE(reserved_qty, 0) + NEW.quantity_assigned,
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

DROP TRIGGER IF EXISTS trg_reserve_inventory_on_assignment ON package_assignments;
CREATE TRIGGER trg_reserve_inventory_on_assignment
  AFTER INSERT ON package_assignments
  FOR EACH ROW
  EXECUTE FUNCTION fn_reserve_inventory_on_assignment();

-- ============================================================
-- 3. Release inventory when package assignment is removed
-- ============================================================
CREATE OR REPLACE FUNCTION fn_release_inventory_on_unassignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inventory_item RECORD;
BEGIN
  IF OLD.status = 'fulfilled' THEN
    RETURN OLD;
  END IF;

  IF OLD.status = 'released' THEN
    RETURN OLD;
  END IF;

  SELECT * INTO v_inventory_item
  FROM inventory_items
  WHERE package_id = OLD.package_id;

  IF NOT FOUND THEN
    RAISE WARNING 'Inventory item % not found during assignment removal', OLD.package_id;
    RETURN OLD;
  END IF;

  PERFORM set_config('app.allow_quantity_update', 'true', true);

  UPDATE inventory_items
  SET
    available_qty = available_qty + OLD.quantity_assigned,
    reserved_qty = GREATEST(0, COALESCE(reserved_qty, 0) - OLD.quantity_assigned),
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
    OLD.quantity_assigned,
    COALESCE(v_inventory_item.unit, 'unit'),
    OLD.order_id,
    'order',
    'assignment_removed',
    format('Released %s %s of %s — assignment removed',
      OLD.quantity_assigned,
      COALESCE(v_inventory_item.unit, 'unit'),
      OLD.package_id
    ),
    now()
  );

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_release_inventory_on_unassignment ON package_assignments;
CREATE TRIGGER trg_release_inventory_on_unassignment
  BEFORE DELETE ON package_assignments
  FOR EACH ROW
  EXECUTE FUNCTION fn_release_inventory_on_unassignment();
