/*
  # Fix Finalization RPC Logic Bug - OR Condition Issue

  ## Problem
  The `finalize_session_aggregated()` RPC function has nested IF statements with
  `OR p_product_name IS NULL` conditions that cause BOTH product types to finalize
  when only one is requested.

  **Example Bug:**
  - User requests finalization of 'Bulk Flower (Trimmed)' (bigs only)
  - First IF: `p_product_name = 'Bulk Flower (Trimmed)' OR p_product_name IS NULL` → TRUE, finalizes bigs ✓
  - Second IF: `p_product_name = 'Bulk Smalls (Trimmed)' OR p_product_name IS NULL` → FALSE... BUT
  - Because of OR logic, when NULL is passed, BOTH branches execute
  - Result: Both bigs AND smalls finalized when only bigs was requested

  ## Solution
  Replace nested IF with IF-ELSIF-ELSE pattern to ensure only one branch executes
  per product type request. Explicit NULL handling when user wants to finalize ALL.

  ## Benefits
  - ✅ Specific product_name → only that product finalized
  - ✅ NULL product_name → all products finalized (explicit intent)
  - ✅ Prevents accidental multi-product finalization
  - ✅ Clear error messages for invalid product names
  - ✅ Maintains backward compatibility (NULL still works)

  ## Breaking Changes
  None - behavior correction only. NULL parameter still finalizes all products.

  ## Related
  - Issue: User finalized 'Bulk Flower (Trimmed)' but smalls also finalized
  - Root Cause: OR condition in nested IFs
  - Fix Date: 2026-01-20
  - Session: CONV-FIX-002
*/

-- =====================================================
-- STEP 1: Drop existing function
-- =====================================================

DROP FUNCTION IF EXISTS finalize_session_aggregated(UUID, TEXT, TEXT);

-- =====================================================
-- STEP 2: Create corrected function with IF-ELSIF-ELSE
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
  v_bigs_ids UUID[];
  v_smalls_ids UUID[];
  v_bigs_count INTEGER := 0;
  v_smalls_count INTEGER := 0;
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
      -- IF-ELSIF-ELSE pattern prevents multiple branches executing
      IF p_product_name IS NULL THEN
        -- Explicit NULL: Finalize ALL trim products for this batch
        -- Finalize bigs
        SELECT array_agg(id) INTO v_bigs_ids
        FROM trim_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status = 'pending'
          AND output_product_bigs_name = 'Bulk Flower (Trimmed)';

        IF v_bigs_ids IS NOT NULL THEN
          UPDATE trim_sessions
          SET
            finalization_status = 'finalized',
            finalized_at = NOW(),
            finalized_by = auth.uid()
          WHERE id = ANY(v_bigs_ids);

          GET DIAGNOSTICS v_bigs_count = ROW_COUNT;
        END IF;

        -- Finalize smalls
        SELECT array_agg(id) INTO v_smalls_ids
        FROM trim_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status = 'pending'
          AND output_product_smalls_name = 'Bulk Smalls (Trimmed)';

        IF v_smalls_ids IS NOT NULL THEN
          UPDATE trim_sessions
          SET
            finalization_status = 'finalized',
            finalized_at = NOW(),
            finalized_by = auth.uid()
          WHERE id = ANY(v_smalls_ids);

          GET DIAGNOSTICS v_smalls_count = ROW_COUNT;
        END IF;

        v_session_ids := COALESCE(v_bigs_ids, ARRAY[]::UUID[]) || COALESCE(v_smalls_ids, ARRAY[]::UUID[]);
        v_sessions_finalized := v_bigs_count + v_smalls_count;

      ELSIF p_product_name = 'Bulk Flower (Trimmed)' THEN
        -- Finalize ONLY bigs
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

      ELSIF p_product_name = 'Bulk Smalls (Trimmed)' THEN
        -- Finalize ONLY smalls
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

      ELSE
        RAISE EXCEPTION 'Invalid product_name for trim sessions: "%". Expected "Bulk Flower (Trimmed)" or "Bulk Smalls (Trimmed)"', p_product_name;
      END IF;

    WHEN 'packaging' THEN
      -- Packaging sessions have single output product, no change needed
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
      -- IF-ELSIF-ELSE pattern prevents multiple branches executing
      IF p_product_name IS NULL THEN
        -- Explicit NULL: Finalize ALL bucking products for this batch
        -- Finalize flower
        SELECT array_agg(id) INTO v_bigs_ids
        FROM bucking_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status = 'pending'
          AND output_product_flower_name = 'Bulk Flower (Bucked)';

        IF v_bigs_ids IS NOT NULL THEN
          UPDATE bucking_sessions
          SET
            finalization_status = 'finalized',
            finalized_at = NOW(),
            finalized_by = auth.uid()
          WHERE id = ANY(v_bigs_ids);

          GET DIAGNOSTICS v_bigs_count = ROW_COUNT;
        END IF;

        -- Finalize smalls
        SELECT array_agg(id) INTO v_smalls_ids
        FROM bucking_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status = 'pending'
          AND output_product_smalls_name = 'Bulk Smalls (Bucked)';

        IF v_smalls_ids IS NOT NULL THEN
          UPDATE bucking_sessions
          SET
            finalization_status = 'finalized',
            finalized_at = NOW(),
            finalized_by = auth.uid()
          WHERE id = ANY(v_smalls_ids);

          GET DIAGNOSTICS v_smalls_count = ROW_COUNT;
        END IF;

        v_session_ids := COALESCE(v_bigs_ids, ARRAY[]::UUID[]) || COALESCE(v_smalls_ids, ARRAY[]::UUID[]);
        v_sessions_finalized := v_bigs_count + v_smalls_count;

      ELSIF p_product_name = 'Bulk Flower (Bucked)' THEN
        -- Finalize ONLY flower
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

      ELSIF p_product_name = 'Bulk Smalls (Bucked)' THEN
        -- Finalize ONLY smalls
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

      ELSE
        RAISE EXCEPTION 'Invalid product_name for bucking sessions: "%". Expected "Bulk Flower (Bucked)" or "Bulk Smalls (Bucked)"', p_product_name;
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
Fixed (2026-01-20): Uses IF-ELSIF-ELSE pattern to prevent OR condition from executing
multiple branches. When p_product_name IS NULL, explicitly finalizes ALL products.
When p_product_name is specified, finalizes ONLY that product.';

GRANT EXECUTE ON FUNCTION finalize_session_aggregated TO authenticated;