/*
  # Update Finalization RPC to Handle Trim Products

  ## Problem
  finalize_session_aggregated function only handles flower and smalls outputs from
  trim sessions. Trim products cannot be finalized, even though they appear in view.

  ## Solution
  Add ELSIF branch to handle 'Bulk Trim (Trimmed)' product name finalization.

  ## Changes
  1. Drop and recreate finalize_session_aggregated function
  2. Add trim branch after smalls branch in WHEN 'trim' THEN block
  3. Match sessions by output_product_trim_name = 'Bulk Trim (Trimmed)'
  4. Update finalization_status for matching sessions
*/

-- =====================================================
-- Drop existing function
-- =====================================================

DROP FUNCTION IF EXISTS finalize_session_aggregated(UUID, TEXT, TEXT);

-- =====================================================
-- Recreate with trim support
-- =====================================================

CREATE OR REPLACE FUNCTION finalize_session_aggregated(
  p_batch_id UUID,
  p_product_name TEXT DEFAULT NULL,
  p_session_type TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_ids UUID[];
  v_sessions_finalized INTEGER := 0;
  v_session_type TEXT;
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

  -- Find and finalize all matching sessions based on type
  CASE v_session_type
    WHEN 'trim' THEN
      -- Bulk Flower (Trimmed)
      IF p_product_name = 'Bulk Flower (Trimmed)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM trim_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status = 'pending'
          AND output_product_bigs_name = 'Bulk Flower (Trimmed)';

        UPDATE trim_sessions
        SET
          finalization_status = 'finalized',
          finalized_at = NOW(),
          finalized_by = auth.uid()
        WHERE id = ANY(v_session_ids);

        GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
      END IF;

      -- Bulk Smalls (Trimmed)
      IF p_product_name = 'Bulk Smalls (Trimmed)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM trim_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status = 'pending'
          AND output_product_smalls_name = 'Bulk Smalls (Trimmed)';

        UPDATE trim_sessions
        SET
          finalization_status = 'finalized',
          finalized_at = NOW(),
          finalized_by = auth.uid()
        WHERE id = ANY(v_session_ids);

        GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
      END IF;

      -- Bulk Trim (Trimmed) - NEW
      IF p_product_name = 'Bulk Trim (Trimmed)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM trim_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status = 'pending'
          AND output_product_trim_name = 'Bulk Trim (Trimmed)';

        UPDATE trim_sessions
        SET
          finalization_status = 'finalized',
          finalized_at = NOW(),
          finalized_by = auth.uid()
        WHERE id = ANY(v_session_ids);

        GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
      END IF;

    WHEN 'packaging' THEN
      SELECT array_agg(id) INTO v_session_ids
      FROM packaging_sessions
      WHERE batch_registry_id = p_batch_id
        AND session_status = 'completed'
        AND finalization_status = 'pending'
        AND (output_product_name = p_product_name OR p_product_name IS NULL);

      UPDATE packaging_sessions
      SET
        finalization_status = 'finalized',
        finalized_at = NOW(),
        finalized_by = auth.uid()
      WHERE id = ANY(v_session_ids);

      GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;

    WHEN 'bucking' THEN
      -- Bulk Flower (Bucked)
      IF p_product_name = 'Bulk Flower (Bucked)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM bucking_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status = 'pending'
          AND output_product_flower_name = 'Bulk Flower (Bucked)';

        UPDATE bucking_sessions
        SET
          finalization_status = 'finalized',
          finalized_at = NOW(),
          finalized_by = auth.uid()
        WHERE id = ANY(v_session_ids);

        GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
      END IF;

      -- Bulk Smalls (Bucked)
      IF p_product_name = 'Bulk Smalls (Bucked)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM bucking_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status = 'pending'
          AND output_product_smalls_name = 'Bulk Smalls (Bucked)';

        UPDATE bucking_sessions
        SET
          finalization_status = 'finalized',
          finalized_at = NOW(),
          finalized_by = auth.uid()
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
    'session_ids', v_session_ids
  );
END;
$$;

COMMENT ON FUNCTION finalize_session_aggregated IS
'Finalizes all pending sessions for a batch+product combination using product names.
UPDATED 2026-01-21: Added support for Bulk Trim (Trimmed) product finalization.
Uses product_name columns for direct matching, eliminating complex product_id lookups.';

GRANT EXECUTE ON FUNCTION finalize_session_aggregated TO authenticated;