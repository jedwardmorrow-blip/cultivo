/*
  # Create bin_entries table and enable inventory creation on binning completion

  ## Summary
  Transforms binning sessions from a single dry-weight-capture into a multi-entry
  weighing workflow (mirroring harvest_weight_entries). When a binning session is
  completed, inventory items are now created automatically.

  ## Changes

  ### 1. New Table: bin_entries
  - Child entries for binning_sessions (mirrors harvest_weight_entries pattern)
  - Each entry records a weight measurement (bin_weight_grams) with optional notes
  - entry_order tracks sequence
  - Summed at finalization to set parent session dry_weight_grams

  ### 2. Altered: binning_sessions
  - Relaxed dry_weight_grams CHECK from > 0 to >= 0 (starts at 0, set on completion)
  - Added water_loss_grams column to track shrinkage during drying

  ### 3. Security
  - RLS enabled on bin_entries
  - Authenticated-only SELECT, INSERT, DELETE policies
  - No UPDATE policy (entries are immutable; delete and re-add)

  ## Important Notes
  1. bin_entries mirrors the harvest_weight_entries pattern exactly
  2. Inventory creation happens in the application layer (conversions.service pattern)
  3. No changes to existing inventory tables or triggers
*/

-- ============================================================
-- ALTER binning_sessions: relax dry_weight_grams CHECK, add water_loss_grams
-- ============================================================

ALTER TABLE binning_sessions
  DROP CONSTRAINT IF EXISTS binning_sessions_dry_weight_grams_check;

ALTER TABLE binning_sessions
  ADD CONSTRAINT binning_sessions_dry_weight_grams_check
  CHECK (dry_weight_grams >= 0);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'binning_sessions' AND column_name = 'water_loss_grams'
  ) THEN
    ALTER TABLE binning_sessions ADD COLUMN water_loss_grams numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- ============================================================
-- TABLE: bin_entries
-- ============================================================

CREATE TABLE IF NOT EXISTS bin_entries (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  binning_session_id  uuid        NOT NULL REFERENCES binning_sessions(id),
  bin_weight_grams    numeric(10,2) NOT NULL CHECK (bin_weight_grams > 0),
  entry_order         integer     NOT NULL DEFAULT 1,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid        REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_bin_entries_session_id
  ON bin_entries(binning_session_id);

ALTER TABLE bin_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view bin entries"
  ON bin_entries FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert bin entries"
  ON bin_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete bin entries"
  ON bin_entries FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
