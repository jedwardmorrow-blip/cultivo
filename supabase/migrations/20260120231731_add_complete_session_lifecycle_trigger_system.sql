/*
  # Complete Session Lifecycle Trigger System

  ## Problem
  Batch lifecycle triggers documented in batch1_critical_integrity_fixes were never deployed.
  The system has been running WITHOUT automatic lifecycle state transitions since inception.

  User encountered error: "Invalid lifecycle transition: created → bulk_available is not allowed"
  because batches remained in 'created' state even after bucking sessions completed.

  ## Root Cause
  1. batch1_critical_integrity_fixes/ migrations never deployed (subfolder not auto-deployed)
  2. batch1 was incomplete anyway - missing bucking session triggers (designed before bucking integration)
  3. Lifecycle FUNCTIONS exist but TRIGGERS were never attached
  4. 5+ batches stuck with wrong lifecycle_state

  ## Solution
  Create complete lifecycle trigger system for ALL session types:
  - Bucking sessions: created → bucked (MISSING - new in this migration)
  - Trim sessions: bucked/in_trim → bulk_available (functions exist, triggers missing)
  - Packaging sessions: bulk_available/in_packaging → packaged (functions exist, triggers missing)
  - Cancellation rollback for all session types

  ## Changes
  1. Create bucking session lifecycle functions (NEW)
  2. Attach triggers for bucking completion and cancellation (NEW)
  3. Attach triggers for trim completion and cancellation (MISSING)
  4. Attach triggers for packaging completion and cancellation (MISSING)

  ## Migration Date
  2026-01-21

  ## References
  - Supersedes: batch1_critical_integrity_fixes/20251107000003 (never deployed)
  - Documentation: docs/BATCHES.md, docs/SESSIONS.md
  - Related: docs/SESSION-2026-01-21-LIFECYCLE-TRIGGER-ARCHITECTURE-FIX.md
*/

-- =====================================================
-- STEP 1: Create Bucking Session Completion Function
-- =====================================================

CREATE OR REPLACE FUNCTION fn_update_batch_lifecycle_on_bucking_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_state text;
BEGIN
  -- Only act on status change to 'completed'
  IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN

    -- Skip batch lifecycle updates if no batch_registry_id
    IF NEW.batch_registry_id IS NULL THEN
      RAISE NOTICE 'Bucking session % completed without batch_registry linkage - skipping lifecycle update', NEW.id;
      RETURN NEW;
    END IF;

    -- Get current batch state
    SELECT lifecycle_state INTO v_current_state
    FROM batch_registry
    WHERE id = NEW.batch_registry_id;

    -- Verify batch exists
    IF NOT FOUND THEN
      RAISE WARNING 'Batch registry % not found for bucking session %', NEW.batch_registry_id, NEW.id;
      RETURN NEW;
    END IF;

    -- Skip if already bucked
    IF v_current_state = 'bucked' THEN
      RAISE NOTICE 'Batch % already in bucked state', NEW.batch_registry_id;
      RETURN NEW;
    END IF;

    -- Only transition from 'created' to 'bucked'
    IF v_current_state != 'created' THEN
      RAISE WARNING 'Cannot transition batch % from % to bucked. Batch must be in created state. Skipping lifecycle update.',
        NEW.batch_registry_id, v_current_state;
      RETURN NEW;
    END IF;

    -- Validate transition
    PERFORM fn_validate_batch_lifecycle_transition(
      NEW.batch_registry_id,
      'created',
      'bucked'
    );

    -- Update batch lifecycle state
    UPDATE batch_registry
    SET
      lifecycle_state = 'bucked',
      bucking_started_at = COALESCE(bucking_started_at, NEW.started_at),
      updated_at = now()
    WHERE id = NEW.batch_registry_id;

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
      NEW.batch_registry_id,
      'state_transition',
      v_current_state,
      'bucked',
      CURRENT_USER,
      'bucking_session_completion',
      jsonb_build_object(
        'session_id', NEW.id,
        'completed_at', NEW.completed_at,
        'bucked_flower_grams', NEW.bucked_flower_grams,
        'bucked_smalls_grams', NEW.bucked_smalls_grams
      ),
      format('Bucking session completed with %sg flower, %sg smalls',
        COALESCE(NEW.bucked_flower_grams, 0),
        COALESCE(NEW.bucked_smalls_grams, 0))
    );

    RAISE NOTICE 'Updated batch % lifecycle state: % → bucked',
      NEW.batch_registry_id, v_current_state;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_update_batch_lifecycle_on_bucking_complete IS
