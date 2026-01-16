-- Create delivery_drivers table
CREATE TABLE IF NOT EXISTS delivery_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  fa_number text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE delivery_drivers ENABLE ROW LEVEL SECURITY;

-- Policies for delivery_drivers
CREATE POLICY "Authenticated users can read drivers"
  ON delivery_drivers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert drivers"
  ON delivery_drivers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update drivers"
  ON delivery_drivers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete drivers"
  ON delivery_drivers
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_delivery_drivers_active ON delivery_drivers(is_active);