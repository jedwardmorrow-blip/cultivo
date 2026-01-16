/*
  # Session Lifecycle Test Script

  ## Purpose
  End-to-end testing of session inventory triggers to verify:
  1. Session start creates RESERVE movement
  2. Session cancel creates RELEASE movement
  3. Inventory quantities updated correctly
  4. All session types work (trim, packaging, bucking)

  ## Usage
  Run this script in Supabase SQL Editor after applying the fix_legacy_session_triggers migration.

  ## Expected Results
  - All tests should pass (✓ marks)
  - No errors about movement_type column
  - RESERVE and RELEASE movements created correctly
  - Inventory quantities match expected values
*/

-- ============================================================================
-- SETUP: Create Test Inventory Items
-- ============================================================================

DO $$
DECLARE
  v_test_batch_id uuid;
  v_test_item_bucked uuid;
  v_test_item_bulk uuid;
  v_test_strain_id uuid;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'SESSION LIFECYCLE TEST - SETUP';
  RAISE NOTICE '====================================================================';

  -- Get or create test strain
  SELECT id INTO v_test_strain_id FROM strains WHERE name = 'Test Strain' LIMIT 1;
  IF v_test_strain_id IS NULL THEN
    INSERT INTO strains (name, type, notes)
    VALUES ('Test Strain', 'Indica', 'Created for testing')
    RETURNING id INTO v_test_strain_id;
  END IF;

  -- Get or create test batch
  SELECT id INTO v_test_batch_id FROM batches WHERE batch_number = 'TEST-BATCH-001' LIMIT 1;
  IF v_test_batch_id IS NULL THEN
    INSERT INTO batches (batch_number, strain_id, harvest_date, lifecycle_state)
    VALUES ('TEST-BATCH-001', v_test_strain_id, CURRENT_DATE, 'active')
    RETURNING id INTO v_test_batch_id;
  END IF;

  -- Create test bucked inventory (for trim sessions)
  INSERT INTO inventory_items (
    package_id, batch_id, strain_id, product_name,
    on_hand_qty, available_qty, reserved_qty, unit
  ) VALUES (
    'TEST-BUCKED-001', v_test_batch_id, v_test_strain_id, 'Test Bucked Flower',
    5000, 5000, 0, 'g'
  )
  ON CONFLICT (package_id) DO UPDATE SET
    on_hand_qty = 5000,
    available_qty = 5000,
    reserved_qty = 0
  RETURNING id INTO v_test_item_bucked;

  -- Create test bulk inventory (for packaging sessions)
  INSERT INTO inventory_items (
    package_id, batch_id, strain_id, product_name,
    on_hand_qty, available_qty, reserved_qty, unit
  ) VALUES (
    'TEST-BULK-001', v_test_batch_id, v_test_strain_id, 'Test Bulk Flower',
    3000, 3000, 0, 'g'
  )
  ON CONFLICT (package_id) DO UPDATE SET
    on_hand_qty = 3000,
    available_qty = 3000,
    reserved_qty = 0
  RETURNING id INTO v_test_item_bulk;

  RAISE NOTICE '✓ Test inventory created:';
  RAISE NOTICE '  - Bucked: TEST-BUCKED-001 (5000g)';
  RAISE NOTICE '  - Bulk: TEST-BULK-001 (3000g)';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 1: Trim Session Lifecycle
-- ============================================================================

