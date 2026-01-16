/*
  # Update order_pipeline view to include archived column

  1. Changes
    - Drop and recreate the order_pipeline view
    - Add archived column from orders table
    - Maintain all existing columns and functionality
*/

-- Drop the existing view
DROP VIEW IF EXISTS order_pipeline;

-- Recreate the view with archived column
CREATE VIEW order_pipeline AS
SELECT 
  o.id,
  o.order_number,
  o.status,
  o.priority,
  o.requested_delivery_date,
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