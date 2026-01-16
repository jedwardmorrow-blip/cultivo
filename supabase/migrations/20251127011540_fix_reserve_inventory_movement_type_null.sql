/*
  # Fix reserve_inventory function - Set movement_type to NULL

  ## Problem
  Session creation fails with: "new row for relation inventory_movements violates check constraint valid_movement_type"
  
  The function sets movement_type to 'packaging_reservation', 'trim_reservation', etc.
  but these values are NOT in the allowed list:
  - 'trim_start', 'trim_complete', 'trim_cancelled'
  - 'packaging_start', 'packaging_complete', 'packaging_cancelled'
  - 'manual_adjustment', 'csv_sync'

  ## Root Cause - Architectural Misunderstanding
  The inventory_movements table serves DUAL purposes:
  1. Session lifecycle tracking (uses movement_type)
  2. Inventory operations (uses movement_kind)
  
  RESERVE operations are inventory operations, NOT session lifecycle events.
  Therefore they should:
  - Use movement_kind = 'RESERVE' ✅ (already correct)
  - Set movement_type = NULL ✅ (this fix)

  ## Solution
  Set movement_type = NULL for inventory operations that don't correspond to session lifecycle events.
  Per migration 20251127000000, the constraint now allows NULL for this exact purpose.

  ## Documentation Alignment
  - INVENTORY-TRACKING.md lines 438-441: Event-driven fields (movement_kind, source_item_id, qty, unit)
  - INVENTORY-TRACKING.md lines 553-555: RESERVE/RELEASE operations use movement_kind
  - Migration 20251127000000: Constraint relaxed to allow NULL movement_type
*/

CREATE OR REPLACE FUNCTION reserve_inventory_on_session_start()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inventory_item RECORD;
  v_worker_name_column text;
  v_worker_name text;
  v_new_json jsonb;
BEGIN
  -- Determine which column name to extract (string only, no column reference)
  v_worker_name_column := CASE TG_TABLE_NAME
    WHEN 'packaging_sessions' THEN 'packager_name'
    WHEN 'trim_sessions' THEN 'trimmer_name'
    WHEN 'bucking_sessions' THEN 'bucker_name'
    ELSE NULL
  END;

  -- Extract worker name dynamically from NEW record using JSON
  IF v_worker_name_column IS NOT NULL THEN
    v_new_json := to_jsonb(NEW);
    v_worker_name := v_new_json->>v_worker_name_column;
  ELSE
    v_worker_name := 'unknown';
  END IF;

  -- Get the inventory item (need id for event-driven fields)
  SELECT * INTO v_inventory_item
  FROM inventory_items
  WHERE package_id = NEW.package_id;

  -- Validate inventory exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item % not found', NEW.package_id;
  END IF;

  -- Validate sufficient inventory available
  IF v_inventory_item.available_qty < NEW.pull_weight THEN
    RAISE EXCEPTION 'Insufficient inventory: % has only % available, but % required',
      NEW.package_id,
      v_inventory_item.available_qty,
      NEW.pull_weight;
  END IF;

  -- Reserve the inventory
  UPDATE inventory_items
  SET
    available_qty = available_qty - NEW.pull_weight,
    reserved_qty = reserved_qty + NEW.pull_weight,
    last_updated = now()
  WHERE package_id = NEW.package_id;

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
    'RESERVE',                              -- Standard movement_kind
    v_inventory_item.id,                    -- UUID from inventory_items
    NEW.pull_weight,                        -- Always positive per docs
    'g',                                    -- Unit is grams
    
    NULL,                                   -- ✅ NULL: This is an inventory operation, not session lifecycle
    NEW.id,
    TG_TABLE_NAME,
    NEW.package_id,                         -- Legacy text identifier
    -NEW.pull_weight,                       -- Legacy signed change
    
    format('Reserved %s g for %s session by %s',
      NEW.pull_weight,
      TG_TABLE_NAME,
      COALESCE(v_worker_name, 'unknown')
    ),
    now()
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION reserve_inventory_on_session_start() IS
'Reserves inventory when a session starts. Uses event-driven architecture: movement_kind=RESERVE, source_item_id (UUID), qty (positive), unit=g. Sets movement_type=NULL because this is an inventory operation, not a session lifecycle event. Maintains legacy fields for backward compatibility.';
