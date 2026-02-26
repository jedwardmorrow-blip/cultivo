/*
  # Expand CRM Customer Summary View with Address & Compliance Fields

  1. Modified Views
    - `crm_customer_summary` — Dropped and recreated to add address, delivery
      address, ATO number, credit limit, account credit balance, notes, and
      postal code columns from the customers table.

  2. New Columns Exposed
    - `address` (text) — Primary street address
    - `postal_code` (text) — Primary postal code
    - `delivery_address` (text) — Legacy delivery street address
    - `delivery_city` (text) — Legacy delivery city
    - `delivery_state` (text) — Legacy delivery state
    - `delivery_postal_code` (text) — Legacy delivery postal code
    - `ato_number` (text) — AZDHS Transport Order number
    - `credit_limit` (numeric) — Optional credit cap
    - `account_credit_balance` (numeric) — Store credit available
    - `notes` (text) — Additional customer notes

  3. Important Notes
    - View is dropped and recreated to allow column reordering
    - All computed/aggregated columns remain unchanged
    - No data is modified
*/

DROP VIEW IF EXISTS crm_customer_summary;

CREATE VIEW crm_customer_summary AS
SELECT
  c.id,
  c.name,
  c.dispensary_code,
  c.account_type,
  c.account_status,
  c.parent_customer_id,
  c.delivery_model,
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
  c.address,
  c.postal_code,
  c.delivery_address,
  c.delivery_city,
  c.delivery_state,
  c.delivery_postal_code,
  c.ato_number,
  c.credit_limit,
  c.account_credit_balance,
  c.notes,
  COALESCE(os.order_count, 0) AS order_count,
  COALESCE(os.total_revenue, 0::numeric) AS total_revenue,
  COALESCE(os.avg_order_value, 0::numeric) AS avg_order_value,
  os.first_order_date,
  os.last_order_date,
  CASE
    WHEN os.last_order_date IS NOT NULL
    THEN EXTRACT(day FROM now() - os.last_order_date)::integer
    ELSE NULL::integer
  END AS days_since_last_order,
  COALESCE(os.completed_orders, 0) AS completed_orders,
  COALESCE(os.open_orders, 0) AS open_orders,
  COALESCE(os.open_order_value, 0::numeric) AS open_order_value,
  COALESCE(cc.contact_count, 0) AS contact_count,
  (SELECT count(*) FROM customers ch WHERE ch.parent_customer_id = c.id) AS child_account_count,
  COALESCE(cs.child_total_revenue, 0::numeric) AS child_total_revenue,
  COALESCE(cs.child_total_orders, 0) AS child_total_orders
FROM customers c
LEFT JOIN LATERAL (
  SELECT
    count(*)::integer AS order_count,
    sum(o.total_amount) AS total_revenue,
    avg(o.total_amount) AS avg_order_value,
    min(o.order_date) AS first_order_date,
    max(o.order_date) AS last_order_date,
    count(*) FILTER (WHERE o.status = 'completed')::integer AS completed_orders,
    count(*) FILTER (WHERE o.status NOT IN ('completed', 'cancelled') AND o.archived = false)::integer AS open_orders,
    sum(o.total_amount) FILTER (WHERE o.status NOT IN ('completed', 'cancelled') AND o.archived = false) AS open_order_value
  FROM orders o
  WHERE o.customer_id = c.id AND o.test_mode = false
) os ON true
LEFT JOIN LATERAL (
  SELECT count(*)::integer AS contact_count
  FROM customer_contacts ct
  WHERE ct.customer_id = c.id
) cc ON true
LEFT JOIN LATERAL (
  SELECT
    COALESCE(sum(child_o.total_amount), 0::numeric) AS child_total_revenue,
    count(child_o.id)::integer AS child_total_orders
  FROM customers child
  JOIN orders child_o ON child_o.customer_id = child.id AND child_o.test_mode = false AND child_o.archived = false
  WHERE child.parent_customer_id = c.id
) cs ON true;
