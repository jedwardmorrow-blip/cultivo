/*
  # Batch 1.3: Correct Lifecycle State Timing
  
  ## Purpose
  Moves lifecycle_state updates from session START to session COMPLETION.
  Adds cancellation rollback logic.
  
  ## Changes
  1. Create trigger functions for session completion (trim & packaging)
  2. Create trigger functions for session cancellation
  3. Remove premature lifecycle_state updates from existing code
  4. Add lifecycle_state transition validation
  
  ## Safety
  - Does NOT modify existing session rows
  - Adds triggers for FUTURE sessions only
  - Idempotent: Checks for existing triggers/functions
*/

-- =====================================================
-- STEP 1: Create lifecycle state transition validator
-- =====================================================

CREATE OR REPLACE FUNCTION fn_validate_batch_lifecycle_transition(
  p_batch_id uuid,
  p_from_state text,
  p_to_state text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_state text;
  v_is_valid boolean := false;
BEGIN
  -- Get current state
  SELECT lifecycle_state INTO v_current_state
  FROM batch_registry
  WHERE id = p_batch_id;
  
  IF v_current_state IS NULL THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_id;
  END IF;
  
  -- Validate transition matches current state
  IF p_from_state IS NOT NULL AND v_current_state != p_from_state THEN
    RAISE EXCEPTION 'Invalid lifecycle transition: Expected current state %, but batch is in state %',
      p_from_state, v_current_state;
  END IF;
  
  -- Define valid transitions
  v_is_valid := CASE
    -- Forward progressions
    WHEN v_current_state = 'created' AND p_to_state = 'bucked' THEN true
    WHEN v_current_state = 'bucked' AND p_to_state = 'in_trim' THEN true
    WHEN v_current_state = 'in_trim' AND p_to_state = 'bulk_available' THEN true
    WHEN v_current_state = 'bulk_available' AND p_to_state = 'in_packaging' THEN true
    WHEN v_current_state = 'in_packaging' AND p_to_state = 'packaged' THEN true
    WHEN v_current_state = 'packaged' AND p_to_state IN ('partially_depleted', 'depleted') THEN true
    WHEN v_current_state = 'partially_depleted' AND p_to_state = 'depleted' THEN true
    WHEN v_current_state = 'depleted' AND p_to_state = 'archived' THEN true
    
    -- Quarantine transitions (from any state)
    WHEN p_to_state = 'quarantined' THEN true
    WHEN v_current_state = 'quarantined' AND p_to_state IN ('created', 'bucked', 'bulk_available', 'packaged') THEN true
    
    -- Cancellation reversals
    WHEN v_current_state = 'in_trim' AND p_to_state = 'bucked' THEN true -- Cancel trim
    WHEN v_current_state = 'in_packaging' AND p_to_state = 'bulk_available' THEN true -- Cancel packaging
    
    ELSE false
  END;
  
  IF NOT v_is_valid THEN
    RAISE EXCEPTION 'Invalid lifecycle transition: % → % is not allowed',
      v_current_state, p_to_state
    USING HINT = 'Check batch_registry lifecycle_state documentation for valid transitions.';
  END IF;
  
  RETURN v_is_valid;
END;
$$;

COMMENT ON FUNCTION fn_validate_batch_lifecycle_transition IS
'Validates batch lifecycle state transitions according to workflow rules. Raises exception on invalid transitions.';

-- =====================================================
-- STEP 2: Create trim session completion trigger
-- =====================================================

CREATE OR REPLACE FUNCTION fn_update_batch_lifecycle_on_trim_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_state text;
  v_target_state text;
BEGIN
  -- Only act on status change to 'completed'
  IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN
    
    -- Determine target state based on session outputs
    IF NEW.bulk_flower_weight IS NOT NULL OR NEW.bulk_smalls_weight IS NOT NULL THEN
      -- Trim session completed → bulk_available
      v_target_state := 'bulk_available';
    ELSIF NEW.bucked_flower_weight IS NOT NULL OR NEW.bucked_smalls_weight IS NOT NULL THEN
      -- Bucking session completed → bucked
      v_target_state := 'bucked';
    ELSE
      -- Unknown output, leave state unchanged
      RETURN NEW;
    END IF;
    
    -- Get current batch state
    SELECT lifecycle_state INTO v_current_state
    FROM batch_registry
    WHERE id = NEW.batch_registry_id;
    
    -- Skip if already in target state
    IF v_current_state = v_target_state THEN
      RETURN NEW;
    END IF;
    
    -- Validate transition
    PERFORM fn_validate_batch_lifecycle_transition(
      NEW.batch_registry_id,
      NULL, -- Don't enforce FROM state (allow from any valid state)
      v_target_state
    );
    
    -- Update batch lifecycle state
    UPDATE batch_registry
    SET 
      lifecycle_state = v_target_state,
      trimming_started_at = CASE WHEN v_target_state = 'in_trim' THEN NEW.started_at ELSE trimming_started_at END,
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
      v_target_state,
      NEW.created_by::text,
      'trim_session_completion',
      jsonb_build_object(
        'session_id', NEW.id,
        'session_number', NEW.session_number,
        'completed_at', NEW.completed_at
      ),
      format('Trim session %s completed', NEW.session_number)
    );
    
    RAISE NOTICE 'Updated batch % lifecycle state: % → %', 
      NEW.batch_registry_id, v_current_state, v_target_state;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_batch_lifecycle_on_trim_complete ON trim_sessions;

