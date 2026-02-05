/*
  # Fix Pending Conversions: Filter Packages by Source Session

  ## Purpose
  Fix cross-session package contamination in the pending_conversion_sessions view.
  Ensure packages are only counted against the sessions that created them, not ALL
  sessions with the same batch + product combination.

  ## Problem: Cross-Session Package Contamination

  **Current Behavior (BROKEN):**
  The view aggregates sessions by (batch_id + product_name) and LEFT JOINs to
  conversion_packages ONLY by aggregation_id. This creates a critical bug:

  Example Timeline:
  1. Session A completes: 1820g output for Batch 251105-BLM → Bulk Flower Trimmed
  2. Session A finalized: Creates packages totaling 1820g
  3. Session B completes: 500g output for SAME batch + product
  4. BUG: View shows Session B remaining = -1320g (500 - 1820)
     ↳ Session A's packages are incorrectly subtracted from Session B's output!

  **Root Cause:**
  ```sql
  LEFT JOIN conversion_packages cp ON
    cp.aggregation_id = md5(...)::uuid
    AND cp.finalization_status IN ('pending', 'finalized')
    -- MISSING: No filter to ensure packages came from THIS session
  ```

  The aggregation_id is based on (batch_id + product_name), so ALL packages for
  that combination are included, even packages from finalized sessions.

  **Impact:**
  - Negative remaining weights/units displayed
  - Conversion buckets hidden by HAVING clause (filters out negatives)
  - Cannot create bulk bags for new sessions
  - Data integrity issues in inventory tracking
  - Confusion about available quantities

  ## Solution: Session-Level Package Filtering

  Add a second JOIN condition to ensure packages are ONLY counted if they were
  created from sessions included in the current branch's WHERE clause:

  ```sql
  LEFT JOIN conversion_packages cp ON
    cp.aggregation_id = md5(...)::uuid
    AND cp.finalization_status IN ('pending', 'finalized')
    AND cp.source_session_ids @> to_jsonb(ARRAY[session_table.id])
    -- ↑ NEW: Only count packages from THIS session
  ```

  The `source_session_ids` column tracks which sessions contributed to each package.
  By filtering on this, we ensure packages created by Session A don't affect Session B.

  ## Changes Applied

  Updated all 8 branches to include session-level filtering:
  - Branch 1: Trim Big Buds (trim_sessions.id)
  - Branch 2: Trim Small Buds (trim_sessions.id)
  - Branch 3: Trim Byproduct (trim_sessions.id)
  - Branch 4a: Packaging 3.5g (packaging_sessions.id)
  - Branch 4b: Packaging 14g (packaging_sessions.id)
  - Branch 4c: Packaging 1lb (packaging_sessions.id)
  - Branch 5: Bucking Flower (bucking_sessions.id)
  - Branch 6: Bucking Smalls (bucking_sessions.id)

  ## Expected Results

  **After Fix:**
  1. Session A completes: 1820g output → Shows 1820g remaining
  2. Session A finalized: Creates 1820g packages → Removed from view (finalized)
  3. Session B completes: 500g output → Shows 500g remaining ✅ CORRECT
  4. Both sessions can be finalized independently
  5. No cross-contamination between sessions

  **Benefits:**
  - ✅ Accurate remaining quantities per session
  - ✅ No negative weights displayed
  - ✅ All conversion buckets visible
  - ✅ Proper session isolation in aggregations
  - ✅ Reliable bulk bag creation workflow
  - ✅ Data integrity maintained

  ## Migration Safety

  - Read-only operation (VIEW recreation)
  - No data changes to underlying tables
  - No breaking changes to view schema
  - Existing queries continue to work
  - Performance impact: Minimal (adds indexed array containment check)

  ---
  **Date:** 2026-02-05
  **Author:** AI Build Session
  **Session ID:** CONVERSION-SESSION-ISOLATION-001
  **Related Issues:** Negative remaining weights in conversions view
*/

-- =====================================================
-- Drop existing view
-- =====================================================

DROP VIEW IF EXISTS pending_conversion_sessions CASCADE;

-- =====================================================
-- Recreate view with session-filtered package joins
-- =====================================================

CREATE OR REPLACE VIEW pending_conversion_sessions AS

