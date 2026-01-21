/*
  # Update Finalization RPC Functions for Per-Output Tracking

  ## Overview
  Updates finalize_session_aggregated and void_session_aggregated functions to use
  the new per-output finalization fields instead of the single finalization_status field.

  ## Changes

  ### finalize_session_aggregated
  - For trim sessions:
    - Bulk Flower (Trimmed) -> updates finalization_status_bigs, finalized_at_bigs, finalized_by_bigs
    - Bulk Smalls (Trimmed) -> updates finalization_status_smalls, finalized_at_smalls, finalized_by_smalls
    - Bulk Trim (Trimmed) -> updates finalization_status_trim, finalized_at_trim, finalized_by_trim
  - For bucking sessions:
    - Bulk Flower (Bucked) -> updates finalization_status_bucked, finalized_at_bucked, finalized_by_bucked
    - Bulk Smalls (Bucked) -> updates finalization_status_smalls, finalized_at_smalls, finalized_by_smalls
  - For packaging sessions:
    - Updates finalization_status_packaged, finalized_at_packaged, finalized_by_packaged

  ### void_session_aggregated
  - Same output-specific updates but sets status to 'voided' with void_reason_*

  ## Benefits
  - Each output can be finalized independently
  - Better audit trail per output type
  - Enables granular analytics queries
  - Supports partial finalization scenarios
*/

-- =====================================================
-- Drop existing functions
-- =====================================================

DROP FUNCTION IF EXISTS finalize_session_aggregated(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS void_session_aggregated(UUID, TEXT, TEXT, TEXT);

-- =====================================================
-- Create updated finalize function with per-output tracking
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
      -- Packaged products - Update packaged fields
      SELECT array_agg(id) INTO v_session_ids
      FROM packaging_sessions
      WHERE batch_registry_id = p_batch_id
        AND session_status = 'completed'
        AND finalization_status_packaged = 'pending'
        AND (output_product_name = p_product_name OR p_product_name IS NULL);

      UPDATE packaging_sessions
      SET
        finalization_status_packaged = 'finalized',
        finalized_at_packaged = NOW(),
        finalized_by_packaged = auth.uid()
      WHERE id = ANY(v_session_ids);

      GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;

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
    'session_ids', v_session_ids
  );
END;
$$;

COMMENT ON FUNCTION finalize_session_aggregated IS
  'Finalizes sessions with per-output tracking. Each output type (bigs/smalls/trim) can be finalized independently.
  UPDATED 2026-01-21: Uses per-output finalization fields for better analytics and audit trail.';

GRANT EXECUTE ON FUNCTION finalize_session_aggregated TO authenticated;

-- =====================================================
-- Create updated void function with per-output tracking
-- =====================================================

CREATE OR REPLACE FUNCTION void_session_aggregated(
  p_batch_id UUID,
  p_product_name TEXT DEFAULT NULL,
  p_session_type TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_ids UUID[];
  v_sessions_voided INTEGER := 0;
  v_session_type TEXT;
BEGIN
  -- Validate reason provided
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Void reason is required';
  END IF;

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

  -- Find and void all matching sessions based on type and output
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
          finalization_status_bigs = 'voided',
          finalized_at_bigs = NOW(),
          finalized_by_bigs = auth.uid(),
          void_reason_bigs = p_reason
        WHERE id = ANY(v_session_ids);

        GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;
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
          finalization_status_smalls = 'voided',
          finalized_at_smalls = NOW(),
          finalized_by_smalls = auth.uid(),
          void_reason_smalls = p_reason
        WHERE id = ANY(v_session_ids);

        GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;
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
          finalization_status_trim = 'voided',
          finalized_at_trim = NOW(),
          finalized_by_trim = auth.uid(),
          void_reason_trim = p_reason
        WHERE id = ANY(v_session_ids);

        GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;
      END IF;

    WHEN 'packaging' THEN
      -- Packaged products - Update packaged fields
      SELECT array_agg(id) INTO v_session_ids
      FROM packaging_sessions
      WHERE batch_registry_id = p_batch_id
        AND session_status = 'completed'
        AND finalization_status_packaged = 'pending'
        AND (output_product_name = p_product_name OR p_product_name IS NULL);

      UPDATE packaging_sessions
      SET
        finalization_status_packaged = 'voided',
        finalized_at_packaged = NOW(),
        finalized_by_packaged = auth.uid(),
        void_reason_packaged = p_reason
      WHERE id = ANY(v_session_ids);

      GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;

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
          finalization_status_bucked = 'voided',
          finalized_at_bucked = NOW(),
          finalized_by_bucked = auth.uid(),
          void_reason_bucked = p_reason
        WHERE id = ANY(v_session_ids);

        GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;
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
          finalization_status_smalls = 'voided',
          finalized_at_smalls = NOW(),
          finalized_by_smalls = auth.uid(),
          void_reason_smalls = p_reason
        WHERE id = ANY(v_session_ids);

        GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;
      END IF;

    ELSE
      RAISE EXCEPTION 'Invalid session type: %', v_session_type;
  END CASE;

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'product_name', p_product_name,
    'session_type', v_session_type,
    'sessions_voided', v_sessions_voided,
    'session_ids', v_session_ids,
    'void_reason', p_reason
  );
END;
$$;

COMMENT ON FUNCTION void_session_aggregated IS
  'Voids sessions with per-output tracking. Each output type (bigs/smalls/trim) can be voided independently.
  UPDATED 2026-01-21: Uses per-output finalization fields for better analytics and audit trail.';

GRANT EXECUTE ON FUNCTION void_session_aggregated TO authenticated;
