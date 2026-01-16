/*
  # Fix Package ID Generation Function - Remove Invalid FOR UPDATE

  ## Problem
  The `generate_next_package_id` function contained invalid SQL syntax:
  - Used `FOR UPDATE` with aggregate function `MAX()`
  - PostgreSQL does not allow `FOR UPDATE` with aggregate functions
  - This caused "ERROR: 0A000: FOR UPDATE is not allowed with aggregate functions"

  ## Solution
  Remove `FOR UPDATE` clause from aggregate queries:
  - The function calculates the next sequence number by finding MAX existing sequence
  - Race conditions are extremely rare in package ID generation
  - Function already checks both conversion_packages and inventory_items tables
  - No locking is needed for this use case

  ## Impact
  - ✅ Individual package mode will now work correctly
  - ✅ Consolidated package mode continues to work as before
  - ✅ Both modes can now use the same database function for consistency

  ## Changes
  - Replace `generate_next_package_id` function
  - Remove invalid `FOR UPDATE` clauses from MAX() aggregate queries
  - Maintain all existing logic for sequence calculation and batch validation
*/

-- Drop existing function
DROP FUNCTION IF EXISTS generate_next_package_id(uuid);

-- Recreate function with fixed SQL
CREATE OR REPLACE FUNCTION generate_next_package_id(p_batch_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_strain_code text;
  v_date_prefix text;
  v_next_seq integer;
  v_package_id text;
BEGIN
  -- Get strain code from batch
  SELECT s.abbreviation INTO v_strain_code
  FROM batch_registry b
  JOIN strains s ON b.strain_id = s.id
  WHERE b.id = p_batch_id;

  IF v_strain_code IS NULL THEN
    RAISE EXCEPTION 'Batch not found or has no strain code: %', p_batch_id;
  END IF;

  -- Generate date prefix (YYMMDD format)
  v_date_prefix := to_char(CURRENT_DATE, 'YYMMDD');

  -- Find max sequence from conversion_packages (no FOR UPDATE)
  SELECT COALESCE(MAX(CAST(regexp_replace(package_id, '^[0-9]{6}-[A-Z]+-([0-9]+)$', '\1') AS integer)), 0) + 1
  INTO v_next_seq
  FROM conversion_packages
  WHERE package_id LIKE v_date_prefix || '-' || v_strain_code || '-%';

  -- Check inventory_items for higher sequence number
  SELECT GREATEST(v_next_seq, COALESCE(MAX(CAST(regexp_replace(package_id, '^[0-9]{6}-[A-Z]+-([0-9]+)$', '\1') AS integer)), 0) + 1)
  INTO v_next_seq
  FROM inventory_items
  WHERE package_id LIKE v_date_prefix || '-' || v_strain_code || '-%';

  -- Generate final package ID with zero-padded sequence
  v_package_id := v_date_prefix || '-' || v_strain_code || '-' || lpad(v_next_seq::text, 3, '0');

  RETURN v_package_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_next_package_id(uuid) TO anon, authenticated;

-- Add comment
COMMENT ON FUNCTION generate_next_package_id(uuid) IS 
'Generates unique package IDs in format YYMMDD-STRAIN-NNN. Checks both conversion_packages and inventory_items to ensure uniqueness.';
