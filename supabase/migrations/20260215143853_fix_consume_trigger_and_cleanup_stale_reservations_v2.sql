/*
  # Fix Source Consumption Trigger and Cleanup Stale Reservations (v2)

  ## Summary
  1. Fixes the consume_source_on_session_complete function to use correct
     inventory_movements column names (movement_kind, source_item_id, qty, etc.)
  2. Cleans up ~31 inventory items stuck with stale reservations from past sessions

  ## Changes
  1. Updated Functions
    - `consume_source_on_session_complete()` - Fixed inventory_movements INSERT
      to use correct column names matching the event-driven schema

  2. Data Cleanup
    - Sets on_hand_qty = 0, available_qty = 0, reserved_qty = 0 for stuck items
    - Creates CONSUME audit trail entries (qty = on_hand_qty being consumed)
    - Uses reason_code='session_finalization' so movement trigger treats as audit-only
    - Affects ~31 items across bucking, trim, and packaging sessions

  ## Security
  - Uses set_config('app.allow_quantity_update') to bypass direct update protection
  - All changes logged to inventory_movements with full audit trail
*/

-- =====================================================
-- STEP 1: Fix the consume_source_on_session_complete function
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
      'session_source_consumed',
      format('Consumed %s g from %s on %s session completion by %s',
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
   and reserved_qty, maintaining ATP consistency. Creates audit trail in inventory_movements.
   Completes the RESERVE->CONSUME lifecycle gap. Created: 2026-02-15.';

-- =====================================================
-- STEP 2: Cleanup stale reservations from past sessions
-- =====================================================

DO $$
DECLARE
  v_item RECORD;
  v_cleaned_count INTEGER := 0;
BEGIN
  PERFORM set_config('app.allow_quantity_update', 'true', true);

  FOR v_item IN
    SELECT DISTINCT ii.id as item_id, ii.package_id, ii.on_hand_qty, ii.reserved_qty
    FROM inventory_items ii
    WHERE ii.on_hand_qty > 0
      AND ii.available_qty = 0
      AND ii.reserved_qty > 0
      AND (
        EXISTS (
          SELECT 1 FROM bucking_sessions bs
          WHERE bs.binned_package_id = ii.package_id
            AND bs.session_status = 'completed'
        )
        OR EXISTS (
          SELECT 1 FROM trim_sessions ts
          WHERE ts.package_id = ii.package_id
            AND ts.session_status = 'completed'
        )
        OR EXISTS (
          SELECT 1 FROM packaging_sessions ps
          WHERE ps.package_id = ii.package_id
            AND ps.session_status = 'completed'
        )
      )
  LOOP
    UPDATE inventory_items
    SET on_hand_qty = 0, available_qty = 0, reserved_qty = 0, last_updated = now()
    WHERE id = v_item.item_id;

    INSERT INTO inventory_movements (
      movement_kind, source_item_id, qty, unit, reason_code, reference_type, notes, movement_date, created_by
    ) VALUES (
      'CONSUME',
      v_item.item_id,
      v_item.on_hand_qty,
      'g',
      'session_finalization',
      'system_migration',
      format('Stale reservation cleanup: consumed %s g from %s (on_hand=%s, reserved=%s from completed session)',
        v_item.on_hand_qty, v_item.package_id, v_item.on_hand_qty, v_item.reserved_qty),
      now(),
      'system'
    );

    v_cleaned_count := v_cleaned_count + 1;
  END LOOP;

  PERFORM set_config('app.allow_quantity_update', 'false', true);

  RAISE NOTICE 'Stale reservation cleanup: % items cleaned', v_cleaned_count;
END $$;

-- =====================================================
-- STEP 3: Verify cleanup
-- =====================================================

DO $$
DECLARE
  v_remaining INTEGER;
  v_atp_mismatches INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_remaining
  FROM inventory_items
  WHERE on_hand_qty > 0 AND available_qty = 0 AND reserved_qty > 0;

  IF v_remaining > 0 THEN
    RAISE WARNING 'Cleanup incomplete: % items still have stale reservations', v_remaining;
  ELSE
    RAISE NOTICE 'All stale reservations resolved successfully';
  END IF;

  SELECT COUNT(*) INTO v_atp_mismatches
  FROM inventory_items
  WHERE available_qty != (on_hand_qty - COALESCE(reserved_qty, 0));

  IF v_atp_mismatches > 0 THEN
    RAISE WARNING 'ATP consistency: % items have mismatches', v_atp_mismatches;
  ELSE
    RAISE NOTICE 'ATP consistency check passed: all items consistent';
  END IF;
END $$;
