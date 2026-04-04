-- CUL-355: Create trip_plans schema
-- trip_plans, trip_plan_stops, trip_plan_deviations
-- Per R9-18-312: 2-year retention via INSERT trigger (GENERATED ALWAYS AS not viable for timestamptz+interval)

-- 1. trip_plans
CREATE TABLE trip_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES delivery_drivers(id) NOT NULL,
  vehicle_id uuid REFERENCES delivery_vehicles(id) NOT NULL,
  departure_time timestamptz,
  end_time timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  product_manifest jsonb NOT NULL DEFAULT '[]',
  anticipated_route text,
  pdf_path text,
  notes text,
  retention_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_trip_plan_retention()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.retention_expires_at := NEW.created_at + interval '2 years';
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_trip_plan_retention_on_insert
  BEFORE INSERT ON trip_plans
  FOR EACH ROW EXECUTE FUNCTION set_trip_plan_retention();

ALTER TABLE trip_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read trip plans"
  ON trip_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert trip plans"
  ON trip_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update trip plans"
  ON trip_plans FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete trip plans"
  ON trip_plans FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_trip_plans_status ON trip_plans(status);
CREATE INDEX idx_trip_plans_driver_id ON trip_plans(driver_id);
CREATE INDEX idx_trip_plans_vehicle_id ON trip_plans(vehicle_id);

CREATE TRIGGER set_trip_plans_updated_at
  BEFORE UPDATE ON trip_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. trip_plan_stops
CREATE TABLE trip_plan_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_plan_id uuid REFERENCES trip_plans(id) ON DELETE CASCADE NOT NULL,
  stop_order integer NOT NULL,
  location_name text NOT NULL,
  address text NOT NULL,
  estimated_arrival timestamptz,
  estimated_departure timestamptz,
  actual_arrival timestamptz,
  actual_departure timestamptz,
  order_ids jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trip_plan_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read trip plan stops"
  ON trip_plan_stops FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert trip plan stops"
  ON trip_plan_stops FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update trip plan stops"
  ON trip_plan_stops FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete trip plan stops"
  ON trip_plan_stops FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_trip_plan_stops_trip_plan_id_stop_order ON trip_plan_stops(trip_plan_id, stop_order);

-- 3. trip_plan_deviations
CREATE TABLE trip_plan_deviations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_plan_id uuid REFERENCES trip_plans(id) ON DELETE CASCADE NOT NULL,
  deviation_type text NOT NULL,
  description text NOT NULL,
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE trip_plan_deviations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read trip plan deviations"
  ON trip_plan_deviations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert trip plan deviations"
  ON trip_plan_deviations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update trip plan deviations"
  ON trip_plan_deviations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete trip plan deviations"
  ON trip_plan_deviations FOR DELETE TO authenticated USING (true);
