/*
  # Fix Conversion Views - Remove review_status References

  1. Changes
    - Drop and recreate conversion_history_view without review_status column
    - Simplify to use boolean in_inventory check instead
    - Remove references to non-existent inventory_items.review_status column

  2. Reason
    - Original views query review_status column that was never added to inventory_items
    - Causing "column does not exist" errors when views are queried
    - Decision #2 claimed to add review_status but it was never implemented

  3. Impact
    - Fixes conversion history queries
    - Maintains all other view functionality
    - No data loss - conversion_packages table unchanged
*/

-- Drop existing view
DROP VIEW IF EXISTS conversion_history_view;

-- Recreate without review_status column (matching existing structure exactly)
CREATE VIEW conversion_history_view AS
SELECT
  cp.id,
  cp.package_id,
  cp.batch_id,
  br.batch_number as batch_name,
  br.strain_id,
  s.name as strain_name,
  cp.product_id,
  p.name as product_name,
  p.type as product_type,
  ps.name as stage_name,
  cp.weight,
  cp.units,
  cp.source_session_ids,
  cp.finalization_status,
  cp.created_at,
  cp.created_by,
  up_created.full_name as created_by_name,
  cp.finalized_at,
  cp.finalized_by,
  up_finalized.full_name as finalized_by_name,
  cp.packaged_at,
  -- Check if in inventory (unchanged)
  CASE
    WHEN EXISTS (
      SELECT 1 FROM inventory_items ii
      WHERE ii.package_id = cp.package_id
    ) THEN true
    ELSE false
  END as in_inventory
  -- REMOVED: review_status subquery (was lines 382-387)
FROM conversion_packages cp
JOIN batch_registry br ON cp.batch_id = br.id
LEFT JOIN strains s ON br.strain_id = s.id
LEFT JOIN products p ON cp.product_id = p.id
LEFT JOIN product_stages ps ON cp.inventory_stage_id = ps.id
LEFT JOIN user_profiles up_created ON cp.created_by = up_created.id
LEFT JOIN user_profiles up_finalized ON cp.finalized_by = up_finalized.id
ORDER BY cp.created_at DESC;

COMMENT ON VIEW conversion_history_view IS
'Shows all conversion packages with finalization status and audit trail.
Includes who finalized and when, plus inventory status (in_inventory boolean).
Fixed: Removed review_status column reference that was never implemented.';
