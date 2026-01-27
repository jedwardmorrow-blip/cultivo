/*
  # Simplify Finalization: Treat as Creation, Not Movement

  ## Summary
  Simplifies packaging finalization by treating it as inventory CREATION rather than
  a MOVEMENT event. This eliminates complex trigger choreography while maintaining
  complete audit trail and compliance requirements.

  ## Architectural Decision

  **Core Insight:** Session finalization is fundamentally different from inventory movements.

  - **Movements** (CONSUME, FULFILL, ADJUST): Transform existing inventory
    - Trigger-based quantity updates appropriate
    - Examples: consuming bulk to create packages, fulfilling orders

  - **Finalization** (packaging sessions): Create NEW inventory from recorded outputs
    - Direct quantity setting appropriate (no transformation, just creation)
    - Examples: recording session outputs as inventory items

  This aligns with Jan 16, 2026 simplification philosophy: "simplest build possible"
  while maintaining all 3 priorities: audit trail, conversion tracking, simplicity.

  ## Changes

  1. **Movement Trigger:** Bypass session finalization movements (audit only)
  2. **RPC Function:** Set quantities directly without relying on trigger
  3. **Constraint:** Replace deferrable trigger with simple CHECK constraint

  ## Impact Assessment

  - ✅ Packaging sessions: Simplified (4 pending sessions benefit immediately)
  - ✅ Bucking sessions: Unchanged (19 finalized, working correctly)
  - ✅ Trim sessions: Unchanged (13 finalized, working correctly)
  - ✅ Other movements: Unchanged (CONSUME, FULFILL, ADJUST, etc.)
  - ✅ Audit trail: Complete (movement still created, just not processed by trigger)

  ## Related Sessions
  - SESSION-2026-01-16: Conversion architecture simplification
  - SESSION-2026-01-22: Ghost finalization fix (transaction control)
  - SESSION-2026-01-27: ATP constraint trigger (now simplified back to CHECK)

  ## Migration Date
  2026-01-28
*/

-- ============================================================================
-- STEP 1: Update Movement Trigger to Bypass Session Finalization
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_update_inventory_on_hand()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  target_item_id uuid;
  qty_change numeric;
  current_qty numeric;
BEGIN
  -- RESERVE/RELEASE movements don't affect on_hand_qty (ATP tracking only)
  IF NEW.movement_kind IN ('RESERVE', 'RELEASE') THEN
    RAISE NOTICE 'RESERVE/RELEASE movement % - ATP handled by session triggers, no on_hand_qty change', NEW.id;
    RETURN NEW;
  END IF;

  -- SESSION FINALIZATION movements are for audit trail only (creation, not movement)
  -- Quantities set directly during inventory_items INSERT
  IF NEW.reason_code = 'session_finalization' THEN
    RAISE NOTICE 'Session finalization movement % - audit trail only, quantities set directly', NEW.id;
    RETURN NEW;
  END IF;

  -- Determine which item to update
  IF NEW.dest_item_id IS NOT NULL THEN
    target_item_id := NEW.dest_item_id;
  ELSIF NEW.source_item_id IS NOT NULL THEN
    target_item_id := NEW.source_item_id;
  ELSE
    RAISE EXCEPTION 'Movement must have either source_item_id or dest_item_id';
  END IF;

  -- Get current on_hand_qty for logging
  SELECT on_hand_qty INTO current_qty
  FROM inventory_items
  WHERE id = target_item_id;

  -- Set security context to allow quantity update
  PERFORM set_config('app.allow_quantity_update', 'true', true);

  BEGIN
    -- Calculate quantity change based on movement type
    CASE NEW.movement_kind
      -- ABSOLUTE movements: set on_hand_qty to exact value
      WHEN 'ADJUSTMENT', 'RECONCILIATION' THEN
        UPDATE inventory_items
        SET on_hand_qty = NEW.qty,
            last_updated = now()
        WHERE id = target_item_id;

        RAISE NOTICE 'Absolute movement: % -> % for item %', current_qty, NEW.qty, target_item_id;

      -- INCREMENT movements: add to on_hand_qty
      WHEN 'RECEIPT', 'PRODUCE', 'RETURN' THEN
        UPDATE inventory_items
        SET on_hand_qty = COALESCE(on_hand_qty, 0) + NEW.qty,
            last_updated = now()
        WHERE id = target_item_id;

        RAISE NOTICE 'Increment movement: % + % = % for item %', current_qty, NEW.qty, (COALESCE(current_qty, 0) + NEW.qty), target_item_id;

      -- DECREMENT movements: subtract from on_hand_qty
      WHEN 'CONSUME', 'FULFILLMENT' THEN
        UPDATE inventory_items
        SET on_hand_qty = GREATEST(0, COALESCE(on_hand_qty, 0) - NEW.qty),
            last_updated = now()
        WHERE id = target_item_id;

        RAISE NOTICE 'Decrement movement: % - % = % for item %', current_qty, NEW.qty, GREATEST(0, COALESCE(current_qty, 0) - NEW.qty), target_item_id;

      ELSE
        RAISE EXCEPTION 'Unknown movement_kind: %', NEW.movement_kind;
    END CASE;

    -- Verify update occurred
    IF NOT FOUND THEN
      RAISE WARNING 'No inventory item found with id: %', target_item_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Clear security context on error
      PERFORM set_config('app.allow_quantity_update', 'false', true);
      RAISE;
  END;

  -- Clear security context flag
  PERFORM set_config('app.allow_quantity_update', 'false', true);

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION fn_update_inventory_on_hand IS
  'PRIMARY FUNCTION (SECURITY DEFINER): Updates inventory_items.on_hand_qty based on movement_kind.
   RESERVE/RELEASE are NO-OP (ATP tracking only).
   Session finalization movements are NO-OP (audit trail only, quantities set directly).
   Updated: 2026-01-28 (added session finalization bypass)';

