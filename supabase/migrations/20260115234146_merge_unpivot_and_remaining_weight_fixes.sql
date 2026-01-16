/*
  # Merge Unpivot and Remaining Weight Fixes

  ## Problem
  Two previous migrations addressed separate issues but conflicted:
  - 20260114153845: Properly unpivoted product types (bigs vs smalls) using UNION ALL
  - 20260115230412: Added remaining weight calculation but reverted to CASE statements that recombine types

  The second migration accidentally UNDID the unpivoting fix, causing bigs and smalls to be
  combined again (e.g., 800g flower + smalls shown as single "Bulk Flower (Bucked)" bucket).

  ## Root Cause
  Migration 20260115230412 used CASE statements that pick ONE product type and sum ALL weights.

  ## Solution
  Merge both fixes: UNION ALL for unpivoting + LEFT JOIN for remaining weight calculation.

  ## Changes
  - 5 separate branches (no CASE statements)
  - Each branch LEFT JOINs conversion_packages
  - Each branch calculates remaining quantities
  - HAVING filters zero-weight buckets
*/

-- =====================================================
-- STEP 1: Drop existing view
-- =====================================================

DROP VIEW IF EXISTS pending_conversion_sessions CASCADE;

-- =====================================================
-- STEP 2: Create merged view
-- =====================================================

CREATE OR REPLACE VIEW pending_conversion_sessions AS

-- =====================================================
-- Branch 1: Trim Big Buds (Bulk Flower Trimmed)
-- =====================================================
SELECT
  md5(br.id::text || '-' || COALESCE(ts.product_id::text, 'null') || '-trim')::uuid as aggregation_id,
  'trim' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  ts.strain_id,
  s.name as strain_name,
  ts.product_id,
  ts.product_name,
  (SUM(ts.output_weight) - COALESCE(SUM(cp.weight), 0)) as output_weight,
  NULL::integer as output_units,
  MIN(ts.completed_at) as first_completed_at,
  MAX(ts.completed_at) as last_completed_at,
  COUNT(DISTINCT ts.id) as session_count,
  array_agg(DISTINCT ts.id ORDER BY ts.id) as session_ids,
  'pending'::finalization_status as finalization_status,
  (COUNT(cp.id) > 0) as has_partial_packages
FROM (
  SELECT
    ts.id,
    ts.batch_registry_id,
    ts.strain_id,
    ts.completed_at,
    (
      SELECT p.id FROM products p
      JOIN product_stages ps ON p.stage_id = ps.id
      WHERE ps.name = 'Trimmed' AND p.type = 'bulk_flower'
      LIMIT 1
    ) as product_id,
    'Bulk Flower (Trimmed)' as product_name,
    ts.big_buds_grams as output_weight
  FROM trim_sessions ts
  WHERE ts.session_status = 'completed'
    AND ts.completed_at IS NOT NULL
    AND ts.finalization_status = 'pending'
    AND ts.batch_registry_id IS NOT NULL
    AND COALESCE(ts.big_buds_grams, 0) > 0
) ts
JOIN batch_registry br ON ts.batch_registry_id = br.id
LEFT JOIN strains s ON ts.strain_id = s.id
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(br.id::text || '-' || COALESCE(ts.product_id::text, 'null') || '-trim')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
GROUP BY br.id, br.batch_number, ts.strain_id, s.name, ts.product_id, ts.product_name
HAVING (SUM(ts.output_weight) - COALESCE(SUM(cp.weight), 0)) > 0

UNION ALL

-- =====================================================
-- Branch 2: Trim Small Buds (Bulk Smalls Trimmed)
-- =====================================================
SELECT
  md5(br.id::text || '-' || COALESCE(ts.product_id::text, 'null') || '-trim')::uuid as aggregation_id,
  'trim' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  ts.strain_id,
  s.name as strain_name,
  ts.product_id,
  ts.product_name,
  (SUM(ts.output_weight) - COALESCE(SUM(cp.weight), 0)) as output_weight,
  NULL::integer as output_units,
  MIN(ts.completed_at) as first_completed_at,
  MAX(ts.completed_at) as last_completed_at,
  COUNT(DISTINCT ts.id) as session_count,
  array_agg(DISTINCT ts.id ORDER BY ts.id) as session_ids,
  'pending'::finalization_status as finalization_status,
  (COUNT(cp.id) > 0) as has_partial_packages
