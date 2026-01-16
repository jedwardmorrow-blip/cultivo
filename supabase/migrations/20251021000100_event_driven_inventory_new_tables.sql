/*
  # Event-Driven Inventory Core - New Tables

  ## Overview
  This migration creates new tables to support the event-driven inventory system:
  - order_fulfillment_items: Canonical shipment facts
  - inventory_reconciliation_lines: Detailed count variance tracking
  - inventory_daily_snapshots: Point-in-time reporting without ledger replay

  ## New Tables

  1. **order_fulfillment_items**
     - Tracks actual items fulfilled for orders
     - Links specific inventory_items to order_items
     - Records batch_id for traceability
     - Supports manifest generation and COA resolution

  2. **inventory_reconciliation_lines**
     - Detail lines for physical count reconciliations
     - Tracks expected vs counted quantities
     - Supports variance investigation and approval

  3. **inventory_daily_snapshots**
     - Daily materialized view of on_hand and ATP by item
     - Enables fast historical reporting without ledger replay
     - Composite primary key on (snapshot_date, item_id)

  ## Security
  - RLS enabled on all tables
  - Authenticated users have full access
  - Policies created for SELECT, INSERT, UPDATE

  ## Indexes
  - Performance indexes on foreign keys and date columns
*/

-- =====================================================
-- TABLE 1: order_fulfillment_items
-- =====================================================

