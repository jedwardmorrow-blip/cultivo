/*
  # Drop Obsolete Conversion Triggers and Functions

  ## Overview
  This migration completes the hybrid conversion architecture cleanup by removing
  obsolete triggers and functions. The pending_conversions, conversion_lots, and 
  conversion_locks tables have already been dropped, but their associated triggers
  and functions still exist and are causing errors.

  ## Problem
  - Bucking session completion error: "relation 'pending_conversions' does not exist"
  - The pending_conversions table was already dropped (hybrid architecture migration)
  - But triggers on session tables still try to call functions that INSERT into it
  - This causes session completion to fail

  ## Root Cause
  Active triggers on session tables:
  - trigger_auto_create_pending_conversions_from_bucking ON bucking_sessions
  - trigger_auto_create_pending_conversions_from_trim ON trim_sessions  
  - trigger_auto_create_pending_conversions_from_packaging ON packaging_sessions
  
  These trigger functions that try to INSERT INTO pending_conversions table

  ## Solution
  Drop all triggers and functions that reference the deleted tables

  ## Architecture Context

  **Old System (Removed):**
  Session Complete -> Trigger -> INSERT pending_conversions -> Lock -> Package

  **New System (Hybrid - Manual Finalization):**
  Session Complete -> Manager Reviews -> Manual Finalize -> Create Packages
  - Uses conversion_summary_view (queries sessions directly)
  - Uses get_conversion_lot_summary() RPC function
  - No automatic triggers needed

  ## References
  - Hybrid Architecture: migration 20260112233251
  - Manual Finalization: migration 20260113023946
  - Decision Log: docs/AI-BUILD-SESSION-CHECKLIST.md (Decision #2)
*/

-- =====================================================
-- STEP 1: Drop All Session Triggers
-- =====================================================

-- Drop trim session triggers
DROP TRIGGER IF EXISTS trigger_auto_create_pending_conversions_from_trim ON trim_sessions;
DROP TRIGGER IF EXISTS auto_create_pending_conversions_trim_trigger ON trim_sessions;

-- Drop packaging session triggers
DROP TRIGGER IF EXISTS trigger_auto_create_pending_conversions_from_packaging ON packaging_sessions;
DROP TRIGGER IF EXISTS auto_create_pending_conversions_packaging_trigger ON packaging_sessions;

-- Drop bucking session triggers
DROP TRIGGER IF EXISTS trigger_auto_create_pending_conversions_from_bucking ON bucking_sessions;
DROP TRIGGER IF EXISTS auto_create_pending_conversions_bucking_trigger ON bucking_sessions;

-- =====================================================
-- STEP 2: Drop All Functions
-- =====================================================

-- Drop auto-create functions
DROP FUNCTION IF EXISTS auto_create_pending_conversions_from_trim() CASCADE;
DROP FUNCTION IF EXISTS auto_create_pending_conversions_from_packaging() CASCADE;
DROP FUNCTION IF EXISTS auto_create_pending_conversions_from_bucking() CASCADE;

-- Drop conversion_lots aggregation functions
DROP FUNCTION IF EXISTS auto_update_conversion_lots() CASCADE;
DROP FUNCTION IF EXISTS aggregate_pending_to_lots() CASCADE;
DROP FUNCTION IF EXISTS aggregate_pending_to_conversion_lots() CASCADE;

-- Drop lock management functions (if they exist)
DROP FUNCTION IF EXISTS acquire_conversion_lock(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS release_conversion_lock(UUID) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_locks() CASCADE;

-- =====================================================
-- STEP 3: Drop Obsolete Tables (if they still exist)
-- =====================================================

-- Drop in correct order (respecting foreign key dependencies)
-- Using CASCADE to handle any remaining references

DROP TABLE IF EXISTS conversion_locks CASCADE;
DROP TABLE IF EXISTS conversion_lots CASCADE;
DROP TABLE IF EXISTS pending_conversions CASCADE;

-- =====================================================
-- STEP 4: Clean Up Remaining Indexes
-- =====================================================

-- Drop any remaining indexes explicitly (should be handled by CASCADE)
DROP INDEX IF EXISTS idx_pending_conversions_batch;
DROP INDEX IF EXISTS idx_pending_conversions_product;
DROP INDEX IF EXISTS idx_pending_conversions_status;
DROP INDEX IF EXISTS idx_pending_conversions_session;
DROP INDEX IF EXISTS idx_pending_conversions_created_at;
DROP INDEX IF EXISTS idx_conversion_lots_batch;
DROP INDEX IF EXISTS idx_conversion_lots_product;
DROP INDEX IF EXISTS idx_conversion_lots_status;
DROP INDEX IF EXISTS idx_conversion_locks_lot;
DROP INDEX IF EXISTS idx_conversion_locks_user;
DROP INDEX IF EXISTS idx_conversion_locks_expires;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify triggers are gone from session tables
DO $$
DECLARE
  v_trigger_count integer;
BEGIN
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE t.tgname LIKE '%pending_conversion%'
     OR t.tgname LIKE '%conversion_lot%';
  
  IF v_trigger_count > 0 THEN
    RAISE WARNING 'Found % obsolete triggers still active', v_trigger_count;
  ELSE
    RAISE NOTICE 'All obsolete conversion triggers successfully dropped';
  END IF;
END $$;

-- =====================================================
-- DOCUMENTATION
-- =====================================================

COMMENT ON VIEW conversion_summary_view IS
'Hybrid architecture view: Shows completed sessions ready for package creation.
Replaces pending_conversions and conversion_lots tables (dropped).
Used by ConversionsView component for manual finalization workflow.
Session types: trim, packaging, bucking';

COMMENT ON FUNCTION get_conversion_lot_summary(DATE) IS
'Returns conversion summary grouped by batch, strain, and session type.
Replaces queries against conversion_lots table (dropped).
Used by dashboard PendingConversionsWidget.
Works with hybrid architecture (queries sessions directly).';