/*
  # Fix Packaging Finalization ATP Constraint Violation

  ## Problem
  User attempted to finalize packaging session (Swamp Water Fumez, 57 units) and received error:
  ```
  Failed to finalize sessions: new row for relation "inventory_items" 
  violates check constraint "chk_atp_consistency"
  ```

  This is the THIRD error in the packaging finalization chain:
  1. UUID aggregation error (fixed by fix_uuid_aggregation_in_finalization.sql)
  2. Unit validation error (fixed by fix_movement_validation_allow_unit_type.sql)
  3. ATP constraint violation (this fix)

  ## Root Cause

  The `finalize_session_aggregated()` function creates inventory_items with:
  - on_hand_qty = 57 (set explicitly)
  - available_qty = 57 (set explicitly)
  - reserved_qty = NOT SET (relies on DEFAULT 0)

  The ATP constraint enforces:
  ```sql
  CHECK (available_qty = on_hand_qty - COALESCE(reserved_qty, 0))
  ```

  When reserved_qty is NOT explicitly set in the INSERT, the constraint check fails
  even though the column has DEFAULT 0. PostgreSQL constraint checks don't always 
  respect DEFAULT values during validation.

  ## Historical Context

  **Same Issue Fixed Earlier Today:**
  - Migration: `20260121012616_fix_conversion_atp_application_layer.sql`
  - Location: TypeScript conversions.service.ts
  - Problem: INSERT without explicit reserved_qty value
  - Solution: Add reserved_qty column with value 0

  **Why This Happened Again:**
  - Packaging finalization uses SQL RPC function (not TypeScript)
  - Earlier fix only addressed TypeScript code path
  - SQL function path was missed
  - Both code paths create inventory_items, both need explicit reserved_qty

  ## ATP Constraint Background

  **Added:** 2026-01-21 via migration `20260120224915_add_atp_consistency_constraint.sql`

  **Purpose:** Enforce Available-to-Promise formula at database level
  - Prevents invalid inventory states
  - Ensures available_qty is always calculated correctly
  - Catches bugs at write-time instead of read-time

  **Formula:**
  ```
  available_qty = on_hand_qty - reserved_qty
  ```

  **Expected Values for New Package (57 units):**
  - on_hand_qty: 57 (package contains 57 units)
  - reserved_qty: 0 (nothing reserved yet)
  - available_qty: 57 (all units available for allocation)
  - Formula: 57 = 57 - 0 ✅ VALID

  ## Solution

  Update the INSERT INTO inventory_items statement to explicitly include reserved_qty.

  **Changes:**
  1. Add `reserved_qty` to column list (line 157)
  2. Add `0` to VALUES list (line 169)
  3. No schema changes needed - reserved_qty column already exists with DEFAULT 0

  ## Key Learning

  **Best Practice:** When inserting rows subject to multi-column CHECK constraints:
  - ✅ DO: Explicitly set ALL columns used in constraint formula
  - ❌ DON'T: Rely on DEFAULT values for constraint validation
  - Why: PostgreSQL constraint checks may evaluate before DEFAULTs are applied

  ## Related Issues

  - Completes fix chain: UUID → Unit → ATP (this one)
  - Same root cause as SESSION-2026-01-21-CONVERSION-ATP-CONSTRAINT-FIX
  - Blocks: Packaging session finalization workflow
  - Fixes: Production blocker preventing inventory creation
*/

-- Update finalize_session_aggregated() function to explicitly set reserved_qty
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
  v_packaged_stage_id UUID := '323ee0fe-1342-4b26-9379-c373f3cabbb9'; -- Packaged stage
