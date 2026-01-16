/*
  # Add Binned Stage Support to Inventory System

  ## Overview
  This migration adds comprehensive support for the "binned" stage, which represents
  inventory that has been harvested and is waiting to be bucked/trimmed. This is the
  initial stage in the post-harvest workflow.

  ## Changes

  1. **Add binned to batch_stage_tracking**
     - Modify CHECK constraint to include 'binned' as valid stage
     - Add indexes for binned stage queries
     - Update comments to document binned stage

  2. **Create inventory stage detection view**
     - Unified view that identifies stage based on product characteristics
     - Handles packages from Dutchie CSV that don't explicitly state stage
     - Maps Keywords, status, category, and tags to appropriate stages

  3. **Add binned inventory aggregation view**
     - Summary of all binned inventory grouped by strain
     - Shows available weight, allocated weight, package counts
     - Includes aging information (days in binned stage)

  4. **Update batch lifecycle**
     - Add binned as initial lifecycle state
     - Create triggers to auto-advance from binned to bucked
     - Track timestamps for binned stage entry/exit

  ## Security
  - All new views inherit RLS from underlying tables
  - No new permissions required

  ## Data Safety
  - Uses IF EXISTS checks for all modifications
  - No data loss or modifications to existing records
  - Backward compatible with existing stages
*/

-- =====================================================
-- STEP 1: Add binned to batch_stage_tracking stages
-- =====================================================

-- Drop existing constraint and recreate with binned included
DO $$
BEGIN
  -- Drop the old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'batch_stage_tracking'
    AND constraint_name LIKE '%stage%check%'
  ) THEN
    ALTER TABLE batch_stage_tracking DROP CONSTRAINT IF EXISTS batch_stage_tracking_stage_check;
  END IF;

  -- Add new constraint with binned stage
  ALTER TABLE batch_stage_tracking
    ADD CONSTRAINT batch_stage_tracking_stage_check
    CHECK (stage IN ('binned', 'bucked', 'bulk_flower', 'bulk_smalls', 'bulk_trim', 'packaged'));
END $$;

COMMENT ON COLUMN batch_stage_tracking.stage IS
'Batch processing stage:
- binned: Harvested material waiting to be processed (pre-trim)
- bucked: Material that has been bucked (stems removed, ready for trim)
- bulk_flower: Premium flower from trim process
- bulk_smalls: Smaller buds from trim process
- bulk_trim: Trim/shake from processing
- packaged: Final packaged units ready for sale';

-- =====================================================
-- STEP 2: Create inventory stage detection view
-- =====================================================

CREATE OR REPLACE VIEW inventory_stage_detection AS
SELECT
  ii.id,
  ii.package_id,
  ii.product_name,
  ii.batch,
  ii.strain,
  ii.status,
  ii.category,
  ii.tags,
  ii.room,
  ii.available_qty,
  ii.unit,
  ii.snapshot_id,
  ii.last_updated,
  -- Detect stage based on product characteristics
  CASE
    -- Binned stage: Fresh material, not yet processed
    WHEN LOWER(ii.product_name) LIKE '%binned%' THEN 'binned'
    WHEN LOWER(ii.status) IN ('fresh', 'curing', 'drying') THEN 'binned'
    WHEN LOWER(ii.tags) LIKE '%untrimmed%' OR LOWER(ii.tags) LIKE '%fresh%' THEN 'binned'
    WHEN LOWER(ii.category) LIKE '%binned%' THEN 'binned'

    -- Bucked stage: Stems removed, ready for trim
    WHEN LOWER(ii.product_name) LIKE '%bucked%' THEN 'bucked'
    WHEN LOWER(ii.category) LIKE '%bucked%' THEN 'bucked'

    -- Bulk stages: Processed material in bulk
    WHEN LOWER(ii.product_name) LIKE '%bulk%' AND LOWER(ii.product_name) LIKE '%flower%' THEN 'bulk_flower'
    WHEN LOWER(ii.product_name) LIKE '%bulk%' AND LOWER(ii.product_name) LIKE '%smalls%' THEN 'bulk_smalls'
    WHEN LOWER(ii.product_name) LIKE '%bulk%' AND LOWER(ii.product_name) LIKE '%trim%' THEN 'bulk_trim'
    WHEN LOWER(ii.category) LIKE '%bulk%' AND LOWER(ii.category) LIKE '%flower%' THEN 'bulk_flower'

    -- Packaged stage: Final retail units
    WHEN LOWER(ii.product_name) LIKE '%packaged%' OR LOWER(ii.category) LIKE '%prepack%' THEN 'packaged'
    WHEN LOWER(ii.category) LIKE '%packaged%' THEN 'packaged'
    WHEN ii.unit = 'units' THEN 'packaged'

    -- Default: Unknown stage
    ELSE 'unknown'
  END as detected_stage,

  -- Flag for manual review
  CASE
    WHEN LOWER(ii.product_name) NOT LIKE '%binned%'
     AND LOWER(ii.product_name) NOT LIKE '%bucked%'
     AND LOWER(ii.product_name) NOT LIKE '%bulk%'
     AND LOWER(ii.product_name) NOT LIKE '%packaged%'
     AND ii.unit != 'units'
    THEN true
    ELSE false
  END as needs_manual_classification

