/*
  # Internal Inventory Tracking System
  
  ## Overview
  This migration creates a comprehensive internal inventory tracking system that runs in parallel
  with CSV imports from Dutchie. It allows real-time tracking of inventory changes through trim
  and packaging sessions while maintaining the ability to reconcile with Dutchie snapshots.
  
  ## New Tables
  
  ### 1. internal_bucked_inventory
  Tracks our internal expected quantities of bucked inventory based on session activity.
  - `package_id` (text, primary key) - Package identifier
  - `strain` (text) - Strain name
  - `batch_id` (text) - Batch identifier
  - `initial_weight_grams` (numeric) - Starting weight when first tracked
  - `current_weight_grams` (numeric) - Current expected weight after deductions
  - `allocated_weight_grams` (numeric) - Weight currently allocated to active sessions
  - `available_weight_grams` (numeric) - Calculated: current - allocated
  - `last_session_date` (date) - Last time this was used in a session
  - `status` (text) - Status (available, in_use, depleted)
  - `room` (text) - Storage location
  - `notes` (text) - Internal notes
  - `created_at` (timestamptz) - When first tracked
  - `updated_at` (timestamptz) - Last update
  - `synced_from_snapshot_id` (uuid) - Reference to inventory_snapshots
  
  ### 2. internal_bulk_inventory
  Tracks our internal expected quantities of bulk inventory (flower, smalls, trim).
  
  ### 3. internal_packaged_inventory
  Tracks packaged units created through packaging sessions.
  
  ### 4. inventory_movements
  Audit trail of all inventory changes with full traceability.
  
  ### 5. inventory_reconciliation
  Stores results of reconciliation between CSV snapshots and internal tracking.
  
  ### 6. inventory_variances
  Detailed variance records for discrepancies found during reconciliation.
  
  ### 7. order_fulfillment_items
  Links packaged units to specific orders for fulfillment tracking.
  
  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users
  
  ## Indexes
  - Add indexes on frequently queried fields for performance
*/

-- Create internal_bucked_inventory table
CREATE TABLE IF NOT EXISTS internal_bucked_inventory (
  package_id text PRIMARY KEY,
  strain text NOT NULL,
  batch_id text,
  initial_weight_grams numeric NOT NULL DEFAULT 0,
  current_weight_grams numeric NOT NULL DEFAULT 0,
  allocated_weight_grams numeric NOT NULL DEFAULT 0,
  available_weight_grams numeric GENERATED ALWAYS AS (current_weight_grams - allocated_weight_grams) STORED,
  last_session_date date,
  status text DEFAULT 'available',
  room text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  synced_from_snapshot_id uuid REFERENCES inventory_snapshots(id)
);

-- Create internal_bulk_inventory table
CREATE TABLE IF NOT EXISTS internal_bulk_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strain text NOT NULL,
  batch_id text,
  product_type text NOT NULL,
  weight_grams numeric NOT NULL DEFAULT 0,
  allocated_weight_grams numeric NOT NULL DEFAULT 0,
  available_weight_grams numeric GENERATED ALWAYS AS (weight_grams - allocated_weight_grams) STORED,
  quality_grade text,
  trim_date date,
  source_package_id text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create internal_packaged_inventory table
CREATE TABLE IF NOT EXISTS internal_packaged_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strain text NOT NULL,
  batch_id text,
  product_type text NOT NULL,
  unit_size text NOT NULL,
  units_count integer NOT NULL DEFAULT 0,
  units_allocated integer NOT NULL DEFAULT 0,
  units_available integer GENERATED ALWAYS AS (units_count - units_allocated) STORED,
  packaging_session_id uuid REFERENCES packaging_sessions(id),
  package_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inventory_movements table
CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_date timestamptz DEFAULT now(),
  movement_type text NOT NULL,
  session_id uuid,
  session_type text,
  source_inventory_type text,
  source_identifier text,
  source_weight_change numeric,
  destination_inventory_type text,
  destination_identifier text,
  destination_weight_change numeric,
  strain text,
  batch_id text,
  notes text,
  created_by text,
  created_at timestamptz DEFAULT now()
);

-- Create inventory_reconciliation table
CREATE TABLE IF NOT EXISTS inventory_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_date timestamptz DEFAULT now(),
  previous_snapshot_id uuid REFERENCES inventory_snapshots(id),
  current_snapshot_id uuid REFERENCES inventory_snapshots(id),
  packages_compared integer DEFAULT 0,
  packages_matched integer DEFAULT 0,
  packages_with_variance integer DEFAULT 0,
  total_variance_grams numeric DEFAULT 0,
  status text DEFAULT 'pending_review',
  reviewed_by text,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create inventory_variances table
CREATE TABLE IF NOT EXISTS inventory_variances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id uuid REFERENCES inventory_reconciliation(id),
  package_id text,
  inventory_type text,
  strain text,
  expected_quantity numeric,
  actual_quantity numeric,
  variance_quantity numeric,
  variance_category text,
  resolution_status text DEFAULT 'pending',
  resolution_notes text,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create order_fulfillment_items table