FROM (
  SELECT
    ts.id,
    ts.batch_registry_id,
    ts.strain_id,
    ts.completed_at,
    (
      SELECT p.id FROM products p
      JOIN product_stages ps ON p.stage_id = ps.id
      WHERE ps.name = 'Trimmed' AND p.type = 'bulk_smalls'
      LIMIT 1
    ) as product_id,
    'Bulk Smalls (Trimmed)' as product_name,
    ts.small_buds_grams as output_weight
  FROM trim_sessions ts
  WHERE ts.session_status = 'completed'
    AND ts.completed_at IS NOT NULL
    AND ts.finalization_status = 'pending'
    AND ts.batch_registry_id IS NOT NULL
    AND COALESCE(ts.small_buds_grams, 0) > 0
) ts
JOIN batch_registry br ON ts.batch_registry_id = br.id
LEFT JOIN strains s ON ts.strain_id = s.id
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(br.id::text || '-' || COALESCE(ts.product_id::text, 'null') || '-trim')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
GROUP BY br.id, br.batch_number, ts.strain_id, s.name, ts.product_id, ts.product_name
HAVING (SUM(ts.output_weight) - COALESCE(SUM(cp.weight), 0)) > 0

UNION ALL

-- =====================================================
-- Branch 3: Packaging Sessions (Units-based)
-- =====================================================
SELECT
  md5(br.id::text || '-packaging')::uuid as aggregation_id,
  'packaging' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  ps.strain_id,
  s.name as strain_name,
  NULL::uuid as product_id,
  'Packaged Products' as product_name,
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
  cp.aggregation_id = md5(br.id::text || '-packaging')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
WHERE ps.session_status = 'completed'
  AND ps.completed_at IS NOT NULL
  AND ps.finalization_status = 'pending'
  AND ps.batch_registry_id IS NOT NULL
GROUP BY br.id, br.batch_number, ps.strain_id, s.name
HAVING (SUM(COALESCE(ps.units_3_5g, 0) + COALESCE(ps.units_14g, 0) + COALESCE(ps.units_454g, 0))
        - COALESCE(SUM(cp.units), 0)) > 0

UNION ALL

-- =====================================================
-- Branch 4: Bucking Flower (Bulk Flower Bucked)
-- =====================================================
SELECT
  md5(br.id::text || '-' || COALESCE(bs.product_id::text, 'null') || '-bucking')::uuid as aggregation_id,
  'bucking' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  br.strain_id,
  s.name as strain_name,
  bs.product_id,
  bs.product_name,
  (SUM(bs.output_weight) - COALESCE(SUM(cp.weight), 0)) as output_weight,
  NULL::integer as output_units,
  MIN(bs.completed_at) as first_completed_at,
  MAX(bs.completed_at) as last_completed_at,
  COUNT(DISTINCT bs.id) as session_count,
  array_agg(DISTINCT bs.id ORDER BY bs.id) as session_ids,
  'pending'::finalization_status as finalization_status,
  (COUNT(cp.id) > 0) as has_partial_packages
