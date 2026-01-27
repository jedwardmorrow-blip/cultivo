/*
  # Add Per-Product Finalization Tracking for Packaging Sessions

  ## Purpose
  Enable separate finalization tracking for each packaging product type (3.5g, 14g, 1lb).
  This allows multiple product types from a single session to be finalized independently,
  following the established pattern from trim and bucking sessions.

  ## Problem Statement
  Currently, packaging sessions use a single `finalization_status_packaged` field that treats
  all product types (3.5g, 14g, 1lb) as one unit. This prevents:
  - Independent finalization of different product types
  - Proper visibility in conversions view (need to unpivot by product type)
  - Accurate inventory tracking by product type
  - Granular control over multi-product packaging workflows

  ## Solution
  Add separate finalization tracking columns for each product type, matching the pattern
  established in trim_sessions (which has separate tracking for bigs/smalls/trim).

  ## Changes

  ### 1. New Columns Added to packaging_sessions
  
  **3.5g Product Tracking:**
  - `finalization_status_3_5g` (enum: pending/finalized/voided)
  - `finalized_at_3_5g` (timestamptz)
  - `finalized_by_3_5g` (uuid → auth.users)
  - `void_reason_3_5g` (text)

  **14g Product Tracking:**
  - `finalization_status_14g` (enum: pending/finalized/voided)
  - `finalized_at_14g` (timestamptz)
  - `finalized_by_14g` (uuid → auth.users)
  - `void_reason_14g` (text)

  **1lb (454g) Product Tracking:**
  - `finalization_status_1lb` (enum: pending/finalized/voided)
  - `finalized_at_1lb` (timestamptz)
  - `finalized_by_1lb` (uuid → auth.users)
  - `void_reason_1lb` (text)

  ### 2. Data Backfill
  - Copy existing `finalization_status_packaged` data to all new product-specific fields
  - This ensures historical sessions have consistent state
  - Future sessions will track each product type independently

  ### 3. Analytics Optimization
  - Add indexes for conversion rate analysis by product type
  - Enable fast queries for pending conversions by product type
  - Support product-specific performance tracking

  ## Migration Strategy
  1. Add columns with IF NOT EXISTS for safety
  2. Backfill data from existing finalization_status_packaged field
  3. Add indexes for analytics performance
  4. Keep old finalization_status_packaged field for backward compatibility (deprecated)

  ## Impact
  - Enables unpivoting of packaging sessions in conversions view
  - Allows independent finalization of 3.5g, 14g, and 1lb products
  - Provides granular visibility into packaging inventory pipeline
  - Matches architectural pattern used in trim and bucking sessions
  - No breaking changes - existing finalization_status_packaged field retained
*/

-- ============================================================================
-- STEP 1: Add per-product finalization fields for 3.5g products
-- ============================================================================

ALTER TABLE packaging_sessions 
  ADD COLUMN IF NOT EXISTS finalization_status_3_5g finalization_status DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS finalized_at_3_5g timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by_3_5g uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS void_reason_3_5g text;

-- ============================================================================
-- STEP 2: Add per-product finalization fields for 14g products
-- ============================================================================

ALTER TABLE packaging_sessions 
  ADD COLUMN IF NOT EXISTS finalization_status_14g finalization_status DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS finalized_at_14g timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by_14g uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS void_reason_14g text;

-- ============================================================================
-- STEP 3: Add per-product finalization fields for 1lb (454g) products
-- ============================================================================

ALTER TABLE packaging_sessions 
  ADD COLUMN IF NOT EXISTS finalization_status_1lb finalization_status DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS finalized_at_1lb timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by_1lb uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS void_reason_1lb text;

-- ============================================================================
-- STEP 4: Backfill data from old finalization_status_packaged field
-- ============================================================================

-- Copy finalization data to all product types where the session produced those products
-- This ensures historical data is consistent and queryable

