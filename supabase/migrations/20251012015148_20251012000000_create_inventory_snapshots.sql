/*
  # Create Inventory Snapshots System

  1. New Tables
    - `inventory_snapshots`
      - Stores metadata about each CSV import
      - Tracks import date, file name, row count, and status

    - `inventory_items`
      - Stores current state of each Package ID from Dutchie
      - Updated with each CSV import
      - Tracks SKU, product name, batch, strain, status, category, room, quantity

    - `inventory_changes`
      - Tracks deltas between CSV imports
      - Records what changed (new packages, quantity changes, status changes, room moves)

    - `conversion_rates`
      - Stores default and strain-specific conversion rates
      - Binned → Bucked, Bucked → Bulk, etc.

  2. Security
    - Enable RLS on all tables
    - Add policies for anonymous users (temporary for development)
*/

-- Inventory snapshots table (metadata for each CSV import)
CREATE TABLE IF NOT EXISTS inventory_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_date timestamptz DEFAULT now(),
  file_name text NOT NULL,
  imported_by text DEFAULT 'system',
  row_count integer DEFAULT 0,
  status text DEFAULT 'completed',
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Inventory items table (current state of each Package ID)
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id text UNIQUE NOT NULL,
  sku text,
  product_name text,
  batch text,
  strain text,
  status text,
  category text,
  tags text,
  vendor text,
  room text,
  available_qty numeric,
  net_weight numeric,
  unit text,
  quantity_with_allocated numeric,
  snapshot_id uuid REFERENCES inventory_snapshots(id),
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Inventory changes table (track deltas between imports)
CREATE TABLE IF NOT EXISTS inventory_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id text NOT NULL,
  change_date timestamptz DEFAULT now(),
  change_type text NOT NULL, -- 'created', 'quantity_changed', 'status_changed', 'room_moved', 'deleted'
  previous_value text,
  new_value text,
  previous_qty numeric,
  new_qty numeric,
  snapshot_id uuid REFERENCES inventory_snapshots(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Conversion rates table
CREATE TABLE IF NOT EXISTS conversion_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_stage text NOT NULL, -- 'binned', 'bucked', 'bulk'
  to_stage text NOT NULL, -- 'bucked', 'bulk', 'packaged'
  strain text, -- null = default for all strains
  rate_percentage numeric DEFAULT 100,
  split_percentage numeric, -- for bucked → bulk: A-buds vs Smalls split
  effective_date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_package_id ON inventory_items(package_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_strain ON inventory_items(strain);
CREATE INDEX IF NOT EXISTS idx_inventory_items_batch ON inventory_items(batch);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_changes_package_id ON inventory_changes(package_id);
CREATE INDEX IF NOT EXISTS idx_inventory_changes_change_date ON inventory_changes(change_date);

-- Enable RLS
ALTER TABLE inventory_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for anonymous users (development)
CREATE POLICY "Allow anonymous read inventory_snapshots"
  ON inventory_snapshots FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert inventory_snapshots"
  ON inventory_snapshots FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous read inventory_items"
  ON inventory_items FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert inventory_items"
  ON inventory_items FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update inventory_items"
  ON inventory_items FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous read inventory_changes"
  ON inventory_changes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert inventory_changes"
  ON inventory_changes FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous read conversion_rates"
  ON conversion_rates FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert conversion_rates"
  ON conversion_rates FOR INSERT
  TO anon
  WITH CHECK (true);

-- Insert default conversion rates
INSERT INTO conversion_rates (from_stage, to_stage, rate_percentage, split_percentage, notes)
VALUES
  ('binned', 'bucked', 66, NULL, 'Default: 66% conversion (34% loss to stems)'),
  ('bucked', 'bulk', 75, 50, 'Default: 75% conversion, 50/50 split between A-buds and Smalls')
ON CONFLICT DO NOTHING;