-- ============================================================================
-- STEP 2: Simplify ATP Constraint (Replace Trigger with CHECK)
-- ============================================================================

-- Drop the deferrable constraint trigger (no longer needed)
DROP TRIGGER IF EXISTS trg_validate_atp_consistency ON inventory_items;
DROP FUNCTION IF EXISTS fn_validate_atp_consistency();

-- Add simple CHECK constraint (immediate validation)
ALTER TABLE inventory_items
DROP CONSTRAINT IF EXISTS chk_atp_consistency;

ALTER TABLE inventory_items
ADD CONSTRAINT chk_atp_consistency CHECK (
  available_qty = (on_hand_qty - COALESCE(reserved_qty, 0))
);

COMMENT ON CONSTRAINT chk_atp_consistency ON inventory_items IS
  'ATP (Available-to-Promise) consistency: available_qty = on_hand_qty - reserved_qty.
   Simple CHECK constraint (immediate validation) since finalization no longer uses trigger choreography.
   Created: 2026-01-21, Simplified: 2026-01-28';

-- ============================================================================
-- STEP 3: Update RPC Function - Set Quantities Directly
-- ============================================================================

CREATE OR REPLACE FUNCTION finalize_session_aggregated(
  p_batch_id uuid,
  p_product_name text DEFAULT NULL,
  p_session_type text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_session_type TEXT;
  v_sessions_finalized INTEGER := 0;
  v_session_ids UUID[];
  v_inventory_item_id UUID;
  v_package_id TEXT;
  v_batch_number TEXT;
  v_strain_id UUID;
  v_total_units NUMERIC;
  v_package_date DATE;
  v_packaged_stage_id UUID := '323ee0fe-1342-4b26-9379-c373f3cabbb9';
  v_error_message TEXT;
BEGIN
  -- Determine session type if not provided
  IF p_session_type IS NULL THEN
    SELECT
      CASE
        WHEN EXISTS(SELECT 1 FROM trim_sessions WHERE batch_registry_id = p_batch_id AND session_status = 'completed') THEN 'trim'
        WHEN EXISTS(SELECT 1 FROM packaging_sessions WHERE batch_registry_id = p_batch_id AND session_status = 'completed') THEN 'packaging'
        WHEN EXISTS(SELECT 1 FROM bucking_sessions WHERE batch_registry_id = p_batch_id AND session_status = 'completed') THEN 'bucking'
        ELSE NULL
      END INTO v_session_type;
  ELSE
    v_session_type := p_session_type;
  END IF;

  IF v_session_type IS NULL THEN
    RAISE EXCEPTION 'No completed sessions found for batch %', p_batch_id;
  END IF;

  -- Process based on session type
  CASE v_session_type
    WHEN 'trim' THEN
      -- Bulk Trim (Trimmed)
      IF p_product_name = 'Bulk Trim (Trimmed)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM trim_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status_trim = 'pending'
          AND output_product_trim_name = 'Bulk Trim (Trimmed)';

        IF v_session_ids IS NOT NULL AND array_length(v_session_ids, 1) > 0 THEN
          UPDATE trim_sessions
          SET finalization_status_trim = 'finalized',
              finalized_at_trim = NOW(),
              finalized_by_trim = auth.uid()
          WHERE id = ANY(v_session_ids);
          GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
        END IF;
      END IF;

      -- Bulk Flower (Trimmed)
      IF p_product_name = 'Bulk Flower (Trimmed)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM trim_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status_bigs = 'pending'
          AND output_product_bigs_name = 'Bulk Flower (Trimmed)';

        IF v_session_ids IS NOT NULL AND array_length(v_session_ids, 1) > 0 THEN
          UPDATE trim_sessions
          SET finalization_status_bigs = 'finalized',
              finalized_at_bigs = NOW(),
              finalized_by_bigs = auth.uid()
          WHERE id = ANY(v_session_ids);
          GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
        END IF;
      END IF;

      -- Bulk Smalls (Trimmed)
      IF p_product_name = 'Bulk Smalls (Trimmed)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM trim_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status_smalls = 'pending'
          AND output_product_smalls_name = 'Bulk Smalls (Trimmed)';

        IF v_session_ids IS NOT NULL AND array_length(v_session_ids, 1) > 0 THEN
          UPDATE trim_sessions
          SET finalization_status_smalls = 'finalized',
              finalized_at_smalls = NOW(),
              finalized_by_smalls = auth.uid()
          WHERE id = ANY(v_session_ids);
          GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
        END IF;
      END IF;

    WHEN 'packaging' THEN
      -- *** SIMPLIFIED PATTERN: TREAT FINALIZATION AS CREATION ***
      SELECT array_agg(id) INTO v_session_ids
      FROM packaging_sessions
      WHERE batch_registry_id = p_batch_id
        AND session_status = 'completed'
        AND finalization_status_packaged = 'pending'
        AND (output_product_name = p_product_name OR p_product_name IS NULL);

      IF v_session_ids IS NOT NULL AND array_length(v_session_ids, 1) > 0 THEN
        BEGIN
          -- Step 1: Get session details
          SELECT
            (SELECT strain_id FROM packaging_sessions WHERE id = ANY(v_session_ids) LIMIT 1),
            SUM(COALESCE(units_3_5g, 0) + COALESCE(units_14g, 0) + COALESCE(units_454g, 0)),
            MAX(completed_at)::DATE
          INTO v_strain_id, v_total_units, v_package_date
          FROM packaging_sessions
          WHERE id = ANY(v_session_ids);

          -- Validate required data
          IF v_strain_id IS NULL THEN
            RAISE EXCEPTION 'Cannot finalize: strain_id is NULL for batch %', p_batch_id;
          END IF;

          IF v_total_units IS NULL OR v_total_units <= 0 THEN
            RAISE EXCEPTION 'Cannot finalize: total_units is % for batch %', v_total_units, p_batch_id;
          END IF;

          -- Step 2: Get batch number
          SELECT batch_number INTO v_batch_number FROM batch_registry WHERE id = p_batch_id;

          IF v_batch_number IS NULL THEN
            RAISE EXCEPTION 'Cannot finalize: batch_number not found for batch %', p_batch_id;
          END IF;

          -- Step 3: Generate package ID
          v_package_id := generate_next_package_id(p_batch_id);

          -- ========================================================================
          -- STEP 4: CREATE INVENTORY WITH QUANTITIES SET DIRECTLY
          -- ========================================================================
          -- SIMPLIFIED: Set all quantities directly (no trigger choreography)
          -- ATP formula satisfied immediately: available_qty = on_hand_qty - reserved_qty
          -- CHECK constraint validates immediately (no deferral needed)

          INSERT INTO inventory_items (
            package_id, batch_id, batch_number, strain_id, product_name, product_stage_id,
            on_hand_qty, available_qty, reserved_qty, unit, status, package_date
          ) VALUES (
            v_package_id, p_batch_id, v_batch_number, v_strain_id, p_product_name, v_packaged_stage_id,
            v_total_units,  -- Set on_hand_qty directly
            v_total_units,  -- Set available_qty = on_hand_qty (reserved_qty = 0)
            0,              -- No reservations yet
            'unit', 'Available', v_package_date
          )
          RETURNING id INTO v_inventory_item_id;

          -- ========================================================================
          -- STEP 5: CREATE MOVEMENT FOR AUDIT TRAIL ONLY
          -- ========================================================================
          -- Movement recorded for compliance and traceability
          -- Trigger bypasses reason_code='session_finalization' (no quantity update)

          INSERT INTO inventory_movements (
            movement_kind, dest_item_id, qty, unit, reason_code, reference_type, notes, created_by
          ) VALUES (
            'PRODUCE', v_inventory_item_id, v_total_units, 'unit', 'session_finalization', 'packaging_session',
            format('Finalized %s units from %s packaging session(s) for batch %s',
              v_total_units, array_length(v_session_ids, 1), v_batch_number),
            COALESCE(auth.uid()::text, 'system')
          );

          -- ========================================================================
          -- STEP 6: UPDATE SESSION STATUS (AFTER INVENTORY CREATED)
          -- ========================================================================
          -- Only mark sessions as finalized after inventory successfully created

          UPDATE packaging_sessions
          SET finalization_status_packaged = 'finalized',
              finalized_at_packaged = NOW(),
              finalized_by_packaged = auth.uid()
          WHERE id = ANY(v_session_ids);

          GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;

          -- ATP constraint validates immediately: available_qty (285) = on_hand_qty (285) - reserved_qty (0) ✓

        EXCEPTION
          WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            RAISE WARNING 'Packaging finalization failed for batch % product %: %',
              p_batch_id, p_product_name, v_error_message;
            RAISE EXCEPTION 'Failed to finalize packaging sessions: %', v_error_message;
        END;
      END IF;

    WHEN 'bucking' THEN
      -- Bulk Flower (Bucked)
      IF p_product_name = 'Bulk Flower (Bucked)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM bucking_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status_bucked = 'pending'
          AND output_product_flower_name = 'Bulk Flower (Bucked)';

        IF v_session_ids IS NOT NULL AND array_length(v_session_ids, 1) > 0 THEN
          UPDATE bucking_sessions
          SET finalization_status_bucked = 'finalized',
              finalized_at_bucked = NOW(),
              finalized_by_bucked = auth.uid()
          WHERE id = ANY(v_session_ids);
          GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
        END IF;
      END IF;

      -- Bulk Smalls (Bucked)
      IF p_product_name = 'Bulk Smalls (Bucked)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM bucking_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status_smalls = 'pending'
          AND output_product_smalls_name = 'Bulk Smalls (Bucked)';

        IF v_session_ids IS NOT NULL AND array_length(v_session_ids, 1) > 0 THEN
          UPDATE bucking_sessions
          SET finalization_status_smalls = 'finalized',
              finalized_at_smalls = NOW(),
              finalized_by_smalls = auth.uid()
          WHERE id = ANY(v_session_ids);
          GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
        END IF;
      END IF;

    ELSE
      RAISE EXCEPTION 'Invalid session type: %', v_session_type;
  END CASE;

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'product_name', p_product_name,
    'session_type', v_session_type,
    'sessions_finalized', COALESCE(v_sessions_finalized, 0),
    'session_ids', v_session_ids,
    'inventory_item_id', v_inventory_item_id,
    'package_id', v_package_id,
    'total_units', v_total_units
  );
