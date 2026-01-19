/*
  # Add COA Validation Before Packaging Sessions

  **Purpose:** Enforce compliance requirement that batches must have valid COAs before packaging.

  ## Changes

  1. **Validation Function:** `check_batch_has_valid_coa(batch_uuid UUID)`
     - Returns TRUE if batch has at least one active COA
     - Returns FALSE if no active COA exists
     - Used by trigger to block packaging without COA

  2. **Validation Trigger:** `trg_validate_coa_before_packaging_session`
     - BEFORE INSERT on packaging_sessions
     - Calls validation function on NEW.batch_registry_id
     - RAISES EXCEPTION if no valid COA found
     - Error message guides user to upload COA first

  ## Compliance Impact

  - ✅ Prevents packaging without lab testing results
  - ✅ Ensures product quality documentation
  - ✅ Maintains regulatory compliance
  - ✅ Clear error message for operators

  ## Notes

  - Uses existing `is_active` boolean field (not adding expiry_date for now)
  - Non-blocking for existing workflows (existing sessions unaffected)
  - Can add expiry_date validation in future enhancement
*/

-- Function: Check if batch has a valid (active) COA
CREATE OR REPLACE FUNCTION check_batch_has_valid_coa(batch_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  coa_count INTEGER;
BEGIN
  -- Count active COAs for this batch
  SELECT COUNT(*) INTO coa_count
  FROM certificates_of_analysis
  WHERE batch_id = batch_uuid
    AND is_active = true;

  -- Return true if at least one active COA exists
  RETURN coa_count > 0;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION check_batch_has_valid_coa(UUID) IS 
  'Validates that a batch has at least one active COA. Used by packaging session trigger to enforce compliance.';

-- Trigger function: Validate COA before packaging
CREATE OR REPLACE FUNCTION validate_coa_before_packaging()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if batch has valid COA
  IF NOT check_batch_has_valid_coa(NEW.batch_registry_id) THEN
    RAISE EXCEPTION 
      'Cannot start packaging session: Batch requires valid Certificate of Analysis (COA). Please upload COA for batch % before packaging.',
      NEW.batch_id;
  END IF;

  -- Validation passed, allow insert
  RETURN NEW;
END;
$$;

-- Create trigger on packaging_sessions
DROP TRIGGER IF EXISTS trg_validate_coa_before_packaging_session ON packaging_sessions;

CREATE TRIGGER trg_validate_coa_before_packaging_session
  BEFORE INSERT ON packaging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION validate_coa_before_packaging();

-- Add helpful comment
COMMENT ON TRIGGER trg_validate_coa_before_packaging_session ON packaging_sessions IS
  'Enforces compliance requirement: prevents packaging without valid COA. Raises clear error directing user to upload COA.';
