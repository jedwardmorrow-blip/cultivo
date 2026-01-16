/*
  # Conversion Aggregation by Batch + Product

  ## Problem
  Current system shows individual sessions in pending conversions.
  User requirement: Sessions with same batch_id + product_id should aggregate.

  Example:
    - Current: 3 trim sessions (200g each) → 3 separate rows
    - Required: 3 trim sessions (200g each) → 1 aggregated row (600g total)
    - Manager can then split into multiple packages (500g + 100g)

  ## Changes
  1. Update pending_conversion_sessions view:
     - GROUP BY batch_id + product_id
     - SUM() outputs to aggregate quantities
     - array_agg(session_id) to track source sessions
     - COUNT(session_id) to show "Based on X sessions"

  2. Update finalize_session() RPC:
     - Accept batch_id + product_id instead of single session_id
     - Find and finalize all matching sessions together

  3. Update void_session() RPC:
     - Accept batch_id + product_id
     - Void all matching sessions with same reason
*/

-- =====================================================
-- STEP 1: Update pending_conversion_sessions view with aggregation
-- =====================================================

DROP VIEW IF EXISTS pending_conversion_sessions CASCADE;

CREATE OR REPLACE VIEW pending_conversion_sessions AS
-- Trim sessions aggregated by batch + product
SELECT
  -- Generate unique ID from batch + product + type
  md5(br.id::text || '-' || COALESCE(product_id::text, 'null') || '-trim')::uuid as aggregation_id,
  'trim' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  ts.strain_id,
  s.name as strain_name,
  product_id,
  product_name,
  SUM(output_weight) as output_weight,
  NULL::integer as output_units,
  MIN(ts.completed_at) as first_completed_at,
  MAX(ts.completed_at) as last_completed_at,
  COUNT(ts.id) as session_count,
  array_agg(ts.id ORDER BY ts.completed_at) as session_ids,
  'pending'::finalization_status as finalization_status
FROM (
  SELECT
    ts.id,
    ts.batch_registry_id,
    ts.strain_id,
    ts.completed_at,
    -- Determine output product
    CASE
      WHEN COALESCE(ts.big_buds_grams, 0) > 0 THEN (
        SELECT p.id FROM products p
        JOIN product_stages ps ON p.stage_id = ps.id
        WHERE ps.name = 'Trimmed' AND p.type = 'bulk_flower'
        LIMIT 1
      )
      WHEN COALESCE(ts.small_buds_grams, 0) > 0 THEN (
        SELECT p.id FROM products p
        JOIN product_stages ps ON p.stage_id = ps.id
        WHERE ps.name = 'Trimmed' AND p.type = 'bulk_smalls'
        LIMIT 1
      )
      ELSE NULL
    END as product_id,
    CASE
      WHEN COALESCE(ts.big_buds_grams, 0) > 0 THEN 'Bulk Flower (Trimmed)'
      WHEN COALESCE(ts.small_buds_grams, 0) > 0 THEN 'Bulk Smalls (Trimmed)'
      ELSE NULL
    END as product_name,
    (COALESCE(ts.big_buds_grams, 0) + COALESCE(ts.small_buds_grams, 0)) as output_weight
  FROM trim_sessions ts
  WHERE ts.session_status = 'completed'
    AND ts.completed_at IS NOT NULL
    AND ts.finalization_status = 'pending'
    AND ts.batch_registry_id IS NOT NULL
) ts
JOIN batch_registry br ON ts.batch_registry_id = br.id
LEFT JOIN strains s ON ts.strain_id = s.id
GROUP BY br.id, br.batch_number, ts.strain_id, s.name, product_id, product_name

UNION ALL

-- Packaging sessions aggregated by batch + product
SELECT
  md5(br.id::text || '-packaging')::uuid as aggregation_id,
  'packaging' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  ps.strain_id,
  s.name as strain_name,
  NULL::uuid as product_id,
  'Packaged Products' as product_name,
  NULL::numeric as output_weight,
  SUM(COALESCE(ps.units_3_5g, 0) + COALESCE(ps.units_14g, 0) + COALESCE(ps.units_454g, 0))::integer as output_units,
  MIN(ps.completed_at) as first_completed_at,
  MAX(ps.completed_at) as last_completed_at,
  COUNT(ps.id) as session_count,
  array_agg(ps.id ORDER BY ps.completed_at) as session_ids,
  'pending'::finalization_status as finalization_status
