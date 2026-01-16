/*
  # Add Manual Finalization Workflow for Conversions

  ## Overview
  This migration implements Path B: Manual Finalization for the conversion system.
  Instead of auto-creating packages via triggers, managers explicitly finalize
  completed sessions into packages, providing oversight and control.

  ## Changes

  1. **conversion_packages table enhancements:**
     - Add finalization_status ENUM (pending, finalized, voided)
     - Add finalized_at, finalized_by columns for audit trail
     - Make conversion_lot_id nullable (deprecated column, kept for backward compatibility)
     - Drop foreign key constraint on conversion_lot_id (conversion_lots table removed)

  2. **conversion_summary_view v3:**
     - Enhanced to show only sessions without finalized packages
     - Shows pending package count for sessions
     - Used by ConversionsView to display sessions awaiting finalization

  3. **get_pending_conversions() RPC:**
     - Returns sessions grouped by batch+product+date
     - Shows total output quantities awaiting finalization
     - Filters out sessions already finalized
     - Used by dashboard widget and finalization UI

  ## Workflow

  **Old (Auto-trigger):**
  Session Complete → Trigger → Auto-create Packages → Done

  **New (Manual Finalization):**
  Session Complete → Manager Reviews → Clicks Finalize → Creates Packages → Done

  ## Backward Compatibility
  - Existing conversion_packages backfilled with finalization_status='finalized'
  - conversion_lot_id kept nullable for legacy data (new packages won't use it)
  - All existing queries continue to work
  - Zero data loss

  ## Security
  - Only authenticated users can view pending conversions
  - Only authenticated users can finalize (enforced by RLS on conversion_packages)
  - Finalization creates audit trail with timestamp and user ID
*/

-- =====================================================
-- STEP 1: Add Finalization Status ENUM
-- =====================================================

-- Create enum for finalization status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finalization_status') THEN
    CREATE TYPE finalization_status AS ENUM ('pending', 'finalized', 'voided');
  END IF;
END $$;

COMMENT ON TYPE finalization_status IS
'Tracks the finalization state of conversion packages.
- pending: Package created but not yet moved to inventory
- finalized: Package moved to inventory and active
- voided: Package cancelled/rejected (audit record only)';

-- =====================================================
-- STEP 2: Modify conversion_packages Table
-- =====================================================

-- Drop the foreign key constraint on conversion_lot_id (table was removed in hybrid architecture)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'conversion_packages_conversion_lot_id_fkey'
    AND table_name = 'conversion_packages'
  ) THEN
    ALTER TABLE conversion_packages
    DROP CONSTRAINT conversion_packages_conversion_lot_id_fkey;
  END IF;
END $$;

-- Make conversion_lot_id nullable (legacy column, kept for backward compatibility)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversion_packages'
    AND column_name = 'conversion_lot_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE conversion_packages
    ALTER COLUMN conversion_lot_id DROP NOT NULL;
  END IF;
END $$;

-- Add finalization_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversion_packages'
    AND column_name = 'finalization_status'
  ) THEN
    ALTER TABLE conversion_packages
    ADD COLUMN finalization_status finalization_status NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- Add finalized_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversion_packages'
    AND column_name = 'finalized_at'
  ) THEN
    ALTER TABLE conversion_packages
    ADD COLUMN finalized_at timestamptz;
  END IF;
END $$;

-- Add finalized_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversion_packages'
    AND column_name = 'finalized_by'
  ) THEN
    ALTER TABLE conversion_packages
    ADD COLUMN finalized_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add index for finalization queries
CREATE INDEX IF NOT EXISTS idx_conversion_packages_finalization_status
ON conversion_packages(finalization_status)
WHERE finalization_status != 'voided';

-- Add comment
COMMENT ON COLUMN conversion_packages.finalization_status IS
'Tracks whether package has been finalized to inventory.
Updated via finalizeConversion() service method.';

COMMENT ON COLUMN conversion_packages.finalized_at IS
'Timestamp when manager finalized the package to inventory.
NULL for pending packages.';

COMMENT ON COLUMN conversion_packages.finalized_by IS
'User who finalized the package to inventory.
NULL for pending packages.';

-- =====================================================
-- STEP 3: Backfill Existing Packages as Finalized
-- =====================================================

-- Mark all existing packages as finalized (they were auto-created by old system)
UPDATE conversion_packages
SET
  finalization_status = 'finalized',
  finalized_at = created_at,
  finalized_by = created_by
WHERE finalization_status = 'pending';

-- =====================================================
-- STEP 4: Update conversion_summary_view (v3)
-- =====================================================

-- Drop existing view
DROP VIEW IF EXISTS conversion_summary_view CASCADE;

