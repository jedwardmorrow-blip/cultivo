/*
  # Fix Allocation Views to Use Actual Inventory Data

  ## Problem
  The allocation modal is showing no inventory because the views query from empty
  internal_*_inventory tables. The actual inventory data is in the inventory_items table.

  ## Solution
  Update the three allocation views to pull from inventory_items instead:
  - bulk_inventory_with_allocations
  - packaged_inventory_with_allocations
  - bucked_inventory_with_allocations (for bucked flower)

  ## Changes
  1. Update bulk view to query inventory_items with category 'Flower - Bulk' or 'Trim - Bulk'
  2. Update packaged view to query inventory_items with category 'Flower - Prepack' or 'Trim - Prepack'
  3. Update bucked view to query inventory_items with product_name containing 'Bucked'
*/

-- Drop existing views
DROP VIEW IF EXISTS bulk_inventory_with_allocations CASCADE;
DROP VIEW IF EXISTS packaged_inventory_with_allocations CASCADE;
DROP VIEW IF EXISTS bucked_inventory_with_allocations CASCADE;

-- Recreate bulk_inventory_with_allocations from inventory_items
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
  COALESCE(alloc_summary.active_allocations, 0) as allocated_weight_grams,
  CAST(ii.available_qty AS numeric) - COALESCE(alloc_summary.active_allocations, 0) as available_weight_grams,
  COALESCE(alloc_summary.active_allocations, 0) as allocated_by_orders,
  COALESCE(alloc_summary.orders_count, 0) as orders_count,
  alloc_summary.order_numbers,
  ii.status as quality_grade,
  NULL::date as trim_date,
  ii.created_at,
  ii.last_updated as updated_at
FROM inventory_items ii
LEFT JOIN LATERAL (
  SELECT
    SUM(oia.allocated_quantity) as active_allocations,
    COUNT(DISTINCT oia.order_id) as orders_count,
    STRING_AGG(DISTINCT o.order_number, ', ') as order_numbers
  FROM order_item_allocations oia
  JOIN orders o ON o.id = oia.order_id
  WHERE oia.inventory_id = ii.id
    AND oia.inventory_type = 'bulk'
    AND oia.allocation_status IN ('reserved', 'confirmed')
  GROUP BY oia.inventory_id
) alloc_summary ON true
WHERE ii.category IN ('Flower - Bulk', 'Trim - Bulk')
  AND CAST(ii.available_qty AS numeric) > 0;

-- Recreate packaged_inventory_with_allocations from inventory_items
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
  COALESCE(alloc_summary.active_allocations, 0) as units_allocated,
  CAST(ii.available_qty AS numeric) - COALESCE(alloc_summary.active_allocations, 0) as units_available,
  COALESCE(alloc_summary.active_allocations, 0) as allocated_by_orders,
  COALESCE(alloc_summary.orders_count, 0) as orders_count,
  alloc_summary.order_numbers,
  NULL::uuid as packaging_session_id,
  NULL::date as package_date,
  ii.created_at,
  ii.last_updated as updated_at
FROM inventory_items ii
LEFT JOIN LATERAL (
  SELECT
    SUM(oia.allocated_quantity) as active_allocations,
    COUNT(DISTINCT oia.order_id) as orders_count,
    STRING_AGG(DISTINCT o.order_number, ', ') as order_numbers
  FROM order_item_allocations oia
  JOIN orders o ON o.id = oia.order_id
  WHERE oia.inventory_id = ii.id
    AND oia.inventory_type = 'packaged'
    AND oia.allocation_status IN ('reserved', 'confirmed')
  GROUP BY oia.inventory_id
) alloc_summary ON true
WHERE ii.category IN ('Flower - Prepack', 'Trim - Prepack')
  AND CAST(ii.available_qty AS numeric) > 0;

-- Recreate bucked_inventory_with_allocations from inventory_items
CREATE OR REPLACE VIEW bucked_inventory_with_allocations AS
SELECT
  ii.id as package_id,
  ii.strain,
  ii.batch as batch_id,
  CAST(ii.available_qty AS numeric) as total_weight,
  COALESCE(alloc_summary.active_allocations, 0) as allocated_weight_grams,
  CAST(ii.available_qty AS numeric) - COALESCE(alloc_summary.active_allocations, 0) as available_weight_grams,
  COALESCE(alloc_summary.active_allocations, 0) as allocated_by_orders,
  COALESCE(alloc_summary.orders_count, 0) as orders_count,
  alloc_summary.order_numbers,
  ii.status,
  ii.room,
  ii.created_at,
  ii.last_updated as updated_at
FROM inventory_items ii
LEFT JOIN LATERAL (
  SELECT
    SUM(oia.allocated_quantity) as active_allocations,
    COUNT(DISTINCT oia.order_id) as orders_count,
    STRING_AGG(DISTINCT o.order_number, ', ') as order_numbers
  FROM order_item_allocations oia
  JOIN orders o ON o.id = oia.order_id
  WHERE oia.inventory_id = ii.id
    AND oia.inventory_type = 'bucked'
    AND oia.allocation_status IN ('reserved', 'confirmed')
  GROUP BY oia.inventory_id
) alloc_summary ON true
WHERE ii.product_name ILIKE '%bucked%'
  AND CAST(ii.available_qty AS numeric) > 0;

-- Grant permissions
GRANT SELECT ON bulk_inventory_with_allocations TO authenticated;
GRANT SELECT ON bulk_inventory_with_allocations TO anon;
GRANT SELECT ON packaged_inventory_with_allocations TO authenticated;
GRANT SELECT ON packaged_inventory_with_allocations TO anon;
GRANT SELECT ON bucked_inventory_with_allocations TO authenticated;
GRANT SELECT ON bucked_inventory_with_allocations TO anon;