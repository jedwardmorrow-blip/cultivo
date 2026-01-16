/*
  # Create Conversion Views - Hybrid Architecture
  
  ## Overview
  This migration creates the missing database views and functions for the hybrid
  conversion architecture. The hybrid approach queries session outputs directly
  instead of maintaining separate conversion_lots tables.
  
  ## New Views
  
  1. **conversion_summary_view**
     - Shows all completed sessions grouped by batch+product+stage
     - Aggregates total output quantities from sessions
     - Used by ConversionsView component to display available conversions
     - Filters to only show sessions with status='completed'
  
  2. **conversion_history_view** (enhanced)
     - Shows all conversion packages with full lineage
     - Links to inventory_items to show finalization status
     - Includes batch and product details
  
  ## New Functions
  
  1. **get_conversion_lot_summary()**
     - Returns conversion summary with session details
     - Used by dashboard widgets
     - Replaces old function that referenced deleted tables
  
  ## Migration Notes
  - Drops old get_conversion_lot_summary that referenced conversion_lots
  - Creates views compatible with existing TypeScript interfaces
  - No data migration needed (views are just queries)
  
  ## Security
  - All views inherit RLS from underlying tables
  - Functions execute with caller's permissions
*/

-- =====================================================
-- DROP OLD OBJECTS
-- =====================================================

-- Drop old function that references deleted tables
DROP FUNCTION IF EXISTS get_conversion_lot_summary(DATE);

-- Drop old conversion_history_view if it exists and references wrong schema
DROP VIEW IF EXISTS conversion_history_view CASCADE;

-- =====================================================
-- VIEW 1: conversion_summary_view
-- =====================================================

-- This view shows completed sessions ready for package creation
-- Groups by batch, product, and stage to show available quantities
CREATE OR REPLACE VIEW conversion_summary_view AS
WITH completed_sessions AS (
  -- Trim sessions
  SELECT 
    ts.id as session_id,
    'trim' as session_type,
    ts.batch_registry_id as batch_id,
    ts.strain_id,
    (COALESCE(ts.big_buds_grams, 0) + COALESCE(ts.small_buds_grams, 0)) as output_weight,
    NULL::integer as output_units,
    ts.completed_at::date as session_date,
    ts.completed_at
  FROM trim_sessions ts
  WHERE ts.session_status = 'completed'
    AND ts.completed_at IS NOT NULL
    AND ts.batch_registry_id IS NOT NULL
  
  UNION ALL
  
  -- Packaging sessions  
  SELECT
    ps.id as session_id,
    'packaging' as session_type,
    ps.batch_registry_id as batch_id,
    ps.strain_id,
    NULL::numeric as output_weight,
    (COALESCE(ps.units_3_5g, 0) + COALESCE(ps.units_14g, 0) + COALESCE(ps.units_454g, 0))::integer as output_units,
    ps.completed_at::date as session_date,
    ps.completed_at
  FROM packaging_sessions ps
  WHERE ps.session_status = 'completed'
    AND ps.completed_at IS NOT NULL
    AND ps.batch_registry_id IS NOT NULL
  
  UNION ALL
  
  -- Bucking sessions (get strain_id via batch join)
  SELECT
    bs.id as session_id,
    'bucking' as session_type,
    bs.batch_registry_id as batch_id,
    br.strain_id,
    (COALESCE(bs.bucked_flower_grams, 0) + COALESCE(bs.bucked_smalls_grams, 0)) as output_weight,
    NULL::integer as output_units,
    bs.completed_at::date as session_date,
    bs.completed_at
  FROM bucking_sessions bs
  JOIN batch_registry br ON bs.batch_registry_id = br.id
  WHERE bs.session_status = 'completed'
    AND bs.completed_at IS NOT NULL
    AND bs.batch_registry_id IS NOT NULL
)
SELECT 
  cs.batch_id,
  br.batch_number as batch_name,
  cs.strain_id,
  s.name as strain_name,
  s.abbreviation as strain_code,
  cs.session_type,
  cs.session_id,
  cs.session_date,
  cs.output_weight as total_weight,
  cs.output_units as total_units,
  -- Check if packages already created from this session
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM conversion_packages cp 
      WHERE cp.source_session_ids @> jsonb_build_array(cs.session_id::text)
    ) THEN true 
    ELSE false 
  END as has_packages,
  -- Count packages created from this session
  COALESCE((
    SELECT COUNT(*) 
    FROM conversion_packages cp 
    WHERE cp.source_session_ids @> jsonb_build_array(cs.session_id::text)
  ), 0) as package_count,
  cs.completed_at