'Updates batch lifecycle_state to bucked when bucking session completes. Created 2026-01-21 to complete lifecycle trigger system.';

-- =====================================================
-- STEP 2: Create Bucking Session Cancellation Function
-- =====================================================

CREATE OR REPLACE FUNCTION fn_handle_bucking_session_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_state text;
BEGIN
  -- Only act on status change to 'cancelled'
  IF NEW.session_status = 'cancelled' AND OLD.session_status != 'cancelled' THEN

    -- Skip if no batch linkage
    IF NEW.batch_registry_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Get current batch state
    SELECT lifecycle_state INTO v_current_state
    FROM batch_registry
    WHERE id = NEW.batch_registry_id;

    -- Only revert if batch is in 'bucked' state
    IF v_current_state = 'bucked' THEN
      -- Validate transition
      PERFORM fn_validate_batch_lifecycle_transition(
        NEW.batch_registry_id,
        'bucked',
        'created'
      );

      -- Revert batch lifecycle state
      UPDATE batch_registry
      SET
        lifecycle_state = 'created',
        updated_at = now()
      WHERE id = NEW.batch_registry_id;

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
        NEW.batch_registry_id,
        'state_transition',
        'bucked',
        'created',
        CURRENT_USER,
        'bucking_session_cancellation',
        jsonb_build_object(
          'session_id', NEW.id,
          'cancelled_at', now()
        ),
        'Bucking session cancelled, reverting state'
      );

      RAISE NOTICE 'Reverted batch % lifecycle state: bucked → created (session cancelled)',
        NEW.batch_registry_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_handle_bucking_session_cancellation IS
'Reverts batch lifecycle_state when bucking session is cancelled. Created 2026-01-21 to complete lifecycle trigger system.';

-- =====================================================
-- STEP 3: Attach ALL Lifecycle Triggers
-- =====================================================

-- Bucking Session Triggers (NEW)
DROP TRIGGER IF EXISTS trg_update_batch_lifecycle_on_bucking_complete ON bucking_sessions;
CREATE TRIGGER trg_update_batch_lifecycle_on_bucking_complete
  AFTER UPDATE ON bucking_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'completed')
  EXECUTE FUNCTION fn_update_batch_lifecycle_on_bucking_complete();

DROP TRIGGER IF EXISTS trg_handle_bucking_session_cancellation ON bucking_sessions;
CREATE TRIGGER trg_handle_bucking_session_cancellation
  AFTER UPDATE ON bucking_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'cancelled' AND OLD.session_status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION fn_handle_bucking_session_cancellation();

-- Trim Session Triggers (functions exist, triggers missing)
DROP TRIGGER IF EXISTS trg_update_batch_lifecycle_on_trim_complete ON trim_sessions;
CREATE TRIGGER trg_update_batch_lifecycle_on_trim_complete
  AFTER UPDATE ON trim_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'completed')
  EXECUTE FUNCTION fn_update_batch_lifecycle_on_trim_complete();

DROP TRIGGER IF EXISTS trg_handle_trim_session_cancellation ON trim_sessions;
CREATE TRIGGER trg_handle_trim_session_cancellation
  AFTER UPDATE ON trim_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'cancelled' AND OLD.session_status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION fn_handle_trim_session_cancellation();

-- Packaging Session Triggers (functions exist, triggers missing)
DROP TRIGGER IF EXISTS trg_update_batch_lifecycle_on_packaging_complete ON packaging_sessions;
CREATE TRIGGER trg_update_batch_lifecycle_on_packaging_complete
  AFTER UPDATE ON packaging_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'completed')
  EXECUTE FUNCTION fn_update_batch_lifecycle_on_packaging_complete();

