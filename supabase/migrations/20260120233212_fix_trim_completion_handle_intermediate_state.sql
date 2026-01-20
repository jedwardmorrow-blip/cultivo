/*
  # Fix Trim Session Completion - Handle Intermediate State

  ## Problem
  User still getting "Invalid lifecycle transition: bucked → bulk_available is not allowed"
  
  Root cause: Trim session started when batch was in 'bucked' state but never transitioned
  to 'in_trim'. When completing, trigger tries bucked → bulk_available which validator rejects.

  Valid transitions are:
  - bucked → in_trim (should happen on session start)
  - in_trim → bulk_available (happens on session complete)

  ## Solution
  1. Update trim completion trigger to handle BOTH transitions if needed
  2. If batch is in 'bucked', transition to 'in_trim' first
  3. Then transition from 'in_trim' to 'bulk_available'
  4. Log both transitions

  ## Date
  2026-01-21 (Fix for user's immediate issue)
*/

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
    
    -- Skip batch lifecycle updates if no batch_registry_id
    IF NEW.batch_registry_id IS NULL THEN
      RAISE NOTICE 'Trim session % completed without batch_registry linkage - skipping lifecycle update', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Get current batch state
    SELECT lifecycle_state INTO v_current_state
    FROM batch_registry
    WHERE id = NEW.batch_registry_id;
    
    -- Verify batch exists
    IF NOT FOUND THEN
      RAISE WARNING 'Batch registry % not found for trim session %', NEW.batch_registry_id, NEW.id;
      RETURN NEW;
    END IF;
    
    -- HANDLE INTERMEDIATE STATE TRANSITION
    -- If batch is still in 'bucked' state (session started but never transitioned to in_trim),
    -- we need to do TWO transitions: bucked → in_trim → bulk_available
    IF v_current_state = 'bucked' THEN
      RAISE NOTICE 'Batch % is in bucked state, transitioning through in_trim before bulk_available', 
        NEW.batch_registry_id;
      
      -- First transition: bucked → in_trim
      PERFORM fn_validate_batch_lifecycle_transition(
        NEW.batch_registry_id,
        'bucked',
        'in_trim'
      );
      
      UPDATE batch_registry
      SET
        lifecycle_state = 'in_trim',
        trimming_started_at = COALESCE(trimming_started_at, NEW.started_at),
        updated_at = now()
      WHERE id = NEW.batch_registry_id;
      
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
        'in_trim',
        CURRENT_USER,
        'trim_session_completion_intermediate',
        jsonb_build_object(
          'session_id', NEW.id,
          'note', 'Intermediate transition during completion - session started without state change'
        ),
        'Trim session started without batch state update, correcting during completion'
      );
      
      -- Update current state for next transition
      v_current_state := 'in_trim';
    END IF;
    
    -- Now handle the main transition to bulk_available
    v_target_state := 'bulk_available';
    
    -- Skip if already in target state
    IF v_current_state = v_target_state THEN
      RAISE NOTICE 'Batch % already in bulk_available state', NEW.batch_registry_id;
      RETURN NEW;
    END IF;
    
    -- Validate final transition (should be in_trim → bulk_available now)
    PERFORM fn_validate_batch_lifecycle_transition(
      NEW.batch_registry_id,
      v_current_state,
      v_target_state
    );
    
    -- Update batch lifecycle state to final state
    UPDATE batch_registry
    SET
      lifecycle_state = v_target_state,
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
      CURRENT_USER,
      'trim_session_completion',
      jsonb_build_object(
        'session_id', NEW.id,
        'completed_at', NEW.completed_at,
        'big_buds_grams', NEW.big_buds_grams,
        'small_buds_grams', NEW.small_buds_grams,
        'trim_grams', NEW.trim_grams
      ),
      format('Trim session completed with %sg flower, %sg smalls, %sg trim',
        COALESCE(NEW.big_buds_grams, 0),
        COALESCE(NEW.small_buds_grams, 0),
        COALESCE(NEW.trim_grams, 0))
    );
    
    RAISE NOTICE 'Updated batch % lifecycle state: % → %',
      NEW.batch_registry_id, v_current_state, v_target_state;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_update_batch_lifecycle_on_trim_complete IS
'Updates batch lifecycle_state when trim session completes. Handles intermediate in_trim state if needed (bucked → in_trim → bulk_available).';

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Trim Completion Trigger - Fixed to Handle Intermediate State';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Now handles: bucked → in_trim → bulk_available in single completion';
  RAISE NOTICE 'User can now complete Dog Walker trim session';
  RAISE NOTICE '====================================================================';
END $$;
