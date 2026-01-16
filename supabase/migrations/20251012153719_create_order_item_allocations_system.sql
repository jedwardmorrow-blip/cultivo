/*
  # Order Item Allocations System
  
  ## Overview
  This migration creates a soft allocation system that tracks reservations of inventory
  to specific order items without hard-locking the inventory. Users maintain manual control
  over allocations while getting smart suggestions about available inventory.
  
  ## New Tables
  
  ### 1. order_item_allocations
  Tracks soft reservations linking order items to inventory sources:
  - `id` (uuid, primary key) - Unique allocation identifier
  - `order_id` (uuid) - Reference to orders table
  - `order_item_id` (uuid) - Reference to order_items table
  - `inventory_type` (text) - Type of inventory (bulk, packaged)
  - `inventory_id` (uuid) - Reference to internal_bulk_inventory or internal_packaged_inventory
  - `strain` (text) - Strain name for quick filtering
  - `product_type` (text) - Product type (flower, smalls, trim, 3.5g, 14g, 454g)
  - `allocated_quantity` (numeric) - Amount allocated (grams for bulk, units for packaged)
  - `allocation_status` (text) - Status (reserved, confirmed, released, consumed)
  - `allocated_by` (text) - User who made the allocation
  - `allocated_at` (timestamptz) - When allocation was made
  - `notes` (text) - Allocation notes
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last update time
  
  ### 2. order_fulfillment_checklist
  Tracks completion status of all requirements before an order can ship:
  - `id` (uuid, primary key) - Unique identifier
  - `order_id` (uuid) - Reference to orders table
  - `order_item_id` (uuid) - Reference to order_items table
  - `inventory_allocated` (boolean) - Has inventory been allocated
  - `trim_complete` (boolean) - Is trimming complete (if needed)
  - `packaging_complete` (boolean) - Is packaging complete (if needed)
  - `labeling_complete` (boolean) - Are labels printed and applied
  - `coa_attached` (boolean) - Is Certificate of Analysis attached
  - `ready_for_delivery` (boolean) - Computed: all requirements met
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last update time
  
  ## Views
  
  ### 1. inventory_allocation_summary
  Aggregates allocated vs available inventory by strain and product type
  
  ### 2. order_fulfillment_status
  Shows complete fulfillment status for each order including allocation progress
  
  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users
  
  ## Indexes
  - Add indexes on frequently queried fields for performance
*/

-- Create order_item_allocations table
CREATE TABLE IF NOT EXISTS order_item_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  inventory_type text NOT NULL,
  inventory_id uuid NOT NULL,
  strain text NOT NULL,
  product_type text NOT NULL,
  allocated_quantity numeric NOT NULL DEFAULT 0,
  allocation_status text DEFAULT 'reserved',
  allocated_by text,
  allocated_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_inventory_type CHECK (inventory_type IN ('bulk', 'packaged')),
  CONSTRAINT valid_allocation_status CHECK (allocation_status IN ('reserved', 'confirmed', 'released', 'consumed')),
  CONSTRAINT positive_quantity CHECK (allocated_quantity > 0)
);

