/*
  # Fix Packaging Finalization Ghost Inventory with Constraint Trigger
  
  ## Summary
  Fixes ATP constraint violation during packaging finalization by replacing CHECK constraint
  with a deferrable CONSTRAINT TRIGGER, enabling proper event-driven ledger pattern.
  
  ## Problem
  PostgreSQL CHECK constraints CANNOT be marked DEFERRABLE (ERROR: 0A000).
  This prevents the immutable ledger pattern where:
  1. INSERT inventory_items with on_hand_qty=0 (ATP: 0 = 0 - 0 ✓)
  2. Movement trigger updates on_hand_qty=285 (ATP: 0 ≠ 285 - 0 ✗ FAILS!)
  3. Update available_qty=285 (ATP: 285 = 285 - 0 ✓)
  
  ## Solution
  Replace CHECK constraint with CONSTRAINT TRIGGER:
  - Constraint triggers CAN be deferred (fire at COMMIT)
  - Validates ATP formula after all triggers and updates complete
  - Maintains data integrity while supporting complex transactions
  
  ## Changes
  1. Drop CHECK constraint chk_atp_consistency
  2. Create constraint trigger function fn_validate_atp_consistency
  3. Create DEFERRABLE CONSTRAINT TRIGGER on inventory_items
  4. Update finalize_session_aggregated to use immutable ledger pattern
  
  ## Architecture
  This aligns with documented patterns in:
  - EVENT-DRIVEN-INVENTORY-IMPLEMENTATION.md: Immutable ledger architecture
  - INVENTORY-TRACKING.md: Movements as source of truth
  - SESSION-2026-01-22-PKG-FINALIZATION-GHOST-FIX.md: Transaction control
  
  ## Migration Date
  2026-01-27
*/

-- ============================================================================
-- STEP 1: Drop Existing CHECK Constraint
-- ============================================================================

ALTER TABLE inventory_items 
DROP CONSTRAINT IF EXISTS chk_atp_consistency;

-- ============================================================================
-- STEP 2: Create Constraint Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_validate_atp_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
  v_expected_available_qty NUMERIC;
BEGIN
  -- Calculate expected available_qty using ATP formula
  v_expected_available_qty := NEW.on_hand_qty - COALESCE(NEW.reserved_qty, 0);
  
  -- Validate ATP consistency
  IF NEW.available_qty IS DISTINCT FROM v_expected_available_qty THEN
    RAISE EXCEPTION 'ATP consistency violation for package %: available_qty (%) must equal on_hand_qty (%) - reserved_qty (%) = %',
      NEW.package_id,
      NEW.available_qty,
      NEW.on_hand_qty,
      COALESCE(NEW.reserved_qty, 0),
      v_expected_available_qty
    USING ERRCODE = '23514'; -- check_violation
  END IF;
  
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION fn_validate_atp_consistency IS
  'Validates ATP (Available-to-Promise) consistency: available_qty = on_hand_qty - reserved_qty.
   Used as a CONSTRAINT TRIGGER to support deferrable validation at COMMIT time.
   This enables immutable ledger patterns where movement triggers update on_hand_qty before ATP validation.
   Created: 2026-01-27';

-- ============================================================================
-- STEP 3: Create Deferrable Constraint Trigger
-- ============================================================================

CREATE CONSTRAINT TRIGGER trg_validate_atp_consistency
  AFTER INSERT OR UPDATE OF on_hand_qty, available_qty, reserved_qty
  ON inventory_items
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION fn_validate_atp_consistency();

COMMENT ON TRIGGER trg_validate_atp_consistency ON inventory_items IS
  'CONSTRAINT TRIGGER: Validates ATP consistency at COMMIT time (deferrable).
   Allows multi-step operations within transaction where:
   1. INSERT with on_hand_qty=0, available_qty=0
   2. Movement trigger updates on_hand_qty
   3. UPDATE available_qty to match
   4. ATP validated at COMMIT: available_qty = on_hand_qty - reserved_qty
   Created: 2026-01-27';