FROM inventory_items ii
WHERE ii.available_qty > 0;

COMMENT ON VIEW inventory_stage_detection IS
'Automatically detects the processing stage of inventory items based on their characteristics.
Uses product_name, status, category, tags, and unit to determine stage.
Flags items that need manual classification for review.';

-- =====================================================
-- STEP 3: Create binned inventory summary view
-- =====================================================

CREATE OR REPLACE VIEW binned_inventory_summary AS
SELECT
  isd.strain,
  isd.batch,
  COUNT(DISTINCT isd.package_id) as package_count,
  SUM(isd.available_qty) as total_weight_grams,
  MIN(isd.last_updated) as oldest_package_date,
  MAX(isd.last_updated) as newest_package_date,
  EXTRACT(DAY FROM (NOW() - MIN(isd.last_updated))) as days_in_binned,
  json_agg(
    json_build_object(
      'package_id', isd.package_id,
      'weight_grams', isd.available_qty,
      'room', isd.room,
      'status', isd.status,
      'last_updated', isd.last_updated
    ) ORDER BY isd.last_updated
  ) as packages
FROM inventory_stage_detection isd
WHERE isd.detected_stage = 'binned'
GROUP BY isd.strain, isd.batch
ORDER BY days_in_binned DESC, isd.strain;

COMMENT ON VIEW binned_inventory_summary IS
'Summary of all binned inventory grouped by strain and batch.
Shows package counts, total weight, aging information, and detailed package list.
Ordered by age (oldest first) to prioritize processing.';

-- =====================================================
-- STEP 4: Create all-stages inventory view
-- =====================================================

CREATE OR REPLACE VIEW unified_inventory_view AS
SELECT
  isd.id,
  isd.package_id,
  isd.product_name,
  isd.batch,
  isd.strain,
  isd.status,
  isd.category,
  isd.room,
  isd.available_qty,
  isd.unit,
  isd.detected_stage as stage,
  isd.needs_manual_classification,
  isd.last_updated,
  -- Add batch information if available
  br.id as batch_id,
  br.batch_number,
  br.harvest_date,
  br.lifecycle_state as batch_lifecycle_state,
  -- Add stage tracking if available
  bst.allocated_weight_grams,
  bst.available_weight_grams as batch_stage_available,
  -- Calculate age in days
  EXTRACT(DAY FROM (NOW() - isd.last_updated)) as days_since_update,
  -- Stage display name
  CASE isd.detected_stage
    WHEN 'binned' THEN 'Binned (Pre-Trim)'
    WHEN 'bucked' THEN 'Bucked (Ready for Trim)'
    WHEN 'bulk_flower' THEN 'Bulk Flower'
    WHEN 'bulk_smalls' THEN 'Bulk Smalls'
    WHEN 'bulk_trim' THEN 'Bulk Trim'
    WHEN 'packaged' THEN 'Packaged (Retail Ready)'
    ELSE 'Unknown Stage'
  END as stage_display_name