FROM packaging_sessions ps
JOIN batch_registry br ON ps.batch_registry_id = br.id
LEFT JOIN strains s ON ps.strain_id = s.id
WHERE ps.session_status = 'completed'
  AND ps.completed_at IS NOT NULL
  AND ps.finalization_status = 'pending'
  AND ps.batch_registry_id IS NOT NULL
GROUP BY br.id, br.batch_number, ps.strain_id, s.name

UNION ALL

-- Bucking sessions aggregated by batch + product
SELECT
  md5(br.id::text || '-' || COALESCE(product_id::text, 'null') || '-bucking')::uuid as aggregation_id,
  'bucking' as session_type,
  br.id as batch_id,
  br.batch_number as batch_name,
  br.strain_id,
  s.name as strain_name,
  product_id,
  product_name,
  SUM(output_weight) as output_weight,
  NULL::integer as output_units,
  MIN(bs.completed_at) as first_completed_at,
  MAX(bs.completed_at) as last_completed_at,
  COUNT(bs.id) as session_count,
  array_agg(bs.id ORDER BY bs.completed_at) as session_ids,
  'pending'::finalization_status as finalization_status
FROM (
  SELECT
    bs.id,
    bs.batch_registry_id,
    bs.completed_at,
    -- Determine output product
    CASE
      WHEN COALESCE(bs.bucked_flower_grams, 0) > 0 THEN (
        SELECT p.id FROM products p
        JOIN product_stages ps ON p.stage_id = ps.id
        WHERE ps.name = 'Bucked' AND p.type = 'bulk_flower'
        LIMIT 1
      )
      WHEN COALESCE(bs.bucked_smalls_grams, 0) > 0 THEN (
        SELECT p.id FROM products p
        JOIN product_stages ps ON p.stage_id = ps.id
        WHERE ps.name = 'Bucked' AND p.type = 'bulk_smalls'
        LIMIT 1
      )
      ELSE NULL
    END as product_id,
    CASE
      WHEN COALESCE(bs.bucked_flower_grams, 0) > 0 THEN 'Bulk Flower (Bucked)'
      WHEN COALESCE(bs.bucked_smalls_grams, 0) > 0 THEN 'Bulk Smalls (Bucked)'
      ELSE NULL
    END as product_name,
    (COALESCE(bs.bucked_flower_grams, 0) + COALESCE(bs.bucked_smalls_grams, 0)) as output_weight
  FROM bucking_sessions bs
  WHERE bs.session_status = 'completed'
    AND bs.completed_at IS NOT NULL
    AND bs.finalization_status = 'pending'
    AND bs.batch_registry_id IS NOT NULL
) bs
JOIN batch_registry br ON bs.batch_registry_id = br.id
LEFT JOIN strains s ON br.strain_id = s.id
GROUP BY br.id, br.batch_number, br.strain_id, s.name, product_id, product_name
ORDER BY last_completed_at DESC;

COMMENT ON VIEW pending_conversion_sessions IS
'Aggregated pending conversions grouped by batch + product.
Multiple sessions with same batch+product are combined into single row.
session_ids array tracks all source sessions.
session_count shows how many sessions were aggregated.';

GRANT SELECT ON pending_conversion_sessions TO authenticated;

-- =====================================================
-- STEP 2: Update finalize_session RPC to handle aggregation
-- =====================================================

-- Drop old function
DROP FUNCTION IF EXISTS finalize_session(UUID);

