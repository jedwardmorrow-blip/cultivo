/*
  # Fix release_inventory function - Set movement_type to NULL

  ## Problem
  Same as reserve function - setting movement_type to values not in constraint list.
  
  The function sets movement_type to 'packaging_cancellation', 'trim_cancellation', etc.
  but these are NOT valid session lifecycle events.

  ## Root Cause - Architectural Misunderstanding
  RELEASE operations are inventory operations, NOT session lifecycle events.
  They should use movement_kind = 'RELEASE' and movement_type = NULL.

  ## Solution
  Set movement_type = NULL for inventory operations.
  Per migration 20251127000000, the constraint now allows NULL for this purpose.

  ## Documentation Alignment
  - INVENTORY-TRACKING.md lines 553-555: RELEASE operations use movement_kind
  - Migration 20251127000000: Constraint allows NULL movement_type
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
  v_old_json jsonb;
BEGIN
  -- Only process if status changed to 'cancelled'
  IF OLD.session_status != 'cancelled' AND NEW.session_status = 'cancelled' THEN

    -- Get the inventory item (need id for event-driven fields)
    SELECT * INTO v_inventory_item
    FROM inventory_items
    WHERE package_id = OLD.package_id;

    -- If item doesn't exist, log warning but don't fail
    IF NOT FOUND THEN
      RAISE WARNING 'Inventory item % not found during release', OLD.package_id;
      RETURN NEW;
    END IF;

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

    -- Create audit trail with event-driven architecture fields
    INSERT INTO inventory_movements (
      -- Event-driven architecture fields (required by validation trigger)
      movement_kind,
      source_item_id,       -- UUID FK to inventory_items.id
      qty,                  -- Always positive
      unit,                 -- 'g' for grams
      
      -- Legacy fields for backward compatibility
      movement_type,        -- NULL for inventory operations (not session lifecycle events)
      session_id,
      session_type,
      source_identifier,    -- Legacy: text package_id
      source_weight_change, -- Legacy: signed numeric
      
      -- Metadata
      notes,
      movement_date
    ) VALUES (
      'RELEASE',                              -- Standard movement_kind
      v_inventory_item.id,                    -- UUID from inventory_items
      OLD.pull_weight,                        -- Always positive per docs
      'g',                                    -- Unit is grams
      
      NULL,                                   -- ✅ NULL: This is an inventory operation, not session lifecycle
      OLD.id,
      TG_TABLE_NAME,
      OLD.package_id,                         -- Legacy text identifier
      OLD.pull_weight,                        -- Legacy signed change (positive = return)
      
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
'Releases reserved inventory when a session is cancelled. Uses event-driven architecture: movement_kind=RELEASE, source_item_id (UUID), qty (positive), unit=g. Sets movement_type=NULL because this is an inventory operation, not a session lifecycle event. Maintains legacy fields for backward compatibility.';
