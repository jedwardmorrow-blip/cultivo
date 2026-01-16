/*
  # Create Batch Management Foundation

  ## Overview
  This migration establishes the comprehensive batch management system with multi-stage
  tracking, predictive projections, and COA integration for complete traceability.

  ## 1. New Tables
  
  ### batch_registry
  - `id` (uuid, primary key) - Unique batch identifier
  - `batch_number` (text, unique) - Batch number from cultivation/COA
  - `strain` (text) - Strain name
  - `harvest_date` (date) - When batch was harvested
  - `room` (text) - Cultivation room
  - `initial_weight_grams` (numeric) - Starting weight at harvest
  - `coa_id` (uuid) - Reference to certificates_of_analysis
  - `status` (text) - Batch status (active, depleted, quarantine)
  - `notes` (text) - Batch notes
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### batch_stage_tracking
  - `id` (uuid, primary key)
  - `batch_id` (uuid) - Reference to batch_registry
  - `stage` (text) - Stage (bucked, bulk_flower, bulk_smalls, bulk_trim, packaged)
  - `weight_grams` (numeric) - Current weight at this stage
  - `allocated_weight_grams` (numeric) - Weight allocated to orders
  - `available_weight_grams` (numeric) - Remaining available weight
  - `location` (text) - Storage location
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### batch_projections
  - `id` (uuid, primary key)
  - `batch_id` (uuid) - Reference to batch_registry
  - `source_stage` (text) - Starting stage
  - `source_weight_grams` (numeric) - Weight at source stage
  - `target_stage` (text) - Target stage
  - `projected_weight_grams` (numeric) - Projected weight at target
  - `projection_date` (timestamptz) - When projection was made
  - `actual_weight_grams` (numeric) - Actual weight achieved (null until realized)
  - `variance_percentage` (numeric) - Difference between projected and actual
  - `notes` (text)
  - `created_at` (timestamptz)

  ### label_types
  - `id` (uuid, primary key)
  - `name` (text, unique) - Label type name
  - `code` (text, unique) - Short code
  - `description` (text) - Description
  - `requires_coa` (boolean) - Whether COA is required for this label type
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### batch_allocations
  - `id` (uuid, primary key)
  - `batch_id` (uuid) - Reference to batch_registry
  - `order_item_id` (uuid) - Reference to order_items
  - `allocation_stage` (text) - Stage at allocation (bucked, bulk, packaged)
  - `allocated_weight_grams` (numeric) - Weight allocated
  - `projected_final_weight_grams` (numeric) - Expected weight in final form
  - `status` (text) - Status (pending, confirmed, fulfilled, cancelled)
  - `allocated_at` (timestamptz)
  - `fulfilled_at` (timestamptz)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## 2. Schema Modifications

  ### Add batch_number to existing tables
  - `bucked_inventory.batch_number` - Link to batch_registry
  - `bulk_inventory.batch_number` - Link to batch_registry
  - `inventory_items.batch_number` - Link to batch_registry
  - `labels.label_type_id` - Reference to label_types
  - `labels.batch_number` - Link to batch_registry

  ### Add over_allocation fields to strain_metadata
  - `over_allocation_warning_threshold` - Percentage threshold for warnings (default 100)
  - `over_allocation_critical_threshold` - Percentage for critical warnings (default 120)

  ## 3. Security
  - Enable RLS on all new tables
  - Add policies for authenticated users to manage all data

  ## 4. Indexes
  - Create indexes for efficient batch lookups and allocation queries

  ## Important Notes
  - All weights in grams for consistency
  - Batch numbers must be unique across the system
  - COA enforcement handled at application layer based on label type
  - Projections use strain-specific conversion ratios
*/

-- Create batch_registry table
CREATE TABLE IF NOT EXISTS batch_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text UNIQUE NOT NULL,
  strain text NOT NULL,
  harvest_date date,
  room text,
  initial_weight_grams numeric NOT NULL,
  coa_id uuid REFERENCES certificates_of_analysis(id) ON DELETE SET NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'depleted', 'quarantine', 'archived')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create batch_stage_tracking table
CREATE TABLE IF NOT EXISTS batch_stage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batch_registry(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('bucked', 'bulk_flower', 'bulk_smalls', 'bulk_trim', 'packaged')),
  weight_grams numeric NOT NULL DEFAULT 0,
  allocated_weight_grams numeric NOT NULL DEFAULT 0,
  available_weight_grams numeric GENERATED ALWAYS AS (weight_grams - allocated_weight_grams) STORED,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(batch_id, stage)
);

-- Create batch_projections table
CREATE TABLE IF NOT EXISTS batch_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batch_registry(id) ON DELETE CASCADE,
  source_stage text NOT NULL,
  source_weight_grams numeric NOT NULL,
  target_stage text NOT NULL,
  projected_weight_grams numeric NOT NULL,
  projection_date timestamptz DEFAULT now(),
  actual_weight_grams numeric,
  variance_percentage numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create label_types table