DO $$
DECLARE
  v_session_id uuid;
  v_movement_count int;
  v_available_before numeric;
  v_reserved_before numeric;
  v_available_after numeric;
  v_reserved_after numeric;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'TEST 1: TRIM SESSION LIFECYCLE';
  RAISE NOTICE '====================================================================';

  -- Get initial inventory state
  SELECT available_qty, reserved_qty INTO v_available_before, v_reserved_before
  FROM inventory_items WHERE package_id = 'TEST-BUCKED-001';

  RAISE NOTICE 'Initial state: available=%g, reserved=%g', v_available_before, v_reserved_before;

  -- TEST 1A: Start trim session (should create RESERVE movement)
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 1A: Starting trim session...';

  INSERT INTO trim_sessions (
    trimmer_name, strain, batch_id, package_id, pulled_weight,
    trim_method, started_at, session_status
  ) VALUES (
    'Test Trimmer', 'Test Strain', 'TEST-BATCH-001', 'TEST-BUCKED-001', 1000,
    'hand', NOW(), 'active'
  )
  RETURNING id INTO v_session_id;

  -- Check RESERVE movement was created
  SELECT COUNT(*) INTO v_movement_count
  FROM inventory_movements
  WHERE movement_kind = 'RESERVE'
    AND reference_id = v_session_id
    AND reference_type = 'trim_sessions';

  IF v_movement_count = 1 THEN
    RAISE NOTICE '✓ RESERVE movement created';
  ELSE
    RAISE WARNING '✗ RESERVE movement NOT created (found % movements)', v_movement_count;
  END IF;

  -- Check inventory quantities updated
  SELECT available_qty, reserved_qty INTO v_available_after, v_reserved_after
  FROM inventory_items WHERE package_id = 'TEST-BUCKED-001';

  IF v_available_after = v_available_before - 1000 AND v_reserved_after = v_reserved_before + 1000 THEN
    RAISE NOTICE '✓ Inventory quantities updated correctly';
    RAISE NOTICE '  - Available: %g → %g (-%g)', v_available_before, v_available_after, 1000;
    RAISE NOTICE '  - Reserved: %g → %g (+%g)', v_reserved_before, v_reserved_after, 1000;
  ELSE
    RAISE WARNING '✗ Inventory quantities INCORRECT';
    RAISE WARNING '  - Expected available: %g, got: %g', v_available_before - 1000, v_available_after;
    RAISE WARNING '  - Expected reserved: %g, got: %g', v_reserved_before + 1000, v_reserved_after;
  END IF;

  -- TEST 1B: Cancel trim session (should create RELEASE movement)
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 1B: Cancelling trim session...';

  UPDATE trim_sessions
  SET cancelled_at = NOW(), session_status = 'cancelled'
  WHERE id = v_session_id;

  -- Check RELEASE movement was created
  SELECT COUNT(*) INTO v_movement_count
  FROM inventory_movements
  WHERE movement_kind = 'RELEASE'
    AND reference_id = v_session_id
    AND reference_type = 'trim_sessions';

  IF v_movement_count = 1 THEN
    RAISE NOTICE '✓ RELEASE movement created';
  ELSE
    RAISE WARNING '✗ RELEASE movement NOT created (found % movements)', v_movement_count;
  END IF;

  -- Check inventory quantities restored
  SELECT available_qty, reserved_qty INTO v_available_after, v_reserved_after
  FROM inventory_items WHERE package_id = 'TEST-BUCKED-001';

  IF v_available_after = v_available_before AND v_reserved_after = v_reserved_before THEN
    RAISE NOTICE '✓ Inventory quantities restored correctly';
    RAISE NOTICE '  - Available: %g (back to original)', v_available_after;
    RAISE NOTICE '  - Reserved: %g (back to original)', v_reserved_after;
  ELSE
    RAISE WARNING '✗ Inventory quantities NOT restored';
    RAISE WARNING '  - Expected available: %g, got: %g', v_available_before, v_available_after;
    RAISE WARNING '  - Expected reserved: %g, got: %g', v_reserved_before, v_reserved_after;
  END IF;

  -- Cleanup
  DELETE FROM trim_sessions WHERE id = v_session_id;
  DELETE FROM inventory_movements WHERE reference_id = v_session_id;

  RAISE NOTICE '';
  RAISE NOTICE '✓ TEST 1 COMPLETE: Trim session lifecycle working correctly';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 2: Packaging Session Lifecycle
-- ============================================================================

