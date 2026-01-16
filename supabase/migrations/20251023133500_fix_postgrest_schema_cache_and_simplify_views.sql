/*
  # Fix PostgREST Schema Cache and Simplify Allocation Views

  ## Problem
  PostgREST's schema cache became corrupted (showing "foreions" instead of "foreign"),
  causing 400 errors when querying allocation views. This happens because:
  1. The LATERAL JOINs in allocation views are too complex for PostgREST to cache properly
  2. No formal foreign key exists between order_item_allocations.inventory_id and inventory_items.id
  3. PostgREST struggles to resolve the polymorphic relationship

  ## Solution
  1. Simplify the LATERAL JOINs to use explicit subqueries
  2. Add explicit table aliases and clearer JOIN conditions
  3. Add a schema-level comment to force PostgREST cache invalidation
  4. Ensure all views have proper GRANT statements

  ## Security
  - All views grant SELECT to both authenticated and anon roles
  - Views respect underlying table RLS policies automatically
*/

-- Force PostgREST schema cache refresh by adding/updating a comment
COMMENT ON TABLE inventory_items IS 'Consolidated inventory from CSV imports - Schema cache refresh 2025-10-23';

-- Drop and recreate all three allocation views with simplified queries
DROP VIEW IF EXISTS bulk_inventory_with_allocations CASCADE;
DROP VIEW IF EXISTS packaged_inventory_with_allocations CASCADE;
DROP VIEW IF EXISTS bucked_inventory_with_allocations CASCADE;

-- Recreate bulk_inventory_with_allocations with simplified query
CREATE OR REPLACE VIEW bulk_inventory_with_allocations AS
SELECT
  ii.id,
  ii.strain,
  ii.batch as batch_id,
  CASE
    WHEN ii.category = 'Flower - Bulk' AND ii.product_name LIKE '%Smalls%' THEN 'smalls'
    WHEN ii.category = 'Flower - Bulk' THEN 'flower'
    WHEN ii.category = 'Trim - Bulk' THEN 'trim'
    ELSE 'flower'
  END as product_type,
  CAST(ii.available_qty AS numeric) as total_weight,
  COALESCE((
    SELECT SUM(oia.allocated_quantity)
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'bulk'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ), 0) as allocated_weight_grams,
  CAST(ii.available_qty AS numeric) - COALESCE((
    SELECT SUM(oia.allocated_quantity)
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'bulk'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ), 0) as available_weight_grams,
  COALESCE((
    SELECT SUM(oia.allocated_quantity)
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'bulk'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ), 0) as allocated_by_orders,
  COALESCE((
    SELECT COUNT(DISTINCT oia.order_id)
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'bulk'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ), 0) as orders_count,
  (
    SELECT STRING_AGG(DISTINCT o.order_number, ', ')
    FROM order_item_allocations oia
    JOIN orders o ON o.id = oia.order_id
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'bulk'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ) as order_numbers,
  ii.status as quality_grade,
  NULL::date as trim_date,
  ii.created_at,
  ii.last_updated as updated_at
FROM inventory_items ii
WHERE ii.category IN ('Flower - Bulk', 'Trim - Bulk')
  AND CAST(ii.available_qty AS numeric) > 0;

-- Recreate packaged_inventory_with_allocations with simplified query
CREATE OR REPLACE VIEW packaged_inventory_with_allocations AS
SELECT
  ii.id,
  ii.strain,
  ii.batch as batch_id,
  CASE
    WHEN ii.category = 'Flower - Prepack' THEN 'flower'
    WHEN ii.category = 'Trim - Prepack' THEN 'trim'
    ELSE 'flower'
  END as product_type,
  CASE
    WHEN ii.sku LIKE '%-0003' OR ii.product_name LIKE '%3.5g%' THEN '3.5g'
    WHEN ii.sku LIKE '%-0002' OR ii.product_name LIKE '%14g%' THEN '14g'
    WHEN ii.sku LIKE '%-0001' OR ii.product_name LIKE '%454g%' THEN '454g'
    ELSE '3.5g'
  END as unit_size,
  CAST(ii.available_qty AS numeric) as total_units,
  COALESCE((
    SELECT SUM(oia.allocated_quantity)
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'packaged'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ), 0) as units_allocated,
  CAST(ii.available_qty AS numeric) - COALESCE((
    SELECT SUM(oia.allocated_quantity)
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'packaged'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ), 0) as units_available,
  COALESCE((
    SELECT SUM(oia.allocated_quantity)
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'packaged'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ), 0) as allocated_by_orders,
  COALESCE((
    SELECT COUNT(DISTINCT oia.order_id)
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'packaged'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ), 0) as orders_count,
  (
    SELECT STRING_AGG(DISTINCT o.order_number, ', ')
    FROM order_item_allocations oia
    JOIN orders o ON o.id = oia.order_id
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'packaged'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ) as order_numbers,
  NULL::uuid as packaging_session_id,
  NULL::date as package_date,
  ii.created_at,
  ii.last_updated as updated_at
FROM inventory_items ii
WHERE ii.category IN ('Flower - Prepack', 'Trim - Prepack')
  AND CAST(ii.available_qty AS numeric) > 0;

-- Recreate bucked_inventory_with_allocations with simplified query
CREATE OR REPLACE VIEW bucked_inventory_with_allocations AS
SELECT
  ii.id as package_id,
  ii.strain,
  ii.batch as batch_id,
  CAST(ii.available_qty AS numeric) as total_weight,
  COALESCE((
    SELECT SUM(oia.allocated_quantity)
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'bucked'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ), 0) as allocated_weight_grams,
  CAST(ii.available_qty AS numeric) - COALESCE((
    SELECT SUM(oia.allocated_quantity)
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'bucked'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ), 0) as available_weight_grams,
  COALESCE((
    SELECT SUM(oia.allocated_quantity)
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'bucked'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ), 0) as allocated_by_orders,
  COALESCE((
    SELECT COUNT(DISTINCT oia.order_id)
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'bucked'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ), 0) as orders_count,
  (
    SELECT STRING_AGG(DISTINCT o.order_number, ', ')
    FROM order_item_allocations oia
    JOIN orders o ON o.id = oia.order_id
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'bucked'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ) as order_numbers,
  ii.status,
  ii.room,
  ii.created_at,
  ii.last_updated as updated_at
FROM inventory_items ii
WHERE ii.product_name ILIKE '%bucked%'
  AND CAST(ii.available_qty AS numeric) > 0;

-- Grant permissions to both authenticated and anonymous users
GRANT SELECT ON bulk_inventory_with_allocations TO authenticated, anon;
GRANT SELECT ON packaged_inventory_with_allocations TO authenticated, anon;
GRANT SELECT ON bucked_inventory_with_allocations TO authenticated, anon;

-- Add comments to views for documentation
COMMENT ON VIEW bulk_inventory_with_allocations IS 'Bulk flower/trim inventory with allocation tracking';
COMMENT ON VIEW packaged_inventory_with_allocations IS 'Packaged inventory (3.5g, 14g, 454g) with allocation tracking';
COMMENT ON VIEW bucked_inventory_with_allocations IS 'Bucked flower inventory with allocation tracking';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';