/*
  # Repair Batch Lifecycle States from Session History

  ## Problem
  Batches have wrong lifecycle_state because lifecycle triggers were never deployed.
  This migration repairs historical data based on completed session history.

  ## Identified Issues
  - 5 batches with active inventory stuck in 'created' state (should be 'bucked' or 'bulk_available')
  - 40+ empty batches with incorrect states
  
  Critical batches needing immediate repair (with inventory):
  - 251105-ASU: created → bucked (37kg inventory)
  - 251105-BLM: created → bucked (16kg inventory)  
  - 251105-DOG: created → bucked (41kg inventory)
  - 251105-GAS: created → bulk_available (114kg inventory)
  - 251105-MGM: created → bulk_available (39kg inventory)

  ## Solution
  Calculate correct state based on completed session history:
  - If has completed packaging_sessions → 'packaged'
  - Else if has completed trim_sessions → 'bulk_available'
  - Else if has completed bucking_sessions → 'bucked'
  - Else → 'created'

  ## Changes
  1. Update batch_registry.lifecycle_state based on session history
  2. Log batch_lifecycle_events for audit trail
  3. Set appropriate timestamp fields

  ## Migration Date
  2026-01-21

  ## References
  - Companion to: add_complete_session_lifecycle_trigger_system.sql
  - Documentation: docs/SESSION-2026-01-21-LIFECYCLE-TRIGGER-ARCHITECTURE-FIX.md
*/

-- =====================================================
-- STEP 1: Repair Batches with Wrong Lifecycle State
-- =====================================================

DO $$
DECLARE
  v_batch_record RECORD;
  v_old_state text;
  v_new_state text;
  v_repair_count int := 0;
  v_earliest_bucking timestamptz;
  v_earliest_trim timestamptz;
  v_earliest_packaging timestamptz;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Batch Lifecycle State Repair - Starting';
  RAISE NOTICE '====================================================================';

  -- Loop through all batches that need repair
  FOR v_batch_record IN
    SELECT 
      br.id,
      br.batch_number,
      br.lifecycle_state as current_state,
      BOOL_OR(bs.session_status = 'completed') as has_completed_bucking,
      BOOL_OR(ts.session_status = 'completed') as has_completed_trim,
      BOOL_OR(ps.session_status = 'completed') as has_completed_packaging,
      COUNT(DISTINCT ii.id) as inventory_count,
      SUM(ii.on_hand_qty) as total_on_hand,
      CASE
        WHEN BOOL_OR(ps.session_status = 'completed') THEN 'packaged'
        WHEN BOOL_OR(ts.session_status = 'completed') THEN 'bulk_available'
        WHEN BOOL_OR(bs.session_status = 'completed') THEN 'bucked'
        ELSE 'created'
      END as expected_state,
      MIN(bs.started_at) FILTER (WHERE bs.session_status = 'completed') as earliest_bucking_started,
      MIN(ts.started_at) FILTER (WHERE ts.session_status = 'completed') as earliest_trim_started,
      MIN(ps.started_at) FILTER (WHERE ps.session_status = 'completed') as earliest_packaging_started
    FROM batch_registry br
    LEFT JOIN bucking_sessions bs ON br.id = bs.batch_registry_id
    LEFT JOIN trim_sessions ts ON br.id = ts.batch_registry_id
    LEFT JOIN packaging_sessions ps ON br.id = ps.batch_registry_id
    LEFT JOIN inventory_items ii ON br.id = ii.batch_id
    GROUP BY br.id, br.batch_number, br.lifecycle_state
    HAVING br.lifecycle_state != CASE
        WHEN BOOL_OR(ps.session_status = 'completed') THEN 'packaged'
        WHEN BOOL_OR(ts.session_status = 'completed') THEN 'bulk_available'
        WHEN BOOL_OR(bs.session_status = 'completed') THEN 'bucked'
        ELSE 'created'
      END
    ORDER BY 
      -- Prioritize batches with inventory
      CASE WHEN SUM(ii.on_hand_qty) > 0 THEN 0 ELSE 1 END,
      br.batch_number
  LOOP
    v_old_state := v_batch_record.current_state;
    v_new_state := v_batch_record.expected_state;

    -- Update batch lifecycle state
    UPDATE batch_registry
    SET
      lifecycle_state = v_new_state,
      bucking_started_at = COALESCE(bucking_started_at, v_batch_record.earliest_bucking_started),
      trimming_started_at = COALESCE(trimming_started_at, v_batch_record.earliest_trim_started),
      packaging_started_at = COALESCE(packaging_started_at, v_batch_record.earliest_packaging_started),
      updated_at = now()
    WHERE id = v_batch_record.id;

    -- Log lifecycle event
    INSERT INTO batch_lifecycle_events (
      batch_id,
      event_type,
      from_state,
      to_state,
      triggered_by,
      trigger_source,
      metadata,
      notes
    ) VALUES (
      v_batch_record.id,
      'state_transition',
      v_old_state,
      v_new_state,
      'system',
      'historical_data_repair',
      jsonb_build_object(
        'repair_date', now(),
        'reason', 'lifecycle_triggers_were_missing',
        'has_completed_bucking', v_batch_record.has_completed_bucking,
        'has_completed_trim', v_batch_record.has_completed_trim,
        'has_completed_packaging', v_batch_record.has_completed_packaging,
        'inventory_count', v_batch_record.inventory_count,
        'total_on_hand', v_batch_record.total_on_hand
      ),
      format('Historical data repair: corrected lifecycle state from %s to %s based on session history',
        v_old_state, v_new_state)
    );

    v_repair_count := v_repair_count + 1;

    -- Log details for high-priority batches (with inventory)
    IF v_batch_record.total_on_hand > 0 THEN
      RAISE NOTICE '✓ REPAIRED (HAS INVENTORY): % - % → % (%g on hand)',
        v_batch_record.batch_number, v_old_state, v_new_state, v_batch_record.total_on_hand;
    ELSE
      RAISE NOTICE '  Repaired: % - % → %',
        v_batch_record.batch_number, v_old_state, v_new_state;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Batch Lifecycle State Repair - Complete';
  RAISE NOTICE 'Total batches repaired: %', v_repair_count;
  RAISE NOTICE '====================================================================';

  IF v_repair_count = 0 THEN
    RAISE NOTICE 'No batches needed repair - all states match session history';
  END IF;