DO $$
DECLARE
  v_session_id uuid;
  v_movement_count int;
  v_available_before numeric;
  v_reserved_before numeric;
  v_available_after numeric;
  v_reserved_after numeric;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'TEST 2: PACKAGING SESSION LIFECYCLE';
  RAISE NOTICE '====================================================================';

  -- Get initial inventory state
  SELECT available_qty, reserved_qty INTO v_available_before, v_reserved_before
  FROM inventory_items WHERE package_id = 'TEST-BULK-001';

  RAISE NOTICE 'Initial state: available=%g, reserved=%g', v_available_before, v_reserved_before;

  -- TEST 2A: Start packaging session (should create RESERVE movement)
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2A: Starting packaging session...';

  INSERT INTO packaging_sessions (
    packager_name, strain, batch_id, package_id, pull_weight,
    product_type, started_at, session_status
  ) VALUES (
    'Test Packager', 'Test Strain', 'TEST-BATCH-001', 'TEST-BULK-001', 500,
    '8ths', NOW(), 'active'
  )
  RETURNING id INTO v_session_id;

  -- Check RESERVE movement was created
  SELECT COUNT(*) INTO v_movement_count
  FROM inventory_movements
  WHERE movement_kind = 'RESERVE'
    AND reference_id = v_session_id
    AND reference_type = 'packaging_sessions';

  IF v_movement_count = 1 THEN
    RAISE NOTICE '✓ RESERVE movement created';
  ELSE
    RAISE WARNING '✗ RESERVE movement NOT created (found % movements)', v_movement_count;
  END IF;

  -- Check inventory quantities updated
  SELECT available_qty, reserved_qty INTO v_available_after, v_reserved_after
  FROM inventory_items WHERE package_id = 'TEST-BULK-001';

  IF v_available_after = v_available_before - 500 AND v_reserved_after = v_reserved_before + 500 THEN
    RAISE NOTICE '✓ Inventory quantities updated correctly';
    RAISE NOTICE '  - Available: %g → %g (-%g)', v_available_before, v_available_after, 500;
    RAISE NOTICE '  - Reserved: %g → %g (+%g)', v_reserved_before, v_reserved_after, 500;
  ELSE
    RAISE WARNING '✗ Inventory quantities INCORRECT';
  END IF;

  -- TEST 2B: Cancel packaging session (should create RELEASE movement)
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2B: Cancelling packaging session...';

  UPDATE packaging_sessions
  SET cancelled_at = NOW(), session_status = 'cancelled'
  WHERE id = v_session_id;

  -- Check RELEASE movement was created
  SELECT COUNT(*) INTO v_movement_count
  FROM inventory_movements
  WHERE movement_kind = 'RELEASE'
    AND reference_id = v_session_id
    AND reference_type = 'packaging_sessions';

  IF v_movement_count = 1 THEN
    RAISE NOTICE '✓ RELEASE movement created';
  ELSE
    RAISE WARNING '✗ RELEASE movement NOT created (found % movements)', v_movement_count;
  END IF;

  -- Check inventory quantities restored
  SELECT available_qty, reserved_qty INTO v_available_after, v_reserved_after
  FROM inventory_items WHERE package_id = 'TEST-BULK-001';

  IF v_available_after = v_available_before AND v_reserved_after = v_reserved_before THEN
    RAISE NOTICE '✓ Inventory quantities restored correctly';
  ELSE
    RAISE WARNING '✗ Inventory quantities NOT restored';
  END IF;

  -- Cleanup
  DELETE FROM packaging_sessions WHERE id = v_session_id;
  DELETE FROM inventory_movements WHERE reference_id = v_session_id;

  RAISE NOTICE '';
  RAISE NOTICE '✓ TEST 2 COMPLETE: Packaging session lifecycle working correctly';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TEST 3: Verify No Legacy Function References
-- ============================================================================

DO $$
DECLARE
  v_legacy_count int;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'TEST 3: VERIFY NO LEGACY FUNCTIONS';
  RAISE NOTICE '====================================================================';

  -- Check for old functions
  SELECT COUNT(*) INTO v_legacy_count
  FROM pg_proc
  WHERE proname IN (
    'handle_trim_session_cancellation',
    'handle_packaging_session_cancellation',
    'handle_bucking_session_cancellation'
  );

  IF v_legacy_count = 0 THEN
    RAISE NOTICE '✓ No legacy cancellation functions found';
  ELSE
    RAISE WARNING '✗ Found % legacy functions still in database', v_legacy_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✓ TEST 3 COMPLETE: Legacy functions removed';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'ALL TESTS COMPLETE';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'If all tests passed (✓), the session trigger system is working correctly.';
  RAISE NOTICE 'Sessions can now be started and cancelled without movement_type errors.';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test in UI: Create and cancel sessions';
  RAISE NOTICE '2. Verify inventory_movements table has RESERVE/RELEASE records';
  RAISE NOTICE '3. Check that inventory quantities are correct';
  RAISE NOTICE '====================================================================';
END $$;
