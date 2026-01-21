/*
  # Repair Session Batch References

  1. Problem
    - 4 sessions have incorrect batch references preventing conversion visibility
    - 1 bucking session has UUID in batch_id field (should be batch_number text)
    - 3 trim sessions have NULL batch_registry_id (FK not populated)
    - These sessions are invisible in pending_conversion_sessions view

  2. Root Cause
    - BuckingSessionStartForm.tsx and PackagingSessionStartForm.tsx were sending UUID instead of batch_number
    - Forms keyed dropdown by pkg.batch_id (UUID) instead of pkg.batch_number (text)
    - Trigger fn_populate_batch_registry_id() expects batch_number but received UUID
    - Lookup failed: WHERE batch_number = 'ae6f821d...' instead of WHERE batch_number = '251105-SSM'

  3. Sessions to Repair
    Bucking Sessions:
    - ID: 7dc6cd0c-7c41-4f9a-8e5e-5dc8f3b4e20a
      batch_id: 'ae6f821d-90d2-4d06-899b-01829f0739b7' (UUID - WRONG!)
      Should be: '251105-SSM'
      
    Trim Sessions (from before Jan 20 fix):
    - 3 sessions with NULL batch_registry_id need FK populated

  4. Solution
    - Update bucking session: correct batch_id to batch_number, populate batch_registry_id
    - Update trim sessions: populate batch_registry_id from batch_id lookup
    - Both fields must be consistent: batch_id (text) and batch_registry_id (UUID FK)

  5. Prevention
    - Frontend forms already fixed (this migration)
    - Next migration will add CHECK constraint to prevent UUID format in batch_id
*/

-- =====================================================
-- STEP 1: Repair the bucking session with UUID batch_id
-- =====================================================

DO $$
DECLARE
  v_batch_uuid uuid := 'ae6f821d-90d2-4d06-899b-01829f0739b7';
  v_correct_batch_number text;
BEGIN
  -- Look up the correct batch_number from batch_registry
  SELECT batch_number INTO v_correct_batch_number
  FROM batch_registry
  WHERE id = v_batch_uuid;

  IF v_correct_batch_number IS NOT NULL THEN
    -- Update the bucking session with correct values
    UPDATE bucking_sessions
    SET 
      batch_id = v_correct_batch_number,           -- Change from UUID to batch_number text
      batch_registry_id = v_batch_uuid,            -- Populate FK
      updated_at = now()
    WHERE id = '7dc6cd0c-7c41-4f9a-8e5e-5dc8f3b4e20a'
      AND batch_id = v_batch_uuid::text;           -- Safety: only if still has UUID

    RAISE NOTICE 'Repaired bucking session: changed batch_id from UUID to %', v_correct_batch_number;
  ELSE
    RAISE WARNING 'Batch registry UUID % not found', v_batch_uuid;
  END IF;
END $$;

-- =====================================================
-- STEP 2: Repair trim sessions with NULL batch_registry_id
-- =====================================================

DO $$
DECLARE
  v_updated_count int := 0;
BEGIN
  -- Update all trim sessions that have batch_id but NULL batch_registry_id
  -- This handles sessions created before the Jan 20 fix
  UPDATE trim_sessions ts
  SET 
    batch_registry_id = br.id,
    updated_at = now()
  FROM batch_registry br
  WHERE ts.batch_id = br.batch_number
    AND ts.batch_registry_id IS NULL
    AND ts.batch_id IS NOT NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RAISE NOTICE 'Repaired % trim sessions with NULL batch_registry_id', v_updated_count;
END $$;

-- =====================================================
-- STEP 3: Repair packaging sessions with NULL batch_registry_id (if any)
-- =====================================================

DO $$
DECLARE
  v_updated_count int := 0;
BEGIN
  -- Update all packaging sessions that have batch_id but NULL batch_registry_id
  UPDATE packaging_sessions ps
  SET 
    batch_registry_id = br.id,
    updated_at = now()
  FROM batch_registry br
  WHERE ps.batch_id = br.batch_number
    AND ps.batch_registry_id IS NULL
    AND ps.batch_id IS NOT NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RAISE NOTICE 'Repaired % packaging sessions with NULL batch_registry_id', v_updated_count;
END $$;

-- =====================================================
-- STEP 4: Verify the repair
-- =====================================================

DO $$
DECLARE
  v_bucking_issues int;
  v_trim_issues int;
  v_packaging_issues int;
BEGIN
  -- Check for remaining issues
  SELECT COUNT(*) INTO v_bucking_issues
  FROM bucking_sessions
  WHERE batch_registry_id IS NULL 
    AND session_status != 'cancelled';

  SELECT COUNT(*) INTO v_trim_issues
  FROM trim_sessions
  WHERE batch_registry_id IS NULL 
    AND session_status != 'cancelled';

  SELECT COUNT(*) INTO v_packaging_issues
  FROM packaging_sessions
  WHERE batch_registry_id IS NULL 
    AND session_status != 'cancelled';

  IF v_bucking_issues > 0 OR v_trim_issues > 0 OR v_packaging_issues > 0 THEN
    RAISE WARNING 'Still have NULL batch_registry_id: bucking=%, trim=%, packaging=%',
      v_bucking_issues, v_trim_issues, v_packaging_issues;
  ELSE
    RAISE NOTICE 'All active sessions now have valid batch_registry_id references';
  END IF;
END $$;
