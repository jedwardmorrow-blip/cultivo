/*
  # Create Batch Management Views and Functions

  ## Overview
  This migration creates database views and functions that provide intelligent
  batch allocation tracking, over-allocation warnings, and projection calculations.

  ## 1. Views

  ### batch_allocation_summary
  Shows allocation status for each batch including over-allocation warnings

  ### batch_with_coa_status
  Joins batches with their COA information for easy lookup

  ### batch_stage_allocation_status
  Shows allocation status at each stage for every batch

  ## 2. Functions

  ### calculate_batch_projection
  Calculates projected weight for a batch moving between stages

  ### check_batch_over_allocation
  Returns over-allocation percentage for a batch at a specific stage

  ### get_batch_coa_data
  Retrieves COA information for a batch

  ### validate_label_coa_requirement
  Checks if a label can be generated based on COA requirements
*/

-- View: batch_allocation_summary
-- Provides comprehensive allocation tracking per batch
CREATE OR REPLACE VIEW batch_allocation_summary AS
SELECT 
  br.id as batch_id,
  br.batch_number,
  br.strain,
  br.harvest_date,
  br.status as batch_status,
  br.coa_id,
  CASE 
    WHEN br.coa_id IS NOT NULL THEN 'active'
    ELSE 'missing'
  END as coa_status,
  
  -- Stage-specific allocation data
  bst_bucked.weight_grams as bucked_weight,
  bst_bucked.allocated_weight_grams as bucked_allocated,
  bst_bucked.available_weight_grams as bucked_available,
  
  bst_flower.weight_grams as flower_weight,
  bst_flower.allocated_weight_grams as flower_allocated,
  bst_flower.available_weight_grams as flower_available,
  
  bst_smalls.weight_grams as smalls_weight,
  bst_smalls.allocated_weight_grams as smalls_allocated,
  bst_smalls.available_weight_grams as smalls_available,
  
  bst_packaged.weight_grams as packaged_weight,
  bst_packaged.allocated_weight_grams as packaged_allocated,
  bst_packaged.available_weight_grams as packaged_available,
  
  -- Calculate total allocation across all stages
  COALESCE(bst_bucked.weight_grams, 0) + 
  COALESCE(bst_flower.weight_grams, 0) + 
  COALESCE(bst_smalls.weight_grams, 0) + 
  COALESCE(bst_packaged.weight_grams, 0) as total_weight,
  
  COALESCE(bst_bucked.allocated_weight_grams, 0) + 
  COALESCE(bst_flower.allocated_weight_grams, 0) + 
  COALESCE(bst_smalls.allocated_weight_grams, 0) + 
  COALESCE(bst_packaged.allocated_weight_grams, 0) as total_allocated,
  
  -- Calculate allocation percentage
  CASE 
    WHEN (COALESCE(bst_bucked.weight_grams, 0) + COALESCE(bst_flower.weight_grams, 0) + 
          COALESCE(bst_smalls.weight_grams, 0) + COALESCE(bst_packaged.weight_grams, 0)) > 0
    THEN ROUND(
      ((COALESCE(bst_bucked.allocated_weight_grams, 0) + 
        COALESCE(bst_flower.allocated_weight_grams, 0) + 
        COALESCE(bst_smalls.allocated_weight_grams, 0) + 
        COALESCE(bst_packaged.allocated_weight_grams, 0)) / 
       (COALESCE(bst_bucked.weight_grams, 0) + COALESCE(bst_flower.weight_grams, 0) + 
        COALESCE(bst_smalls.weight_grams, 0) + COALESCE(bst_packaged.weight_grams, 0))) * 100, 2)
    ELSE 0
  END as allocation_percentage,
  
  -- Strain-specific thresholds
  sm.over_allocation_warning_threshold,
  sm.over_allocation_critical_threshold,
  
  br.created_at,
  br.updated_at

