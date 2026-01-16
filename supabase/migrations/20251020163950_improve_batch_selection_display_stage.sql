/*
  # Improve Batch Selection View Display

  ## Overview
  This migration improves the batch_selection_options view to show the
  most relevant current stage instead of all stages comma-separated.

  ## Changes

  1. **Updated View: batch_selection_options**
     - Prioritizes showing the most processed stage (packaged > bulk > bucked)
     - Cleaner display in the dropdown UI
     - Maintains all data needed for batch selection
*/

-- Drop the existing view
DROP VIEW IF EXISTS batch_selection_options;

-- Create improved view with prioritized stage display
CREATE OR REPLACE VIEW batch_selection_options AS
WITH batch_summary AS (
  SELECT 
    batch as batch_id,
    strain,
    -- Determine the most advanced stage available (prioritize more processed stages)
    CASE 
      WHEN bool_or(product_name ILIKE '%packaged%' OR product_name ILIKE '%8th%' OR product_name ILIKE '%3.5%' OR product_name ILIKE '%14g%' OR product_name ILIKE '%half%') 
        THEN 'packaged'
      WHEN bool_or(product_name ILIKE '%bulk%flower%') 
        THEN 'bulk_flower'
      WHEN bool_or(product_name ILIKE '%bulk%small%') 
        THEN 'bulk_smalls'
      WHEN bool_or(product_name ILIKE '%bulk%trim%') 
        THEN 'bulk_trim'
      WHEN bool_or(product_name ILIKE '%bucked%') 
        THEN 'bucked'
      ELSE 'available'
    END as current_stage,
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
  batch_id as batch_number,
  strain,
  current_stage,
  total_available_weight_grams,
  'active' as status,
  last_updated as created_at,
  last_updated as updated_at
FROM batch_summary
WHERE total_available_weight_grams > 0
ORDER BY batch_id DESC;

-- Grant access to authenticated users
GRANT SELECT ON batch_selection_options TO authenticated;

-- Add comment
COMMENT ON VIEW batch_selection_options IS 
'Simplified batch selection view showing unique batches from inventory_items with prioritized stage display (packaged > bulk > bucked). One row per batch.';