-- =====================================================
-- Branch 1: Trim Big Buds (Bulk Flower Trimmed)
-- =====================================================
SELECT
  md5(br.id::text || '-' || ts.output_product_bigs_name || '-trim')::uuid as aggregation_id,
  'trim' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  ts.strain_id,
  s.name as strain_name,
  NULL::uuid as product_id,
  ts.output_product_bigs_name as product_name,
  (SUM(ts.big_buds_grams) - COALESCE(SUM(cp.weight), 0)) as output_weight,
  NULL::integer as output_units,
  MIN(ts.completed_at) as first_completed_at,
  MAX(ts.completed_at) as last_completed_at,
  COUNT(DISTINCT ts.id) as session_count,
  array_agg(DISTINCT ts.id ORDER BY ts.id) as session_ids,
  'pending'::finalization_status as finalization_status,
  (COUNT(cp.id) > 0) as has_partial_packages
FROM trim_sessions ts
JOIN batch_registry br ON ts.batch_registry_id = br.id
LEFT JOIN strains s ON ts.strain_id = s.id
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(br.id::text || '-' || ts.output_product_bigs_name || '-trim')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
  AND cp.source_session_ids @> to_jsonb(ARRAY[ts.id])
WHERE ts.session_status = 'completed'
  AND ts.completed_at IS NOT NULL
  AND ts.finalization_status_bigs = 'pending'
  AND ts.batch_registry_id IS NOT NULL
  AND COALESCE(ts.big_buds_grams, 0) > 0
  AND ts.output_product_bigs_name IS NOT NULL
GROUP BY br.id, br.batch_number, ts.strain_id, s.name, ts.output_product_bigs_name
HAVING (SUM(ts.big_buds_grams) - COALESCE(SUM(cp.weight), 0)) > 0

UNION ALL

-- =====================================================
-- Branch 2: Trim Small Buds (Bulk Smalls Trimmed)
-- =====================================================
SELECT
  md5(br.id::text || '-' || ts.output_product_smalls_name || '-trim')::uuid as aggregation_id,
  'trim' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  ts.strain_id,
  s.name as strain_name,
  NULL::uuid as product_id,
  ts.output_product_smalls_name as product_name,
  (SUM(ts.small_buds_grams) - COALESCE(SUM(cp.weight), 0)) as output_weight,
  NULL::integer as output_units,
  MIN(ts.completed_at) as first_completed_at,
  MAX(ts.completed_at) as last_completed_at,
  COUNT(DISTINCT ts.id) as session_count,
  array_agg(DISTINCT ts.id ORDER BY ts.id) as session_ids,
  'pending'::finalization_status as finalization_status,
  (COUNT(cp.id) > 0) as has_partial_packages
FROM trim_sessions ts
JOIN batch_registry br ON ts.batch_registry_id = br.id
LEFT JOIN strains s ON ts.strain_id = s.id
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(br.id::text || '-' || ts.output_product_smalls_name || '-trim')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
  AND cp.source_session_ids @> to_jsonb(ARRAY[ts.id])
WHERE ts.session_status = 'completed'
  AND ts.completed_at IS NOT NULL
  AND ts.finalization_status_smalls = 'pending'
  AND ts.batch_registry_id IS NOT NULL
  AND COALESCE(ts.small_buds_grams, 0) > 0
  AND ts.output_product_smalls_name IS NOT NULL
GROUP BY br.id, br.batch_number, ts.strain_id, s.name, ts.output_product_smalls_name
HAVING (SUM(ts.small_buds_grams) - COALESCE(SUM(cp.weight), 0)) > 0

UNION ALL

-- =====================================================
-- Branch 3: Trim Byproduct (Bulk Trim Trimmed)
-- =====================================================
SELECT
  md5(br.id::text || '-' || ts.output_product_trim_name || '-trim')::uuid as aggregation_id,
  'trim' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  ts.strain_id,
  s.name as strain_name,
  NULL::uuid as product_id,
  ts.output_product_trim_name as product_name,
  (SUM(ts.trim_grams) - COALESCE(SUM(cp.weight), 0)) as output_weight,
  NULL::integer as output_units,
  MIN(ts.completed_at) as first_completed_at,
  MAX(ts.completed_at) as last_completed_at,
  COUNT(DISTINCT ts.id) as session_count,
  array_agg(DISTINCT ts.id ORDER BY ts.id) as session_ids,
  'pending'::finalization_status as finalization_status,
  (COUNT(cp.id) > 0) as has_partial_packages
