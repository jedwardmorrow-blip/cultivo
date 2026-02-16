/*
  # Fix get_batches_for_strain to show all active batches

  ## Problem
  The HAVING clause filters out batches with zero tracked inventory weight.
  This hides newly created batches that haven't been through the processing
  pipeline yet, even though they are active in batch_registry. Users cannot
  assign these batches to order items for traceability.

  ## Changes
  - Remove the HAVING clause so ALL active, non-quarantined batches appear
  - Add ORDER BY that puts batches with available inventory first
  - Preserves all existing return columns and stage availability metadata

  ## Impact
  - Batch assignment dropdown on orders will show all active batches for a strain
  - Batches without stage tracking data are no longer hidden
  - Only used by OrderItemRow batch dropdown
*/

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

    COALESCE(BOOL_OR(bst.stage = 'bucked' AND bst.available_weight_grams > 0), false) as has_bucked,
    COALESCE(BOOL_OR(bst.stage = 'bulk_flower' AND bst.available_weight_grams > 0), false) as has_bulk_flower,
    COALESCE(BOOL_OR(bst.stage = 'bulk_smalls' AND bst.available_weight_grams > 0), false) as has_bulk_smalls,
    COALESCE(BOOL_OR(bst.stage = 'bulk_trim' AND bst.available_weight_grams > 0), false) as has_bulk_trim,
    COALESCE(BOOL_OR(bst.stage = 'packaged' AND bst.available_weight_grams > 0), false) as has_packaged,

    COALESCE(MAX(CASE WHEN bst.stage = 'bucked' THEN bst.available_weight_grams ELSE 0 END), 0) as bucked_available_grams,
    COALESCE(MAX(CASE WHEN bst.stage = 'bulk_flower' THEN bst.available_weight_grams ELSE 0 END), 0) as bulk_flower_available_grams,
    COALESCE(MAX(CASE WHEN bst.stage = 'bulk_smalls' THEN bst.available_weight_grams ELSE 0 END), 0) as bulk_smalls_available_grams,
    COALESCE(MAX(CASE WHEN bst.stage = 'bulk_trim' THEN bst.available_weight_grams ELSE 0 END), 0) as bulk_trim_available_grams,
    COALESCE(MAX(CASE WHEN bst.stage = 'packaged' THEN bst.available_weight_grams ELSE 0 END), 0) as packaged_available_grams,

    COALESCE(SUM(bst.available_weight_grams), 0) as total_available_grams

  FROM batch_registry br
  LEFT JOIN batch_stage_tracking bst ON bst.batch_id = br.id
  WHERE
    br.strain = p_strain
    AND br.status = 'active'
    AND (br.is_quarantined IS NULL OR br.is_quarantined = false)
  GROUP BY br.id, br.batch_number, br.strain, br.harvest_date, br.coa_id, br.status
  ORDER BY COALESCE(SUM(bst.available_weight_grams), 0) DESC, br.batch_number DESC;
END;
$$;
