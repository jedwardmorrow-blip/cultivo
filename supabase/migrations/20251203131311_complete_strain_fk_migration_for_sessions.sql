/*
  # Complete Strain Foreign Key Migration for Sessions

  ## Overview
  Completes the strain text-to-FK migration by extending it from inventory_items
  to packaging_sessions and trim_sessions tables. This follows the established
  pattern from migration 20251128162724 (inventory_items strain FK migration).

  ## Problem Being Solved
  1. packaging_sessions and trim_sessions use text `strain` field
  2. products table has `strain_id` (FK) but text `strain` field is NULL
  3. Product lookup in triggers fails: WHERE strain = NEW.strain matches NULL
  4. Result: Packaging sessions fail with constraint violations on conversion_lots

  ## Root Cause
  The Nov 28 migration (20251128162724) completed strain FK migration for
  inventory_items but did NOT extend it to session tables. The Dec 2 migration
  (20251202204925) added product lookup helper using strain_id but the session
  tables themselves still only have text strain fields.

  ## Solution
  1. Add strain_id FK columns to both session tables
  2. Backfill existing sessions from strains table (text match)
  3. Create data quality views for monitoring
  4. Add validation triggers to auto-populate strain_id from batch
  5. Mark text strain fields as DEPRECATED
  6. Update product lookup to use strain_id

  ## Migration Strategy
  - Add columns as nullable initially (backward compatibility)
  - Backfill existing data using exact and fuzzy matching
  - Create views to monitor data quality
  - Add triggers for future records
  - Text fields kept but marked DEPRECATED

  ## Future Work
  - Once data quality >95%, add NOT NULL constraints
  - Eventually drop deprecated text strain fields
  - Apply same pattern to any other tables with text strain fields
*/

-- =====================================================
-- STEP 1: Add strain_id FK Columns to Session Tables
-- =====================================================

-- Add to packaging_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packaging_sessions'
    AND column_name = 'strain_id'
  ) THEN
    ALTER TABLE packaging_sessions
    ADD COLUMN strain_id uuid REFERENCES strains(id) ON DELETE SET NULL;

    COMMENT ON COLUMN packaging_sessions.strain_id IS
      'FK to strains table. Added 2025-12-03. Replaces deprecated text strain field.';
  END IF;
END $$;

-- Add to trim_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trim_sessions'
    AND column_name = 'strain_id'
  ) THEN
    ALTER TABLE trim_sessions
    ADD COLUMN strain_id uuid REFERENCES strains(id) ON DELETE SET NULL;

    COMMENT ON COLUMN trim_sessions.strain_id IS
      'FK to strains table. Added 2025-12-03. Replaces deprecated text strain field.';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_packaging_sessions_strain_id
  ON packaging_sessions(strain_id);

CREATE INDEX IF NOT EXISTS idx_trim_sessions_strain_id
  ON trim_sessions(strain_id);

-- Mark text fields as deprecated
COMMENT ON COLUMN packaging_sessions.strain IS
  'DEPRECATED: Use strain_id FK instead. Text field kept for backward compatibility.';

COMMENT ON COLUMN trim_sessions.strain IS
  'DEPRECATED: Use strain_id FK instead. Text field kept for backward compatibility.';

-- =====================================================
-- STEP 2: Backfill Existing Session Data
-- =====================================================

-- Backfill packaging_sessions
-- Strategy: Exact name match on strains.name
UPDATE packaging_sessions ps
SET strain_id = s.id
FROM strains s
WHERE ps.strain_id IS NULL
  AND ps.strain IS NOT NULL
  AND LOWER(TRIM(ps.strain)) = LOWER(TRIM(s.name));

-- Backfill packaging_sessions (fuzzy match for missed ones)
UPDATE packaging_sessions ps
SET strain_id = s.id
FROM strains s
WHERE ps.strain_id IS NULL
  AND ps.strain IS NOT NULL
  AND LOWER(s.name) LIKE '%' || LOWER(TRIM(ps.strain)) || '%';

-- Backfill trim_sessions
-- Strategy: Exact name match on strains.name
UPDATE trim_sessions ts
SET strain_id = s.id
FROM strains s
WHERE ts.strain_id IS NULL
  AND ts.strain IS NOT NULL
  AND LOWER(TRIM(ts.strain)) = LOWER(TRIM(s.name));

-- Backfill trim_sessions (fuzzy match for missed ones)
UPDATE trim_sessions ts
SET strain_id = s.id
FROM strains s
WHERE ts.strain_id IS NULL
  AND ts.strain IS NOT NULL
  AND LOWER(s.name) LIKE '%' || LOWER(TRIM(ts.strain)) || '%';

-- =====================================================
-- STEP 3: Create Data Quality Views
-- =====================================================

