/*
  # Unpivot Packaging Products in Pending Conversions View

  ## Purpose
  Split packaging sessions into separate rows per product type (3.5g, 14g, 1lb)
  in the pending_conversions view. This matches the established pattern for trim
  and bucking sessions which already unpivot their output types.

  ## Problem
  Current Branch 4 (Packaging) aggregates ALL product types together:
  - Session with 32x 3.5g + 20x 14g shows as ONE row with 52 total units
  - Cannot finalize 3.5g independently from 14g
  - Generic product name doesn't indicate which type
  - Violates unpivoting pattern used elsewhere in system

  ## Solution
  Replace single Branch 4 with THREE separate branches:
  - Branch 4a: 3.5g products (check finalization_status_3_5g)
  - Branch 4b: 14g products (check finalization_status_14g)
  - Branch 4c: 1lb products (check finalization_status_1lb)

  Each branch:
  - Uses product-specific name column (output_product_3_5g_name, etc.)
  - Checks product-specific finalization status
  - Calculates remaining units for that specific product type
  - Creates unique aggregation_id per product type
  - Enables independent finalization workflows

  ## Changes
  1. DROP existing view
  2. Recreate with Branches 1-3 unchanged (trim and bucking)
  3. Replace Branch 4 with 4a, 4b, 4c (packaging split)
  4. Keep Branches 5-6 unchanged (bucking flower and smalls)
  5. Update view documentation

  ## Impact
  - Multi-product packaging sessions now show as MULTIPLE rows
  - Each product type can be finalized independently
  - Better visibility into packaging inventory pipeline
  - Matches established architectural pattern
  - No breaking changes to trim or bucking workflows
*/

-- =====================================================
-- Drop existing view
-- =====================================================

DROP VIEW IF EXISTS pending_conversion_sessions CASCADE;

-- =====================================================
-- Recreate view with unpivoted packaging branches
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

UPDATED 2026-01-28: Packaging sessions now UNPIVOTED by product type (3.5g, 14g, 1lb).
Each product type creates a separate row with independent finalization tracking.

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

ARCHITECTURE:
- 8 branches using UNION ALL (3 trim + 3 packaging + 2 bucking)
- Each branch reads product_name directly from session table (no lookups)
- Each branch checks only its relevant finalization_status_* field
- Aggregation by (batch_id + product_name + session_type)
- Session IDs tracked in array for traceability

EXAMPLES:
- Session packages 32x 3.5g + 20x 14g → Shows as TWO separate rows
- Each row can be finalized independently
- Each has specific product name: "Packaged - Swamp Water Fumez - 3.5g Flower"';

-- =====================================================
-- Grant permissions
-- =====================================================

GRANT SELECT ON pending_conversion_sessions TO authenticated;
GRANT SELECT ON pending_conversion_sessions TO anon;
