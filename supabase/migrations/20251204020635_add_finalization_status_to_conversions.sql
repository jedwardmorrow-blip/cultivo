/*
  # Add Finalization Status to Conversion Lots

  ## Changes
  - Modified `get_conversion_lot_summary` function to include finalization status
  - Adds `has_packages`, `packages_finalized` fields to track conversion state
  - Shows which conversions have packages created but not yet finalized to inventory

  ## States
  - No packages: Ready to convert
  - Has packages, not finalized: Pending finalization (awaiting inventory movement)
  - Has packages, finalized: Completed (packages in live inventory)

  ## Rationale
  The conversion workflow has two steps:
  1. Create packages (conversion_packages table)
  2. Finalize to inventory (inventory_items table + movements)

  Previously, step 2 was sometimes skipped, leaving packages stranded.
  This migration adds visibility into finalization status so managers can
  complete abandoned conversions.
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_conversion_lot_summary(DATE);

-- Recreate with finalization status
CREATE FUNCTION get_conversion_lot_summary(p_date DATE DEFAULT NULL)
RETURNS TABLE (
  lot_id UUID,
  batch_id UUID,
  batch_name TEXT,
  strain_name TEXT,
  strain_code TEXT,
  product_id UUID,
  product_name TEXT,
  product_type TEXT,
  total_weight NUMERIC,
  total_units INTEGER,
  remaining_weight NUMERIC,
  remaining_units INTEGER,
  contributing_session_count INTEGER,
  status TEXT,
  is_locked BOOLEAN,
  locked_by_user UUID,
  locked_by_name TEXT,
  has_packages BOOLEAN,
  packages_finalized BOOLEAN,
  package_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cl.id as lot_id,
    cl.batch_id,
    b.batch_number as batch_name,
    s.name as strain_name,
    s.abbreviation as strain_code,
    cl.product_id,
    p.name as product_name,
    p.type as product_type,
    cl.total_weight,
    cl.total_units,
    cl.remaining_weight,
    cl.remaining_units,
    cl.contributing_session_count,
    cl.status,
    (CASE WHEN clk.id IS NOT NULL AND clk.expires_at > now() THEN true ELSE false END) as is_locked,
    clk.locked_by as locked_by_user,
    up.full_name as locked_by_name,
    (CASE WHEN pkg_count.count > 0 THEN true ELSE false END) as has_packages,
    (CASE WHEN inv_count.count > 0 THEN true ELSE false END) as packages_finalized,
    COALESCE(pkg_count.count, 0)::INTEGER as package_count
  FROM conversion_lots cl
  JOIN batch_registry b ON cl.batch_id = b.id
  JOIN strains s ON b.strain_id = s.id
  JOIN products p ON cl.product_id = p.id
  LEFT JOIN conversion_locks clk ON cl.id = clk.conversion_lot_id
  LEFT JOIN user_profiles up ON clk.locked_by = up.id
  -- Count packages created for this lot
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as count
    FROM conversion_packages cp
    WHERE cp.conversion_lot_id = cl.id
  ) pkg_count ON true
  -- Check if any packages have been finalized to inventory
  LEFT JOIN LATERAL (
    SELECT COUNT(DISTINCT ii.id) as count
    FROM conversion_packages cp
    JOIN inventory_items ii ON ii.package_id = cp.package_id
    WHERE cp.conversion_lot_id = cl.id
  ) inv_count ON true
  WHERE cl.status IN ('active', 'completed_today')
    AND (p_date IS NULL OR cl.lot_date = p_date)
  ORDER BY
    -- Pending finalization first
    (CASE WHEN pkg_count.count > 0 AND inv_count.count = 0 THEN 0 ELSE 1 END),
    -- Then by status
    cl.status ASC,
    cl.lot_date DESC,
    s.name ASC,
    p.name ASC;
END;
$$;

-- Add comment
COMMENT ON FUNCTION get_conversion_lot_summary IS 'Returns conversion lot summary with finalization status. Prioritizes lots with packages pending finalization.';