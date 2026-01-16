/*
  # Create Manifest System

  1. New Tables
    - `delivery_drivers`
      - `id` (uuid, primary key) - Unique identifier
      - `first_name` (text, not null) - Driver's first name
      - `last_name` (text, not null) - Driver's last name
      - `fa_number` (text, unique, not null) - Facility Agent card number
      - `is_active` (boolean, default true) - Whether driver is currently active
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

    - `delivery_vehicles`
      - `id` (uuid, primary key) - Unique identifier
      - `make` (text, not null) - Vehicle make
      - `model` (text, not null) - Vehicle model
      - `year` (integer, not null) - Vehicle year
      - `license_plate` (text, not null) - License plate number
      - `vin` (text, unique, not null) - Vehicle identification number
      - `is_active` (boolean, default true) - Whether vehicle is currently active
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

    - `manifests`
      - `id` (uuid, primary key) - Unique identifier
      - `manifest_number` (text, unique, not null) - Manifest number (same as invoice/order number)
      - `order_id` (uuid, foreign key) - Reference to orders table
      - `driver_id` (uuid, foreign key) - Reference to delivery_drivers table
      - `vehicle_id` (uuid, foreign key) - Reference to delivery_vehicles table
      - `route_description` (text) - Description of route to be traveled
      - `departure_time` (text) - Blank field for handwritten departure time
      - `arrival_time` (text) - Blank field for handwritten arrival time
      - `stop_number` (text) - Stop number on route
      - `notes` (text) - Notes about extenuating circumstances or deviations
      - `status` (text, default 'generated') - Status of manifest (generated, in_transit, delivered, returned)
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Schema Changes
    - Add `gross_weight` column to products table for packaged products
    - Add company phone number to app_settings

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage drivers, vehicles, and manifests

  4. Initial Data
    - Set default gross weights for existing products
    - Add company phone setting
*/

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

-- Create manifests table
CREATE TABLE IF NOT EXISTS manifests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_number text UNIQUE NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES delivery_drivers(id) ON DELETE RESTRICT,
  vehicle_id uuid REFERENCES delivery_vehicles(id) ON DELETE RESTRICT,
  route_description text,
  departure_time text,
  arrival_time text,
  stop_number text,
  notes text,
  status text DEFAULT 'generated',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add gross_weight column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS gross_weight numeric DEFAULT 0;

-- Enable RLS
ALTER TABLE delivery_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifests ENABLE ROW LEVEL SECURITY;

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

-- Policies for manifests
CREATE POLICY "Authenticated users can read manifests"
  ON manifests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert manifests"
  ON manifests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update manifests"
  ON manifests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete manifests"
  ON manifests
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_delivery_drivers_active ON delivery_drivers(is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_vehicles_active ON delivery_vehicles(is_active);
CREATE INDEX IF NOT EXISTS idx_manifests_order_id ON manifests(order_id);
CREATE INDEX IF NOT EXISTS idx_manifests_status ON manifests(status);

-- Add check constraints
ALTER TABLE manifests
ADD CONSTRAINT manifests_status_check
CHECK (status IN ('generated', 'in_transit', 'delivered', 'returned'));

-- Update existing products with default gross weights
-- 3.5g jars = 54g
UPDATE products
SET gross_weight = 54
WHERE product_category = 'packaged'
  AND (name LIKE '%3.5g%' OR name LIKE '%3.5 g%');

-- 14g smalls = 22g
UPDATE products
SET gross_weight = 22
WHERE product_category = 'packaged'
  AND (name LIKE '%14g%' OR name LIKE '%14 g%')
  AND name LIKE '%Smalls%';

-- Bulk lbs = 468g
UPDATE products
SET gross_weight = 468
WHERE product_category = 'bulk';

-- Add company phone number to app_settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('company_phone', '', 'text', 'Company phone number for manifests and invoices', 'company')
ON CONFLICT (setting_key) DO NOTHING;
