/*
  # Remove Legacy Allocation System

  This migration removes the entirely defunct legacy allocation system that was superseded
  by the event-driven inventory architecture and the package_assignments table.

  ## What is being removed

  1. **Triggers** (on orders, order_item_allocations, trim_sessions, packaging_sessions)
     - `order_status_change_trigger` → called `handle_order_status_change` which deducted from legacy tables
     - `allocation_fulfillment_update_trigger` → updated `order_fulfillment_checklist` from legacy allocations
     - `trim_session_allocation_link_trigger` → linked trim sessions to legacy allocations
     - `packaging_session_allocation_link_trigger` → linked packaging sessions to legacy allocations

  2. **Functions** (all orphaned — no app code calls them)
     - `handle_order_status_change` — orchestrated legacy deduction/restoration
     - `deduct_inventory_for_order` — deducted from internal_bulk/packaged_inventory
     - `restore_inventory_for_order` — restored to internal_bulk/packaged_inventory
     - `update_fulfillment_allocation_status` — synced fulfillment checklist from allocations
     - `update_fulfillment_from_allocations` — duplicate of above
     - `update_allocation_workflow_stage` — manual stage updates
     - `link_allocations_to_trim_session` — auto-linked allocations on trim start
     - `update_allocations_on_trim_complete` — updated allocations on trim complete
     - `link_allocations_to_packaging_session` — auto-linked allocations on packaging start
     - `update_allocations_on_packaging_complete` — updated allocations on packaging complete

  3. **Tables** (all have zero active usage in application code)
     - `order_item_allocations` — 2 stale rows, replaced by package_assignments
     - `inventory_transactions` — 0 rows, replaced by inventory_movements ledger

  4. **Function update**
     - `validate_ready_for_delivery` — simplified to skip legacy fulfillment checklist validation
       (will be replaced with package_assignments-based validation in next migration)

  ## Safety notes
  - Application code was audited: zero service/hook/component calls to any of these
  - Only invoiceService.ts and manifestService.ts queried order_item_allocations (migrated separately)
  - internal_bulk_inventory and internal_packaged_inventory are NOT dropped here (data preservation)
*/

-- ============================================================
-- 1. Drop triggers
-- ============================================================
DROP TRIGGER IF EXISTS order_status_change_trigger ON orders;
DROP TRIGGER IF EXISTS allocation_fulfillment_update_trigger ON order_item_allocations;
DROP TRIGGER IF EXISTS trim_session_allocation_link_trigger ON trim_sessions;
DROP TRIGGER IF EXISTS packaging_session_allocation_link_trigger ON packaging_sessions;

-- ============================================================
-- 2. Drop functions
-- ============================================================
DROP FUNCTION IF EXISTS handle_order_status_change() CASCADE;
DROP FUNCTION IF EXISTS deduct_inventory_for_order(uuid) CASCADE;
DROP FUNCTION IF EXISTS restore_inventory_for_order(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_fulfillment_allocation_status() CASCADE;
DROP FUNCTION IF EXISTS update_fulfillment_from_allocations() CASCADE;
DROP FUNCTION IF EXISTS update_allocation_workflow_stage(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS link_allocations_to_trim_session() CASCADE;
DROP FUNCTION IF EXISTS update_allocations_on_trim_complete() CASCADE;
DROP FUNCTION IF EXISTS link_allocations_to_packaging_session() CASCADE;
DROP FUNCTION IF EXISTS update_allocations_on_packaging_complete() CASCADE;

-- ============================================================
-- 3. Drop legacy tables
-- ============================================================
DROP TABLE IF EXISTS order_item_allocations CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;

-- ============================================================
-- 4. Simplify validate_ready_for_delivery
--    The legacy version required all fulfillment checklist booleans to be true.
--    The new version just validates the order isn't already completed.
--    Full validation via package_assignments is added in the next migration.
-- ============================================================
CREATE OR REPLACE FUNCTION validate_ready_for_delivery(order_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  order_status_current text;
BEGIN
  SELECT status INTO order_status_current
  FROM orders
  WHERE id = order_id_param;

  IF order_status_current = 'completed' THEN
    RAISE EXCEPTION 'Cannot mark completed orders as ready for delivery';
  END IF;

  RETURN true;
END;
$$;
