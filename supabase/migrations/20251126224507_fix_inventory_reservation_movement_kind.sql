/*
  # Fix inventory reservation functions to set movement_kind

  ## Problem
  Session creation fails with: "movement_kind is required"
  
  The inventory reservation functions insert into inventory_movements with:
  - movement_type: 'packaging_reservation', 'trim_reservation', etc. (legacy field)
  - movement_kind: NOT SET (❌ required by constraint!)

  ## Root Cause
  The CHECK constraint valid_movement_kind_new requires movement_kind to be one of:
  - 'RECEIPT', 'CONSUME_SESSION_INPUT', 'PRODUCE_SESSION_OUTPUT', 
  - 'FULFILLMENT', 'RETURN', 'RESERVE', 'RELEASE', 
  - 'ADJUSTMENT', 'RECONCILIATION'

  According to INVENTORY-TRACKING.md (line 563), BATCHES.md (line 657), 
  and SYSTEM-WORKFLOW.md (line 787):
  - Session inventory reservation should use movement_kind = 'RESERVE'
  - Session inventory release should use movement_kind = 'RELEASE'

  ## Solution
  Add movement_kind field to both INSERT statements:
  - reserve_inventory_on_session_start() → movement_kind = 'RESERVE'
  - release_inventory_on_session_cancel() → movement_kind = 'RELEASE'

  ## Documentation Alignment
  - INVENTORY-TRACKING.md lines 113-120: RESERVE/RELEASE are standard movement kinds
  - BATCHES.md line 657: Batch reservations use movement_kind = 'RESERVE'
  - SYSTEM-WORKFLOW.md line 787: Soft reservations use movement_kind = 'RESERVE'
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

  -- Get the inventory item
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
    'RESERVE',            -- ✅ Standard movement_kind per INVENTORY-TRACKING.md
    v_movement_type,      -- Legacy movement_type
    NEW.id,
    TG_TABLE_NAME,
    NEW.package_id,
    -NEW.pull_weight,     -- Negative because it's being removed from available
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
'Reserves inventory when a session starts. Uses movement_kind=RESERVE per event-driven architecture. Handles different worker name columns via JSON extraction.';