END;
$function$;

COMMENT ON FUNCTION finalize_session_aggregated IS
  'Finalizes completed sessions by aggregating outputs and creating inventory.
   SIMPLIFIED PATTERN (2026-01-28): Treats finalization as CREATION, not MOVEMENT.
   PACKAGING SESSIONS: Sets quantities directly without trigger choreography:
     1. INSERT inventory_items with actual quantities (ATP formula satisfied immediately)
     2. CREATE movement for audit trail only (trigger bypasses session_finalization)
     3. UPDATE session status
   Simpler, faster, more reliable than previous trigger-based approach.
   Updated: 2026-01-28 (simplified creation pattern)';

-- ============================================================================
-- STEP 4: Verify Configuration
-- ============================================================================

DO $$
DECLARE
  v_constraint_count INTEGER;
BEGIN
  -- Verify CHECK constraint exists
  SELECT COUNT(*)
  INTO v_constraint_count
  FROM pg_constraint
  WHERE conname = 'chk_atp_consistency'
    AND conrelid = 'inventory_items'::regclass;

  IF v_constraint_count = 0 THEN
    RAISE EXCEPTION 'ATP CHECK constraint not found!';
  END IF;

  -- Verify constraint trigger was dropped
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_validate_atp_consistency'
  ) THEN
    RAISE EXCEPTION 'Old ATP constraint trigger still exists!';
  END IF;

  RAISE NOTICE '✓ ATP CHECK constraint verified: immediate validation';
  RAISE NOTICE '✓ Movement trigger updated: bypasses session_finalization';
  RAISE NOTICE '✓ RPC function updated: direct quantity setting';
  RAISE NOTICE '✓ Migration complete: finalization simplified';
END $$;
