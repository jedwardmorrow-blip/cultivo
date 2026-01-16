/*
  # Fix Trim Complete Trigger - Column Name Mismatch

  ## Problem
  The trigger function `fn_update_batch_lifecycle_on_trim_complete()` references
  non-existent columns:
  - NEW.bulk_flower_weight (doesn't exist)
  - NEW.bulk_smalls_weight (doesn't exist)
  
  Actual columns in trim_sessions table:
  - big_buds_grams
  - small_buds_grams
  - trim_grams
  
  This causes error: `record "new" has no field "bulk_flower_weight"`

  ## Solution
  Update trigger function to use correct column names from schema.

  ## Impact
  Fixes trim session completion workflow.
*/

-- Drop and recreate the function with correct column names
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

    -- Determine target state based on session outputs
    -- Check for trim session outputs using CORRECT column names
    IF NEW.big_buds_grams IS NOT NULL OR NEW.small_buds_grams IS NOT NULL THEN
      -- Trim session completed → bulk_available
      v_target_state := 'bulk_available';
    ELSIF NEW.bucked_flower_grams IS NOT NULL OR NEW.bucked_smalls_grams IS NOT NULL THEN
      -- Bucking session completed → bucked (this shouldn't happen in trim, but keeping for safety)
      v_target_state := 'bucked';
    ELSE
      -- No outputs recorded, leave state unchanged
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

-- Verify the trigger still exists and is attached
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_update_batch_lifecycle_on_trim_complete'
  ) THEN
    RAISE WARNING 'Trigger trg_update_batch_lifecycle_on_trim_complete does not exist!';
  ELSE
    RAISE NOTICE '✓ Trigger trg_update_batch_lifecycle_on_trim_complete verified';
  END IF;
END $$;
