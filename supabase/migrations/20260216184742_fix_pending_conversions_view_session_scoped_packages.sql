/*
  # Fix pending_conversion_sessions VIEW - session-scoped package subtraction

  ## Problem
  Two bugs in the VIEW:
  1. LEFT JOIN to conversion_packages caused row multiplication when multiple
     packages matched session rows (fixed in previous migration by using
     scalar subqueries)
  2. Scalar subqueries summed ALL packages for the aggregation_id, including
     packages from already-finalized sessions. This over-subtracted, causing
     pending sessions to show negative remaining (filtered out by HAVING).

  ## Root Cause
  The aggregation_id groups all sessions with the same batch + product_name +
  session_type. When some sessions are finalized and others are pending, their
  packages share the same aggregation_id. The VIEW must only subtract packages
  whose source_session_ids reference sessions that are still pending.

  ## Fix
  Added `source_session_ids ?|` filter to each scalar subquery. This JSONB
  operator checks if the package's source_session_ids array contains ANY of
  the pending session IDs for the current group. A correlated subquery
  collects the pending session IDs matching the outer query's GROUP BY columns.

  ## Verification
  SWF Bucked Flower: 3 sessions (600g + 900g + 800g), session 195fdd62 (600g)
  incorrectly finalized. Pending sessions: 900g + 800g = 1700g.
  Packages from pending sessions: 260216-SWF-001 (400g) + 260216-SWF-002 (400g) = 800g.
  Expected remaining: 1700 - 800 = 900g.

  ## Changes
  - All 8 UNION ALL branches: added source_session_ids ?| filter
  - No RLS changes (VIEW inherits caller permissions)
*/

CREATE OR REPLACE VIEW pending_conversion_sessions AS

-- =====================================================
-- Branch 1: Trim Sessions - Big Buds (Flower)
-- =====================================================
SELECT
  md5(br.id::text || '-' || ts.output_product_bigs_name || '-trim')::uuid AS aggregation_id,
  'trim'::text AS session_type,
  br.id AS batch_id,
  br.batch_number AS batch_name,
  ts.strain_id,
  s.name AS strain_name,
  NULL::uuid AS product_id,
  ts.output_product_bigs_name AS product_name,
  SUM(ts.big_buds_grams) - COALESCE(
    (SELECT SUM(cp.weight) FROM conversion_packages cp
     WHERE cp.aggregation_id = md5(br.id::text || '-' || ts.output_product_bigs_name || '-trim')::uuid
       AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
       AND cp.source_session_ids ?| (
         SELECT COALESCE(array_agg(ts2.id::text), ARRAY[]::text[])
         FROM trim_sessions ts2
         WHERE ts2.batch_registry_id = br.id
           AND ts2.output_product_bigs_name = ts.output_product_bigs_name
           AND ts2.finalization_status_bigs = 'pending'::finalization_status
           AND ts2.session_status = 'completed'
           AND ts2.completed_at IS NOT NULL
           AND COALESCE(ts2.big_buds_grams, 0::numeric) > 0::numeric
       )),
    0
  ) AS output_weight,
  NULL::integer AS output_units,
  MIN(ts.completed_at) AS first_completed_at,
  MAX(ts.completed_at) AS last_completed_at,
  COUNT(DISTINCT ts.id) AS session_count,
  array_agg(DISTINCT ts.id ORDER BY ts.id) AS session_ids,
  'pending'::finalization_status AS finalization_status,
  EXISTS(
    SELECT 1 FROM conversion_packages cp
    WHERE cp.aggregation_id = md5(br.id::text || '-' || ts.output_product_bigs_name || '-trim')::uuid
      AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
      AND cp.source_session_ids ?| (
        SELECT COALESCE(array_agg(ts2.id::text), ARRAY[]::text[])
        FROM trim_sessions ts2
        WHERE ts2.batch_registry_id = br.id
          AND ts2.output_product_bigs_name = ts.output_product_bigs_name
          AND ts2.finalization_status_bigs = 'pending'::finalization_status
          AND ts2.session_status = 'completed'
          AND ts2.completed_at IS NOT NULL
          AND COALESCE(ts2.big_buds_grams, 0::numeric) > 0::numeric
      )
  ) AS has_partial_packages
