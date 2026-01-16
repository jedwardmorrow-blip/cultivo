/*
  # Fix Trim Session pulled_weight Column Name Mismatch

  1. Problem
    - Trigger function `reserve_inventory_for_session` references 'pull_weight' for trim_sessions
    - But trim_sessions table uses 'pulled_weight' (with "ed")
    - This causes NULL errors when starting trim sessions

  2. Changes
    - Update reserve_inventory_for_session to use 'pulled_weight' for trim_sessions
    - Update release_inventory_on_cancellation to use 'pulled_weight' for trim_sessions

  3. Impact
    - Fixes "Session missing required fields: pull_weight=<NULL>" error
    - Enables proper inventory reservation for trim sessions
*/

-- Drop and recreate reserve_inventory_for_session with correct column name
CREATE OR REPLACE FUNCTION reserve_inventory_for_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Validate sufficient quantity
  IF v_inventory_item.available_qty < v_pull_weight THEN
    RAISE EXCEPTION 'Insufficient inventory in %: available=%, requested=%',
      v_package_id,
      v_inventory_item.available_qty,
      v_pull_weight;
  END IF;

  -- Update inventory quantities (event-driven fields)
  UPDATE inventory_items
  SET
    available_qty = available_qty - v_pull_weight,
    reserved_qty = reserved_qty + v_pull_weight,
    atp_qty = atp_qty - v_pull_weight,
    updated_at = now()
  WHERE id = v_inventory_item.id;

  -- Create movement record in ledger
  INSERT INTO inventory_movements (
    occurred_at,
    movement_kind,
    package_id,
    product_stage_from,
    product_stage_to,
    quantity_delta,
    strain_id,
    batch_id,
    notes,
    reference_type,
    reference_id
  )
  VALUES (
    now(),
    'reserve',
    v_package_id,
    v_inventory_item.product_stage_id,
    v_inventory_item.product_stage_id,
    v_pull_weight,
    v_inventory_item.strain_id,
    v_inventory_item.batch_id,
    format('Reserved for %s session by %s', TG_TABLE_NAME, v_worker_name),
    TG_TABLE_NAME,
    NEW.id
  );

  RAISE NOTICE 'Reserved % g from % for % session', v_pull_weight, v_package_id, TG_TABLE_NAME;

  RETURN NEW;
END;
$function$;

-- Drop and recreate release_inventory_on_cancellation with correct column name
CREATE OR REPLACE FUNCTION release_inventory_on_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inventory_item RECORD;
  v_package_id_column text;
  v_pull_weight_column text;
  v_package_id text;
  v_pull_weight numeric;
  v_new_json jsonb;
BEGIN
  -- Only process if session was actually cancelled
  IF NEW.cancelled_at IS NULL OR OLD.cancelled_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Convert NEW to JSON for dynamic extraction
  v_new_json := to_jsonb(NEW);

  -- Determine column names based on table
  IF TG_TABLE_NAME = 'bucking_sessions' THEN
    v_package_id_column := 'binned_package_id';
    v_pull_weight_column := 'binned_weight_grams';
  ELSIF TG_TABLE_NAME = 'trim_sessions' THEN
    v_package_id_column := 'package_id';
    v_pull_weight_column := 'pulled_weight';  -- FIXED: was 'pull_weight'
  ELSIF TG_TABLE_NAME = 'packaging_sessions' THEN
    v_package_id_column := 'package_id';
    v_pull_weight_column := 'pull_weight';
  ELSE
    RAISE EXCEPTION 'Unknown session table: %', TG_TABLE_NAME;
  END IF;

  -- Extract values
  v_package_id := v_new_json->>v_package_id_column;
  v_pull_weight := (v_new_json->>v_pull_weight_column)::numeric;

  -- Validate fields exist
  IF v_package_id IS NULL OR v_pull_weight IS NULL THEN
    RAISE WARNING 'Cannot release inventory: missing package_id or pull_weight';
    RETURN NEW;
  END IF;

  -- Get inventory item
  SELECT * INTO v_inventory_item
  FROM inventory_items
  WHERE package_id = v_package_id;

  IF NOT FOUND THEN
    RAISE WARNING 'Inventory item % not found during session cancellation', v_package_id;
    RETURN NEW;
  END IF;

  -- Release reserved inventory back to available
  UPDATE inventory_items
  SET
    available_qty = available_qty + v_pull_weight,
    reserved_qty = GREATEST(0, reserved_qty - v_pull_weight),
    atp_qty = atp_qty + v_pull_weight,
    updated_at = now()
  WHERE id = v_inventory_item.id;

  -- Create movement record in ledger
  INSERT INTO inventory_movements (
    occurred_at,
    movement_kind,
    package_id,
    product_stage_from,
    product_stage_to,
    quantity_delta,
    strain_id,
    batch_id,
    notes,
    reference_type,
    reference_id
  )
  VALUES (
    now(),
    'release',
    v_package_id,
    v_inventory_item.product_stage_id,
    v_inventory_item.product_stage_id,
    v_pull_weight,
    v_inventory_item.strain_id,
    v_inventory_item.batch_id,
    format('Released due to %s session cancellation', TG_TABLE_NAME),
    TG_TABLE_NAME,
    NEW.id
  );

  RAISE NOTICE 'Released % g back to % due to session cancellation', v_pull_weight, v_package_id;

  RETURN NEW;
END;
$function$;