-- Create new function with batch_id + product_id parameters
CREATE OR REPLACE FUNCTION finalize_session_aggregated(
  p_batch_id UUID,
  p_product_id UUID DEFAULT NULL,
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
      AND (product_id = p_product_id OR (product_id IS NULL AND p_product_id IS NULL))
    LIMIT 1;

    IF v_session_type IS NULL THEN
      RAISE EXCEPTION 'No pending sessions found for batch % and product %', p_batch_id, p_product_id;
    END IF;
  END IF;

  -- Find and finalize all matching sessions based on type
  CASE v_session_type
    WHEN 'trim' THEN
      -- Get all matching trim session IDs
      SELECT array_agg(id) INTO v_session_ids
      FROM trim_sessions
      WHERE batch_registry_id = p_batch_id
        AND session_status = 'completed'
        AND finalization_status = 'pending'
        AND CASE
          WHEN p_product_id IS NOT NULL THEN
            -- Match sessions that produce this product
            (COALESCE(big_buds_grams, 0) > 0 AND p_product_id = (
              SELECT p.id FROM products p
              JOIN product_stages ps ON p.stage_id = ps.id
              WHERE ps.name = 'Trimmed' AND p.type = 'bulk_flower'
              LIMIT 1
            ))
            OR
            (COALESCE(small_buds_grams, 0) > 0 AND p_product_id = (
              SELECT p.id FROM products p
              JOIN product_stages ps ON p.stage_id = ps.id
              WHERE ps.name = 'Trimmed' AND p.type = 'bulk_smalls'
              LIMIT 1
            ))
          ELSE true
        END;

      -- Finalize all matching sessions
      UPDATE trim_sessions
      SET
        finalization_status = 'finalized',
        finalized_at = NOW(),
        finalized_by = auth.uid()
      WHERE id = ANY(v_session_ids);

      GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;

    WHEN 'packaging' THEN
      -- Get all matching packaging session IDs
      SELECT array_agg(id) INTO v_session_ids
      FROM packaging_sessions
      WHERE batch_registry_id = p_batch_id
        AND session_status = 'completed'
        AND finalization_status = 'pending';

      -- Finalize all matching sessions
      UPDATE packaging_sessions
      SET
        finalization_status = 'finalized',
        finalized_at = NOW(),
        finalized_by = auth.uid()
      WHERE id = ANY(v_session_ids);

      GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;

    WHEN 'bucking' THEN
      -- Get all matching bucking session IDs
      SELECT array_agg(id) INTO v_session_ids
      FROM bucking_sessions
      WHERE batch_registry_id = p_batch_id
        AND session_status = 'completed'
        AND finalization_status = 'pending'
        AND CASE
          WHEN p_product_id IS NOT NULL THEN
            -- Match sessions that produce this product
            (COALESCE(bucked_flower_grams, 0) > 0 AND p_product_id = (
              SELECT p.id FROM products p
              JOIN product_stages ps ON p.stage_id = ps.id
              WHERE ps.name = 'Bucked' AND p.type = 'bulk_flower'
              LIMIT 1
            ))
            OR
            (COALESCE(bucked_smalls_grams, 0) > 0 AND p_product_id = (
              SELECT p.id FROM products p
              JOIN product_stages ps ON p.stage_id = ps.id
              WHERE ps.name = 'Bucked' AND p.type = 'bulk_smalls'
              LIMIT 1
            ))
          ELSE true
        END;

      -- Finalize all matching sessions
      UPDATE bucking_sessions
      SET
        finalization_status = 'finalized',
        finalized_at = NOW(),
        finalized_by = auth.uid()
      WHERE id = ANY(v_session_ids);

      GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;

    ELSE
      RAISE EXCEPTION 'Invalid session type: %', v_session_type;
  END CASE;

  -- TODO: Create inventory packages here (next phase)

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'product_id', p_product_id,
    'session_type', v_session_type,
    'sessions_finalized', v_sessions_finalized,
    'session_ids', v_session_ids
  );
END;
$$;

COMMENT ON FUNCTION finalize_session_aggregated IS
'Finalizes all pending sessions for a batch+product combination.
Aggregates multiple sessions together and marks them all as finalized.
Returns array of session IDs that were finalized.';

GRANT EXECUTE ON FUNCTION finalize_session_aggregated TO authenticated;

-- =====================================================
-- STEP 3: Update void_session RPC to handle aggregation
-- =====================================================

-- Drop old function
DROP FUNCTION IF EXISTS void_session(UUID, TEXT);

