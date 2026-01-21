/*
  # Add Per-Output Finalization Tracking for Analytics

  ## Overview
  This migration implements Option 1 (Separate Fields) for tracking finalization status
  per output type. This design optimizes for analytics queries by avoiding JOINs and
  providing direct column access for business intelligence and reporting.

  ## Changes

  ### 1. New Columns Added to trim_sessions
  - `finalization_status_bigs` (enum: pending/finalized/voided) - Track big buds finalization
  - `finalized_at_bigs` (timestamptz) - When big buds were finalized
  - `finalized_by_bigs` (uuid) - Who finalized big buds
  - `void_reason_bigs` (text) - Reason if voided
  - `finalization_status_smalls` (enum) - Track smalls finalization
  - `finalized_at_smalls` (timestamptz)
  - `finalized_by_smalls` (uuid)
  - `void_reason_smalls` (text)
  - `finalization_status_trim` (enum) - Track trim finalization
  - `finalized_at_trim` (timestamptz)
  - `finalized_by_trim` (uuid)
  - `void_reason_trim` (text)

  ### 2. New Columns Added to bucking_sessions
  - `finalization_status_bucked` (enum) - Track bucked flower finalization
  - `finalized_at_bucked` (timestamptz)
  - `finalized_by_bucked` (uuid)
  - `void_reason_bucked` (text)
  - `finalization_status_smalls` (enum) - Track bucked smalls finalization
  - `finalized_at_smalls` (timestamptz)
  - `finalized_by_smalls` (uuid)
  - `void_reason_smalls` (text)

  ### 3. New Columns Added to packaging_sessions
  - `finalization_status_packaged` (enum) - Track packaged units finalization
  - `finalized_at_packaged` (timestamptz)
  - `finalized_by_packaged` (uuid)
  - `void_reason_packaged` (text)

  ### 4. Data Migration
  - Backfill new fields from existing `finalization_status` column
  - Copy `finalized_at`, `finalized_by`, and `void_reason` to all output types

  ### 5. Analytics Optimization
  - Add indexes for common analytics queries (by status, by date, by staff)
  - Enable fast conversion rate calculations
  - Support staff performance tracking
  - Optimize inventory projection queries

  ## Benefits for Analytics
  1. **Simple Queries** - Direct column access, no JOINs required
  2. **Fast Aggregations** - Database can use column indexes directly
  3. **Better Performance** - No JOIN overhead for dashboards and reports
  4. **BI Tool Friendly** - Works well with Metabase, Tableau, etc.
  5. **Ad-hoc Analysis** - Business users can write simple SQL
  6. **Historical Trends** - Fast time-series queries for projections
*/

-- ============================================================================
-- STEP 1: Add per-output finalization fields to trim_sessions
-- ============================================================================

-- Big buds finalization tracking
ALTER TABLE trim_sessions 
  ADD COLUMN IF NOT EXISTS finalization_status_bigs finalization_status DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS finalized_at_bigs timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by_bigs uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS void_reason_bigs text;

-- Smalls finalization tracking
ALTER TABLE trim_sessions 
  ADD COLUMN IF NOT EXISTS finalization_status_smalls finalization_status DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS finalized_at_smalls timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by_smalls uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS void_reason_smalls text;

-- Trim finalization tracking
ALTER TABLE trim_sessions 
  ADD COLUMN IF NOT EXISTS finalization_status_trim finalization_status DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS finalized_at_trim timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by_trim uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS void_reason_trim text;

-- ============================================================================
-- STEP 2: Add per-output finalization fields to bucking_sessions
-- ============================================================================

-- Bucked flower finalization tracking
ALTER TABLE bucking_sessions 
  ADD COLUMN IF NOT EXISTS finalization_status_bucked finalization_status DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS finalized_at_bucked timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by_bucked uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS void_reason_bucked text;

-- Bucked smalls finalization tracking
ALTER TABLE bucking_sessions 
  ADD COLUMN IF NOT EXISTS finalization_status_smalls finalization_status DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS finalized_at_smalls timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by_smalls uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS void_reason_smalls text;

-- ============================================================================
-- STEP 3: Add per-output finalization fields to packaging_sessions
-- ============================================================================

-- Packaged units finalization tracking
ALTER TABLE packaging_sessions 
  ADD COLUMN IF NOT EXISTS finalization_status_packaged finalization_status DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS finalized_at_packaged timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by_packaged uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS void_reason_packaged text;

-- ============================================================================
-- STEP 4: Backfill data from old single-status field
-- ============================================================================