-- ============================================================================
-- STEP 4: Update RPC Function to Follow Immutable Ledger Pattern
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
      -- *** IMMUTABLE LEDGER PATTERN: CREATE INVENTORY BEFORE UPDATING STATUS ***
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
          -- STEP 4: CREATE INVENTORY USING IMMUTABLE LEDGER PATTERN
          -- ========================================================================
          -- CRITICAL: Start with on_hand_qty=0 and let movement trigger set it
          -- This follows the event-driven architecture where movements are source of truth
          -- ATP constraint trigger is DEFERRABLE so it validates at COMMIT after all operations
          
          INSERT INTO inventory_items (
            package_id, batch_id, batch_number, strain_id, product_name, product_stage_id,
            on_hand_qty, available_qty, reserved_qty, unit, status, package_date
          ) VALUES (
            v_package_id, p_batch_id, v_batch_number, v_strain_id, p_product_name, v_packaged_stage_id,
            0, 0, 0, 'unit', 'Available', v_package_date
          )
          RETURNING id INTO v_inventory_item_id;

          -- ========================================================================
          -- STEP 5: CREATE MOVEMENT (TRIGGER SETS ON_HAND_QTY)
          -- ========================================================================
          -- The PRODUCE movement trigger (fn_update_inventory_on_hand) will:
          -- UPDATE inventory_items SET on_hand_qty = 0 + v_total_units = v_total_units
          
          INSERT INTO inventory_movements (
            movement_kind, dest_item_id, qty, unit, reason_code, reference_type, notes, created_by
          ) VALUES (
            'PRODUCE', v_inventory_item_id, v_total_units, 'unit', 'session_finalization', 'packaging_session',
            format('Finalized %s units from %s packaging session(s) for batch %s', 
              v_total_units, array_length(v_session_ids, 1), v_batch_number),
            COALESCE(auth.uid()::text, 'system')
          );

          -- ========================================================================
          -- STEP 6: UPDATE AVAILABLE_QTY AFTER TRIGGER
          -- ========================================================================
          -- After movement trigger sets on_hand_qty, update available_qty to match
          -- ATP formula: available_qty = on_hand_qty - reserved_qty
          -- Since reserved_qty = 0, available_qty = on_hand_qty
          
          UPDATE inventory_items
          SET available_qty = on_hand_qty
          WHERE id = v_inventory_item_id;

          -- ========================================================================
          -- STEP 7: UPDATE SESSION STATUS (AFTER INVENTORY CREATED)
          -- ========================================================================
          -- Only mark sessions as finalized after inventory successfully created
          
          UPDATE packaging_sessions
          SET finalization_status_packaged = 'finalized',
              finalized_at_packaged = NOW(),
              finalized_by_packaged = auth.uid()
          WHERE id = ANY(v_session_ids);

          GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;

          -- ATP constraint trigger validates at COMMIT:
          -- available_qty (285) = on_hand_qty (285) - reserved_qty (0) ✓

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
   PACKAGING SESSIONS: Uses immutable ledger pattern:
     1. INSERT inventory_items with on_hand_qty=0
     2. CREATE PRODUCE movement (trigger sets on_hand_qty)
     3. UPDATE available_qty = on_hand_qty after trigger
     4. UPDATE session status
   ATP constraint trigger is DEFERRABLE so validation happens at COMMIT after all operations.
   Updated: 2026-01-27 (immutable ledger pattern + deferrable constraint trigger)';

-- ============================================================================
-- STEP 5: Verify Configuration
-- ============================================================================

DO $$
DECLARE
  v_trigger_count INTEGER;
BEGIN
  -- Verify constraint trigger exists
  SELECT COUNT(*)
  INTO v_trigger_count
  FROM pg_trigger
  WHERE tgname = 'trg_validate_atp_consistency'
    AND tgrelid = 'inventory_items'::regclass
    AND tgdeferrable = TRUE;

  IF v_trigger_count = 0 THEN
    RAISE EXCEPTION 'ATP constraint trigger not found or not deferrable!';
  END IF;

  RAISE NOTICE 'ATP constraint trigger verified: DEFERRABLE INITIALLY DEFERRED';
END $$;
