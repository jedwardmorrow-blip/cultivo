/*
  # Batch 1: Critical Integrity Fixes - Comprehensive Verification
  
  ## Purpose
  Validates all constraints, triggers, and invariants added in Batch 1.
  Run this after applying all 6 migrations to STAGING.
  
  ## Expected Result
  All tests PASS. Any FAILUREs indicate migration issues requiring investigation.
  
  ## Usage
  psql $DATABASE_URL -f verify_batch1_all.sql
*/

\set ON_ERROR_STOP on
\timing on

-- =====================================================
-- TEST SUITE 1: Batch ID Integrity
-- =====================================================

\echo ''
\echo '========================================='
\echo 'TEST SUITE 1: Batch ID Integrity'
\echo '========================================='

-- Test 1.1: No NULL batch_ids
DO $$
DECLARE
  v_null_count integer;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM inventory_items
  WHERE batch_id IS NULL;
  
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'FAILED: Found % inventory_items with NULL batch_id', v_null_count;
  ELSE
    RAISE NOTICE 'PASSED: All inventory_items have non-NULL batch_id (count: 0)';
  END IF;
END $$;

-- Test 1.2: All batch_ids reference valid batches
DO $$
DECLARE
  v_orphan_count integer;
BEGIN
  SELECT COUNT(*) INTO v_orphan_count
  FROM inventory_items ii
  LEFT JOIN batch_registry br ON br.id = ii.batch_id
  WHERE br.id IS NULL;
  
  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'FAILED: Found % inventory_items with invalid batch_id FK', v_orphan_count;
  ELSE
    RAISE NOTICE 'PASSED: All batch_ids reference valid batches (orphans: 0)';
  END IF;
END $$;

-- Test 1.3: batch_id immutability trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_batch_id_update'
  ) THEN
    RAISE EXCEPTION 'FAILED: batch_id immutability trigger not found';
  ELSE
    RAISE NOTICE 'PASSED: batch_id immutability trigger exists';
  END IF;
END $$;

-- Test 1.4: Attempt to update batch_id (should fail)
DO $$
DECLARE
  v_test_item_id uuid;
  v_old_batch_id uuid;
  v_new_batch_id uuid;
  v_error_caught boolean := false;
BEGIN
  -- Get a test item
  SELECT id, batch_id INTO v_test_item_id, v_old_batch_id
  FROM inventory_items
  LIMIT 1;
  
  IF v_test_item_id IS NULL THEN
    RAISE NOTICE 'SKIPPED: No inventory items to test (empty table)';
    RETURN;
  END IF;
  
  -- Get a different batch_id for test
  SELECT id INTO v_new_batch_id
  FROM batch_registry
  WHERE id != v_old_batch_id
  LIMIT 1;
  
  IF v_new_batch_id IS NULL THEN
    RAISE NOTICE 'SKIPPED: Only one batch exists, cannot test immutability';
    RETURN;
  END IF;
  
  -- Attempt UPDATE (should fail)
  BEGIN
    UPDATE inventory_items
    SET batch_id = v_new_batch_id
    WHERE id = v_test_item_id;
    
    RAISE EXCEPTION 'FAILED: batch_id UPDATE was allowed (should have been blocked)';
  EXCEPTION
    WHEN integrity_constraint_violation THEN
      v_error_caught := true;
      RAISE NOTICE 'PASSED: batch_id UPDATE correctly blocked by trigger';
  END;
  
  IF NOT v_error_caught THEN
    RAISE EXCEPTION 'FAILED: batch_id immutability not enforced';
  END IF;
END $$;

-- =====================================================
-- TEST SUITE 2: Lifecycle State Timing
-- =====================================================

\echo ''
\echo '========================================='
\echo 'TEST SUITE 2: Lifecycle State Timing'
\echo '========================================='

