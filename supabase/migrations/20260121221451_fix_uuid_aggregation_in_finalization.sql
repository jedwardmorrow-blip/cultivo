/*
  # Fix UUID Aggregation Error in Packaging Session Finalization

  ## Problem
  Previous migration (20260121220602) attempted to use MAX(strain_id) to avoid GROUP BY error,
  but PostgreSQL does not support MAX() aggregate function on UUID data types because UUIDs
  are identifiers, not comparable/orderable values.

  Error: "function max(uuid) does not exist"

  ## Root Cause
  Query mixed aggregated columns (SUM, MAX) with non-aggregated column (strain_id) without
  GROUP BY clause. While all sessions in the aggregation DO share the same strain_id (grouped
  by batch + product), PostgreSQL requires explicit handling.

  ## Solution
  Use subquery with LIMIT 1 to extract strain_id value. This is safe because:
  - All sessions in v_session_ids array are for same batch + product combination
  - Batch-centric architecture guarantees one strain per batch
  - LIMIT 1 simply picks the (identical) strain_id from any session in the array

  ## Related History
  - 20260121214818: Added inventory creation (introduced GROUP BY issue)
  - 20260121220602: Attempted MAX(uuid) fix (failed - this migration)
  - 20260121224500: Correct fix using subquery pattern (this migration)
*/

-- Drop and recreate function with corrected UUID handling
DROP FUNCTION IF EXISTS finalize_session_aggregated(uuid, text, text);

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
  v_session_ids UUID[];
  v_sessions_finalized INTEGER := 0;
  v_session_type TEXT;
  v_inventory_item_id UUID;
  v_package_id TEXT;
  v_strain_id UUID;
  v_total_units INTEGER;
  v_package_date DATE;
  v_batch_number TEXT;
  v_packaged_stage_id UUID := '323ee0fe-1342-4b26-9379-c373f3cabbb9'; -- Packaged stage
BEGIN
  -- Use provided session type or auto-detect
  v_session_type := p_session_type;

  -- If session type not provided, detect from pending sessions
  IF v_session_type IS NULL THEN
    SELECT session_type INTO v_session_type
    FROM pending_conversion_sessions
    WHERE batch_id = p_batch_id
    AND (product_name = p_product_name OR p_product_name IS NULL)
    LIMIT 1;

    IF v_session_type IS NULL THEN
      RAISE EXCEPTION 'No pending sessions found for batch % and product "%"', p_batch_id, p_product_name;
    END IF;
  END IF;

  -- Find and finalize all matching sessions based on type and output
  CASE v_session_type
    WHEN 'trim' THEN
      -- Bulk Flower (Trimmed) - Update ONLY bigs fields
      IF p_product_name = 'Bulk Flower (Trimmed)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM trim_sessions
        WHERE batch_registry_id = p_batch_id
        AND session_status = 'completed'
        AND finalization_status_bigs = 'pending'
        AND output_product_bigs_name = 'Bulk Flower (Trimmed)';

        UPDATE trim_sessions
        SET
          finalization_status_bigs = 'finalized',
          finalized_at_bigs = NOW(),
          finalized_by_bigs = auth.uid()
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
        -- Use subquery for strain_id since UUIDs cannot be aggregated with MAX()
        -- This is safe because all sessions in array share same strain_id (grouped by batch+product)
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
        INSERT INTO inventory_items (
          package_id,
          batch_id,
          batch_number,
          strain_id,
          product_name,
          product_stage_id,
          on_hand_qty,
          available_qty,
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
COMMENT ON FUNCTION finalize_session_aggregated IS 'Finalizes completed production sessions and creates consolidated inventory items for packaging sessions. Fixed UUID aggregation error using subquery pattern (v3).';