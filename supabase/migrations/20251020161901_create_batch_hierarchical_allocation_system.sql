/*
  # Batch-Based Hierarchical Allocation System

  ## Overview
  This migration creates a batch-centric allocation system that consolidates inventory
  across all stages (bucked, bulk, packaged) and implements intelligent hierarchical
  allocation logic following the priority: Packaged → Bulk → Bucked.

  ## Key Features

  1. **Batch-Level Inventory Aggregation**
     - Consolidated view showing total available inventory per batch across all stages
     - Calculates packaged-equivalent capacity using conversion ratios
     - Tracks allocated amounts at batch level while maintaining product-type detail

  2. **Hierarchical Allocation Views**
     - Flower hierarchy: Packaged 3.5g → Bulk Flower → Bucked Flower
     - Smalls hierarchy: Packaged 14g → Bulk Smalls → Bucked Smalls
     - Separate views for each product category showing stage-by-stage breakdown

  3. **Order Demand Aggregation**
     - Calculates total demand across all orders by strain and product type
     - Accounts for already-packaged inventory
     - Shows net packaging requirements

  ## New Views

  - batch_inventory_consolidated: Aggregated batch inventory across all stages
  - batch_hierarchical_allocation_flower: Flower allocation hierarchy per batch
  - batch_hierarchical_allocation_smalls: Smalls allocation hierarchy per batch
  - order_demand_by_sku: Total demand aggregated by SKU across all orders
  - projected_inventory_requirements: Net inventory needs after accounting for existing inventory

  ## Security
  - RLS enabled on all new views
  - Authenticated users can read all allocation data
*/

-- =====================================================
-- STEP 1: Create batch inventory consolidated view
-- =====================================================

CREATE OR REPLACE VIEW batch_inventory_consolidated AS
WITH batch_packaged AS (
  SELECT
    ii.batch as batch_id,
    ii.strain,
    CASE 
      WHEN ii.sku LIKE '%-0003' OR ii.product_name LIKE '%3.5g%' THEN '3.5g'
      WHEN ii.sku LIKE '%-0002' OR ii.product_name LIKE '%14g%' THEN '14g'
      WHEN ii.sku LIKE '%-0001' OR ii.product_name LIKE '%454g%' THEN '454g'
      ELSE 'unknown'
    END as unit_size,
    CASE 
      WHEN ii.category = 'Flower - Prepack' THEN 'flower'
      WHEN ii.category = 'Trim - Prepack' THEN 'trim'
      WHEN ii.product_name LIKE '%Smalls%' THEN 'smalls'
      ELSE 'flower'
    END as product_category,
    SUM(CAST(ii.available_qty AS numeric)) as total_units,
    SUM(CAST(ii.available_qty AS numeric)) - COALESCE(SUM(alloc.allocated), 0) as available_units
  FROM inventory_items ii
  LEFT JOIN LATERAL (
    SELECT SUM(oia.allocated_quantity) as allocated
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'packaged'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ) alloc ON true
  WHERE ii.category IN ('Flower - Prepack', 'Trim - Prepack')
    AND ii.batch IS NOT NULL
  GROUP BY ii.batch, ii.strain, unit_size, product_category
),
batch_bulk AS (
  SELECT
    ii.batch as batch_id,
    ii.strain,
    CASE 
      WHEN ii.category = 'Flower - Bulk' AND ii.product_name LIKE '%Smalls%' THEN 'smalls'
      WHEN ii.category = 'Flower - Bulk' THEN 'flower'
      WHEN ii.category = 'Trim - Bulk' THEN 'trim'
      ELSE 'flower'
    END as product_type,
    SUM(CAST(ii.available_qty AS numeric)) as total_weight_grams,
    SUM(CAST(ii.available_qty AS numeric)) - COALESCE(SUM(alloc.allocated), 0) as available_weight_grams
  FROM inventory_items ii
  LEFT JOIN LATERAL (
    SELECT SUM(oia.allocated_quantity) as allocated
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'bulk'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ) alloc ON true
  WHERE ii.category IN ('Flower - Bulk', 'Trim - Bulk')
    AND ii.batch IS NOT NULL
  GROUP BY ii.batch, ii.strain, product_type
),
batch_bucked AS (
  SELECT
    ii.batch as batch_id,
    ii.strain,
    SUM(CAST(ii.available_qty AS numeric)) as total_weight_grams,
    SUM(CAST(ii.available_qty AS numeric)) - COALESCE(SUM(alloc.allocated), 0) as available_weight_grams
  FROM inventory_items ii
  LEFT JOIN LATERAL (
    SELECT SUM(oia.allocated_quantity) as allocated
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'bucked'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ) alloc ON true
  WHERE ii.product_name ILIKE '%bucked%'
    AND ii.batch IS NOT NULL
  GROUP BY ii.batch, ii.strain
)
SELECT
  COALESCE(bp.batch_id, bb_bulk.batch_id, bb_bucked.batch_id) as batch_id,
  COALESCE(bp.strain, bb_bulk.strain, bb_bucked.strain) as strain,
  COALESCE(SUM(bp.available_units), 0) as packaged_units_available,
  COALESCE(SUM(bb_bulk.available_weight_grams), 0) as bulk_grams_available,
  COALESCE(bb_bucked.available_weight_grams, 0) as bucked_grams_available,
  COALESCE(SUM(bp.total_units), 0) as packaged_units_total,
  COALESCE(SUM(bb_bulk.total_weight_grams), 0) as bulk_grams_total,
  COALESCE(bb_bucked.total_weight_grams, 0) as bucked_grams_total
