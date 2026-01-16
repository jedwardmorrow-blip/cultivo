/*
  # Simplify Finalization RPC Functions Using Product Names

  ## Problem
  Current RPC functions (finalize_session_aggregated, void_session_aggregated) have
  complex product lookups matching the old VIEW logic:
  - Accept product_id parameter
  - Do expensive subqueries to match sessions by product_id
  - Product lookups can fail causing finalization to fail
  - Total: ~350 lines of complex matching logic

  ## Solution
  Update RPCs to use product_name instead of product_id:
  - Accept product_name parameter (simpler, human-readable)
  - Match sessions by comparing output_product_*_name columns
  - No subqueries needed
  - Simple string comparison

  ## Benefits
  - Eliminates ~150 lines of complex subquery logic
  - Matches simplified VIEW architecture
  - More reliable (no product lookup failures)
  - Easier to debug (product names are human-readable)
  - Consistent with VIEW's aggregation_id generation

  ## Breaking Changes
  Function signatures change:
  - OLD: finalize_session_aggregated(batch_id, product_id, session_type)
  - NEW: finalize_session_aggregated(batch_id, product_name, session_type)
  
  Service layer will need minor update to pass product_name instead of product_id.
*/

-- =====================================================
-- STEP 1: Drop old functions
-- =====================================================

DROP FUNCTION IF EXISTS finalize_session_aggregated(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS void_session_aggregated(UUID, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_aggregation_details(UUID, UUID, TEXT);

-- =====================================================
-- STEP 2: Create simplified finalize function
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
      -- Simple product name matching (no subqueries!)
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
      -- Simple product name matching (no subqueries!)
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
Simplified architecture (2026-01-16): Uses product_name columns for direct matching,
eliminating complex product_id lookups and subqueries. More reliable and faster.';

GRANT EXECUTE ON FUNCTION finalize_session_aggregated TO authenticated;

-- =====================================================
-- STEP 3: Create simplified void function
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

  -- Find and void all matching sessions based on type
  CASE v_session_type
    WHEN 'trim' THEN
      -- Simple product name matching (no subqueries!)
      IF p_product_name = 'Bulk Flower (Trimmed)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM trim_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status = 'pending'
          AND output_product_bigs_name = 'Bulk Flower (Trimmed)';

        UPDATE trim_sessions
        SET
          finalization_status = 'voided',
          finalized_at = NOW(),
          finalized_by = auth.uid(),
          void_reason = p_reason
        WHERE id = ANY(v_session_ids);

        GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;
      END IF;

      IF p_product_name = 'Bulk Smalls (Trimmed)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM trim_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status = 'pending'
          AND output_product_smalls_name = 'Bulk Smalls (Trimmed)';

        UPDATE trim_sessions
        SET
          finalization_status = 'voided',
          finalized_at = NOW(),
          finalized_by = auth.uid(),
          void_reason = p_reason
        WHERE id = ANY(v_session_ids);

        GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;
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
        finalization_status = 'voided',
        finalized_at = NOW(),
        finalized_by = auth.uid(),
        void_reason = p_reason
      WHERE id = ANY(v_session_ids);

      GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;

    WHEN 'bucking' THEN
      -- Simple product name matching (no subqueries!)
      IF p_product_name = 'Bulk Flower (Bucked)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM bucking_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status = 'pending'
          AND output_product_flower_name = 'Bulk Flower (Bucked)';

        UPDATE bucking_sessions
        SET
          finalization_status = 'voided',
          finalized_at = NOW(),
          finalized_by = auth.uid(),
          void_reason = p_reason
        WHERE id = ANY(v_session_ids);

        GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;
      END IF;

      IF p_product_name = 'Bulk Smalls (Bucked)' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM bucking_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status = 'pending'
          AND output_product_smalls_name = 'Bulk Smalls (Bucked)';

        UPDATE bucking_sessions
        SET
          finalization_status = 'voided',
          finalized_at = NOW(),
          finalized_by = auth.uid(),
          void_reason = p_reason
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
'Voids all pending sessions for a batch+product combination using product names.
Simplified architecture (2026-01-16): Uses product_name columns for direct matching,
eliminating complex product_id lookups and subqueries.';

GRANT EXECUTE ON FUNCTION void_session_aggregated TO authenticated;

-- =====================================================
-- STEP 4: Create simplified helper function
-- =====================================================

CREATE OR REPLACE FUNCTION get_aggregation_details(
  p_batch_id UUID,
  p_product_name TEXT DEFAULT NULL,
  p_session_type TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'aggregation_id', aggregation_id,
    'session_type', session_type,
    'batch_id', batch_id,
    'batch_name', batch_name,
    'strain_id', strain_id,
    'strain_name', strain_name,
    'product_id', product_id,
    'product_name', product_name,
    'output_weight', output_weight,
    'output_units', output_units,
    'first_completed_at', first_completed_at,
    'last_completed_at', last_completed_at,
    'session_count', session_count,
    'session_ids', session_ids
  ) INTO v_result
  FROM pending_conversion_sessions
  WHERE batch_id = p_batch_id
    AND (product_name = p_product_name OR p_product_name IS NULL)
    AND (session_type = p_session_type OR p_session_type IS NULL)
  LIMIT 1;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_aggregation_details IS
'Returns detailed information about an aggregated conversion using product name.
Simplified architecture (2026-01-16): Uses product_name for matching.';

GRANT EXECUTE ON FUNCTION get_aggregation_details TO authenticated;
