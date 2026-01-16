/*
  # Fix Allocation Views to Use Actual Inventory Data

  ## Summary
  The allocation modal was showing no inventory available because the views were
  looking at empty internal inventory tables. This migration updates the views to
  pull from the actual inventory_items table which contains real data from CSV imports.

  ## Changes

  ### 1. Drop and recreate bulk_inventory_availability view
  - Now queries from inventory_items table instead of internal_bulk_inventory
  - Filters for bulk categories (Flower - Bulk, Trim - Bulk)
  - Maps product_name to product_type (flower, smalls, trim)
  - Shows available_qty as available_weight
  - Properly handles allocations from order_item_allocations

  ### 2. Drop and recreate packaged_inventory_availability view
  - Now queries from inventory_items table instead of internal_packaged_inventory
  - Filters for packaged categories (Flower - Prepack, Trim - Prepack)
  - Maps product SKU to unit_size (3.5g, 14g, 454g)
  - Shows available_qty as available_units
  - Properly handles allocations from order_item_allocations

  ## Notes
  - This bridges the gap between CSV-imported inventory and the allocation system
  - The internal_*_inventory tables remain for future session-based tracking
  - Views now return actual inventory data that users can allocate to orders
*/

-- Drop existing views
DROP VIEW IF EXISTS bulk_inventory_availability CASCADE;
DROP VIEW IF EXISTS packaged_inventory_availability CASCADE;

-- Recreate bulk_inventory_availability to pull from inventory_items
CREATE OR REPLACE VIEW bulk_inventory_availability AS
SELECT 
  ii.id,
  ii.strain,
  CASE 
    WHEN ii.category = 'Flower - Bulk' AND ii.product_name LIKE '%Smalls%' THEN 'smalls'
    WHEN ii.category = 'Flower - Bulk' THEN 'flower'
    WHEN ii.category = 'Trim - Bulk' THEN 'trim'
    ELSE 'flower'
  END as product_type,
  CAST(ii.available_qty AS numeric) as total_weight,
  COALESCE(
    SUM(oia.allocated_quantity) FILTER (
      WHERE oia.allocation_status IN ('reserved', 'confirmed')
    ), 
    0
  ) as allocated_weight,
  CAST(ii.available_qty AS numeric) - COALESCE(
    SUM(oia.allocated_quantity) FILTER (
      WHERE oia.allocation_status IN ('reserved', 'confirmed')
    ), 
    0
  ) as available_weight,
  ii.batch as batch_id,
  ii.status as quality_grade,
  NULL::date as trim_date,
  ii.created_at
FROM inventory_items ii
LEFT JOIN order_item_allocations oia 
  ON oia.inventory_id = ii.id 
  AND oia.inventory_type = 'bulk'
WHERE ii.category IN ('Flower - Bulk', 'Trim - Bulk')
  AND CAST(ii.available_qty AS numeric) > 0
GROUP BY 
  ii.id, 
  ii.strain, 
  ii.category,
  ii.product_name,
  ii.available_qty, 
  ii.batch, 
  ii.status, 
  ii.created_at;

-- Recreate packaged_inventory_availability to pull from inventory_items
CREATE OR REPLACE VIEW packaged_inventory_availability AS
SELECT 
  ii.id,
  ii.strain,
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
  CAST(ii.available_qty AS integer) as total_units,
  COALESCE(
    SUM(CAST(oia.allocated_quantity AS integer)) FILTER (
      WHERE oia.allocation_status IN ('reserved', 'confirmed')
    ), 
    0
  ) as allocated_units,
  CAST(ii.available_qty AS integer) - COALESCE(
    SUM(CAST(oia.allocated_quantity AS integer)) FILTER (
      WHERE oia.allocation_status IN ('reserved', 'confirmed')
    ), 
    0
  ) as available_units,
  ii.batch as batch_id,
  NULL::date as package_date,
  ii.created_at
FROM inventory_items ii
LEFT JOIN order_item_allocations oia 
  ON oia.inventory_id = ii.id 
  AND oia.inventory_type = 'packaged'
WHERE ii.category IN ('Flower - Prepack', 'Trim - Prepack')
  AND CAST(ii.available_qty AS numeric) > 0
GROUP BY 
  ii.id, 
  ii.strain, 
  ii.category,
  ii.sku,
  ii.product_name,
  ii.available_qty, 
  ii.batch, 
  ii.created_at;