-- Test 2.1: Lifecycle transition validator exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'fn_validate_batch_lifecycle_transition'
  ) THEN
    RAISE EXCEPTION 'FAILED: Lifecycle transition validator not found';
  ELSE
    RAISE NOTICE 'PASSED: Lifecycle transition validator exists';
  END IF;
END $$;

-- Test 2.2: Session completion triggers exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_batch_lifecycle_on_trim_complete'
  ) THEN
    RAISE EXCEPTION 'FAILED: Trim session completion trigger not found';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_batch_lifecycle_on_packaging_complete'
  ) THEN
    RAISE EXCEPTION 'FAILED: Packaging session completion trigger not found';
  END IF;
  
  RAISE NOTICE 'PASSED: Session completion triggers exist';
END $$;

-- Test 2.3: Cancellation rollback triggers exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_handle_trim_session_cancellation'
  ) THEN
    RAISE EXCEPTION 'FAILED: Trim cancellation trigger not found';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_handle_packaging_session_cancellation'
  ) THEN
    RAISE EXCEPTION 'FAILED: Packaging cancellation trigger not found';
  END IF;
  
  RAISE NOTICE 'PASSED: Cancellation rollback triggers exist';
END $$;

-- =====================================================
-- TEST SUITE 3: Ledger-Only Quantity Changes
-- =====================================================

\echo ''
\echo '========================================='
\echo 'TEST SUITE 3: Ledger-Only Quantity Changes'
\echo '========================================='

-- Test 3.1: Direct quantity update blocker exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_block_direct_quantity_updates'
  ) THEN
    RAISE EXCEPTION 'FAILED: Direct quantity update blocker not found';
  ELSE
    RAISE NOTICE 'PASSED: Direct quantity update blocker exists';
  END IF;
END $$;

-- Test 3.2: Movement processor trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_process_inventory_movement'
  ) THEN
    RAISE EXCEPTION 'FAILED: Movement processor trigger not found';
  ELSE
    RAISE NOTICE 'PASSED: Movement processor trigger exists';
  END IF;
END $$;

-- Test 3.3: ATP view exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'v_inventory_atp'
  ) THEN
    RAISE EXCEPTION 'FAILED: ATP view not found';
  ELSE
    RAISE NOTICE 'PASSED: ATP view exists';
  END IF;
END $$;

-- Test 3.4: Attempt direct quantity update (should fail)
DO $$
DECLARE
  v_test_item_id uuid;
  v_old_qty numeric;
  v_error_caught boolean := false;
BEGIN
  -- Get a test item
  SELECT id, on_hand_qty INTO v_test_item_id, v_old_qty
  FROM inventory_items
  LIMIT 1;
  
  IF v_test_item_id IS NULL THEN
    RAISE NOTICE 'SKIPPED: No inventory items to test';
    RETURN;
  END IF;
  
  -- Attempt direct UPDATE (should fail)
  BEGIN
    UPDATE inventory_items
    SET on_hand_qty = v_old_qty + 100
    WHERE id = v_test_item_id;
    
    RAISE EXCEPTION 'FAILED: Direct on_hand_qty UPDATE was allowed (should have been blocked)';
  EXCEPTION
    WHEN integrity_constraint_violation THEN
      v_error_caught := true;
      RAISE NOTICE 'PASSED: Direct on_hand_qty UPDATE correctly blocked';
  END;
  
  IF NOT v_error_caught THEN
    RAISE EXCEPTION 'FAILED: Ledger-only enforcement not working';
  END IF;
END $$;

-- Test 3.5: Movement immutability (DELETE blocked)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Block DELETE on inventory_movements'
  ) THEN
    RAISE EXCEPTION 'FAILED: DELETE blocking policy not found';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Block UPDATE on immutable movement fields'
  ) THEN
    RAISE EXCEPTION 'FAILED: UPDATE blocking policy not found';
  END IF;
  
  RAISE NOTICE 'PASSED: Movement immutability policies exist';
END $$;

