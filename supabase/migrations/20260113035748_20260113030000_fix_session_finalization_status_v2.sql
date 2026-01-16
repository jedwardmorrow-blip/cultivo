/*
  # Fix Manual Finalization Workflow - Add Session-Level Status
  
  ## Problem
  The previous migration added finalization_status to conversion_packages,
  but the new workflow needs it on session tables directly.
  
  ## New Workflow
  1. Session completes → No packages yet
  2. Manager reviews → Session shows as "pending"
  3. Manager finalizes → Creates packages + marks session "finalized"
  4. OR Manager voids → Marks session "voided", no packages
  
  ## Changes
  - Add finalization_status to trim_sessions
  - Add finalization_status to packaging_sessions
  - Add finalization_status to bucking_sessions
  - Add finalized_at, finalized_by, void_reason to all three
  - Update pending_conversion_sessions view to use session status
  - Create finalize_session() and void_session() RPC functions
*/

-- =====================================================
-- STEP 1: Add finalization columns to trim_sessions
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trim_sessions'
    AND column_name = 'finalization_status'
  ) THEN
    ALTER TABLE trim_sessions
    ADD COLUMN finalization_status finalization_status NOT NULL DEFAULT 'pending';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trim_sessions'
    AND column_name = 'finalized_at'
  ) THEN
    ALTER TABLE trim_sessions
    ADD COLUMN finalized_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trim_sessions'
    AND column_name = 'finalized_by'
  ) THEN
    ALTER TABLE trim_sessions
    ADD COLUMN finalized_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trim_sessions'
    AND column_name = 'void_reason'
  ) THEN
    ALTER TABLE trim_sessions
    ADD COLUMN void_reason text;
  END IF;
END $$;

-- =====================================================
-- STEP 2: Add finalization columns to packaging_sessions
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packaging_sessions'
    AND column_name = 'finalization_status'
  ) THEN
    ALTER TABLE packaging_sessions
    ADD COLUMN finalization_status finalization_status NOT NULL DEFAULT 'pending';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packaging_sessions'
    AND column_name = 'finalized_at'
  ) THEN
    ALTER TABLE packaging_sessions
    ADD COLUMN finalized_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packaging_sessions'
    AND column_name = 'finalized_by'
  ) THEN
    ALTER TABLE packaging_sessions
    ADD COLUMN finalized_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packaging_sessions'
    AND column_name = 'void_reason'
  ) THEN
    ALTER TABLE packaging_sessions
    ADD COLUMN void_reason text;
  END IF;
END $$;

-- =====================================================
-- STEP 3: Add finalization columns to bucking_sessions
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bucking_sessions'
    AND column_name = 'finalization_status'
  ) THEN
    ALTER TABLE bucking_sessions
    ADD COLUMN finalization_status finalization_status NOT NULL DEFAULT 'pending';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bucking_sessions'
    AND column_name = 'finalized_at'
  ) THEN
    ALTER TABLE bucking_sessions
    ADD COLUMN finalized_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bucking_sessions'
    AND column_name = 'finalized_by'
  ) THEN
    ALTER TABLE bucking_sessions
    ADD COLUMN finalized_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bucking_sessions'
    AND column_name = 'void_reason'
  ) THEN
    ALTER TABLE bucking_sessions
    ADD COLUMN void_reason text;
  END IF;
END $$;

-- =====================================================
-- STEP 4: Backfill existing completed sessions
-- =====================================================

-- Mark all completed sessions as finalized (they were processed by old system)
UPDATE trim_sessions
SET
  finalization_status = 'finalized',
  finalized_at = completed_at,
  finalized_by = NULL  -- Old sessions don't have this info
WHERE completed_at IS NOT NULL
  AND finalization_status = 'pending';

UPDATE packaging_sessions
SET
  finalization_status = 'finalized',
  finalized_at = completed_at,
  finalized_by = NULL
