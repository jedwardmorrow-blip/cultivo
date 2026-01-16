/*
  # Fix Pending Conversions to Show Remaining Weight

  ## Problem
  The conversion summary screen shows the original session output weight (e.g., 800g),
  but after creating packages (e.g., 600g), it should show remaining weight (200g).
  The bulk bag modal correctly calculates remaining weight, but the summary view doesn't.

  ## Root Cause
  The pending_conversion_sessions VIEW sums original session outputs without subtracting
  already-packaged amounts from the conversion_packages table.

  ## Solution
  Update the VIEW to:
  1. LEFT JOIN conversion_packages using aggregation_id
  2. Calculate remaining weight: SUM(session output) - SUM(packaged weight)
  3. Calculate remaining units: SUM(session output) - SUM(packaged units)
  4. Add has_partial_packages flag to indicate partial finalization
  5. Filter out buckets where remaining weight/units <= 0

  ## Changes
  - Drop and recreate pending_conversion_sessions VIEW
  - Update all three branches (trim, packaging, bucking) with remaining calculations
  - Add has_partial_packages boolean column
  - Update VIEW comment to document remaining weight calculation
*/

-- =====================================================
-- STEP 1: Drop existing VIEW
-- =====================================================

DROP VIEW IF EXISTS pending_conversion_sessions CASCADE;

-- =====================================================
-- STEP 2: Create updated VIEW with remaining weight calculation
-- =====================================================

CREATE OR REPLACE VIEW pending_conversion_sessions AS

-- =====================================================
-- Trim sessions aggregated by batch + product
-- =====================================================
SELECT
  -- Generate unique ID from batch + product + type
  md5(br.id::text || '-' || COALESCE(ts.product_id::text, 'null') || '-trim')::uuid as aggregation_id,
  'trim' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  ts.strain_id,
  s.name as strain_name,
  ts.product_id,
  ts.product_name,
  -- Calculate REMAINING weight after subtracting packaged amounts
  (SUM(ts.output_weight) - COALESCE(SUM(cp.weight), 0)) as output_weight,
  NULL::integer as output_units,
  MIN(ts.completed_at) as first_completed_at,
  MAX(ts.completed_at) as last_completed_at,
  COUNT(DISTINCT ts.id) as session_count,
  array_agg(DISTINCT ts.id ORDER BY ts.id) as session_ids,
  'pending'::finalization_status as finalization_status,
  -- Indicate if any packages have been created
  (COUNT(cp.id) > 0) as has_partial_packages
FROM (
  SELECT
    ts.id,
    ts.batch_registry_id,
    ts.strain_id,
    ts.completed_at,
    -- Determine output product
    CASE
      WHEN COALESCE(ts.big_buds_grams, 0) > 0 THEN (
        SELECT p.id FROM products p
        JOIN product_stages ps ON p.stage_id = ps.id
        WHERE ps.name = 'Trimmed' AND p.type = 'bulk_flower'
        LIMIT 1
      )
      WHEN COALESCE(ts.small_buds_grams, 0) > 0 THEN (
        SELECT p.id FROM products p
        JOIN product_stages ps ON p.stage_id = ps.id
        WHERE ps.name = 'Trimmed' AND p.type = 'bulk_smalls'
        LIMIT 1
      )
      ELSE NULL
    END as product_id,
    CASE
      WHEN COALESCE(ts.big_buds_grams, 0) > 0 THEN 'Bulk Flower (Trimmed)'
      WHEN COALESCE(ts.small_buds_grams, 0) > 0 THEN 'Bulk Smalls (Trimmed)'
      ELSE NULL
    END as product_name,
    (COALESCE(ts.big_buds_grams, 0) + COALESCE(ts.small_buds_grams, 0)) as output_weight
  FROM trim_sessions ts
  WHERE ts.session_status = 'completed'
    AND ts.completed_at IS NOT NULL
    AND ts.finalization_status = 'pending'
    AND ts.batch_registry_id IS NOT NULL
) ts
JOIN batch_registry br ON ts.batch_registry_id = br.id
LEFT JOIN strains s ON ts.strain_id = s.id
-- LEFT JOIN to get already-packaged amounts
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(br.id::text || '-' || COALESCE(ts.product_id::text, 'null') || '-trim')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
GROUP BY br.id, br.batch_number, ts.strain_id, s.name, ts.product_id, ts.product_name
-- Only show buckets with remaining weight > 0
HAVING (SUM(ts.output_weight) - COALESCE(SUM(cp.weight), 0)) > 0

UNION ALL

