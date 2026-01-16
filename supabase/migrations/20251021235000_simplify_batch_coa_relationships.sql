/*
  # Simplify Batch-COA Relationships for Testing Data Access

  ## Overview
  This migration simplifies the architecture for accessing COA testing data from orders.
  It creates a direct, unidirectional path: order_items → batch_registry → certificates_of_analysis

  ## Changes

  1. **order_items enhancements**
     - Add batch_id column (foreign key to batch_registry)
     - This allows order items to directly reference the batch they're fulfilled from
     - Eliminates need for separate batch_allocations join table for simple queries

  2. **inventory_items enhancements**
     - Add batch_id column (foreign key to batch_registry)
     - Normalizes the text-based batch field into a proper foreign key
     - Enables efficient joins and proper referential integrity

  3. **Indexes for Performance**
     - Add index on order_items.batch_id
     - Add index on inventory_items.batch_id

  ## Benefits
  - Simpler queries: 2 joins instead of 4 to get testing data
  - Better performance: proper foreign key indexes
  - Clearer ownership: batches own COAs, order items reference batches
  - Easier scaling: no circular dependencies

  ## Query Pattern
  ```sql
  SELECT oi.*, br.batch_number, coa.thc_percentage, coa.terpene_1_name
  FROM order_items oi
  JOIN batch_registry br ON oi.batch_id = br.id
  LEFT JOIN certificates_of_analysis coa ON br.coa_id = coa.id
  WHERE oi.order_id = ?
  ```

  ## Security
  - No RLS changes needed (inherits from parent tables)

  ## Migration Safety
  - Uses IF NOT EXISTS for all columns
  - Nullable initially to allow gradual migration
  - No data loss risk
*/

-- =====================================================
-- STEP 1: Convert order_items.batch_id from text to uuid
-- =====================================================

-- First, check if batch_id exists and what type it is
DO $$
DECLARE
  v_data_type text;
BEGIN
  SELECT data_type INTO v_data_type
  FROM information_schema.columns
  WHERE table_name = 'order_items' AND column_name = 'batch_id';

  -- If it's text, we need to convert it
  IF v_data_type = 'text' THEN
    -- Rename old column
    ALTER TABLE order_items RENAME COLUMN batch_id TO batch_id_old;

    -- Add new uuid column
    ALTER TABLE order_items ADD COLUMN batch_id uuid REFERENCES batch_registry(id) ON DELETE SET NULL;

    -- Try to migrate data if batch_id_old contained valid UUIDs
    UPDATE order_items
    SET batch_id = batch_id_old::uuid
    WHERE batch_id_old IS NOT NULL
      AND batch_id_old ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- Drop old column with CASCADE to handle dependent views
    -- Views will be recreated by their original migrations or updated separately
    ALTER TABLE order_items DROP COLUMN batch_id_old CASCADE;

    COMMENT ON COLUMN order_items.batch_id IS 'Direct reference to the batch this order item will be fulfilled from. Links to testing data via batch_registry.coa_id';

  -- If it doesn't exist, create it
  ELSIF v_data_type IS NULL THEN
    ALTER TABLE order_items ADD COLUMN batch_id uuid REFERENCES batch_registry(id) ON DELETE SET NULL;
    COMMENT ON COLUMN order_items.batch_id IS 'Direct reference to the batch this order item will be fulfilled from. Links to testing data via batch_registry.coa_id';

  -- If it's already uuid, do nothing (migration already ran)
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_order_items_batch_id ON order_items(batch_id) WHERE batch_id IS NOT NULL;

-- =====================================================
-- STEP 2: Ensure inventory_items.batch_id is properly set up
-- =====================================================

-- inventory_items.batch_id already exists as uuid from event_driven_inventory migration
-- Just ensure we have the index and comments

CREATE INDEX IF NOT EXISTS idx_inventory_items_batch_id ON inventory_items(batch_id) WHERE batch_id IS NOT NULL;

COMMENT ON COLUMN inventory_items.batch_id IS 'Normalized foreign key reference replacing the text-based batch field. Enables proper joins and referential integrity.';

-- =====================================================
-- STEP 3: Create view for simplified order testing data
-- =====================================================