FROM trim_sessions ts
  JOIN batch_registry br ON ts.batch_registry_id = br.id
  LEFT JOIN strains s ON ts.strain_id = s.id
WHERE ts.session_status = 'completed'::text
  AND ts.completed_at IS NOT NULL
  AND ts.finalization_status_bigs = 'pending'::finalization_status
  AND ts.batch_registry_id IS NOT NULL
  AND COALESCE(ts.big_buds_grams, 0::numeric) > 0::numeric
  AND ts.output_product_bigs_name IS NOT NULL
GROUP BY br.id, br.batch_number, ts.strain_id, s.name, ts.output_product_bigs_name
HAVING SUM(ts.big_buds_grams) - COALESCE(
  (SELECT SUM(cp.weight) FROM conversion_packages cp
   WHERE cp.aggregation_id = md5(br.id::text || '-' || ts.output_product_bigs_name || '-trim')::uuid
     AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
     AND cp.source_session_ids ?| (
       SELECT COALESCE(array_agg(ts2.id::text), ARRAY[]::text[])
       FROM trim_sessions ts2
       WHERE ts2.batch_registry_id = br.id
         AND ts2.output_product_bigs_name = ts.output_product_bigs_name
         AND ts2.finalization_status_bigs = 'pending'::finalization_status
         AND ts2.session_status = 'completed'
         AND ts2.completed_at IS NOT NULL
         AND COALESCE(ts2.big_buds_grams, 0::numeric) > 0::numeric
     )),
  0
) > 0::numeric

UNION ALL

-- =====================================================
-- Branch 2: Trim Sessions - Small Buds (Smalls)
-- =====================================================
SELECT
  md5(br.id::text || '-' || ts.output_product_smalls_name || '-trim')::uuid AS aggregation_id,
  'trim'::text AS session_type,
  br.id AS batch_id,
  br.batch_number AS batch_name,
  ts.strain_id,
  s.name AS strain_name,
  NULL::uuid AS product_id,
  ts.output_product_smalls_name AS product_name,
  SUM(ts.small_buds_grams) - COALESCE(
    (SELECT SUM(cp.weight) FROM conversion_packages cp
     WHERE cp.aggregation_id = md5(br.id::text || '-' || ts.output_product_smalls_name || '-trim')::uuid
       AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
       AND cp.source_session_ids ?| (
         SELECT COALESCE(array_agg(ts2.id::text), ARRAY[]::text[])
         FROM trim_sessions ts2
         WHERE ts2.batch_registry_id = br.id
           AND ts2.output_product_smalls_name = ts.output_product_smalls_name
           AND ts2.finalization_status_smalls = 'pending'::finalization_status
           AND ts2.session_status = 'completed'
           AND ts2.completed_at IS NOT NULL
           AND COALESCE(ts2.small_buds_grams, 0::numeric) > 0::numeric
       )),
    0
  ) AS output_weight,
  NULL::integer AS output_units,
  MIN(ts.completed_at) AS first_completed_at,
  MAX(ts.completed_at) AS last_completed_at,
  COUNT(DISTINCT ts.id) AS session_count,
  array_agg(DISTINCT ts.id ORDER BY ts.id) AS session_ids,
  'pending'::finalization_status AS finalization_status,
  EXISTS(
    SELECT 1 FROM conversion_packages cp
    WHERE cp.aggregation_id = md5(br.id::text || '-' || ts.output_product_smalls_name || '-trim')::uuid
      AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
      AND cp.source_session_ids ?| (
        SELECT COALESCE(array_agg(ts2.id::text), ARRAY[]::text[])
        FROM trim_sessions ts2
        WHERE ts2.batch_registry_id = br.id
          AND ts2.output_product_smalls_name = ts.output_product_smalls_name
          AND ts2.finalization_status_smalls = 'pending'::finalization_status
          AND ts2.session_status = 'completed'
          AND ts2.completed_at IS NOT NULL
          AND COALESCE(ts2.small_buds_grams, 0::numeric) > 0::numeric
      )
  ) AS has_partial_packages
FROM trim_sessions ts
  JOIN batch_registry br ON ts.batch_registry_id = br.id
  LEFT JOIN strains s ON ts.strain_id = s.id
