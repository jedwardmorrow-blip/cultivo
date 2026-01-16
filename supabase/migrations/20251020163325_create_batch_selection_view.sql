/*
  # Create Batch Selection View for Order Assignment

  ## Overview
  This migration creates a simplified view for batch selection in order assignment.
  It shows only unique batches (not individual package IDs) with relevant information.

  ## Changes

  1. **New View: batch_selection_options**
     - Returns unique batch records suitable for dropdown selection
     - Includes: batch_id, batch_number, strain, status, lifecycle_state
     - Filters to show only active batches (not depleted or archived)
     - Joins with batch_stage_tracking to show current available stages

  ## Purpose
  Simplifies the batch assignment UI by showing one line per batch instead of
  listing every package ID within each batch. Users select a batch ID, and the
  system can then query all associated packages via batch_package_lineage.

  ## Security
  - View inherits RLS from underlying tables
  - Accessible to authenticated users only
*/

-- Drop existing view if it exists
DROP VIEW IF EXISTS batch_selection_options;

-- Create view for batch selection in order items
CREATE OR REPLACE VIEW batch_selection_options AS
SELECT DISTINCT
  br.id as batch_id,
  br.batch_number,
  br.strain,
  br.status,
  br.lifecycle_state,
  br.harvest_date,
  br.created_at,
  br.updated_at,
  -- Get the most recent/current stage with available inventory
  COALESCE(
    (SELECT bst.stage 
     FROM batch_stage_tracking bst 
     WHERE bst.batch_id = br.id 
       AND bst.available_weight_grams > 0
     ORDER BY 
       CASE bst.stage
         WHEN 'packaged' THEN 1
         WHEN 'bulk_flower' THEN 2
         WHEN 'bulk_smalls' THEN 3
         WHEN 'bucked' THEN 4
         ELSE 5
       END
     LIMIT 1),
    'unknown'
  ) as current_stage,
  -- Calculate total available weight across all stages
  COALESCE(
    (SELECT SUM(bst.available_weight_grams)
     FROM batch_stage_tracking bst
     WHERE bst.batch_id = br.id),
    0
  ) as total_available_weight_grams
FROM batch_registry br
WHERE 
  -- Only show active batches that are not depleted or archived
  br.status IN ('active', 'quarantine')
  AND (br.lifecycle_state IS NULL OR br.lifecycle_state NOT IN ('depleted', 'archived'))
  -- Only show batches that have some available inventory
  AND EXISTS (
    SELECT 1 
    FROM batch_stage_tracking bst 
    WHERE bst.batch_id = br.id 
      AND bst.available_weight_grams > 0
  )
ORDER BY br.batch_number DESC;

-- Grant access to authenticated users
GRANT SELECT ON batch_selection_options TO authenticated;

-- Add helpful comment
COMMENT ON VIEW batch_selection_options IS 
'Simplified view for batch selection in order assignment. Shows one row per batch with current stage and availability.';
