/*
  # Fix Batch Selection View to Use Inventory Items

  ## Overview
  This migration updates the batch_selection_options view to use inventory_items.batch
  instead of batch_registry, since the actual batch data lives in inventory_items.

  ## Changes

  1. **Updated View: batch_selection_options**
     - Now queries from inventory_items grouped by batch
     - Shows one row per unique batch (not per package/product)
     - Includes strain, current stages available, and total available weight
     - Only shows batches with available inventory

  ## Purpose
  Fix the batch assignment dropdown to show actual batches from inventory_items,
  with one line per unique batch ID instead of multiple lines per package.
*/

-- Drop the existing view
DROP VIEW IF EXISTS batch_selection_options;

-- Create new view based on inventory_items
CREATE OR REPLACE VIEW batch_selection_options AS
WITH batch_summary AS (
  SELECT 
    batch as batch_id,
    strain,
    -- Aggregate all unique product stages for this batch
    string_agg(DISTINCT 
      CASE 
        WHEN product_name ILIKE '%packaged%' OR product_name ILIKE '%8th%' OR product_name ILIKE '%3.5%' THEN 'packaged'
        WHEN product_name ILIKE '%bulk%flower%' THEN 'bulk_flower'
        WHEN product_name ILIKE '%bulk%small%' THEN 'bulk_smalls'
        WHEN product_name ILIKE '%bulk%trim%' THEN 'bulk_trim'
        WHEN product_name ILIKE '%bucked%' THEN 'bucked'
        ELSE 'other'
      END, ', '
    ) as available_stages,
    SUM(available_qty) as total_available_weight_grams,
    MAX(created_at) as last_updated
  FROM inventory_items
  WHERE 
    batch IS NOT NULL 
    AND available_qty > 0
  GROUP BY batch, strain
)
SELECT 
  batch_id,
  batch_id as batch_number,  -- Using batch_id as batch_number for compatibility
  strain,
  available_stages as current_stage,
  total_available_weight_grams,
  'active' as status,
  last_updated as created_at,
  last_updated as updated_at
FROM batch_summary
ORDER BY batch_id DESC;

-- Grant access to authenticated users
GRANT SELECT ON batch_selection_options TO authenticated;

-- Add comment
COMMENT ON VIEW batch_selection_options IS 
'Simplified batch selection view showing unique batches from inventory_items. One row per batch with aggregated stage information.';
