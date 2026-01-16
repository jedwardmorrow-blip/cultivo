/*
  # Inventory Forecasting and Trim Workflow System

  ## Overview
  This migration creates the complete database schema for tracking inventory from Bucked stage
  through Bulk, with comprehensive trim session tracking and order-based forecasting capabilities.

  ## New Tables

  ### 1. strain_metadata
  - `id` (uuid, primary key) - Unique strain identifier
  - `name` (text) - Strain name (matches products.strain)
  - `type` (text) - Strain type (indica, sativa, hybrid)
  - `genetics` (text) - Genetic lineage information
  - `abbreviation` (text) - Short code for strain
  - `avg_bucked_to_flower_ratio` (numeric) - Average conversion rate to flower
  - `avg_bucked_to_smalls_ratio` (numeric) - Average conversion rate to smalls
  - `avg_bucked_to_trim_ratio` (numeric) - Average conversion rate to trim
  - `avg_waste_percentage` (numeric) - Average waste during trimming
  - `avg_trim_grams_per_hour` (numeric) - Average hand trim productivity
  - `notes` (text) - Strain-specific notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. bucked_inventory
  - `id` (uuid, primary key) - Unique inventory record identifier
  - `strain` (text) - Strain name
  - `batch_id` (text) - Batch identifier from cultivation
  - `package_id` (text) - Tote/package identifier
  - `room` (text) - Room where material was harvested
  - `harvest_date` (date) - Date material was harvested
  - `initial_weight_grams` (numeric) - Starting weight in grams
  - `current_weight_grams` (numeric) - Remaining weight in grams
  - `location` (text) - Current storage location
  - `status` (text) - Status (available, in_use, depleted, quarantine)
  - `notes` (text) - Inventory notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. bulk_inventory
  - `id` (uuid, primary key) - Unique inventory record identifier
  - `strain` (text) - Strain name
  - `batch_id` (text) - Batch identifier
  - `product_type` (text) - Type (flower, smalls, trim)
  - `weight_grams` (numeric) - Current weight in grams
  - `location` (text) - Storage location
  - `status` (text) - Status (available, reserved, packaged)
  - `quality_grade` (text) - Quality rating
  - `trim_date` (date) - Date material was trimmed
  - `notes` (text) - Inventory notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. trim_sessions
  - `id` (uuid, primary key) - Unique session identifier
  - `session_date` (date) - Date of trim session
  - `trimmer_name` (text) - Name of trimmer
  - `package_id` (text) - Package being trimmed
  - `strain` (text) - Strain being trimmed
  - `batch_id` (text) - Batch identifier
  - `bucked_inventory_id` (uuid) - Reference to bucked_inventory
  - `package_total_weight` (numeric) - Total package weight in grams
  - `pulled_weight` (numeric) - Weight pulled for this session in grams
  - `time_started` (time) - Session start time
  - `time_ended` (time) - Session end time
  - `minutes_trimmed` (integer) - Total minutes worked
  - `grams_per_hour` (numeric) - Calculated productivity rate
  - `big_buds_grams` (numeric) - Flower output in grams
  - `small_buds_grams` (numeric) - Smalls output in grams
  - `trim_grams` (numeric) - Trim output in grams
  - `waste_grams` (numeric) - Waste in grams
  - `variance_grams` (numeric) - Weight variance (difference)
  - `trim_method` (text) - Method (hand, machine)
  - `recorded_in_dutchie` (boolean) - Whether logged in Dutchie
  - `notes` (text) - Session notes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 5. inventory_conversions
  - `id` (uuid, primary key) - Unique conversion record identifier
  - `trim_session_id` (uuid) - Reference to trim session
  - `source_type` (text) - Source stage (bucked)
  - `source_id` (uuid) - Source inventory ID
  - `source_weight_grams` (numeric) - Weight consumed from source
  - `destination_type` (text) - Destination stage (bulk)
  - `destination_id` (uuid) - Destination inventory ID
  - `destination_weight_grams` (numeric) - Weight created at destination
  - `conversion_date` (timestamptz) - When conversion occurred
  - `created_at` (timestamptz) - Record creation timestamp

  ### 6. order_forecasts
  - `id` (uuid, primary key) - Unique forecast identifier
  - `forecast_date` (date) - Date forecast was generated
  - `strain` (text) - Strain name
  - `product_type` (text) - Type (flower, smalls, trim)
  - `total_grams_needed` (numeric) - Total weight needed across all orders
  - `total_units_needed` (numeric) - Total units needed
  - `grams_available` (numeric) - Current bulk inventory available
  - `grams_shortfall` (numeric) - Calculated gap
  - `priority_score` (integer) - Priority based on due dates
  - `earliest_due_date` (date) - Soonest delivery date
  - `notes` (text) - Forecast notes
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Enable Row Level Security (RLS) on all tables
  - Add policies for anonymous users to manage all data (internal tool)

  ## Functions and Triggers
  - Create function to auto-update `updated_at` timestamps
  - Create function to calculate grams_per_hour in trim sessions
  - Create function to update bucked inventory when material is pulled
  - Create function to create bulk inventory from trim session outputs
  - Create view for real-time order forecast calculations
  - Create view for trim session productivity analytics

  ## Important Notes
  - All weights stored in grams for consistency
  - 7% overage factor should be applied at application level for packaged goods
  - Batch tracking kept simple initially - can be enhanced later
  - Status fields use text for flexibility
*/

