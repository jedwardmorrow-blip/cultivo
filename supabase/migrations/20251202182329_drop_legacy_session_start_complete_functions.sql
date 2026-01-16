/*
  # Drop Legacy Session Start/Complete Functions

  ## Problem
  Old session management functions still exist and reference dropped `movement_type` column:
  - handle_trim_session_start() - tries to INSERT with movement_type
  - handle_trim_session_complete() - tries to INSERT with movement_type
  
  These work with deprecated internal_bucked_inventory/internal_bulk_inventory tables
  and conflict with new event-driven system using inventory_items table.

  ## Solution
  Drop all old session management triggers and functions. The new consolidated
  event-driven functions already handle all session lifecycle operations.

  ## Migration Date
  2025-12-02 (continuation of fix_legacy_session_triggers)
*/

-- ============================================================================
-- STEP 1: Drop Legacy Session Start/Complete Triggers
-- ============================================================================

-- These triggers reference old functions that use movement_type
DROP TRIGGER IF EXISTS trim_session_start_trigger ON trim_sessions;
DROP TRIGGER IF EXISTS trim_session_complete_trigger ON trim_sessions;
DROP TRIGGER IF EXISTS update_bucked_on_session_start_trigger ON trim_sessions;
DROP TRIGGER IF EXISTS add_bucked_smalls_to_inventory_trigger ON trim_sessions;

-- Similar triggers for packaging sessions
DROP TRIGGER IF EXISTS packaging_session_start_trigger ON packaging_sessions;
DROP TRIGGER IF EXISTS packaging_session_complete_trigger ON packaging_sessions;

-- Similar triggers for bucking sessions
DROP TRIGGER IF EXISTS bucking_session_start_trigger ON bucking_sessions;
DROP TRIGGER IF EXISTS bucking_session_complete_trigger ON bucking_sessions;

-- ============================================================================
-- STEP 2: Drop Legacy Functions
-- ============================================================================

-- Functions that INSERT with movement_type (doesn't exist)
DROP FUNCTION IF EXISTS handle_trim_session_start() CASCADE;
DROP FUNCTION IF EXISTS handle_trim_session_complete() CASCADE;
DROP FUNCTION IF EXISTS handle_packaging_session_start() CASCADE;
DROP FUNCTION IF EXISTS handle_packaging_session_complete() CASCADE;
DROP FUNCTION IF EXISTS handle_bucking_session_start() CASCADE;
DROP FUNCTION IF EXISTS handle_bucking_session_complete() CASCADE;

-- Related legacy inventory management functions
DROP FUNCTION IF EXISTS update_bucked_on_session_start() CASCADE;
DROP FUNCTION IF EXISTS add_bucked_smalls_to_inventory() CASCADE;

-- ============================================================================
-- STEP 3: Verify Current Event-Driven Triggers
-- ============================================================================

-- Session start trigger should already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'reserve_trim_inventory' 
    AND tgrelid = 'trim_sessions'::regclass
  ) THEN
    CREATE TRIGGER reserve_trim_inventory
      AFTER INSERT ON trim_sessions
      FOR EACH ROW
      EXECUTE FUNCTION reserve_inventory_on_session_start();
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

DO $$
DECLARE
  legacy_trigger_count int;
  legacy_function_count int;
BEGIN
  -- Count legacy triggers
  SELECT COUNT(*) INTO legacy_trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname IN ('trim_sessions', 'packaging_sessions', 'bucking_sessions')
    AND t.tgname IN (
      'trim_session_start_trigger',
      'trim_session_complete_trigger',
      'packaging_session_start_trigger',
      'packaging_session_complete_trigger',
      'bucking_session_start_trigger',
      'bucking_session_complete_trigger',
      'update_bucked_on_session_start_trigger',
      'add_bucked_smalls_to_inventory_trigger'
    );

  -- Count legacy functions
  SELECT COUNT(*) INTO legacy_function_count
  FROM pg_proc
  WHERE proname IN (
    'handle_trim_session_start',
    'handle_trim_session_complete',
    'handle_packaging_session_start',
    'handle_packaging_session_complete',
    'handle_bucking_session_start',
    'handle_bucking_session_complete',
    'update_bucked_on_session_start',
    'add_bucked_smalls_to_inventory'
  );

  IF legacy_trigger_count = 0 THEN
    RAISE NOTICE '✓ All legacy session triggers removed';
  ELSE
    RAISE WARNING '✗ Still have % legacy triggers', legacy_trigger_count;
  END IF;

  IF legacy_function_count = 0 THEN
    RAISE NOTICE '✓ All legacy session functions removed';
  ELSE
    RAISE WARNING '✗ Still have % legacy functions', legacy_function_count;
  END IF;

  -- Verify event-driven triggers exist
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'reserve_trim_inventory') THEN
    RAISE NOTICE '✓ Event-driven reserve_trim_inventory trigger exists';
  ELSE
    RAISE WARNING '✗ Event-driven reserve_trim_inventory trigger MISSING';
  END IF;

  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Migration complete: Legacy session start/complete functions removed';
  RAISE NOTICE 'All sessions now use pure event-driven architecture';
  RAISE NOTICE '====================================================================';
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================

-- The event-driven system handles:
-- - Session START: reserve_inventory_on_session_start() creates RESERVE movement
-- - Session CANCEL: release_inventory_on_session_cancel() creates RELEASE movement
-- - Session COMPLETE: Application-layer handles CONSUME + PRODUCE movements

-- Legacy internal_bucked_inventory and internal_bulk_inventory tables are deprecated
-- All inventory tracking now uses inventory_items + inventory_movements ledger
