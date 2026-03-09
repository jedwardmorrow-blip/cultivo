/*
  # Create Hash Packages Table

  ## Overview
  Creates the `hash_packages` table to store dried hash inventory produced by the wash/freeze-dry process.
  Adds a `batch_id` column to `wash_runs` if it does not already exist.
  Creates a minimal stub for `freeze_dry_runs` if it does not already exist.

  ## New Tables

  ### `freeze_dry_runs` (stub, if not exists)
  - `id` (uuid, PK) — run identifier
  - `status` (text) — operational status
  - `created_at` (timestamptz) — record creation

  ### `hash_packages`
  - `id` (uuid, PK, auto-generated)
  - `wash_run_id` (uuid, FK → wash_runs.id) — which wash run produced this hash
  - `freeze_dry_run_id` (uuid, nullable FK → freeze_dry_runs.id) — which freeze-dry run dried it
  - `strain_id` (uuid, FK → strains.id) — the strain
  - `package_id` (text, unique) — human-readable ID, format: H-YYMMDD-STRAIN-SEQ
  - `weight_grams` (numeric) — total weight when created
  - `remaining_weight_grams` (numeric) — decreases as portions are consumed by press runs
  - `dried_date` (date, nullable) — when freeze drying completed
  - `status` (text) — CHECK: available, partial, depleted, reserved
  - `notes` (text, nullable)
  - `created_at` / `updated_at` (timestamptz)

  ## Security
  - RLS enabled on hash_packages with authenticated read/write policies
  - RLS policies added to freeze_dry_runs stub

  ## Indexes
  - wash_run_id, strain_id, status, dried_date
*/

-- ---------------------------------------------------------------
-- 1. Ensure wash_runs has input_grams / output_grams columns
--    (stub may have been created without them)
-- ---------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wash_runs' AND column_name = 'input_grams'
  ) THEN
    ALTER TABLE wash_runs ADD COLUMN input_grams numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wash_runs' AND column_name = 'output_grams'
  ) THEN
    ALTER TABLE wash_runs ADD COLUMN output_grams numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wash_runs' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE wash_runs ADD COLUMN started_at timestamptz;
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 2. Stub: freeze_dry_runs
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS freeze_dry_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status       text NOT NULL DEFAULT 'in_progress',
  input_grams  numeric,
  output_grams numeric,
  started_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE freeze_dry_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'freeze_dry_runs' AND policyname = 'Authenticated users can read freeze_dry_runs'
  ) THEN
    CREATE POLICY "Authenticated users can read freeze_dry_runs"
      ON freeze_dry_runs FOR SELECT
      TO authenticated
      USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'freeze_dry_runs' AND policyname = 'Authenticated users can insert freeze_dry_runs'
  ) THEN
    CREATE POLICY "Authenticated users can insert freeze_dry_runs"
      ON freeze_dry_runs FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'freeze_dry_runs' AND policyname = 'Authenticated users can update freeze_dry_runs'
  ) THEN
    CREATE POLICY "Authenticated users can update freeze_dry_runs"
      ON freeze_dry_runs FOR UPDATE
      TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 3. hash_packages
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hash_packages (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wash_run_id             uuid NOT NULL REFERENCES wash_runs(id) ON DELETE RESTRICT,
  freeze_dry_run_id       uuid REFERENCES freeze_dry_runs(id) ON DELETE SET NULL,
  strain_id               uuid NOT NULL REFERENCES strains(id) ON DELETE RESTRICT,
  package_id              text NOT NULL UNIQUE,
  weight_grams            numeric NOT NULL CHECK (weight_grams > 0),
  remaining_weight_grams  numeric NOT NULL CHECK (remaining_weight_grams >= 0),
  dried_date              date,
  status                  text NOT NULL DEFAULT 'available'
                            CHECK (status IN ('available', 'partial', 'depleted', 'reserved')),
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT remaining_lte_total CHECK (remaining_weight_grams <= weight_grams)
);

ALTER TABLE hash_packages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hash_packages' AND policyname = 'Authenticated users can read hash_packages'
  ) THEN
    CREATE POLICY "Authenticated users can read hash_packages"
      ON hash_packages FOR SELECT
      TO authenticated
      USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hash_packages' AND policyname = 'Authenticated users can insert hash_packages'
  ) THEN
    CREATE POLICY "Authenticated users can insert hash_packages"
      ON hash_packages FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hash_packages' AND policyname = 'Authenticated users can update hash_packages'
  ) THEN
    CREATE POLICY "Authenticated users can update hash_packages"
      ON hash_packages FOR UPDATE
      TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hash_packages' AND policyname = 'Authenticated users can delete hash_packages'
  ) THEN
    CREATE POLICY "Authenticated users can delete hash_packages"
      ON hash_packages FOR DELETE
      TO authenticated
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- updated_at trigger
DROP TRIGGER IF EXISTS set_hash_packages_updated_at ON hash_packages;
CREATE TRIGGER set_hash_packages_updated_at
  BEFORE UPDATE ON hash_packages
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hash_packages_wash_run_id
  ON hash_packages (wash_run_id);

CREATE INDEX IF NOT EXISTS idx_hash_packages_strain_id
  ON hash_packages (strain_id);

CREATE INDEX IF NOT EXISTS idx_hash_packages_status
  ON hash_packages (status);

CREATE INDEX IF NOT EXISTS idx_hash_packages_dried_date
  ON hash_packages (dried_date DESC NULLS LAST);
