/*
  # Add Session Undo Reverse Triggers

  1. Changes
    - Add 'RESTORE' to the inventory_movements movement_kind constraint
    - Create `fn_reverse_consumption_on_session_undo()` function and triggers
      - Fires when session_status changes from 'completed' to 'active'
      - Restores on_hand_qty and reserved_qty on the source inventory item
      - Creates RESTORE audit movement record
    - Create `fn_deconsolidate_on_session_undo()` function and triggers
      - Fires when session_status changes from 'completed' to 'active'
      - Removes session contribution from consolidated_packages
      - Deletes consolidated_package_sources rows for the session
      - Deletes the consolidated_packages row if session_count reaches 0
    - Fix `release_inventory_on_session_cancel` to use correct column name
      - trim_sessions uses 'pulled_weight' not 'pull_weight'

  2. Security
    - No RLS changes; triggers run in security-definer context
    - Uses app.allow_quantity_update bypass for inventory_items direct update guard

  3. Notes
    - The reverse consumption must use set_config('app.allow_quantity_update','true',true)
      to bypass the fn_block_direct_quantity_updates trigger on inventory_items
    - Deconsolidation removes the session from source_session_ids array and adjusts weights
*/

-- Step 1: Add RESTORE to movement_kind constraint
ALTER TABLE inventory_movements
  DROP CONSTRAINT IF EXISTS valid_movement_kind_standardized;

ALTER TABLE inventory_movements
  ADD CONSTRAINT valid_movement_kind_standardized
  CHECK (movement_kind = ANY (ARRAY[
    'RECEIPT', 'CONSUME', 'PRODUCE', 'FULFILLMENT', 'RETURN',
    'RESERVE', 'RELEASE', 'ADJUSTMENT', 'RECONCILIATION', 'RESTORE'
  ]));

-- Step 2: Reverse consumption trigger function
CREATE OR REPLACE FUNCTION fn_reverse_consumption_on_session_undo()
RETURNS TRIGGER AS $$
DECLARE
  v_source_package_id TEXT;
  v_consumed_weight NUMERIC;
  v_inventory_item_id UUID;
  v_operator_name TEXT;
BEGIN
  IF TG_TABLE_NAME = 'bucking_sessions' THEN
    v_source_package_id := OLD.binned_package_id;
    v_consumed_weight := OLD.binned_weight_grams;
    v_operator_name := COALESCE(OLD.bucker_name, 'unknown');
  ELSIF TG_TABLE_NAME = 'trim_sessions' THEN
    v_source_package_id := OLD.package_id;
    v_consumed_weight := OLD.pulled_weight;
    v_operator_name := COALESCE(OLD.trimmer_name, 'unknown');
  ELSIF TG_TABLE_NAME = 'packaging_sessions' THEN
    v_source_package_id := OLD.package_id;
    v_consumed_weight := OLD.pull_weight;
    v_operator_name := COALESCE(OLD.packager_name, 'unknown');
  ELSE
    RAISE WARNING 'fn_reverse_consumption_on_session_undo: unknown table %', TG_TABLE_NAME;
    RETURN NEW;
  END IF;

  IF v_source_package_id IS NULL OR v_consumed_weight IS NULL OR v_consumed_weight <= 0 THEN
    RAISE WARNING 'fn_reverse_consumption_on_session_undo: skipping - no source package or weight for session %', NEW.id;
    RETURN NEW;
  END IF;

  SELECT id INTO v_inventory_item_id
  FROM inventory_items
  WHERE package_id = v_source_package_id;

  IF v_inventory_item_id IS NULL THEN
    RAISE WARNING 'fn_reverse_consumption_on_session_undo: source item % not found', v_source_package_id;
    RETURN NEW;
  END IF;

  PERFORM set_config('app.allow_quantity_update', 'true', true);

  UPDATE inventory_items
  SET
    on_hand_qty = on_hand_qty + v_consumed_weight,
    reserved_qty = reserved_qty + v_consumed_weight,
    available_qty = (on_hand_qty + v_consumed_weight) - (reserved_qty + v_consumed_weight),
    last_updated = now()
  WHERE id = v_inventory_item_id;

  PERFORM set_config('app.allow_quantity_update', 'false', true);

  INSERT INTO inventory_movements (
    movement_kind,
    dest_item_id,
    qty,
    unit,
    reference_id,
    reference_type,
    reason_code,
    notes,
    movement_date,
    created_by
  ) VALUES (
    'RESTORE',
    v_inventory_item_id,
    v_consumed_weight,
    'g',
    NEW.id,
    TG_TABLE_NAME,
    'session_undo',
    format('Restored %s g to %s on %s undo by %s',
      v_consumed_weight,
      v_source_package_id,
      TG_TABLE_NAME,
      v_operator_name
    ),
    now(),
    COALESCE(auth.uid()::text, 'system')
  );

  RAISE NOTICE 'fn_reverse_consumption_on_session_undo: restored % g to % for session %',
    v_consumed_weight, v_source_package_id, NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Deconsolidate trigger function
CREATE OR REPLACE FUNCTION fn_deconsolidate_on_session_undo()
RETURNS TRIGGER AS $$
DECLARE
  v_source RECORD;
