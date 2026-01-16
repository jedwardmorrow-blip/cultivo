/*
  # Create Certificate of Analysis (COA) System

  1. New Tables
    - `certificates_of_analysis`
      - `id` (uuid, primary key)
      - `strain_name` (text)
      - `batch_number` (text)
      - `harvest_date` (date)
      - `manufacture_date` (date)
      - `sample_date` (date)
      - `thc_percentage` (numeric)
      - `cbd_percentage` (numeric)
      - `total_cannabinoids_percentage` (numeric)
      - `total_terpenes_mg_g` (numeric)
      - `terpene_1_name` (text)
      - `terpene_1_value` (numeric)
      - `terpene_1_percentage` (numeric)
      - `terpene_2_name` (text)
      - `terpene_2_value` (numeric)
      - `terpene_2_percentage` (numeric)
      - `terpene_3_name` (text)
      - `terpene_3_value` (numeric)
      - `terpene_3_percentage` (numeric)
      - `pdf_file_path` (text)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Schema Changes
    - Add coversheet fields to orders table
      - `coversheet_enabled` (boolean)
      - `public_token` (text, unique)

  3. Security
    - Enable RLS on `certificates_of_analysis` table
    - Add policies for public read access to active COAs
    - Add policies for authenticated users to manage COAs

  4. Indexes
    - Add indexes for efficient querying
*/

-- Create certificates_of_analysis table
CREATE TABLE IF NOT EXISTS certificates_of_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strain_name text NOT NULL,
  batch_number text NOT NULL,
  harvest_date date,
  manufacture_date date,
  sample_date date,
  thc_percentage numeric(5,2),
  cbd_percentage numeric(5,2),
  total_cannabinoids_percentage numeric(5,2),
  total_terpenes_mg_g numeric(6,2),
  terpene_1_name text,
  terpene_1_value numeric(6,2),
  terpene_1_percentage numeric(5,2),
  terpene_2_name text,
  terpene_2_value numeric(6,2),
  terpene_2_percentage numeric(5,2),
  terpene_3_name text,
  terpene_3_value numeric(6,2),
  terpene_3_percentage numeric(5,2),
  pdf_file_path text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add coversheet fields to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'coversheet_enabled'
  ) THEN
    ALTER TABLE orders ADD COLUMN coversheet_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'public_token'
  ) THEN
    ALTER TABLE orders ADD COLUMN public_token text UNIQUE;
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_coa_strain_name ON certificates_of_analysis(strain_name);
CREATE INDEX IF NOT EXISTS idx_coa_batch_number ON certificates_of_analysis(batch_number);
CREATE INDEX IF NOT EXISTS idx_coa_harvest_date ON certificates_of_analysis(harvest_date DESC);
CREATE INDEX IF NOT EXISTS idx_coa_is_active ON certificates_of_analysis(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_public_token ON orders(public_token) WHERE public_token IS NOT NULL;

-- Enable RLS on certificates_of_analysis
ALTER TABLE certificates_of_analysis ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public to read active COAs
CREATE POLICY "Public can view active COAs"
  ON certificates_of_analysis
  FOR SELECT
  USING (is_active = true);

-- Policy: Authenticated users can view all COAs
CREATE POLICY "Authenticated users can view all COAs"
  ON certificates_of_analysis
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert COAs
CREATE POLICY "Authenticated users can insert COAs"
  ON certificates_of_analysis
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update COAs
CREATE POLICY "Authenticated users can update COAs"
  ON certificates_of_analysis
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete COAs
CREATE POLICY "Authenticated users can delete COAs"
  ON certificates_of_analysis
  FOR DELETE
  TO authenticated
  USING (true);

-- Function to generate unique public token for orders
CREATE OR REPLACE FUNCTION generate_order_public_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_token text;
  token_exists boolean;
BEGIN
  LOOP
    new_token := encode(gen_random_bytes(16), 'hex');
    SELECT EXISTS(SELECT 1 FROM orders WHERE public_token = new_token) INTO token_exists;
    EXIT WHEN NOT token_exists;
  END LOOP;
  RETURN new_token;
END;
$$;

-- Add updated_at trigger for certificates_of_analysis
CREATE OR REPLACE FUNCTION update_certificates_of_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER certificates_of_analysis_updated_at
  BEFORE UPDATE ON certificates_of_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_certificates_of_analysis_updated_at();