-- Create new function with batch_id + product_id parameters
CREATE OR REPLACE FUNCTION void_session_aggregated(
  p_batch_id UUID,
  p_product_id UUID DEFAULT NULL,
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
      AND (product_id = p_product_id OR (product_id IS NULL AND p_product_id IS NULL))
    LIMIT 1;

    IF v_session_type IS NULL THEN
      RAISE EXCEPTION 'No pending sessions found for batch % and product %', p_batch_id, p_product_id;
    END IF;
  END IF;

  -- Find and void all matching sessions based on type
  CASE v_session_type
    WHEN 'trim' THEN
      -- Get all matching trim session IDs
      SELECT array_agg(id) INTO v_session_ids
      FROM trim_sessions
      WHERE batch_registry_id = p_batch_id
        AND session_status = 'completed'
        AND finalization_status = 'pending'
        AND CASE
          WHEN p_product_id IS NOT NULL THEN
            (COALESCE(big_buds_grams, 0) > 0 AND p_product_id = (
              SELECT p.id FROM products p
              JOIN product_stages ps ON p.stage_id = ps.id
              WHERE ps.name = 'Trimmed' AND p.type = 'bulk_flower'
              LIMIT 1
            ))
            OR
            (COALESCE(small_buds_grams, 0) > 0 AND p_product_id = (
              SELECT p.id FROM products p
              JOIN product_stages ps ON p.stage_id = ps.id
              WHERE ps.name = 'Trimmed' AND p.type = 'bulk_smalls'
              LIMIT 1
            ))
          ELSE true
        END;

      -- Void all matching sessions
      UPDATE trim_sessions
      SET
        finalization_status = 'voided',
        finalized_at = NOW(),
        finalized_by = auth.uid(),
        void_reason = p_reason
      WHERE id = ANY(v_session_ids);

      GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;

    WHEN 'packaging' THEN
      -- Get all matching packaging session IDs
      SELECT array_agg(id) INTO v_session_ids
      FROM packaging_sessions
      WHERE batch_registry_id = p_batch_id
        AND session_status = 'completed'
        AND finalization_status = 'pending';

      -- Void all matching sessions
      UPDATE packaging_sessions
      SET
        finalization_status = 'voided',
        finalized_at = NOW(),
        finalized_by = auth.uid(),
        void_reason = p_reason
      WHERE id = ANY(v_session_ids);

      GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;

    WHEN 'bucking' THEN
      -- Get all matching bucking session IDs
      SELECT array_agg(id) INTO v_session_ids
      FROM bucking_sessions
      WHERE batch_registry_id = p_batch_id
        AND session_status = 'completed'
        AND finalization_status = 'pending'
        AND CASE
          WHEN p_product_id IS NOT NULL THEN
            (COALESCE(bucked_flower_grams, 0) > 0 AND p_product_id = (
              SELECT p.id FROM products p
              JOIN product_stages ps ON p.stage_id = ps.id
              WHERE ps.name = 'Bucked' AND p.type = 'bulk_flower'
              LIMIT 1
            ))
            OR
            (COALESCE(bucked_smalls_grams, 0) > 0 AND p_product_id = (
              SELECT p.id FROM products p
              JOIN product_stages ps ON p.stage_id = ps.id
              WHERE ps.name = 'Bucked' AND p.type = 'bulk_smalls'
              LIMIT 1
            ))
          ELSE true
        END;

      -- Void all matching sessions
      UPDATE bucking_sessions
      SET
        finalization_status = 'voided',
        finalized_at = NOW(),
        finalized_by = auth.uid(),
        void_reason = p_reason
      WHERE id = ANY(v_session_ids);

      GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;

    ELSE
      RAISE EXCEPTION 'Invalid session type: %', v_session_type;
  END CASE;

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'product_id', p_product_id,
    'session_type', v_session_type,
    'sessions_voided', v_sessions_voided,
    'session_ids', v_session_ids,
    'void_reason', p_reason
  );
END;
$$;

COMMENT ON FUNCTION void_session_aggregated IS
'Voids all pending sessions for a batch+product combination.
Marks all matching sessions as voided with the same reason.
Returns array of session IDs that were voided.';

GRANT EXECUTE ON FUNCTION void_session_aggregated TO authenticated;

-- =====================================================
-- STEP 4: Create helper function to get aggregation details
-- =====================================================

CREATE OR REPLACE FUNCTION get_aggregation_details(
  p_batch_id UUID,
  p_product_id UUID DEFAULT NULL,
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
    AND (product_id = p_product_id OR (product_id IS NULL AND p_product_id IS NULL))
    AND (session_type = p_session_type OR p_session_type IS NULL)
  LIMIT 1;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_aggregation_details IS
'Returns detailed information about an aggregated conversion.
Shows all sessions, total quantities, and metadata.';

GRANT EXECUTE ON FUNCTION get_aggregation_details TO authenticated;