CREATE TABLE IF NOT EXISTS label_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  requires_coa boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create batch_allocations table
CREATE TABLE IF NOT EXISTS batch_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batch_registry(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  allocation_stage text NOT NULL CHECK (allocation_stage IN ('bucked', 'bulk', 'packaged')),
  allocated_weight_grams numeric NOT NULL,
  projected_final_weight_grams numeric,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'fulfilled', 'cancelled')),
  allocated_at timestamptz DEFAULT now(),
  fulfilled_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add batch_number to existing tables
DO $$
BEGIN
  -- Add to bucked_inventory
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bucked_inventory' AND column_name = 'batch_number'
  ) THEN
    ALTER TABLE bucked_inventory ADD COLUMN batch_number text;
    CREATE INDEX IF NOT EXISTS idx_bucked_inventory_batch_number ON bucked_inventory(batch_number);
  END IF;

  -- Add to bulk_inventory
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bulk_inventory' AND column_name = 'batch_number'
  ) THEN
    ALTER TABLE bulk_inventory ADD COLUMN batch_number text;
    CREATE INDEX IF NOT EXISTS idx_bulk_inventory_batch_number ON bulk_inventory(batch_number);
  END IF;

  -- Add to inventory_items
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'batch_number'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN batch_number text;
    CREATE INDEX IF NOT EXISTS idx_inventory_items_batch_number ON inventory_items(batch_number);
  END IF;

  -- Add label_type_id to labels
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labels' AND column_name = 'label_type_id'
  ) THEN
    ALTER TABLE labels ADD COLUMN label_type_id uuid REFERENCES label_types(id);
  END IF;

  -- Add batch_number to labels
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labels' AND column_name = 'batch_number'
  ) THEN
    ALTER TABLE labels ADD COLUMN batch_number text;
    CREATE INDEX IF NOT EXISTS idx_labels_batch_number ON labels(batch_number);
  END IF;
END $$;

-- Add over_allocation thresholds to strain_metadata
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strain_metadata' AND column_name = 'over_allocation_warning_threshold'
  ) THEN
    ALTER TABLE strain_metadata ADD COLUMN over_allocation_warning_threshold numeric DEFAULT 100;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strain_metadata' AND column_name = 'over_allocation_critical_threshold'
  ) THEN
    ALTER TABLE strain_metadata ADD COLUMN over_allocation_critical_threshold numeric DEFAULT 120;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_batch_registry_batch_number ON batch_registry(batch_number);
CREATE INDEX IF NOT EXISTS idx_batch_registry_strain ON batch_registry(strain);
CREATE INDEX IF NOT EXISTS idx_batch_registry_coa_id ON batch_registry(coa_id);
CREATE INDEX IF NOT EXISTS idx_batch_registry_status ON batch_registry(status);
CREATE INDEX IF NOT EXISTS idx_batch_stage_tracking_batch_id ON batch_stage_tracking(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_stage_tracking_stage ON batch_stage_tracking(stage);
CREATE INDEX IF NOT EXISTS idx_batch_projections_batch_id ON batch_projections(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_allocations_batch_id ON batch_allocations(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_allocations_order_item_id ON batch_allocations(order_item_id);
CREATE INDEX IF NOT EXISTS idx_batch_allocations_status ON batch_allocations(status);

-- Enable RLS
ALTER TABLE batch_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_stage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE label_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Authenticated users can view batch_registry"
  ON batch_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert batch_registry"
  ON batch_registry FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update batch_registry"
  ON batch_registry FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete batch_registry"
  ON batch_registry FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view batch_stage_tracking"
  ON batch_stage_tracking FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert batch_stage_tracking"
  ON batch_stage_tracking FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update batch_stage_tracking"
  ON batch_stage_tracking FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete batch_stage_tracking"
  ON batch_stage_tracking FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view batch_projections"
  ON batch_projections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert batch_projections"
  ON batch_projections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update batch_projections"
  ON batch_projections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete batch_projections"
  ON batch_projections FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view label_types"
  ON label_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert label_types"
  ON label_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update label_types"
  ON label_types FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete label_types"
  ON label_types FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view batch_allocations"
  ON batch_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert batch_allocations"
  ON batch_allocations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update batch_allocations"
  ON batch_allocations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete batch_allocations"
  ON batch_allocations FOR DELETE TO authenticated USING (true);

-- Seed label_types
INSERT INTO label_types (name, code, description, requires_coa, is_active) VALUES
  ('Packaged Product', 'PACKAGED', 'Standard product label for retail packages', true, true),
  ('Bulk Container', 'BULK', 'Label for bulk storage containers', false, true),
  ('Sample', 'SAMPLE', 'Label for product samples', false, true),
  ('Testing', 'TESTING', 'Label for lab testing samples', false, true)
ON CONFLICT (code) DO NOTHING;

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_batch_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER batch_registry_updated_at
  BEFORE UPDATE ON batch_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_registry_updated_at();

CREATE TRIGGER batch_stage_tracking_updated_at
  BEFORE UPDATE ON batch_stage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_registry_updated_at();

CREATE TRIGGER batch_allocations_updated_at
  BEFORE UPDATE ON batch_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_registry_updated_at();