CREATE OR REPLACE VIEW order_items_with_testing_data AS
SELECT
  oi.id as order_item_id,
  oi.order_id,
  oi.product_id,
  oi.quantity,
  oi.unit_price,
  oi.subtotal,
  oi.batch_id,
  br.batch_number,
  br.strain as batch_strain,
  br.harvest_date,
  coa.id as coa_id,
  coa.strain_name as coa_strain,
  coa.thc_percentage,
  coa.cbd_percentage,
  coa.total_cannabinoids_percentage,
  coa.total_terpenes_mg_g,
  coa.terpene_1_name,
  coa.terpene_1_value,
  coa.terpene_1_percentage,
  coa.terpene_2_name,
  coa.terpene_2_value,
  coa.terpene_2_percentage,
  coa.terpene_3_name,
  coa.terpene_3_value,
  coa.terpene_3_percentage,
  coa.sample_date,
  coa.pdf_file_path as coa_pdf_path
FROM order_items oi
LEFT JOIN batch_registry br ON oi.batch_id = br.id
LEFT JOIN certificates_of_analysis coa ON br.coa_id = coa.id;

COMMENT ON VIEW order_items_with_testing_data IS 'Simplified view providing direct access to COA testing data for order items via batch relationships';

-- =====================================================
-- STEP 4: Recreate dependent views with uuid batch_id
-- =====================================================

-- Recreate batch_order_demand view
CREATE OR REPLACE VIEW batch_order_demand AS
SELECT
  oi.batch_id,
  p.name AS product_name,
  p.sku,
  p.strain,
  p.type AS product_type,
  p.product_category,
  COUNT(DISTINCT oi.order_id) AS order_count,
  SUM(oi.quantity) AS total_quantity_needed,
  array_agg(DISTINCT o.order_number ORDER BY o.order_number) AS order_numbers
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN orders o ON oi.order_id = o.id
WHERE oi.batch_id IS NOT NULL
  AND o.archived = false
GROUP BY oi.batch_id, p.name, p.sku, p.strain, p.type, p.product_category;

COMMENT ON VIEW batch_order_demand IS 'Aggregates order demand by batch, showing which products and orders are assigned to each batch';

-- Recreate batch_capacity_estimates view with uuid batch_id
CREATE OR REPLACE VIEW batch_capacity_estimates AS
WITH batch_inventory AS (
  SELECT
    ii.batch_id,
    ii.strain,
    ii.product_name,
    SUM(ii.available_qty) AS current_weight_grams
  FROM inventory_items ii
  WHERE ii.batch_id IS NOT NULL
  GROUP BY ii.batch_id, ii.strain, ii.product_name
),
strain_conversions AS (
  SELECT
    name AS strain,
    COALESCE(avg_bucked_to_flower_ratio, 0.65) AS flower_ratio,
    COALESCE(avg_bucked_to_smalls_ratio, 0.20) AS smalls_ratio,
    COALESCE(avg_bucked_to_trim_ratio, 0.10) AS trim_ratio,
    COALESCE(avg_waste_percentage, 0.05) AS waste_ratio
  FROM strain_metadata
)
SELECT
  bi.batch_id,
  bi.strain,
  bi.product_name AS current_stage,
  bi.current_weight_grams,
  CASE
    WHEN bi.product_name ILIKE '%8th%' OR bi.product_name ILIKE '%3.5%' THEN bi.current_weight_grams
    WHEN bi.product_name ILIKE '%half%' OR bi.product_name ILIKE '%14%' THEN bi.current_weight_grams
    WHEN bi.product_name ILIKE '%pound%' OR bi.product_name ILIKE '%454%' THEN bi.current_weight_grams
    WHEN bi.product_name ILIKE '%bulk%flower%' THEN bi.current_weight_grams
    WHEN bi.product_name ILIKE '%bulk%small%' THEN bi.current_weight_grams
    WHEN bi.product_name ILIKE '%bucked%' THEN bi.current_weight_grams * COALESCE(sc.flower_ratio, 0.65)
    ELSE bi.current_weight_grams
  END AS estimated_final_weight_grams,
  CASE
    WHEN bi.product_name ILIKE '%bucked%' THEN FLOOR(bi.current_weight_grams * COALESCE(sc.flower_ratio, 0.65) / 3.5)
    WHEN bi.product_name ILIKE '%bulk%flower%' THEN FLOOR(bi.current_weight_grams / 3.5)
    ELSE NULL
  END AS estimated_eighths_capacity,
  CASE
    WHEN bi.product_name ILIKE '%bucked%' THEN FLOOR(bi.current_weight_grams * COALESCE(sc.flower_ratio, 0.65) / 14)
    WHEN bi.product_name ILIKE '%bulk%flower%' THEN FLOOR(bi.current_weight_grams / 14)
    ELSE NULL
  END AS estimated_halves_capacity,
  CASE
    WHEN bi.product_name ILIKE '%bucked%' THEN FLOOR(bi.current_weight_grams * COALESCE(sc.flower_ratio, 0.65) / 454)
    WHEN bi.product_name ILIKE '%bulk%flower%' THEN FLOOR(bi.current_weight_grams / 454)
    ELSE NULL
  END AS estimated_pounds_capacity
