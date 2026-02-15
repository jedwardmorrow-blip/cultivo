/*
  # Add Source Material Consumption on Session Completion

  ## Summary
  Fixes a critical gap in the session lifecycle: when a session completes (material
  physically processed), the source inventory was never consumed. The reservation
  system correctly reserved material on session start, but no corresponding
  consumption happened on completion. This left source packages permanently stuck
  with on_hand_qty > 0, available_qty = 0, reserved_qty = on_hand_qty.

  ## Problem
  - 31 inventory items stuck showing "0.0 g" in the UI (available_qty = 0)
  - Source material reserved on session start but never consumed on completion
  - ~29,062 grams of phantom inventory across bucking, trim, and packaging sessions
  - ATP formula (available_qty = on_hand_qty - reserved_qty) technically correct
    but misleading: items appear in inventory with 0 available weight

  ## Solution
  Add a trigger that fires when session_status changes to 'completed'. This trigger:
  1. Consumes the source material (sets on_hand_qty to 0)
  2. Releases the reservation (sets reserved_qty to 0)
  3. Sets available_qty to 0 (ATP consistency)
  4. Creates an audit trail in inventory_movements

  ## Design Rationale
  - Consumption happens at COMPLETION (not finalization) because material is
    physically used during the session
  - Finalization remains CREATION-only (per Architecture Decision #1)
  - Uses SECURITY DEFINER to bypass RLS for system operations
  - Direct quantity update (not via movement trigger) to avoid circular triggers
  - ATP CHECK constraint satisfied: available_qty(0) = on_hand_qty(0) - reserved_qty(0)

  ## Tables Modified
  - inventory_items: on_hand_qty, available_qty, reserved_qty set to 0 on source
  - inventory_movements: audit trail entries created

  ## Functions Created
  - consume_source_on_session_complete(): Consumes source inventory when session completes

  ## Triggers Created
  - consume_trim_source: Fires on trim_sessions UPDATE (to completed)
  - consume_packaging_source: Fires on packaging_sessions UPDATE (to completed)
  - consume_bucking_source: Fires on bucking_sessions UPDATE (to completed)

  ## Important Notes
  1. This does NOT affect the finalization function (finalize_session_aggregated)
  2. Finalization continues to handle OUTPUT creation only
  3. The reservation trigger continues to handle RESERVATION on session start
  4. This new trigger handles the missing CONSUMPTION on session completion
*/

-- =====================================================
-- FUNCTION: Consume Source Inventory on Session Complete
-- =====================================================

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
      'session_source_consumed',
      v_source_package_id,
      -v_consumed_weight,
      format('Consumed %s g from %s on %s session completion by %s',
        v_consumed_weight,
        v_source_package_id,
        TG_TABLE_NAME,
        v_operator_name
      ),
      now()
    );

    RAISE NOTICE 'consume_source_on_session_complete: consumed % g from % for session %',
      v_consumed_weight, v_source_package_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION consume_source_on_session_complete() IS
  'Consumes source inventory when a production session completes. Decrements on_hand_qty
   and reserved_qty, maintaining ATP consistency. Creates audit trail in inventory_movements.
   Completes the RESERVE->CONSUME lifecycle gap. Created: 2026-02-15.';

-- =====================================================
-- TRIGGERS: Fire on session completion
-- =====================================================

DROP TRIGGER IF EXISTS consume_trim_source ON trim_sessions;
CREATE TRIGGER consume_trim_source
  AFTER UPDATE ON trim_sessions
  FOR EACH ROW
  WHEN (OLD.session_status IS DISTINCT FROM NEW.session_status AND NEW.session_status = 'completed')
  EXECUTE FUNCTION consume_source_on_session_complete();

DROP TRIGGER IF EXISTS consume_packaging_source ON packaging_sessions;
CREATE TRIGGER consume_packaging_source
  AFTER UPDATE ON packaging_sessions
  FOR EACH ROW
  WHEN (OLD.session_status IS DISTINCT FROM NEW.session_status AND NEW.session_status = 'completed')
  EXECUTE FUNCTION consume_source_on_session_complete();

DROP TRIGGER IF EXISTS consume_bucking_source ON bucking_sessions;
CREATE TRIGGER consume_bucking_source
  AFTER UPDATE ON bucking_sessions
  FOR EACH ROW
  WHEN (OLD.session_status IS DISTINCT FROM NEW.session_status AND NEW.session_status = 'completed')
  EXECUTE FUNCTION consume_source_on_session_complete();