WHERE ts.session_status = 'completed'::text
  AND ts.completed_at IS NOT NULL
  AND ts.finalization_status_smalls = 'pending'::finalization_status
  AND ts.batch_registry_id IS NOT NULL
  AND COALESCE(ts.small_buds_grams, 0::numeric) > 0::numeric
  AND ts.output_product_smalls_name IS NOT NULL
GROUP BY br.id, br.batch_number, ts.strain_id, s.name, ts.output_product_smalls_name
HAVING SUM(ts.small_buds_grams) - COALESCE(
  (SELECT SUM(cp.weight) FROM conversion_packages cp
   WHERE cp.aggregation_id = md5(br.id::text || '-' || ts.output_product_smalls_name || '-trim')::uuid
     AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
     AND cp.source_session_ids ?| (
       SELECT COALESCE(array_agg(ts2.id::text), ARRAY[]::text[])
       FROM trim_sessions ts2
       WHERE ts2.batch_registry_id = br.id
         AND ts2.output_product_smalls_name = ts.output_product_smalls_name
         AND ts2.finalization_status_smalls = 'pending'::finalization_status
         AND ts2.session_status = 'completed'
         AND ts2.completed_at IS NOT NULL
         AND COALESCE(ts2.small_buds_grams, 0::numeric) > 0::numeric
     )),
  0
) > 0::numeric

UNION ALL

-- =====================================================
-- Branch 3: Trim Sessions - Trim
-- =====================================================
SELECT
  md5(br.id::text || '-' || ts.output_product_trim_name || '-trim')::uuid AS aggregation_id,
  'trim'::text AS session_type,
  br.id AS batch_id,
  br.batch_number AS batch_name,
  ts.strain_id,
  s.name AS strain_name,
  NULL::uuid AS product_id,
  ts.output_product_trim_name AS product_name,
  SUM(ts.trim_grams) - COALESCE(
    (SELECT SUM(cp.weight) FROM conversion_packages cp
     WHERE cp.aggregation_id = md5(br.id::text || '-' || ts.output_product_trim_name || '-trim')::uuid
       AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
       AND cp.source_session_ids ?| (
         SELECT COALESCE(array_agg(ts2.id::text), ARRAY[]::text[])
         FROM trim_sessions ts2
         WHERE ts2.batch_registry_id = br.id
           AND ts2.output_product_trim_name = ts.output_product_trim_name
           AND ts2.finalization_status_trim = 'pending'::finalization_status
           AND ts2.session_status = 'completed'
           AND ts2.completed_at IS NOT NULL
           AND COALESCE(ts2.trim_grams, 0::numeric) > 0::numeric
       )),
    0
  ) AS output_weight,
  NULL::integer AS output_units,
  MIN(ts.completed_at) AS first_completed_at,
  MAX(ts.completed_at) AS last_completed_at,
  COUNT(DISTINCT ts.id) AS session_count,
  array_agg(DISTINCT ts.id ORDER BY ts.id) AS session_ids,
  'pending'::finalization_status AS finalization_status,
  EXISTS(
    SELECT 1 FROM conversion_packages cp
    WHERE cp.aggregation_id = md5(br.id::text || '-' || ts.output_product_trim_name || '-trim')::uuid
      AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
      AND cp.source_session_ids ?| (
        SELECT COALESCE(array_agg(ts2.id::text), ARRAY[]::text[])
        FROM trim_sessions ts2
        WHERE ts2.batch_registry_id = br.id
          AND ts2.output_product_trim_name = ts.output_product_trim_name
          AND ts2.finalization_status_trim = 'pending'::finalization_status
          AND ts2.session_status = 'completed'
          AND ts2.completed_at IS NOT NULL
          AND COALESCE(ts2.trim_grams, 0::numeric) > 0::numeric
      )
  ) AS has_partial_packages
FROM trim_sessions ts
  JOIN batch_registry br ON ts.batch_registry_id = br.id
  LEFT JOIN strains s ON ts.strain_id = s.id
WHERE ts.session_status = 'completed'::text
  AND ts.completed_at IS NOT NULL
  AND ts.finalization_status_trim = 'pending'::finalization_status
  AND ts.batch_registry_id IS NOT NULL
  AND COALESCE(ts.trim_grams, 0::numeric) > 0::numeric
  AND ts.output_product_trim_name IS NOT NULL