-- Recreate with finalization awareness
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

  -- Bucking sessions
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
  -- Check if ANY packages created from this session (includes pending)
  CASE
    WHEN EXISTS (
      SELECT 1 FROM conversion_packages cp
      WHERE cp.source_session_ids @> jsonb_build_array(cs.session_id::text)
    ) THEN true
    ELSE false
  END as has_packages,
  -- Check if FINALIZED packages exist
  CASE
    WHEN EXISTS (
      SELECT 1 FROM conversion_packages cp
      WHERE cp.source_session_ids @> jsonb_build_array(cs.session_id::text)
      AND cp.finalization_status = 'finalized'
    ) THEN true
    ELSE false
  END as is_finalized,
  -- Count total packages (all statuses)
  COALESCE((
    SELECT COUNT(*)
    FROM conversion_packages cp
    WHERE cp.source_session_ids @> jsonb_build_array(cs.session_id::text)
  ), 0) as package_count,
  -- Count pending packages only
  COALESCE((
    SELECT COUNT(*)
    FROM conversion_packages cp
    WHERE cp.source_session_ids @> jsonb_build_array(cs.session_id::text)
    AND cp.finalization_status = 'pending'
  ), 0) as pending_package_count,
  cs.completed_at
FROM completed_sessions cs
JOIN batch_registry br ON cs.batch_id = br.id
LEFT JOIN strains s ON cs.strain_id = s.id
WHERE cs.strain_id IS NOT NULL
ORDER BY cs.completed_at DESC, s.name ASC;

COMMENT ON VIEW conversion_summary_view IS
'Manual finalization workflow view (v3): Shows completed sessions with finalization status.
Distinguishes between pending and finalized packages.
Used by ConversionsView component and finalization workflow.
Migration: add_manual_finalization_workflow.sql';

-- =====================================================
-- STEP 5: Create get_pending_conversions() RPC
-- =====================================================

-- Drop old version if exists
DROP FUNCTION IF EXISTS get_pending_conversions(DATE);

-- Create function to return sessions awaiting finalization
CREATE OR REPLACE FUNCTION get_pending_conversions(p_date DATE DEFAULT NULL)
RETURNS TABLE (
  batch_id UUID,
  batch_name TEXT,
  strain_id UUID,
  strain_name TEXT,
  strain_code TEXT,
  session_type TEXT,
  session_id UUID,
  session_date DATE,
  output_weight NUMERIC,
  output_units INTEGER,
  has_pending_packages BOOLEAN,
  pending_package_count BIGINT,
  completed_at TIMESTAMPTZ
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
    csv.session_id,
    csv.session_date,
    csv.total_weight as output_weight,
    csv.total_units as output_units,
    (csv.pending_package_count > 0) as has_pending_packages,
    csv.pending_package_count,
    csv.completed_at
  FROM conversion_summary_view csv
  WHERE
    -- Only show sessions that haven't been finalized yet
    csv.is_finalized = false
    -- Optional date filter
    AND (p_date IS NULL OR csv.session_date = p_date)
  ORDER BY
    csv.completed_at DESC,
    csv.strain_name ASC,
    csv.session_type ASC;
END;
$$;

COMMENT ON FUNCTION get_pending_conversions IS
'Returns sessions awaiting finalization to inventory packages.
Shows completed sessions that have not yet been finalized by manager.
Used by dashboard widgets and finalization UI.
Migration: add_manual_finalization_workflow.sql';

-- =====================================================
-- STEP 6: Update conversion_history_view
-- =====================================================

-- Drop existing view
DROP VIEW IF EXISTS conversion_history_view CASCADE;

-- Recreate with finalization_status
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
  cp.finalization_status,
  cp.created_at,
  cp.created_by,
  up_created.full_name as created_by_name,
  cp.finalized_at,
  cp.finalized_by,
  up_finalized.full_name as finalized_by_name,
  cp.packaged_at,
  -- Check if in inventory
  CASE
    WHEN EXISTS (
      SELECT 1 FROM inventory_items ii
      WHERE ii.package_id = cp.package_id
    ) THEN true
    ELSE false
  END as in_inventory,
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
LEFT JOIN user_profiles up_created ON cp.created_by = up_created.id
LEFT JOIN user_profiles up_finalized ON cp.finalized_by = up_finalized.id
ORDER BY cp.created_at DESC;

COMMENT ON VIEW conversion_history_view IS
'Shows all conversion packages with finalization status and audit trail.
Includes who finalized and when, plus inventory review status.
Migration: add_manual_finalization_workflow.sql';

-- =====================================================
-- STEP 7: Grant Permissions
-- =====================================================

GRANT SELECT ON conversion_summary_view TO authenticated;
GRANT SELECT ON conversion_history_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_conversions(DATE) TO authenticated;