BEGIN
  -- Determine session type if not provided
  IF p_session_type IS NULL THEN
    SELECT 
      CASE 
        WHEN EXISTS(SELECT 1 FROM trim_sessions WHERE batch_registry_id = p_batch_id) THEN 'trim'
        WHEN EXISTS(SELECT 1 FROM packaging_sessions WHERE batch_registry_id = p_batch_id) THEN 'packaging'
        WHEN EXISTS(SELECT 1 FROM bucking_sessions WHERE batch_registry_id = p_batch_id) THEN 'bucking'
        ELSE NULL
      END INTO v_session_type;
  ELSE
    v_session_type := p_session_type;
  END IF;

  IF v_session_type IS NULL THEN
    RAISE EXCEPTION 'No sessions found for batch %', p_batch_id;
  END IF;

  -- Process based on session type
  CASE v_session_type
    WHEN 'trim' THEN
      -- Bulk Trim (Trimmed) - Update ONLY trim fields
      IF p_product_name = 'Bulk Trim (Trimmed)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM trim_sessions
        WHERE batch_registry_id = p_batch_id
        AND session_status = 'completed'
        AND finalization_status_trim = 'pending'
        AND output_product_trim_name = 'Bulk Trim (Trimmed)';

        UPDATE trim_sessions
        SET
          finalization_status_trim = 'finalized',
          finalized_at_trim = NOW(),
          finalized_by_trim = auth.uid()
        WHERE id = ANY(v_session_ids);

        GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
      END IF;

      -- Bulk Flower (Trimmed) - Update ONLY flower fields
      IF p_product_name = 'Bulk Flower (Trimmed)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM trim_sessions
        WHERE batch_registry_id = p_batch_id
        AND session_status = 'completed'
        AND finalization_status_flower = 'pending'
        AND output_product_flower_name = 'Bulk Flower (Trimmed)';

        UPDATE trim_sessions
        SET
          finalization_status_flower = 'finalized',
          finalized_at_flower = NOW(),
          finalized_by_flower = auth.uid()
        WHERE id = ANY(v_session_ids);

        GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
      END IF;

      -- Bulk Smalls (Trimmed) - Update ONLY smalls fields
      IF p_product_name = 'Bulk Smalls (Trimmed)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM trim_sessions
        WHERE batch_registry_id = p_batch_id
        AND session_status = 'completed'
        AND finalization_status_smalls = 'pending'
        AND output_product_smalls_name = 'Bulk Smalls (Trimmed)';

        UPDATE trim_sessions
        SET
          finalization_status_smalls = 'finalized',
          finalized_at_smalls = NOW(),
          finalized_by_smalls = auth.uid()
        WHERE id = ANY(v_session_ids);

        GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
      END IF;

    WHEN 'packaging' THEN
      -- Packaged products - Update packaged fields AND create inventory
      SELECT array_agg(id) INTO v_session_ids
      FROM packaging_sessions
      WHERE batch_registry_id = p_batch_id
      AND session_status = 'completed'
      AND finalization_status_packaged = 'pending'
      AND (output_product_name = p_product_name OR p_product_name IS NULL);

      IF v_session_ids IS NOT NULL AND array_length(v_session_ids, 1) > 0 THEN
        -- Get session details for inventory creation
        -- Use subquery pattern to avoid UUID aggregation error
        SELECT 
          (SELECT strain_id FROM packaging_sessions WHERE id = ANY(v_session_ids) LIMIT 1),
          SUM(COALESCE(units_3_5g, 0) + COALESCE(units_14g, 0) + COALESCE(units_454g, 0)),
          MAX(completed_at)::DATE
        INTO v_strain_id, v_total_units, v_package_date
        FROM packaging_sessions
        WHERE id = ANY(v_session_ids);

        -- Get batch number for display
        SELECT batch_number INTO v_batch_number
        FROM batch_registry
        WHERE id = p_batch_id;

        -- Generate package ID
        v_package_id := generate_next_package_id(p_batch_id);

        -- Create consolidated inventory item
        -- FIX: Explicitly set reserved_qty to satisfy ATP constraint
        INSERT INTO inventory_items (
          package_id,
          batch_id,
          batch_number,
          strain_id,
          product_name,
          product_stage_id,
          on_hand_qty,
          available_qty,
          reserved_qty,  -- ADDED: Explicit reserved_qty
          unit,
          status,
          package_date
        ) VALUES (
          v_package_id,
          p_batch_id,
          v_batch_number,
          v_strain_id,
          p_product_name,
          v_packaged_stage_id,
          v_total_units,
          v_total_units,
          0,  -- ADDED: Explicitly set to 0 (ATP: available_qty = on_hand_qty - reserved_qty)
          'unit',
          'Available',
          v_package_date
        )
        RETURNING id INTO v_inventory_item_id;

        -- Create inventory movement ledger entry
        INSERT INTO inventory_movements (
          movement_kind,
          dest_item_id,
          qty,
          unit,
          reason_code,
          reference_type,
          notes,
          created_by
        ) VALUES (
          'PRODUCE',
          v_inventory_item_id,
          v_total_units,
          'unit',
          'session_finalization',
          'packaging_session',
          format('Finalized packaging sessions: %s units from %s session(s)', v_total_units, array_length(v_session_ids, 1)),
          COALESCE(auth.uid()::text, 'system')
        );

        -- Update session finalization status
        UPDATE packaging_sessions
        SET
          finalization_status_packaged = 'finalized',
          finalized_at_packaged = NOW(),
          finalized_by_packaged = auth.uid()
        WHERE id = ANY(v_session_ids);

        GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
      END IF;

    WHEN 'bucking' THEN
      -- Bulk Flower (Bucked) - Update ONLY bucked fields
      IF p_product_name = 'Bulk Flower (Bucked)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM bucking_sessions
        WHERE batch_registry_id = p_batch_id
        AND session_status = 'completed'
        AND finalization_status_bucked = 'pending'
        AND output_product_flower_name = 'Bulk Flower (Bucked)';

        UPDATE bucking_sessions
        SET
          finalization_status_bucked = 'finalized',
          finalized_at_bucked = NOW(),
          finalized_by_bucked = auth.uid()
        WHERE id = ANY(v_session_ids);

        GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
      END IF;

      -- Bulk Smalls (Bucked) - Update ONLY smalls fields
      IF p_product_name = 'Bulk Smalls (Bucked)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM bucking_sessions
        WHERE batch_registry_id = p_batch_id
        AND session_status = 'completed'
        AND finalization_status_smalls = 'pending'
        AND output_product_smalls_name = 'Bulk Smalls (Bucked)';

        UPDATE bucking_sessions
        SET
          finalization_status_smalls = 'finalized',
          finalized_at_smalls = NOW(),
          finalized_by_smalls = auth.uid()
        WHERE id = ANY(v_session_ids);

        GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
      END IF;

    ELSE
      RAISE EXCEPTION 'Invalid session type: %', v_session_type;
  END CASE;

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'product_name', p_product_name,
    'session_type', v_session_type,
    'sessions_finalized', v_sessions_finalized,
    'session_ids', v_session_ids,
    'inventory_item_id', v_inventory_item_id,
    'package_id', v_package_id,
    'total_units', v_total_units
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION finalize_session_aggregated(UUID, TEXT, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION finalize_session_aggregated IS 
'Finalizes completed production sessions and creates consolidated inventory items for packaging sessions. 
Fixed: UUID aggregation, unit validation, and ATP constraint (explicitly sets reserved_qty=0).';
