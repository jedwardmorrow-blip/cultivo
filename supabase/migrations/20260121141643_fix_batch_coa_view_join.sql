/*
  # Fix Batch-COA View Join Logic

  ## Problem
  The `batch_with_coa_status` view was using an incorrect join condition:
  - Old: `LEFT JOIN certificates_of_analysis coa ON br.coa_id = coa.id`
  - Issue: `batch_registry.coa_id` field was not being populated by COA upload functions
  - Result: View showed "NO COA" even when COA existed with valid `batch_id` FK

  ## Solution
  1. Update view to use canonical relationship: `coa.batch_id → br.id`
  2. Backfill `batch_registry.coa_id` for existing batches with active COAs
  3. This ensures both UI view and direct queries work correctly

  ## Why This Fix
  - `certificates_of_analysis.batch_id` is the canonical FK (enforced by GAP-009 constraint)
  - Packaging validation already uses this relationship correctly
  - View should match the same relationship direction
  - Backfill ensures backward compatibility with any legacy code

  ## Changes
  1. Updated View
     - Now joins on `coa.batch_id = br.id AND coa.is_active = true`
     - Only shows active COAs (matches GAP-009 constraint)

  2. Data Backfill
     - Updates `batch_registry.coa_id` for all batches with active COAs
     - Ensures bidirectional sync for existing data

  ## Related
  - Issue: Batch 251105-SWF showed "NO COA" despite successful upload
  - Constraint: `certificates_of_analysis_unique_active_per_batch` (GAP-009)
  - Sessions: SESSION-2026-01-22-COA-REPLACE-WORKFLOW.md
*/

-- Step 1: Drop existing view
DROP VIEW IF EXISTS batch_with_coa_status;

-- Step 2: Recreate view with corrected join logic
CREATE OR REPLACE VIEW batch_with_coa_status AS
SELECT
  br.id as batch_id,
  br.batch_number,
  br.strain,
  br.harvest_date,
  br.room,
  br.initial_weight_grams,
  br.status as batch_status,
  br.notes as batch_notes,

  -- COA Information (now joined via canonical batch_id FK)
  coa.id as coa_id,
  coa.thc_percentage,
  coa.cbd_percentage,
  coa.total_cannabinoids_percentage,
  coa.total_terpenes_mg_g,
  coa.sample_date,
  coa.manufacture_date,
  coa.terpene_1_name,
  coa.terpene_1_value,
  coa.terpene_1_percentage,
  coa.terpene_2_name,
  coa.terpene_2_value,
  coa.terpene_2_percentage,
  coa.terpene_3_name,
  coa.terpene_3_value,
  coa.terpene_3_percentage,
  coa.pdf_file_path,
  coa.is_active as coa_is_active,

  CASE
    WHEN coa.id IS NOT NULL AND coa.is_active THEN 'active'
    WHEN coa.id IS NOT NULL AND NOT coa.is_active THEN 'inactive'
    ELSE 'missing'
  END as coa_status,

  br.created_at,
  br.updated_at

FROM batch_registry br
-- FIXED: Join on canonical batch_id FK instead of legacy coa_id field
-- This matches how packaging validation queries COAs (by batch_id)
LEFT JOIN certificates_of_analysis coa
  ON coa.batch_id = br.id
  AND coa.is_active = true;

-- Step 3: Backfill batch_registry.coa_id for existing batches with active COAs
-- This ensures backward compatibility with any code still using br.coa_id
UPDATE batch_registry br
SET coa_id = coa.id
FROM certificates_of_analysis coa
WHERE coa.batch_id = br.id
  AND coa.is_active = true
  AND br.coa_id IS NULL;

-- Add comment explaining canonical relationship
COMMENT ON VIEW batch_with_coa_status IS
'Batch COA status view - joins on certificates_of_analysis.batch_id (canonical FK) instead of batch_registry.coa_id (legacy field synced for backward compatibility)';
