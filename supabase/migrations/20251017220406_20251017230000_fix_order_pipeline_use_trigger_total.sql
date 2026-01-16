/*
  # Fix order_pipeline view to use trigger-maintained total_amount

  1. Problem
    - order_pipeline view was calculating total_amount using COALESCE(SUM(oi.subtotal), 0)
    - This caused GROUP BY aggregation and could differ from trigger-maintained o.total_amount
    - Different calculation methods led to inconsistent totals across Dashboard and Orders sections

  2. Solution
    - Use o.total_amount directly (maintained by update_order_total() trigger)
    - Remove SUM aggregation and GROUP BY
    - Simplify query for better performance
    - Establish single source of truth for order totals

  3. Benefits
    - Consistent totals across all views and components
    - Faster query performance (no aggregation needed)
    - Real-time accuracy via trigger updates
    - Single calculation method throughout application

  4. Notes
    - The update_order_total() trigger automatically updates orders.total_amount
      whenever order_items are inserted, updated, or deleted
    - This ensures total_amount is always current without manual recalculation
    - Frontend real-time subscriptions will detect changes and refresh automatically
*/

-- Drop the existing view
DROP VIEW IF EXISTS order_pipeline;

-- Recreate the view using trigger-maintained total_amount
CREATE VIEW order_pipeline AS
SELECT
  o.id,
  o.order_number,
  o.status,
  o.priority,
  o.requested_delivery_date,
  o.scheduled_delivery_date,
  o.delivery_notes,
  o.internal_notes,
  o.created_at,
  o.updated_at,
  o.archived,
  c.name as customer_name,
  o.total_amount,
  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
ORDER BY o.created_at DESC;

-- Grant access to authenticated users
GRANT SELECT ON order_pipeline TO authenticated;
