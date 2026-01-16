/*
  # Fix release_inventory function - Add dynamic column extraction for bucking_sessions

  ## Problem
  Bucking session cancellation will fail with the same error as session creation:
  ```
  Could not find the 'package_id' column of 'bucking_sessions' in the schema cache
  ```

  ## Root Cause
  Same as reserve function - bucking_sessions uses different column names.

  The release_inventory trigger function directly references OLD.package_id and OLD.pull_weight,
  which works for trim/packaging but FAILS for bucking_sessions.

  ## Solution
  Apply dynamic JSON extraction to handle different column names across session types.
  Extract from OLD record (since this is an UPDATE trigger checking cancellation).

  ## References
  - Previous migration: fix_bucking_reserve_inventory_dynamic_columns
  - CHANGELOG.md (Nov 26): Dynamic JSON extraction pattern
  - Migration 20251126222206: Dynamic column access for worker names
*/

CREATE OR REPLACE FUNCTION release_inventory_on_session_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inventory_item RECORD;
  v_worker_name_column text;
  v_worker_name text;
  v_package_id_column text;
  v_pull_weight_column text;
  v_package_id text;
  v_pull_weight numeric;
  v_old_json jsonb;
BEGIN
  -- Only process if status changed to 'cancelled'
  IF OLD.session_status != 'cancelled' AND NEW.session_status = 'cancelled' THEN

    -- Convert OLD to JSON once for all dynamic extractions
    v_old_json := to_jsonb(OLD);

    -- Determine column names based on table (string literals only)
    IF TG_TABLE_NAME = 'bucking_sessions' THEN
      v_worker_name_column := 'bucker_name';
      v_package_id_column := 'binned_package_id';
      v_pull_weight_column := 'binned_weight_grams';
    ELSIF TG_TABLE_NAME = 'trim_sessions' THEN
      v_worker_name_column := 'trimmer_name';
      v_package_id_column := 'package_id';
      v_pull_weight_column := 'pull_weight';
    ELSIF TG_TABLE_NAME = 'packaging_sessions' THEN
      v_worker_name_column := 'packager_name';
      v_package_id_column := 'package_id';
      v_pull_weight_column := 'pull_weight';
    ELSE
      -- Unknown session type
      v_worker_name_column := NULL;
      v_package_id_column := 'package_id';
      v_pull_weight_column := 'pull_weight';
    END IF;

    -- Extract values dynamically from JSON
    v_worker_name := v_old_json->>v_worker_name_column;
    v_package_id := v_old_json->>v_package_id_column;
    v_pull_weight := (v_old_json->>v_pull_weight_column)::numeric;

    -- Validate required fields exist
    IF v_package_id IS NULL OR v_pull_weight IS NULL THEN
      RAISE WARNING 'Session missing required fields during cancellation: package_id=%, pull_weight=%',
        v_package_id, v_pull_weight;
      RETURN NEW;
    END IF;

    -- Get the inventory item (need id for event-driven fields)
    SELECT * INTO v_inventory_item
    FROM inventory_items
    WHERE package_id = v_package_id;

    -- If item doesn't exist, log warning but don't fail
    IF NOT FOUND THEN
      RAISE WARNING 'Inventory item % not found during release', v_package_id;
      RETURN NEW;
    END IF;

    -- Release the reserved inventory back to available
    UPDATE inventory_items
    SET
      available_qty = available_qty + v_pull_weight,
      reserved_qty = reserved_qty - v_pull_weight,
      last_updated = now()
    WHERE package_id = v_package_id;

    -- Create audit trail with event-driven architecture fields
    INSERT INTO inventory_movements (
      -- Event-driven architecture fields (required by validation trigger)
      movement_kind,
      source_item_id,
      qty,
      unit,

      -- Legacy fields for backward compatibility
      movement_type,
      session_id,
      session_type,
      source_identifier,
      source_weight_change,

      -- Metadata
      notes,
      movement_date
    ) VALUES (
      'RELEASE',
      v_inventory_item.id,
      v_pull_weight,
      'g',

      NULL,
      OLD.id,
      TG_TABLE_NAME,
      v_package_id,
      v_pull_weight,

      format('Released %s g from cancelled %s session by %s',
        v_pull_weight,
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
'Releases reserved inventory when a session is cancelled. Uses dynamic JSON extraction to handle different column names across session types: bucking_sessions (binned_package_id, binned_weight_grams) vs trim/packaging_sessions (package_id, pull_weight). Uses event-driven architecture: movement_kind=RELEASE, source_item_id (UUID), qty (positive), unit=g. Sets movement_type=NULL because this is an inventory operation, not a session lifecycle event.';