-- Create order_fulfillment_checklist table
CREATE TABLE IF NOT EXISTS order_fulfillment_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  inventory_allocated boolean DEFAULT false,
  trim_complete boolean DEFAULT false,
  packaging_complete boolean DEFAULT false,
  labeling_complete boolean DEFAULT false,
  coa_attached boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(order_item_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_allocations_order ON order_item_allocations(order_id);
CREATE INDEX IF NOT EXISTS idx_allocations_order_item ON order_item_allocations(order_item_id);
CREATE INDEX IF NOT EXISTS idx_allocations_inventory ON order_item_allocations(inventory_type, inventory_id);
CREATE INDEX IF NOT EXISTS idx_allocations_strain ON order_item_allocations(strain);
CREATE INDEX IF NOT EXISTS idx_allocations_status ON order_item_allocations(allocation_status);
CREATE INDEX IF NOT EXISTS idx_fulfillment_order ON order_fulfillment_checklist(order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_order_item ON order_fulfillment_checklist(order_item_id);

-- Create view for inventory allocation summary
CREATE OR REPLACE VIEW inventory_allocation_summary AS
SELECT 
  strain,
  product_type,
  inventory_type,
  SUM(allocated_quantity) FILTER (WHERE allocation_status IN ('reserved', 'confirmed')) as total_allocated,
  COUNT(DISTINCT order_id) as orders_with_allocations
FROM order_item_allocations
GROUP BY strain, product_type, inventory_type;

-- Create view for bulk inventory with available quantities
CREATE OR REPLACE VIEW bulk_inventory_availability AS
SELECT 
  bi.id,
  bi.strain,
  bi.product_type,
  bi.weight_grams as total_weight,
  COALESCE(SUM(oia.allocated_quantity) FILTER (WHERE oia.allocation_status IN ('reserved', 'confirmed')), 0) as allocated_weight,
  bi.weight_grams - COALESCE(SUM(oia.allocated_quantity) FILTER (WHERE oia.allocation_status IN ('reserved', 'confirmed')), 0) as available_weight,
  bi.batch_id,
  bi.quality_grade,
  bi.trim_date,
  bi.created_at
FROM internal_bulk_inventory bi
LEFT JOIN order_item_allocations oia ON oia.inventory_id = bi.id AND oia.inventory_type = 'bulk'
GROUP BY bi.id, bi.strain, bi.product_type, bi.weight_grams, bi.batch_id, bi.quality_grade, bi.trim_date, bi.created_at;

-- Create view for packaged inventory with available quantities
CREATE OR REPLACE VIEW packaged_inventory_availability AS
SELECT 
  pi.id,
  pi.strain,
  pi.product_type,
  pi.unit_size,
  pi.units_count as total_units,
  COALESCE(SUM(oia.allocated_quantity) FILTER (WHERE oia.allocation_status IN ('reserved', 'confirmed')), 0) as allocated_units,
  pi.units_count - COALESCE(SUM(oia.allocated_quantity) FILTER (WHERE oia.allocation_status IN ('reserved', 'confirmed')), 0) as available_units,
  pi.batch_id,
  pi.package_date,
  pi.created_at
FROM internal_packaged_inventory pi
LEFT JOIN order_item_allocations oia ON oia.inventory_id = pi.id AND oia.inventory_type = 'packaged'
GROUP BY pi.id, pi.strain, pi.product_type, pi.unit_size, pi.units_count, pi.batch_id, pi.package_date, pi.created_at;

-- Create view for order fulfillment status
CREATE OR REPLACE VIEW order_fulfillment_status AS
SELECT 
  o.id as order_id,
  o.order_number,
  o.customer_id,
  o.status as order_status,
  o.requested_delivery_date,
  o.scheduled_delivery_date,
  COUNT(oi.id) as total_items,
  COUNT(ofc.id) FILTER (WHERE ofc.inventory_allocated = true) as items_allocated,
  COUNT(ofc.id) FILTER (WHERE ofc.trim_complete = true) as items_trimmed,
  COUNT(ofc.id) FILTER (WHERE ofc.packaging_complete = true) as items_packaged,
  COUNT(ofc.id) FILTER (WHERE ofc.labeling_complete = true) as items_labeled,
  COUNT(ofc.id) FILTER (WHERE ofc.coa_attached = true) as items_with_coa,
  COUNT(ofc.id) FILTER (
    WHERE ofc.inventory_allocated = true 
    AND ofc.trim_complete = true 
    AND ofc.packaging_complete = true 
    AND ofc.labeling_complete = true 
    AND ofc.coa_attached = true
  ) as items_ready,
  ROUND(
    (COUNT(ofc.id) FILTER (
      WHERE ofc.inventory_allocated = true 
      AND ofc.trim_complete = true 
      AND ofc.packaging_complete = true 
      AND ofc.labeling_complete = true 
      AND ofc.coa_attached = true
    )::numeric / NULLIF(COUNT(oi.id), 0)) * 100, 
    0
  ) as fulfillment_percentage,
  CASE 
    WHEN COUNT(ofc.id) FILTER (
      WHERE ofc.inventory_allocated = true 
      AND ofc.trim_complete = true 
      AND ofc.packaging_complete = true 
      AND ofc.labeling_complete = true 
      AND ofc.coa_attached = true
    ) = COUNT(oi.id) THEN true 
    ELSE false 
  END as ready_to_ship,
  o.created_at,
  o.updated_at
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN order_fulfillment_checklist ofc ON ofc.order_item_id = oi.id
WHERE o.archived = false
GROUP BY o.id, o.order_number, o.customer_id, o.status, o.requested_delivery_date, o.scheduled_delivery_date, o.created_at, o.updated_at;

-- Enable Row Level Security
ALTER TABLE order_item_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_fulfillment_checklist ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Authenticated users can view order_item_allocations"
  ON order_item_allocations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can modify order_item_allocations"
  ON order_item_allocations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view order_fulfillment_checklist"
  ON order_fulfillment_checklist FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can modify order_fulfillment_checklist"
  ON order_fulfillment_checklist FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to automatically create fulfillment checklist when order items are created
CREATE OR REPLACE FUNCTION create_order_item_fulfillment_checklist()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO order_fulfillment_checklist (order_id, order_item_id)
  VALUES (NEW.order_id, NEW.id)
  ON CONFLICT (order_item_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic fulfillment checklist creation
DROP TRIGGER IF EXISTS order_item_fulfillment_checklist_trigger ON order_items;
CREATE TRIGGER order_item_fulfillment_checklist_trigger
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION create_order_item_fulfillment_checklist();

-- Create function to update fulfillment checklist when allocations change
CREATE OR REPLACE FUNCTION update_fulfillment_allocation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update inventory_allocated status based on allocations
  UPDATE order_fulfillment_checklist
  SET 
    inventory_allocated = EXISTS(
      SELECT 1 FROM order_item_allocations 
      WHERE order_item_id = order_fulfillment_checklist.order_item_id 
      AND allocation_status IN ('reserved', 'confirmed')
    ),
    updated_at = now()
  WHERE order_item_id IN (
    SELECT DISTINCT order_item_id 
    FROM order_item_allocations 
    WHERE id = COALESCE(NEW.id, OLD.id)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update fulfillment checklist on allocation changes
DROP TRIGGER IF EXISTS allocation_fulfillment_update_trigger ON order_item_allocations;
CREATE TRIGGER allocation_fulfillment_update_trigger
  AFTER INSERT OR UPDATE OR DELETE ON order_item_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_fulfillment_allocation_status();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_allocation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_allocations_updated_at ON order_item_allocations;
CREATE TRIGGER update_allocations_updated_at
  BEFORE UPDATE ON order_item_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_allocation_updated_at();

DROP TRIGGER IF EXISTS update_fulfillment_checklist_updated_at ON order_fulfillment_checklist;
CREATE TRIGGER update_fulfillment_checklist_updated_at
  BEFORE UPDATE ON order_fulfillment_checklist
  FOR EACH ROW
  EXECUTE FUNCTION update_allocation_updated_at();

-- Backfill fulfillment checklists for existing order items
INSERT INTO order_fulfillment_checklist (order_id, order_item_id)
SELECT oi.order_id, oi.id
FROM order_items oi
LEFT JOIN order_fulfillment_checklist ofc ON ofc.order_item_id = oi.id
WHERE ofc.id IS NULL
ON CONFLICT (order_item_id) DO NOTHING;