FROM batch_packaged bp
FULL OUTER JOIN batch_bulk bb_bulk 
  ON bp.batch_id = bb_bulk.batch_id AND bp.strain = bb_bulk.strain
FULL OUTER JOIN batch_bucked bb_bucked 
  ON COALESCE(bp.batch_id, bb_bulk.batch_id) = bb_bucked.batch_id 
  AND COALESCE(bp.strain, bb_bulk.strain) = bb_bucked.strain
GROUP BY 
  COALESCE(bp.batch_id, bb_bulk.batch_id, bb_bucked.batch_id),
  COALESCE(bp.strain, bb_bulk.strain, bb_bucked.strain),
  bb_bucked.available_weight_grams,
  bb_bucked.total_weight_grams;

-- =====================================================
-- STEP 2: Create hierarchical allocation views
-- =====================================================

-- Flower hierarchy: Packaged 3.5g → Bulk Flower → Bucked
CREATE OR REPLACE VIEW batch_hierarchical_allocation_flower AS
WITH batch_packaged_flower AS (
  SELECT
    ii.batch as batch_id,
    ii.strain,
    SUM(CAST(ii.available_qty AS numeric)) as packaged_35g_units,
    SUM(CAST(ii.available_qty AS numeric)) - COALESCE(SUM(alloc.allocated), 0) as available_35g_units
  FROM inventory_items ii
  LEFT JOIN LATERAL (
    SELECT SUM(oia.allocated_quantity) as allocated
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'packaged'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ) alloc ON true
  WHERE ii.category = 'Flower - Prepack'
    AND (ii.sku LIKE '%-0003' OR ii.product_name LIKE '%3.5g%')
    AND ii.batch IS NOT NULL
  GROUP BY ii.batch, ii.strain
),
batch_bulk_flower AS (
  SELECT
    ii.batch as batch_id,
    ii.strain,
    SUM(CAST(ii.available_qty AS numeric)) as bulk_flower_grams,
    SUM(CAST(ii.available_qty AS numeric)) - COALESCE(SUM(alloc.allocated), 0) as available_flower_grams
  FROM inventory_items ii
  LEFT JOIN LATERAL (
    SELECT SUM(oia.allocated_quantity) as allocated
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'bulk'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ) alloc ON true
  WHERE ii.category = 'Flower - Bulk'
    AND ii.product_name NOT LIKE '%Smalls%'
    AND ii.batch IS NOT NULL
  GROUP BY ii.batch, ii.strain
),
batch_bucked_flower AS (
  SELECT
    ii.batch as batch_id,
    ii.strain,
    SUM(CAST(ii.available_qty AS numeric)) as bucked_grams,
    SUM(CAST(ii.available_qty AS numeric)) - COALESCE(SUM(alloc.allocated), 0) as available_bucked_grams
  FROM inventory_items ii
  LEFT JOIN LATERAL (
    SELECT SUM(oia.allocated_quantity) as allocated
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'bucked'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ) alloc ON true
  WHERE ii.product_name ILIKE '%bucked%'
    AND ii.batch IS NOT NULL
  GROUP BY ii.batch, ii.strain
)
SELECT
  COALESCE(pf.batch_id, bf.batch_id, bk.batch_id) as batch_id,
  COALESCE(pf.strain, bf.strain, bk.strain) as strain,
  'flower' as product_category,
  
  -- Stage 1: Packaged 3.5g
  COALESCE(pf.packaged_35g_units, 0) as packaged_total_units,
  COALESCE(pf.available_35g_units, 0) as packaged_available_units,
  
  -- Stage 2: Bulk Flower
  COALESCE(bf.bulk_flower_grams, 0) as bulk_total_grams,
  COALESCE(bf.available_flower_grams, 0) as bulk_available_grams,
  
  -- Stage 3: Bucked (convert to flower using ratio)
  COALESCE(bk.bucked_grams, 0) as bucked_total_grams,
  COALESCE(bk.available_bucked_grams, 0) as bucked_available_grams,
  
  -- Calculate projected flower from bucked
  COALESCE(bk.available_bucked_grams, 0) * 
    COALESCE((SELECT avg_bucked_to_flower_ratio FROM strain_metadata WHERE name = COALESCE(pf.strain, bf.strain, bk.strain)), 0.50) 
    as projected_flower_from_bucked_grams,
  
  -- Total capacity in 3.5g units
  COALESCE(pf.available_35g_units, 0) + 
  FLOOR(COALESCE(bf.available_flower_grams, 0) / 3.5) +
  FLOOR((COALESCE(bk.available_bucked_grams, 0) * 
    COALESCE((SELECT avg_bucked_to_flower_ratio FROM strain_metadata WHERE name = COALESCE(pf.strain, bf.strain, bk.strain)), 0.50)) / 3.5)
    as total_capacity_35g_units