FROM batch_registry br
LEFT JOIN batch_stage_tracking bst_bucked ON br.id = bst_bucked.batch_id AND bst_bucked.stage = 'bucked'
LEFT JOIN batch_stage_tracking bst_flower ON br.id = bst_flower.batch_id AND bst_flower.stage = 'bulk_flower'
LEFT JOIN batch_stage_tracking bst_smalls ON br.id = bst_smalls.batch_id AND bst_smalls.stage = 'bulk_smalls'
LEFT JOIN batch_stage_tracking bst_packaged ON br.id = bst_packaged.batch_id AND bst_packaged.stage = 'packaged'
LEFT JOIN strain_metadata sm ON br.strain = sm.name;

-- View: batch_with_coa_status
-- Joins batch data with COA information
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
  
  -- COA Information
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
LEFT JOIN certificates_of_analysis coa ON br.coa_id = coa.id;

-- View: batch_stage_allocation_status
-- Detailed allocation status per batch and stage
CREATE OR REPLACE VIEW batch_stage_allocation_status AS
SELECT 
  bst.id,
  bst.batch_id,
  br.batch_number,
  br.strain,
  bst.stage,
  bst.weight_grams,
  bst.allocated_weight_grams,
  bst.available_weight_grams,
  bst.location,
  
  -- Calculate allocation percentage for this stage
  CASE 
    WHEN bst.weight_grams > 0 
    THEN ROUND((bst.allocated_weight_grams / bst.weight_grams) * 100, 2)
    ELSE 0
  END as stage_allocation_percentage,
  
  -- Check if over-allocated
  CASE 
    WHEN bst.allocated_weight_grams > bst.weight_grams THEN true
    ELSE false
  END as is_over_allocated,
  
  -- Over-allocation amount
  CASE 
    WHEN bst.allocated_weight_grams > bst.weight_grams 
    THEN bst.allocated_weight_grams - bst.weight_grams
    ELSE 0
  END as over_allocation_grams,
  
  -- Warning level
  CASE 
    WHEN bst.weight_grams > 0 THEN
      CASE 
        WHEN (bst.allocated_weight_grams / bst.weight_grams * 100) >= sm.over_allocation_critical_threshold THEN 'critical'
        WHEN (bst.allocated_weight_grams / bst.weight_grams * 100) >= sm.over_allocation_warning_threshold THEN 'warning'
        ELSE 'normal'
      END
    ELSE 'normal'
  END as allocation_warning_level,
  
  sm.over_allocation_warning_threshold,
  sm.over_allocation_critical_threshold,
  
  bst.created_at,
  bst.updated_at

FROM batch_stage_tracking bst
INNER JOIN batch_registry br ON bst.batch_id = br.id
LEFT JOIN strain_metadata sm ON br.strain = sm.name;

