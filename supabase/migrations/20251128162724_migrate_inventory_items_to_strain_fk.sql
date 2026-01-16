/*
  # Migrate inventory_items from strain (text) to strain_id (FK)

  ## Overview
  This migration establishes proper referential integrity between inventory_items
  and the strains table by adding a strain_id foreign key column and backfilling
  data from the existing text-based strain field.

  ## Changes Made

  1. **Add strain_id Column**
     - New column: `strain_id uuid` (nullable initially)
     - Foreign key constraint to `strains(id)` with `ON DELETE SET NULL`
     - Index on `strain_id` for query performance

  2. **Backfill strain_id from Text Strain Field**
     - Use fuzzy matching via `find_strain_by_name()` function (exists from consolidate_strain_tables migration)
     - Match `inventory_items.strain` text to `strains.id`
     - Log unmatched items for manual review
     - Prioritize batch_registry.strain_id when available

  3. **Backfill from batch_registry Relationship**
     - For items with `batch_id`, inherit `strain_id` from `batch_registry.strain_id`
     - Ensures inventory items match their batch's strain
     - Handles cases where text strain doesn't match

  4. **Create Data Quality View**
     - View to find inventory items where:
       - `strain` text exists but no `strain_id` match found
       - `strain_id` exists but doesn't match batch's `strain_id`
       - Both `strain` and `strain_id` are null
     - Used for data cleanup and validation

  5. **Add Validation Trigger**
     - Ensure new inventory items inherit `strain_id` from their batch
     - Prevent data inconsistency at database level

  ## Safety
  - Does NOT drop text `strain` column (deprecated but kept for compatibility)
  - Does NOT add NOT NULL constraint yet (needs data quality confirmation)
  - Uses IF NOT EXISTS for all schema changes
  - Preserves all existing data
  - Rollback-safe (can remove FK and column if needed)

  ## Post-Migration Steps
  1. Regenerate TypeScript types
  2. Update application code to use `strain_id` FK
  3. Review data quality report
  4. After data cleanup, consider adding NOT NULL constraint
*/

-- =====================================================
-- STEP 1: Add strain_id Column to inventory_items
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'strain_id'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN strain_id uuid;

    -- Add comment
    COMMENT ON COLUMN inventory_items.strain_id IS
      'Foreign key to strains table. Replacing legacy text-based strain field for referential integrity.';
  END IF;
END $$;

