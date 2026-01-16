/*
  # Add Order Source Tracking

  1. Changes
    - Add order_source column to orders table
    - Backfill existing orders based on internal_notes
    - Update order_pipeline view to include order_source
    - Add index for better query performance

  2. Order Sources
    - 'manual': Orders created through the application
    - 'dutchie': Orders imported from Dutchie
    - 'import': Orders imported from other sources

  3. Security
    - No RLS changes needed (inherits from orders table)
*/

-- Add order_source column with default value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_source'
  ) THEN
    ALTER TABLE orders
    ADD COLUMN order_source text DEFAULT 'manual'
    CHECK (order_source IN ('manual', 'dutchie', 'import'));
  END IF;
END $$;

-- Backfill existing orders: set order_source to 'dutchie' if internal_notes contains 'Imported from Dutchie'
UPDATE orders
SET order_source = 'dutchie'
WHERE internal_notes ILIKE '%Imported from Dutchie%'
  AND order_source = 'manual';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(order_source);

-- Update order_pipeline view to include order_source
DROP VIEW IF EXISTS order_pipeline;

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
  o.order_source,
  c.name as customer_name,
  o.total_amount,
  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
ORDER BY o.created_at DESC;

-- Grant access to authenticated and anon users
GRANT SELECT ON order_pipeline TO authenticated;
GRANT SELECT ON order_pipeline TO anon;