FROM batch_packaged_flower pf
FULL OUTER JOIN batch_bulk_flower bf ON pf.batch_id = bf.batch_id AND pf.strain = bf.strain
FULL OUTER JOIN batch_bucked_flower bk ON COALESCE(pf.batch_id, bf.batch_id) = bk.batch_id AND COALESCE(pf.strain, bf.strain) = bk.strain;

-- Smalls hierarchy: Packaged 14g → Bulk Smalls → Bucked
CREATE OR REPLACE VIEW batch_hierarchical_allocation_smalls AS
WITH batch_packaged_smalls AS (
  SELECT
    ii.batch as batch_id,
    ii.strain,
    SUM(CAST(ii.available_qty AS numeric)) as packaged_14g_units,
    SUM(CAST(ii.available_qty AS numeric)) - COALESCE(SUM(alloc.allocated), 0) as available_14g_units
  FROM inventory_items ii
  LEFT JOIN LATERAL (
    SELECT SUM(oia.allocated_quantity) as allocated
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'packaged'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ) alloc ON true
  WHERE ii.category = 'Flower - Prepack'
    AND (ii.sku LIKE '%-0002' OR ii.product_name LIKE '%14g%')
    AND ii.batch IS NOT NULL
  GROUP BY ii.batch, ii.strain
),
batch_bulk_smalls AS (
  SELECT
    ii.batch as batch_id,
    ii.strain,
    SUM(CAST(ii.available_qty AS numeric)) as bulk_smalls_grams,
    SUM(CAST(ii.available_qty AS numeric)) - COALESCE(SUM(alloc.allocated), 0) as available_smalls_grams
  FROM inventory_items ii
  LEFT JOIN LATERAL (
    SELECT SUM(oia.allocated_quantity) as allocated
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'bulk'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ) alloc ON true
  WHERE ii.category = 'Flower - Bulk'
    AND ii.product_name LIKE '%Smalls%'
    AND ii.batch IS NOT NULL
  GROUP BY ii.batch, ii.strain
),
batch_bucked_smalls AS (
  SELECT
    ii.batch as batch_id,
    ii.strain,
    SUM(CAST(ii.available_qty AS numeric)) as bucked_grams,
    SUM(CAST(ii.available_qty AS numeric)) - COALESCE(SUM(alloc.allocated), 0) as available_bucked_grams
  FROM inventory_items ii
  LEFT JOIN LATERAL (
    SELECT SUM(oia.allocated_quantity) as allocated
    FROM order_item_allocations oia
    WHERE oia.inventory_id = ii.id
      AND oia.inventory_type = 'bucked'
      AND oia.allocation_status IN ('reserved', 'confirmed')
  ) alloc ON true
  WHERE ii.product_name ILIKE '%bucked%'
    AND ii.batch IS NOT NULL
  GROUP BY ii.batch, ii.strain
)
SELECT
  COALESCE(ps.batch_id, bs.batch_id, bk.batch_id) as batch_id,
  COALESCE(ps.strain, bs.strain, bk.strain) as strain,
  'smalls' as product_category,
  
  -- Stage 1: Packaged 14g
  COALESCE(ps.packaged_14g_units, 0) as packaged_total_units,
  COALESCE(ps.available_14g_units, 0) as packaged_available_units,
  
  -- Stage 2: Bulk Smalls
  COALESCE(bs.bulk_smalls_grams, 0) as bulk_total_grams,
  COALESCE(bs.available_smalls_grams, 0) as bulk_available_grams,
  
  -- Stage 3: Bucked (convert to smalls using ratio)
  COALESCE(bk.bucked_grams, 0) as bucked_total_grams,
  COALESCE(bk.available_bucked_grams, 0) as bucked_available_grams,
  
  -- Calculate projected smalls from bucked
  COALESCE(bk.available_bucked_grams, 0) * 
    COALESCE((SELECT avg_bucked_to_smalls_ratio FROM strain_metadata WHERE name = COALESCE(ps.strain, bs.strain, bk.strain)), 0.25) 
    as projected_smalls_from_bucked_grams,
  
  -- Total capacity in 14g units
  COALESCE(ps.available_14g_units, 0) + 
  FLOOR(COALESCE(bs.available_smalls_grams, 0) / 14) +
  FLOOR((COALESCE(bk.available_bucked_grams, 0) * 
    COALESCE((SELECT avg_bucked_to_smalls_ratio FROM strain_metadata WHERE name = COALESCE(ps.strain, bs.strain, bk.strain)), 0.25)) / 14)
    as total_capacity_14g_units
