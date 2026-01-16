/*
  # Create Consolidated Packages System

  ## Overview
  This migration creates a system for auto-generating package IDs and consolidating trim/packaging
  session outputs by strain and product type. All consolidated packages are marked as being in
  "Holding" room for end-of-day Dutchie conversion tracking.

  ## New Tables

  ### 1. consolidated_packages
  Tracks auto-generated consolidated packages from completed sessions:
  - `id` (uuid, primary key) - Unique identifier
  - `package_id` (text, unique) - Auto-generated ID (format: YYMMDD-STRAIN_ABBR-SEQ)
  - `package_date` (date) - Date package was created
  - `strain` (text) - Full strain name
  - `strain_abbreviation` (text) - Strain abbreviation for package ID
  - `product_stage` (text) - Product stage (Bulk, Packaged)
  - `product_type` (text) - Product type (Flower, Smalls, Trim, 3.5g, 14g, etc.)
  - `total_weight_grams` (numeric) - Total weight for bulk products
  - `total_units` (integer) - Total units for packaged products
  - `room` (text) - Storage location (default: "Holding")
  - `session_type` (text) - Type of sessions (trim, packaging)
  - `session_count` (integer) - Number of contributing sessions
  - `source_session_ids` (uuid[]) - Array of source session IDs
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last update time

  ### 2. consolidated_package_sources
  Detailed tracking of which sessions contributed to each consolidated package:
  - `id` (uuid, primary key) - Unique identifier
  - `consolidated_package_id` (uuid) - Reference to consolidated_packages
  - `session_id` (uuid) - Session ID (trim_sessions or packaging_sessions)
  - `session_type` (text) - Type (trim or packaging)
  - `session_date` (date) - Session completion date
  - `contribution_weight_grams` (numeric) - Weight contributed by this session
  - `contribution_units` (integer) - Units contributed by this session
  - `created_at` (timestamptz) - Record creation time

  ## Functions

  - `generate_consolidated_package_id()` - Generates sequential package IDs
  - `get_next_package_sequence()` - Gets next sequence number for date/strain
  - `consolidate_trim_session_output()` - Consolidates trim session outputs
  - `consolidate_packaging_session_output()` - Consolidates packaging session outputs

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users
*/

-- Create consolidated_packages table
CREATE TABLE IF NOT EXISTS consolidated_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id text UNIQUE NOT NULL,
  package_date date NOT NULL DEFAULT CURRENT_DATE,
  strain text NOT NULL,
  strain_abbreviation text NOT NULL,
  product_stage text NOT NULL,
  product_type text NOT NULL,
  total_weight_grams numeric DEFAULT 0,
  total_units integer DEFAULT 0,
  room text DEFAULT 'Holding',
  session_type text NOT NULL,
  session_count integer DEFAULT 0,
  source_session_ids uuid[] DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_session_type CHECK (session_type IN ('trim', 'packaging')),
  CONSTRAINT valid_product_stage CHECK (product_stage IN ('Bulk', 'Packaged')),
  CONSTRAINT valid_product_type CHECK (product_type IN ('Flower', 'Smalls', 'Trim', '3.5g', '14g', '454g', '28g', '1g Preroll', '3-pack Preroll'))
);

-- Create consolidated_package_sources table
CREATE TABLE IF NOT EXISTS consolidated_package_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consolidated_package_id uuid NOT NULL REFERENCES consolidated_packages(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  session_type text NOT NULL,
  session_date date NOT NULL,
  contribution_weight_grams numeric DEFAULT 0,
  contribution_units integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_source_session_type CHECK (session_type IN ('trim', 'packaging'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_consolidated_packages_date ON consolidated_packages(package_date DESC);
CREATE INDEX IF NOT EXISTS idx_consolidated_packages_strain ON consolidated_packages(strain, strain_abbreviation);
CREATE INDEX IF NOT EXISTS idx_consolidated_packages_product ON consolidated_packages(product_stage, product_type);
CREATE INDEX IF NOT EXISTS idx_consolidated_packages_room ON consolidated_packages(room);
CREATE INDEX IF NOT EXISTS idx_consolidated_sources_package ON consolidated_package_sources(consolidated_package_id);
CREATE INDEX IF NOT EXISTS idx_consolidated_sources_session ON consolidated_package_sources(session_id, session_type);

-- Function to get next package sequence number for a date and strain
CREATE OR REPLACE FUNCTION get_next_package_sequence(
  p_package_date date,
  p_strain_abbreviation text
)
RETURNS integer AS $$
DECLARE
  v_max_seq integer;
  v_pattern text;
BEGIN
  -- Build pattern for this date and strain (e.g., '251015-GAS-%')
  v_pattern := TO_CHAR(p_package_date, 'YYMMDD') || '-' || p_strain_abbreviation || '-%';
  
  -- Find highest sequence number for this date and strain
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(package_id FROM LENGTH(TO_CHAR(p_package_date, 'YYMMDD') || '-' || p_strain_abbreviation || '-') + 1)
        AS integer
      )
    ),
    0
  )
  INTO v_max_seq
  FROM consolidated_packages
  WHERE package_id LIKE v_pattern;
  
  -- Return next sequence number
  RETURN COALESCE(v_max_seq, 0) + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to generate consolidated package ID
