/*
  # Create Inventory Reservation System

  ## Overview
  Implements hard inventory reservations to prevent double-allocation of inventory packages
  to multiple order items. When a package is assigned to an order, the quantity is reserved
  and deducted from available inventory. Reservations are automatically released when
  assignments are removed or orders are cancelled.

  ## 1. Schema Changes
     - Add `reserved_qty` to inventory_items to track reserved quantities
     - Add `reservation_status` enum to package_assignments for tracking state
     - Create `inventory_reservations` audit table for tracking reservation history

  ## 2. Reservation Logic
     - When package assigned: reserve quantity, reduce available_qty
     - When assignment removed: release quantity, restore available_qty
     - When order cancelled: release all reservations for that order
     - Prevent over-allocation via CHECK constraints

  ## 3. Triggers
     - Auto-reserve on package_assignments INSERT
     - Auto-release on package_assignments DELETE
     - Auto-release-all on orders status = 'cancelled'
     - Update inventory_items.reserved_qty automatically

  ## 4. Validation
     - Constraint: available_qty >= 0 (prevent over-allocation)
     - Constraint: reserved_qty >= 0 (no negative reservations)
     - Constraint: reserved_qty <= total quantity
     - Function: check_inventory_availability before assignment

  ## 5. Security
     - RLS enabled on all new tables
     - Authenticated users can view/manage reservations
     - Audit trail tracks all reservation changes
*/

-- =====================================================
-- SECTION 1: Add Reserved Quantity to Inventory Items
-- =====================================================

-- Add reserved_qty column to track reserved inventory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'reserved_qty'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN reserved_qty numeric DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Add constraint to ensure reserved_qty is valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_reserved_qty'
  ) THEN
    ALTER TABLE inventory_items
      ADD CONSTRAINT valid_reserved_qty
      CHECK (reserved_qty >= 0);
  END IF;
END $$;

-- Add constraint to ensure available_qty stays non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_available_qty'
  ) THEN
    ALTER TABLE inventory_items
      ADD CONSTRAINT valid_available_qty
      CHECK (available_qty >= 0);
  END IF;
END $$;

-- Create index for reservation queries
CREATE INDEX IF NOT EXISTS idx_inventory_items_reserved_qty
  ON inventory_items(reserved_qty) WHERE reserved_qty > 0;

-- =====================================================
-- SECTION 2: Add Reservation Status to Package Assignments
-- =====================================================

-- Add reservation_status column to track state
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'package_assignments' AND column_name = 'reservation_status'
  ) THEN
    ALTER TABLE package_assignments
      ADD COLUMN reservation_status text DEFAULT 'reserved' NOT NULL;
  END IF;
END $$;

-- Add constraint for valid reservation statuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_reservation_status'
  ) THEN
    ALTER TABLE package_assignments
      ADD CONSTRAINT valid_reservation_status
      CHECK (reservation_status IN ('reserved', 'released', 'fulfilled'));
  END IF;
END $$;

-- Create index for reservation status queries
CREATE INDEX IF NOT EXISTS idx_package_assignments_reservation_status
  ON package_assignments(reservation_status);