CREATE TABLE IF NOT EXISTS order_fulfillment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  batch_id uuid REFERENCES batch_registry(id) ON DELETE SET NULL,
  qty numeric NOT NULL CHECK (qty > 0),
  unit text NOT NULL CHECK (unit IN ('unit', 'g')),
  fulfilled_at timestamptz DEFAULT now(),
  fulfilled_by uuid,
  manifest_id uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_items_order ON order_fulfillment_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_items_order_item ON order_fulfillment_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_items_item ON order_fulfillment_items(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_items_batch ON order_fulfillment_items(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_items_manifest ON order_fulfillment_items(manifest_id) WHERE manifest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_items_fulfilled_at ON order_fulfillment_items(fulfilled_at);

-- Enable RLS
ALTER TABLE order_fulfillment_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view order_fulfillment_items"
  ON order_fulfillment_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert order_fulfillment_items"
  ON order_fulfillment_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update order_fulfillment_items"
  ON order_fulfillment_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add table documentation
COMMENT ON TABLE order_fulfillment_items IS
'Canonical shipment facts linking specific inventory items to order items.
Used for: Fulfillment tracking, manifest generation, COA resolution via batch lineage.
Each row represents a specific inventory item assigned to fulfill an order line.
Migration: 20251021000100_event_driven_inventory_new_tables.sql';

COMMENT ON COLUMN order_fulfillment_items.item_id IS 'Specific inventory item used for fulfillment (manually selected or auto-assigned).';
COMMENT ON COLUMN order_fulfillment_items.batch_id IS 'Batch this item belongs to (for COA and lineage traceability).';
COMMENT ON COLUMN order_fulfillment_items.qty IS 'Quantity fulfilled (in unit specified by unit column).';
COMMENT ON COLUMN order_fulfillment_items.unit IS 'Unit of measure: ''unit'' for packaged goods, ''g'' for bulk orders.';
COMMENT ON COLUMN order_fulfillment_items.manifest_id IS 'Reference to delivery manifest (if applicable).';

-- =====================================================
-- TABLE 2: inventory_reconciliation_lines
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_reconciliation_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id uuid REFERENCES inventory_reconciliation(id) ON DELETE CASCADE,
  item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  expected_qty numeric NOT NULL,
  counted_qty numeric NOT NULL,
  variance_qty numeric GENERATED ALWAYS AS (counted_qty - expected_qty) STORED,
  unit text NOT NULL CHECK (unit IN ('g', 'unit')),
  reason text,
  approved boolean DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reconciliation_lines_reconciliation ON inventory_reconciliation_lines(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_lines_item ON inventory_reconciliation_lines(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reconciliation_lines_approved ON inventory_reconciliation_lines(approved);

-- Enable RLS
ALTER TABLE inventory_reconciliation_lines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view inventory_reconciliation_lines"
  ON inventory_reconciliation_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert inventory_reconciliation_lines"
  ON inventory_reconciliation_lines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory_reconciliation_lines"
  ON inventory_reconciliation_lines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_reconciliation_lines_updated_at
  BEFORE UPDATE ON inventory_reconciliation_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add table documentation
COMMENT ON TABLE inventory_reconciliation_lines IS
'Detail lines for physical inventory count reconciliations.
Tracks expected vs counted quantities with variance calculation.
Used for: Cycle counts, inventory audits, variance investigation.
Migration: 20251021000100_event_driven_inventory_new_tables.sql';

COMMENT ON COLUMN inventory_reconciliation_lines.variance_qty IS 'Calculated variance (counted - expected). Positive = overage, negative = shortage.';
COMMENT ON COLUMN inventory_reconciliation_lines.approved IS 'Whether variance has been reviewed and approved for reconciliation movement.';

-- =====================================================
-- TABLE 3: inventory_daily_snapshots
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_daily_snapshots (
  snapshot_date date NOT NULL,
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  on_hand_qty numeric NOT NULL,
  atp_qty numeric NOT NULL,
  unit text NOT NULL CHECK (unit IN ('g', 'unit')),
  batch_id uuid REFERENCES batch_registry(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (snapshot_date, item_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date ON inventory_daily_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_batch ON inventory_daily_snapshots(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_item ON inventory_daily_snapshots(item_id);

-- Enable RLS
ALTER TABLE inventory_daily_snapshots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view inventory_daily_snapshots"
  ON inventory_daily_snapshots FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert inventory_daily_snapshots"
  ON inventory_daily_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory_daily_snapshots"
  ON inventory_daily_snapshots FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add table documentation
COMMENT ON TABLE inventory_daily_snapshots IS
'Daily materialized snapshots of inventory balances for fast reporting.
Captures point-in-time on_hand and ATP quantities without replaying the ledger.
Primary use: Historical reporting, trend analysis, aging reports.
Generated by: fn_generate_daily_snapshot() (scheduled daily).
Migration: 20251021000100_event_driven_inventory_new_tables.sql';

COMMENT ON COLUMN inventory_daily_snapshots.snapshot_date IS 'Date of snapshot (typically end-of-day).';
COMMENT ON COLUMN inventory_daily_snapshots.on_hand_qty IS 'Physical on-hand quantity at snapshot time.';
COMMENT ON COLUMN inventory_daily_snapshots.atp_qty IS 'Available-To-Promise quantity at snapshot time (on_hand minus soft reserves).';
COMMENT ON COLUMN inventory_daily_snapshots.batch_id IS 'Batch this item belongs to (for batch-level reporting).';

-- =====================================================
-- Create helper view for snapshot coverage
-- =====================================================

CREATE OR REPLACE VIEW v_snapshot_coverage AS
WITH date_range AS (
  SELECT DISTINCT snapshot_date
  FROM inventory_daily_snapshots
  ORDER BY snapshot_date DESC
  LIMIT 365
)
SELECT
  snapshot_date,
  COUNT(*) as item_count,
  SUM(on_hand_qty) FILTER (WHERE unit = 'g') as total_grams,
  SUM(on_hand_qty) FILTER (WHERE unit = 'unit') as total_units
FROM inventory_daily_snapshots
WHERE snapshot_date IN (SELECT snapshot_date FROM date_range)
GROUP BY snapshot_date
ORDER BY snapshot_date DESC;

COMMENT ON VIEW v_snapshot_coverage IS
'Shows snapshot coverage for last 365 days with item counts and totals.
Use to verify snapshot generation and identify missing dates.';

-- Grant view access
GRANT SELECT ON v_snapshot_coverage TO authenticated;
