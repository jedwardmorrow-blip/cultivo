/*
  # Drop Broken Allocation Views

  ## Summary
  This migration removes three problematic database views that cause PGRST200 errors
  due to complex LATERAL JOINs that PostgREST cannot properly cache.

  ## Views Removed
  - `bulk_inventory_with_allocations` - Complex view causing schema cache corruption
  - `packaged_inventory_with_allocations` - Complex view causing schema cache corruption
  - `bucked_inventory_with_allocations` - Complex view causing schema cache corruption

  ## Rationale
  These views were replaced by the batch-based allocation system which uses:
  - `batch_inventory_consolidated` - Aggregates inventory at batch level
  - `batch_hierarchical_allocation_flower` - Hierarchical allocation for flower products
  - `batch_hierarchical_allocation_smalls` - Hierarchical allocation for smalls products
  - `order_demand_by_sku` - Aggregated order demand
  - `projected_inventory_requirements` - Net inventory requirements

  The batch-based system is more efficient, easier to maintain, and doesn't cause
  PostgREST cache issues.

  ## Impact
  - `order_item_allocations` table remains unchanged (historical data preserved)
  - All batch-based views remain functional
  - No data loss occurs

  ## Security
  - No RLS policy changes needed (views are being removed)
*/

-- Drop the problematic allocation views
DROP VIEW IF EXISTS bulk_inventory_with_allocations CASCADE;
DROP VIEW IF EXISTS packaged_inventory_with_allocations CASCADE;
DROP VIEW IF EXISTS bucked_inventory_with_allocations CASCADE;

-- Force PostgREST schema cache refresh
COMMENT ON TABLE inventory_items IS 'Consolidated inventory from CSV imports - Views cleanup 2025-10-23';