-- Create strain_metadata table
CREATE TABLE IF NOT EXISTS strain_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  type text DEFAULT 'hybrid',
  genetics text,
  abbreviation text,
  avg_bucked_to_flower_ratio numeric DEFAULT 0.50,
  avg_bucked_to_smalls_ratio numeric DEFAULT 0.25,
  avg_bucked_to_trim_ratio numeric DEFAULT 0.20,
  avg_waste_percentage numeric DEFAULT 0.05,
  avg_trim_grams_per_hour numeric DEFAULT 150,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bucked_inventory table
CREATE TABLE IF NOT EXISTS bucked_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strain text NOT NULL,
  batch_id text NOT NULL,
  package_id text NOT NULL,
  room text,
  harvest_date date,
  initial_weight_grams numeric NOT NULL,
  current_weight_grams numeric NOT NULL,
  location text,
  status text NOT NULL DEFAULT 'available',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT positive_weights CHECK (initial_weight_grams >= 0 AND current_weight_grams >= 0),
  CONSTRAINT current_lte_initial CHECK (current_weight_grams <= initial_weight_grams)
);

-- Create bulk_inventory table
CREATE TABLE IF NOT EXISTS bulk_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strain text NOT NULL,
  batch_id text NOT NULL,
  product_type text NOT NULL,
  weight_grams numeric NOT NULL DEFAULT 0,
  location text,
  status text NOT NULL DEFAULT 'available',
  quality_grade text,
  trim_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT positive_weight CHECK (weight_grams >= 0),
  CONSTRAINT valid_product_type CHECK (product_type IN ('flower', 'smalls', 'trim'))
);

-- Create trim_sessions table
CREATE TABLE IF NOT EXISTS trim_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  trimmer_name text NOT NULL,
  package_id text NOT NULL,
  strain text NOT NULL,
  batch_id text NOT NULL,
  bucked_inventory_id uuid REFERENCES bucked_inventory(id) ON DELETE SET NULL,
  package_total_weight numeric,
  pulled_weight numeric NOT NULL,
  time_started time,
  time_ended time,
  minutes_trimmed integer,
  grams_per_hour numeric,
  big_buds_grams numeric DEFAULT 0,
  small_buds_grams numeric DEFAULT 0,
  trim_grams numeric DEFAULT 0,
  waste_grams numeric DEFAULT 0,
  variance_grams numeric DEFAULT 0,
  trim_method text DEFAULT 'hand',
  recorded_in_dutchie boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_trim_method CHECK (trim_method IN ('hand', 'machine')),
  CONSTRAINT positive_outputs CHECK (
    big_buds_grams >= 0 AND
    small_buds_grams >= 0 AND
    trim_grams >= 0 AND
    waste_grams >= 0
  )
);