GROUP BY br.id, br.batch_number, ts.strain_id, s.name, ts.output_product_trim_name
HAVING SUM(ts.trim_grams) - COALESCE(
  (SELECT SUM(cp.weight) FROM conversion_packages cp
   WHERE cp.aggregation_id = md5(br.id::text || '-' || ts.output_product_trim_name || '-trim')::uuid
     AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
     AND cp.source_session_ids ?| (
       SELECT COALESCE(array_agg(ts2.id::text), ARRAY[]::text[])
       FROM trim_sessions ts2
       WHERE ts2.batch_registry_id = br.id
         AND ts2.output_product_trim_name = ts.output_product_trim_name
         AND ts2.finalization_status_trim = 'pending'::finalization_status
         AND ts2.session_status = 'completed'
         AND ts2.completed_at IS NOT NULL
         AND COALESCE(ts2.trim_grams, 0::numeric) > 0::numeric
     )),
  0
) > 0::numeric

UNION ALL

-- =====================================================
-- Branch 4: Packaging Sessions - 3.5g
-- =====================================================
SELECT
  md5(br.id::text || '-' || ps.output_product_3_5g_name || '-packaging')::uuid AS aggregation_id,
  'packaging'::text AS session_type,
  br.id AS batch_id,
  br.batch_number AS batch_name,
  ps.strain_id,
  s.name AS strain_name,
  NULL::uuid AS product_id,
  ps.output_product_3_5g_name AS product_name,
  NULL::numeric AS output_weight,
  (SUM(COALESCE(ps.units_3_5g, 0)) - COALESCE(
    (SELECT SUM(cp.units) FROM conversion_packages cp
     WHERE cp.aggregation_id = md5(br.id::text || '-' || ps.output_product_3_5g_name || '-packaging')::uuid
       AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
       AND cp.source_session_ids ?| (
         SELECT COALESCE(array_agg(ps2.id::text), ARRAY[]::text[])
         FROM packaging_sessions ps2
         WHERE ps2.batch_registry_id = br.id
           AND ps2.output_product_3_5g_name = ps.output_product_3_5g_name
           AND ps2.finalization_status_3_5g = 'pending'
           AND ps2.session_status = 'completed'
           AND ps2.completed_at IS NOT NULL
           AND COALESCE(ps2.units_3_5g, 0) > 0
       )),
    0
  ))::integer AS output_units,
  MIN(ps.completed_at) AS first_completed_at,
  MAX(ps.completed_at) AS last_completed_at,
  COUNT(DISTINCT ps.id) AS session_count,
  array_agg(DISTINCT ps.id ORDER BY ps.id) AS session_ids,
  'pending'::finalization_status AS finalization_status,
  EXISTS(
    SELECT 1 FROM conversion_packages cp
    WHERE cp.aggregation_id = md5(br.id::text || '-' || ps.output_product_3_5g_name || '-packaging')::uuid
      AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
      AND cp.source_session_ids ?| (
        SELECT COALESCE(array_agg(ps2.id::text), ARRAY[]::text[])
        FROM packaging_sessions ps2
        WHERE ps2.batch_registry_id = br.id
          AND ps2.output_product_3_5g_name = ps.output_product_3_5g_name
          AND ps2.finalization_status_3_5g = 'pending'
          AND ps2.session_status = 'completed'
          AND ps2.completed_at IS NOT NULL
          AND COALESCE(ps2.units_3_5g, 0) > 0
      )
  ) AS has_partial_packages
FROM packaging_sessions ps
  JOIN batch_registry br ON ps.batch_registry_id = br.id
  LEFT JOIN strains s ON ps.strain_id = s.id
WHERE ps.session_status = 'completed'::text
  AND ps.completed_at IS NOT NULL
  AND ps.finalization_status_3_5g = 'pending'::text
  AND ps.batch_registry_id IS NOT NULL
  AND COALESCE(ps.units_3_5g, 0) > 0
  AND ps.output_product_3_5g_name IS NOT NULL