-- Function: calculate_batch_projection
-- Calculates projected weight for batch moving between stages
CREATE OR REPLACE FUNCTION calculate_batch_projection(
  p_strain text,
  p_source_stage text,
  p_source_weight numeric,
  p_target_stage text
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_projection numeric;
  v_flower_ratio numeric;
  v_smalls_ratio numeric;
  v_trim_ratio numeric;
BEGIN
  -- Get strain conversion ratios
  SELECT 
    avg_bucked_to_flower_ratio,
    avg_bucked_to_smalls_ratio,
    avg_bucked_to_trim_ratio
  INTO 
    v_flower_ratio,
    v_smalls_ratio,
    v_trim_ratio
  FROM strain_metadata
  WHERE name = p_strain;
  
  -- Default ratios if strain not found
  IF v_flower_ratio IS NULL THEN
    v_flower_ratio := 0.50;
    v_smalls_ratio := 0.25;
    v_trim_ratio := 0.20;
  END IF;
  
  -- Calculate projection based on stage transition
  IF p_source_stage = 'bucked' THEN
    IF p_target_stage = 'bulk_flower' THEN
      v_projection := p_source_weight * v_flower_ratio;
    ELSIF p_target_stage = 'bulk_smalls' THEN
      v_projection := p_source_weight * v_smalls_ratio;
    ELSIF p_target_stage = 'bulk_trim' THEN
      v_projection := p_source_weight * v_trim_ratio;
    ELSIF p_target_stage = 'packaged' THEN
      -- Assume packaged is flower with 7% overage
      v_projection := p_source_weight * v_flower_ratio * 1.07;
    ELSE
      v_projection := p_source_weight;
    END IF;
  ELSIF p_source_stage LIKE 'bulk_%' AND p_target_stage = 'packaged' THEN
    -- Bulk to packaged assumes 7% overage for packaging
    v_projection := p_source_weight * 1.07;
  ELSE
    -- Default: no conversion
    v_projection := p_source_weight;
  END IF;
  
  RETURN ROUND(v_projection, 2);
END;
$$;

-- Function: check_batch_over_allocation
-- Returns over-allocation percentage for a batch at a specific stage
CREATE OR REPLACE FUNCTION check_batch_over_allocation(
  p_batch_id uuid,
  p_stage text DEFAULT NULL
)
RETURNS TABLE (
  stage text,
  weight_grams numeric,
  allocated_grams numeric,
  available_grams numeric,
  allocation_percentage numeric,
  warning_level text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bsas.stage,
    bsas.weight_grams,
    bsas.allocated_weight_grams,
    bsas.available_weight_grams,
    bsas.stage_allocation_percentage,
    bsas.allocation_warning_level
  FROM batch_stage_allocation_status bsas
  WHERE bsas.batch_id = p_batch_id
    AND (p_stage IS NULL OR bsas.stage = p_stage)
  ORDER BY 
    CASE bsas.stage
      WHEN 'bucked' THEN 1
      WHEN 'bulk_flower' THEN 2
      WHEN 'bulk_smalls' THEN 3
      WHEN 'bulk_trim' THEN 4
      WHEN 'packaged' THEN 5
    END;
END;
$$;

-- Function: get_batch_coa_data
-- Retrieves COA information for a batch
CREATE OR REPLACE FUNCTION get_batch_coa_data(p_batch_number text)
RETURNS TABLE (
  batch_number text,
  strain text,
  harvest_date date,
  thc_percentage numeric,
  cbd_percentage numeric,
  total_cannabinoids numeric,
  total_terpenes numeric,
  coa_status text,
  coa_pdf_path text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bcoa.batch_number,
    bcoa.strain,
    bcoa.harvest_date,
    bcoa.thc_percentage,
    bcoa.cbd_percentage,
    bcoa.total_cannabinoids_percentage,
    bcoa.total_terpenes_mg_g,
    bcoa.coa_status,
    bcoa.pdf_file_path
  FROM batch_with_coa_status bcoa
  WHERE bcoa.batch_number = p_batch_number;
END;
$$;

-- Function: validate_label_coa_requirement
-- Checks if a label can be generated based on COA requirements
CREATE OR REPLACE FUNCTION validate_label_coa_requirement(
  p_batch_number text,
  p_label_type_code text
)
RETURNS TABLE (
  can_generate boolean,
  message text,
  has_coa boolean,
  requires_coa boolean
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_coa boolean;
  v_requires_coa boolean;
  v_can_generate boolean;
  v_message text;
BEGIN
  -- Check if label type requires COA
  SELECT lt.requires_coa
  INTO v_requires_coa
  FROM label_types lt
  WHERE lt.code = p_label_type_code;
  
  IF v_requires_coa IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid label type', false, false;
    RETURN;
  END IF;
  
  -- Check if batch has COA
  SELECT (coa_id IS NOT NULL AND coa_status = 'active')
  INTO v_has_coa
  FROM batch_with_coa_status
  WHERE batch_with_coa_status.batch_number = p_batch_number;
  
  IF v_has_coa IS NULL THEN
    RETURN QUERY SELECT false, 'Batch not found', false, v_requires_coa;
    RETURN;
  END IF;
  
  -- Determine if can generate
  IF v_requires_coa AND NOT v_has_coa THEN
    v_can_generate := false;
    v_message := 'COA required but not found for batch ' || p_batch_number;
  ELSE
    v_can_generate := true;
    v_message := 'Label can be generated';
  END IF;
  
  RETURN QUERY SELECT v_can_generate, v_message, v_has_coa, v_requires_coa;
END;
$$;

-- Create RLS policies for views (they inherit from base tables)
-- Views don't need separate RLS policies as they use the underlying table policies
