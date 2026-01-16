/*
  # Create Internal Inventory Labels Table

  1. Purpose
    - Track internal label prints for inventory items
    - Separate from external compliance labels (labels table)
    - Used for internal warehouse/tracking purposes only

  2. New Tables
    - `inventory_internal_labels`
      - `id` (uuid, primary key)
      - `package_id` (text, references inventory_items)
      - `label_data` (jsonb, stores complete label information)
      - `printed_at` (timestamptz, when label was printed)
      - `created_at` (timestamptz, when record was created)

  3. Security
    - Enable RLS on inventory_internal_labels table
    - Add policy for authenticated users to read their labels
    - Add policy for authenticated users to create label print records

  4. Indexes
    - Index on package_id for fast lookups
    - Index on printed_at for historical queries
*/

-- Create inventory_internal_labels table
CREATE TABLE IF NOT EXISTS inventory_internal_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id text NOT NULL,
  label_data jsonb NOT NULL,
  printed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_internal_labels_package_id 
  ON inventory_internal_labels(package_id);

CREATE INDEX IF NOT EXISTS idx_inventory_internal_labels_printed_at 
  ON inventory_internal_labels(printed_at DESC);

-- Enable RLS
ALTER TABLE inventory_internal_labels ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read all internal labels
CREATE POLICY "Authenticated users can read internal labels"
  ON inventory_internal_labels
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy for authenticated users to create internal label records
CREATE POLICY "Authenticated users can create internal labels"
  ON inventory_internal_labels
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE inventory_internal_labels IS 'Tracks internal inventory label prints - separate from external compliance labels';
