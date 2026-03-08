/*
  # Fix trim completion trigger to handle archived batch state

  ## Problem
  If the auto-archive trigger prematurely archives a batch (before this session's
  fix was deployed, or due to a race condition), the trim completion trigger fails
  with: "Invalid lifecycle transition: archived -> bulk_available is not allowed"

  ## Solution
  Add an `archived` state handler to `fn_update_batch_lifecycle_on_trim_complete()`,
  following the same pattern already used for the `bucked` intermediate state.
  When the batch is archived, revert to `in_trim` first, then transition to
  `bulk_available` normally.

  This is a defense-in-depth measure: the auto-archive trigger fix prevents
  premature archival, and this function handles it gracefully if it ever occurs.

  ## Changes
  - Modified: `fn_update_batch_lifecycle_on_trim_complete()` function
  - No new tables, columns, or triggers
  - No RLS changes
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
  IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN

    IF NEW.batch_registry_id IS NULL THEN
      RAISE NOTICE 'Trim session % completed without batch_registry linkage - skipping lifecycle update', NEW.id;
      RETURN NEW;
    END IF;

    SELECT lifecycle_state INTO v_current_state
    FROM batch_registry
    WHERE id = NEW.batch_registry_id;

    IF NOT FOUND THEN
      RAISE WARNING 'Batch registry % not found for trim session %', NEW.batch_registry_id, NEW.id;
      RETURN NEW;
    END IF;

    IF v_current_state = 'archived' THEN
      RAISE NOTICE 'Batch % was prematurely archived, reverting to in_trim before completing', NEW.batch_registry_id;

      UPDATE batch_registry
      SET
        lifecycle_state = 'in_trim',
        status = 'active',
        depleted_at = NULL,
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
        'archived',
        'in_trim',
        CURRENT_USER,
        'trim_session_completion_archive_correction',
        jsonb_build_object(
          'session_id', NEW.id,
          'note', 'Batch was prematurely archived while trim session was active; reverting to in_trim'
        ),
        'Corrected premature archival during trim session completion'
      );

      v_current_state := 'in_trim';
    END IF;

    IF v_current_state = 'bucked' THEN
      RAISE NOTICE 'Batch % is in bucked state, transitioning through in_trim before bulk_available',
        NEW.batch_registry_id;

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

      v_current_state := 'in_trim';
    END IF;

    v_target_state := 'bulk_available';

    IF v_current_state = v_target_state THEN
      RAISE NOTICE 'Batch % already in bulk_available state', NEW.batch_registry_id;
      RETURN NEW;
    END IF;

    PERFORM fn_validate_batch_lifecycle_transition(
      NEW.batch_registry_id,
      v_current_state,
      v_target_state
    );

    UPDATE batch_registry
    SET
      lifecycle_state = v_target_state,
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

    RAISE NOTICE 'Updated batch % lifecycle state: % -> %',
      NEW.batch_registry_id, v_current_state, v_target_state;
  END IF;

  RETURN NEW;
END;
$$;