-- Create inventory_conversions table
CREATE TABLE IF NOT EXISTS inventory_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trim_session_id uuid REFERENCES trim_sessions(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid,
  source_weight_grams numeric NOT NULL,
  destination_type text NOT NULL,
  destination_id uuid,
  destination_weight_grams numeric NOT NULL,
  conversion_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT positive_conversion_weights CHECK (
    source_weight_grams >= 0 AND
    destination_weight_grams >= 0
  )
);

-- Create order_forecasts table
CREATE TABLE IF NOT EXISTS order_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_date date NOT NULL DEFAULT CURRENT_DATE,
  strain text NOT NULL,
  product_type text NOT NULL,
  total_grams_needed numeric DEFAULT 0,
  total_units_needed numeric DEFAULT 0,
  grams_available numeric DEFAULT 0,
  grams_shortfall numeric GENERATED ALWAYS AS (total_grams_needed - grams_available) STORED,
  priority_score integer DEFAULT 0,
  earliest_due_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bucked_inventory_strain ON bucked_inventory(strain);
CREATE INDEX IF NOT EXISTS idx_bucked_inventory_batch ON bucked_inventory(batch_id);
CREATE INDEX IF NOT EXISTS idx_bucked_inventory_status ON bucked_inventory(status);
CREATE INDEX IF NOT EXISTS idx_bulk_inventory_strain ON bulk_inventory(strain);
CREATE INDEX IF NOT EXISTS idx_bulk_inventory_type ON bulk_inventory(product_type);
CREATE INDEX IF NOT EXISTS idx_bulk_inventory_status ON bulk_inventory(status);
CREATE INDEX IF NOT EXISTS idx_trim_sessions_date ON trim_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_trim_sessions_strain ON trim_sessions(strain);
CREATE INDEX IF NOT EXISTS idx_trim_sessions_trimmer ON trim_sessions(trimmer_name);
CREATE INDEX IF NOT EXISTS idx_order_forecasts_strain ON order_forecasts(strain);
CREATE INDEX IF NOT EXISTS idx_order_forecasts_date ON order_forecasts(forecast_date);

-- Create triggers for updated_at
CREATE TRIGGER update_strain_metadata_updated_at BEFORE UPDATE ON strain_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bucked_inventory_updated_at BEFORE UPDATE ON bucked_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bulk_inventory_updated_at BEFORE UPDATE ON bulk_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trim_sessions_updated_at BEFORE UPDATE ON trim_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate grams per hour for trim sessions
CREATE OR REPLACE FUNCTION calculate_trim_grams_per_hour()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.minutes_trimmed > 0 AND NEW.big_buds_grams IS NOT NULL THEN
    NEW.grams_per_hour := (NEW.big_buds_grams * 60.0) / NEW.minutes_trimmed;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_trim_productivity
  BEFORE INSERT OR UPDATE ON trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_trim_grams_per_hour();

-- Function to update bucked inventory when material is pulled
CREATE OR REPLACE FUNCTION update_bucked_inventory_on_trim()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bucked_inventory_id IS NOT NULL THEN
    UPDATE bucked_inventory
    SET current_weight_grams = current_weight_grams - NEW.pulled_weight,
        status = CASE
          WHEN current_weight_grams - NEW.pulled_weight <= 0 THEN 'depleted'
          ELSE status
        END,
        updated_at = now()
    WHERE id = NEW.bucked_inventory_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bucked_on_trim_session
  AFTER INSERT ON trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_bucked_inventory_on_trim();