FROM trim_sessions ts
JOIN batch_registry br ON ts.batch_registry_id = br.id
LEFT JOIN strains s ON ts.strain_id = s.id
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(br.id::text || '-' || ts.output_product_trim_name || '-trim')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
  AND cp.source_session_ids @> to_jsonb(ARRAY[ts.id])
WHERE ts.session_status = 'completed'
  AND ts.completed_at IS NOT NULL
  AND ts.finalization_status_trim = 'pending'
  AND ts.batch_registry_id IS NOT NULL
  AND COALESCE(ts.trim_grams, 0) > 0
  AND ts.output_product_trim_name IS NOT NULL
GROUP BY br.id, br.batch_number, ts.strain_id, s.name, ts.output_product_trim_name
HAVING (SUM(ts.trim_grams) - COALESCE(SUM(cp.weight), 0)) > 0

UNION ALL

-- =====================================================
-- Branch 4a: Packaging 3.5g Products
-- =====================================================
SELECT
  md5(br.id::text || '-' || ps.output_product_3_5g_name || '-packaging')::uuid as aggregation_id,
  'packaging' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  ps.strain_id,
  s.name as strain_name,
  NULL::uuid as product_id,
  ps.output_product_3_5g_name as product_name,
  NULL::numeric as output_weight,
  (SUM(COALESCE(ps.units_3_5g, 0)) - COALESCE(SUM(cp.units), 0))::integer as output_units,
  MIN(ps.completed_at) as first_completed_at,
  MAX(ps.completed_at) as last_completed_at,
  COUNT(DISTINCT ps.id) as session_count,
  array_agg(DISTINCT ps.id ORDER BY ps.id) as session_ids,
  'pending'::finalization_status as finalization_status,
  (COUNT(cp.id) > 0) as has_partial_packages
FROM packaging_sessions ps
JOIN batch_registry br ON ps.batch_registry_id = br.id
LEFT JOIN strains s ON ps.strain_id = s.id
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(br.id::text || '-' || ps.output_product_3_5g_name || '-packaging')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
  AND cp.source_session_ids @> to_jsonb(ARRAY[ps.id])
WHERE ps.session_status = 'completed'
  AND ps.completed_at IS NOT NULL
  AND ps.finalization_status_3_5g = 'pending'
  AND ps.batch_registry_id IS NOT NULL
  AND COALESCE(ps.units_3_5g, 0) > 0
  AND ps.output_product_3_5g_name IS NOT NULL
GROUP BY br.id, br.batch_number, ps.strain_id, s.name, ps.output_product_3_5g_name
HAVING (SUM(COALESCE(ps.units_3_5g, 0)) - COALESCE(SUM(cp.units), 0)) > 0

UNION ALL

-- =====================================================
-- Branch 4b: Packaging 14g Products
-- =====================================================
SELECT
  md5(br.id::text || '-' || ps.output_product_14g_name || '-packaging')::uuid as aggregation_id,
  'packaging' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  ps.strain_id,
  s.name as strain_name,
  NULL::uuid as product_id,
  ps.output_product_14g_name as product_name,
  NULL::numeric as output_weight,
  (SUM(COALESCE(ps.units_14g, 0)) - COALESCE(SUM(cp.units), 0))::integer as output_units,
  MIN(ps.completed_at) as first_completed_at,
  MAX(ps.completed_at) as last_completed_at,
  COUNT(DISTINCT ps.id) as session_count,
  array_agg(DISTINCT ps.id ORDER BY ps.id) as session_ids,
  'pending'::finalization_status as finalization_status,
  (COUNT(cp.id) > 0) as has_partial_packages
FROM packaging_sessions ps
JOIN batch_registry br ON ps.batch_registry_id = br.id
LEFT JOIN strains s ON ps.strain_id = s.id
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(br.id::text || '-' || ps.output_product_14g_name || '-packaging')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
  AND cp.source_session_ids @> to_jsonb(ARRAY[ps.id])
WHERE ps.session_status = 'completed'
  AND ps.completed_at IS NOT NULL
  AND ps.finalization_status_14g = 'pending'
  AND ps.batch_registry_id IS NOT NULL
  AND COALESCE(ps.units_14g, 0) > 0
  AND ps.output_product_14g_name IS NOT NULL