FROM (
  SELECT
    bs.id,
    bs.batch_registry_id,
    bs.completed_at,
    (
      SELECT p.id FROM products p
      JOIN product_stages ps ON p.stage_id = ps.id
      WHERE ps.name = 'Bucked' AND p.type = 'bulk_flower'
      LIMIT 1
    ) as product_id,
    'Bulk Flower (Bucked)' as product_name,
    bs.bucked_flower_grams as output_weight
  FROM bucking_sessions bs
  WHERE bs.session_status = 'completed'
    AND bs.completed_at IS NOT NULL
    AND bs.finalization_status = 'pending'
    AND bs.batch_registry_id IS NOT NULL
    AND COALESCE(bs.bucked_flower_grams, 0) > 0
) bs
JOIN batch_registry br ON bs.batch_registry_id = br.id
LEFT JOIN strains s ON br.strain_id = s.id
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(br.id::text || '-' || COALESCE(bs.product_id::text, 'null') || '-bucking')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
GROUP BY br.id, br.batch_number, br.strain_id, s.name, bs.product_id, bs.product_name
HAVING (SUM(bs.output_weight) - COALESCE(SUM(cp.weight), 0)) > 0

UNION ALL

-- =====================================================
-- Branch 5: Bucking Smalls (Bulk Smalls Bucked)
-- =====================================================
SELECT
  md5(br.id::text || '-' || COALESCE(bs.product_id::text, 'null') || '-bucking')::uuid as aggregation_id,
  'bucking' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  br.strain_id,
  s.name as strain_name,
  bs.product_id,
  bs.product_name,
  (SUM(bs.output_weight) - COALESCE(SUM(cp.weight), 0)) as output_weight,
  NULL::integer as output_units,
  MIN(bs.completed_at) as first_completed_at,
  MAX(bs.completed_at) as last_completed_at,
  COUNT(DISTINCT bs.id) as session_count,
  array_agg(DISTINCT bs.id ORDER BY bs.id) as session_ids,
  'pending'::finalization_status as finalization_status,
  (COUNT(cp.id) > 0) as has_partial_packages
FROM (
  SELECT
    bs.id,
    bs.batch_registry_id,
    bs.completed_at,
    (
      SELECT p.id FROM products p
      JOIN product_stages ps ON p.stage_id = ps.id
      WHERE ps.name = 'Bucked' AND p.type = 'bulk_smalls'
      LIMIT 1
    ) as product_id,
    'Bulk Smalls (Bucked)' as product_name,
    bs.bucked_smalls_grams as output_weight
  FROM bucking_sessions bs
  WHERE bs.session_status = 'completed'
    AND bs.completed_at IS NOT NULL
    AND bs.finalization_status = 'pending'
    AND bs.batch_registry_id IS NOT NULL
    AND COALESCE(bs.bucked_smalls_grams, 0) > 0
) bs
JOIN batch_registry br ON bs.batch_registry_id = br.id
LEFT JOIN strains s ON br.strain_id = s.id
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(br.id::text || '-' || COALESCE(bs.product_id::text, 'null') || '-bucking')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
GROUP BY br.id, br.batch_number, br.strain_id, s.name, bs.product_id, bs.product_name
HAVING (SUM(bs.output_weight) - COALESCE(SUM(cp.weight), 0)) > 0

ORDER BY last_completed_at DESC;

-- =====================================================
-- STEP 3: Update VIEW documentation
-- =====================================================

COMMENT ON VIEW pending_conversion_sessions IS
'Aggregated pending conversions grouped by batch + product with remaining quantities.

KEY FEATURES:
1. UNPIVOTED: Sessions with multiple output types (flower + smalls) create SEPARATE rows
2. REMAINING: output_weight/units show quantities AFTER subtracting packaged amounts
3. PARTIAL: has_partial_packages indicates if packages have been created from this bucket
4. FILTERED: Buckets with zero remaining are automatically hidden

ARCHITECTURE:
- 5 branches using UNION ALL (no CASE statements that combine types)
- Each branch LEFT JOINs conversion_packages using matching aggregation_id
- Each branch calculates: SUM(session output) - COALESCE(SUM(packaged), 0)
- HAVING clause filters remaining <= 0

This ensures bigs and smalls are NEVER combined and remaining quantities are always accurate.';

GRANT SELECT ON pending_conversion_sessions TO authenticated;
GRANT SELECT ON pending_conversion_sessions TO anon;