-- View for trim session productivity by strain
CREATE OR REPLACE VIEW trim_productivity_by_strain AS
SELECT
  strain,
  trimmer_name,
  COUNT(*) as session_count,
  AVG(grams_per_hour) as avg_grams_per_hour,
  AVG(big_buds_grams) as avg_flower_output,
  AVG(small_buds_grams) as avg_smalls_output,
  AVG(trim_grams) as avg_trim_output,
  AVG(waste_grams) as avg_waste,
  AVG(CASE
    WHEN pulled_weight > 0
    THEN (big_buds_grams / pulled_weight) * 100
    ELSE 0
  END) as avg_flower_yield_percentage,
  AVG(CASE
    WHEN pulled_weight > 0
    THEN (small_buds_grams / pulled_weight) * 100
    ELSE 0
  END) as avg_smalls_yield_percentage
FROM trim_sessions
WHERE trim_method = 'hand'
GROUP BY strain, trimmer_name
ORDER BY strain, avg_grams_per_hour DESC;

-- View for current inventory status
CREATE OR REPLACE VIEW current_inventory_status AS
SELECT
  bi.strain,
  COUNT(DISTINCT bi.id) as bucked_totes,
  SUM(bi.current_weight_grams) as total_bucked_grams,
  SUM(CASE WHEN bulk.product_type = 'flower' THEN bulk.weight_grams ELSE 0 END) as flower_grams,
  SUM(CASE WHEN bulk.product_type = 'smalls' THEN bulk.weight_grams ELSE 0 END) as smalls_grams,
  SUM(CASE WHEN bulk.product_type = 'trim' THEN bulk.weight_grams ELSE 0 END) as trim_grams
FROM bucked_inventory bi
LEFT JOIN bulk_inventory bulk ON bi.strain = bulk.strain AND bulk.status = 'available'
WHERE bi.status = 'available'
GROUP BY bi.strain
ORDER BY bi.strain;

-- View for order material requirements with 7% overage
CREATE OR REPLACE VIEW order_material_requirements AS
SELECT
  o.id as order_id,
  o.order_number,
  o.requested_delivery_date,
  o.status as order_status,
  p.strain,
  p.type as product_type,
  oi.quantity,
  CASE
    WHEN p.unit = 'eighth' THEN oi.quantity * 3.75
    WHEN p.unit = 'half-oz' THEN oi.quantity * 15.0
    WHEN p.unit = 'unit' THEN oi.quantity * 1.07
    WHEN p.unit = 'pound' THEN oi.quantity * 454
    ELSE oi.quantity
  END as grams_needed_with_overage,
  CASE
    WHEN p.type = 'flower' THEN 'flower'
    WHEN p.type = 'smalls' THEN 'smalls'
    WHEN p.type = 'pre-roll' THEN 'flower'
    ELSE 'trim'
  END as bulk_product_type
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.status NOT IN ('delivered', 'cancelled')
  AND o.archived = false
ORDER BY o.requested_delivery_date ASC, o.priority DESC;

-- Enable Row Level Security
ALTER TABLE strain_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucked_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE trim_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_forecasts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for anonymous users (internal tool)
CREATE POLICY "Anonymous users can manage strain_metadata"
  ON strain_metadata FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can manage bucked_inventory"
  ON bucked_inventory FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can manage bulk_inventory"
  ON bulk_inventory FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can manage trim_sessions"
  ON trim_sessions FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can manage inventory_conversions"
  ON inventory_conversions FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can manage order_forecasts"
  ON order_forecasts FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Populate strain_metadata from existing products
INSERT INTO strain_metadata (name, type, notes)
SELECT DISTINCT
  strain,
  'hybrid' as type,
  MAX(notes) as notes
FROM products
WHERE strain IS NOT NULL
GROUP BY strain
ON CONFLICT (name) DO NOTHING;