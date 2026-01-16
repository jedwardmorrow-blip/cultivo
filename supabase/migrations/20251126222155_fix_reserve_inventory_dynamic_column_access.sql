/*
  # Fix reserve_inventory_on_session_start with dynamic SQL for column access

  ## Problem
  Even with CASE TG_TABLE_NAME, PostgreSQL still validates that ALL columns referenced exist:
    v_worker_name := CASE TG_TABLE_NAME
      WHEN 'packaging_sessions' THEN NEW.packager_name
      WHEN 'trim_sessions' THEN NEW.trimmer_name  -- ❌ Fails here on packaging_sessions
  
  PostgreSQL parses and validates column references at function creation/execution time,
  regardless of which CASE branch will actually execute.

  ## Solution
  Use dynamic SQL with EXECUTE to access columns by name string, avoiding compile-time validation.
  Extract the column name as a string, then use row_to_json() to access the field dynamically.

  ## Technical Approach
  1. Determine which column name to use based on TG_TABLE_NAME
  2. Use row_to_json(NEW) to convert record to JSON
  3. Extract the worker name from JSON using the column name string
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
  -- Determine movement type based on session table
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
    NEW.id,
    TG_TABLE_NAME,
    v_movement_type,
    NEW.package_id,
    -NEW.pull_weight, -- Negative because it's being removed from available
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
'Reserves inventory when a session starts. Uses dynamic JSON extraction to access different worker name columns (packager_name, trimmer_name, bucker_name) without triggering column validation errors.';
