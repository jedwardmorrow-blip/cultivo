/*
  # Fix release_inventory_on_session_cancel with dynamic SQL for column access

  ## Problem
  Same as reserve function - PostgreSQL validates ALL column references regardless of CASE logic.

  ## Solution
  Use dynamic JSON extraction to access worker name columns.
*/

CREATE OR REPLACE FUNCTION release_inventory_on_session_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_movement_type text;
  v_worker_name_column text;
  v_worker_name text;
  v_old_json jsonb;
BEGIN
  -- Only process if status changed to 'cancelled'
  IF OLD.session_status != 'cancelled' AND NEW.session_status = 'cancelled' THEN

    -- Determine movement type
    v_movement_type := CASE TG_TABLE_NAME
      WHEN 'packaging_sessions' THEN 'packaging_cancellation'
      WHEN 'trim_sessions' THEN 'trim_cancellation'
      WHEN 'bucking_sessions' THEN 'bucking_cancellation'
      ELSE 'session_cancellation'
    END;

    -- Determine which column name to extract (string only)
    v_worker_name_column := CASE TG_TABLE_NAME
      WHEN 'packaging_sessions' THEN 'packager_name'
      WHEN 'trim_sessions' THEN 'trimmer_name'
      WHEN 'bucking_sessions' THEN 'bucker_name'
      ELSE NULL
    END;

    -- Extract worker name dynamically from OLD record using JSON
    IF v_worker_name_column IS NOT NULL THEN
      v_old_json := to_jsonb(OLD);
      v_worker_name := v_old_json->>v_worker_name_column;
    ELSE
      v_worker_name := 'unknown';
    END IF;

    -- Release the reserved inventory back to available
    UPDATE inventory_items
    SET
      available_qty = available_qty + OLD.pull_weight,
      reserved_qty = reserved_qty - OLD.pull_weight,
      last_updated = now()
    WHERE package_id = OLD.package_id;

    -- Create audit trail
    INSERT INTO inventory_movements (
      session_id,
      session_type,
      movement_type,
      source_identifier,
      source_weight_change,
      notes,
      movement_date
    ) VALUES (
      OLD.id,
      TG_TABLE_NAME,
      v_movement_type,
      OLD.package_id,
      OLD.pull_weight, -- Positive because it's being returned to available
      format('Released %s g from cancelled %s session by %s',
        OLD.pull_weight,
        TG_TABLE_NAME,
        COALESCE(v_worker_name, 'unknown')
      ),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION release_inventory_on_session_cancel() IS
'Releases reserved inventory when a session is cancelled. Uses dynamic JSON extraction to access different worker name columns without triggering column validation errors.';