CREATE TABLE IF NOT EXISTS order_fulfillment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  order_item_id uuid REFERENCES order_items(id),
  packaging_session_id uuid REFERENCES packaging_sessions(id),
  packaged_inventory_id uuid REFERENCES internal_packaged_inventory(id),
  strain text NOT NULL,
  product_type text NOT NULL,
  unit_size text NOT NULL,
  units_assigned integer NOT NULL DEFAULT 0,
  assignment_date timestamptz DEFAULT now(),
  status text DEFAULT 'assigned',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add check constraints using DO blocks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_bucked_status'
  ) THEN
    ALTER TABLE internal_bucked_inventory
    ADD CONSTRAINT valid_bucked_status
    CHECK (status IN ('available', 'in_use', 'depleted', 'quarantine'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_bulk_product_type'
  ) THEN
    ALTER TABLE internal_bulk_inventory
    ADD CONSTRAINT valid_bulk_product_type
    CHECK (product_type IN ('flower', 'smalls', 'trim'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_unit_size'
  ) THEN
    ALTER TABLE internal_packaged_inventory
    ADD CONSTRAINT valid_unit_size
    CHECK (unit_size IN ('3.5g', '14g', '454g'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_movement_type'
  ) THEN
    ALTER TABLE inventory_movements
    ADD CONSTRAINT valid_movement_type
    CHECK (movement_type IN ('trim_start', 'trim_complete', 'packaging_start', 'packaging_complete', 'manual_adjustment', 'csv_sync'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_reconciliation_status'
  ) THEN
    ALTER TABLE inventory_reconciliation
    ADD CONSTRAINT valid_reconciliation_status
    CHECK (status IN ('pending_review', 'reviewed', 'approved'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_variance_category'
  ) THEN
    ALTER TABLE inventory_variances
    ADD CONSTRAINT valid_variance_category
    CHECK (variance_category IN ('manual_adjustment', 'theft_loss', 'measurement_error', 'system_error', 'unrecorded_session', 'other'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_var_resolution_status'
  ) THEN
    ALTER TABLE inventory_variances
    ADD CONSTRAINT valid_var_resolution_status
    CHECK (resolution_status IN ('pending', 'accepted_dutchie_value', 'investigated', 'resolved'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_fulfillment_status'
  ) THEN
    ALTER TABLE order_fulfillment_items
    ADD CONSTRAINT valid_fulfillment_status
    CHECK (status IN ('assigned', 'packaged', 'ready_for_delivery', 'delivered'));
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_internal_bucked_strain ON internal_bucked_inventory(strain);
CREATE INDEX IF NOT EXISTS idx_internal_bucked_status ON internal_bucked_inventory(status);
CREATE INDEX IF NOT EXISTS idx_internal_bulk_strain_type ON internal_bulk_inventory(strain, product_type);
CREATE INDEX IF NOT EXISTS idx_internal_packaged_strain_type ON internal_packaged_inventory(strain, product_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_session ON inventory_movements(session_id, session_type);
CREATE INDEX IF NOT EXISTS idx_reconciliation_snapshots ON inventory_reconciliation(current_snapshot_id, previous_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_variances_reconciliation ON inventory_variances(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_order ON order_fulfillment_items(order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_packaging_session ON order_fulfillment_items(packaging_session_id);

-- Enable Row Level Security
ALTER TABLE internal_bucked_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_bulk_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_packaged_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_variances ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_fulfillment_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Authenticated users can view internal_bucked_inventory"
  ON internal_bucked_inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can modify internal_bucked_inventory"
  ON internal_bucked_inventory FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view internal_bulk_inventory"
  ON internal_bulk_inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can modify internal_bulk_inventory"
  ON internal_bulk_inventory FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view internal_packaged_inventory"
  ON internal_packaged_inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can modify internal_packaged_inventory"
  ON internal_packaged_inventory FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view inventory_movements"
  ON inventory_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert inventory_movements"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view inventory_reconciliation"
  ON inventory_reconciliation FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can modify inventory_reconciliation"
  ON inventory_reconciliation FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view inventory_variances"
  ON inventory_variances FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can modify inventory_variances"
  ON inventory_variances FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view order_fulfillment_items"
  ON order_fulfillment_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can modify order_fulfillment_items"
  ON order_fulfillment_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_internal_bucked_inventory_updated_at ON internal_bucked_inventory;
CREATE TRIGGER update_internal_bucked_inventory_updated_at
  BEFORE UPDATE ON internal_bucked_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_internal_bulk_inventory_updated_at ON internal_bulk_inventory;
CREATE TRIGGER update_internal_bulk_inventory_updated_at
  BEFORE UPDATE ON internal_bulk_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_internal_packaged_inventory_updated_at ON internal_packaged_inventory;
CREATE TRIGGER update_internal_packaged_inventory_updated_at
  BEFORE UPDATE ON internal_packaged_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_fulfillment_items_updated_at ON order_fulfillment_items;
CREATE TRIGGER update_order_fulfillment_items_updated_at
  BEFORE UPDATE ON order_fulfillment_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
