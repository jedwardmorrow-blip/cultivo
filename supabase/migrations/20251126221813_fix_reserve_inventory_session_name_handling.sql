/*
  # Fix reserve_inventory_on_session_start to handle different session column names

  ## Problem
  The function reserve_inventory_on_session_start() uses:
    COALESCE(NEW.packager_name, NEW.trimmer_name, NEW.bucker_name, 'unknown')
  
  This causes error when run on packaging_sessions because trimmer_name column doesn't exist.
  Error: "record 'new' has no field 'trimmer_name'"

  ## Root Cause
  Function tries to access ALL possible worker name columns regardless of which table triggered it.
  PostgreSQL triggers don't support dynamic column access across different table schemas.

  ## Solution
  Use TG_TABLE_NAME to determine which column to access for the current session type.
  Each table has only ONE worker name column:
  - packaging_sessions: packager_name
  - trim_sessions: trimmer_name  
  - bucking_sessions: bucker_name

  ## Changes
  Replace COALESCE with CASE statement that checks TG_TABLE_NAME
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
  v_worker_name text;
BEGIN
  -- Determine movement type based on session table
  v_movement_type := CASE TG_TABLE_NAME
    WHEN 'packaging_sessions' THEN 'packaging_reservation'
    WHEN 'trim_sessions' THEN 'trim_reservation'
    WHEN 'bucking_sessions' THEN 'bucking_reservation'
    ELSE 'session_reservation'
  END;

  -- Extract worker name based on session table (each table has different column name)
  v_worker_name := CASE TG_TABLE_NAME
    WHEN 'packaging_sessions' THEN NEW.packager_name
    WHEN 'trim_sessions' THEN NEW.trimmer_name
    WHEN 'bucking_sessions' THEN NEW.bucker_name
    ELSE 'unknown'
  END;

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
      v_worker_name
    ),
    now()
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION reserve_inventory_on_session_start() IS
'Reserves inventory when a session starts. Handles different worker name columns (packager_name, trimmer_name, bucker_name) based on TG_TABLE_NAME.';