GROUP BY br.id, br.batch_number, ps.strain_id, s.name, ps.output_product_3_5g_name
HAVING SUM(COALESCE(ps.units_3_5g, 0)) - COALESCE(
  (SELECT SUM(cp.units) FROM conversion_packages cp
   WHERE cp.aggregation_id = md5(br.id::text || '-' || ps.output_product_3_5g_name || '-packaging')::uuid
     AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
     AND cp.source_session_ids ?| (
       SELECT COALESCE(array_agg(ps2.id::text), ARRAY[]::text[])
       FROM packaging_sessions ps2
       WHERE ps2.batch_registry_id = br.id
         AND ps2.output_product_3_5g_name = ps.output_product_3_5g_name
         AND ps2.finalization_status_3_5g = 'pending'
         AND ps2.session_status = 'completed'
         AND ps2.completed_at IS NOT NULL
         AND COALESCE(ps2.units_3_5g, 0) > 0
     )),
  0
) > 0

UNION ALL

-- =====================================================
-- Branch 5: Packaging Sessions - 14g
-- =====================================================
SELECT
  md5(br.id::text || '-' || ps.output_product_14g_name || '-packaging')::uuid AS aggregation_id,
  'packaging'::text AS session_type,
  br.id AS batch_id,
  br.batch_number AS batch_name,
  ps.strain_id,
  s.name AS strain_name,
  NULL::uuid AS product_id,
  ps.output_product_14g_name AS product_name,
  NULL::numeric AS output_weight,
  (SUM(COALESCE(ps.units_14g, 0)) - COALESCE(
    (SELECT SUM(cp.units) FROM conversion_packages cp
     WHERE cp.aggregation_id = md5(br.id::text || '-' || ps.output_product_14g_name || '-packaging')::uuid
       AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
       AND cp.source_session_ids ?| (
         SELECT COALESCE(array_agg(ps2.id::text), ARRAY[]::text[])
         FROM packaging_sessions ps2
         WHERE ps2.batch_registry_id = br.id
           AND ps2.output_product_14g_name = ps.output_product_14g_name
           AND ps2.finalization_status_14g = 'pending'
           AND ps2.session_status = 'completed'
           AND ps2.completed_at IS NOT NULL
           AND COALESCE(ps2.units_14g, 0) > 0
       )),
    0
  ))::integer AS output_units,
  MIN(ps.completed_at) AS first_completed_at,
  MAX(ps.completed_at) AS last_completed_at,
  COUNT(DISTINCT ps.id) AS session_count,
  array_agg(DISTINCT ps.id ORDER BY ps.id) AS session_ids,
  'pending'::finalization_status AS finalization_status,
  EXISTS(
    SELECT 1 FROM conversion_packages cp
    WHERE cp.aggregation_id = md5(br.id::text || '-' || ps.output_product_14g_name || '-packaging')::uuid
      AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
      AND cp.source_session_ids ?| (
        SELECT COALESCE(array_agg(ps2.id::text), ARRAY[]::text[])
        FROM packaging_sessions ps2
        WHERE ps2.batch_registry_id = br.id
          AND ps2.output_product_14g_name = ps.output_product_14g_name
          AND ps2.finalization_status_14g = 'pending'
          AND ps2.session_status = 'completed'
          AND ps2.completed_at IS NOT NULL
          AND COALESCE(ps2.units_14g, 0) > 0
      )
  ) AS has_partial_packages
FROM packaging_sessions ps
  JOIN batch_registry br ON ps.batch_registry_id = br.id
  LEFT JOIN strains s ON ps.strain_id = s.id
WHERE ps.session_status = 'completed'::text
  AND ps.completed_at IS NOT NULL
  AND ps.finalization_status_14g = 'pending'::text
  AND ps.batch_registry_id IS NOT NULL
  AND COALESCE(ps.units_14g, 0) > 0
  AND ps.output_product_14g_name IS NOT NULL