UPDATE packaging_sessions SET
  -- Copy to 3.5g fields if session produced 3.5g units
  finalization_status_3_5g = CASE WHEN COALESCE(units_3_5g, 0) > 0 THEN finalization_status_packaged ELSE 'pending' END,
  finalized_at_3_5g = CASE WHEN COALESCE(units_3_5g, 0) > 0 THEN finalized_at_packaged ELSE NULL END,
  finalized_by_3_5g = CASE WHEN COALESCE(units_3_5g, 0) > 0 THEN finalized_by_packaged ELSE NULL END,
  void_reason_3_5g = CASE WHEN COALESCE(units_3_5g, 0) > 0 THEN void_reason_packaged ELSE NULL END,
  
  -- Copy to 14g fields if session produced 14g units
  finalization_status_14g = CASE WHEN COALESCE(units_14g, 0) > 0 THEN finalization_status_packaged ELSE 'pending' END,
  finalized_at_14g = CASE WHEN COALESCE(units_14g, 0) > 0 THEN finalized_at_packaged ELSE NULL END,
  finalized_by_14g = CASE WHEN COALESCE(units_14g, 0) > 0 THEN finalized_by_packaged ELSE NULL END,
  void_reason_14g = CASE WHEN COALESCE(units_14g, 0) > 0 THEN void_reason_packaged ELSE NULL END,
  
  -- Copy to 1lb fields if session produced 1lb units
  finalization_status_1lb = CASE WHEN COALESCE(units_454g, 0) > 0 THEN finalization_status_packaged ELSE 'pending' END,
  finalized_at_1lb = CASE WHEN COALESCE(units_454g, 0) > 0 THEN finalized_at_packaged ELSE NULL END,
  finalized_by_1lb = CASE WHEN COALESCE(units_454g, 0) > 0 THEN finalized_by_packaged ELSE NULL END,
  void_reason_1lb = CASE WHEN COALESCE(units_454g, 0) > 0 THEN void_reason_packaged ELSE NULL END
WHERE finalization_status_packaged IN ('finalized', 'voided');

-- ============================================================================
-- STEP 5: Add indexes for analytics performance
-- ============================================================================

-- Per-product conversion rate analysis
CREATE INDEX IF NOT EXISTS idx_packaging_sessions_finalization_3_5g 
  ON packaging_sessions(finalization_status_3_5g, session_date) 
  WHERE session_status != 'cancelled' AND test_mode = false AND COALESCE(units_3_5g, 0) > 0;

CREATE INDEX IF NOT EXISTS idx_packaging_sessions_finalization_14g 
  ON packaging_sessions(finalization_status_14g, session_date) 
  WHERE session_status != 'cancelled' AND test_mode = false AND COALESCE(units_14g, 0) > 0;

CREATE INDEX IF NOT EXISTS idx_packaging_sessions_finalization_1lb 
  ON packaging_sessions(finalization_status_1lb, session_date) 
  WHERE session_status != 'cancelled' AND test_mode = false AND COALESCE(units_454g, 0) > 0;

-- Pending conversions query optimization (most common query)
CREATE INDEX IF NOT EXISTS idx_packaging_pending_conversions 
  ON packaging_sessions(batch_registry_id, strain_id, finalization_status_3_5g, finalization_status_14g, finalization_status_1lb) 
  WHERE session_status = 'completed' AND test_mode = false;

-- Batch-level analytics for production tracking
CREATE INDEX IF NOT EXISTS idx_packaging_batch_analytics 
  ON packaging_sessions(batch_registry_id, finalization_status_3_5g, finalization_status_14g, finalization_status_1lb) 
  WHERE session_status != 'cancelled' AND test_mode = false;

-- ============================================================================
-- STEP 6: Add developer documentation comments
-- ============================================================================

COMMENT ON COLUMN packaging_sessions.finalization_status_3_5g IS 
  'Finalization status for 3.5g products. Use this for analytics queries and conversions view filtering.';

COMMENT ON COLUMN packaging_sessions.finalization_status_14g IS 
  'Finalization status for 14g products. Allows independent finalization from other product types.';

COMMENT ON COLUMN packaging_sessions.finalization_status_1lb IS 
  'Finalization status for 1lb (454g) products. Tracks bulk packaging finalization separately.';

COMMENT ON COLUMN packaging_sessions.finalization_status_packaged IS 
  'DEPRECATED: Legacy field retained for backward compatibility. Use product-specific finalization_status_* fields instead.';

-- ============================================================================
-- VERIFICATION QUERY (for testing)
-- ============================================================================

-- Query to verify backfill worked correctly:
-- SELECT 
--   id,
--   units_3_5g, finalization_status_3_5g,
--   units_14g, finalization_status_14g,
--   units_454g, finalization_status_1lb,
--   finalization_status_packaged
-- FROM packaging_sessions
-- WHERE session_status = 'completed'
-- ORDER BY completed_at DESC
-- LIMIT 10;
