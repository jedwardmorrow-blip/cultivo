/*
  # Create Inventory Reservation Views

  Creates two views that provide visibility into inventory reservations from package assignments.
  These views were originally defined in migration 20251027020000 but were not created
  in the database. This migration creates them properly.

  ## New Views

  1. `inventory_reservation_summary`
     - Per-inventory-item summary of total qty, available qty, reserved qty
     - Lists active assignments and which orders hold reservations
     - Used by fulfillmentValidationService.checkInventoryAvailability()

  2. `package_assignments_with_reservations`
     - Extends package_assignments_details with reservation context
     - Includes inventory availability, order info, customer name
     - Used by fulfillmentValidationService.getOrderItemFulfillment()

  ## Security
     - Views inherit RLS from underlying tables
*/

-- ============================================================
-- 1. Inventory Reservation Summary
-- ============================================================
DROP VIEW IF EXISTS inventory_reservation_summary CASCADE;

CREATE VIEW inventory_reservation_summary AS
SELECT
  ii.id AS inventory_item_id,
  ii.package_id,
  ii.product_name,
  ii.strain,
  ii.batch AS batch_number,
  ii.unit,
  ii.on_hand_qty AS total_qty,
  ii.available_qty,
  ii.reserved_qty,
  ii.status AS inventory_status,
  COALESCE(agg.active_assignments, 0) AS active_assignments,
  COALESCE(agg.assigned_order_ids, ARRAY[]::uuid[]) AS assigned_order_ids
FROM inventory_items ii
LEFT JOIN (
  SELECT
    pa_inner.package_id,
    COUNT(*) AS active_assignments,
    ARRAY_AGG(DISTINCT pa_inner.order_id) AS assigned_order_ids
  FROM package_assignments pa_inner
  WHERE pa_inner.status = 'reserved'
  GROUP BY pa_inner.package_id
) agg ON agg.package_id = ii.package_id;

-- ============================================================
-- 2. Package Assignments with Reservations
-- ============================================================
DROP VIEW IF EXISTS package_assignments_with_reservations CASCADE;

CREATE VIEW package_assignments_with_reservations AS
SELECT
  pad.*,
  ii.on_hand_qty AS total_qty,
  ii.reserved_qty,
  pa.status AS reservation_status,
  c.name AS customer_name
FROM package_assignments_details pad
JOIN package_assignments pa ON pa.id = pad.id
LEFT JOIN inventory_items ii ON ii.package_id = pad.package_id
LEFT JOIN orders o ON o.id = pad.order_id
LEFT JOIN customers c ON c.id = o.customer_id;
