/*
  # Backfill Trim Product Names for Existing Sessions

  ## Problem
  Existing completed trim sessions have trim_grams > 0 but no product name set.
  This makes historical trim invisible in the conversions workflow.

  ## Solution
  Backfill output_product_trim_name for all completed sessions with trim output.

  ## Changes
  Update all completed trim_sessions where:
  - session_status = 'completed'
  - finalization_status = 'pending'
  - trim_grams > 0
  - output_product_trim_name IS NULL

  Set output_product_trim_name = 'Bulk Trim (Trimmed)'
*/

-- =====================================================
-- Backfill trim product names
-- =====================================================

UPDATE trim_sessions
SET output_product_trim_name = 'Bulk Trim (Trimmed)'
WHERE session_status = 'completed'
  AND finalization_status = 'pending'
  AND COALESCE(trim_grams, 0) > 0
  AND output_product_trim_name IS NULL;

-- =====================================================
-- Verify backfill results
-- =====================================================

DO $$
DECLARE
  v_updated_count INTEGER;
  v_pending_trim_count INTEGER;
BEGIN
  -- Count how many rows were updated
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Count total pending sessions with trim
  SELECT COUNT(*) INTO v_pending_trim_count
  FROM trim_sessions
  WHERE session_status = 'completed'
    AND finalization_status = 'pending'
    AND COALESCE(trim_grams, 0) > 0;
  
  RAISE NOTICE 'Backfill complete: Updated % sessions, Total pending with trim: %', 
    v_updated_count, v_pending_trim_count;
END $$;