-- =====================================================
-- TEST SUITE 4: Quarantine Gate
-- =====================================================

\echo ''
\echo '========================================='
\echo 'TEST SUITE 4: Quarantine Gate'
\echo '========================================='

-- Test 4.1: Quarantine violation log exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'quarantine_violation_log'
  ) THEN
    RAISE EXCEPTION 'FAILED: Quarantine violation log not found';
  ELSE
    RAISE NOTICE 'PASSED: Quarantine violation log exists';
  END IF;
END $$;

-- Test 4.2: Quarantine gate trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_quarantine_before_movement'
  ) THEN
    RAISE EXCEPTION 'FAILED: Quarantine gate trigger not found';
  ELSE
    RAISE NOTICE 'PASSED: Quarantine gate trigger exists';
  END IF;
END $$;

-- Test 4.3: Quarantined batches view exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'v_quarantined_batches'
  ) THEN
    RAISE EXCEPTION 'FAILED: Quarantined batches view not found';
  ELSE
    RAISE NOTICE 'PASSED: Quarantined batches view exists';
  END IF;
END $$;

-- =====================================================
-- TEST SUITE 5: Constraints & RLS
-- =====================================================

\echo ''
\echo '========================================='
\echo 'TEST SUITE 5: Constraints & RLS'
\echo '========================================='

-- Test 5.1: COA unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'certificates_of_analysis_unique_active_per_batch'
  ) THEN
    RAISE EXCEPTION 'FAILED: COA unique constraint not found';
  ELSE
    RAISE NOTICE 'PASSED: COA unique constraint exists';
  END IF;
END $$;

-- Test 5.2: No duplicate active COAs
DO $$
DECLARE
  v_duplicate_count integer;
BEGIN
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT batch_id, COUNT(*) as coa_count
    FROM certificates_of_analysis
    WHERE is_active = true
      AND batch_id IS NOT NULL
    GROUP BY batch_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF v_duplicate_count > 0 THEN
    RAISE EXCEPTION 'FAILED: Found % batches with multiple active COAs', v_duplicate_count;
  ELSE
    RAISE NOTICE 'PASSED: No duplicate active COAs found';
  END IF;
END $$;

-- Test 5.3: Order status transition trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_validate_order_status_transition'
  ) THEN
    RAISE EXCEPTION 'FAILED: Order status transition trigger not found';
  ELSE
    RAISE NOTICE 'PASSED: Order status transition trigger exists';
  END IF;
END $$;

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

\echo ''
\echo '========================================='
\echo 'VERIFICATION COMPLETE'
\echo '========================================='

DO $$
DECLARE
  v_summary text;
BEGIN
  v_summary := format(
    E'\n' ||
    '========================================\n' ||
    'BATCH 1 VERIFICATION SUMMARY\n' ||
    '========================================\n' ||
    'Total inventory items:        %s\n' ||
    'Items with batch_id:          %s\n' ||
    'Orphaned items (NULL batch):  %s\n' ||
    'Active COAs:                  %s\n' ||
    'Quarantined batches:          %s\n' ||
    'Movement records:             %s\n' ||
    '========================================\n',
    (SELECT COUNT(*) FROM inventory_items),
    (SELECT COUNT(*) FROM inventory_items WHERE batch_id IS NOT NULL),
    (SELECT COUNT(*) FROM inventory_items WHERE batch_id IS NULL),
    (SELECT COUNT(*) FROM certificates_of_analysis WHERE is_active = true),
    (SELECT COUNT(*) FROM batch_registry WHERE is_quarantined = true),
    (SELECT COUNT(*) FROM inventory_movements)
  );
  
  RAISE NOTICE '%', v_summary;
  RAISE NOTICE E'\n✅ ALL VERIFICATION TESTS PASSED';
  RAISE NOTICE E'Batch 1: Critical Integrity Fixes successfully validated on STAGING.\n';
END $$;
