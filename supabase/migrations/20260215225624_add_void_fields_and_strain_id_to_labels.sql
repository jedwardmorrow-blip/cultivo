/*
  # Add void tracking fields and strain FK to labels

  1. New Columns on `labels`
    - `voided_by` (uuid) - FK to auth.users, tracks who voided the label
    - `void_reason` (text) - reason for voiding
    - `strain_id` (uuid) - FK to strains table, replacing text strain field

  2. Backfill
    - Populates strain_id for existing labels by exact-matching text `strain` to `strains.name`

  3. Security
    - No RLS changes (labels table already has RLS policies)

  4. Notes
    - The text `strain` column is retained for display/legacy compatibility
    - voided_by and void_reason were defined in application code but missing from the actual schema
    - All 7 unique strain values in existing labels have exact matches in strains table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labels' AND column_name = 'voided_by'
  ) THEN
    ALTER TABLE labels ADD COLUMN voided_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labels' AND column_name = 'void_reason'
  ) THEN
    ALTER TABLE labels ADD COLUMN void_reason text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labels' AND column_name = 'strain_id'
  ) THEN
    ALTER TABLE labels ADD COLUMN strain_id uuid REFERENCES strains(id);
  END IF;
END $$;

UPDATE labels l
SET strain_id = s.id
FROM strains s
WHERE l.strain_id IS NULL
  AND lower(l.strain) = lower(s.name);

CREATE INDEX IF NOT EXISTS idx_labels_strain_id ON labels(strain_id);
CREATE INDEX IF NOT EXISTS idx_labels_voided_by ON labels(voided_by);
