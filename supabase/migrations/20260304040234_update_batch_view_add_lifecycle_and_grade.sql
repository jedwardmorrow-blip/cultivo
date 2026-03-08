/*
  # Update batch_with_coa_status view

  1. Changes
    - Added `lifecycle_state` column from batch_registry
    - Added `quality_grade_id` column from batch_registry
    - These columns are needed by the UI to:
      a) Filter batches into Active vs Archived tabs
      b) Display quality grade without unsafe type casts

  2. Notes
    - All existing columns are preserved
    - Join logic unchanged (canonical coa.batch_id FK)
*/

DROP VIEW IF EXISTS batch_with_coa_status;

CREATE OR REPLACE VIEW batch_with_coa_status AS
SELECT
  br.id as batch_id,
  br.batch_number,
  br.strain,
  br.harvest_date,
  br.room,
  br.initial_weight_grams,
  br.status as batch_status,
  br.lifecycle_state,
  br.quality_grade_id,
  br.notes as batch_notes,

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
LEFT JOIN certificates_of_analysis coa
  ON coa.batch_id = br.id
  AND coa.is_active = true;

COMMENT ON VIEW batch_with_coa_status IS
'Batch COA status view with lifecycle_state and quality_grade_id. Joins on certificates_of_analysis.batch_id (canonical FK).';