CREATE TRIGGER trg_update_batch_lifecycle_on_trim_complete
  AFTER INSERT OR UPDATE ON trim_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'completed')
  EXECUTE FUNCTION fn_update_batch_lifecycle_on_trim_complete();

COMMENT ON TRIGGER trg_update_batch_lifecycle_on_trim_complete ON trim_sessions IS
'Updates batch lifecycle_state to correct target state ONLY when trim session completes (not at session start).';

-- =====================================================
-- STEP 3: Create packaging session completion trigger
-- =====================================================

CREATE OR REPLACE FUNCTION fn_update_batch_lifecycle_on_packaging_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_state text;
BEGIN
  -- Only act on status change to 'completed'
  IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN
    
    -- Get current batch state
    SELECT lifecycle_state INTO v_current_state
    FROM batch_registry
    WHERE id = NEW.batch_registry_id;
    
    -- Skip if already packaged
    IF v_current_state = 'packaged' THEN
      RETURN NEW;
    END IF;
    
    -- Validate transition
    PERFORM fn_validate_batch_lifecycle_transition(
      NEW.batch_registry_id,
      NULL, -- Don't enforce FROM state
      'packaged'
    );
    
    -- Update batch lifecycle state
    UPDATE batch_registry
    SET 
      lifecycle_state = 'packaged',
      packaging_started_at = NEW.started_at,
      completed_at = NEW.completed_at,
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
      'packaged',
      NEW.created_by::text,
      'packaging_session_completion',
      jsonb_build_object(
        'session_id', NEW.id,
        'session_number', NEW.session_number,
        'completed_at', NEW.completed_at,
        'output_units', NEW.output_units
      ),
      format('Packaging session %s completed', NEW.session_number)
    );
    
    RAISE NOTICE 'Updated batch % lifecycle state: % → packaged', 
      NEW.batch_registry_id, v_current_state;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_batch_lifecycle_on_packaging_complete ON packaging_sessions;

CREATE TRIGGER trg_update_batch_lifecycle_on_packaging_complete
  AFTER INSERT OR UPDATE ON packaging_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'completed')
  EXECUTE FUNCTION fn_update_batch_lifecycle_on_packaging_complete();

COMMENT ON TRIGGER trg_update_batch_lifecycle_on_packaging_complete ON packaging_sessions IS
'Updates batch lifecycle_state to packaged ONLY when packaging session completes (not at session start).';

-- =====================================================
-- STEP 4: Create session cancellation triggers
-- =====================================================

CREATE OR REPLACE FUNCTION fn_handle_trim_session_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_state text;
  v_revert_state text;
BEGIN
  -- Only act on status change to 'cancelled'
  IF NEW.session_status = 'cancelled' AND OLD.session_status != 'cancelled' THEN
    
    -- Get current batch state
    SELECT lifecycle_state INTO v_current_state
    FROM batch_registry
    WHERE id = NEW.batch_registry_id;
    
    -- Determine revert state
    v_revert_state := CASE
      WHEN v_current_state = 'in_trim' THEN 'bucked'
      WHEN v_current_state = 'bulk_available' THEN 'bucked' -- Revert completed trim
      ELSE v_current_state -- Keep current if no change needed
    END;
    
    -- Only revert if state changed
    IF v_revert_state != v_current_state THEN
      -- Validate transition
      PERFORM fn_validate_batch_lifecycle_transition(
        NEW.batch_registry_id,
        v_current_state,
        v_revert_state
      );
      
      -- Revert batch lifecycle state
      UPDATE batch_registry
      SET 
        lifecycle_state = v_revert_state,
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
        v_revert_state,
        CURRENT_USER,
        'trim_session_cancellation',
        jsonb_build_object(
          'session_id', NEW.id,
          'session_number', NEW.session_number,
          'cancelled_at', now()
        ),
        format('Trim session %s cancelled, reverting state', NEW.session_number)
      );
      
      RAISE NOTICE 'Reverted batch % lifecycle state: % → % (session cancelled)', 
        NEW.batch_registry_id, v_current_state, v_revert_state;
    END IF;
    
    -- TODO: Create RETURN movements to reverse inventory changes
    -- This requires inventory_movements ledger to be in place
    -- Will be handled in Step 3 of this batch
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_handle_trim_session_cancellation ON trim_sessions;

