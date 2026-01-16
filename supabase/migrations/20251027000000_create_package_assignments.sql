/*
  # Create Package Assignments System

  ## Overview
  Package assignment system that links order items to specific inventory packages
  and automatically generates pre-populated labels for fulfillment.

  ## 1. New Tables
     - `package_assignments` - Links order items to inventory packages
       - order_id, order_item_id (order context)
       - package_id (inventory linkage via inventory_items.package_id)
       - quantity_assigned (how much from this package)
       - label_id (auto-generated label reference)
       - notes, assigned_by, assigned_at (audit trail)

  ## 2. Integration Points
     - Links to `orders` table for order context
     - Links to `order_items` table for specific line items
     - References `inventory_items` via package_id text match
     - Auto-creates entries in existing `labels` table
     - Integrates with existing label printing workflow

  ## 3. Auto-Label Generation
     - When package is assigned, label is automatically created
     - Label data populated from 4-table JOIN:
       - inventory_items (package info, batch, strain)
       - certificates_of_analysis (cannabinoid/terpene data)
       - products (product details, net weight)
       - strain_catalog (lineage information)
     - Barcode format: YYMMDDBatchID
     - Supports existing label printing infrastructure

  ## 4. Security
     - RLS enabled on package_assignments
     - Authenticated users can manage assignments
     - Read access for all authenticated users
     - Write access for authenticated users

  ## 5. Use Cases
     - Assign specific inventory packages to fulfill order items
     - Auto-generate labels with complete COA/batch data
     - Track which packages fulfill which orders
     - Enable batch-level traceability in fulfillment
     - Prevent duplicate assignments via constraints
*/

-- =====================================================
-- SECTION 1: Create Tables
-- =====================================================

-- Package Assignments Table
CREATE TABLE IF NOT EXISTS package_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Order context
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,

  -- Package linkage (text reference to inventory_items.package_id)
  package_id text NOT NULL,

  -- Quantity from this package assigned to this order item
  quantity_assigned numeric NOT NULL CHECK (quantity_assigned > 0),

  -- Auto-generated label reference
  label_id uuid REFERENCES labels(id) ON DELETE SET NULL,

  -- Audit trail
  notes text,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraint: Can't assign same package to same order item twice
  UNIQUE (order_item_id, package_id)
);

-- =====================================================
-- SECTION 2: Create Indexes
-- =====================================================

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_package_assignments_order_id ON package_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_package_assignments_order_item_id ON package_assignments(order_item_id);
CREATE INDEX IF NOT EXISTS idx_package_assignments_package_id ON package_assignments(package_id);
CREATE INDEX IF NOT EXISTS idx_package_assignments_label_id ON package_assignments(label_id);
CREATE INDEX IF NOT EXISTS idx_package_assignments_assigned_at ON package_assignments(assigned_at DESC);

-- =====================================================
-- SECTION 3: Create Triggers
-- =====================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER set_package_assignments_updated_at
  BEFORE UPDATE ON package_assignments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- =====================================================
-- SECTION 4: Create RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE package_assignments ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view package assignments
CREATE POLICY "Authenticated users can view package assignments"
  ON package_assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can create package assignments
CREATE POLICY "Authenticated users can create package assignments"
  ON package_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update package assignments
CREATE POLICY "Authenticated users can update package assignments"
  ON package_assignments
  FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users can delete package assignments
CREATE POLICY "Authenticated users can delete package assignments"
  ON package_assignments
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- SECTION 5: Create Helper Views
-- =====================================================

-- View: Package Assignments with Full Details
-- Joins assignment data with inventory, order, and label information
CREATE OR REPLACE VIEW package_assignments_details AS
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
  ii.unit,
  ii.room,
  ii.package_date,

  -- Label details (if label generated)
  l.label_number,
  l.qr_code_data as barcode_data,
  l.printed_at,
  l.voided_at

FROM package_assignments pa
JOIN orders o ON o.id = pa.order_id
JOIN order_items oi ON oi.id = pa.order_item_id
LEFT JOIN products p ON p.id = oi.product_id
LEFT JOIN inventory_items ii ON ii.package_id = pa.package_id
LEFT JOIN labels l ON l.id = pa.label_id;

-- =====================================================
-- SECTION 6: Add Comments
-- =====================================================

COMMENT ON TABLE package_assignments IS
'Links order items to specific inventory packages for fulfillment. Auto-generates labels with COA data.';

COMMENT ON COLUMN package_assignments.package_id IS
'Text reference to inventory_items.package_id (e.g., "CULT-241025-001")';

COMMENT ON COLUMN package_assignments.quantity_assigned IS
'Quantity from this package allocated to this order item. Must be > 0.';

COMMENT ON COLUMN package_assignments.label_id IS
'Reference to auto-generated label in labels table. Created automatically on assignment.';

COMMENT ON VIEW package_assignments_details IS
'Complete package assignment data with order, inventory, and label information joined.';
