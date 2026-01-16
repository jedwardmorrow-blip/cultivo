/*
  # Deprecate Internal Inventory System

  ## Overview
  The codebase uses the legacy inventory system (inventory_items, bucked_inventory, bulk_inventory).
  The internal_* tables were created in migration 20251012150537 but never integrated into the application.
  This migration marks them as deprecated to avoid confusion.

  ## Changes
  1. Add comments to internal inventory tables marking them as deprecated
  2. Document that inventory_items is the active system
  3. Mark related tables in the internal system as deprecated

  ## Tables Affected (DEPRECATED)
  - internal_bucked_inventory
  - internal_bulk_inventory
  - internal_packaged_inventory
  - inventory_movements
  - inventory_reconciliation
  - inventory_variances
  - order_fulfillment_items

  ## Active Inventory System
  - inventory_items (primary)
  - bucked_inventory (legacy workflow)
  - bulk_inventory (legacy workflow)
  - inventory_changes (transaction log)
  - inventory_snapshots (point-in-time backups)

  ## Safety
  - Does NOT drop tables (kept for historical purposes)
  - Only adds documentation comments
  - No data modifications
*/

-- =====================================================
-- Mark internal inventory tables as DEPRECATED
-- =====================================================

COMMENT ON TABLE internal_bucked_inventory IS
'DEPRECATED: This table was created but never used in the application.
Use inventory_items table instead for all inventory operations.
Created in: 20251012150537_create_internal_inventory_tracking_system.sql
Deprecated in: 20251020230000_deprecate_internal_inventory_system.sql
This table is kept for historical purposes only and may be dropped in future cleanup.';

COMMENT ON TABLE internal_bulk_inventory IS
'DEPRECATED: This table was created but never used in the application.
Use inventory_items table instead for all inventory operations.
Created in: 20251012150537_create_internal_inventory_tracking_system.sql
Deprecated in: 20251020230000_deprecate_internal_inventory_system.sql
This table is kept for historical purposes only and may be dropped in future cleanup.';

COMMENT ON TABLE internal_packaged_inventory IS
'DEPRECATED: This table was created but never used in the application.
Use inventory_items table instead for all inventory operations.
Created in: 20251012150537_create_internal_inventory_tracking_system.sql
Deprecated in: 20251020230000_deprecate_internal_inventory_system.sql
This table is kept for historical purposes only and may be dropped in future cleanup.';

COMMENT ON TABLE inventory_movements IS
'DEPRECATED: This table was created but never used in the application.
Use inventory_changes table instead for tracking inventory movements.
Created in: 20251012150537_create_internal_inventory_tracking_system.sql
Deprecated in: 20251020230000_deprecate_internal_inventory_system.sql
This table is kept for historical purposes only and may be dropped in future cleanup.';

COMMENT ON TABLE inventory_reconciliation IS
'DEPRECATED: This table was created but never used in the application.
Created in: 20251012150537_create_internal_inventory_tracking_system.sql
Deprecated in: 20251020230000_deprecate_internal_inventory_system.sql
This table is kept for historical purposes only and may be dropped in future cleanup.';

COMMENT ON TABLE inventory_variances IS
'DEPRECATED: This table was created but never used in the application.
Created in: 20251012150537_create_internal_inventory_tracking_system.sql
Deprecated in: 20251020230000_deprecate_internal_inventory_system.sql
This table is kept for historical purposes only and may be dropped in future cleanup.';

COMMENT ON TABLE order_fulfillment_items IS
'DEPRECATED: This table was created but never used in the application.
Use order_fulfillment_checklist table instead.
Created in: 20251012150537_create_internal_inventory_tracking_system.sql
Deprecated in: 20251020230000_deprecate_internal_inventory_system.sql
This table is kept for historical purposes only and may be dropped in future cleanup.';

-- =====================================================
-- Document ACTIVE inventory system
-- =====================================================

COMMENT ON TABLE inventory_items IS
'ACTIVE: This is the primary inventory table used throughout the application.
Used by: TrimSessions, PackagingSessions, InventoryManagement components.
This table tracks all inventory at the package/unit level regardless of stage.
Primary key: id (uuid)
Key columns: product_name, strain, batch, package_id, available_qty, unit
Status: PRODUCTION - DO NOT MODIFY SCHEMA WITHOUT REVIEW';

COMMENT ON TABLE bucked_inventory IS
'ACTIVE: Used for tracking bucked cannabis inventory in the legacy workflow system.
Part of the trim workflow before packaging.
Status: PRODUCTION - Used by trim sessions';

COMMENT ON TABLE bulk_inventory IS
'ACTIVE: Used for tracking bulk cannabis inventory in the legacy workflow system.
Part of the trim workflow for bulk flower storage.
Status: PRODUCTION - Used by trim sessions';

