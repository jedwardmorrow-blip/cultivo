/*
  # Fix Ghost Finalization Issue with Proper Transaction Control

  ## Problem Statement

  Packaging sessions are being marked as 'finalized' without creating inventory_items records,
  resulting in "ghost finalizations" where:
  - Session shows finalization_status_packaged = 'finalized'
  - finalized_at_packaged timestamp is set
  - But NO inventory_items record exists
  - But NO inventory_movements ledger entry exists
  - Packages are unusable for order allocation

  **Affected Sessions:** 4 sessions across 3 batches (256 units total)
  - Session ffdd1980-000c-44a4-bcd5-7e23e8b92fac: Batch 251105-SWF, 114 units (finalized 2026-01-21 17:29:12)
  - Session 326ec93f-1154-4f19-99c9-548fd27b5758: Batch 251105-SWF, 114 units (finalized 2026-01-21 14:06:01)
  - Session e8091c75-e057-4a67-ae96-29e89228d75c: Batch 250403HG, 28 units (finalized 2025-12-02 18:47:01)
  - Session e4cb2677-460a-40ed-b83c-be8bfea1f1a9: Batch 250916-ASU, 0 units (cancelled, 2025-10-17)

  ## Root Cause

  The `finalize_session_aggregated()` RPC function lacks proper transaction control:

  1. **No Explicit Transaction:** Function doesn't use BEGIN/COMMIT/ROLLBACK
  2. **Status Updated Before Inventory:** Session status changes even if inventory INSERT fails
  3. **No Error Rollback:** When inventory creation fails (ATP constraint, etc.), status update persists
  4. **Ghost State Created:** Session marked 'finalized' but no inventory exists
  5. **Permanent Ghost:** Future finalization attempts skip ghost sessions (filter: status = 'pending')

  **Historical Context:**
  - 2026-01-21: ATP constraint added (add_atp_consistency_constraint.sql)
  - 2026-01-21: Inventory creation added to RPC (add_inventory_creation_to_finalization.sql)
  - 2026-01-21: ATP fix applied (fix_packaging_finalization_atp_constraint.sql)
  - But: Transaction atomicity was never added
  - Result: When ATP errors occurred, status updated but inventory didn't create

  ## Solution

  ### Part 1: Reset Ghost Sessions
  - Reset finalization_status_packaged to 'pending' for all ghost sessions
  - Clear finalized_at_packaged and finalized_by_packaged timestamps
  - Preserve all session data (no data loss)

  ### Part 2: Fix RPC Function with Transaction Control
  - Wrap inventory creation in explicit BEGIN/EXCEPTION/END block
  - Create inventory BEFORE updating session status
  - Add ROLLBACK on any error (preserves atomicity)
  - Add detailed error messages for debugging
  - Ensure all-or-nothing: if inventory fails, session stays 'pending'

  ### Part 3: Add Monitoring View
  - Create view to detect future ghost finalizations
  - Enable proactive monitoring by operations team
  - Include in daily inventory health checks

  ## Related Sessions

  - SESSION-2026-01-21-PKG-FINALIZATION-INVENTORY-FIX: Initial implementation (incomplete)
  - SESSION-2026-01-21-CONVERSION-ATP-CONSTRAINT-FIX: ATP constraint fix
  - SESSION-2026-01-21-AVAILABLE-QTY-ATP-FIX: ATP violation repairs
  - SESSION-2026-01-22-PKG-FINALIZATION-GHOST-FIX: This fix (final solution)
*/

-- =====================================================================
-- PART 1: RESET GHOST FINALIZED SESSIONS
-- =====================================================================

-- Log ghost sessions being reset (for audit trail in migration logs)
DO $$
DECLARE
  v_ghost_count INTEGER;
  v_ghost_record RECORD;
BEGIN
  -- Count ghost sessions
  SELECT COUNT(*) INTO v_ghost_count
  FROM packaging_sessions ps
  WHERE ps.finalization_status_packaged = 'finalized'
  AND NOT EXISTS (
    SELECT 1 FROM inventory_items ii
    WHERE ii.batch_id = ps.batch_registry_id
    AND ii.product_name = ps.output_product_name
    AND ii.product_stage_id = '323ee0fe-1342-4b26-9379-c373f3cabbb9'
    AND ii.package_date >= ps.completed_at::DATE - INTERVAL '1 day'
  );

  RAISE NOTICE 'Found % ghost finalized sessions to reset', v_ghost_count;

  -- Log details of each ghost session
  FOR v_ghost_record IN
    SELECT
      ps.id,
      br.batch_number,
      ps.output_product_name,
      (COALESCE(ps.units_3_5g, 0) + COALESCE(ps.units_14g, 0) + COALESCE(ps.units_454g, 0)) as total_units,
      ps.finalized_at_packaged
    FROM packaging_sessions ps
    LEFT JOIN batch_registry br ON br.id = ps.batch_registry_id
    WHERE ps.finalization_status_packaged = 'finalized'
    AND NOT EXISTS (
      SELECT 1 FROM inventory_items ii
      WHERE ii.batch_id = ps.batch_registry_id
      AND ii.product_name = ps.output_product_name
      AND ii.product_stage_id = '323ee0fe-1342-4b26-9379-c373f3cabbb9'
      AND ii.package_date >= ps.completed_at::DATE - INTERVAL '1 day'
    )
  LOOP
    RAISE NOTICE 'Resetting ghost session % (Batch: %, Product: %, Units: %, Finalized: %)',
      v_ghost_record.id,
      v_ghost_record.batch_number,
      v_ghost_record.output_product_name,
      v_ghost_record.total_units,
      v_ghost_record.finalized_at_packaged;
  END LOOP;
