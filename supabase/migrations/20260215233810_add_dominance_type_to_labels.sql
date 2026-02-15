/*
  # Add dominance_type column to labels table

  1. Modified Tables
    - `labels`
      - Added `dominance_type` (text, nullable) - stores strain dominance (e.g., "Indica-Hybrid", "Sativa")

  2. Backfill
    - Populates dominance_type for existing labels by joining through strain_id to strains table
    - Falls back to joining on strain name if strain_id is null

  3. Notes
    - This field is needed for compliance labels to display the strain classification
    - The labelAutoFill service already collects this data but was not persisting it
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labels' AND column_name = 'dominance_type'
  ) THEN
    ALTER TABLE labels ADD COLUMN dominance_type text;
  END IF;
END $$;

UPDATE labels
SET dominance_type = s.dominance_type
FROM strains s
WHERE labels.strain_id = s.id
  AND labels.dominance_type IS NULL
  AND labels.strain_id IS NOT NULL;

UPDATE labels
SET dominance_type = s.dominance_type
FROM strains s
WHERE labels.strain = s.name
  AND labels.dominance_type IS NULL
  AND labels.strain_id IS NULL;