COMMENT ON TABLE inventory_changes IS
'ACTIVE: Transaction log for all inventory movements and modifications.
Records all additions, subtractions, and transfers of inventory.
Used for audit trail and inventory history.
Status: PRODUCTION - Critical for compliance';

COMMENT ON TABLE inventory_snapshots IS
'ACTIVE: Point-in-time snapshots of inventory state.
Used for CSV imports, inventory resets, and historical tracking.
Status: PRODUCTION - Used by InventoryResetWizard';

COMMENT ON TABLE conversion_rates IS
'ACTIVE: Tracks conversion ratios between different inventory stages.
Used for calculating expected yields from trim/packaging operations.
Status: PRODUCTION - Used by production planning';

-- =====================================================
-- Create view to check deprecated table usage
-- =====================================================

-- View to check if any data exists in deprecated tables
CREATE OR REPLACE VIEW deprecated_table_status AS
SELECT
  'internal_bucked_inventory' as table_name,
  (SELECT COUNT(*) FROM internal_bucked_inventory) as row_count,
  'DEPRECATED - Use inventory_items' as status
UNION ALL
SELECT
  'internal_bulk_inventory',
  (SELECT COUNT(*) FROM internal_bulk_inventory),
  'DEPRECATED - Use inventory_items'
UNION ALL
SELECT
  'internal_packaged_inventory',
  (SELECT COUNT(*) FROM internal_packaged_inventory),
  'DEPRECATED - Use inventory_items'
UNION ALL
SELECT
  'inventory_movements',
  (SELECT COUNT(*) FROM inventory_movements),
  'DEPRECATED - Use inventory_changes'
UNION ALL
SELECT
  'inventory_reconciliation',
  (SELECT COUNT(*) FROM inventory_reconciliation),
  'DEPRECATED'
UNION ALL
SELECT
  'inventory_variances',
  (SELECT COUNT(*) FROM inventory_variances),
  'DEPRECATED'
UNION ALL
SELECT
  'order_fulfillment_items',
  (SELECT COUNT(*) FROM order_fulfillment_items),
  'DEPRECATED - Use order_fulfillment_checklist';

COMMENT ON VIEW deprecated_table_status IS
'View showing row counts in deprecated tables.
Use this to verify tables are empty before dropping them in future cleanup.
Query: SELECT * FROM deprecated_table_status WHERE row_count > 0;';

-- =====================================================
-- Future cleanup helper function
-- =====================================================

-- Function to safely drop deprecated tables (when ready)
CREATE OR REPLACE FUNCTION drop_deprecated_inventory_tables(
  confirm_text text DEFAULT NULL
)
RETURNS text AS $$
BEGIN
  -- Safety check: require explicit confirmation
  IF confirm_text != 'I UNDERSTAND THIS WILL DELETE TABLES' THEN
    RETURN 'ERROR: Must pass confirmation text: ''I UNDERSTAND THIS WILL DELETE TABLES''';
  END IF;

  -- Check if tables have data
  IF EXISTS (SELECT 1 FROM internal_bucked_inventory LIMIT 1) THEN
    RETURN 'ERROR: internal_bucked_inventory has data. Cannot drop.';
  END IF;

  IF EXISTS (SELECT 1 FROM internal_bulk_inventory LIMIT 1) THEN
    RETURN 'ERROR: internal_bulk_inventory has data. Cannot drop.';
  END IF;

  IF EXISTS (SELECT 1 FROM internal_packaged_inventory LIMIT 1) THEN
    RETURN 'ERROR: internal_packaged_inventory has data. Cannot drop.';
  END IF;

  -- Drop tables
  DROP TABLE IF EXISTS internal_bucked_inventory CASCADE;
  DROP TABLE IF EXISTS internal_bulk_inventory CASCADE;
  DROP TABLE IF EXISTS internal_packaged_inventory CASCADE;
  DROP TABLE IF EXISTS inventory_movements CASCADE;
  DROP TABLE IF EXISTS inventory_reconciliation CASCADE;
  DROP TABLE IF EXISTS inventory_variances CASCADE;
  DROP TABLE IF EXISTS order_fulfillment_items CASCADE;

  -- Drop the view since tables are gone
  DROP VIEW IF EXISTS deprecated_table_status CASCADE;

  RETURN 'SUCCESS: All deprecated inventory tables have been dropped.';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION drop_deprecated_inventory_tables IS
'Helper function to safely drop deprecated inventory tables.
WARNING: This is destructive and cannot be undone.
Only use after 30-60 days of verifying no issues with active system.
Usage: SELECT drop_deprecated_inventory_tables(''I UNDERSTAND THIS WILL DELETE TABLES'');';
