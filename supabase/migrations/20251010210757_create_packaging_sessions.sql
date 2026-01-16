/*
  # Create Packaging Sessions Table

  ## Overview
  This migration creates a packaging sessions tracking system with a two-step workflow
  similar to trim sessions. Staff log when they start packaging (recording inputs),
  then complete the session when finished (recording all outputs and productivity metrics).

  ## New Tables

  ### packaging_sessions
  - `id` (uuid, primary key) - Unique session identifier
  - `session_date` (date) - Date of the packaging session
  - `packager_name` (text) - Name of the person packaging
  - `package_id` (text) - Package identifier being worked on
  - `strain` (text) - Cannabis strain being packaged
  - `batch_id` (text) - Batch identifier
  - `package_weight` (numeric) - Initial package weight in grams
  - `pull_weight` (numeric) - Weight pulled for packaging
  - `ending_weight` (numeric) - Weight remaining after packaging
  - `units_3_5g` (integer) - Number of 3.5g units packaged
  - `units_14g` (integer) - Number of 14g units packaged
  - `units_454g` (integer) - Number of 454g (1 pound) units packaged
  - `trim_grams` (numeric) - Trim generated during packaging
  - `waste_grams` (numeric) - Waste generated during packaging
  - `recorded_in_dutchie` (boolean) - Whether data has been recorded in Dutchie
  - `notes` (text) - Session notes
  - `session_status` (text) - Session status (active, completed, cancelled)
  - `started_at` (timestamptz) - When session was started
  - `completed_at` (timestamptz) - When session was completed
  - `minutes_packaged` (numeric) - Calculated time spent packaging
  - `units_per_hour` (numeric) - Calculated productivity metric
  - `variance_grams` (numeric) - Calculated difference between input and output weights
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Workflow
  - Step 1: Packager starts session, logs package info and pull weight
  - System records start time automatically
  - Session shows as "active" in the list
  - Step 2: Packager completes session, logs all output weights and units
  - System records completion time and calculates metrics automatically

  ## Security
  - Enable Row Level Security (RLS) on packaging_sessions table
  - Add policies for authenticated users with full access
  - Add policies for anonymous users with full access (internal tool)

  ## Functions and Triggers
  - Create function to auto-update updated_at timestamps
  - Create function to calculate productivity metrics on completion
  - Create trigger to calculate minutes_packaged from timestamps
  - Create trigger to calculate units_per_hour
  - Create trigger to calculate variance_grams
  - Create view for active_packaging_sessions with elapsed time

  ## Important Notes
  - Output fields are nullable until session completion
  - Productivity metrics calculated automatically on completion
  - Timestamps use timestamptz for timezone awareness
  - Status field uses text for flexibility
*/

-- Create packaging_sessions table
CREATE TABLE IF NOT EXISTS packaging_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  packager_name text NOT NULL,
  package_id text NOT NULL,
  strain text NOT NULL,
  batch_id text NOT NULL,
  package_weight numeric,
  pull_weight numeric,
  ending_weight numeric,
  units_3_5g integer DEFAULT 0,
  units_14g integer DEFAULT 0,
  units_454g integer DEFAULT 0,
  trim_grams numeric DEFAULT 0,
  waste_grams numeric DEFAULT 0,
  recorded_in_dutchie boolean DEFAULT false,
  notes text,
  session_status text DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  minutes_packaged numeric,
  units_per_hour numeric,
  variance_grams numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add check constraint for valid session status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_packaging_session_status'
  ) THEN
    ALTER TABLE packaging_sessions
    ADD CONSTRAINT valid_packaging_session_status
    CHECK (session_status IN ('active', 'completed', 'cancelled'));
  END IF;
END $$;

-- Create index on session status for fast active session queries
CREATE INDEX IF NOT EXISTS idx_packaging_sessions_status ON packaging_sessions(session_status);

-- Create index on session date for reporting
CREATE INDEX IF NOT EXISTS idx_packaging_sessions_date ON packaging_sessions(session_date DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_packaging_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_packaging_sessions_updated_at_trigger
  BEFORE UPDATE ON packaging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_packaging_sessions_updated_at();

-- Create function to calculate packaging metrics
CREATE OR REPLACE FUNCTION calculate_packaging_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate metrics for completed sessions
  IF NEW.session_status = 'completed' THEN
    -- Set completion timestamp if not already set
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;

    -- Calculate minutes from started_at to completed_at
    IF NEW.started_at IS NOT NULL AND NEW.completed_at IS NOT NULL THEN
      NEW.minutes_packaged := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 60;
    END IF;

    -- Calculate units per hour if we have the data
    IF NEW.minutes_packaged > 0 THEN
      DECLARE
        total_units numeric;
      BEGIN
        total_units := COALESCE(NEW.units_3_5g, 0) + COALESCE(NEW.units_14g, 0) + COALESCE(NEW.units_454g, 0);
        NEW.units_per_hour := (total_units * 60.0) / NEW.minutes_packaged;
      END;
    END IF;

    -- Calculate variance
    IF NEW.pull_weight IS NOT NULL THEN
      DECLARE
        total_output numeric;
      BEGIN
        -- Calculate total output: ending weight + (units weights) + trim + waste
        total_output := COALESCE(NEW.ending_weight, 0) +
                       (COALESCE(NEW.units_3_5g, 0) * 3.5) +
                       (COALESCE(NEW.units_14g, 0) * 14) +
                       (COALESCE(NEW.units_454g, 0) * 454) +
                       COALESCE(NEW.trim_grams, 0) +
                       COALESCE(NEW.waste_grams, 0);
        NEW.variance_grams := NEW.pull_weight - total_output;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to calculate packaging metrics
CREATE TRIGGER calculate_packaging_metrics_trigger
  BEFORE INSERT OR UPDATE ON packaging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_packaging_metrics();

-- Create view for active packaging sessions
CREATE OR REPLACE VIEW active_packaging_sessions AS
SELECT
  ps.*,
  EXTRACT(EPOCH FROM (now() - ps.started_at)) / 60 AS minutes_elapsed
FROM packaging_sessions ps
WHERE ps.session_status = 'active'
ORDER BY ps.started_at ASC;

-- Grant access to the view
GRANT SELECT ON active_packaging_sessions TO anon;
GRANT SELECT ON active_packaging_sessions TO authenticated;

-- Enable Row Level Security
ALTER TABLE packaging_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users (full access for internal tool)
CREATE POLICY "Authenticated users can manage packaging sessions"
  ON packaging_sessions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for anonymous users (full access for internal tool)
CREATE POLICY "Anonymous users can view packaging sessions"
  ON packaging_sessions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can insert packaging sessions"
  ON packaging_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update packaging sessions"
  ON packaging_sessions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete packaging sessions"
  ON packaging_sessions FOR DELETE
  TO anon
  USING (true);
