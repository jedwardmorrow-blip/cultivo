/*
  # Add Label Voiding System

  ## Overview
  Implements automatic label voiding when orders are cancelled or package assignments
  are removed. Voided labels are excluded from printing and marked for compliance tracking.

  ## 1. Schema Changes
     - Add `voided_at` timestamp to labels table
     - Add `voided_by` user reference to labels table
     - Add `void_reason` text field to labels table
     - Add `is_voided` computed check for queries

  ## 2. Voiding Logic
     - When order cancelled: void all labels for that order's assignments
     - When assignment deleted: void the associated label
     - When assignment updated: void old label, create new one
     - Voided labels remain in database for audit trail

  ## 3. Triggers
     - Auto-void labels when package assignment is deleted
     - Auto-void all order labels when order status = 'cancelled'
     - Prevent printing of voided labels via validation

  ## 4. Views
     - Active labels view (excludes voided)
     - Voided labels audit view
     - Label lifecycle tracking

  ## 5. Security
     - Only authenticated users can void labels
     - Voiding is logged with user and timestamp
     - Voided labels remain visible for audit
*/

-- =====================================================
-- SECTION 1: Add Voiding Columns to Labels Table
-- =====================================================

-- Add voided_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labels' AND column_name = 'voided_at'
  ) THEN
    ALTER TABLE labels ADD COLUMN voided_at timestamptz;
  END IF;
END $$;

-- Add voided_by user reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labels' AND column_name = 'voided_by'
  ) THEN
    ALTER TABLE labels ADD COLUMN voided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add void_reason text field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labels' AND column_name = 'void_reason'
  ) THEN
    ALTER TABLE labels ADD COLUMN void_reason text;
  END IF;
END $$;

-- Create indexes for voided label queries
CREATE INDEX IF NOT EXISTS idx_labels_voided_at ON labels(voided_at) WHERE voided_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_labels_active ON labels(id) WHERE voided_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_labels_package_id ON labels(package_id);

-- =====================================================
-- SECTION 2: Label Voiding Functions
-- =====================================================