-- =====================================================
-- Packaging sessions aggregated by batch + product
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
  -- Calculate REMAINING units after subtracting packaged amounts
  (SUM(COALESCE(ps.units_3_5g, 0) + COALESCE(ps.units_14g, 0) + COALESCE(ps.units_454g, 0))
   - COALESCE(SUM(cp.units), 0))::integer as output_units,
  MIN(ps.completed_at) as first_completed_at,
  MAX(ps.completed_at) as last_completed_at,
  COUNT(DISTINCT ps.id) as session_count,
  array_agg(DISTINCT ps.id ORDER BY ps.id) as session_ids,
  'pending'::finalization_status as finalization_status,
  -- Indicate if any packages have been created
  (COUNT(cp.id) > 0) as has_partial_packages
FROM packaging_sessions ps
JOIN batch_registry br ON ps.batch_registry_id = br.id
LEFT JOIN strains s ON ps.strain_id = s.id
-- LEFT JOIN to get already-packaged amounts
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(br.id::text || '-packaging')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
WHERE ps.session_status = 'completed'
  AND ps.completed_at IS NOT NULL
  AND ps.finalization_status = 'pending'
  AND ps.batch_registry_id IS NOT NULL
GROUP BY br.id, br.batch_number, ps.strain_id, s.name
-- Only show buckets with remaining units > 0
HAVING (SUM(COALESCE(ps.units_3_5g, 0) + COALESCE(ps.units_14g, 0) + COALESCE(ps.units_454g, 0))
        - COALESCE(SUM(cp.units), 0)) > 0

UNION ALL

-- =====================================================
-- Bucking sessions aggregated by batch + product
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
  -- Calculate REMAINING weight after subtracting packaged amounts
  (SUM(bs.output_weight) - COALESCE(SUM(cp.weight), 0)) as output_weight,
  NULL::integer as output_units,
  MIN(bs.completed_at) as first_completed_at,
  MAX(bs.completed_at) as last_completed_at,
  COUNT(DISTINCT bs.id) as session_count,
  array_agg(DISTINCT bs.id ORDER BY bs.id) as session_ids,
  'pending'::finalization_status as finalization_status,
  -- Indicate if any packages have been created
  (COUNT(cp.id) > 0) as has_partial_packages
FROM (
  SELECT
    bs.id,
    bs.batch_registry_id,
    bs.completed_at,
    -- Determine output product
    CASE
      WHEN COALESCE(bs.bucked_flower_grams, 0) > 0 THEN (
        SELECT p.id FROM products p
        JOIN product_stages ps ON p.stage_id = ps.id
        WHERE ps.name = 'Bucked' AND p.type = 'bulk_flower'
        LIMIT 1
      )
      WHEN COALESCE(bs.bucked_smalls_grams, 0) > 0 THEN (
        SELECT p.id FROM products p
        JOIN product_stages ps ON p.stage_id = ps.id
        WHERE ps.name = 'Bucked' AND p.type = 'bulk_smalls'
        LIMIT 1
      )
      ELSE NULL
    END as product_id,
    CASE
      WHEN COALESCE(bs.bucked_flower_grams, 0) > 0 THEN 'Bulk Flower (Bucked)'
      WHEN COALESCE(bs.bucked_smalls_grams, 0) > 0 THEN 'Bulk Smalls (Bucked)'
      ELSE NULL
    END as product_name,
    (COALESCE(bs.bucked_flower_grams, 0) + COALESCE(bs.bucked_smalls_grams, 0)) as output_weight
  FROM bucking_sessions bs
  WHERE bs.session_status = 'completed'
    AND bs.completed_at IS NOT NULL
    AND bs.finalization_status = 'pending'
    AND bs.batch_registry_id IS NOT NULL
) bs
JOIN batch_registry br ON bs.batch_registry_id = br.id
LEFT JOIN strains s ON br.strain_id = s.id
-- LEFT JOIN to get already-packaged amounts
LEFT JOIN conversion_packages cp ON
  cp.aggregation_id = md5(br.id::text || '-' || COALESCE(bs.product_id::text, 'null') || '-bucking')::uuid
  AND cp.finalization_status IN ('pending', 'finalized')
GROUP BY br.id, br.batch_number, br.strain_id, s.name, bs.product_id, bs.product_name
-- Only show buckets with remaining weight > 0
HAVING (SUM(bs.output_weight) - COALESCE(SUM(cp.weight), 0)) > 0

ORDER BY last_completed_at DESC;

-- =====================================================
-- STEP 3: Update VIEW documentation
-- =====================================================

COMMENT ON VIEW pending_conversion_sessions IS
'Aggregated pending conversions grouped by batch + product.
Multiple sessions with same batch+product are combined into single row.
output_weight and output_units show REMAINING quantities after subtracting already-packaged amounts.
has_partial_packages indicates if any packages have been created from this bucket.
Buckets with zero remaining weight/units are automatically hidden.
session_ids array tracks all source sessions.
session_count shows how many sessions were aggregated.';

GRANT SELECT ON pending_conversion_sessions TO authenticated;