GROUP BY br.id, br.batch_number, ps.strain_id, s.name, ps.output_product_14g_name
HAVING SUM(COALESCE(ps.units_14g, 0)) - COALESCE(
  (SELECT SUM(cp.units) FROM conversion_packages cp
   WHERE cp.aggregation_id = md5(br.id::text || '-' || ps.output_product_14g_name || '-packaging')::uuid
     AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
     AND cp.source_session_ids ?| (
       SELECT COALESCE(array_agg(ps2.id::text), ARRAY[]::text[])
       FROM packaging_sessions ps2
       WHERE ps2.batch_registry_id = br.id
         AND ps2.output_product_14g_name = ps.output_product_14g_name
         AND ps2.finalization_status_14g = 'pending'
         AND ps2.session_status = 'completed'
         AND ps2.completed_at IS NOT NULL
         AND COALESCE(ps2.units_14g, 0) > 0
     )),
  0
) > 0

UNION ALL

-- =====================================================
-- Branch 6: Packaging Sessions - 1lb (454g)
-- =====================================================
SELECT
  md5(br.id::text || '-' || ps.output_product_1lb_name || '-packaging')::uuid AS aggregation_id,
  'packaging'::text AS session_type,
  br.id AS batch_id,
  br.batch_number AS batch_name,
  ps.strain_id,
  s.name AS strain_name,
  NULL::uuid AS product_id,
  ps.output_product_1lb_name AS product_name,
  NULL::numeric AS output_weight,
  (SUM(COALESCE(ps.units_454g, 0)) - COALESCE(
    (SELECT SUM(cp.units) FROM conversion_packages cp
     WHERE cp.aggregation_id = md5(br.id::text || '-' || ps.output_product_1lb_name || '-packaging')::uuid
       AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
       AND cp.source_session_ids ?| (
         SELECT COALESCE(array_agg(ps2.id::text), ARRAY[]::text[])
         FROM packaging_sessions ps2
         WHERE ps2.batch_registry_id = br.id
           AND ps2.output_product_1lb_name = ps.output_product_1lb_name
           AND ps2.finalization_status_1lb = 'pending'
           AND ps2.session_status = 'completed'
           AND ps2.completed_at IS NOT NULL
           AND COALESCE(ps2.units_454g, 0) > 0
       )),
    0
  ))::integer AS output_units,
  MIN(ps.completed_at) AS first_completed_at,
  MAX(ps.completed_at) AS last_completed_at,
  COUNT(DISTINCT ps.id) AS session_count,
  array_agg(DISTINCT ps.id ORDER BY ps.id) AS session_ids,
  'pending'::finalization_status AS finalization_status,
  EXISTS(
    SELECT 1 FROM conversion_packages cp
    WHERE cp.aggregation_id = md5(br.id::text || '-' || ps.output_product_1lb_name || '-packaging')::uuid
      AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
      AND cp.source_session_ids ?| (
        SELECT COALESCE(array_agg(ps2.id::text), ARRAY[]::text[])
        FROM packaging_sessions ps2
        WHERE ps2.batch_registry_id = br.id
          AND ps2.output_product_1lb_name = ps.output_product_1lb_name
          AND ps2.finalization_status_1lb = 'pending'
          AND ps2.session_status = 'completed'
          AND ps2.completed_at IS NOT NULL
          AND COALESCE(ps2.units_454g, 0) > 0
      )
  ) AS has_partial_packages
FROM packaging_sessions ps
  JOIN batch_registry br ON ps.batch_registry_id = br.id
  LEFT JOIN strains s ON ps.strain_id = s.id
WHERE ps.session_status = 'completed'::text
  AND ps.completed_at IS NOT NULL
  AND ps.finalization_status_1lb = 'pending'::text
  AND ps.batch_registry_id IS NOT NULL
  AND COALESCE(ps.units_454g, 0) > 0
  AND ps.output_product_1lb_name IS NOT NULL
GROUP BY br.id, br.batch_number, ps.strain_id, s.name, ps.output_product_1lb_name
HAVING SUM(COALESCE(ps.units_454g, 0)) - COALESCE(
  (SELECT SUM(cp.units) FROM conversion_packages cp
   WHERE cp.aggregation_id = md5(br.id::text || '-' || ps.output_product_1lb_name || '-packaging')::uuid
     AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
     AND cp.source_session_ids ?| (
       SELECT COALESCE(array_agg(ps2.id::text), ARRAY[]::text[])
       FROM packaging_sessions ps2
       WHERE ps2.batch_registry_id = br.id
         AND ps2.output_product_1lb_name = ps.output_product_1lb_name
         AND ps2.finalization_status_1lb = 'pending'
         AND ps2.session_status = 'completed'
         AND ps2.completed_at IS NOT NULL
         AND COALESCE(ps2.units_454g, 0) > 0
     )),
  0
) > 0

