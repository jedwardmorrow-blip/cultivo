/*
  # Create Inventory Reservation System

  ## Overview
  Implements hard inventory reservations to prevent double-allocation of inventory packages
  to multiple order items. When a package is assigned to an order, the quantity is reserved
  and deducted from available inventory. Reservations are automatically released when
  assignments are removed or orders are cancelled.

  ## 1. Schema Changes
     - Add `reserved_qty` to inventory_items to track reserved quantities
     - Add `reservation_status` enum to package_assignments for tracking state
     - Create `inventory_reservations` audit table for tracking reservation history

  ## 2. Reservation Logic
     - When package assigned: reserve quantity, reduce available_qty
     - When assignment removed: release quantity, restore available_qty
     - When order cancelled: release all reservations for that order
     - Prevent over-allocation via CHECK constraints

  ## 3. Triggers
     - Auto-reserve on package_assignments INSERT
     - Auto-release on package_assignments DELETE
     - Auto-release-all on orders status = 'cancelled'
     - Update inventory_items.reserved_qty automatically

  ## 4. Validation
     - Constraint: available_qty >= 0 (prevent over-allocation)
     - Constraint: reserved_qty >= 0 (no negative reservations)
     - Constraint: reserved_qty <= total quantity
     - Function: check_inventory_availability before assignment

  ## 5. Security
     - RLS enabled on all new tables
     - Authenticated users can view/manage reservations
     - Audit trail tracks all reservation changes
*/

-- =====================================================
-- SECTION 1: Add Reserved Quantity to Inventory Items
-- =====================================================

-- Add reserved_qty column to track reserved inventory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'reserved_qty'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN reserved_qty numeric DEFAULT 0 NOT NULL;
  END IF;
END $$;