GROUP BY br.id, br.batch_number, ps.strain_id, s.name, ps.output_product_14g_name
HAVING (SUM(COALESCE(ps.units_14g, 0)) - COALESCE(SUM(cp.units), 0)) > 0

UNION ALL

-- =====================================================
-- Branch 4c: Packaging 1lb (454g) Products
-- =====================================================
SELECT
  md5(br.id::text || '-' || ps.output_product_1lb_name || '-packaging')::uuid as aggregation_id,
  'packaging' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  ps.strain_id,
  s.name as strain_name,
  NULL::uuid as product_id,
  ps.output_product_1lb_name as product_name,
  NULL::numeric as output_weight,
  (SUM(COALESCE(ps.units_454g, 0)) - COALESCE(SUM(cp.units), 0))::integer as output_units,
  MIN(ps.completed_at) as first_completed_at,
  MAX(ps.completed_at) as last_completed_at,
  COUNT(DISTINCT ps.id) as session_count,
  array_agg(DISTINCT ps.id ORDER BY ps.id) as session_ids,
  'pending'::finalization_status as finalization_status,
  (COUNT(cp.id) > 0) as has_partial_packages
FROM packaging_sessions ps
JOIN batch_registry br ON ps.batch_registry_id = br.id
LEFT JOIN strains s ON ps.strain_id = s.id
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(br.id::text || '-' || ps.output_product_1lb_name || '-packaging')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
  AND cp.source_session_ids @> to_jsonb(ARRAY[ps.id])
WHERE ps.session_status = 'completed'
  AND ps.completed_at IS NOT NULL
  AND ps.finalization_status_1lb = 'pending'
  AND ps.batch_registry_id IS NOT NULL
  AND COALESCE(ps.units_454g, 0) > 0
  AND ps.output_product_1lb_name IS NOT NULL
GROUP BY br.id, br.batch_number, ps.strain_id, s.name, ps.output_product_1lb_name
HAVING (SUM(COALESCE(ps.units_454g, 0)) - COALESCE(SUM(cp.units), 0)) > 0

UNION ALL

-- =====================================================
-- Branch 5: Bucking Flower (Bulk Flower Bucked)
-- =====================================================
SELECT
  md5(br.id::text || '-' || bs.output_product_flower_name || '-bucking')::uuid as aggregation_id,
  'bucking' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  br.strain_id,
  s.name as strain_name,
  NULL::uuid as product_id,
  bs.output_product_flower_name as product_name,
  (SUM(bs.bucked_flower_grams) - COALESCE(SUM(cp.weight), 0)) as output_weight,
  NULL::integer as output_units,
  MIN(bs.completed_at) as first_completed_at,
  MAX(bs.completed_at) as last_completed_at,
  COUNT(DISTINCT bs.id) as session_count,
  array_agg(DISTINCT bs.id ORDER BY bs.id) as session_ids,
  'pending'::finalization_status as finalization_status,
  (COUNT(cp.id) > 0) as has_partial_packages
FROM bucking_sessions bs
JOIN batch_registry br ON bs.batch_registry_id = br.id
LEFT JOIN strains s ON br.strain_id = s.id
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(br.id::text || '-' || bs.output_product_flower_name || '-bucking')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
  AND cp.source_session_ids @> to_jsonb(ARRAY[bs.id])
WHERE bs.session_status = 'completed'
  AND bs.completed_at IS NOT NULL
  AND bs.finalization_status_bucked = 'pending'
  AND bs.batch_registry_id IS NOT NULL
  AND COALESCE(bs.bucked_flower_grams, 0) > 0
  AND bs.output_product_flower_name IS NOT NULL
GROUP BY br.id, br.batch_number, br.strain_id, s.name, bs.output_product_flower_name
HAVING (SUM(bs.bucked_flower_grams) - COALESCE(SUM(cp.weight), 0)) > 0

UNION ALL

-- =====================================================
-- Branch 6: Bucking Smalls (Bulk Smalls Bucked)
-- =====================================================
SELECT
  md5(br.id::text || '-' || bs.output_product_smalls_name || '-bucking')::uuid as aggregation_id,
  'bucking' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  br.strain_id,
  s.name as strain_name,
  NULL::uuid as product_id,
  bs.output_product_smalls_name as product_name,
  (SUM(bs.bucked_smalls_grams) - COALESCE(SUM(cp.weight), 0)) as output_weight,
  NULL::integer as output_units,
  MIN(bs.completed_at) as first_completed_at,
  MAX(bs.completed_at) as last_completed_at,
  COUNT(DISTINCT bs.id) as session_count,
  array_agg(DISTINCT bs.id ORDER BY bs.id) as session_ids,
  'pending'::finalization_status as finalization_status,
  (COUNT(cp.id) > 0) as has_partial_packages
