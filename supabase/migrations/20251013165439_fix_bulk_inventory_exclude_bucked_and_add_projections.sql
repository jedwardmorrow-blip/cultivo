/*
  # Fix Bulk Inventory View and Add Projected Weight Requirements

  1. Changes to bulk_inventory_with_allocations view
    - Exclude bucked material (only show "Bulk -" products, not "Bucked -")
    - Exclude binned material (only show processed bulk inventory)
    - Ensure only actual trimmed/processed bulk inventory is shown

  2. Purpose
    - Prevent confusion between bucked material (pre-trim) and bulk inventory (post-trim)
    - Keep allocation sources clearly separated by processing stage
    - Improve user experience by showing only relevant inventory for each stage
*/

-- Recreate bulk_inventory_with_allocations view to exclude bucked and binned material
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
  AND ii.product_name LIKE 'Bulk -%'
  AND ii.product_name NOT LIKE '%Bucked%'
  AND ii.product_name NOT LIKE '%Binned%'
  AND CAST(ii.available_qty AS numeric) > 0;