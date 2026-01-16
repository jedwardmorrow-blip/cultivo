/*
  # Fix Packaging Complete Trigger - NULL Check and State Validation

  ## Problem
  Packaging completion trigger fails with: "Invalid lifecycle transition: bucked → packaged is not allowed"
  
  The trigger has two issues:
  1. No NULL check for batch_registry_id (like trim trigger)
  2. Tries to transition directly to 'packaged' from wrong states
  
  Valid flow: bucked → in_trim → bulk_available → in_packaging → packaged

  ## Solution
  1. Add NULL check for batch_registry_id (skip if null)
  2. Only transition to 'packaged' if batch is in 'in_packaging' state
  3. Allow completion without batch lifecycle update for backward compatibility

  ## Impact
  Packaging sessions complete successfully with or without batch linkage.
  Proper state validation prevents invalid transitions.
*/

CREATE OR REPLACE FUNCTION public.fn_update_batch_lifecycle_on_packaging_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_current_state text;
BEGIN
  -- Only act on status change to 'completed'
  IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN

    -- Skip batch lifecycle updates if no batch_registry_id
    -- This allows sessions to complete without batch_registry linkage
    IF NEW.batch_registry_id IS NULL THEN
      RAISE NOTICE 'Packaging session % completed without batch_registry linkage - skipping lifecycle update', NEW.id;
      RETURN NEW;
    END IF;

    -- Get current batch state
    SELECT lifecycle_state INTO v_current_state
    FROM batch_registry
    WHERE id = NEW.batch_registry_id;

    -- Verify batch exists
    IF NOT FOUND THEN
      RAISE WARNING 'Batch registry % not found for packaging session %', NEW.batch_registry_id, NEW.id;
      RETURN NEW;
    END IF;

    -- Skip if already packaged
    IF v_current_state = 'packaged' THEN
      RAISE NOTICE 'Batch % already in packaged state', NEW.batch_registry_id;
      RETURN NEW;
    END IF;

    -- Only transition to packaged if batch is in valid packaging state
    -- Valid: in_packaging → packaged
    IF v_current_state != 'in_packaging' THEN
      RAISE WARNING 'Cannot transition batch % from % to packaged. Batch must be in in_packaging state first. Skipping lifecycle update.',
        NEW.batch_registry_id, v_current_state;
      RETURN NEW;
    END IF;

    -- Validate transition (should pass since we checked above)
    PERFORM fn_validate_batch_lifecycle_transition(
      NEW.batch_registry_id,
      'in_packaging',
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
      CURRENT_USER,
      'packaging_session_completion',
      jsonb_build_object(
        'session_id', NEW.id,
        'completed_at', NEW.completed_at,
        'output_units', NEW.output_units
      ),
      format('Packaging session completed with %s output units', COALESCE(NEW.output_units, 0))
    );

    RAISE NOTICE 'Updated batch % lifecycle state: % → packaged', 
      NEW.batch_registry_id, v_current_state;
  END IF;

  RETURN NEW;
END;
$function$;