DROP TRIGGER IF EXISTS trg_handle_packaging_session_cancellation ON packaging_sessions;
CREATE TRIGGER trg_handle_packaging_session_cancellation
  AFTER UPDATE ON packaging_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'cancelled' AND OLD.session_status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION fn_handle_packaging_session_cancellation();

-- =====================================================
-- STEP 4: Add Comments
-- =====================================================

COMMENT ON TRIGGER trg_update_batch_lifecycle_on_bucking_complete ON bucking_sessions IS
'Updates batch lifecycle_state to bucked when bucking session completes (created → bucked).';

COMMENT ON TRIGGER trg_handle_bucking_session_cancellation ON bucking_sessions IS
'Reverts batch lifecycle_state when bucking session cancelled (bucked → created).';

COMMENT ON TRIGGER trg_update_batch_lifecycle_on_trim_complete ON trim_sessions IS
'Updates batch lifecycle_state to bulk_available when trim session completes (in_trim → bulk_available).';

COMMENT ON TRIGGER trg_handle_trim_session_cancellation ON trim_sessions IS
'Reverts batch lifecycle_state when trim session cancelled (in_trim → bucked).';

COMMENT ON TRIGGER trg_update_batch_lifecycle_on_packaging_complete ON packaging_sessions IS
'Updates batch lifecycle_state to packaged when packaging session completes (in_packaging → packaged).';

COMMENT ON TRIGGER trg_handle_packaging_session_cancellation ON packaging_sessions IS
'Reverts batch lifecycle_state when packaging session cancelled (in_packaging → bulk_available).';

-- =====================================================
-- STEP 5: Verification
-- =====================================================

DO $$
DECLARE
  v_trigger_count int;
  v_function_count int;
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Complete Session Lifecycle Trigger System - Verification';
  RAISE NOTICE '====================================================================';

  -- Count lifecycle triggers
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE t.tgname IN (
    'trg_update_batch_lifecycle_on_bucking_complete',
    'trg_handle_bucking_session_cancellation',
    'trg_update_batch_lifecycle_on_trim_complete',
    'trg_handle_trim_session_cancellation',
    'trg_update_batch_lifecycle_on_packaging_complete',
    'trg_handle_packaging_session_cancellation'
  );

  -- Count lifecycle functions
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc
  WHERE proname IN (
    'fn_validate_batch_lifecycle_transition',
    'fn_update_batch_lifecycle_on_bucking_complete',
    'fn_handle_bucking_session_cancellation',
    'fn_update_batch_lifecycle_on_trim_complete',
    'fn_handle_trim_session_cancellation',
    'fn_update_batch_lifecycle_on_packaging_complete',
    'fn_handle_packaging_session_cancellation'
  );

  IF v_trigger_count = 6 THEN
    RAISE NOTICE '✓ All 6 lifecycle triggers created';
  ELSE
    RAISE WARNING '✗ Expected 6 lifecycle triggers, found %', v_trigger_count;
  END IF;

  IF v_function_count = 7 THEN
    RAISE NOTICE '✓ All 7 lifecycle functions exist';
  ELSE
    RAISE WARNING '✗ Expected 7 lifecycle functions, found %', v_function_count;
  END IF;

  -- Show trigger attachment summary
  RAISE NOTICE '';
  RAISE NOTICE 'Trigger Attachment Summary:';
  RAISE NOTICE '  Bucking Sessions: 2 triggers (completion + cancellation)';
  RAISE NOTICE '  Trim Sessions: 2 triggers (completion + cancellation)';
  RAISE NOTICE '  Packaging Sessions: 2 triggers (completion + cancellation)';
  RAISE NOTICE '';

  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Migration Complete: Session lifecycle triggers active';
  RAISE NOTICE 'Next step: Run data repair migration to fix historical batches';
  RAISE NOTICE '====================================================================';
END $$;