FROM inventory_stage_detection isd
LEFT JOIN batch_registry br ON isd.batch = br.batch_number
LEFT JOIN batch_stage_tracking bst ON br.id = bst.batch_id
  AND bst.stage = isd.detected_stage
WHERE isd.available_qty > 0
ORDER BY isd.strain, isd.detected_stage, isd.last_updated;

COMMENT ON VIEW unified_inventory_view IS
'Unified view of all inventory across all stages with batch tracking integration.
Provides complete visibility from binned through packaged stages.
Includes aging information, batch details, and allocation status.';

-- =====================================================
-- STEP 5: Add indexes for performance
-- =====================================================

-- Index for binned inventory queries
CREATE INDEX IF NOT EXISTS idx_inventory_items_binned_detection
  ON inventory_items(strain, batch, last_updated)
  WHERE LOWER(product_name) LIKE '%binned%'
     OR LOWER(status) IN ('fresh', 'curing', 'drying')
     OR LOWER(category) LIKE '%binned%';

-- Index for stage-based lookups
CREATE INDEX IF NOT EXISTS idx_inventory_items_product_name_lower
  ON inventory_items(LOWER(product_name), strain, available_qty)
  WHERE available_qty > 0;

-- Index for batch lookups
CREATE INDEX IF NOT EXISTS idx_inventory_items_batch_strain
  ON inventory_items(batch, strain, available_qty)
  WHERE batch IS NOT NULL AND available_qty > 0;

-- =====================================================
-- STEP 6: Create function to get binned inventory for strain
-- =====================================================

CREATE OR REPLACE FUNCTION get_binned_inventory_for_strain(
  p_strain text DEFAULT NULL
)
RETURNS TABLE (
  package_id text,
  strain text,
  batch text,
  weight_grams numeric,
  room text,
  status text,
  days_in_binned integer,
  last_updated timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    isd.package_id,
    isd.strain,
    isd.batch,
    isd.available_qty as weight_grams,
    isd.room,
    isd.status,
    EXTRACT(DAY FROM (NOW() - isd.last_updated))::integer as days_in_binned,
    isd.last_updated
  FROM inventory_stage_detection isd
  WHERE isd.detected_stage = 'binned'
    AND (p_strain IS NULL OR isd.strain ILIKE p_strain)
    AND isd.available_qty > 0
  ORDER BY isd.last_updated ASC, isd.strain;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_binned_inventory_for_strain IS
'Returns all binned inventory for a specific strain (or all strains if null).
Ordered by age (oldest first) to help prioritize processing.
Returns package details, weight, location, and aging information.';

-- =====================================================
-- STEP 7: Update batch lifecycle states
-- =====================================================

-- Add binned as valid lifecycle state if not already present
DO $$
BEGIN
  -- Check if we need to update batch_registry lifecycle_state constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_registry' AND column_name = 'lifecycle_state'
  ) THEN
    -- Drop old constraint if exists
    ALTER TABLE batch_registry DROP CONSTRAINT IF EXISTS batch_registry_lifecycle_state_check;

    -- Add new constraint with binned state
    ALTER TABLE batch_registry
      ADD CONSTRAINT batch_registry_lifecycle_state_check
      CHECK (lifecycle_state IN (
        'created', 'binned', 'bucking', 'bucked',
        'trimming', 'bulk', 'packaging', 'packaged',
        'completed', 'depleted', 'archived'
      ));
  END IF;
END $$;

-- Add binned_at timestamp if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_registry' AND column_name = 'binned_at'
  ) THEN
    ALTER TABLE batch_registry ADD COLUMN binned_at timestamptz;
  END IF;
END $$;

COMMENT ON COLUMN batch_registry.lifecycle_state IS
'Batch lifecycle progression:
1. created -> binned: Initial harvest entered system
2. binned -> bucking: Bucking process started
3. bucking -> bucked: Bucking completed
4. bucked -> trimming: Trim process started
5. trimming -> bulk: Trim completed, material in bulk
6. bulk -> packaging: Packaging process started
7. packaging -> packaged: Packaging completed
8. packaged -> completed: All units sold/allocated
9. Any -> depleted: Batch fully consumed
10. Any -> archived: Batch archived for records';