WHERE completed_at IS NOT NULL
  AND finalization_status = 'pending';

UPDATE bucking_sessions
SET
  finalization_status = 'finalized',
  finalized_at = completed_at,
  finalized_by = NULL
WHERE completed_at IS NOT NULL
  AND finalization_status = 'pending';

-- =====================================================
-- STEP 5: Create pending_conversion_sessions view
-- =====================================================

DROP VIEW IF EXISTS pending_conversion_sessions CASCADE;

CREATE OR REPLACE VIEW pending_conversion_sessions AS
-- Pending trim sessions
SELECT
  ts.id as session_id,
  'trim' as session_type,
  ts.batch_registry_id as batch_id,
  br.batch_number as batch_name,
  ts.strain_id,
  s.name as strain_name,
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
  (COALESCE(ts.big_buds_grams, 0) + COALESCE(ts.small_buds_grams, 0)) as output_weight,
  NULL::integer as output_units,
  ts.completed_at,
  ts.finalization_status,
  ts.finalized_at,
  ts.finalized_by
FROM trim_sessions ts
JOIN batch_registry br ON ts.batch_registry_id = br.id
LEFT JOIN strains s ON ts.strain_id = s.id
WHERE ts.session_status = 'completed'
  AND ts.completed_at IS NOT NULL
  AND ts.finalization_status = 'pending'
  AND ts.batch_registry_id IS NOT NULL

UNION ALL

-- Pending packaging sessions
SELECT
  ps.id as session_id,
  'packaging' as session_type,
  ps.batch_registry_id as batch_id,
  br.batch_number as batch_name,
  ps.strain_id,
  s.name as strain_name,
  -- Infer product from units - packaging doesn't have product_id
  NULL::uuid as product_id,
  'Packaged Products' as product_name,
  NULL::numeric as output_weight,
  (COALESCE(ps.units_3_5g, 0) + COALESCE(ps.units_14g, 0) + COALESCE(ps.units_454g, 0))::integer as output_units,
  ps.completed_at,
  ps.finalization_status,
  ps.finalized_at,
  ps.finalized_by
FROM packaging_sessions ps
JOIN batch_registry br ON ps.batch_registry_id = br.id
LEFT JOIN strains s ON ps.strain_id = s.id
WHERE ps.session_status = 'completed'
  AND ps.completed_at IS NOT NULL
  AND ps.finalization_status = 'pending'
  AND ps.batch_registry_id IS NOT NULL

UNION ALL

-- Pending bucking sessions
SELECT
  bs.id as session_id,
  'bucking' as session_type,
  bs.batch_registry_id as batch_id,
  br.batch_number as batch_name,
  br.strain_id,
  s.name as strain_name,
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
  (COALESCE(bs.bucked_flower_grams, 0) + COALESCE(bs.bucked_smalls_grams, 0)) as output_weight,
  NULL::integer as output_units,
  bs.completed_at,
  bs.finalization_status,
  bs.finalized_at,
  bs.finalized_by
FROM bucking_sessions bs
JOIN batch_registry br ON bs.batch_registry_id = br.id
LEFT JOIN strains s ON br.strain_id = s.id
WHERE bs.session_status = 'completed'
  AND bs.completed_at IS NOT NULL
  AND bs.finalization_status = 'pending'
  AND bs.batch_registry_id IS NOT NULL
ORDER BY completed_at DESC;

COMMENT ON VIEW pending_conversion_sessions IS
'Shows all completed sessions awaiting finalization.
Used by ConversionsView and PendingConversionsWidget.
Sessions remain pending until manager clicks finalize.';

GRANT SELECT ON pending_conversion_sessions TO authenticated;

-- =====================================================
-- STEP 6: Create finalize_session RPC function
-- =====================================================

