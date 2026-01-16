/*
  # Update Trim Sessions for 2-Step Workflow

  ## Changes
  1. Add `session_status` field to track active vs completed sessions
  2. Add `started_at` and `completed_at` timestamp fields
  3. Make output fields nullable (only required on completion)
  4. Update triggers to handle 2-step workflow

  ## Workflow
  - Step 1: Trimmer receives bin, logs pulled weight and strain info
  - System records start time automatically
  - Session shows as "active" in the list
  - Step 2: Trimmer returns bin, logs output weights
  - System records completion time and calculates metrics
*/

-- Add new columns for 2-step workflow
ALTER TABLE trim_sessions
ADD COLUMN IF NOT EXISTS session_status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Update constraints to allow nulls for output fields until completion
ALTER TABLE trim_sessions
ALTER COLUMN big_buds_grams DROP NOT NULL,
ALTER COLUMN small_buds_grams DROP NOT NULL,
ALTER COLUMN trim_grams DROP NOT NULL,
ALTER COLUMN waste_grams DROP NOT NULL,
ALTER COLUMN variance_grams DROP NOT NULL;

-- Add check constraint for valid session status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_session_status'
  ) THEN
    ALTER TABLE trim_sessions
    ADD CONSTRAINT valid_session_status
    CHECK (session_status IN ('active', 'completed', 'cancelled'));
  END IF;
END $$;

-- Create index on session status for fast active session queries
CREATE INDEX IF NOT EXISTS idx_trim_sessions_status ON trim_sessions(session_status);

-- Update the productivity calculation function to only run on completed sessions
DROP TRIGGER IF EXISTS calculate_trim_productivity ON trim_sessions;

CREATE OR REPLACE FUNCTION calculate_trim_metrics()
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
      NEW.minutes_trimmed := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 60;
    END IF;

    -- Calculate grams per hour if we have the data
    IF NEW.minutes_trimmed > 0 AND NEW.big_buds_grams IS NOT NULL THEN
      NEW.grams_per_hour := (NEW.big_buds_grams * 60.0) / NEW.minutes_trimmed;
    END IF;

    -- Calculate variance
    IF NEW.pulled_weight IS NOT NULL THEN
      NEW.variance_grams := NEW.pulled_weight -
        (COALESCE(NEW.big_buds_grams, 0) +
         COALESCE(NEW.small_buds_grams, 0) +
         COALESCE(NEW.trim_grams, 0) +
         COALESCE(NEW.waste_grams, 0));
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_trim_metrics_trigger
  BEFORE INSERT OR UPDATE ON trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_trim_metrics();

-- Update the bucked inventory trigger to only deduct on session start
DROP TRIGGER IF EXISTS update_bucked_on_trim_session ON trim_sessions;

CREATE OR REPLACE FUNCTION update_bucked_on_session_start()
RETURNS TRIGGER AS $$
BEGIN
  -- Only deduct inventory when session is first created (active status)
  IF TG_OP = 'INSERT' AND NEW.bucked_inventory_id IS NOT NULL THEN
    UPDATE bucked_inventory
    SET current_weight_grams = current_weight_grams - NEW.pulled_weight,
        status = CASE
          WHEN current_weight_grams - NEW.pulled_weight <= 0 THEN 'depleted'
          ELSE status
        END,
        updated_at = now()
    WHERE id = NEW.bucked_inventory_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bucked_on_session_start_trigger
  AFTER INSERT ON trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_bucked_on_session_start();

-- Create view for active trim sessions
CREATE OR REPLACE VIEW active_trim_sessions AS
SELECT
  ts.*,
  EXTRACT(EPOCH FROM (now() - ts.started_at)) / 60 AS minutes_elapsed,
  bi.current_weight_grams as bucked_remaining
FROM trim_sessions ts
LEFT JOIN bucked_inventory bi ON ts.bucked_inventory_id = bi.id
WHERE ts.session_status = 'active'
ORDER BY ts.started_at ASC;

-- Grant access to the view
GRANT SELECT ON active_trim_sessions TO anon;
GRANT SELECT ON active_trim_sessions TO authenticated;