/*
  # Create Routing System for Turn-by-Turn Directions

  1. New Tables
    - `delivery_routes`
      - Caches calculated routes between two customer locations
      - Stores complete route geometry and turn-by-turn instructions
      - Includes distance, duration, and last calculation timestamp
      - Enables instant manifest generation without API calls

    - `route_waypoints`
      - Individual turn-by-turn instruction steps for each route
      - Ordered sequence of directions with distances
      - Used for detailed manifest printing

  2. Schema Changes
    - Add routing API key to app_settings

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users

  4. Performance
    - Add indexes on location lookups and route queries
    - Optimize for fast manifest generation
    
  5. Design Decision
    - Routes are stored by customer ID pairs (not location IDs)
    - This matches how routing.service.ts queries for routes
    - Unique constraint on customer ID pairs prevents duplicates
*/

-- Create delivery_routes table for caching route calculations
CREATE TABLE IF NOT EXISTS delivery_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  destination_customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  route_geometry jsonb,
  summary jsonb,
  distance_meters numeric NOT NULL,
  duration_seconds numeric NOT NULL,
  last_calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_customer_route_pair UNIQUE (origin_customer_id, destination_customer_id)
);

-- Create route_waypoints table for turn-by-turn instructions
CREATE TABLE IF NOT EXISTS route_waypoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES delivery_routes(id) ON DELETE CASCADE NOT NULL,
  step_number integer NOT NULL,
  instruction_text text NOT NULL,
  distance_meters numeric NOT NULL,
  duration_seconds numeric NOT NULL,
  street_name text,
  direction text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_waypoints ENABLE ROW LEVEL SECURITY;

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_routes_origin ON delivery_routes(origin_customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_destination ON delivery_routes(destination_customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_customers ON delivery_routes(origin_customer_id, destination_customer_id);
CREATE INDEX IF NOT EXISTS idx_route_waypoints_route ON route_waypoints(route_id, step_number);

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