END $$;

-- Reset ghost sessions to pending status
UPDATE packaging_sessions
SET
  finalization_status_packaged = 'pending',
  finalized_at_packaged = NULL,
  finalized_by_packaged = NULL
WHERE finalization_status_packaged = 'finalized'
AND NOT EXISTS (
  SELECT 1 FROM inventory_items ii
  WHERE ii.batch_id = packaging_sessions.batch_registry_id
  AND ii.product_name = packaging_sessions.output_product_name
  AND ii.product_stage_id = '323ee0fe-1342-4b26-9379-c373f3cabbb9'
  AND ii.package_date >= packaging_sessions.completed_at::DATE - INTERVAL '1 day'
);

-- =====================================================================
-- PART 2: FIX RPC FUNCTION WITH PROPER TRANSACTION CONTROL
-- =====================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS finalize_session_aggregated(uuid, text, text);

-- Recreate with proper transaction control and error handling
CREATE OR REPLACE FUNCTION finalize_session_aggregated(
  p_batch_id UUID,
  p_product_name TEXT DEFAULT NULL,
  p_session_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
          SET finalization_status_trim = 'finalized', finalized_at_trim = NOW(), finalized_by_trim = auth.uid()
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
          SET finalization_status_bigs = 'finalized', finalized_at_bigs = NOW(), finalized_by_bigs = auth.uid()
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
          SET finalization_status_smalls = 'finalized', finalized_at_smalls = NOW(), finalized_by_smalls = auth.uid()
          WHERE id = ANY(v_session_ids);
          GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
        END IF;
      END IF;

    WHEN 'packaging' THEN
      -- *** CRITICAL FIX: CREATE INVENTORY BEFORE UPDATING STATUS ***
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

          -- Step 4: CREATE INVENTORY FIRST (critical for atomicity)
          INSERT INTO inventory_items (
            package_id, batch_id, batch_number, strain_id, product_name, product_stage_id,
            on_hand_qty, available_qty, reserved_qty, unit, status, package_date
          ) VALUES (
            v_package_id, p_batch_id, v_batch_number, v_strain_id, p_product_name, v_packaged_stage_id,
            v_total_units, v_total_units, 0, 'unit', 'Available', v_package_date
          )
          RETURNING id INTO v_inventory_item_id;

          -- Step 5: Create movement ledger
          INSERT INTO inventory_movements (
            movement_kind, dest_item_id, qty, unit, reason_code, reference_type, notes, created_by
          ) VALUES (
            'PRODUCE', v_inventory_item_id, v_total_units, 'unit', 'session_finalization', 'packaging_session',
            format('Finalized %s units from %s session(s) for batch %s', v_total_units, array_length(v_session_ids, 1), v_batch_number),
            COALESCE(auth.uid()::text, 'system')
          );

          -- Step 6: ONLY NOW update session status (after inventory created)
          UPDATE packaging_sessions
          SET finalization_status_packaged = 'finalized', finalized_at_packaged = NOW(), finalized_by_packaged = auth.uid()
          WHERE id = ANY(v_session_ids);

          GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;

        EXCEPTION
          WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            RAISE WARNING 'Packaging finalization failed for batch % product %: %', p_batch_id, p_product_name, v_error_message;
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
          SET finalization_status_bucked = 'finalized', finalized_at_bucked = NOW(), finalized_by_bucked = auth.uid()
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
          SET finalization_status_smalls = 'finalized', finalized_at_smalls = NOW(), finalized_by_smalls = auth.uid()
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
$$;

GRANT EXECUTE ON FUNCTION finalize_session_aggregated(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION finalize_session_aggregated IS
'Finalizes completed production sessions with atomic transaction control. Creates inventory BEFORE updating session status to prevent ghost finalizations.';

-- =====================================================================
-- PART 3: ADD MONITORING VIEW FOR GHOST FINALIZATIONS
-- =====================================================================

CREATE OR REPLACE VIEW ghost_finalized_sessions AS
SELECT
  ps.id as session_id,
  ps.batch_registry_id,
  br.batch_number,
  s.name as strain_name,
  ps.output_product_name,
  ps.finalization_status_packaged,
  ps.finalized_at_packaged,
  ps.completed_at,
  (COALESCE(ps.units_3_5g, 0) + COALESCE(ps.units_14g, 0) + COALESCE(ps.units_454g, 0)) as total_units,
  'No inventory_items record exists for this finalized session' as issue
FROM packaging_sessions ps
LEFT JOIN batch_registry br ON br.id = ps.batch_registry_id
LEFT JOIN strains s ON s.id = ps.strain_id
WHERE ps.finalization_status_packaged = 'finalized'
AND NOT EXISTS (
  SELECT 1 FROM inventory_items ii
  WHERE ii.batch_id = ps.batch_registry_id
  AND ii.product_name = ps.output_product_name
  AND ii.product_stage_id = '323ee0fe-1342-4b26-9379-c373f3cabbb9'
  AND ii.package_date >= ps.completed_at::DATE - INTERVAL '1 day'
);

GRANT SELECT ON ghost_finalized_sessions TO authenticated;

COMMENT ON VIEW ghost_finalized_sessions IS
'Monitoring view to detect ghost finalizations. Should return 0 rows after fix is applied.';