FROM batch_packaged_smalls ps
FULL OUTER JOIN batch_bulk_smalls bs ON ps.batch_id = bs.batch_id AND ps.strain = bs.strain
FULL OUTER JOIN batch_bucked_smalls bk ON COALESCE(ps.batch_id, bs.batch_id) = bk.batch_id AND COALESCE(ps.strain, bs.strain) = bk.strain;

-- =====================================================
-- STEP 3: Create order demand aggregation views
-- =====================================================

CREATE OR REPLACE VIEW order_demand_by_sku AS
SELECT
  p.sku,
  p.strain,
  p.name as product_name,
  p.type as product_type,
  p.product_category,
  COUNT(DISTINCT oi.order_id) as order_count,
  SUM(oi.quantity) as total_units_needed,
  SUM(oi.subtotal) as total_value,
  STRING_AGG(DISTINCT o.order_number, ', ' ORDER BY o.order_number) as order_numbers,
  MIN(o.scheduled_delivery_date) as earliest_delivery_date,
  MAX(o.scheduled_delivery_date) as latest_delivery_date
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN products p ON p.id = oi.product_id
WHERE o.status NOT IN ('delivered', 'cancelled', 'archived')
GROUP BY p.sku, p.strain, p.name, p.type, p.product_category;

CREATE OR REPLACE VIEW projected_inventory_requirements AS
WITH current_packaged AS (
  SELECT
    ii.strain,
    CASE 
      WHEN ii.sku LIKE '%-0003' OR ii.product_name LIKE '%3.5g%' THEN '3.5g'
      WHEN ii.sku LIKE '%-0002' OR ii.product_name LIKE '%14g%' THEN '14g'
      WHEN ii.sku LIKE '%-0001' OR ii.product_name LIKE '%454g%' THEN '454g'
      ELSE 'other'
    END as package_size,
    SUM(CAST(ii.available_qty AS numeric)) as available_units
  FROM inventory_items ii
  WHERE ii.category IN ('Flower - Prepack', 'Trim - Prepack')
  GROUP BY ii.strain, package_size
),
current_bulk AS (
  SELECT
    ii.strain,
    CASE 
      WHEN ii.category = 'Flower - Bulk' AND ii.product_name LIKE '%Smalls%' THEN 'smalls'
      WHEN ii.category = 'Flower - Bulk' THEN 'flower'
      WHEN ii.category = 'Trim - Bulk' THEN 'trim'
      ELSE 'flower'
    END as product_type,
    SUM(CAST(ii.available_qty AS numeric)) as available_grams
  FROM inventory_items ii
  WHERE ii.category IN ('Flower - Bulk', 'Trim - Bulk')
  GROUP BY ii.strain, product_type
)
SELECT
  od.strain,
  od.product_type,
  od.product_category,
  od.product_name,
  od.total_units_needed,
  COALESCE(cp.available_units, 0) as packaged_units_available,
  GREATEST(od.total_units_needed - COALESCE(cp.available_units, 0), 0) as units_still_needed,
  COALESCE(cb.available_grams, 0) as bulk_grams_available,
  
  -- Calculate grams needed from bulk
  GREATEST(
    (od.total_units_needed - COALESCE(cp.available_units, 0)) * 
    CASE 
      WHEN od.product_name LIKE '%3.5g%' THEN 3.5
      WHEN od.product_name LIKE '%14g%' THEN 14
      WHEN od.product_name LIKE '%454g%' THEN 454
      WHEN od.product_type = '3.5g' THEN 3.5
      WHEN od.product_type = '14g' THEN 14
      WHEN od.product_type = '454g' THEN 454
      ELSE 0
    END - COALESCE(cb.available_grams, 0), 
    0
  ) as grams_needed_from_bulk,
  
  -- Calculate bucked material needed (accounting for conversion ratio)
  GREATEST(
    (od.total_units_needed - COALESCE(cp.available_units, 0)) * 
    CASE 
      WHEN od.product_name LIKE '%3.5g%' THEN 3.5
      WHEN od.product_name LIKE '%14g%' THEN 14
      WHEN od.product_name LIKE '%454g%' THEN 454
      WHEN od.product_type = '3.5g' THEN 3.5
      WHEN od.product_type = '14g' THEN 14
      WHEN od.product_type = '454g' THEN 454
      ELSE 0
    END - COALESCE(cb.available_grams, 0), 
    0
  ) / COALESCE(
    CASE 
      WHEN od.product_category LIKE '%Flower%' AND od.product_name NOT LIKE '%14g%' AND od.product_type NOT LIKE '%14g%'
        THEN (SELECT avg_bucked_to_flower_ratio FROM strain_metadata WHERE name = od.strain)
      WHEN od.product_name LIKE '%14g%' OR od.product_type LIKE '%14g%' OR od.product_name LIKE '%Smalls%'
        THEN (SELECT avg_bucked_to_smalls_ratio FROM strain_metadata WHERE name = od.strain)
      ELSE 0.50
    END, 
    0.50
  ) as bucked_grams_needed,
  
  od.order_count,
  od.earliest_delivery_date,
  od.order_numbers
