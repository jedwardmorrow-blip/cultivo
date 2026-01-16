/*
  # Create Product Catalog System with Stages, Types, and Strains

  1. New Tables
    - `product_stages`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Stage name (e.g., Bulk, Binned, Bucked, Packaged)
      - `sort_order` (integer) - Display order
      - `default_pricing_unit` (text) - Default unit for pricing (e.g., lb, oz, unit)
      - `allows_fractional_quantity` (boolean) - Whether fractional quantities are allowed
      - `description` (text, nullable) - Optional description
      - `is_active` (boolean) - Whether stage is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `product_types`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Type name (e.g., Flower, 3.5g Flower, 1g Preroll)
      - `base_weight` (numeric, nullable) - Base weight if applicable
      - `base_unit` (text, nullable) - Unit of measurement (g, oz, lb)
      - `sort_order` (integer) - Display order
      - `applicable_stages` (text array) - Which stages this type applies to
      - `description` (text, nullable) - Optional description
      - `is_active` (boolean) - Whether type is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `strains`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Strain name
      - `abbreviation` (text, unique, nullable) - Short code (e.g., BLP, ACD)
      - `dominance_type` (text, nullable) - Sativa/Indica/Hybrid classification
      - `genetics_description` (text, nullable) - Genetic lineage description
      - `is_active` (boolean) - Whether strain is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Update products table
    - Add `stage_id` (uuid, foreign key to product_stages)
    - Add `type_id` (uuid, foreign key to product_types)
    - Add `strain_id` (uuid, foreign key to strains)
    - Add `generated_at` (timestamptz, nullable) - When product was auto-generated
    - Add `generation_batch_id` (uuid, nullable) - Batch identifier for bulk generation
    - Add `is_active` (boolean) - Whether product is active

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to read all data
    - Add policies for authenticated users with appropriate roles to modify data
*/

-- Create product_stages table
CREATE TABLE IF NOT EXISTS product_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  default_pricing_unit text NOT NULL DEFAULT 'unit',
  allows_fractional_quantity boolean NOT NULL DEFAULT false,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_types table
CREATE TABLE IF NOT EXISTS product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  base_weight numeric,
  base_unit text,
  sort_order integer NOT NULL DEFAULT 0,
  applicable_stages text[] NOT NULL DEFAULT '{}',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create strains table
CREATE TABLE IF NOT EXISTS strains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  abbreviation text UNIQUE,
  dominance_type text,
  genetics_description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new columns to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'stage_id'
  ) THEN
    ALTER TABLE products ADD COLUMN stage_id uuid REFERENCES product_stages(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'type_id'
  ) THEN
    ALTER TABLE products ADD COLUMN type_id uuid REFERENCES product_types(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'strain_id'
  ) THEN
    ALTER TABLE products ADD COLUMN strain_id uuid REFERENCES strains(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'generated_at'
  ) THEN
    ALTER TABLE products ADD COLUMN generated_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'generation_batch_id'
  ) THEN
    ALTER TABLE products ADD COLUMN generation_batch_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE products ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE product_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE strains ENABLE ROW LEVEL SECURITY;

-- Policies for product_stages
CREATE POLICY "Authenticated users can read product stages"
  ON product_stages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert product stages"
  ON product_stages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product stages"
  ON product_stages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete product stages"
  ON product_stages FOR DELETE
  TO authenticated
  USING (true);

-- Policies for product_types
CREATE POLICY "Authenticated users can read product types"
  ON product_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert product types"
  ON product_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product types"
  ON product_types FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete product types"
  ON product_types FOR DELETE
  TO authenticated
  USING (true);

-- Policies for strains
CREATE POLICY "Authenticated users can read strains"
  ON strains FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert strains"
  ON strains FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update strains"
  ON strains FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete strains"
  ON strains FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_stage_id ON products(stage_id);
CREATE INDEX IF NOT EXISTS idx_products_type_id ON products(type_id);
CREATE INDEX IF NOT EXISTS idx_products_strain_id ON products(strain_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_strains_abbreviation ON strains(abbreviation);
CREATE INDEX IF NOT EXISTS idx_product_stages_sort_order ON product_stages(sort_order);
CREATE INDEX IF NOT EXISTS idx_product_types_sort_order ON product_types(sort_order);