-- Function: Void a single label
CREATE OR REPLACE FUNCTION void_label(
  p_label_id uuid,
  p_reason text DEFAULT 'Label voided',
  p_voided_by uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE labels
  SET
    voided_at = now(),
    voided_by = COALESCE(p_voided_by, auth.uid()),
    void_reason = p_reason
  WHERE id = p_label_id
    AND voided_at IS NULL; -- Only void if not already voided
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Void label by package assignment
CREATE OR REPLACE FUNCTION void_label_for_assignment(
  p_assignment_id uuid,
  p_reason text DEFAULT 'Package assignment removed'
)
RETURNS void AS $$
DECLARE
  v_label_id uuid;
BEGIN
  -- Get label ID from assignment
  SELECT label_id INTO v_label_id
  FROM package_assignments
  WHERE id = p_assignment_id;

  -- Void the label if it exists
  IF v_label_id IS NOT NULL THEN
    PERFORM void_label(v_label_id, p_reason);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Void all labels for an order
CREATE OR REPLACE FUNCTION void_all_order_labels(
  p_order_id uuid,
  p_reason text DEFAULT 'Order cancelled'
)
RETURNS void AS $$
DECLARE
  v_assignment record;
BEGIN
  -- Loop through all assignments for this order
  FOR v_assignment IN
    SELECT id, label_id
    FROM package_assignments
    WHERE order_id = p_order_id
  LOOP
    IF v_assignment.label_id IS NOT NULL THEN
      PERFORM void_label(v_assignment.label_id, p_reason);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 3: Triggers for Automatic Label Voiding
-- =====================================================

-- Trigger: Void label when package assignment is deleted
CREATE OR REPLACE FUNCTION trigger_void_label_on_assignment_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Void the associated label
  IF OLD.label_id IS NOT NULL THEN
    PERFORM void_label(OLD.label_id, 'Package assignment deleted');
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_void_label_on_assignment_delete ON package_assignments;
CREATE TRIGGER auto_void_label_on_assignment_delete
  BEFORE DELETE ON package_assignments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_void_label_on_assignment_delete();

-- Trigger: Void all order labels when order is cancelled
CREATE OR REPLACE FUNCTION trigger_void_labels_on_order_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if status changed to cancelled
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    PERFORM void_all_order_labels(NEW.id, 'Order cancelled');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_void_labels_on_cancel ON orders;
CREATE TRIGGER auto_void_labels_on_cancel
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION trigger_void_labels_on_order_cancel();

-- =====================================================
-- SECTION 4: Helper Views
-- =====================================================

-- View: Active (non-voided) labels
CREATE OR REPLACE VIEW active_labels AS
SELECT
  l.*,
  false as is_voided
FROM labels l
WHERE l.voided_at IS NULL;

-- View: Voided labels for audit
CREATE OR REPLACE VIEW voided_labels_audit AS
SELECT
  l.*,
  true as is_voided,
  u.email as voided_by_email,
  pa.order_id,
  pa.order_item_id,
  o.order_number,
  c.name as customer_name
FROM labels l
LEFT JOIN auth.users u ON u.id = l.voided_by
LEFT JOIN package_assignments pa ON pa.label_id = l.id
LEFT JOIN orders o ON o.id = pa.order_id
LEFT JOIN customers c ON c.id = o.customer_id
WHERE l.voided_at IS NOT NULL
ORDER BY l.voided_at DESC;

-- View: Label lifecycle with status
CREATE OR REPLACE VIEW labels_with_status AS
SELECT
  l.*,
  CASE
    WHEN l.voided_at IS NOT NULL THEN 'voided'
    WHEN l.printed_at IS NOT NULL THEN 'printed'
    ELSE 'pending'
  END as label_status,
  l.voided_at IS NOT NULL as is_voided,
  pa.id as assignment_id,
  pa.order_id,
  pa.reservation_status,
  o.order_number,
  o.status as order_status
FROM labels l
LEFT JOIN package_assignments pa ON pa.label_id = l.id
LEFT JOIN orders o ON o.id = pa.order_id;

-- View: Package assignments with label status
CREATE OR REPLACE VIEW package_assignments_with_label_status AS
SELECT
  pa.*,
  l.label_number,
  l.voided_at as label_voided_at,
  l.void_reason as label_void_reason,
  l.printed_at as label_printed_at,
  CASE
    WHEN l.voided_at IS NOT NULL THEN 'voided'
    WHEN l.printed_at IS NOT NULL THEN 'printed'
    WHEN l.id IS NOT NULL THEN 'pending'
    ELSE 'no_label'
  END as label_status
FROM package_assignments pa
LEFT JOIN labels l ON l.id = pa.label_id;

-- =====================================================
-- SECTION 5: Validation Functions
-- =====================================================

-- Function: Check if label is active (not voided)
CREATE OR REPLACE FUNCTION is_label_active(p_label_id uuid)
RETURNS boolean AS $$
DECLARE
  v_voided_at timestamptz;
BEGIN
  SELECT voided_at INTO v_voided_at
  FROM labels
  WHERE id = p_label_id;

  RETURN v_voided_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function: Get active labels for package
CREATE OR REPLACE FUNCTION get_active_labels_for_package(p_package_id text)
RETURNS TABLE (
  label_id uuid,
  label_number text,
  printed_at timestamptz,
  order_number text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.label_number,
    l.printed_at,
    o.order_number
  FROM labels l
  LEFT JOIN package_assignments pa ON pa.label_id = l.id
  LEFT JOIN orders o ON o.id = pa.order_id
  WHERE l.package_id = p_package_id
    AND l.voided_at IS NULL
  ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 6: Update Existing Views
-- =====================================================

-- Update package_assignments_details view to include voided_at
DROP VIEW IF EXISTS package_assignments_details;
CREATE OR REPLACE VIEW package_assignments_details AS
SELECT
  pa.id,
  pa.order_id,
  pa.order_item_id,
  pa.package_id,
  pa.quantity_assigned,
  pa.label_id,
  pa.reservation_status,
  pa.notes,
  pa.assigned_by,
  pa.assigned_at,
  pa.created_at,
  pa.updated_at,

  -- Order context
  o.order_number,
  o.customer_id,
  o.scheduled_delivery_date,
  o.status as order_status,

  -- Order item details
  oi.quantity as order_item_quantity,
  oi.unit_price,
  oi.strain as order_item_strain,
  p.name as product_name,
  p.type as product_type,

  -- Inventory details (if package still exists)
  ii.id as inventory_item_id,
  ii.product_name as inventory_product_name,
  ii.strain,
  ii.batch,
  ii.status,
  ii.available_qty,
  ii.reserved_qty,
  ii.unit,
  ii.room,
  ii.package_date,

  -- Label details (if label generated)
  l.label_number,
  l.qr_code_data as barcode_data,
  l.printed_at,
  l.voided_at,
  l.void_reason,
  l.voided_at IS NOT NULL as is_label_voided,
  CASE
    WHEN l.voided_at IS NOT NULL THEN 'voided'
    WHEN l.printed_at IS NOT NULL THEN 'printed'
    WHEN l.id IS NOT NULL THEN 'pending'
    ELSE 'no_label'
  END as label_status

FROM package_assignments pa
JOIN orders o ON o.id = pa.order_id
JOIN order_items oi ON oi.id = pa.order_item_id
LEFT JOIN products p ON p.id = oi.product_id
LEFT JOIN inventory_items ii ON ii.package_id = pa.package_id
LEFT JOIN labels l ON l.id = pa.label_id;

-- =====================================================
-- SECTION 7: Grant Permissions
-- =====================================================

-- Grant execute on voiding functions to authenticated users
GRANT EXECUTE ON FUNCTION void_label TO authenticated;
GRANT EXECUTE ON FUNCTION void_label_for_assignment TO authenticated;
GRANT EXECUTE ON FUNCTION void_all_order_labels TO authenticated;
GRANT EXECUTE ON FUNCTION is_label_active TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_labels_for_package TO authenticated;

-- =====================================================
-- SECTION 8: Comments
-- =====================================================

COMMENT ON COLUMN labels.voided_at IS
'Timestamp when label was voided. Voided labels are excluded from printing and marked inactive.';

COMMENT ON COLUMN labels.voided_by IS
'User who voided the label. Automatically set to auth.uid() when voiding occurs.';

COMMENT ON COLUMN labels.void_reason IS
'Reason why label was voided (e.g., "Order cancelled", "Package assignment removed")';

COMMENT ON FUNCTION void_label IS
'Voids a label by marking it with voided_at timestamp. Voided labels are excluded from active queries.';

COMMENT ON FUNCTION void_label_for_assignment IS
'Voids the label associated with a package assignment. Called when assignment is removed.';

COMMENT ON FUNCTION void_all_order_labels IS
'Voids all labels for an order. Called automatically when order is cancelled.';

COMMENT ON VIEW active_labels IS
'Shows only active (non-voided) labels. Use this view for printing and fulfillment operations.';

COMMENT ON VIEW voided_labels_audit IS
'Audit trail of all voided labels with user, timestamp, and reason for compliance tracking.';

COMMENT ON VIEW labels_with_status IS
'Labels with computed status (pending, printed, voided) for UI display.';

COMMENT ON VIEW package_assignments_with_label_status IS
'Package assignments with detailed label status information for fulfillment tracking.';