UNION ALL

-- =====================================================
-- Branch 7: Bucking Sessions - Flower
-- =====================================================
SELECT
  md5(br.id::text || '-' || bs.output_product_flower_name || '-bucking')::uuid AS aggregation_id,
  'bucking'::text AS session_type,
  br.id AS batch_id,
  br.batch_number AS batch_name,
  br.strain_id,
  s.name AS strain_name,
  NULL::uuid AS product_id,
  bs.output_product_flower_name AS product_name,
  SUM(bs.bucked_flower_grams) - COALESCE(
    (SELECT SUM(cp.weight) FROM conversion_packages cp
     WHERE cp.aggregation_id = md5(br.id::text || '-' || bs.output_product_flower_name || '-bucking')::uuid
       AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
       AND cp.source_session_ids ?| (
         SELECT COALESCE(array_agg(bs2.id::text), ARRAY[]::text[])
         FROM bucking_sessions bs2
         WHERE bs2.batch_registry_id = br.id
           AND bs2.output_product_flower_name = bs.output_product_flower_name
           AND bs2.finalization_status_bucked = 'pending'::finalization_status
           AND bs2.session_status = 'completed'
           AND bs2.completed_at IS NOT NULL
           AND COALESCE(bs2.bucked_flower_grams, 0::numeric) > 0::numeric
       )),
    0
  ) AS output_weight,
  NULL::integer AS output_units,
  MIN(bs.completed_at) AS first_completed_at,
  MAX(bs.completed_at) AS last_completed_at,
  COUNT(DISTINCT bs.id) AS session_count,
  array_agg(DISTINCT bs.id ORDER BY bs.id) AS session_ids,
  'pending'::finalization_status AS finalization_status,
  EXISTS(
    SELECT 1 FROM conversion_packages cp
    WHERE cp.aggregation_id = md5(br.id::text || '-' || bs.output_product_flower_name || '-bucking')::uuid
      AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
      AND cp.source_session_ids ?| (
        SELECT COALESCE(array_agg(bs2.id::text), ARRAY[]::text[])
        FROM bucking_sessions bs2
        WHERE bs2.batch_registry_id = br.id
          AND bs2.output_product_flower_name = bs.output_product_flower_name
          AND bs2.finalization_status_bucked = 'pending'::finalization_status
          AND bs2.session_status = 'completed'
          AND bs2.completed_at IS NOT NULL
          AND COALESCE(bs2.bucked_flower_grams, 0::numeric) > 0::numeric
      )
  ) AS has_partial_packages
FROM bucking_sessions bs
  JOIN batch_registry br ON bs.batch_registry_id = br.id
  LEFT JOIN strains s ON br.strain_id = s.id
WHERE bs.session_status = 'completed'::text
  AND bs.completed_at IS NOT NULL
  AND bs.finalization_status_bucked = 'pending'::finalization_status
  AND bs.batch_registry_id IS NOT NULL
  AND COALESCE(bs.bucked_flower_grams, 0::numeric) > 0::numeric
  AND bs.output_product_flower_name IS NOT NULL
GROUP BY br.id, br.batch_number, br.strain_id, s.name, bs.output_product_flower_name
HAVING SUM(bs.bucked_flower_grams) - COALESCE(
  (SELECT SUM(cp.weight) FROM conversion_packages cp
   WHERE cp.aggregation_id = md5(br.id::text || '-' || bs.output_product_flower_name || '-bucking')::uuid
     AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
     AND cp.source_session_ids ?| (
       SELECT COALESCE(array_agg(bs2.id::text), ARRAY[]::text[])
       FROM bucking_sessions bs2
       WHERE bs2.batch_registry_id = br.id
         AND bs2.output_product_flower_name = bs.output_product_flower_name
         AND bs2.finalization_status_bucked = 'pending'::finalization_status
         AND bs2.session_status = 'completed'
         AND bs2.completed_at IS NOT NULL
         AND COALESCE(bs2.bucked_flower_grams, 0::numeric) > 0::numeric
     )),
  0
) > 0::numeric