-- Backfill trim_sessions: Copy finalization_status to all three output types
UPDATE trim_sessions SET
  finalization_status_bigs = finalization_status,
  finalized_at_bigs = finalized_at,
  finalized_by_bigs = finalized_by,
  void_reason_bigs = void_reason,
  finalization_status_smalls = finalization_status,
  finalized_at_smalls = finalized_at,
  finalized_by_smalls = finalized_by,
  void_reason_smalls = void_reason,
  finalization_status_trim = finalization_status,
  finalized_at_trim = finalized_at,
  finalized_by_trim = finalized_by,
  void_reason_trim = void_reason
WHERE finalization_status IN ('finalized', 'voided');

-- Backfill bucking_sessions: Copy finalization_status to both output types
UPDATE bucking_sessions SET
  finalization_status_bucked = finalization_status,
  finalized_at_bucked = finalized_at,
  finalized_by_bucked = finalized_by,
  void_reason_bucked = void_reason,
  finalization_status_smalls = finalization_status,
  finalized_at_smalls = finalized_at,
  finalized_by_smalls = finalized_by,
  void_reason_smalls = void_reason
WHERE finalization_status IN ('finalized', 'voided');

-- Backfill packaging_sessions: Copy finalization_status to packaged output
UPDATE packaging_sessions SET
  finalization_status_packaged = finalization_status,
  finalized_at_packaged = finalized_at,
  finalized_by_packaged = finalized_by,
  void_reason_packaged = void_reason
WHERE finalization_status IN ('finalized', 'voided');

-- ============================================================================
-- STEP 5: Add indexes for analytics performance
-- ============================================================================

-- Trim sessions indexes for conversion rate analysis
CREATE INDEX IF NOT EXISTS idx_trim_sessions_finalization_bigs 
  ON trim_sessions(finalization_status_bigs, session_date) 
  WHERE session_status != 'cancelled' AND test_mode = false;

CREATE INDEX IF NOT EXISTS idx_trim_sessions_finalization_smalls 
  ON trim_sessions(finalization_status_smalls, session_date) 
  WHERE session_status != 'cancelled' AND test_mode = false;

CREATE INDEX IF NOT EXISTS idx_trim_sessions_finalization_trim 
  ON trim_sessions(finalization_status_trim, session_date) 
  WHERE session_status != 'cancelled' AND test_mode = false;

-- Staff performance tracking indexes
CREATE INDEX IF NOT EXISTS idx_trim_sessions_staff_performance 
  ON trim_sessions(trimmer_name, session_date, finalization_status_bigs) 
  WHERE session_status != 'cancelled' AND test_mode = false;

-- Bucking sessions indexes (no test_mode column)
CREATE INDEX IF NOT EXISTS idx_bucking_sessions_finalization_bucked 
  ON bucking_sessions(finalization_status_bucked, session_date) 
  WHERE session_status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_bucking_sessions_finalization_smalls 
  ON bucking_sessions(finalization_status_smalls, session_date) 
  WHERE session_status != 'cancelled';

-- Packaging sessions indexes
CREATE INDEX IF NOT EXISTS idx_packaging_sessions_finalization_packaged 
  ON packaging_sessions(finalization_status_packaged, session_date) 
  WHERE session_status != 'cancelled' AND test_mode = false;

-- Batch-level analytics indexes
CREATE INDEX IF NOT EXISTS idx_trim_sessions_batch_analytics 
  ON trim_sessions(batch_registry_id, finalization_status_bigs, finalization_status_smalls, finalization_status_trim) 
  WHERE session_status != 'cancelled' AND test_mode = false;

-- ============================================================================
-- STEP 6: Add helpful comments for developers
-- ============================================================================

COMMENT ON COLUMN trim_sessions.finalization_status_bigs IS 
  'Finalization status for big buds output. Use this for analytics queries instead of joining to conversion_finalization_tracking.';

COMMENT ON COLUMN trim_sessions.finalization_status_smalls IS 
  'Finalization status for smalls output. Use this for analytics queries instead of joining to conversion_finalization_tracking.';

COMMENT ON COLUMN trim_sessions.finalization_status_trim IS 
  'Finalization status for trim output. Use this for analytics queries instead of joining to conversion_finalization_tracking.';

COMMENT ON COLUMN bucking_sessions.finalization_status_bucked IS 
  'Finalization status for bucked flower output. Use this for analytics queries.';

COMMENT ON COLUMN bucking_sessions.finalization_status_smalls IS 
  'Finalization status for bucked smalls output. Use this for analytics queries.';

COMMENT ON COLUMN packaging_sessions.finalization_status_packaged IS 
  'Finalization status for packaged units output. Use this for analytics queries.';