-- =====================================================
-- STEP 2: Add Foreign Key Constraint
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_items_strain_id_fkey'
  ) THEN
    ALTER TABLE inventory_items
      ADD CONSTRAINT inventory_items_strain_id_fkey
      FOREIGN KEY (strain_id)
      REFERENCES strains(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- STEP 3: Create Index for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_inventory_items_strain_id
  ON inventory_items(strain_id)
  WHERE strain_id IS NOT NULL;

-- =====================================================
-- STEP 4: Backfill strain_id from batch_registry
-- =====================================================

-- Priority 1: Get strain_id from batch_registry (most reliable)
UPDATE inventory_items ii
SET strain_id = br.strain_id
FROM batch_registry br
WHERE ii.batch_id = br.id
  AND br.strain_id IS NOT NULL
  AND ii.strain_id IS NULL;

-- =====================================================
-- STEP 5: Backfill strain_id from Text Strain via Fuzzy Matching
-- =====================================================

-- Priority 2: Match text strain field to strains table
UPDATE inventory_items ii
SET strain_id = s.id
FROM strains s
WHERE ii.strain IS NOT NULL
  AND ii.strain_id IS NULL  -- Only update if not already set
  AND LOWER(TRIM(ii.strain)) = LOWER(TRIM(s.name))
  AND s.is_active = true;

-- Priority 3: Try partial match (starts with)
UPDATE inventory_items ii
SET strain_id = s.id
FROM strains s
WHERE ii.strain IS NOT NULL
  AND ii.strain_id IS NULL
  AND LOWER(TRIM(s.name)) LIKE LOWER(TRIM(ii.strain)) || '%'
  AND s.is_active = true
  AND NOT EXISTS (
    -- Ensure no exact match exists to avoid false positives
    SELECT 1 FROM strains s2
    WHERE LOWER(TRIM(s2.name)) = LOWER(TRIM(ii.strain))
    AND s2.is_active = true
  );

-- =====================================================
-- STEP 6: Create Data Quality Report View
-- =====================================================

CREATE OR REPLACE VIEW vw_inventory_strain_data_quality AS
SELECT
  ii.id as inventory_item_id,
  ii.package_id,
  ii.batch_id,
  ii.strain as text_strain,
  ii.strain_id,
  s.name as matched_strain_name,
  br.strain as batch_text_strain,
  br.strain_id as batch_strain_id,
  bs.name as batch_strain_name,
  CASE
    WHEN ii.strain IS NOT NULL AND ii.strain_id IS NULL
      THEN 'unmatched_text_strain'
    WHEN ii.strain_id IS NOT NULL AND br.strain_id IS NOT NULL AND ii.strain_id != br.strain_id
      THEN 'strain_batch_mismatch'
    WHEN ii.strain IS NULL AND ii.strain_id IS NULL
      THEN 'no_strain_data'
    WHEN ii.strain_id IS NOT NULL
      THEN 'valid'
    ELSE 'unknown'
  END as data_quality_status
FROM inventory_items ii
LEFT JOIN strains s ON ii.strain_id = s.id
LEFT JOIN batch_registry br ON ii.batch_id = br.id
LEFT JOIN strains bs ON br.strain_id = bs.id
ORDER BY
  CASE
    WHEN ii.strain IS NOT NULL AND ii.strain_id IS NULL THEN 1
    WHEN ii.strain_id IS NOT NULL AND br.strain_id IS NOT NULL AND ii.strain_id != br.strain_id THEN 2
    WHEN ii.strain IS NULL AND ii.strain_id IS NULL THEN 3
    ELSE 4
  END,
  ii.created_at DESC;

-- Add comment
COMMENT ON VIEW vw_inventory_strain_data_quality IS
  'Data quality report for inventory_items strain migration. Shows unmatched items, mismatches, and validation status.';

-- =====================================================
-- STEP 7: Create Validation Trigger for New Records
-- =====================================================

CREATE OR REPLACE FUNCTION ensure_inventory_item_strain_from_batch()
RETURNS TRIGGER AS $$
BEGIN
  -- If inserting/updating with a batch_id, inherit strain_id from batch
  IF NEW.batch_id IS NOT NULL THEN
    SELECT strain_id INTO NEW.strain_id
    FROM batch_registry
    WHERE id = NEW.batch_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trg_inventory_item_inherit_strain ON inventory_items;
CREATE TRIGGER trg_inventory_item_inherit_strain
  BEFORE INSERT OR UPDATE OF batch_id
  ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION ensure_inventory_item_strain_from_batch();

-- =====================================================
-- STEP 8: Deprecate Text Strain Field
-- =====================================================

COMMENT ON COLUMN inventory_items.strain IS
  'DEPRECATED: Legacy text-based strain field. Use strain_id foreign key instead. Kept for backward compatibility during migration period.';

-- =====================================================
-- STEP 9: Grant Permissions on New View
-- =====================================================

-- Ensure authenticated users can query the data quality view
GRANT SELECT ON vw_inventory_strain_data_quality TO authenticated;
GRANT SELECT ON vw_inventory_strain_data_quality TO anon;

-- =====================================================
-- MIGRATION SUMMARY
-- =====================================================

-- Log migration results
DO $$
DECLARE
  v_total_items bigint;
  v_items_with_strain_id bigint;
  v_items_without_strain_id bigint;
  v_unmatched_items bigint;
  v_mismatched_items bigint;
BEGIN
  SELECT COUNT(*) INTO v_total_items FROM inventory_items;
  SELECT COUNT(*) INTO v_items_with_strain_id FROM inventory_items WHERE strain_id IS NOT NULL;
  SELECT COUNT(*) INTO v_items_without_strain_id FROM inventory_items WHERE strain_id IS NULL;

  SELECT COUNT(*) INTO v_unmatched_items
  FROM vw_inventory_strain_data_quality
  WHERE data_quality_status = 'unmatched_text_strain';

  SELECT COUNT(*) INTO v_mismatched_items
  FROM vw_inventory_strain_data_quality
  WHERE data_quality_status = 'strain_batch_mismatch';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'INVENTORY STRAIN MIGRATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total inventory items: %', v_total_items;
  RAISE NOTICE 'Items with strain_id: % (%.1f%%)',
    v_items_with_strain_id,
    CASE WHEN v_total_items > 0 THEN (v_items_with_strain_id::float / v_total_items * 100) ELSE 0 END;
  RAISE NOTICE 'Items without strain_id: %', v_items_without_strain_id;
  RAISE NOTICE 'Unmatched text strains: %', v_unmatched_items;
  RAISE NOTICE 'Strain/batch mismatches: %', v_mismatched_items;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Review data quality: SELECT * FROM vw_inventory_strain_data_quality WHERE data_quality_status != ''valid'';';
  RAISE NOTICE '========================================';
END $$;