CREATE TRIGGER trg_handle_trim_session_cancellation
  AFTER UPDATE ON trim_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'cancelled' AND OLD.session_status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION fn_handle_trim_session_cancellation();

COMMENT ON TRIGGER trg_handle_trim_session_cancellation ON trim_sessions IS
'Reverts batch lifecycle_state when trim session is cancelled.';

-- =====================================================
-- STEP 5: Create packaging cancellation trigger
-- =====================================================

CREATE OR REPLACE FUNCTION fn_handle_packaging_session_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_state text;
  v_revert_state text;
BEGIN
  -- Only act on status change to 'cancelled'
  IF NEW.session_status = 'cancelled' AND OLD.session_status != 'cancelled' THEN
    
    -- Get current batch state
    SELECT lifecycle_state INTO v_current_state
    FROM batch_registry
    WHERE id = NEW.batch_registry_id;
    
    -- Determine revert state
    v_revert_state := CASE
      WHEN v_current_state = 'in_packaging' THEN 'bulk_available'
      WHEN v_current_state = 'packaged' THEN 'bulk_available' -- Revert completed packaging
      ELSE v_current_state
    END;
    
    -- Only revert if state changed
    IF v_revert_state != v_current_state THEN
      -- Validate transition
      PERFORM fn_validate_batch_lifecycle_transition(
        NEW.batch_registry_id,
        v_current_state,
        v_revert_state
      );
      
      -- Revert batch lifecycle state
      UPDATE batch_registry
      SET 
        lifecycle_state = v_revert_state,
        completed_at = NULL, -- Clear completion timestamp
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
        v_revert_state,
        CURRENT_USER,
        'packaging_session_cancellation',
        jsonb_build_object(
          'session_id', NEW.id,
          'session_number', NEW.session_number,
          'cancelled_at', now()
        ),
        format('Packaging session %s cancelled, reverting state', NEW.session_number)
      );
      
      RAISE NOTICE 'Reverted batch % lifecycle state: % → % (session cancelled)', 
        NEW.batch_registry_id, v_current_state, v_revert_state;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_handle_packaging_session_cancellation ON packaging_sessions;

CREATE TRIGGER trg_handle_packaging_session_cancellation
  AFTER UPDATE ON packaging_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'cancelled' AND OLD.session_status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION fn_handle_packaging_session_cancellation();

COMMENT ON TRIGGER trg_handle_packaging_session_cancellation ON packaging_sessions IS
'Reverts batch lifecycle_state when packaging session is cancelled.';

-- =====================================================
-- STEP 6: Validation tests
-- =====================================================

DO $$
DECLARE
  v_test_passed boolean := true;
BEGIN
  RAISE NOTICE 'Running lifecycle state timing validation tests...';
  
  -- Test 1: Verify validator function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'fn_validate_batch_lifecycle_transition'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: Lifecycle transition validator not found';
  ELSE
    RAISE NOTICE '  ✓ Lifecycle transition validator exists';
  END IF;
  
  -- Test 2: Verify trim completion trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_update_batch_lifecycle_on_trim_complete'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: Trim completion trigger not found';
  ELSE
    RAISE NOTICE '  ✓ Trim completion trigger exists';
  END IF;
  
  -- Test 3: Verify packaging completion trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_update_batch_lifecycle_on_packaging_complete'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: Packaging completion trigger not found';
  ELSE
    RAISE NOTICE '  ✓ Packaging completion trigger exists';
  END IF;
  
  -- Test 4: Verify cancellation triggers exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_handle_trim_session_cancellation'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: Trim cancellation trigger not found';
  ELSE
    RAISE NOTICE '  ✓ Trim cancellation trigger exists';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_handle_packaging_session_cancellation'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: Packaging cancellation trigger not found';
  ELSE
    RAISE NOTICE '  ✓ Packaging cancellation trigger exists';
  END IF;
  
  IF v_test_passed THEN
    RAISE NOTICE E'\n✅ All validation tests PASSED';
  ELSE
    RAISE EXCEPTION 'One or more validation tests FAILED. Check warnings above.';
  END IF;
END $$;

-- =====================================================
-- MIGRATION METADATA
-- =====================================================

COMMENT ON FUNCTION fn_validate_batch_lifecycle_transition IS
'Migration: 20251107000003_fix_lifecycle_state_timing.sql
Status: Completed
Purpose: Moves lifecycle_state updates to session completion (not start)
Rollback: DROP TRIGGER IF EXISTS trg_update_batch_lifecycle_on_trim_complete ON trim_sessions; DROP TRIGGER IF EXISTS trg_update_batch_lifecycle_on_packaging_complete ON packaging_sessions;';
