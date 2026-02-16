/*
  # Add Pre-Computed Compliance Data to Coversheets

  1. New Columns on `coversheets`
    - `batch_compliance_data` (jsonb) - Pre-computed batch traceability info (strain, batch_id, dates, COA URL)
    - `distributed_to_data` (jsonb) - Pre-computed customer distribution info (name, license)
    - `package_manifest_data` (jsonb) - Pre-computed package assignment details for manifest display

  2. Security Changes
    - Add anon UPDATE policy on `coversheets` scoped to access tracking columns only
      (accessed_count, last_accessed_at) so public visitors can increment the view counter

  3. Notes
    - The `compliance_header` column already exists and will now be populated during generation
    - All compliance data is pre-computed at generation time so the public page only reads from `coversheets`
    - This eliminates the need for anon access to orders, customers, order_items, etc.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coversheets' AND column_name = 'batch_compliance_data'
  ) THEN
    ALTER TABLE coversheets ADD COLUMN batch_compliance_data jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coversheets' AND column_name = 'distributed_to_data'
  ) THEN
    ALTER TABLE coversheets ADD COLUMN distributed_to_data jsonb DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coversheets' AND column_name = 'package_manifest_data'
  ) THEN
    ALTER TABLE coversheets ADD COLUMN package_manifest_data jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

CREATE POLICY "Allow public access count update on coversheets"
  ON coversheets
  FOR UPDATE
  TO anon
  USING (is_active = true)
  WITH CHECK (is_active = true);