FROM completed_sessions cs
JOIN batch_registry br ON cs.batch_id = br.id
LEFT JOIN strains s ON cs.strain_id = s.id
WHERE cs.strain_id IS NOT NULL
ORDER BY cs.completed_at DESC, s.name ASC;

COMMENT ON VIEW conversion_summary_view IS 
'Hybrid architecture view: Shows completed sessions ready for package creation.
Replaces conversion_lots table with direct session queries.
Used by ConversionsView component and conversion workflow.
Migration: create_conversion_views_hybrid_architecture_v2.sql';

-- =====================================================
-- VIEW 2: conversion_history_view (enhanced)
-- =====================================================

CREATE OR REPLACE VIEW conversion_history_view AS
SELECT 
  cp.id,
  cp.package_id,
  cp.batch_id,
  br.batch_number as batch_name,
  br.strain_id,
  s.name as strain_name,
  cp.product_id,
  p.name as product_name,
  p.type as product_type,
  ps.name as stage_name,
  cp.weight,
  cp.units,
  cp.source_session_ids,
  cp.created_at,
  cp.created_by,
  up.full_name as created_by_name,
  cp.packaged_at,
  -- Check if finalized to inventory
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM inventory_items ii 
      WHERE ii.package_id = cp.package_id
    ) THEN true 
    ELSE false 
  END as is_finalized,
  -- Get inventory review status if exists
  (
    SELECT ii.review_status 
    FROM inventory_items ii 
    WHERE ii.package_id = cp.package_id 
    LIMIT 1
  ) as review_status
FROM conversion_packages cp
JOIN batch_registry br ON cp.batch_id = br.id
LEFT JOIN strains s ON br.strain_id = s.id
LEFT JOIN products p ON cp.product_id = p.id
LEFT JOIN product_stages ps ON cp.inventory_stage_id = ps.id
LEFT JOIN user_profiles up ON cp.created_by = up.id
ORDER BY cp.created_at DESC;

COMMENT ON VIEW conversion_history_view IS 
'Shows all conversion packages with lineage and finalization status.
Includes review workflow status from inventory_items.
Migration: create_conversion_views_hybrid_architecture_v2.sql';

-- =====================================================
-- FUNCTION: get_conversion_lot_summary
-- =====================================================

-- Recreate function to work with hybrid architecture
-- Returns summary data for dashboard widgets
CREATE OR REPLACE FUNCTION get_conversion_lot_summary(p_date DATE DEFAULT NULL)
RETURNS TABLE (
  batch_id UUID,
  batch_name TEXT,
  strain_id UUID,
  strain_name TEXT,
  strain_code TEXT,
  session_type TEXT,
  session_count BIGINT,
  total_weight NUMERIC,
  total_units INTEGER,
  has_packages BOOLEAN,
  package_count BIGINT,
  pending_review_count BIGINT,
  session_date DATE,
  status TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    csv.batch_id,
    csv.batch_name,
    csv.strain_id,
    csv.strain_name,
    csv.strain_code,
    csv.session_type,
    COUNT(*)::BIGINT as session_count,
    SUM(csv.total_weight) as total_weight,
    SUM(csv.total_units)::INTEGER as total_units,
    BOOL_OR(csv.has_packages) as has_packages,
    SUM(csv.package_count)::BIGINT as package_count,
    COALESCE((
      SELECT COUNT(DISTINCT ii.id)
      FROM conversion_packages cp2
      JOIN inventory_items ii ON ii.package_id = cp2.package_id
      WHERE cp2.batch_id = csv.batch_id
        AND cp2.product_id IS NOT NULL
        AND ii.review_status = 'pending'
    ), 0)::BIGINT as pending_review_count,
    csv.session_date,
    -- Set status based on packages state
    CASE
      WHEN BOOL_OR(csv.has_packages) THEN 'packages_created'
      ELSE 'active'
    END::TEXT as status
  FROM conversion_summary_view csv
  WHERE (p_date IS NULL OR csv.session_date = p_date)
  GROUP BY 
    csv.batch_id,
    csv.batch_name,
    csv.strain_id,
    csv.strain_name,
    csv.strain_code,
    csv.session_type,
    csv.session_date
  ORDER BY 
    csv.session_date DESC,
    csv.strain_name ASC,
    csv.session_type ASC;
END;
$$;

COMMENT ON FUNCTION get_conversion_lot_summary IS 
'Returns conversion summary grouped by batch, strain, and session type.
Used by dashboard widgets to show pending conversions.
Works with hybrid architecture (no conversion_lots table).
Migration: create_conversion_views_hybrid_architecture_v2.sql';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT ON conversion_summary_view TO authenticated;
GRANT SELECT ON conversion_history_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversion_lot_summary(DATE) TO authenticated;