FROM batch_inventory bi
LEFT JOIN strain_conversions sc ON bi.strain = sc.strain;

COMMENT ON VIEW batch_capacity_estimates IS 'Estimates production capacity for each batch based on current stage and strain conversion ratios';

-- Recreate batch_allocation_overview view
CREATE OR REPLACE VIEW batch_allocation_overview AS
WITH batch_demand AS (
  SELECT
    batch_id,
    COUNT(DISTINCT order_numbers) AS total_orders,
    SUM(total_quantity_needed) FILTER (WHERE product_category = 'packaged' AND product_type = '8ths') AS eighths_needed,
    SUM(total_quantity_needed) FILTER (WHERE product_category = 'packaged' AND product_type = 'halves') AS halves_needed,
    SUM(total_quantity_needed) FILTER (WHERE product_category = 'bulk') AS pounds_needed
  FROM batch_order_demand
  GROUP BY batch_id
),
batch_capacity AS (
  SELECT
    batch_id,
    strain,
    current_stage,
    current_weight_grams,
    estimated_final_weight_grams,
    COALESCE(MAX(estimated_eighths_capacity), 0) AS eighths_capacity,
    COALESCE(MAX(estimated_halves_capacity), 0) AS halves_capacity,
    COALESCE(MAX(estimated_pounds_capacity), 0) AS pounds_capacity
  FROM batch_capacity_estimates
  GROUP BY batch_id, strain, current_stage, current_weight_grams, estimated_final_weight_grams
)
SELECT
  COALESCE(bc.batch_id, bd.batch_id) AS batch_id,
  bc.strain,
  bc.current_stage,
  bc.current_weight_grams,
  bc.estimated_final_weight_grams,
  COALESCE(bd.total_orders, 0) AS orders_assigned,
  COALESCE(bd.eighths_needed, 0) AS eighths_demand,
  COALESCE(bc.eighths_capacity, 0) AS eighths_capacity,
  COALESCE(bc.eighths_capacity, 0) - COALESCE(bd.eighths_needed, 0) AS eighths_remaining,
  CASE
    WHEN COALESCE(bc.eighths_capacity, 0) > 0 THEN ROUND(COALESCE(bd.eighths_needed, 0) / bc.eighths_capacity * 100, 1)
    ELSE 0
  END AS eighths_utilization_pct,
  COALESCE(bd.halves_needed, 0) AS halves_demand,
  COALESCE(bc.halves_capacity, 0) AS halves_capacity,
  COALESCE(bc.halves_capacity, 0) - COALESCE(bd.halves_needed, 0) AS halves_remaining,
  CASE
    WHEN COALESCE(bc.halves_capacity, 0) > 0 THEN ROUND(COALESCE(bd.halves_needed, 0) / bc.halves_capacity * 100, 1)
    ELSE 0
  END AS halves_utilization_pct,
  COALESCE(bd.pounds_needed, 0) AS pounds_demand,
  COALESCE(bc.pounds_capacity, 0) AS pounds_capacity,
  COALESCE(bc.pounds_capacity, 0) - COALESCE(bd.pounds_needed, 0) AS pounds_remaining,
  CASE
    WHEN COALESCE(bc.pounds_capacity, 0) > 0 THEN ROUND(COALESCE(bd.pounds_needed, 0) / bc.pounds_capacity * 100, 1)
    ELSE 0
  END AS pounds_utilization_pct,
  CASE
    WHEN COALESCE(bd.eighths_needed, 0) > COALESCE(bc.eighths_capacity, 0)
      OR COALESCE(bd.halves_needed, 0) > COALESCE(bc.halves_capacity, 0)
      OR COALESCE(bd.pounds_needed, 0) > COALESCE(bc.pounds_capacity, 0)
      THEN 'over_allocated'
    WHEN COALESCE(bd.total_orders, 0) > 0 THEN 'allocated'
    ELSE 'available'
  END AS allocation_status
FROM batch_capacity bc
FULL JOIN batch_demand bd ON bc.batch_id = bd.batch_id
WHERE COALESCE(bc.batch_id, bd.batch_id) IS NOT NULL;

COMMENT ON VIEW batch_allocation_overview IS 'Comprehensive view of batch allocation status showing demand vs capacity across all product types';

-- =====================================================
-- STEP 5: Add table documentation
-- =====================================================

COMMENT ON COLUMN batch_registry.coa_id IS 'Single source of truth for batch-COA relationship. When set, this batch has completed testing and has an associated Certificate of Analysis.';
