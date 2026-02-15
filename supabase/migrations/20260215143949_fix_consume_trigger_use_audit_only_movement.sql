/*
  # Fix Consume Trigger: Use Audit-Only Movement

  ## Summary
  Fixes a double-decrement bug in consume_source_on_session_complete. The function
  directly updates inventory quantities AND creates a CONSUME movement. The movement
  trigger (fn_update_inventory_on_hand) would process that CONSUME movement and
  decrement on_hand_qty a second time, breaking ATP consistency.

  ## Fix
  Changed reason_code from 'session_source_consumed' to 'session_finalization' so
  the movement trigger treats the audit record as a NO-OP (bypasses quantity update).
  This follows the same pattern as finalize_session_aggregated: quantities set directly,
  movement record for audit trail only.

  ## Architecture Alignment
  Per Architecture Decision #1 (Finalization = Creation):
  - Quantities are set DIRECTLY during the consume operation
  - Movement record is audit-only (trigger bypasses reason_code='session_finalization')
  - Same pattern as output creation in finalize_session_aggregated
*/

CREATE OR REPLACE FUNCTION consume_source_on_session_complete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_source_package_id TEXT;
  v_consumed_weight NUMERIC;
  v_inventory_item_id UUID;
  v_operator_name TEXT;
BEGIN
  IF OLD.session_status != 'completed' AND NEW.session_status = 'completed' THEN

    IF TG_TABLE_NAME = 'bucking_sessions' THEN
      v_source_package_id := NEW.binned_package_id;
      v_consumed_weight := NEW.binned_weight_grams;
      v_operator_name := COALESCE(NEW.bucker_name, 'unknown');
    ELSIF TG_TABLE_NAME = 'trim_sessions' THEN
      v_source_package_id := NEW.package_id;
      v_consumed_weight := NEW.pulled_weight;
      v_operator_name := COALESCE(NEW.trimmer_name, 'unknown');
    ELSIF TG_TABLE_NAME = 'packaging_sessions' THEN
      v_source_package_id := NEW.package_id;
      v_consumed_weight := NEW.pull_weight;
      v_operator_name := COALESCE(NEW.packager_name, 'unknown');
    ELSE
      RAISE WARNING 'consume_source_on_session_complete: unknown table %', TG_TABLE_NAME;
      RETURN NEW;
    END IF;

    IF v_source_package_id IS NULL OR v_consumed_weight IS NULL OR v_consumed_weight <= 0 THEN
      RAISE WARNING 'consume_source_on_session_complete: skipping - no source package or weight for session %', NEW.id;
      RETURN NEW;
    END IF;

    SELECT id INTO v_inventory_item_id
    FROM inventory_items
    WHERE package_id = v_source_package_id;

    IF v_inventory_item_id IS NULL THEN
      RAISE WARNING 'consume_source_on_session_complete: source item % not found', v_source_package_id;
      RETURN NEW;
    END IF;

    PERFORM set_config('app.allow_quantity_update', 'true', true);

    UPDATE inventory_items
    SET
      on_hand_qty = GREATEST(0, on_hand_qty - v_consumed_weight),
      reserved_qty = GREATEST(0, reserved_qty - v_consumed_weight),
      available_qty = GREATEST(0, on_hand_qty - v_consumed_weight) - GREATEST(0, reserved_qty - v_consumed_weight),
      last_updated = now()
    WHERE id = v_inventory_item_id;

    PERFORM set_config('app.allow_quantity_update', 'false', true);

    INSERT INTO inventory_movements (
      movement_kind,
      source_item_id,
      qty,
      unit,
      reference_id,
      reference_type,
      reason_code,
      notes,
      movement_date,
      created_by
    ) VALUES (
      'CONSUME',
      v_inventory_item_id,
      v_consumed_weight,
      'g',
      NEW.id,
      TG_TABLE_NAME,
      'session_finalization',
      format('Source consumed: %s g from %s on %s completion by %s',
        v_consumed_weight,
        v_source_package_id,
        TG_TABLE_NAME,
        v_operator_name
      ),
      now(),
      COALESCE(auth.uid()::text, 'system')
    );

    RAISE NOTICE 'consume_source_on_session_complete: consumed % g from % for session %',
      v_consumed_weight, v_source_package_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION consume_source_on_session_complete() IS
  'Consumes source inventory when a production session completes. Decrements on_hand_qty
   and reserved_qty directly, maintaining ATP consistency. Creates audit-only movement
   (reason_code=session_finalization bypasses trigger). Completes the RESERVE->CONSUME
   lifecycle. Created: 2026-02-15.';