BEGIN
  FOR v_source IN
    SELECT cps.id AS source_id,
           cps.consolidated_package_id,
           cps.contribution_weight_grams,
           cps.contribution_units
    FROM consolidated_package_sources cps
    WHERE cps.session_id = NEW.id
  LOOP
    UPDATE consolidated_packages
    SET
      total_weight_grams = GREATEST(0, COALESCE(total_weight_grams, 0) - COALESCE(v_source.contribution_weight_grams, 0)),
      total_units = GREATEST(0, COALESCE(total_units, 0) - COALESCE(v_source.contribution_units, 0)),
      session_count = GREATEST(0, session_count - 1),
      source_session_ids = array_remove(source_session_ids, NEW.id),
      updated_at = now()
    WHERE id = v_source.consolidated_package_id;

    DELETE FROM consolidated_package_sources WHERE id = v_source.source_id;

    DELETE FROM consolidated_packages
    WHERE id = v_source.consolidated_package_id
    AND session_count <= 0;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create triggers on trim_sessions
CREATE TRIGGER trg_reverse_consumption_on_trim_undo
  AFTER UPDATE ON trim_sessions
  FOR EACH ROW
  WHEN (OLD.session_status = 'completed' AND NEW.session_status = 'active')
  EXECUTE FUNCTION fn_reverse_consumption_on_session_undo();

CREATE TRIGGER trg_deconsolidate_on_trim_undo
  AFTER UPDATE ON trim_sessions
  FOR EACH ROW
  WHEN (OLD.session_status = 'completed' AND NEW.session_status = 'active')
  EXECUTE FUNCTION fn_deconsolidate_on_session_undo();

-- Step 5: Create triggers on bucking_sessions
CREATE TRIGGER trg_reverse_consumption_on_bucking_undo
  AFTER UPDATE ON bucking_sessions
  FOR EACH ROW
  WHEN (OLD.session_status = 'completed' AND NEW.session_status = 'active')
  EXECUTE FUNCTION fn_reverse_consumption_on_session_undo();

CREATE TRIGGER trg_deconsolidate_on_bucking_undo
  AFTER UPDATE ON bucking_sessions
  FOR EACH ROW
  WHEN (OLD.session_status = 'completed' AND NEW.session_status = 'active')
  EXECUTE FUNCTION fn_deconsolidate_on_session_undo();

-- Step 6: Create triggers on packaging_sessions
CREATE TRIGGER trg_reverse_consumption_on_packaging_undo
  AFTER UPDATE ON packaging_sessions
  FOR EACH ROW
  WHEN (OLD.session_status = 'completed' AND NEW.session_status = 'active')
  EXECUTE FUNCTION fn_reverse_consumption_on_session_undo();

CREATE TRIGGER trg_deconsolidate_on_packaging_undo
  AFTER UPDATE ON packaging_sessions
  FOR EACH ROW
  WHEN (OLD.session_status = 'completed' AND NEW.session_status = 'active')
  EXECUTE FUNCTION fn_deconsolidate_on_session_undo();

-- Step 7: Fix the cancel trigger column name for trim_sessions
CREATE OR REPLACE FUNCTION release_inventory_on_session_cancel()
RETURNS TRIGGER AS $$
DECLARE
  v_inventory_item RECORD;
  v_package_id_column text;
  v_pull_weight_column text;
  v_package_id text;
  v_pull_weight numeric;
  v_new_json jsonb;
BEGIN
  IF NEW.cancelled_at IS NULL OR OLD.cancelled_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_new_json := to_jsonb(NEW);

  IF TG_TABLE_NAME = 'bucking_sessions' THEN
    v_package_id_column := 'binned_package_id';
    v_pull_weight_column := 'binned_weight_grams';
  ELSIF TG_TABLE_NAME = 'trim_sessions' THEN
    v_package_id_column := 'package_id';
    v_pull_weight_column := 'pulled_weight';
  ELSIF TG_TABLE_NAME = 'packaging_sessions' THEN
    v_package_id_column := 'package_id';
    v_pull_weight_column := 'pull_weight';
  ELSE
    RAISE EXCEPTION 'Unknown session table: %', TG_TABLE_NAME;
  END IF;

  v_package_id := v_new_json->>v_package_id_column;
  v_pull_weight := (v_new_json->>v_pull_weight_column)::numeric;

  IF v_package_id IS NULL OR v_pull_weight IS NULL THEN
    RAISE WARNING 'Cannot release inventory: missing package_id or pull_weight';
    RETURN NEW;
  END IF;

  SELECT * INTO v_inventory_item
  FROM inventory_items
  WHERE package_id = v_package_id;

  IF NOT FOUND THEN
    RAISE WARNING 'Inventory item % not found during session cancellation', v_package_id;
    RETURN NEW;
  END IF;

  UPDATE inventory_items
  SET
    available_qty = available_qty + v_pull_weight,
    reserved_qty = GREATEST(0, reserved_qty - v_pull_weight),
    last_updated = now()
  WHERE package_id = v_package_id;

  INSERT INTO inventory_movements (
    movement_kind,
    dest_item_id,
    qty,
    unit,
    reference_id,
    reference_type,
    reason_code,
    notes,
    movement_date
  ) VALUES (
    'RELEASE',
    v_inventory_item.id,
    v_pull_weight,
    'g',
    NEW.id,
    TG_TABLE_NAME,
    'session_cancel',
    format('Released %s g reservation due to %s session cancellation',
      v_pull_weight,
      TG_TABLE_NAME
    ),
    now()
  );

  RAISE NOTICE 'Released % g back to % due to session cancellation', v_pull_weight, v_package_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
