/*
  # Create Fresh Frozen Packages Table

  ## Summary
  Creates the `fresh_frozen_packages` table for the Rosin Lab module to track
  fresh frozen cannabis material available for ice water hash washing.

  ## New Tables
  - `fresh_frozen_packages`
    - `id` (uuid, PK) — auto-generated
    - `batch_id` (uuid, FK → batch_registry) — source batch
    - `strain_id` (uuid, FK → strains, nullable) — direct strain reference
    - `package_number` (integer, default 1) — package number within a batch
    - `weight_grams` (numeric, NOT NULL) — package weight in grams
    - `vacuum_sealed_at` (timestamptz, nullable) — when the package was vacuum sealed
    - `frozen_at` (timestamptz, nullable) — when the package entered the freezer
    - `freezer_location` (text, nullable) — physical location e.g. "Freezer A - Shelf 2"
    - `status` (text, default 'stored') — lifecycle status: stored, allocated, washed, sold
    - `sold_price_per_gram` (numeric, nullable) — price per gram if sold directly
    - `notes` (text, nullable) — free-form notes
    - `created_by` (uuid, nullable) — user who created the record
    - `created_at` (timestamptz, default now())
    - `updated_at` (timestamptz, default now())

  ## Security
  - RLS enabled — table is locked down by default
  - Authenticated users can SELECT, INSERT, and UPDATE records

  ## Notes
  1. Status constrained to: 'stored', 'allocated', 'washed', 'sold'
  2. updated_at trigger uses existing trigger_set_updated_at() function
  3. Indexes on batch_id, strain_id, status, and frozen_at for query performance
*/

CREATE TABLE IF NOT EXISTS fresh_frozen_packages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id            uuid NOT NULL REFERENCES batch_registry(id) ON DELETE CASCADE,
  strain_id           uuid REFERENCES strains(id) ON DELETE SET NULL,
  package_number      integer NOT NULL DEFAULT 1,
  weight_grams        numeric NOT NULL CHECK (weight_grams > 0),
  vacuum_sealed_at    timestamptz,
  frozen_at           timestamptz,
  freezer_location    text,
  status              text NOT NULL DEFAULT 'stored'
                        CHECK (status IN ('stored', 'allocated', 'washed', 'sold')),
  sold_price_per_gram numeric,
  notes               text,
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fresh_frozen_packages_batch_id
  ON fresh_frozen_packages(batch_id);

CREATE INDEX IF NOT EXISTS idx_fresh_frozen_packages_strain_id
  ON fresh_frozen_packages(strain_id);

CREATE INDEX IF NOT EXISTS idx_fresh_frozen_packages_status
  ON fresh_frozen_packages(status);

CREATE INDEX IF NOT EXISTS idx_fresh_frozen_packages_frozen_at
  ON fresh_frozen_packages(frozen_at DESC NULLS LAST);

ALTER TABLE fresh_frozen_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view fresh frozen packages"
  ON fresh_frozen_packages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert fresh frozen packages"
  ON fresh_frozen_packages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update fresh frozen packages"
  ON fresh_frozen_packages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_fresh_frozen_packages'
  ) THEN
    CREATE TRIGGER set_updated_at_fresh_frozen_packages
      BEFORE UPDATE ON fresh_frozen_packages
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;
