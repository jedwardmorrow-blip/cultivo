/*
  # Create Routing System for Turn-by-Turn Directions

  1. New Tables
    - `geocoded_locations`
      - Stores latitude/longitude coordinates for addresses
      - Links to customers table for delivery locations
      - Includes formatted address and geocoding timestamp

    - `delivery_routes`
      - Caches calculated routes between two locations
      - Stores complete route geometry and turn-by-turn instructions
      - Includes distance, duration, and last calculation timestamp
      - Enables instant manifest generation without API calls

    - `route_waypoints`
      - Individual turn-by-turn instruction steps for each route
      - Ordered sequence of directions with distances
      - Used for detailed manifest printing

  2. Schema Changes
    - Add geocoding columns to customers table
    - Add routing API key to app_settings

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users

  4. Performance
    - Add indexes on location lookups and route queries
    - Optimize for fast manifest generation
*/

-- Add geocoding columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric,
ADD COLUMN IF NOT EXISTS formatted_address text,
ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;

-- Create geocoded_locations table for storing all location data
CREATE TABLE IF NOT EXISTS geocoded_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_type text NOT NULL CHECK (location_type IN ('customer', 'facility', 'waypoint')),
  reference_id uuid,
  name text NOT NULL,
  address text NOT NULL,
  city text,
  state text,
  postal_code text,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  formatted_address text,
  geocoded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create delivery_routes table for caching route calculations
CREATE TABLE IF NOT EXISTS delivery_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_location_id uuid REFERENCES geocoded_locations(id) ON DELETE CASCADE,
  destination_location_id uuid REFERENCES geocoded_locations(id) ON DELETE CASCADE,
  origin_customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  destination_customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  route_geometry jsonb,
  summary jsonb,
  distance_meters numeric NOT NULL,
  duration_seconds numeric NOT NULL,
  last_calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_route_pair UNIQUE (origin_location_id, destination_location_id)
);

-- Create route_waypoints table for turn-by-turn instructions
CREATE TABLE IF NOT EXISTS route_waypoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES delivery_routes(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  instruction_text text NOT NULL,
  distance_meters numeric NOT NULL,
  duration_seconds numeric NOT NULL,
  street_name text,
  direction text,
  created_at timestamptz DEFAULT now()
);

-- Create route_plans table for multi-stop delivery planning
CREATE TABLE IF NOT EXISTS route_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL,
  planned_date date NOT NULL,
  driver_id uuid REFERENCES delivery_drivers(id),
  vehicle_id uuid REFERENCES delivery_vehicles(id),
  total_distance_meters numeric,
  total_duration_seconds numeric,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'in_progress', 'completed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create route_plan_stops table for individual stops in a route plan
CREATE TABLE IF NOT EXISTS route_plan_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_plan_id uuid REFERENCES route_plans(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  stop_number integer NOT NULL,
  customer_id uuid REFERENCES customers(id),
  estimated_arrival_time timestamptz,
  actual_arrival_time timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE geocoded_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_waypoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_plan_stops ENABLE ROW LEVEL SECURITY;

-- Policies for geocoded_locations
CREATE POLICY "Authenticated users can read locations"
  ON geocoded_locations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert locations"
  ON geocoded_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update locations"
  ON geocoded_locations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete locations"
  ON geocoded_locations
  FOR DELETE
  TO authenticated
  USING (true);

-- Policies for delivery_routes
CREATE POLICY "Authenticated users can read routes"
  ON delivery_routes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert routes"
  ON delivery_routes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update routes"
  ON delivery_routes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete routes"
  ON delivery_routes
  FOR DELETE
  TO authenticated
  USING (true);

-- Policies for route_waypoints
CREATE POLICY "Authenticated users can read waypoints"
  ON route_waypoints
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert waypoints"
  ON route_waypoints
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update waypoints"
  ON route_waypoints
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete waypoints"
  ON route_waypoints
  FOR DELETE
  TO authenticated
  USING (true);

-- Policies for route_plans
CREATE POLICY "Authenticated users can read route plans"
  ON route_plans
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert route plans"
  ON route_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update route plans"
  ON route_plans
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete route plans"
  ON route_plans
  FOR DELETE
  TO authenticated
  USING (true);

-- Policies for route_plan_stops
CREATE POLICY "Authenticated users can read route plan stops"
  ON route_plan_stops
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert route plan stops"
  ON route_plan_stops
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update route plan stops"
  ON route_plan_stops
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete route plan stops"
  ON route_plan_stops
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_geocoded_locations_type ON geocoded_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_geocoded_locations_reference ON geocoded_locations(reference_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_origin ON delivery_routes(origin_location_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_destination ON delivery_routes(destination_location_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_customers ON delivery_routes(origin_customer_id, destination_customer_id);
CREATE INDEX IF NOT EXISTS idx_route_waypoints_route ON route_waypoints(route_id, step_number);
CREATE INDEX IF NOT EXISTS idx_route_plans_date ON route_plans(planned_date);
CREATE INDEX IF NOT EXISTS idx_route_plan_stops_plan ON route_plan_stops(route_plan_id, stop_number);

-- Add routing API settings to app_settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('routing_api_key', '', 'text', 'OpenRouteService API key for routing calculations', 'routing'),
  ('routing_api_provider', 'openrouteservice', 'text', 'Routing API provider (openrouteservice, osrm)', 'routing'),
  ('route_cache_days', '30', 'number', 'Days before route cache expires and needs refresh', 'routing'),
  ('facility_address', '3303 South 40th Street', 'text', 'Cultivation facility address for route origin', 'routing'),
  ('facility_city', 'Phoenix', 'text', 'Cultivation facility city', 'routing'),
  ('facility_state', 'AZ', 'text', 'Cultivation facility state', 'routing'),
  ('facility_postal_code', '85040', 'text', 'Cultivation facility postal code', 'routing')
ON CONFLICT (setting_key) DO NOTHING;

-- Create view for route statistics
CREATE OR REPLACE VIEW route_statistics AS
SELECT
  COUNT(*) as total_cached_routes,
  COUNT(*) FILTER (WHERE last_calculated_at > now() - interval '30 days') as fresh_routes,
  COUNT(*) FILTER (WHERE last_calculated_at <= now() - interval '30 days') as stale_routes,
  SUM(distance_meters) as total_distance_cached,
  AVG(distance_meters) as avg_route_distance,
  AVG(duration_seconds) as avg_route_duration
FROM delivery_routes;
