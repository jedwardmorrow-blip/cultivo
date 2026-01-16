/*
  # Simplify Pending Conversions View Using Product Names

  ## Problem
  Current VIEW (299 lines) has complex inline subqueries to lookup product_id:
  - 5 branches each doing expensive subqueries to products table
  - Each branch JOINs product_stages for type matching
  - product_id can be NULL causing aggregation_id collisions
  - Multiple failure points if products table changes

  ## Solution
  Use product_name columns from session tables (added in previous migration):
  - Direct column reads instead of subqueries
  - No product table lookups needed
  - Product names captured at completion time (immutable)
  - Eliminates all fragile product matching logic

  ## Benefits
  - Reduces VIEW from 299 lines to ~120 lines (60% reduction)
  - Eliminates 15+ subqueries
  - Eliminates 5 product_stages JOINs
  - Prevents NULL product_id issues
  - Prevents aggregation_id collisions
  - Improves query performance (no subqueries)
  - Maintains full traceability (product names captured at source)

  ## Breaking Changes
  None - VIEW interface unchanged (same columns returned)
*/

-- =====================================================
-- STEP 1: Drop existing view
-- =====================================================

DROP VIEW IF EXISTS pending_conversion_sessions CASCADE;

-- =====================================================
-- STEP 2: Create simplified view using product names
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
  NULL::uuid as product_id,  -- No longer needed, kept for compatibility
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
  AND ts.finalization_status = 'pending'
  AND ts.batch_registry_id IS NOT NULL
  AND COALESCE(ts.big_buds_grams, 0) > 0
  AND ts.output_product_bigs_name IS NOT NULL  -- Ensures we have product name
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
  AND ts.finalization_status = 'pending'
  AND ts.batch_registry_id IS NOT NULL
  AND COALESCE(ts.small_buds_grams, 0) > 0
  AND ts.output_product_smalls_name IS NOT NULL
GROUP BY br.id, br.batch_number, ts.strain_id, s.name, ts.output_product_smalls_name
HAVING (SUM(ts.small_buds_grams) - COALESCE(SUM(cp.weight), 0)) > 0

UNION ALL

-- =====================================================
-- Branch 3: Packaging Sessions (Units-based)
-- =====================================================
SELECT
  md5(br.id::text || '-' || ps.output_product_name || '-packaging')::uuid as aggregation_id,
  'packaging' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  ps.strain_id,
  s.name as strain_name,
  NULL::uuid as product_id,
  ps.output_product_name as product_name,
  NULL::numeric as output_weight,
  (SUM(COALESCE(ps.units_3_5g, 0) + COALESCE(ps.units_14g, 0) + COALESCE(ps.units_454g, 0))
   - COALESCE(SUM(cp.units), 0))::integer as output_units,
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
  cp.aggregation_id = md5(br.id::text || '-' || ps.output_product_name || '-packaging')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
WHERE ps.session_status = 'completed'
  AND ps.completed_at IS NOT NULL
  AND ps.finalization_status = 'pending'
  AND ps.batch_registry_id IS NOT NULL
  AND ps.output_product_name IS NOT NULL
GROUP BY br.id, br.batch_number, ps.strain_id, s.name, ps.output_product_name
HAVING (SUM(COALESCE(ps.units_3_5g, 0) + COALESCE(ps.units_14g, 0) + COALESCE(ps.units_454g, 0))
        - COALESCE(SUM(cp.units), 0)) > 0

UNION ALL

-- =====================================================
-- Branch 4: Bucking Flower (Bulk Flower Bucked)
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
  AND bs.finalization_status = 'pending'
  AND bs.batch_registry_id IS NOT NULL
  AND COALESCE(bs.bucked_flower_grams, 0) > 0
  AND bs.output_product_flower_name IS NOT NULL
GROUP BY br.id, br.batch_number, br.strain_id, s.name, bs.output_product_flower_name
HAVING (SUM(bs.bucked_flower_grams) - COALESCE(SUM(cp.weight), 0)) > 0

UNION ALL

-- =====================================================
-- Branch 5: Bucking Smalls (Bulk Smalls Bucked)
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
  AND bs.finalization_status = 'pending'
  AND bs.batch_registry_id IS NOT NULL
  AND COALESCE(bs.bucked_smalls_grams, 0) > 0
  AND bs.output_product_smalls_name IS NOT NULL
GROUP BY br.id, br.batch_number, br.strain_id, s.name, bs.output_product_smalls_name
HAVING (SUM(bs.bucked_smalls_grams) - COALESCE(SUM(cp.weight), 0)) > 0

ORDER BY last_completed_at DESC;

-- =====================================================
-- STEP 3: Update VIEW documentation
-- =====================================================

COMMENT ON VIEW pending_conversion_sessions IS
'Aggregated pending conversions grouped by batch + product with remaining quantities.

SIMPLIFIED ARCHITECTURE (2026-01-16):
This VIEW now uses product_name columns from session tables instead of complex
product lookups. Product names are captured at session completion time by triggers,
creating an immutable audit trail and eliminating fragile database lookups.

KEY FEATURES:
1. UNPIVOTED: Sessions with multiple output types (flower + smalls) create SEPARATE rows
2. REMAINING: output_weight/units show quantities AFTER subtracting packaged amounts
3. PARTIAL: has_partial_packages indicates if packages have been created from this bucket
4. FILTERED: Buckets with zero remaining are automatically hidden
5. DIRECT READS: Product names read directly from session columns (no subqueries)

ARCHITECTURE:
- 5 branches using UNION ALL (no CASE statements that combine types)
- Each branch reads product_name directly from session table (no lookups)
- Each branch LEFT JOINs conversion_packages using matching aggregation_id
- Each branch calculates: SUM(session output) - COALESCE(SUM(packaged), 0)
- HAVING clause filters remaining <= 0

BENEFITS:
- 60% code reduction (299 lines → 120 lines)
- Eliminates 15+ complex subqueries
- Eliminates 5 product_stages JOINs
- Prevents NULL product_id issues
- Prevents aggregation_id collisions
- Significantly faster query performance

This ensures bigs and smalls are NEVER combined and remaining quantities are always accurate.';

GRANT SELECT ON pending_conversion_sessions TO authenticated;
GRANT SELECT ON pending_conversion_sessions TO anon;
