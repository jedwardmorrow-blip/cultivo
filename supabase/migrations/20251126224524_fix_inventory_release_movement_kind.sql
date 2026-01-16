/*
  # Fix inventory release function to set movement_kind

  ## Problem
  Same as reserve function - missing movement_kind field in INSERT

  ## Solution
  Add movement_kind = 'RELEASE' to inventory_movements INSERT
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

    -- Determine movement type (legacy field)
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

    -- Create audit trail with proper movement_kind
    INSERT INTO inventory_movements (
      movement_kind,        -- ✅ NEW: Required field per event-driven architecture
      movement_type,        -- Legacy field for backward compatibility
      session_id,
      session_type,
      source_identifier,
      source_weight_change,
      notes,
      movement_date
    ) VALUES (
      'RELEASE',            -- ✅ Standard movement_kind per INVENTORY-TRACKING.md
      v_movement_type,      -- Legacy movement_type
      OLD.id,
      TG_TABLE_NAME,
      OLD.package_id,
      OLD.pull_weight,      -- Positive because it's being returned to available
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
'Releases reserved inventory when a session is cancelled. Uses movement_kind=RELEASE per event-driven architecture. Handles different worker name columns via JSON extraction.';
