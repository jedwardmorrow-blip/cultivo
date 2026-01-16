/*
  # Allocation Transformation System

  ## Overview
  This migration adds the ability to transform allocations as inventory moves through
  processing stages (bucked → bulk → packaged). It maintains traceability while adapting
  allocations to reflect actual inventory rather than projected inventory.

  ## Key Features
  1. Parent-child allocation tracking for full transformation history
  2. Variance tracking between projected and actual yields
  3. Allocation conflict detection and resolution
  4. System notifications for critical issues
  5. Support for bucked material allocations

  ## New Fields

  ### order_item_allocations enhancements
  - `parent_allocation_id` (uuid) - References parent allocation in transformation chain
  - `consumed_at` (timestamptz) - When original allocation was consumed/transformed
  - `variance_grams` (numeric) - Difference between projected and actual yield
  - `projected_quantity` (numeric) - Original projected quantity (for bucked allocations)
  - `transformation_session_id` (uuid) - Session that transformed this allocation

  ## New Tables

  ### 1. allocation_conflicts
  Tracks conflicts detected during CSV sync or processing

  ### 2. system_notifications
  Stores system-generated notifications requiring user attention

  ## Security
  - Enable RLS on all new tables
  - Add policies for authenticated users
*/

-- Add new fields to order_item_allocations
ALTER TABLE order_item_allocations
ADD COLUMN IF NOT EXISTS parent_allocation_id uuid REFERENCES order_item_allocations(id),
ADD COLUMN IF NOT EXISTS consumed_at timestamptz,
ADD COLUMN IF NOT EXISTS variance_grams numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS projected_quantity numeric,
ADD COLUMN IF NOT EXISTS transformation_session_id uuid,
ADD COLUMN IF NOT EXISTS is_transformed boolean DEFAULT false;

-- Update allocation_status enum to include new statuses
DO $$ BEGIN
  ALTER TYPE allocation_status DROP CONSTRAINT IF EXISTS allocation_status_check;
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

-- Drop the constraint if it exists
ALTER TABLE order_item_allocations DROP CONSTRAINT IF EXISTS valid_allocation_status;

-- Add updated constraint
ALTER TABLE order_item_allocations
ADD CONSTRAINT valid_allocation_status
CHECK (allocation_status IN ('reserved', 'confirmed', 'released', 'consumed', 'transformed'));

-- Update inventory_type constraint to include 'bucked'
ALTER TABLE order_item_allocations DROP CONSTRAINT IF EXISTS valid_inventory_type;

ALTER TABLE order_item_allocations
ADD CONSTRAINT valid_inventory_type
CHECK (inventory_type IN ('bulk', 'packaged', 'bucked'));

-- Create allocation_conflicts table
CREATE TABLE IF NOT EXISTS allocation_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id uuid REFERENCES inventory_reconciliation(id),
  package_id text,
  inventory_type text,
  strain text,
  conflict_type text NOT NULL,
  csv_weight numeric,
  internal_weight numeric,
  allocated_weight numeric,
  shortfall numeric,
  status text DEFAULT 'requires_review',
  severity text DEFAULT 'warning',
  resolution_action text,
  resolution_notes text,
  resolved_by text,
  resolved_at timestamptz,
  detected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_conflict_type CHECK (conflict_type IN ('over_allocated', 'package_missing', 'weight_mismatch', 'allocation_broken')),
  CONSTRAINT valid_conflict_status CHECK (status IN ('requires_review', 'resolved', 'ignored', 'auto_resolved')),
  CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'critical'))
);