FROM bucking_sessions bs
JOIN batch_registry br ON bs.batch_registry_id = br.id
LEFT JOIN strains s ON br.strain_id = s.id
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(br.id::text || '-' || bs.output_product_smalls_name || '-bucking')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
  AND cp.source_session_ids @> to_jsonb(ARRAY[bs.id])
WHERE bs.session_status = 'completed'
  AND bs.completed_at IS NOT NULL
  AND bs.finalization_status_smalls = 'pending'
  AND bs.batch_registry_id IS NOT NULL
  AND COALESCE(bs.bucked_smalls_grams, 0) > 0
  AND bs.output_product_smalls_name IS NOT NULL
GROUP BY br.id, br.batch_number, br.strain_id, s.name, bs.output_product_smalls_name
HAVING (SUM(bs.bucked_smalls_grams) - COALESCE(SUM(cp.weight), 0)) > 0

ORDER BY last_completed_at DESC;

-- =====================================================
-- Update view documentation
-- =====================================================

COMMENT ON VIEW pending_conversion_sessions IS
'Aggregated pending conversions grouped by batch + product with remaining quantities.

UPDATED 2026-02-05: Added session-level package filtering to prevent cross-session
contamination. Packages are now ONLY counted against the sessions that created them.

SESSION ISOLATION FIX:
Each branch now filters conversion_packages by source_session_ids to ensure packages
created from finalized sessions do NOT affect new pending sessions for the same
batch + product combination. This prevents negative remaining quantities and ensures
accurate visibility into available conversion inventory.

Each branch checks only the relevant finalization status field:
- Branch 1 (Trim Bigs): finalization_status_bigs
- Branch 2 (Trim Smalls): finalization_status_smalls
- Branch 3 (Trim Byproduct): finalization_status_trim
- Branch 4a (Packaging 3.5g): finalization_status_3_5g
- Branch 4b (Packaging 14g): finalization_status_14g
- Branch 4c (Packaging 1lb): finalization_status_1lb
- Branch 5 (Bucking Flower): finalization_status_bucked
- Branch 6 (Bucking Smalls): finalization_status_smalls

This enables partial finalization scenarios where one output type is finalized
while others remain pending, improving workflow flexibility and analytics accuracy.

KEY FEATURES:
1. UNPIVOTED: Sessions with multiple output types create SEPARATE rows
   - Trim sessions create up to 3 rows: big buds, small buds, AND trim
   - Bucking sessions create up to 2 rows: flower and smalls
   - Packaging sessions create up to 3 rows: 3.5g, 14g, AND 1lb
2. REMAINING: output_weight/units show quantities AFTER subtracting packaged amounts
3. PARTIAL: has_partial_packages indicates if packages have been created from this bucket
4. FILTERED: Buckets with zero remaining are automatically hidden
5. DIRECT READS: Product names read directly from session columns (no subqueries)
6. PER-OUTPUT: Each output type tracks its own finalization status independently
7. SESSION ISOLATED: Packages filtered by source_session_ids to prevent cross-contamination

ARCHITECTURE:
- 8 branches using UNION ALL (3 trim + 3 packaging + 2 bucking)
- Each branch reads product_name directly from session table (no lookups)
- Each branch checks only its relevant finalization_status_* field
- Each branch filters packages by source_session_ids for isolation
- Aggregation by (batch_id + product_name + session_type)
- Session IDs tracked in array for traceability

EXAMPLES:
- Session packages 32x 3.5g + 20x 14g → Shows as TWO separate rows
- Each row can be finalized independently
- Each has specific product name: "Packaged - Swamp Water Fumez - 3.5g Flower"
- Finalized sessions'' packages do NOT affect new pending sessions';

-- =====================================================
-- Grant permissions
-- =====================================================

GRANT SELECT ON pending_conversion_sessions TO authenticated;
GRANT SELECT ON pending_conversion_sessions TO anon;
