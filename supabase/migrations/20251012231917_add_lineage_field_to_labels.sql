/*
  # Add lineage field to labels table

  1. Changes
    - Add `lineage` text field to store strain genetics information
    - This field stores the genetic lineage of the strain (e.g., "(Face Off OG x Kush Mints) x (Biscotti x Sherb BX)")
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labels' AND column_name = 'lineage'
  ) THEN
    ALTER TABLE labels ADD COLUMN lineage text;
  END IF;
END $$;