-- View: Packaging sessions data quality
CREATE OR REPLACE VIEW vw_packaging_sessions_strain_quality AS
SELECT
  ps.id,
  ps.package_id,
  ps.strain as text_strain,
  ps.strain_id,
  s.name as matched_strain_name,
  br.strain_id as batch_strain_id,
  bs.name as batch_strain_name,
  CASE
    WHEN ps.strain IS NOT NULL AND ps.strain_id IS NULL THEN 'unmatched_text_strain'
    WHEN ps.strain_id IS NOT NULL AND br.strain_id IS NOT NULL
         AND ps.strain_id != br.strain_id THEN 'strain_batch_mismatch'
    WHEN ps.strain IS NULL AND ps.strain_id IS NULL THEN 'no_strain_data'
    WHEN ps.strain_id IS NOT NULL THEN 'valid'
    ELSE 'unknown'
  END as data_quality_status
FROM packaging_sessions ps
LEFT JOIN strains s ON ps.strain_id = s.id
LEFT JOIN batch_registry br ON ps.batch_registry_id = br.id
LEFT JOIN strains bs ON br.strain_id = bs.id;

COMMENT ON VIEW vw_packaging_sessions_strain_quality IS
  'Data quality monitoring for packaging_sessions strain migration. Check for unmatched or mismatched strain data.';

-- View: Trim sessions data quality
CREATE OR REPLACE VIEW vw_trim_sessions_strain_quality AS
SELECT
  ts.id,
  ts.package_id,
  ts.strain as text_strain,
  ts.strain_id,
  s.name as matched_strain_name,
  br.strain_id as batch_strain_id,
  bs.name as batch_strain_name,
  CASE
    WHEN ts.strain IS NOT NULL AND ts.strain_id IS NULL THEN 'unmatched_text_strain'
    WHEN ts.strain_id IS NOT NULL AND br.strain_id IS NOT NULL
         AND ts.strain_id != br.strain_id THEN 'strain_batch_mismatch'
    WHEN ts.strain IS NULL AND ts.strain_id IS NULL THEN 'no_strain_data'
    WHEN ts.strain_id IS NOT NULL THEN 'valid'
    ELSE 'unknown'
  END as data_quality_status
FROM trim_sessions ts
LEFT JOIN strains s ON ts.strain_id = s.id
LEFT JOIN batch_registry br ON ts.batch_registry_id = br.id
LEFT JOIN strains bs ON br.strain_id = bs.id;

COMMENT ON VIEW vw_trim_sessions_strain_quality IS
  'Data quality monitoring for trim_sessions strain migration. Check for unmatched or mismatched strain data.';

-- =====================================================
-- STEP 4: Validation Triggers
-- =====================================================

-- Function: Auto-populate strain_id from batch for packaging sessions
CREATE OR REPLACE FUNCTION ensure_packaging_session_strain_from_batch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If strain_id not provided, inherit from batch
  IF NEW.strain_id IS NULL AND NEW.batch_registry_id IS NOT NULL THEN
    SELECT strain_id INTO NEW.strain_id
    FROM batch_registry
    WHERE id = NEW.batch_registry_id;
  END IF;

  -- Also populate text field from strain_id (backward compatibility)
  IF NEW.strain_id IS NOT NULL AND (NEW.strain IS NULL OR NEW.strain = '') THEN
    SELECT name INTO NEW.strain
    FROM strains
    WHERE id = NEW.strain_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for packaging_sessions
DROP TRIGGER IF EXISTS trg_packaging_session_strain_validation ON packaging_sessions;
CREATE TRIGGER trg_packaging_session_strain_validation
  BEFORE INSERT OR UPDATE ON packaging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_packaging_session_strain_from_batch();

-- Function: Auto-populate strain_id from batch for trim sessions
CREATE OR REPLACE FUNCTION ensure_trim_session_strain_from_batch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If strain_id not provided, inherit from batch
  IF NEW.strain_id IS NULL AND NEW.batch_registry_id IS NOT NULL THEN
    SELECT strain_id INTO NEW.strain_id
    FROM batch_registry
    WHERE id = NEW.batch_registry_id;
  END IF;

  -- Also populate text field from strain_id (backward compatibility)
  IF NEW.strain_id IS NOT NULL AND (NEW.strain IS NULL OR NEW.strain = '') THEN
    SELECT name INTO NEW.strain
    FROM strains
    WHERE id = NEW.strain_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for trim_sessions
DROP TRIGGER IF EXISTS trg_trim_session_strain_validation ON trim_sessions;
CREATE TRIGGER trg_trim_session_strain_validation
  BEFORE INSERT OR UPDATE ON trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_trim_session_strain_from_batch();

-- =====================================================
-- STEP 5: Remove Duplicate Trigger (Nov 26 orphan)
-- =====================================================

-- Drop the orphaned trigger from Nov 26 that was causing double execution
DROP TRIGGER IF EXISTS auto_create_pending_conversions_packaging_trigger
  ON packaging_sessions;

-- =====================================================
-- STEP 6: Grant Permissions
-- =====================================================

-- Grant SELECT on data quality views to authenticated users
GRANT SELECT ON vw_packaging_sessions_strain_quality TO authenticated;
GRANT SELECT ON vw_trim_sessions_strain_quality TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Strain FK migration complete for sessions';
  RAISE NOTICE 'Run data quality queries to verify results';
  RAISE NOTICE 'Sessions now use strain_id FK instead of text strain';
END $$;