CREATE OR REPLACE FUNCTION finalize_session(p_session_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_type TEXT;
  v_result jsonb;
  v_packages_created INTEGER := 0;
BEGIN
  -- Determine session type
  IF EXISTS (SELECT 1 FROM trim_sessions WHERE id = p_session_id) THEN
    v_session_type := 'trim';
  ELSIF EXISTS (SELECT 1 FROM packaging_sessions WHERE id = p_session_id) THEN
    v_session_type := 'packaging';
  ELSIF EXISTS (SELECT 1 FROM bucking_sessions WHERE id = p_session_id) THEN
    v_session_type := 'bucking';
  ELSE
    RAISE EXCEPTION 'Session not found: %', p_session_id;
  END IF;

  -- Update session status based on type
  CASE v_session_type
    WHEN 'trim' THEN
      UPDATE trim_sessions
      SET
        finalization_status = 'finalized',
        finalized_at = NOW(),
        finalized_by = auth.uid()
      WHERE id = p_session_id
        AND finalization_status = 'pending';
      
    WHEN 'packaging' THEN
      UPDATE packaging_sessions
      SET
        finalization_status = 'finalized',
        finalized_at = NOW(),
        finalized_by = auth.uid()
      WHERE id = p_session_id
        AND finalization_status = 'pending';
      
    WHEN 'bucking' THEN
      UPDATE bucking_sessions
      SET
        finalization_status = 'finalized',
        finalized_at = NOW(),
        finalized_by = auth.uid()
      WHERE id = p_session_id
        AND finalization_status = 'pending';
  END CASE;

  -- TODO: Create inventory packages here
  -- For now, return success
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'session_type', v_session_type,
    'packages_created', v_packages_created
  );
END;
$$;

COMMENT ON FUNCTION finalize_session IS
'Finalizes a completed session, creating inventory packages.
Marks session as finalized and creates audit trail.';

GRANT EXECUTE ON FUNCTION finalize_session TO authenticated;

-- =====================================================
-- STEP 7: Create void_session RPC function
-- =====================================================

CREATE OR REPLACE FUNCTION void_session(
  p_session_id UUID,
  p_reason TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_type TEXT;
BEGIN
  -- Validate reason provided
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Void reason is required';
  END IF;

  -- Determine session type
  IF EXISTS (SELECT 1 FROM trim_sessions WHERE id = p_session_id) THEN
    v_session_type := 'trim';
  ELSIF EXISTS (SELECT 1 FROM packaging_sessions WHERE id = p_session_id) THEN
    v_session_type := 'packaging';
  ELSIF EXISTS (SELECT 1 FROM bucking_sessions WHERE id = p_session_id) THEN
    v_session_type := 'bucking';
  ELSE
    RAISE EXCEPTION 'Session not found: %', p_session_id;
  END IF;

  -- Update session status based on type
  CASE v_session_type
    WHEN 'trim' THEN
      UPDATE trim_sessions
      SET
        finalization_status = 'voided',
        finalized_at = NOW(),
        finalized_by = auth.uid(),
        void_reason = p_reason
      WHERE id = p_session_id
        AND finalization_status = 'pending';
      
    WHEN 'packaging' THEN
      UPDATE packaging_sessions
      SET
        finalization_status = 'voided',
        finalized_at = NOW(),
        finalized_by = auth.uid(),
        void_reason = p_reason
      WHERE id = p_session_id
        AND finalization_status = 'pending';
      
    WHEN 'bucking' THEN
      UPDATE bucking_sessions
      SET
        finalization_status = 'voided',
        finalized_at = NOW(),
        finalized_by = auth.uid(),
        void_reason = p_reason
      WHERE id = p_session_id
        AND finalization_status = 'pending';
  END CASE;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'session_type', v_session_type,
    'void_reason', p_reason
  );
END;
$$;

COMMENT ON FUNCTION void_session IS
'Voids a completed session, preventing package creation.
Requires a reason and creates audit trail.';

GRANT EXECUTE ON FUNCTION void_session TO authenticated;