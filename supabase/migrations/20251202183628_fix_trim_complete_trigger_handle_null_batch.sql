/*
  # Fix Trim Complete Trigger - Handle NULL batch_registry_id

  ## Problem
  Trigger `fn_update_batch_lifecycle_on_trim_complete()` fails when batch_registry_id is NULL
  with error: "Batch <NULL> not found"
  
  batch_registry_id is nullable for backward compatibility and when batch_registry doesn't exist.

  ## Solution
  Add NULL check - only update batch lifecycle if batch_registry_id is present.
  Sessions can complete successfully without batch lifecycle updates.

  ## Impact
  Allows trim sessions to complete even without batch_registry linkage.
  Maintains existing functionality for sessions with proper batch linkage.
*/

CREATE OR REPLACE FUNCTION public.fn_update_batch_lifecycle_on_trim_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_current_state text;
  v_target_state text;
BEGIN
  -- Only act on status change to 'completed'
  IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN

    -- Skip batch lifecycle updates if no batch_registry_id
    -- This allows sessions to complete without batch_registry linkage
    IF NEW.batch_registry_id IS NULL THEN
      RAISE NOTICE 'Trim session % completed without batch_registry linkage - skipping lifecycle update', NEW.id;
      RETURN NEW;
    END IF;

    -- Determine target state based on session outputs
    -- Check for trim session outputs using correct column names
    IF NEW.big_buds_grams IS NOT NULL OR NEW.small_buds_grams IS NOT NULL THEN
      -- Trim session completed → bulk_available
      v_target_state := 'bulk_available';
    ELSIF NEW.bucked_flower_grams IS NOT NULL OR NEW.bucked_smalls_grams IS NOT NULL THEN
      -- Bucking session completed → bucked (shouldn't happen in trim, but keeping for safety)
      v_target_state := 'bucked';
    ELSE
      -- No outputs recorded, leave state unchanged
      RETURN NEW;
    END IF;

    -- Get current batch state
    SELECT lifecycle_state INTO v_current_state
    FROM batch_registry
    WHERE id = NEW.batch_registry_id;

    -- Verify batch exists
    IF NOT FOUND THEN
      RAISE WARNING 'Batch registry % not found for session %', NEW.batch_registry_id, NEW.id;
      RETURN NEW;
    END IF;

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
$function$;
