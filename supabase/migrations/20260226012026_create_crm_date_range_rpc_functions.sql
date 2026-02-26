/*
  # CRM Date Range RPC Functions

  Creates four parameterized RPC functions for date-filtered CRM analytics.
  These complement the existing all-time views (which remain intact for health scores, sparklines, etc.)

  1. New Functions
    - `crm_dashboard_stats_by_range(p_start_date, p_end_date)` - Dashboard stats with period comparison
    - `crm_top_accounts_by_range(p_start_date, p_end_date)` - Top accounts by revenue within date range
    - `crm_sku_performance_by_range(p_start_date, p_end_date)` - SKU performance within date range
    - `crm_product_mix_by_customer_range(p_customer_id, p_start_date, p_end_date)` - Per-account product mix within date range

  2. Security
    - All functions use SECURITY INVOKER (runs as calling user)
    - All functions filter test_mode = false and archived = false

  3. Notes
    - Leverages existing idx_orders_order_date index
    - Dashboard stats function includes automatic previous-period comparison
    - All existing views remain unchanged
*/

-- Dashboard stats with automatic previous-period comparison
CREATE OR REPLACE FUNCTION crm_dashboard_stats_by_range(
  p_start_date date,
  p_end_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  result json;
  period_days integer;
  prev_start date;
  prev_end date;
BEGIN
  period_days := p_end_date - p_start_date;
  prev_end := p_start_date - 1;
  prev_start := prev_end - period_days;

  SELECT json_build_object(
    'period_revenue', COALESCE(curr.revenue, 0),
    'period_orders', COALESCE(curr.order_count, 0),
    'period_avg_order', CASE WHEN COALESCE(curr.order_count, 0) > 0 
      THEN ROUND(COALESCE(curr.revenue, 0) / curr.order_count, 2) ELSE 0 END,
    'prev_period_revenue', COALESCE(prev.revenue, 0),
    'prev_period_orders', COALESCE(prev.order_count, 0),
    'prev_period_avg_order', CASE WHEN COALESCE(prev.order_count, 0) > 0 
      THEN ROUND(COALESCE(prev.revenue, 0) / prev.order_count, 2) ELSE 0 END,
    'active_accounts', COALESCE(accts.active_count, 0),
    'total_accounts', COALESCE(accts.total_count, 0),
    'at_risk_count', COALESCE(accts.at_risk_count, 0),
    'prospect_count', COALESCE(accts.prospect_count, 0),
    'unique_customers_in_period', COALESCE(curr.unique_customers, 0)
  ) INTO result
  FROM
    (SELECT 
      SUM(total_amount) AS revenue,
      COUNT(*)::int AS order_count,
      COUNT(DISTINCT customer_id)::int AS unique_customers
     FROM orders
     WHERE test_mode = false AND archived = false
       AND order_date::date >= p_start_date AND order_date::date <= p_end_date
    ) curr,
    (SELECT
      SUM(total_amount) AS revenue,
      COUNT(*)::int AS order_count
     FROM orders
     WHERE test_mode = false AND archived = false
       AND order_date::date >= prev_start AND order_date::date <= prev_end
    ) prev,
    (SELECT
      COUNT(*) FILTER (WHERE account_status = 'active')::int AS active_count,
      COUNT(*)::int AS total_count,
      COUNT(*) FILTER (
        WHERE account_status = 'active'
        AND (SELECT MAX(o.order_date) FROM orders o WHERE o.customer_id = c.id AND o.test_mode = false) < now() - interval '30 days'
      )::int AS at_risk_count,
      COUNT(*) FILTER (WHERE account_status = 'prospect')::int AS prospect_count
     FROM customers c
    ) accts;

  RETURN result;
END;
$$;

-- Top accounts by revenue within a date range
CREATE OR REPLACE FUNCTION crm_top_accounts_by_range(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  id uuid,
  name text,
  dispensary_code text,
  account_type text,
  account_status text,
  parent_customer_id uuid,
  period_revenue numeric,
  period_orders integer,
  period_avg_order numeric,
  last_order_in_period date,
  child_period_revenue numeric,
  child_period_orders integer,
  total_revenue numeric,
  days_since_last_order integer
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.dispensary_code,
    c.account_type,
    c.account_status,
    c.parent_customer_id,
    COALESCE(direct.revenue, 0) AS period_revenue,
    COALESCE(direct.order_count, 0)::integer AS period_orders,
    CASE WHEN COALESCE(direct.order_count, 0) > 0
      THEN ROUND(COALESCE(direct.revenue, 0) / direct.order_count, 2)
      ELSE 0 END AS period_avg_order,
    direct.last_order::date AS last_order_in_period,
    COALESCE(child.revenue, 0) AS child_period_revenue,
    COALESCE(child.order_count, 0)::integer AS child_period_orders,
    COALESCE(alltime.revenue, 0) AS total_revenue,
    EXTRACT(day FROM now() - alltime.last_order)::integer AS days_since_last_order
  FROM customers c
  LEFT JOIN LATERAL (
    SELECT
      SUM(o.total_amount) AS revenue,
      COUNT(*)::int AS order_count,
      MAX(o.order_date) AS last_order
    FROM orders o
    WHERE o.customer_id = c.id
      AND o.test_mode = false AND o.archived = false
      AND o.order_date::date >= p_start_date AND o.order_date::date <= p_end_date
  ) direct ON true
  LEFT JOIN LATERAL (
    SELECT
      SUM(o.total_amount) AS revenue,
      COUNT(*)::int AS order_count
    FROM orders o
    WHERE o.customer_id IN (
      SELECT ch.id FROM customers ch WHERE ch.parent_customer_id = c.id
    )
    AND o.test_mode = false AND o.archived = false
    AND o.order_date::date >= p_start_date AND o.order_date::date <= p_end_date
  ) child ON c.account_type = 'hub_parent'
  LEFT JOIN LATERAL (
    SELECT
      SUM(o.total_amount) AS revenue,
      MAX(o.order_date) AS last_order
    FROM orders o
    WHERE o.customer_id = c.id
      AND o.test_mode = false
  ) alltime ON true
  WHERE c.account_type != 'hub_child'
    AND (COALESCE(direct.order_count, 0) > 0 OR COALESCE(child.order_count, 0) > 0 OR COALESCE(alltime.revenue, 0) > 0)
  ORDER BY (COALESCE(direct.revenue, 0) + COALESCE(child.revenue, 0)) DESC
  LIMIT 15;
END;
$$;

-- SKU performance within a date range
CREATE OR REPLACE FUNCTION crm_sku_performance_by_range(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  sku text,
  product_type text,
  product_category text,
  strain text,
  order_count integer,
  total_units_sold numeric,
  total_revenue numeric,
  avg_unit_price numeric,
  unique_customers integer
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
BEGIN
  RETURN QUERY
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
    ROUND(AVG(oi.unit_price), 2) AS avg_unit_price,
    COUNT(DISTINCT o.customer_id)::int AS unique_customers
  FROM order_items oi
  JOIN products p ON oi.product_id = p.id
  JOIN orders o ON oi.order_id = o.id
    AND o.test_mode = false AND o.archived = false
    AND o.order_date::date >= p_start_date AND o.order_date::date <= p_end_date
  GROUP BY p.id, p.name, p.sku, p.type, p.product_category, p.strain
  ORDER BY SUM(oi.subtotal) DESC
  LIMIT 50;
END;
$$;

-- Per-customer product mix within a date range
CREATE OR REPLACE FUNCTION crm_product_mix_by_customer_range(
  p_customer_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  customer_id uuid,
  customer_name text,
  product_id uuid,
  product_name text,
  product_type text,
  product_category text,
  strain text,
  total_units integer,
  total_revenue numeric,
  avg_unit_price numeric,
  first_order_date date,
  last_order_date date,
  order_count integer
)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS customer_id,
    c.name AS customer_name,
    p.id AS product_id,
    p.name AS product_name,
    p.type AS product_type,
    p.product_category,
    oi.strain,
    SUM(oi.quantity)::integer AS total_units,
    SUM(oi.subtotal)::numeric AS total_revenue,
    ROUND(AVG(oi.unit_price), 2)::numeric AS avg_unit_price,
    MIN(o.order_date)::date AS first_order_date,
    MAX(o.order_date)::date AS last_order_date,
    COUNT(DISTINCT o.id)::integer AS order_count
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
    AND o.test_mode = false AND o.archived = false
    AND o.order_date::date >= p_start_date AND o.order_date::date <= p_end_date
  JOIN customers c ON c.id = o.customer_id
  JOIN products p ON p.id = oi.product_id
  WHERE c.id = p_customer_id
  GROUP BY c.id, c.name, p.id, p.name, p.type, p.product_category, oi.strain
  ORDER BY SUM(oi.subtotal) DESC;
END;
$$;
