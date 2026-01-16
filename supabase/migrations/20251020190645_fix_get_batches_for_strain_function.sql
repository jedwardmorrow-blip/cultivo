/*
  # Fix get_batches_for_strain Function

  ## Problem
  The get_batches_for_strain function has a SQL error: "function max(boolean) does not exist"
  PostgreSQL cannot use MAX() aggregate on boolean values directly.

  ## Solution
  Replace MAX(boolean) with BOOL_OR() which is the correct aggregate for boolean values.
  BOOL_OR returns true if any value in the group is true, false otherwise.

  ## Changes
  - Replace all MAX(CASE...boolean) with BOOL_OR(CASE...boolean)
  - This allows the function to properly return batch availability flags
  - Maintains the same logic: return true if any stage has available inventory

  ## Impact
  - Fixes "No batches available" error in order form
  - Enables proper batch selection by strain
  - Makes batch dropdown functional for order items
*/

-- Drop and recreate the function with correct boolean aggregation
CREATE OR REPLACE FUNCTION get_batches_for_strain(p_strain text)
RETURNS TABLE (
  batch_id uuid,
  batch_number text,
  strain text,
  harvest_date date,
  coa_id uuid,
  status text,
  has_bucked boolean,
  has_bulk_flower boolean,
  has_bulk_smalls boolean,
  has_bulk_trim boolean,
  has_packaged boolean,
  bucked_available_grams numeric,
  bulk_flower_available_grams numeric,
  bulk_smalls_available_grams numeric,
  bulk_trim_available_grams numeric,
  packaged_available_grams numeric,
  total_available_grams numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    br.id as batch_id,
    br.batch_number,
    br.strain,
    br.harvest_date,
    br.coa_id,
    br.status,

    -- Stage availability flags - use BOOL_OR instead of MAX for booleans
    COALESCE(BOOL_OR(bst.stage = 'bucked' AND bst.available_weight_grams > 0), false) as has_bucked,
    COALESCE(BOOL_OR(bst.stage = 'bulk_flower' AND bst.available_weight_grams > 0), false) as has_bulk_flower,
    COALESCE(BOOL_OR(bst.stage = 'bulk_smalls' AND bst.available_weight_grams > 0), false) as has_bulk_smalls,
    COALESCE(BOOL_OR(bst.stage = 'bulk_trim' AND bst.available_weight_grams > 0), false) as has_bulk_trim,
    COALESCE(BOOL_OR(bst.stage = 'packaged' AND bst.available_weight_grams > 0), false) as has_packaged,

    -- Available weights per stage
    COALESCE(MAX(CASE WHEN bst.stage = 'bucked' THEN bst.available_weight_grams ELSE 0 END), 0) as bucked_available_grams,
    COALESCE(MAX(CASE WHEN bst.stage = 'bulk_flower' THEN bst.available_weight_grams ELSE 0 END), 0) as bulk_flower_available_grams,
    COALESCE(MAX(CASE WHEN bst.stage = 'bulk_smalls' THEN bst.available_weight_grams ELSE 0 END), 0) as bulk_smalls_available_grams,
    COALESCE(MAX(CASE WHEN bst.stage = 'bulk_trim' THEN bst.available_weight_grams ELSE 0 END), 0) as bulk_trim_available_grams,
    COALESCE(MAX(CASE WHEN bst.stage = 'packaged' THEN bst.available_weight_grams ELSE 0 END), 0) as packaged_available_grams,

    -- Total available across all stages
    COALESCE(SUM(bst.available_weight_grams), 0) as total_available_grams

  FROM batch_registry br
  LEFT JOIN batch_stage_tracking bst ON bst.batch_id = br.id
  WHERE
    br.strain = p_strain
    AND br.status = 'active'
    AND (br.is_quarantined IS NULL OR br.is_quarantined = false)
  GROUP BY br.id, br.batch_number, br.strain, br.harvest_date, br.coa_id, br.status
  HAVING COALESCE(SUM(bst.available_weight_grams), 0) > 0
  ORDER BY br.batch_number DESC;
END;
$$;

-- Add comment explaining the fix
COMMENT ON FUNCTION get_batches_for_strain IS 
'Get all available batches for a specific strain with stage availability metadata. 
Uses BOOL_OR for boolean aggregation (fixed from MAX which does not work with booleans).
Returns batch info plus flags indicating which stages have inventory available.';
