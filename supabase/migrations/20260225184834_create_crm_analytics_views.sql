/*
  # Create CRM Analytics Views

  1. New Views
    - `crm_customer_summary` - Aggregated per-customer metrics (orders, revenue, avg order, dates)
    - `crm_monthly_revenue_by_customer` - Monthly revenue breakdown per customer
    - `crm_sku_performance` - Product/SKU-level sales analytics
    - `crm_revenue_pipeline` - Open orders by customer with expected value

  2. Important Notes
    - All views filter out test_mode orders
    - Revenue calculations use order total_amount
    - Views are read-only analytics, no data modification
    - crm_customer_summary includes days_since_last_order for at-risk detection
*/

-- ============================================================
-- 1. CRM Customer Summary - one row per customer with all key metrics
-- ============================================================

CREATE OR REPLACE VIEW crm_customer_summary AS
SELECT
  c.id,
  c.name,
  c.dispensary_code,
  c.account_type,
  c.account_status,
  c.parent_customer_id,
  c.city,
  c.state,
  c.tags,
  c.default_payment_terms,
  c.preferred_delivery_day,
  c.contact_name,
  c.email,
  c.phone,
  c.license_number,
  c.license_name,
  COALESCE(os.order_count, 0) AS order_count,
  COALESCE(os.total_revenue, 0) AS total_revenue,
  COALESCE(os.avg_order_value, 0) AS avg_order_value,
  os.first_order_date,
  os.last_order_date,
  CASE
    WHEN os.last_order_date IS NOT NULL
    THEN EXTRACT(DAY FROM now() - os.last_order_date)::int
    ELSE NULL
  END AS days_since_last_order,
  COALESCE(os.completed_orders, 0) AS completed_orders,
  COALESCE(os.open_orders, 0) AS open_orders,
  COALESCE(os.open_order_value, 0) AS open_order_value,
  COALESCE(cc.contact_count, 0) AS contact_count,
  (SELECT COUNT(*) FROM customers ch WHERE ch.parent_customer_id = c.id) AS child_account_count
FROM customers c
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS order_count,
    SUM(o.total_amount) AS total_revenue,
    AVG(o.total_amount) AS avg_order_value,
    MIN(o.order_date) AS first_order_date,
    MAX(o.order_date) AS last_order_date,
    COUNT(*) FILTER (WHERE o.status = 'completed')::int AS completed_orders,
    COUNT(*) FILTER (WHERE o.status NOT IN ('completed', 'cancelled') AND o.archived = false)::int AS open_orders,
    SUM(o.total_amount) FILTER (WHERE o.status NOT IN ('completed', 'cancelled') AND o.archived = false) AS open_order_value
  FROM orders o
  WHERE o.customer_id = c.id AND o.test_mode = false
) os ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS contact_count
  FROM customer_contacts ct
  WHERE ct.customer_id = c.id
) cc ON true;

-- ============================================================
-- 2. CRM Monthly Revenue by Customer
-- ============================================================

CREATE OR REPLACE VIEW crm_monthly_revenue_by_customer AS
SELECT
  c.id AS customer_id,
  c.name AS customer_name,
  c.dispensary_code,
  date_trunc('month', o.order_date)::date AS month,
  COUNT(DISTINCT o.id)::int AS order_count,
  SUM(o.total_amount) AS monthly_revenue,
  SUM(SUM(o.total_amount)) OVER (
    PARTITION BY c.id ORDER BY date_trunc('month', o.order_date)
  ) AS cumulative_revenue
FROM customers c
JOIN orders o ON o.customer_id = c.id AND o.test_mode = false AND o.archived = false
GROUP BY c.id, c.name, c.dispensary_code, date_trunc('month', o.order_date)
ORDER BY c.name, month;

-- ============================================================
-- 3. CRM SKU Performance
-- ============================================================

CREATE OR REPLACE VIEW crm_sku_performance AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.sku,
  p.type AS product_type,
  p.product_category,
  p.strain,
  COUNT(DISTINCT oi.order_id)::int AS order_count,
  SUM(oi.quantity) AS total_units_sold,
  SUM(oi.subtotal) AS total_revenue,
  AVG(oi.unit_price) AS avg_unit_price,
  COUNT(DISTINCT o.customer_id)::int AS unique_customers,
  MIN(o.order_date) AS first_sold_date,
  MAX(o.order_date) AS last_sold_date
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN orders o ON oi.order_id = o.id AND o.test_mode = false
GROUP BY p.id, p.name, p.sku, p.type, p.product_category, p.strain
ORDER BY total_revenue DESC;

-- ============================================================
-- 4. CRM Revenue Pipeline - open orders by customer
-- ============================================================

CREATE OR REPLACE VIEW crm_revenue_pipeline AS
SELECT
  c.id AS customer_id,
  c.name AS customer_name,
  c.dispensary_code,
  o.id AS order_id,
  o.order_number,
  o.status,
  o.total_amount,
  o.order_date,
  o.requested_delivery_date,
  o.scheduled_delivery_date
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.test_mode = false
  AND o.archived = false
  AND o.status NOT IN ('completed', 'cancelled')
ORDER BY o.requested_delivery_date NULLS LAST, o.order_date;