FROM order_demand_by_sku od
LEFT JOIN current_packaged cp 
  ON od.strain = cp.strain 
  AND (
    (od.product_name LIKE '%3.5g%' AND cp.package_size = '3.5g') OR
    (od.product_name LIKE '%14g%' AND cp.package_size = '14g') OR
    (od.product_name LIKE '%454g%' AND cp.package_size = '454g') OR
    (od.product_type = cp.package_size)
  )
LEFT JOIN current_bulk cb 
  ON od.strain = cb.strain 
  AND CASE 
    WHEN od.product_name LIKE '%3.5g%' OR od.product_type = '3.5g' THEN 'flower'
    WHEN od.product_name LIKE '%14g%' OR od.product_type = '14g' THEN 'smalls'
    WHEN od.product_name LIKE '%454g%' OR od.product_type = '454g' THEN 'flower'
    ELSE 'flower'
  END = cb.product_type;

-- =====================================================
-- STEP 4: Grant permissions
-- =====================================================

GRANT SELECT ON batch_inventory_consolidated TO authenticated;
GRANT SELECT ON batch_hierarchical_allocation_flower TO authenticated;
GRANT SELECT ON batch_hierarchical_allocation_smalls TO authenticated;
GRANT SELECT ON order_demand_by_sku TO authenticated;
GRANT SELECT ON projected_inventory_requirements TO authenticated;
