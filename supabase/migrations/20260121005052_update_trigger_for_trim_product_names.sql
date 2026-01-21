/*
  # Update Trigger to Populate Trim Product Names

  ## Problem
  Existing trigger (set_trim_session_product_names) only sets product names for
  big_buds and small_buds outputs. Trim output (trim_grams) is not tracked.

  ## Solution
  Update the trigger function to also set output_product_trim_name when trim_grams > 0.

  ## Changes
  1. Drop and recreate trigger function to add trim logic
  2. Add: IF trim_grams > 0 THEN output_product_trim_name = 'Bulk Trim (Trimmed)'
  3. Pattern matches existing flower/smalls logic
*/

-- =====================================================
-- Update trigger function to include trim
-- =====================================================

CREATE OR REPLACE FUNCTION set_trim_session_product_names()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set product names when session is being completed
  IF NEW.session_status = 'completed' AND OLD.session_status != 'completed' THEN
    
    -- Set bigs product name if we produced bigs
    IF COALESCE(NEW.big_buds_grams, 0) > 0 THEN
      NEW.output_product_bigs_name := 'Bulk Flower (Trimmed)';
    ELSE
      NEW.output_product_bigs_name := NULL;
    END IF;
    
    -- Set smalls product name if we produced smalls
    IF COALESCE(NEW.small_buds_grams, 0) > 0 THEN
      NEW.output_product_smalls_name := 'Bulk Smalls (Trimmed)';
    ELSE
      NEW.output_product_smalls_name := NULL;
    END IF;
    
    -- Set trim product name if we produced trim
    IF COALESCE(NEW.trim_grams, 0) > 0 THEN
      NEW.output_product_trim_name := 'Bulk Trim (Trimmed)';
    ELSE
      NEW.output_product_trim_name := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_trim_session_product_names IS
'Automatically sets output product names when trim session is completed.
Sets bigs, smalls, AND trim product names based on output quantities.
Updated 2026-01-21: Added trim product name tracking.';

-- =====================================================
-- Recreate trigger (if not exists)
-- =====================================================

DROP TRIGGER IF EXISTS trg_set_trim_session_product_names ON trim_sessions;

CREATE TRIGGER trg_set_trim_session_product_names
  BEFORE UPDATE ON trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_trim_session_product_names();