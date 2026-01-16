/*
  # Create Monthly Delivery Organization View

  1. Changes
    - Create view that organizes orders by delivery month
    - Orders grouped by YYYY-MM format of delivery date
    - Within each month, orders sorted by created_at (entry date)
    - Orders without delivery date default to current month
    - Includes order details, customer info, and delivery status

  2. View Fields
    - delivery_month: YYYY-MM format for grouping
    - delivery_month_name: Human-readable month name (e.g., "October 2025")
    - All order fields
    - Customer name
    - Total amount
    - Status information
    - Entry date for sorting

  3. Usage
    - Frontend can query this view to get orders organized by delivery month
    - Easy filtering by delivery_month
    - Automatic sorting by entry date within each month

  4. Security
    - Inherits RLS policies from underlying tables
*/

-- Create view for monthly delivery organization
CREATE OR REPLACE VIEW orders_by_delivery_month AS
SELECT 
  -- Month grouping fields
  COALESCE(
    TO_CHAR(o.scheduled_delivery_date, 'YYYY-MM'),
    TO_CHAR(o.requested_delivery_date, 'YYYY-MM'),
    TO_CHAR(CURRENT_DATE, 'YYYY-MM')
  ) as delivery_month,
  
  COALESCE(
    TO_CHAR(o.scheduled_delivery_date, 'Month YYYY'),
    TO_CHAR(o.requested_delivery_date, 'Month YYYY'),
    TO_CHAR(CURRENT_DATE, 'Month YYYY')
  ) as delivery_month_name,
  
  -- Order identification
  o.id,
  o.order_number,
  o.customer_id,
  c.name as customer_name,
  c.dispensary_code,
  
  -- Dates
  o.order_date,
  o.created_at as entry_date,
  o.requested_delivery_date,
  o.scheduled_delivery_date,
  
  -- Order details
  o.status,
  o.priority,
  o.total_amount,
  o.delivery_notes,
  o.internal_notes,
  o.archived,
  
  -- Computed fields for sorting
  EXTRACT(YEAR FROM COALESCE(o.scheduled_delivery_date, o.requested_delivery_date, CURRENT_DATE)) as delivery_year,
  EXTRACT(MONTH FROM COALESCE(o.scheduled_delivery_date, o.requested_delivery_date, CURRENT_DATE)) as delivery_month_num,
  
  -- Item count
  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
  
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
WHERE o.archived = false OR o.archived IS NULL
ORDER BY 
  delivery_year DESC, 
  delivery_month_num DESC, 
  o.created_at DESC;

-- Grant access to anon users (matches existing RLS policies)
GRANT SELECT ON orders_by_delivery_month TO anon;
GRANT SELECT ON orders_by_delivery_month TO authenticated;
