/*
  # Add Order Total Validation and Repair Functions

  1. New Functions
    - validate_order_totals(): Returns orders where stored total doesn't match calculated total
    - repair_order_totals(): Fixes any discrepancies by recalculating all order totals
    - get_order_data_health(): Returns summary statistics of data health

  2. Purpose
    - Provide admin tools to verify data consistency
    - Enable one-click repair of any discrepancies
    - Monitor system health and data integrity

  3. Usage
    - Run SELECT * FROM validate_order_totals() to see any problematic orders
    - Run SELECT repair_order_totals() to fix all discrepancies
    - Run SELECT * FROM get_order_data_health() for health dashboard
*/

-- Function to validate order totals match sum of item subtotals
CREATE OR REPLACE FUNCTION validate_order_totals()
RETURNS TABLE(
  order_id uuid,
  order_number text,
  stored_total numeric,
  calculated_total numeric,
  difference numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id as order_id,
    o.order_number,
    o.total_amount as stored_total,
    COALESCE(SUM(oi.subtotal), 0) as calculated_total,
    o.total_amount - COALESCE(SUM(oi.subtotal), 0) as difference
  FROM orders o
  LEFT JOIN order_items oi ON o.id = oi.order_id
  GROUP BY o.id, o.order_number, o.total_amount
  HAVING o.total_amount != COALESCE(SUM(oi.subtotal), 0);
END;
$$ LANGUAGE plpgsql;

-- Function to repair all order totals
CREATE OR REPLACE FUNCTION repair_order_totals()
RETURNS TABLE(
  repaired_count integer,
  message text
) AS $$
DECLARE
  v_count integer;
BEGIN
  -- Update all orders to have correct totals
  UPDATE orders o
  SET total_amount = (
    SELECT COALESCE(SUM(oi.subtotal), 0)
    FROM order_items oi
    WHERE oi.order_id = o.id
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count, 'Successfully recalculated totals for all orders'::text;
END;
$$ LANGUAGE plpgsql;

-- Function to get overall data health statistics
CREATE OR REPLACE FUNCTION get_order_data_health()
RETURNS TABLE(
  total_orders bigint,
  orders_with_items bigint,
  orders_without_items bigint,
  orders_with_mismatched_totals bigint,
  total_revenue numeric,
  health_status text
) AS $$
DECLARE
  v_total_orders bigint;
  v_orders_with_items bigint;
  v_orders_without_items bigint;
  v_mismatched bigint;
  v_total_revenue numeric;
  v_health_status text;
BEGIN
  -- Count total active orders
  SELECT COUNT(*) INTO v_total_orders
  FROM orders
  WHERE archived = false AND status != 'cancelled';

  -- Count orders with items
  SELECT COUNT(DISTINCT o.id) INTO v_orders_with_items
  FROM orders o
  INNER JOIN order_items oi ON o.id = oi.order_id
  WHERE o.archived = false AND o.status != 'cancelled';

  -- Count orders without items
  v_orders_without_items := v_total_orders - v_orders_with_items;

  -- Count orders with mismatched totals
  SELECT COUNT(*) INTO v_mismatched
  FROM orders o
  LEFT JOIN order_items oi ON o.id = oi.order_id
  WHERE o.archived = false AND o.status != 'cancelled'
  GROUP BY o.id, o.total_amount
  HAVING o.total_amount != COALESCE(SUM(oi.subtotal), 0);

  -- Calculate total revenue
  SELECT COALESCE(SUM(total_amount), 0) INTO v_total_revenue
  FROM orders
  WHERE archived = false AND status != 'cancelled';

  -- Determine health status
  IF v_mismatched = 0 AND v_orders_without_items = 0 THEN
    v_health_status := 'HEALTHY';
  ELSIF v_mismatched > 0 THEN
    v_health_status := 'WARNING: Mismatched totals detected';
  ELSE
    v_health_status := 'CAUTION: Some orders have no items';
  END IF;

  RETURN QUERY SELECT
    v_total_orders,
    v_orders_with_items,
    v_orders_without_items,
    v_mismatched,
    v_total_revenue,
    v_health_status;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION validate_order_totals() TO authenticated;
GRANT EXECUTE ON FUNCTION repair_order_totals() TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_data_health() TO authenticated;

-- Run an initial validation and repair to ensure data is consistent
SELECT repair_order_totals();