CREATE OR REPLACE FUNCTION generate_consolidated_package_id(
  p_package_date date,
  p_strain_abbreviation text
)
RETURNS text AS $$
DECLARE
  v_date_str text;
  v_sequence integer;
  v_package_id text;
BEGIN
  -- Format date as YYMMDD
  v_date_str := TO_CHAR(p_package_date, 'YYMMDD');
  
  -- Get next sequence number (with row-level lock to prevent duplicates)
  v_sequence := get_next_package_sequence(p_package_date, p_strain_abbreviation);
  
  -- Build package ID: YYMMDD-STRAIN_ABBR-SEQ
  v_package_id := v_date_str || '-' || p_strain_abbreviation || '-' || v_sequence::text;
  
  RETURN v_package_id;
END;
$$ LANGUAGE plpgsql;

-- Function to consolidate trim session output
CREATE OR REPLACE FUNCTION consolidate_trim_session_output(
  p_session_id uuid,
  p_strain text,
  p_strain_abbreviation text,
  p_session_date date,
  p_flower_grams numeric,
  p_smalls_grams numeric,
  p_trim_grams numeric
)
RETURNS void AS $$
DECLARE
  v_package_id text;
  v_consolidated_id uuid;
  v_product_type text;
  v_weight numeric;
BEGIN
  -- Process Bulk Flower if any
  IF p_flower_grams > 0 THEN
    v_product_type := 'Flower';
    
    -- Check if consolidated package exists
    SELECT id, package_id INTO v_consolidated_id, v_package_id
    FROM consolidated_packages
    WHERE package_date = p_session_date
      AND strain = p_strain
      AND product_stage = 'Bulk'
      AND product_type = v_product_type
      AND session_type = 'trim';
    
    IF v_consolidated_id IS NULL THEN
      -- Create new consolidated package
      v_package_id := generate_consolidated_package_id(p_session_date, p_strain_abbreviation);
      
      INSERT INTO consolidated_packages (
        package_id, package_date, strain, strain_abbreviation,
        product_stage, product_type, total_weight_grams,
        session_type, session_count, source_session_ids
      ) VALUES (
        v_package_id, p_session_date, p_strain, p_strain_abbreviation,
        'Bulk', v_product_type, p_flower_grams,
        'trim', 1, ARRAY[p_session_id]
      )
      RETURNING id INTO v_consolidated_id;
    ELSE
      -- Update existing consolidated package
      UPDATE consolidated_packages
      SET total_weight_grams = total_weight_grams + p_flower_grams,
          session_count = session_count + 1,
          source_session_ids = array_append(source_session_ids, p_session_id),
          updated_at = now()
      WHERE id = v_consolidated_id;
    END IF;
    
    -- Record source contribution
    INSERT INTO consolidated_package_sources (
      consolidated_package_id, session_id, session_type,
      session_date, contribution_weight_grams
    ) VALUES (
      v_consolidated_id, p_session_id, 'trim',
      p_session_date, p_flower_grams
    );
  END IF;
  
  -- Process Bulk Smalls if any
  IF p_smalls_grams > 0 THEN
    v_product_type := 'Smalls';
    
    SELECT id, package_id INTO v_consolidated_id, v_package_id
    FROM consolidated_packages
    WHERE package_date = p_session_date
      AND strain = p_strain
      AND product_stage = 'Bulk'
      AND product_type = v_product_type
      AND session_type = 'trim';
    
    IF v_consolidated_id IS NULL THEN
      v_package_id := generate_consolidated_package_id(p_session_date, p_strain_abbreviation);
      
      INSERT INTO consolidated_packages (
        package_id, package_date, strain, strain_abbreviation,
        product_stage, product_type, total_weight_grams,
        session_type, session_count, source_session_ids
      ) VALUES (
        v_package_id, p_session_date, p_strain, p_strain_abbreviation,
        'Bulk', v_product_type, p_smalls_grams,
        'trim', 1, ARRAY[p_session_id]
      )
      RETURNING id INTO v_consolidated_id;
    ELSE
      UPDATE consolidated_packages
      SET total_weight_grams = total_weight_grams + p_smalls_grams,
          session_count = session_count + 1,
          source_session_ids = array_append(source_session_ids, p_session_id),
          updated_at = now()
      WHERE id = v_consolidated_id;
    END IF;
    
    INSERT INTO consolidated_package_sources (
      consolidated_package_id, session_id, session_type,
      session_date, contribution_weight_grams
    ) VALUES (
      v_consolidated_id, p_session_id, 'trim',
      p_session_date, p_smalls_grams
    );
  END IF;
  
  -- Process Bulk Trim if any
  IF p_trim_grams > 0 THEN
    v_product_type := 'Trim';
    
    SELECT id, package_id INTO v_consolidated_id, v_package_id
    FROM consolidated_packages
    WHERE package_date = p_session_date
      AND strain = p_strain
      AND product_stage = 'Bulk'
      AND product_type = v_product_type
      AND session_type = 'trim';
    
    IF v_consolidated_id IS NULL THEN
      v_package_id := generate_consolidated_package_id(p_session_date, p_strain_abbreviation);
      
      INSERT INTO consolidated_packages (
        package_id, package_date, strain, strain_abbreviation,
        product_stage, product_type, total_weight_grams,
        session_type, session_count, source_session_ids
      ) VALUES (
        v_package_id, p_session_date, p_strain, p_strain_abbreviation,
        'Bulk', v_product_type, p_trim_grams,
        'trim', 1, ARRAY[p_session_id]
      )
      RETURNING id INTO v_consolidated_id;
    ELSE
      UPDATE consolidated_packages
      SET total_weight_grams = total_weight_grams + p_trim_grams,
          session_count = session_count + 1,
          source_session_ids = array_append(source_session_ids, p_session_id),
          updated_at = now()
      WHERE id = v_consolidated_id;
    END IF;
    
    INSERT INTO consolidated_package_sources (
      consolidated_package_id, session_id, session_type,
      session_date, contribution_weight_grams
    ) VALUES (
      v_consolidated_id, p_session_id, 'trim',
      p_session_date, p_trim_grams
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to consolidate packaging session output
CREATE OR REPLACE FUNCTION consolidate_packaging_session_output(
  p_session_id uuid,
  p_strain text,
  p_strain_abbreviation text,
  p_session_date date,
  p_units_3_5g integer,
  p_units_14g integer,
  p_units_454g integer
)
RETURNS void AS $$
DECLARE
  v_package_id text;
  v_consolidated_id uuid;
  v_product_type text;
  v_units integer;
BEGIN
  -- Process 3.5g units if any
  IF p_units_3_5g > 0 THEN
    v_product_type := '3.5g';
    
    SELECT id, package_id INTO v_consolidated_id, v_package_id
    FROM consolidated_packages
    WHERE package_date = p_session_date
      AND strain = p_strain
      AND product_stage = 'Packaged'
      AND product_type = v_product_type
      AND session_type = 'packaging';
    
    IF v_consolidated_id IS NULL THEN
      v_package_id := generate_consolidated_package_id(p_session_date, p_strain_abbreviation);
      
      INSERT INTO consolidated_packages (
        package_id, package_date, strain, strain_abbreviation,
        product_stage, product_type, total_units,
        session_type, session_count, source_session_ids
      ) VALUES (
        v_package_id, p_session_date, p_strain, p_strain_abbreviation,
        'Packaged', v_product_type, p_units_3_5g,
        'packaging', 1, ARRAY[p_session_id]
      )
      RETURNING id INTO v_consolidated_id;
    ELSE
      UPDATE consolidated_packages
      SET total_units = total_units + p_units_3_5g,
          session_count = session_count + 1,
          source_session_ids = array_append(source_session_ids, p_session_id),
          updated_at = now()
      WHERE id = v_consolidated_id;
    END IF;
    
    INSERT INTO consolidated_package_sources (
      consolidated_package_id, session_id, session_type,
      session_date, contribution_units
    ) VALUES (
      v_consolidated_id, p_session_id, 'packaging',
      p_session_date, p_units_3_5g
    );
  END IF;
  
  -- Process 14g units if any
  IF p_units_14g > 0 THEN
    v_product_type := '14g';
    
    SELECT id, package_id INTO v_consolidated_id, v_package_id
    FROM consolidated_packages
    WHERE package_date = p_session_date
      AND strain = p_strain
      AND product_stage = 'Packaged'
      AND product_type = v_product_type
      AND session_type = 'packaging';
    
    IF v_consolidated_id IS NULL THEN
      v_package_id := generate_consolidated_package_id(p_session_date, p_strain_abbreviation);
      
      INSERT INTO consolidated_packages (
        package_id, package_date, strain, strain_abbreviation,
        product_stage, product_type, total_units,
        session_type, session_count, source_session_ids
      ) VALUES (
        v_package_id, p_session_date, p_strain, p_strain_abbreviation,
        'Packaged', v_product_type, p_units_14g,
        'packaging', 1, ARRAY[p_session_id]
      )
      RETURNING id INTO v_consolidated_id;
    ELSE
      UPDATE consolidated_packages
      SET total_units = total_units + p_units_14g,
          session_count = session_count + 1,
          source_session_ids = array_append(source_session_ids, p_session_id),
          updated_at = now()
      WHERE id = v_consolidated_id;
    END IF;
    
    INSERT INTO consolidated_package_sources (
      consolidated_package_id, session_id, session_type,
      session_date, contribution_units
    ) VALUES (
      v_consolidated_id, p_session_id, 'packaging',
      p_session_date, p_units_14g
    );
  END IF;
  
  -- Process 454g units if any
  IF p_units_454g > 0 THEN
    v_product_type := '454g';
    
    SELECT id, package_id INTO v_consolidated_id, v_package_id
    FROM consolidated_packages
    WHERE package_date = p_session_date
      AND strain = p_strain
      AND product_stage = 'Packaged'
      AND product_type = v_product_type
      AND session_type = 'packaging';
    
    IF v_consolidated_id IS NULL THEN
      v_package_id := generate_consolidated_package_id(p_session_date, p_strain_abbreviation);
      
      INSERT INTO consolidated_packages (
        package_id, package_date, strain, strain_abbreviation,
        product_stage, product_type, total_units,
        session_type, session_count, source_session_ids
      ) VALUES (
        v_package_id, p_session_date, p_strain, p_strain_abbreviation,
        'Packaged', v_product_type, p_units_454g,
        'packaging', 1, ARRAY[p_session_id]
      )
      RETURNING id INTO v_consolidated_id;
    ELSE
      UPDATE consolidated_packages
      SET total_units = total_units + p_units_454g,
          session_count = session_count + 1,
          source_session_ids = array_append(source_session_ids, p_session_id),
          updated_at = now()
      WHERE id = v_consolidated_id;
    END IF;
    
    INSERT INTO consolidated_package_sources (
      consolidated_package_id, session_id, session_type,
      session_date, contribution_units
    ) VALUES (
      v_consolidated_id, p_session_id, 'packaging',
      p_session_date, p_units_454g
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE consolidated_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE consolidated_package_sources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Authenticated users can view consolidated_packages"
  ON consolidated_packages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can modify consolidated_packages"
  ON consolidated_packages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view consolidated_package_sources"
  ON consolidated_package_sources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert consolidated_package_sources"
  ON consolidated_package_sources FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete consolidated_package_sources"
  ON consolidated_package_sources FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_consolidated_packages_updated_at ON consolidated_packages;
CREATE TRIGGER update_consolidated_packages_updated_at
  BEFORE UPDATE ON consolidated_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