-- =====================================================
-- SECTION 3: Create Inventory Reservations Audit Table
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_reservations_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Assignment reference
  assignment_id uuid REFERENCES package_assignments(id) ON DELETE SET NULL,

  -- Inventory reference
  package_id text NOT NULL,
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,

  -- Order context
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  order_item_id uuid REFERENCES order_items(id) ON DELETE SET NULL,

  -- Reservation details
  action text NOT NULL, -- 'reserve', 'release', 'adjust'
  quantity_reserved numeric NOT NULL,
  quantity_before numeric,
  quantity_after numeric,

  -- Audit trail
  reason text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now(),

  CONSTRAINT valid_reservation_action CHECK (action IN ('reserve', 'release', 'adjust', 'auto_release'))
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_log_package_id
  ON inventory_reservations_log(package_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_log_assignment_id
  ON inventory_reservations_log(assignment_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_log_order_id
  ON inventory_reservations_log(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_log_performed_at
  ON inventory_reservations_log(performed_at DESC);

-- Enable RLS
ALTER TABLE inventory_reservations_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view reservation log"
  ON inventory_reservations_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert reservation log"
  ON inventory_reservations_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- SECTION 4: Reservation Functions
-- =====================================================

-- Function: Check if inventory is available for reservation
CREATE OR REPLACE FUNCTION check_inventory_availability(
  p_package_id text,
  p_quantity_requested numeric
)
RETURNS boolean AS $$
DECLARE
  v_available numeric;
BEGIN
  -- Get current available quantity
  SELECT available_qty INTO v_available
  FROM inventory_items
  WHERE package_id = p_package_id;

  -- If package not found, return false
  IF v_available IS NULL THEN
    RETURN false;
  END IF;

  -- Check if enough quantity is available
  RETURN v_available >= p_quantity_requested;
END;
$$ LANGUAGE plpgsql;

-- Function: Reserve inventory for package assignment
CREATE OR REPLACE FUNCTION reserve_inventory_for_assignment(
  p_assignment_id uuid,
  p_package_id text,
  p_quantity numeric,
  p_order_id uuid,
  p_order_item_id uuid
)
RETURNS void AS $$
DECLARE
  v_inventory_item_id uuid;
  v_available_before numeric;
  v_reserved_before numeric;
BEGIN
  -- Get inventory item details
  SELECT id, available_qty, reserved_qty
  INTO v_inventory_item_id, v_available_before, v_reserved_before
  FROM inventory_items
  WHERE package_id = p_package_id
  FOR UPDATE; -- Lock row to prevent concurrent modifications

  -- Check if inventory exists
  IF v_inventory_item_id IS NULL THEN
    RAISE EXCEPTION 'Inventory package not found: %', p_package_id;
  END IF;

  -- Check if enough quantity available
  IF v_available_before < p_quantity THEN
    RAISE EXCEPTION 'Insufficient inventory available. Requested: %, Available: %',
      p_quantity, v_available_before;
  END IF;

  -- Reserve the inventory
  UPDATE inventory_items
  SET
    available_qty = available_qty - p_quantity,
    reserved_qty = reserved_qty + p_quantity,
    updated_at = now()
  WHERE id = v_inventory_item_id;

  -- Log the reservation
  INSERT INTO inventory_reservations_log (
    assignment_id,
    package_id,
    inventory_item_id,
    order_id,
    order_item_id,
    action,
    quantity_reserved,
    quantity_before,
    quantity_after,
    reason,
    performed_by
  ) VALUES (
    p_assignment_id,
    p_package_id,
    v_inventory_item_id,
    p_order_id,
    p_order_item_id,
    'reserve',
    p_quantity,
    v_available_before,
    v_available_before - p_quantity,
    'Package assigned to order',
    auth.uid()
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Release inventory reservation
CREATE OR REPLACE FUNCTION release_inventory_reservation(
  p_assignment_id uuid,
  p_package_id text,
  p_quantity numeric,
  p_order_id uuid,
  p_order_item_id uuid,
  p_reason text DEFAULT 'Assignment removed'
)
RETURNS void AS $$
DECLARE
  v_inventory_item_id uuid;
  v_available_before numeric;
  v_reserved_before numeric;
BEGIN
  -- Get inventory item details
  SELECT id, available_qty, reserved_qty
  INTO v_inventory_item_id, v_available_before, v_reserved_before
  FROM inventory_items
  WHERE package_id = p_package_id
  FOR UPDATE; -- Lock row

  -- If inventory not found, just log and return (inventory may have been deleted)
  IF v_inventory_item_id IS NULL THEN
    INSERT INTO inventory_reservations_log (
      assignment_id, package_id, order_id, order_item_id,
      action, quantity_reserved, reason
    ) VALUES (
      p_assignment_id, p_package_id, p_order_id, p_order_item_id,
      'release', p_quantity, p_reason || ' (inventory not found)'
    );
    RETURN;
  END IF;

  -- Release the reservation
  UPDATE inventory_items
  SET
    available_qty = available_qty + p_quantity,
    reserved_qty = GREATEST(0, reserved_qty - p_quantity), -- Prevent negative
    updated_at = now()
  WHERE id = v_inventory_item_id;

  -- Log the release
  INSERT INTO inventory_reservations_log (
    assignment_id,
    package_id,
    inventory_item_id,
    order_id,
    order_item_id,
    action,
    quantity_reserved,
    quantity_before,
    quantity_after,
    reason,
    performed_by
  ) VALUES (
    p_assignment_id,
    p_package_id,
    v_inventory_item_id,
    p_order_id,
    p_order_item_id,
    'release',
    p_quantity,
    v_available_before,
    v_available_before + p_quantity,
    p_reason,
    auth.uid()
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Release all reservations for an order
CREATE OR REPLACE FUNCTION release_all_order_reservations(p_order_id uuid)
RETURNS void AS $$
DECLARE
  v_assignment record;
BEGIN
  -- Loop through all assignments for this order
  FOR v_assignment IN
    SELECT id, package_id, quantity_assigned, order_item_id
    FROM package_assignments
    WHERE order_id = p_order_id
      AND reservation_status = 'reserved'
  LOOP
    -- Release each reservation
    PERFORM release_inventory_reservation(
      v_assignment.id,
      v_assignment.package_id,
      v_assignment.quantity_assigned,
      p_order_id,
      v_assignment.order_item_id,
      'Order cancelled - auto release'
    );

    -- Update assignment status
    UPDATE package_assignments
    SET reservation_status = 'released'
    WHERE id = v_assignment.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 5: Triggers for Automatic Reservation Management
-- =====================================================

-- Trigger: Auto-reserve on package assignment creation
CREATE OR REPLACE FUNCTION trigger_reserve_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Reserve inventory
  PERFORM reserve_inventory_for_assignment(
    NEW.id,
    NEW.package_id,
    NEW.quantity_assigned,
    NEW.order_id,
    NEW.order_item_id
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If reservation fails, cancel the insert
    RAISE EXCEPTION 'Failed to reserve inventory: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_reserve_inventory ON package_assignments;
CREATE TRIGGER auto_reserve_inventory
  AFTER INSERT ON package_assignments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_reserve_on_assignment();

-- Trigger: Auto-release on package assignment deletion
CREATE OR REPLACE FUNCTION trigger_release_on_assignment_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only release if reservation was active
  IF OLD.reservation_status = 'reserved' THEN
    PERFORM release_inventory_reservation(
      OLD.id,
      OLD.package_id,
      OLD.quantity_assigned,
      OLD.order_id,
      OLD.order_item_id,
      'Assignment deleted'
    );
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_release_inventory ON package_assignments;
CREATE TRIGGER auto_release_inventory
  BEFORE DELETE ON package_assignments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_release_on_assignment_delete();

-- Trigger: Auto-release all reservations when order cancelled
CREATE OR REPLACE FUNCTION trigger_release_on_order_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if status changed to cancelled
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    PERFORM release_all_order_reservations(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_release_on_cancel ON orders;
CREATE TRIGGER auto_release_on_cancel
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION trigger_release_on_order_cancel();

-- =====================================================
-- SECTION 6: Helper Views
-- =====================================================

-- View: Current inventory reservation summary
CREATE OR REPLACE VIEW inventory_reservation_summary AS
SELECT
  ii.id as inventory_item_id,
  ii.package_id,
  ii.product_name,
  ii.strain,
  ii.batch,
  ii.available_qty + ii.reserved_qty as total_qty,
  ii.available_qty,
  ii.reserved_qty,
  ii.unit,
  COUNT(pa.id) as active_assignments,
  ARRAY_AGG(DISTINCT pa.order_id) FILTER (WHERE pa.order_id IS NOT NULL) as assigned_order_ids
FROM inventory_items ii
LEFT JOIN package_assignments pa
  ON pa.package_id = ii.package_id
  AND pa.reservation_status = 'reserved'
GROUP BY
  ii.id,
  ii.package_id,
  ii.product_name,
  ii.strain,
  ii.batch,
  ii.available_qty,
  ii.reserved_qty,
  ii.unit;

-- View: Package assignments with reservation details
CREATE OR REPLACE VIEW package_assignments_with_reservations AS
SELECT
  pa.*,
  ii.available_qty as inventory_available_qty,
  ii.reserved_qty as inventory_reserved_qty,
  ii.product_name as inventory_product_name,
  o.order_number,
  o.status as order_status,
  c.name as customer_name
FROM package_assignments pa
LEFT JOIN inventory_items ii ON ii.package_id = pa.package_id
LEFT JOIN orders o ON o.id = pa.order_id
LEFT JOIN customers c ON c.id = o.customer_id;

-- =====================================================
-- SECTION 7: Comments
-- =====================================================

COMMENT ON COLUMN inventory_items.reserved_qty IS
'Quantity of this inventory item currently reserved for order assignments. Available = Total - Reserved.';

COMMENT ON COLUMN package_assignments.reservation_status IS
'Tracks reservation lifecycle: reserved (active), released (cancelled), fulfilled (delivered)';

COMMENT ON TABLE inventory_reservations_log IS
'Audit log of all inventory reservation actions for compliance and troubleshooting';

COMMENT ON FUNCTION check_inventory_availability IS
'Validates if sufficient inventory is available before creating an assignment';

COMMENT ON FUNCTION reserve_inventory_for_assignment IS
'Reserves inventory quantity for a package assignment. Called automatically on assignment creation.';

COMMENT ON FUNCTION release_inventory_reservation IS
'Releases a reservation and returns inventory to available pool. Called on assignment deletion.';

COMMENT ON FUNCTION release_all_order_reservations IS
'Releases all inventory reservations for an order. Called automatically when order is cancelled.';

COMMENT ON VIEW inventory_reservation_summary IS
'Summary view showing total, available, and reserved quantities per inventory item';

COMMENT ON VIEW package_assignments_with_reservations IS
'Package assignments with full inventory reservation details and order context';
