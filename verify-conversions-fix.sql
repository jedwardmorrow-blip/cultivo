/*
  Verification Script for Conversions System Fix
  Run this to verify the aggregation trigger is working correctly
*/

-- =====================================================
-- 1. Check Trigger Exists
-- =====================================================

SELECT
  tgname as trigger_name,
  tgtype as trigger_type,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname LIKE '%aggregate_pending%'
ORDER BY tgname;

-- Expected: 2 triggers (insert and update)

-- =====================================================
-- 2. Check Pending Conversions
-- =====================================================

SELECT
  pc.id,
  pc.session_type,
  pc.original_weight,
  pc.remaining_weight,
  pc.status,
  pc.created_at,
  ts.session_number as trim_session,
  ps.session_number as packaging_session
FROM pending_conversions pc
LEFT JOIN trim_sessions ts ON pc.session_id = ts.id AND pc.session_type = 'trim'
LEFT JOIN packaging_sessions ps ON pc.session_id = ps.id AND pc.session_type = 'packaging'
WHERE pc.status IN ('pending', 'converting')
ORDER BY pc.created_at DESC
LIMIT 10;

-- Shows active pending conversions awaiting manager review

-- =====================================================
-- 3. Check Conversion Lots
-- =====================================================

SELECT
  cl.lot_id,
  cl.batch_name,
  cl.strain_name,
  cl.product_name,
  cl.total_weight,
  cl.remaining_weight,
  cl.contributing_session_count,
  cl.status,
  cl.is_locked
FROM get_conversion_lot_summary(CURRENT_DATE) cl
ORDER BY cl.batch_name, cl.product_name;

-- Shows aggregated conversion lots visible to managers

-- =====================================================
-- 4. Verify Aggregation Correctness
-- =====================================================

-- Compare pending_conversions totals to conversion_lots totals
WITH pending_totals AS (
  SELECT
    batch_id,
    product_id,
    SUM(remaining_weight) as total_pending_weight,
    COUNT(DISTINCT session_id) as total_sessions
  FROM pending_conversions
  WHERE status IN ('pending', 'converting')
    AND DATE(created_at) = CURRENT_DATE
  GROUP BY batch_id, product_id
),
lot_totals AS (
  SELECT
    batch_id,
    product_id,
    remaining_weight as total_lot_weight,
    contributing_session_count as total_sessions
  FROM conversion_lots
  WHERE lot_date = CURRENT_DATE
)
SELECT
  COALESCE(p.batch_id, l.batch_id) as batch_id,
  COALESCE(p.product_id, l.product_id) as product_id,
  p.total_pending_weight,
  l.total_lot_weight,
  p.total_sessions as pending_sessions,
  l.total_sessions as lot_sessions,
  CASE
    WHEN p.total_pending_weight = l.total_lot_weight
      AND p.total_sessions = l.total_sessions
    THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as verification
FROM pending_totals p
FULL OUTER JOIN lot_totals l
  ON p.batch_id = l.batch_id AND p.product_id = l.product_id
ORDER BY verification DESC, batch_id;

-- Expected: All rows show ✅ MATCH

-- =====================================================
-- 5. Check Recent Session Completions
-- =====================================================

-- Recent trim sessions
SELECT
  id,
  session_number,
  strain,
  batch_number,
  session_status,
  bucked_weight_grams,
  bucked_smalls_grams,
  completed_at
FROM trim_sessions
WHERE session_status = 'completed'
ORDER BY completed_at DESC NULLS LAST
LIMIT 5;

-- Recent packaging sessions
SELECT
  id,
  session_number,
  product_name,
  session_status,
  output_units,
  completed_at
FROM packaging_sessions
WHERE session_status = 'completed'
ORDER BY completed_at DESC NULLS LAST
LIMIT 5;

-- =====================================================
-- 6. Test End-to-End Flow
-- =====================================================

-- Show complete flow for a batch
WITH batch_sessions AS (
  SELECT
    ts.id,
    ts.session_number,
    ts.batch_number,
    ts.session_status,
    ts.bucked_weight_grams,
    ts.completed_at,
    br.id as batch_registry_id
  FROM trim_sessions ts
  LEFT JOIN batch_registry br ON ts.batch_number = br.batch_number
  WHERE ts.session_status = 'completed'
  ORDER BY ts.completed_at DESC
  LIMIT 1
)
SELECT
  '1. Session' as step,
  bs.session_number as detail,
  bs.bucked_weight_grams::text as value
FROM batch_sessions bs

UNION ALL

SELECT
  '2. Pending Conversion' as step,
  pc.id::text as detail,
  pc.original_weight::text as value
FROM batch_sessions bs
JOIN pending_conversions pc ON pc.session_id = bs.id

UNION ALL

SELECT
  '3. Conversion Lot' as step,
  cl.id::text as detail,
  cl.total_weight::text as value
FROM batch_sessions bs
JOIN pending_conversions pc ON pc.session_id = bs.id
JOIN conversion_lots cl ON cl.batch_id = pc.batch_id AND cl.product_id = pc.product_id;

-- Shows complete chain: session → pending → lot

-- =====================================================
-- Summary Stats
-- =====================================================

SELECT
  'Pending Conversions' as metric,
  COUNT(*)::text as count,
  COALESCE(SUM(remaining_weight), 0)::text || 'g' as total_weight
FROM pending_conversions
WHERE status IN ('pending', 'converting')

UNION ALL

SELECT
  'Conversion Lots (Today)' as metric,
  COUNT(*)::text as count,
  COALESCE(SUM(remaining_weight), 0)::text || 'g' as total_weight
FROM conversion_lots
WHERE lot_date = CURRENT_DATE

UNION ALL

SELECT
  'Active Locks' as metric,
  COUNT(*)::text as count,
  '' as total_weight
FROM conversion_locks
WHERE expires_at > now();