-- Create system_notifications table
CREATE TABLE IF NOT EXISTS system_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  severity text DEFAULT 'info',
  title text NOT NULL,
  message text,
  related_entity_type text,
  related_entity_id uuid,
  action_required boolean DEFAULT false,
  action_url text,
  acknowledged boolean DEFAULT false,
  acknowledged_by text,
  acknowledged_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_notification_severity CHECK (severity IN ('info', 'warning', 'critical', 'success'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_allocations_parent ON order_item_allocations(parent_allocation_id);
CREATE INDEX IF NOT EXISTS idx_allocations_transformation_session ON order_item_allocations(transformation_session_id);
CREATE INDEX IF NOT EXISTS idx_allocations_consumed ON order_item_allocations(consumed_at) WHERE consumed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conflicts_status ON allocation_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_conflicts_severity ON allocation_conflicts(severity);
CREATE INDEX IF NOT EXISTS idx_conflicts_reconciliation ON allocation_conflicts(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_acknowledged ON system_notifications(acknowledged) WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON system_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_severity ON system_notifications(severity);

-- Create view for bucked inventory with allocations
CREATE OR REPLACE VIEW bucked_inventory_with_allocations AS
SELECT
  bi.package_id,
  bi.strain,
  bi.batch_id,
  bi.current_weight_grams as total_weight,
  bi.allocated_weight_grams,
  bi.available_weight_grams,
  COALESCE(alloc_summary.active_allocations, 0) as allocated_by_orders,
  COALESCE(alloc_summary.orders_count, 0) as orders_count,
  alloc_summary.order_numbers,
  bi.status,
  bi.room,
  bi.last_session_date,
  bi.created_at,
  bi.updated_at
FROM internal_bucked_inventory bi
LEFT JOIN LATERAL (
  SELECT
    SUM(oia.allocated_quantity) as active_allocations,
    COUNT(DISTINCT oia.order_id) as orders_count,
    STRING_AGG(DISTINCT o.order_number, ', ') as order_numbers
  FROM order_item_allocations oia
  JOIN orders o ON o.id = oia.order_id
  WHERE oia.inventory_id = bi.package_id
    AND oia.inventory_type = 'bucked'
    AND oia.allocation_status IN ('reserved', 'confirmed')
  GROUP BY oia.inventory_id
) alloc_summary ON true;

-- Create view for bulk inventory with allocations
CREATE OR REPLACE VIEW bulk_inventory_with_allocations AS
SELECT
  bi.id,
  bi.strain,
  bi.batch_id,
  bi.product_type,
  bi.weight_grams as total_weight,
  bi.allocated_weight_grams,
  bi.available_weight_grams,
  COALESCE(alloc_summary.active_allocations, 0) as allocated_by_orders,
  COALESCE(alloc_summary.orders_count, 0) as orders_count,
  alloc_summary.order_numbers,
  bi.quality_grade,
  bi.trim_date,
  bi.source_package_id,
  bi.created_at,
  bi.updated_at
FROM internal_bulk_inventory bi
LEFT JOIN LATERAL (
  SELECT
    SUM(oia.allocated_quantity) as active_allocations,
    COUNT(DISTINCT oia.order_id) as orders_count,
    STRING_AGG(DISTINCT o.order_number, ', ') as order_numbers
  FROM order_item_allocations oia
  JOIN orders o ON o.id = oia.order_id
  WHERE oia.inventory_id = bi.id
    AND oia.inventory_type = 'bulk'
    AND oia.allocation_status IN ('reserved', 'confirmed')
  GROUP BY oia.inventory_id
) alloc_summary ON true;

-- Create view for packaged inventory with allocations
CREATE OR REPLACE VIEW packaged_inventory_with_allocations AS
SELECT
  pi.id,
  pi.strain,
  pi.batch_id,
  pi.product_type,
  pi.unit_size,
  pi.units_count as total_units,
  pi.units_allocated,
  pi.units_available,
  COALESCE(alloc_summary.active_allocations, 0) as allocated_by_orders,
  COALESCE(alloc_summary.orders_count, 0) as orders_count,
  alloc_summary.order_numbers,
  pi.packaging_session_id,
  pi.package_date,
  pi.created_at,
  pi.updated_at
FROM internal_packaged_inventory pi
LEFT JOIN LATERAL (
  SELECT
    SUM(oia.allocated_quantity) as active_allocations,
    COUNT(DISTINCT oia.order_id) as orders_count,
    STRING_AGG(DISTINCT o.order_number, ', ') as order_numbers
  FROM order_item_allocations oia
  JOIN orders o ON o.id = oia.order_id
  WHERE oia.inventory_id = pi.id
    AND oia.inventory_type = 'packaged'
    AND oia.allocation_status IN ('reserved', 'confirmed')
  GROUP BY oia.inventory_id
) alloc_summary ON true;

-- Create view for allocation impact summary (system-wide stats)
CREATE OR REPLACE VIEW allocation_impact_summary AS
SELECT
  inventory_type,
  total_inventory,
  total_allocated,
  total_available,
  CASE
    WHEN total_inventory > 0
    THEN ROUND((total_allocated::numeric / total_inventory) * 100, 1)
    ELSE 0
  END as allocation_percentage,
  items_count,
  items_fully_allocated,
  items_critically_low
FROM (
  SELECT
    'bucked' as inventory_type,
    SUM(current_weight_grams) as total_inventory,
    SUM(allocated_weight_grams) as total_allocated,
    SUM(available_weight_grams) as total_available,
    COUNT(*) as items_count,
    COUNT(*) FILTER (WHERE available_weight_grams <= 0) as items_fully_allocated,
    COUNT(*) FILTER (WHERE available_weight_grams > 0 AND available_weight_grams < current_weight_grams * 0.1) as items_critically_low
  FROM internal_bucked_inventory
  WHERE status = 'available'

  UNION ALL

  SELECT
    'bulk' as inventory_type,
    SUM(weight_grams) as total_inventory,
    SUM(allocated_weight_grams) as total_allocated,
    SUM(available_weight_grams) as total_available,
    COUNT(*) as items_count,
    COUNT(*) FILTER (WHERE available_weight_grams <= 0) as items_fully_allocated,
    COUNT(*) FILTER (WHERE available_weight_grams > 0 AND available_weight_grams < weight_grams * 0.1) as items_critically_low
  FROM internal_bulk_inventory

  UNION ALL

  SELECT
    'packaged' as inventory_type,
    SUM(units_count) as total_inventory,
    SUM(units_allocated) as total_allocated,
    SUM(units_available) as total_available,
    COUNT(*) as items_count,
    COUNT(*) FILTER (WHERE units_available <= 0) as items_fully_allocated,
    COUNT(*) FILTER (WHERE units_available > 0 AND units_available < units_count * 0.1) as items_critically_low
  FROM internal_packaged_inventory
) combined;

-- Enable Row Level Security
ALTER TABLE allocation_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view allocation_conflicts"
  ON allocation_conflicts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can modify allocation_conflicts"
  ON allocation_conflicts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view system_notifications"
  ON system_notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can acknowledge notifications"
  ON system_notifications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can create notifications"
  ON system_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add updated_at trigger for new tables
DROP TRIGGER IF EXISTS update_allocation_conflicts_updated_at ON allocation_conflicts;
DROP TRIGGER IF EXISTS update_system_notifications_updated_at ON system_notifications;

-- Add comments for documentation
COMMENT ON TABLE allocation_conflicts IS 'Tracks conflicts detected during CSV sync or inventory processing that require resolution';
COMMENT ON TABLE system_notifications IS 'System-generated notifications for critical events requiring user attention';
COMMENT ON COLUMN order_item_allocations.parent_allocation_id IS 'References parent allocation when this is a transformed allocation (e.g., bucked → bulk)';
COMMENT ON COLUMN order_item_allocations.variance_grams IS 'Difference between projected and actual yield after processing';
COMMENT ON COLUMN order_item_allocations.projected_quantity IS 'Original projected quantity before processing (used for variance calculation)';
COMMENT ON COLUMN order_item_allocations.transformation_session_id IS 'Trim or packaging session that transformed this allocation';
