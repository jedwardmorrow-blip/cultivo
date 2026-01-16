/*
  # Fix order_pipeline view to include scheduled_delivery_date

  1. Changes
    - Drop and recreate the order_pipeline view
    - Add scheduled_delivery_date column from orders table
    - This ensures month grouping works correctly based on scheduled dates
*/

-- Drop the existing view
DROP VIEW IF EXISTS order_pipeline;

-- Recreate the view with scheduled_delivery_date
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
  COALESCE(SUM(oi.subtotal), 0) as total_amount,
  COUNT(oi.id) as item_count
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, c.name;
