/*
  # Fix Legacy Session Trigger System

  ## Summary
  Removes legacy per-session-type cancellation functions that reference dropped `movement_type` column.
  Completes the event-driven consolidation started on 2025-11-28.

  ## Problem
  - Migration 20251128154224 dropped `movement_type` column from inventory_movements
  - Legacy functions from 20251126205237 still reference this dropped column:
    * handle_trim_session_cancellation()
    * handle_packaging_session_cancellation()
    * handle_bucking_session_cancellation()
  - Causes errors: "column movement_type of relation inventory_movements does not exist"

  ## Solution
  - Drop old per-session-type functions
  - Verify consolidated event-driven functions are properly attached:
    * reserve_inventory_on_session_start() - handles ALL session types
    * release_inventory_on_session_cancel() - handles ALL session types
  - These use movement_kind (not movement_type) and event-driven architecture

  ## Architecture
  The consolidated functions dynamically handle all session types using TG_TABLE_NAME,
  following the event-driven architecture documented in SESSION-2025-11-28-EVENT-DRIVEN-CONSOLIDATION.md

  ## Migration Date
  2025-12-02

  ## Rollback
  See commented-out function definitions at end of file if needed for rollback.
*/

-- ============================================================================
-- STEP 1: Drop Legacy Cancellation Functions
-- ============================================================================

-- These functions used the old architecture with movement_type column
-- They are replaced by release_inventory_on_session_cancel() which handles all session types

DROP FUNCTION IF EXISTS handle_trim_session_cancellation() CASCADE;
DROP FUNCTION IF EXISTS handle_packaging_session_cancellation() CASCADE;
DROP FUNCTION IF EXISTS handle_bucking_session_cancellation() CASCADE;

-- ============================================================================
-- STEP 2: Verify Consolidated Triggers Are Attached
-- ============================================================================

-- Session Start: Reserve inventory (all session types)
-- Note: These triggers should already exist from 20251027220000_create_session_inventory_reservation_system.sql
-- We're just verifying and recreating if needed

-- Trim Sessions
DROP TRIGGER IF EXISTS reserve_trim_inventory ON trim_sessions;
CREATE TRIGGER reserve_trim_inventory
  AFTER INSERT ON trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION reserve_inventory_on_session_start();

-- Packaging Sessions
DROP TRIGGER IF EXISTS reserve_packaging_inventory ON packaging_sessions;
CREATE TRIGGER reserve_packaging_inventory
  AFTER INSERT ON packaging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION reserve_inventory_on_session_start();

-- Bucking Sessions
DROP TRIGGER IF EXISTS reserve_bucking_inventory ON bucking_sessions;
CREATE TRIGGER reserve_bucking_inventory
  AFTER INSERT ON bucking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION reserve_inventory_on_session_start();

-- Session Cancel: Release inventory (all session types)
-- Note: These triggers should already exist from 20251027220000_create_session_inventory_reservation_system.sql
-- We're just verifying and recreating if needed

-- Trim Sessions
DROP TRIGGER IF EXISTS release_trim_inventory_on_cancel ON trim_sessions;
CREATE TRIGGER release_trim_inventory_on_cancel
  AFTER UPDATE ON trim_sessions
  FOR EACH ROW
  WHEN (NEW.cancelled_at IS NOT NULL AND OLD.cancelled_at IS NULL)
  EXECUTE FUNCTION release_inventory_on_session_cancel();

-- Packaging Sessions
DROP TRIGGER IF EXISTS release_packaging_inventory_on_cancel ON packaging_sessions;
CREATE TRIGGER release_packaging_inventory_on_cancel
  AFTER UPDATE ON packaging_sessions
  FOR EACH ROW
  WHEN (NEW.cancelled_at IS NOT NULL AND OLD.cancelled_at IS NULL)
  EXECUTE FUNCTION release_inventory_on_session_cancel();

-- Bucking Sessions
DROP TRIGGER IF EXISTS release_bucking_inventory_on_cancel ON bucking_sessions;
CREATE TRIGGER release_bucking_inventory_on_cancel
  AFTER UPDATE ON bucking_sessions
  FOR EACH ROW
  WHEN (NEW.cancelled_at IS NOT NULL AND OLD.cancelled_at IS NULL)
  EXECUTE FUNCTION release_inventory_on_session_cancel();

-- ============================================================================
-- STEP 3: Add Comments for Documentation
-- ============================================================================

COMMENT ON TRIGGER reserve_trim_inventory ON trim_sessions IS
  'Reserves inventory when trim session starts. Uses consolidated reserve_inventory_on_session_start() function.';

