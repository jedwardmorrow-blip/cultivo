/*
  # Fix reserve_inventory function - Add event-driven architecture fields

  ## Problem
  Session creation fails with: "qty must be a positive number, got: <NULL>"
  
  The validation trigger (fn_validate_movement) requires:
  - qty: Positive number (line 77 of 20251124212728_add_trigger_validation.sql)
  - unit: Must be 'g' (line 86)
  - source_item_id OR dest_item_id: At least one required (line 91)

  Our function currently only sets legacy fields:
  - source_identifier (text) - NOT the same as source_item_id (uuid FK)
  - source_weight_change (numeric) - NOT the same as qty
  - No unit field

  ## Root Cause
  Functions written before event-driven architecture was enforced.
  Migration 20251124212728 added validation trigger but functions weren't updated.

  ## Solution Per Documentation
  According to INVENTORY-TRACKING.md line 440:
  - qty: Always positive, direction implied by movement_kind
  - source_item_id: UUID FK to inventory_items.id
  - unit: 'g' for grams
  - RESERVE: Use source_item_id (taking FROM inventory)
  - RELEASE: Use source_item_id (returning TO inventory)

  ## Implementation
  1. Get inventory_items.id (not just package_id text)
  2. Set source_item_id = inventory_items.id
  3. Set qty = NEW.pull_weight (always positive)
  4. Set unit = 'g'
  5. Keep legacy fields for backward compatibility
*/

CREATE OR REPLACE FUNCTION reserve_inventory_on_session_start()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inventory_item RECORD;
  v_movement_type text;
  v_worker_name_column text;
  v_worker_name text;
  v_new_json jsonb;
BEGIN
  -- Determine movement type based on session table (legacy field)
  v_movement_type := CASE TG_TABLE_NAME
    WHEN 'packaging_sessions' THEN 'packaging_reservation'
    WHEN 'trim_sessions' THEN 'trim_reservation'
    WHEN 'bucking_sessions' THEN 'bucking_reservation'
    ELSE 'session_reservation'
  END;

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
    source_item_id,       -- ✅ NEW: UUID FK to inventory_items.id
    qty,                  -- ✅ NEW: Always positive
    unit,                 -- ✅ NEW: 'g' for grams
    
    -- Legacy fields for backward compatibility
    movement_type,
    session_id,
    session_type,
    source_identifier,    -- Legacy: text package_id
    source_weight_change, -- Legacy: signed numeric
    
    -- Metadata
    notes,
    movement_date
  ) VALUES (
    'RESERVE',                              -- Standard movement_kind
    v_inventory_item.id,                    -- ✅ UUID from inventory_items
    NEW.pull_weight,                        -- ✅ Always positive per docs
    'g',                                    -- ✅ Unit is grams
    
    v_movement_type,                        -- Legacy movement_type
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
'Reserves inventory when a session starts. Complies with event-driven architecture: sets movement_kind=RESERVE, source_item_id (UUID), qty (positive), unit=g. Maintains legacy fields for backward compatibility.';
