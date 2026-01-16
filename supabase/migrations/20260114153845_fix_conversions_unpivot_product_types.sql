/*
  # Fix Conversions to Separate Product Types

  ## Problem
  Bucking sessions that output BOTH flower AND smalls are incorrectly aggregated
  into a single bucket instead of two separate buckets.

  Example (WRONG):
  - Animal Tsunami bucked: 1500g flower + 1160g smalls
  - Shows as: "Bulk Flower (Bucked) - 2660g" (single bucket)

  Expected (CORRECT):
  - Animal Tsunami bucked: 1500g flower + 1160g smalls
  - Shows as TWO buckets:
    1. "Bulk Flower (Bucked) - 1500g"
    2. "Bulk Smalls (Bucked) - 1160g"

  ## Root Cause
  The view uses a CASE statement to pick ONE product type when sessions have
  multiple outputs, then SUMS all weights together.

  ## Solution
  UNPIVOT session outputs so each product type creates a separate row BEFORE
  aggregation by batch + product.

  ## Changes
  1. Bucking sessions: Create separate rows for flower and smalls outputs
  2. Trim sessions: Create separate rows for big_buds and small_buds outputs
  3. Each output type gets properly grouped by (batch_id + product_id)
*/

-- =====================================================
-- STEP 1: Drop existing view
-- =====================================================

DROP VIEW IF EXISTS pending_conversion_sessions CASCADE;

-- =====================================================
-- STEP 2: Create fixed view with proper unpivoting
-- =====================================================

CREATE OR REPLACE VIEW pending_conversion_sessions AS

-- =====================================================
-- TRIM SESSIONS - Unpivoted by output type
-- =====================================================
SELECT
  md5(br.id::text || '-' || COALESCE(product_id::text, 'null') || '-trim')::uuid as aggregation_id,
  'trim' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  ts.strain_id,
  s.name as strain_name,
  product_id,
  product_name,
  SUM(output_weight) as output_weight,
  NULL::integer as output_units,
  MIN(ts.completed_at) as first_completed_at,
  MAX(ts.completed_at) as last_completed_at,
  COUNT(ts.id) as session_count,
  array_agg(ts.id ORDER BY ts.completed_at) as session_ids,
  'pending'::finalization_status as finalization_status
FROM (
  -- Big buds (flower) outputs
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

  UNION ALL

  -- Small buds (smalls) outputs
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
GROUP BY br.id, br.batch_number, ts.strain_id, s.name, product_id, product_name

UNION ALL

-- =====================================================
-- PACKAGING SESSIONS - Aggregated by batch only
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
  SUM(COALESCE(ps.units_3_5g, 0) + COALESCE(ps.units_14g, 0) + COALESCE(ps.units_454g, 0))::integer as output_units,
  MIN(ps.completed_at) as first_completed_at,
  MAX(ps.completed_at) as last_completed_at,
  COUNT(ps.id) as session_count,
  array_agg(ps.id ORDER BY ps.completed_at) as session_ids,
  'pending'::finalization_status as finalization_status
FROM packaging_sessions ps
JOIN batch_registry br ON ps.batch_registry_id = br.id
LEFT JOIN strains s ON ps.strain_id = s.id
WHERE ps.session_status = 'completed'
  AND ps.completed_at IS NOT NULL
  AND ps.finalization_status = 'pending'
  AND ps.batch_registry_id IS NOT NULL
GROUP BY br.id, br.batch_number, ps.strain_id, s.name

UNION ALL

-- =====================================================
-- BUCKING SESSIONS - Unpivoted by output type
-- =====================================================
SELECT
  md5(br.id::text || '-' || COALESCE(product_id::text, 'null') || '-bucking')::uuid as aggregation_id,
  'bucking' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  br.strain_id,
  s.name as strain_name,
  product_id,
  product_name,
  SUM(output_weight) as output_weight,
  NULL::integer as output_units,
  MIN(bs.completed_at) as first_completed_at,
  MAX(bs.completed_at) as last_completed_at,
  COUNT(bs.id) as session_count,
  array_agg(bs.id ORDER BY bs.completed_at) as session_ids,
  'pending'::finalization_status as finalization_status
FROM (
  -- Bucked flower outputs
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

  UNION ALL

  -- Bucked smalls outputs
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
GROUP BY br.id, br.batch_number, br.strain_id, s.name, product_id, product_name

ORDER BY last_completed_at DESC;

-- =====================================================
-- STEP 3: Add comment and permissions
-- =====================================================

COMMENT ON VIEW pending_conversion_sessions IS
'Aggregated pending conversions grouped by batch + product.
Sessions with multiple output types (e.g., flower + smalls) are UNPIVOTED into separate rows.
Each product type gets its own bucket for proper tracking and finalization.
Multiple sessions with same batch+product are aggregated.
session_ids array tracks all source sessions.
session_count shows how many sessions were aggregated.';

GRANT SELECT ON pending_conversion_sessions TO authenticated;
GRANT SELECT ON pending_conversion_sessions TO anon;
