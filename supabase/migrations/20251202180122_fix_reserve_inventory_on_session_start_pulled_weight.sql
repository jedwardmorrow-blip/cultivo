/*
  # Fix reserve_inventory_on_session_start Function - Correct Column Name for Trim Sessions

  1. Problem
    - Function `reserve_inventory_on_session_start()` uses wrong column name for trim sessions
    - Looking for `pull_weight` but trim_sessions table uses `pulled_weight`
    - This is the function actually being called by the trigger (not reserve_inventory_for_session)

  2. Solution
    - Update line setting v_pull_weight_column for trim_sessions
    - Change from 'pull_weight' to 'pulled_weight'

  3. Impact
    - Fixes trim session creation errors
    - Allows proper inventory reservation on session start
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
  v_package_id_column text;
  v_pull_weight_column text;
  v_package_id text;
  v_pull_weight numeric;
  v_new_json jsonb;
BEGIN
  -- Convert NEW to JSON once for all dynamic extractions
  v_new_json := to_jsonb(NEW);

  -- Determine column names based on table (string literals only)
  IF TG_TABLE_NAME = 'bucking_sessions' THEN
    v_worker_name_column := 'bucker_name';
    v_package_id_column := 'binned_package_id';
    v_pull_weight_column := 'binned_weight_grams';
  ELSIF TG_TABLE_NAME = 'trim_sessions' THEN
    v_worker_name_column := 'trimmer_name';
    v_package_id_column := 'package_id';
    v_pull_weight_column := 'pulled_weight';  -- FIXED: was 'pull_weight'
  ELSIF TG_TABLE_NAME = 'packaging_sessions' THEN
    v_worker_name_column := 'packager_name';
    v_package_id_column := 'package_id';
    v_pull_weight_column := 'pull_weight';
  ELSE
    -- Unknown session type
    RAISE EXCEPTION 'Unknown session table: %', TG_TABLE_NAME;
  END IF;

  -- Extract values dynamically from JSON
  v_worker_name := v_new_json->>v_worker_name_column;
  v_package_id := v_new_json->>v_package_id_column;
  v_pull_weight := (v_new_json->>v_pull_weight_column)::numeric;

  -- Validate required fields exist
  IF v_package_id IS NULL OR v_pull_weight IS NULL THEN
    RAISE EXCEPTION 'Session missing required fields: package_id=%, pull_weight=%',
      v_package_id, v_pull_weight;
  END IF;

  -- Get the inventory item (need id for event-driven fields)
  SELECT * INTO v_inventory_item
  FROM inventory_items
  WHERE package_id = v_package_id;

  -- Validate inventory exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item % not found', v_package_id;
  END IF;

  -- Validate sufficient inventory available
  IF v_inventory_item.available_qty < v_pull_weight THEN
    RAISE EXCEPTION 'Insufficient inventory: % has only % available, but % required',
      v_package_id,
      v_inventory_item.available_qty,
      v_pull_weight;
  END IF;

  -- ========================================================================
  -- PURE EVENT-DRIVEN: Create movement, let trigger handle quantity updates
  -- ========================================================================
  -- Note: We still directly update available_qty/reserved_qty here because
  -- those are ATP (Available-To-Promise) tracking fields, separate from
  -- on_hand_qty which is managed by the movement trigger.
  -- TODO: In future, move ATP tracking to views based on RESERVE/RELEASE movements

  UPDATE inventory_items
  SET
    available_qty = available_qty - v_pull_weight,
    reserved_qty = reserved_qty + v_pull_weight,
    last_updated = now()
  WHERE package_id = v_package_id;

  -- Create audit trail with PURE event-driven architecture
  INSERT INTO inventory_movements (
    -- Event-driven architecture fields (NEW SYSTEM)
    movement_kind,      -- 'RESERVE'
    source_item_id,     -- UUID reference to inventory_items
    qty,                -- Amount being reserved
    unit,               -- 'g' for grams

    -- Context fields (replaces legacy session_type/source_identifier)
    reference_id,       -- Session UUID
    reference_type,     -- 'bucking_session', 'trim_session', etc.
    reason_code,        -- 'session_start'

    -- Human-readable notes
    notes,
    movement_date
  ) VALUES (
    'RESERVE',
    v_inventory_item.id,
    v_pull_weight,
    'g',

    NEW.id,
    TG_TABLE_NAME,  -- e.g., 'bucking_sessions'
    'session_start',

    format('Reserved %s g for %s session by %s',
      v_pull_weight,
      TG_TABLE_NAME,
      COALESCE(v_worker_name, 'unknown')
    ),
    now()
  );

  RAISE NOTICE 'Reserved % g from % for % session', v_pull_weight, v_package_id, TG_TABLE_NAME;

  RETURN NEW;
END;
$$;
