/*
  # Fix Broken available_qty Bug - Data Repair

  ## Problem
  On 2026-01-15, a code bug caused 3 bucked flower packages to be created with
  `available_qty = 0` despite having correct `on_hand_qty` values. This made
  8,920 grams of bucked flower invisible to the conversion/packaging system.

  **Affected Packages:**
  - 260115-ASU-001: 3120g bucked flower (available_qty was 0, should be 3120)
  - 260115-ASU-002: 2200g bucked flower (available_qty was 0, should be 2200)
  - 260115-DOG-001: 2600g bucked flower (available_qty was 0, should be 2600)
  - Total impact: 8,920 grams invisible

  ## Root Cause
  Historical bug in conversion finalization code (since fixed). Packages were
  created with `available_qty: 0` instead of `available_qty: quantity`.
  Current code (conversions.service.ts:379) is correct.

  ## ATP Architecture
  Per INVENTORY-TRACKING.md (lines 552-608, 880-903):
  - available_qty = on_hand_qty - reserved_qty (ATP formula)
  - For new packages: available_qty should equal on_hand_qty (no reservations yet)
  - Current code correctly sets: available_qty = quantity, on_hand_qty = 0 (let trigger set)

  ## This Migration
  1. Repairs 3 affected packages by setting available_qty = on_hand_qty
  2. Scans for any other affected packages system-wide
  3. Logs all corrections to variance_log for audit trail
  4. Provides query to verify fix

  ## Safety
  - Only updates packages where available_qty = 0 AND on_hand_qty > 0 AND reserved_qty = 0
  - Creates audit trail via variance_log
  - Idempotent (can be run multiple times safely)

  ## Session Reference
  - Session: AVAIL-QTY-FIX-001
  - Date: 2026-01-21
  - Documentation: AI-Build-Sessions/AVAIL-QTY-FIX-001-SUMMARY.md
*/

-- =====================================================
-- STEP 1: Scan for all affected packages
-- =====================================================

DO $$
DECLARE
  v_affected_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_affected_count
  FROM inventory_items
  WHERE on_hand_qty > 0
    AND available_qty = 0
    AND COALESCE(reserved_qty, 0) = 0;

  RAISE NOTICE 'Found % packages with broken available_qty', v_affected_count;
END $$;

-- =====================================================
-- STEP 2: Create variance_log entries for audit trail
-- =====================================================

INSERT INTO variance_log (
  source_type,
  source_id,
  inventory_item_id,
  package_id,
  expected_qty,
  actual_qty,
  variance_qty,
  variance_percentage,
  variance_reason,
  notes,
  unit,
  inventory_stage,
  strain,
  batch,
  product_name,
  timestamp,
  created_at
)
SELECT
  'manual_adjustment',
  id,
  id,
  package_id,
  0, -- expected (what was in database)
  on_hand_qty, -- actual (what it should be)
  on_hand_qty, -- variance (positive = adding inventory)
  100.0, -- 100% variance (0 -> actual value)
  'other',
  'AUTOMATED DATA CORRECTION: available_qty bug repair (2026-01-15). Package created with available_qty=0 when it should have been '
    || on_hand_qty || 'g. Root cause: historical code bug (now fixed). Session: AVAIL-QTY-FIX-001',
  unit,
  category,
  strain,
  batch_number,
  product_name,
  NOW(),
  NOW()
FROM inventory_items
WHERE on_hand_qty > 0
  AND available_qty = 0
  AND COALESCE(reserved_qty, 0) = 0;

-- =====================================================
-- STEP 3: Repair available_qty values
-- =====================================================

UPDATE inventory_items
SET
  available_qty = on_hand_qty,
  last_updated = NOW()
WHERE on_hand_qty > 0
  AND available_qty = 0
  AND COALESCE(reserved_qty, 0) = 0;

-- =====================================================
-- STEP 4: Report results
-- =====================================================

DO $$
DECLARE
  v_repaired_count INTEGER;
  v_total_weight NUMERIC;
BEGIN
  -- Count repaired packages
  SELECT COUNT(*)
  INTO v_repaired_count
  FROM variance_log
  WHERE variance_reason = 'other'
    AND notes LIKE '%AVAIL-QTY-FIX-001%'
    AND created_at >= NOW() - INTERVAL '1 minute';

  -- Calculate total weight restored
  SELECT COALESCE(SUM(variance_qty), 0)
  INTO v_total_weight
  FROM variance_log
  WHERE variance_reason = 'other'
    AND notes LIKE '%AVAIL-QTY-FIX-001%'
    AND created_at >= NOW() - INTERVAL '1 minute';

  RAISE NOTICE '================================';
  RAISE NOTICE 'AVAILABLE_QTY REPAIR COMPLETE';
  RAISE NOTICE '================================';
  RAISE NOTICE 'Packages repaired: %', v_repaired_count;
  RAISE NOTICE 'Total weight restored: %g', v_total_weight;
  RAISE NOTICE 'Audit trail: variance_log table';
  RAISE NOTICE 'Session: AVAIL-QTY-FIX-001';
END $$;

-- =====================================================
-- STEP 5: Verification query
-- =====================================================

COMMENT ON TABLE variance_log IS
'Audit trail for inventory variance corrections. See entries with notes containing AVAIL-QTY-FIX-001 for the 2026-01-21 bug fix.';

-- Create helper view for verification
CREATE OR REPLACE VIEW inventory_qty_health AS
SELECT
  package_id,
  product_name,
  batch_number,
  on_hand_qty,
  available_qty,
  COALESCE(reserved_qty, 0) as reserved_qty,
  (on_hand_qty - COALESCE(reserved_qty, 0)) as expected_available_qty,
  CASE
    WHEN available_qty != (on_hand_qty - COALESCE(reserved_qty, 0)) THEN 'MISMATCH'
    ELSE 'OK'
  END as health_status,
  last_updated
FROM inventory_items
WHERE on_hand_qty > 0
ORDER BY
  CASE
    WHEN available_qty != (on_hand_qty - COALESCE(reserved_qty, 0)) THEN 0
    ELSE 1
  END,
  last_updated DESC;

COMMENT ON VIEW inventory_qty_health IS
'Health check view for ATP consistency. Shows any packages where available_qty != (on_hand_qty - reserved_qty).
Used for monitoring and detecting future ATP calculation issues.';

GRANT SELECT ON inventory_qty_health TO authenticated;
