/*
  # Create press_run_inputs Table

  ## Summary
  Creates the junction table that records which hash packages were used as inputs
  for a press run, along with how many grams were taken from each package.

  ## New Tables
  - `press_run_inputs`
    - `id` (uuid, PK)
    - `press_run_id` (uuid, FK → press_runs)
    - `hash_package_id` (uuid, FK → hash_packages)
    - `weight_grams` (numeric, NOT NULL) — grams consumed from this hash package
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled; authenticated users can read and insert their own records
*/

CREATE TABLE IF NOT EXISTS press_run_inputs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  press_run_id     uuid NOT NULL REFERENCES press_runs(id) ON DELETE CASCADE,
  hash_package_id  uuid NOT NULL REFERENCES hash_packages(id),
  weight_grams     numeric NOT NULL CHECK (weight_grams > 0),
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE press_run_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read press run inputs"
  ON press_run_inputs
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert press run inputs"
  ON press_run_inputs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS press_run_inputs_press_run_id_idx
  ON press_run_inputs (press_run_id);

CREATE INDEX IF NOT EXISTS press_run_inputs_hash_package_id_idx
  ON press_run_inputs (hash_package_id);
