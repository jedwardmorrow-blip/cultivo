/*
  # Fix release_inventory_on_session_cancel to handle different session column names

  ## Problem
  Same issue as reserve_inventory_on_session_start():
    COALESCE(OLD.packager_name, OLD.trimmer_name, OLD.bucker_name, 'unknown')
  
  This causes error when run on packaging_sessions because trimmer_name column doesn't exist.

  ## Solution
  Use TG_TABLE_NAME to determine which column to access for the current session type.
*/

CREATE OR REPLACE FUNCTION release_inventory_on_session_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_movement_type text;
  v_worker_name text;
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

    -- Extract worker name based on session table
    v_worker_name := CASE TG_TABLE_NAME
      WHEN 'packaging_sessions' THEN OLD.packager_name
      WHEN 'trim_sessions' THEN OLD.trimmer_name
      WHEN 'bucking_sessions' THEN OLD.bucker_name
      ELSE 'unknown'
    END;

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
        v_worker_name
      ),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION release_inventory_on_session_cancel() IS
'Releases reserved inventory when a session is cancelled. Handles different worker name columns based on TG_TABLE_NAME.';