COMMENT ON TRIGGER reserve_packaging_inventory ON packaging_sessions IS
  'Reserves inventory when packaging session starts. Uses consolidated reserve_inventory_on_session_start() function.';

COMMENT ON TRIGGER reserve_bucking_inventory ON bucking_sessions IS
  'Reserves inventory when bucking session starts. Uses consolidated reserve_inventory_on_session_start() function.';

COMMENT ON TRIGGER release_trim_inventory_on_cancel ON trim_sessions IS
  'Releases inventory when trim session cancelled. Uses consolidated release_inventory_on_session_cancel() function.';

COMMENT ON TRIGGER release_packaging_inventory_on_cancel ON packaging_sessions IS
  'Releases inventory when packaging session cancelled. Uses consolidated release_inventory_on_session_cancel() function.';

COMMENT ON TRIGGER release_bucking_inventory_on_cancel ON bucking_sessions IS
  'Releases inventory when bucking session cancelled. Uses consolidated release_inventory_on_session_cancel() function.';

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

DO $$
DECLARE
  trim_triggers int;
  packaging_triggers int;
  bucking_triggers int;
BEGIN
  -- Count triggers on each table
  SELECT COUNT(*) INTO trim_triggers
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'trim_sessions'
    AND t.tgname IN ('reserve_trim_inventory', 'release_trim_inventory_on_cancel');

  SELECT COUNT(*) INTO packaging_triggers
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'packaging_sessions'
    AND t.tgname IN ('reserve_packaging_inventory', 'release_packaging_inventory_on_cancel');

  SELECT COUNT(*) INTO bucking_triggers
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'bucking_sessions'
    AND t.tgname IN ('reserve_bucking_inventory', 'release_bucking_inventory_on_cancel');

  -- Verify triggers exist
  IF trim_triggers = 2 THEN
    RAISE NOTICE '✓ Trim session triggers properly configured (2/2)';
  ELSE
    RAISE WARNING 'Trim session triggers incomplete: % of 2', trim_triggers;
  END IF;

  IF packaging_triggers = 2 THEN
    RAISE NOTICE '✓ Packaging session triggers properly configured (2/2)';
  ELSE
    RAISE WARNING 'Packaging session triggers incomplete: % of 2', packaging_triggers;
  END IF;

  IF bucking_triggers = 2 THEN
    RAISE NOTICE '✓ Bucking session triggers properly configured (2/2)';
  ELSE
    RAISE WARNING 'Bucking session triggers incomplete: % of 2', bucking_triggers;
  END IF;

  -- Verify old functions are gone
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_trim_session_cancellation') THEN
    RAISE NOTICE '✓ Legacy handle_trim_session_cancellation() removed';
  ELSE
    RAISE WARNING 'Legacy handle_trim_session_cancellation() still exists';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_packaging_session_cancellation') THEN
    RAISE NOTICE '✓ Legacy handle_packaging_session_cancellation() removed';
  ELSE
    RAISE WARNING 'Legacy handle_packaging_session_cancellation() still exists';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_bucking_session_cancellation') THEN
    RAISE NOTICE '✓ Legacy handle_bucking_session_cancellation() removed';
  ELSE
    RAISE WARNING 'Legacy handle_bucking_session_cancellation() still exists';
  END IF;

  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Migration complete: Legacy session triggers removed and replaced';
  RAISE NOTICE 'All sessions now use consolidated event-driven functions';
  RAISE NOTICE '====================================================================';
END $$;

-- ============================================================================
-- LEGACY FUNCTION DEFINITIONS (For Reference / Rollback Only)
-- ============================================================================
-- DO NOT UNCOMMENT - These functions reference dropped columns (movement_type)
-- Kept here for historical reference only

/*
-- Legacy function from 20251126205237_add_cancelled_at_columns_only.sql
CREATE OR REPLACE FUNCTION handle_trim_session_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_status = 'cancelled' AND OLD.session_status = 'active' THEN
    NEW.cancelled_at := now();
    -- ... rest of logic that uses movement_type (DROPPED COLUMN)
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Legacy function from 20251126205237_add_cancelled_at_columns_only.sql
CREATE OR REPLACE FUNCTION handle_packaging_session_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  bulk_product_type text; bulk_inventory_id uuid;
BEGIN
  IF NEW.session_status = 'cancelled' AND OLD.session_status = 'active' THEN
    NEW.cancelled_at := now();
    -- ... rest of logic that uses movement_type (DROPPED COLUMN)
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Legacy function from 20251126205237_add_cancelled_at_columns_only.sql
CREATE OR REPLACE FUNCTION handle_bucking_session_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_status = 'cancelled' AND OLD.session_status = 'active' THEN
    NEW.cancelled_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
*/
