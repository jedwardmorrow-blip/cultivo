/*
  # Add waste_grams to harvest_sessions

  ## Summary
  Adds an optional waste_grams column to the harvest_sessions table to allow
  operators to record biomass waste during harvesting. Waste tracking supports
  compliance reporting and process efficiency analysis.

  ## Changes
  ### Modified Tables
  - `harvest_sessions`
    - `waste_grams` (numeric, nullable) — weight of plant material discarded during harvest

  ## Notes
  - Column is nullable; existing rows default to NULL (no waste recorded)
  - Application enforces waste_grams >= 0 when provided
  - Waste is displayed as grams and as a percentage of wet_weight_grams in the UI
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'harvest_sessions' AND column_name = 'waste_grams'
  ) THEN
    ALTER TABLE harvest_sessions ADD COLUMN waste_grams numeric DEFAULT NULL;
  END IF;
END $$;