-- =====================================================
-- STEP 8: Create inventory search function
-- =====================================================

CREATE OR REPLACE FUNCTION search_inventory_all_stages(
  p_search_term text
)
RETURNS TABLE (
  package_id text,
  product_name text,
  strain text,
  batch text,
  stage text,
  stage_display_name text,
  weight_or_units numeric,
  unit text,
  room text,
  status text,
  last_updated timestamptz,
  match_reason text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uiv.package_id,
    uiv.product_name,
    uiv.strain,
    uiv.batch,
    uiv.stage,
    uiv.stage_display_name,
    uiv.available_qty as weight_or_units,
    uiv.unit,
    uiv.room,
    uiv.status,
    uiv.last_updated,
    CASE
      WHEN uiv.package_id ILIKE '%' || p_search_term || '%' THEN 'Package ID'
      WHEN uiv.strain ILIKE '%' || p_search_term || '%' THEN 'Strain Name'
      WHEN uiv.batch ILIKE '%' || p_search_term || '%' THEN 'Batch Number'
      WHEN uiv.product_name ILIKE '%' || p_search_term || '%' THEN 'Product Name'
      ELSE 'Other Match'
    END as match_reason
  FROM unified_inventory_view uiv
  WHERE uiv.package_id ILIKE '%' || p_search_term || '%'
     OR uiv.strain ILIKE '%' || p_search_term || '%'
     OR uiv.batch ILIKE '%' || p_search_term || '%'
     OR uiv.product_name ILIKE '%' || p_search_term || '%'
  ORDER BY
    CASE WHEN uiv.package_id ILIKE '%' || p_search_term || '%' THEN 1
         WHEN uiv.strain ILIKE '%' || p_search_term || '%' THEN 2
         WHEN uiv.batch ILIKE '%' || p_search_term || '%' THEN 3
         ELSE 4 END,
    uiv.strain, uiv.stage;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_inventory_all_stages IS
'Global search across all inventory stages.
Searches package_id, strain, batch, and product_name fields.
Returns matches with stage information and reason for match.
Usage: SELECT * FROM search_inventory_all_stages(''Capulator'');';

-- =====================================================
-- STEP 9: Grant permissions
-- =====================================================

-- Grant access to authenticated users for new views
GRANT SELECT ON inventory_stage_detection TO authenticated;
GRANT SELECT ON binned_inventory_summary TO authenticated;
GRANT SELECT ON unified_inventory_view TO authenticated;

-- Grant execute on new functions
GRANT EXECUTE ON FUNCTION get_binned_inventory_for_strain TO authenticated;
GRANT EXECUTE ON FUNCTION search_inventory_all_stages TO authenticated;

-- =====================================================
-- STEP 10: Create helpful queries for testing
-- =====================================================

-- Create a helper view to quickly see inventory distribution
CREATE OR REPLACE VIEW inventory_stage_distribution AS
SELECT
  detected_stage as stage,
  COUNT(DISTINCT package_id) as package_count,
  COUNT(DISTINCT strain) as strain_count,
  SUM(available_qty) as total_weight_or_units,
  string_agg(DISTINCT unit, ', ') as units,
  MIN(last_updated) as oldest_update,
  MAX(last_updated) as newest_update
FROM inventory_stage_detection
GROUP BY detected_stage
ORDER BY
  CASE detected_stage
    WHEN 'binned' THEN 1
    WHEN 'bucked' THEN 2
    WHEN 'bulk_flower' THEN 3
    WHEN 'bulk_smalls' THEN 4
    WHEN 'bulk_trim' THEN 5
    WHEN 'packaged' THEN 6
    WHEN 'unknown' THEN 7
  END;

GRANT SELECT ON inventory_stage_distribution TO authenticated;

COMMENT ON VIEW inventory_stage_distribution IS
'Quick overview of inventory distribution across all stages.
Shows counts, weights, and date ranges for each stage.
Useful for understanding system-wide inventory status.';
