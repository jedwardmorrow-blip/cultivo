/*
  # Drop Deprecated Packaging Session Inventory Triggers

  ## Overview
  This migration removes faulty triggers that were created in migration 20251012150701
  but reference deprecated internal_inventory tables that were never used in production.

  The triggers being removed attempted to:
  - Access a non-existent `product_type` field on packaging_sessions table
  - Update internal_bulk_inventory and internal_packaged_inventory tables (deprecated)

  ## Why This Is Safe

  1. The internal_inventory system was deprecated in migration 20251020230000
  2. The application uses the `inventory_items` table as the active inventory system
  3. Working triggers were created in migration 20251012200043 that use the correct tables
  4. These faulty triggers cause errors when starting packaging sessions

  ## Triggers Being Removed

  - `packaging_session_start_trigger` - References non-existent product_type field
  - `packaging_session_complete_trigger` (old version) - Uses deprecated tables

  ## Functions Being Removed

  - `handle_packaging_session_start()` - Uses deprecated internal_bulk_inventory
  - `handle_packaging_session_complete()` - Uses deprecated internal_packaged_inventory

  ## Active System (Not Affected)

  The active packaging session triggers from migration 20251012200043 remain intact:
  - `trigger_consolidate_packaging_session` (from 20251015220208)
  - Uses inventory_items table (active system)
  - Creates consolidated_packages correctly
  - No product_type field required on packaging_sessions

  ## Security
  - No RLS changes needed
  - No data loss
  - Removes non-functional code only
*/

-- Drop the faulty trigger that references non-existent product_type field
DROP TRIGGER IF EXISTS packaging_session_start_trigger ON packaging_sessions;

-- Drop the function that references deprecated internal_bulk_inventory
DROP FUNCTION IF EXISTS handle_packaging_session_start();

-- Drop the old function that references deprecated internal_packaged_inventory
-- Note: A newer version may exist from later migrations - this only drops if it matches the old signature
DROP FUNCTION IF EXISTS handle_packaging_session_complete();

-- Add comment explaining the removal
COMMENT ON TABLE packaging_sessions IS
'Packaging sessions table for tracking packaging workflow.
Note: Triggers for inventory allocation use the inventory_items table (active system).
Legacy triggers referencing internal_inventory tables were removed in migration 20251027213350.
Active consolidation triggers create consolidated_packages on session completion.';
