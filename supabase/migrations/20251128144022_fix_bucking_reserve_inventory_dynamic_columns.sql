/*
  # Fix reserve_inventory function - Add dynamic column extraction for bucking_sessions

  ## Problem
  Bucking session creation fails with error:
  ```
  Could not find the 'package_id' column of 'bucking_sessions' in the schema cache
  ```

  ## Root Cause
  The three session tables use DIFFERENT column names:

  | Session Table       | Package Column       | Weight Column         |
  |---------------------|----------------------|-----------------------|
  | trim_sessions       | package_id           | pull_weight           |
  | packaging_sessions  | package_id           | pull_weight           |
  | bucking_sessions    | binned_package_id    | binned_weight_grams   |

  The reserve_inventory trigger function directly references NEW.package_id and NEW.pull_weight,
  which works for trim/packaging but FAILS for bucking_sessions because those columns don't exist.

  PostgreSQL validates ALL column references at parse time, regardless of CASE branches or conditions.

  ## Solution
  Apply the same dynamic JSON extraction pattern already used for worker_name columns (Nov 26 fix).

  Extract package_id and pull_weight values dynamically using to_jsonb():
  1. Determine column names based on TG_TABLE_NAME (string literals)
  2. Convert NEW record to JSON
  3. Extract values by column name string at runtime
  4. Use extracted variables throughout function

  ## References
  - CHANGELOG.md (Nov 26): Dynamic JSON extraction for worker_name columns
  - Migration 20251126222155: Established this pattern
  - SYSTEM-WORKFLOW.md lines 240-270: Bucking session workflow
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

  -- Reserve the inventory
  UPDATE inventory_items
  SET
    available_qty = available_qty - v_pull_weight,
    reserved_qty = reserved_qty + v_pull_weight,
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
    'RESERVE',
    v_inventory_item.id,
    v_pull_weight,
    'g',

    NULL,
    NEW.id,
    TG_TABLE_NAME,
    v_package_id,
    -v_pull_weight,

    format('Reserved %s g for %s session by %s',
      v_pull_weight,
      TG_TABLE_NAME,
      COALESCE(v_worker_name, 'unknown')
    ),
    now()
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION reserve_inventory_on_session_start() IS
'Reserves inventory when a session starts. Uses dynamic JSON extraction to handle different column names across session types: bucking_sessions (binned_package_id, binned_weight_grams) vs trim/packaging_sessions (package_id, pull_weight). Uses event-driven architecture: movement_kind=RESERVE, source_item_id (UUID), qty (positive), unit=g. Sets movement_type=NULL because this is an inventory operation, not a session lifecycle event.';
