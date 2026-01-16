-- Create delivery_vehicles table
CREATE TABLE IF NOT EXISTS delivery_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  license_plate text NOT NULL,
  vin text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE delivery_vehicles ENABLE ROW LEVEL SECURITY;

-- Policies for delivery_vehicles
CREATE POLICY "Authenticated users can read vehicles"
  ON delivery_vehicles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert vehicles"
  ON delivery_vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update vehicles"
  ON delivery_vehicles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete vehicles"
  ON delivery_vehicles
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_delivery_vehicles_active ON delivery_vehicles(is_active);