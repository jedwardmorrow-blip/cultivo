/*
  # Rollback Script: Batch 1 Critical Integrity Fixes
  
  ## WARNING
  This rollback removes triggers, constraints, and views added in Batch 1.
  Data modifications (batch_id backfill) CANNOT be automatically rolled back.
  
  ## Usage
  psql $DATABASE_URL -f rollback_batch1.sql
  
  ## Manual Steps After Rollback
  1. Review batch_id_backfill_log to identify backfilled items
  2. Decide whether to restore original NULL values (not recommended)
  3. Restore from database backup if full rollback needed
*/

\set ON_ERROR_STOP on
\timing on

\echo ''
\echo '========================================='
\echo 'ROLLING BACK: Batch 1 Critical Integrity Fixes'
\echo '========================================='
\echo ''
\echo 'WARNING: This will remove constraints and triggers.'
\echo 'Data modifications (batch_id backfill) cannot be auto-reverted.'
\echo ''

-- =====================================================
-- STEP 6: Remove constraints from migration 1.6
-- =====================================================

\echo 'Step 6: Removing critical/high constraints...'

-- Drop order status transition trigger
DROP TRIGGER IF EXISTS trg_validate_order_status_transition ON orders;
DROP FUNCTION IF EXISTS fn_validate_order_status_transition();

-- Drop package_id format constraint
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_package_id_format;
DROP VIEW IF EXISTS v_nonstandard_package_ids;

-- Drop demand_unit constraint
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_demand_unit_check;

-- Drop variance_reason NOT NULL (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'variance_log') THEN
    ALTER TABLE variance_log ALTER COLUMN variance_reason DROP NOT NULL;
  END IF;
END $$;

-- Drop COA unique constraint
DROP INDEX IF EXISTS certificates_of_analysis_unique_active_per_batch;

\echo 'Step 6 complete.'

-- =====================================================
-- STEP 5: Remove quarantine gate from migration 1.5
-- =====================================================

\echo 'Step 5: Removing quarantine gate...'

-- Drop triggers
DROP TRIGGER IF EXISTS trg_check_quarantine_before_movement ON inventory_movements;
DROP TRIGGER IF EXISTS trg_check_quarantine_on_trim_start ON trim_sessions;
DROP TRIGGER IF EXISTS trg_check_quarantine_on_packaging_start ON packaging_sessions;

-- Drop functions
DROP FUNCTION IF EXISTS fn_check_quarantine_before_movement();
DROP FUNCTION IF EXISTS fn_check_quarantine_on_session_start();
DROP FUNCTION IF EXISTS fn_validate_batch_not_quarantined(uuid, text);

-- Drop views
DROP VIEW IF EXISTS v_quarantined_batches;

-- Drop table
DROP TABLE IF EXISTS quarantine_violation_log CASCADE;

\echo 'Step 5 complete.'

-- =====================================================
-- STEP 4: Remove ledger enforcement from migration 1.4
-- =====================================================

\echo 'Step 4: Removing ledger-only enforcement...'

-- Drop triggers
DROP TRIGGER IF EXISTS trg_block_direct_quantity_updates ON inventory_items;
DROP TRIGGER IF EXISTS trg_process_inventory_movement ON inventory_movements;
DROP TRIGGER IF EXISTS trg_validate_movement_item_ids ON inventory_movements;

-- Drop functions
DROP FUNCTION IF EXISTS fn_block_direct_quantity_updates();
DROP FUNCTION IF EXISTS fn_process_inventory_movement();
DROP FUNCTION IF EXISTS fn_validate_movement_item_ids();

-- Drop views
DROP VIEW IF EXISTS v_inventory_atp;

-- Drop RLS policies
DROP POLICY IF EXISTS "Block DELETE on inventory_movements" ON inventory_movements;
DROP POLICY IF EXISTS "Block UPDATE on immutable movement fields" ON inventory_movements;

\echo 'Step 4 complete.'

-- =====================================================
-- STEP 3: Remove lifecycle timing fixes from migration 1.3
-- =====================================================

\echo 'Step 3: Removing lifecycle state timing triggers...'

-- Drop triggers
DROP TRIGGER IF EXISTS trg_update_batch_lifecycle_on_trim_complete ON trim_sessions;
DROP TRIGGER IF EXISTS trg_update_batch_lifecycle_on_packaging_complete ON packaging_sessions;
DROP TRIGGER IF EXISTS trg_handle_trim_session_cancellation ON trim_sessions;
DROP TRIGGER IF EXISTS trg_handle_packaging_session_cancellation ON packaging_sessions;

-- Drop functions
DROP FUNCTION IF EXISTS fn_update_batch_lifecycle_on_trim_complete();
DROP FUNCTION IF EXISTS fn_update_batch_lifecycle_on_packaging_complete();
DROP FUNCTION IF EXISTS fn_handle_trim_session_cancellation();
DROP FUNCTION IF EXISTS fn_handle_packaging_session_cancellation();
DROP FUNCTION IF EXISTS fn_validate_batch_lifecycle_transition(uuid, text, text);

\echo 'Step 3 complete.'

-- =====================================================
-- STEP 2: Remove batch_id constraints from migration 1.2
-- =====================================================

\echo 'Step 2: Removing batch_id constraints...'

-- Drop trigger
DROP TRIGGER IF EXISTS trg_prevent_batch_id_update ON inventory_items;

-- Drop function
DROP FUNCTION IF EXISTS fn_prevent_batch_id_update();

-- Drop index
DROP INDEX IF EXISTS idx_inventory_items_batch_id_not_null;

-- Drop FK constraint (if added)
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_batch_id_fkey;

-- Drop NOT NULL constraint
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_batch_id_not_null;

\echo 'Step 2 complete.'

-- =====================================================
-- STEP 1: Clean up backfill artifacts from migration 1.1
-- =====================================================

\echo 'Step 1: Cleaning up backfill artifacts...'

-- Drop view
DROP VIEW IF EXISTS v_batch_id_orphans;

-- Optionally drop backfill log (comment out to preserve audit trail)
-- DROP TABLE IF EXISTS batch_id_backfill_log CASCADE;

\echo 'Step 1 complete (backfill log preserved for audit).'

-- =====================================================
-- ROLLBACK SUMMARY
-- =====================================================

\echo ''
\echo '========================================='
\echo 'ROLLBACK COMPLETE'
\echo '========================================='

DO $$
BEGIN
  RAISE NOTICE E'\n✅ Batch 1 triggers and constraints removed.';
  RAISE NOTICE E'\n⚠️  IMPORTANT: batch_id backfill data modifications were NOT reverted.';
  RAISE NOTICE E'   - Review batch_id_backfill_log to see what was changed';
  RAISE NOTICE E'   - Restore from backup if full data rollback is required';
  RAISE NOTICE E'\n📋 Backfill log table preserved at: batch_id_backfill_log';
  RAISE NOTICE E'   - Use this to identify which items had batch_id set';
  RAISE NOTICE E'   - DROP TABLE batch_id_backfill_log to remove audit trail\n';
END $$;