UNION ALL

-- =====================================================
-- Branch 8: Bucking Sessions - Smalls
-- =====================================================
SELECT
  md5(br.id::text || '-' || bs.output_product_smalls_name || '-bucking')::uuid AS aggregation_id,
  'bucking'::text AS session_type,
  br.id AS batch_id,
  br.batch_number AS batch_name,
  br.strain_id,
  s.name AS strain_name,
  NULL::uuid AS product_id,
  bs.output_product_smalls_name AS product_name,
  SUM(bs.bucked_smalls_grams) - COALESCE(
    (SELECT SUM(cp.weight) FROM conversion_packages cp
     WHERE cp.aggregation_id = md5(br.id::text || '-' || bs.output_product_smalls_name || '-bucking')::uuid
       AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
       AND cp.source_session_ids ?| (
         SELECT COALESCE(array_agg(bs2.id::text), ARRAY[]::text[])
         FROM bucking_sessions bs2
         WHERE bs2.batch_registry_id = br.id
           AND bs2.output_product_smalls_name = bs.output_product_smalls_name
           AND bs2.finalization_status_smalls = 'pending'::finalization_status
           AND bs2.session_status = 'completed'
           AND bs2.completed_at IS NOT NULL
           AND COALESCE(bs2.bucked_smalls_grams, 0::numeric) > 0::numeric
       )),
    0
  ) AS output_weight,
  NULL::integer AS output_units,
  MIN(bs.completed_at) AS first_completed_at,
  MAX(bs.completed_at) AS last_completed_at,
  COUNT(DISTINCT bs.id) AS session_count,
  array_agg(DISTINCT bs.id ORDER BY bs.id) AS session_ids,
  'pending'::finalization_status AS finalization_status,
  EXISTS(
    SELECT 1 FROM conversion_packages cp
    WHERE cp.aggregation_id = md5(br.id::text || '-' || bs.output_product_smalls_name || '-bucking')::uuid
      AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
      AND cp.source_session_ids ?| (
        SELECT COALESCE(array_agg(bs2.id::text), ARRAY[]::text[])
        FROM bucking_sessions bs2
        WHERE bs2.batch_registry_id = br.id
          AND bs2.output_product_smalls_name = bs.output_product_smalls_name
          AND bs2.finalization_status_smalls = 'pending'::finalization_status
          AND bs2.session_status = 'completed'
          AND bs2.completed_at IS NOT NULL
          AND COALESCE(bs2.bucked_smalls_grams, 0::numeric) > 0::numeric
      )
  ) AS has_partial_packages
FROM bucking_sessions bs
  JOIN batch_registry br ON bs.batch_registry_id = br.id
  LEFT JOIN strains s ON br.strain_id = s.id
WHERE bs.session_status = 'completed'::text
  AND bs.completed_at IS NOT NULL
  AND bs.finalization_status_smalls = 'pending'::finalization_status
  AND bs.batch_registry_id IS NOT NULL
  AND COALESCE(bs.bucked_smalls_grams, 0::numeric) > 0::numeric
  AND bs.output_product_smalls_name IS NOT NULL
GROUP BY br.id, br.batch_number, br.strain_id, s.name, bs.output_product_smalls_name
HAVING SUM(bs.bucked_smalls_grams) - COALESCE(
  (SELECT SUM(cp.weight) FROM conversion_packages cp
   WHERE cp.aggregation_id = md5(br.id::text || '-' || bs.output_product_smalls_name || '-bucking')::uuid
     AND cp.finalization_status IN ('pending'::finalization_status, 'finalized'::finalization_status)
     AND cp.source_session_ids ?| (
       SELECT COALESCE(array_agg(bs2.id::text), ARRAY[]::text[])
       FROM bucking_sessions bs2
       WHERE bs2.batch_registry_id = br.id
         AND bs2.output_product_smalls_name = bs.output_product_smalls_name
         AND bs2.finalization_status_smalls = 'pending'::finalization_status
         AND bs2.session_status = 'completed'
         AND bs2.completed_at IS NOT NULL
         AND COALESCE(bs2.bucked_smalls_grams, 0::numeric) > 0::numeric
     )),
  0
) > 0::numeric

ORDER BY last_completed_at DESC;