END $$;

-- =====================================================
-- STEP 2: Verification Query
-- =====================================================

DO $$
DECLARE
  v_mismatch_count int;
BEGIN
  -- Check for any remaining mismatches
  SELECT COUNT(*) INTO v_mismatch_count
  FROM batch_registry br
  LEFT JOIN bucking_sessions bs ON br.id = bs.batch_registry_id AND bs.session_status = 'completed'
  LEFT JOIN trim_sessions ts ON br.id = ts.batch_registry_id AND ts.session_status = 'completed'
  LEFT JOIN packaging_sessions ps ON br.id = ps.batch_registry_id AND ps.session_status = 'completed'
  WHERE br.lifecycle_state != CASE
    WHEN ps.id IS NOT NULL THEN 'packaged'
    WHEN ts.id IS NOT NULL THEN 'bulk_available'
    WHEN bs.id IS NOT NULL THEN 'bucked'
    ELSE 'created'
  END;

  IF v_mismatch_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✓ VERIFICATION PASSED: All batch lifecycle states match session history';
  ELSE
    RAISE WARNING '✗ VERIFICATION FAILED: % batches still have mismatched states', v_mismatch_count;
  END IF;
END $$;

-- =====================================================
-- STEP 3: Summary Statistics
-- =====================================================

DO $$
DECLARE
  v_created_count int;
  v_bucked_count int;
  v_bulk_available_count int;
  v_packaged_count int;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Final Batch Lifecycle State Distribution';
  RAISE NOTICE '====================================================================';

  SELECT
    COUNT(*) FILTER (WHERE lifecycle_state = 'created') INTO v_created_count
  FROM batch_registry;

  SELECT
    COUNT(*) FILTER (WHERE lifecycle_state = 'bucked') INTO v_bucked_count
  FROM batch_registry;

  SELECT
    COUNT(*) FILTER (WHERE lifecycle_state = 'bulk_available') INTO v_bulk_available_count
  FROM batch_registry;

  SELECT
    COUNT(*) FILTER (WHERE lifecycle_state IN ('packaged', 'partially_depleted', 'depleted')) INTO v_packaged_count
  FROM batch_registry;

  RAISE NOTICE 'Created: % batches', v_created_count;
  RAISE NOTICE 'Bucked: % batches', v_bucked_count;
  RAISE NOTICE 'Bulk Available: % batches', v_bulk_available_count;
  RAISE NOTICE 'Packaged/Depleted: % batches', v_packaged_count;
  RAISE NOTICE '====================================================================';
END $$;
