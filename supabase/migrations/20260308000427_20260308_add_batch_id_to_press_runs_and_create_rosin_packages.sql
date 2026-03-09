/*
  # Add batch_id to press_runs and create rosin_packages

  ## Summary
  Extends the existing rosin lab tables (created in Prompt #3 migration) with the
  columns needed for the Rosin Inventory screen, then creates the rosin_packages table.

  ## Modified Tables

  ### press_runs
  - Adds `batch_id` (uuid, FK → batch_registry.id, nullable) to support
    batch-level traceability for the Rosin Inventory join query.

  ### rosin_cure_sessions
  - Adds `start_date` (date) — calendar-level start date for cure duration display
  - Adds `target_end_date` (date) — target completion date used to compute
    "days remaining" in the Cure Status column of the Rosin Inventory table

  ## New Tables

  ### rosin_packages
  Individual packaged units of finished rosin — the final output of the
  fresh-frozen → wash → press → cure pipeline.
  - `id` (uuid, PK)
  - `press_run_id` (uuid, FK → press_runs.id)
  - `strain_id` (uuid, FK → strains.id)
  - `package_id` (text, UNIQUE) — format: R-YYMMDD-STRAIN-SEQ
  - `weight_grams` (numeric, NOT NULL, > 0)
  - `destination` (text) — CHECK: badder/jam/sauce/fresh_press
  - `cure_session_id` (uuid, nullable FK → rosin_cure_sessions.id)
  - `inventory_item_id` (uuid, nullable) — set when pushed to main inventory
  - `status` (text) — CHECK: fresh/curing/cured/packaged/sold
  - `notes` (text, nullable)
  - `created_at`, `updated_at`

  ## Security
  - RLS enabled on rosin_packages
  - Authenticated users can SELECT, INSERT, UPDATE

  ## Notes
  - Column additions use IF NOT EXISTS guards (DO $$ blocks)
  - Table creation uses IF NOT EXISTS
  - Indexes added for FK columns, destination, status, and created_at
  - updated_at trigger added to rosin_packages
*/

-- ============================================================
-- 1. Add batch_id to press_runs
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'press_runs' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE press_runs ADD COLUMN batch_id uuid REFERENCES batch_registry(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_press_runs_batch_id ON press_runs(batch_id);

-- ============================================================
-- 2. Add start_date and target_end_date to rosin_cure_sessions
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rosin_cure_sessions' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE rosin_cure_sessions ADD COLUMN start_date date DEFAULT CURRENT_DATE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rosin_cure_sessions' AND column_name = 'target_end_date'
  ) THEN
    ALTER TABLE rosin_cure_sessions ADD COLUMN target_end_date date;
  END IF;
END $$;

-- ============================================================
-- 3. Create rosin_packages
-- ============================================================
CREATE TABLE IF NOT EXISTS rosin_packages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  press_run_id        uuid NOT NULL REFERENCES press_runs(id) ON DELETE RESTRICT,
  strain_id           uuid NOT NULL REFERENCES strains(id) ON DELETE RESTRICT,
  package_id          text NOT NULL UNIQUE,
  weight_grams        numeric NOT NULL CHECK (weight_grams > 0),
  destination         text NOT NULL
                        CHECK (destination IN ('badder', 'jam', 'sauce', 'fresh_press')),
  cure_session_id     uuid REFERENCES rosin_cure_sessions(id) ON DELETE SET NULL,
  inventory_item_id   uuid,
  status              text NOT NULL DEFAULT 'fresh'
                        CHECK (status IN ('fresh', 'curing', 'cured', 'packaged', 'sold')),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rosin_packages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'rosin_packages' AND policyname = 'Authenticated users can view rosin packages'
  ) THEN
    CREATE POLICY "Authenticated users can view rosin packages"
      ON rosin_packages FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'rosin_packages' AND policyname = 'Authenticated users can insert rosin packages'
  ) THEN
    CREATE POLICY "Authenticated users can insert rosin packages"
      ON rosin_packages FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'rosin_packages' AND policyname = 'Authenticated users can update rosin packages'
  ) THEN
    CREATE POLICY "Authenticated users can update rosin packages"
      ON rosin_packages FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rosin_packages_press_run_id ON rosin_packages(press_run_id);
CREATE INDEX IF NOT EXISTS idx_rosin_packages_strain_id ON rosin_packages(strain_id);
CREATE INDEX IF NOT EXISTS idx_rosin_packages_cure_session_id ON rosin_packages(cure_session_id);
CREATE INDEX IF NOT EXISTS idx_rosin_packages_destination ON rosin_packages(destination);
CREATE INDEX IF NOT EXISTS idx_rosin_packages_status ON rosin_packages(status);
CREATE INDEX IF NOT EXISTS idx_rosin_packages_created_at ON rosin_packages(created_at DESC);

CREATE OR REPLACE FUNCTION update_rosin_packages_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rosin_packages_updated_at ON rosin_packages;
CREATE TRIGGER trg_rosin_packages_updated_at
  BEFORE UPDATE ON rosin_packages
  FOR EACH ROW EXECUTE FUNCTION update_rosin_packages_updated_at();
