/*
  # Trigger Monitoring and Statistics

  1. Purpose
    - Monitor trigger performance
    - Track movement statistics
    - Provide health check functions
    - Enable operational visibility

  2. Components
    - Movement statistics view
    - Trigger health check function
    - Performance monitoring functions
    - Error rate tracking

  3. Usage
    - Operations team can monitor trigger health
    - Identify performance bottlenecks
    - Track error rates and patterns
    - Support capacity planning

  4. Notes
    - Part of Phase 6: Database Triggers
    - Provides operational visibility
    - Supports performance tuning
*/

-- View: Movement statistics by kind
CREATE OR REPLACE VIEW v_movement_stats AS
SELECT
  movement_kind,
  COUNT(*) as total_count,
  SUM(qty) as total_qty,
  AVG(qty) as avg_qty,
  MIN(qty) as min_qty,
  MAX(qty) as max_qty,
  COUNT(DISTINCT COALESCE(source_item_id, dest_item_id)) as unique_items,
  COUNT(DISTINCT DATE(created_at)) as active_days,
  MIN(created_at) as first_movement,
  MAX(created_at) as last_movement
FROM inventory_movements
GROUP BY movement_kind
ORDER BY total_count DESC;

COMMENT ON VIEW v_movement_stats IS
  'Aggregate statistics for movements by kind';

GRANT SELECT ON v_movement_stats TO authenticated;

-- View: Daily movement volume
CREATE OR REPLACE VIEW v_daily_movement_volume AS
SELECT
  DATE(created_at) as movement_date,
  movement_kind,
  COUNT(*) as count,
  SUM(qty) as total_qty,
  AVG(qty) as avg_qty
FROM inventory_movements
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), movement_kind
ORDER BY movement_date DESC, count DESC;

COMMENT ON VIEW v_daily_movement_volume IS
  'Daily movement volume for last 30 days';

GRANT SELECT ON v_daily_movement_volume TO authenticated;

-- View: Error rate tracking
CREATE OR REPLACE VIEW v_movement_error_rate AS
WITH error_counts AS (
  SELECT
    DATE(created_at) as error_date,
    COUNT(*) as error_count
  FROM inventory_movement_errors
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(created_at)
),
movement_counts AS (
  SELECT
    DATE(created_at) as movement_date,
    COUNT(*) as movement_count
  FROM inventory_movements
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(created_at)
)
SELECT
  COALESCE(mc.movement_date, ec.error_date) as date,
  COALESCE(mc.movement_count, 0) as total_movements,
  COALESCE(ec.error_count, 0) as total_errors,
  CASE
    WHEN COALESCE(mc.movement_count, 0) > 0
    THEN ROUND((COALESCE(ec.error_count, 0)::numeric / mc.movement_count) * 100, 2)
    ELSE 0
  END as error_percentage
FROM movement_counts mc
FULL OUTER JOIN error_counts ec ON mc.movement_date = ec.error_date
ORDER BY date DESC;

COMMENT ON VIEW v_movement_error_rate IS
  'Daily error rate for movement processing (last 30 days)';

GRANT SELECT ON v_movement_error_rate TO authenticated;

-- Function: Trigger health check
CREATE OR REPLACE FUNCTION check_trigger_health()
RETURNS TABLE (
  trigger_name text,
  status text,
  enabled boolean,
  last_execution timestamptz,
  total_movements bigint,
  movements_last_24h bigint,
  errors_last_24h bigint,
  error_rate_24h numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'trg_update_inventory_on_hand'::text as trigger_name,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_update_inventory_on_hand'
        AND tgenabled != 'D'
      ) THEN 'HEALTHY'
      ELSE 'DISABLED'
    END as status,
    EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_update_inventory_on_hand'
      AND tgenabled != 'D'
    ) as enabled,
    (SELECT MAX(created_at) FROM inventory_movements) as last_execution,
    (SELECT COUNT(*) FROM inventory_movements) as total_movements,
    (SELECT COUNT(*) FROM inventory_movements WHERE created_at >= NOW() - INTERVAL '24 hours') as movements_last_24h,
    (SELECT COUNT(*) FROM inventory_movement_errors WHERE created_at >= NOW() - INTERVAL '24 hours') as errors_last_24h,
    CASE
      WHEN (SELECT COUNT(*) FROM inventory_movements WHERE created_at >= NOW() - INTERVAL '24 hours') > 0
      THEN ROUND(
        (SELECT COUNT(*) FROM inventory_movement_errors WHERE created_at >= NOW() - INTERVAL '24 hours')::numeric /
        (SELECT COUNT(*) FROM inventory_movements WHERE created_at >= NOW() - INTERVAL '24 hours') * 100,
        2
      )
      ELSE 0
    END as error_rate_24h;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_trigger_health IS
  'Returns health status of movement triggers and error rates';

GRANT EXECUTE ON FUNCTION check_trigger_health TO authenticated;

-- Function: Get movement processing metrics
CREATE OR REPLACE FUNCTION get_movement_metrics(p_hours integer DEFAULT 24)
RETURNS TABLE (
  time_bucket text,
  movement_count bigint,
  avg_qty numeric,
  error_count bigint,
  success_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH hourly_movements AS (
    SELECT
      DATE_TRUNC('hour', created_at) as hour,
      COUNT(*) as count,
      AVG(qty) as avg_quantity
    FROM inventory_movements
    WHERE created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY DATE_TRUNC('hour', created_at)
  ),
  hourly_errors AS (
    SELECT
      DATE_TRUNC('hour', created_at) as hour,
      COUNT(*) as count
    FROM inventory_movement_errors
    WHERE created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY DATE_TRUNC('hour', created_at)
  )
  SELECT
    TO_CHAR(hm.hour, 'YYYY-MM-DD HH24:00') as time_bucket,
    hm.count as movement_count,
    ROUND(hm.avg_quantity, 2) as avg_qty,
    COALESCE(he.count, 0) as error_count,
    CASE
      WHEN hm.count > 0
      THEN ROUND((1 - COALESCE(he.count, 0)::numeric / hm.count) * 100, 2)
      ELSE 100
    END as success_rate
  FROM hourly_movements hm
  LEFT JOIN hourly_errors he ON hm.hour = he.hour
  ORDER BY hm.hour DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_movement_metrics IS
  'Returns hourly movement processing metrics for specified time range';

GRANT EXECUTE ON FUNCTION get_movement_metrics TO authenticated;

-- Function: Get trigger performance summary
CREATE OR REPLACE FUNCTION get_trigger_performance_summary()
RETURNS TABLE (
  metric text,
  value numeric,
  unit text,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'Total Movements'::text, COUNT(*)::numeric, 'count'::text, 'info'::text
  FROM inventory_movements
  UNION ALL
  SELECT 'Movements (24h)', COUNT(*)::numeric, 'count', 'info'
  FROM inventory_movements WHERE created_at >= NOW() - INTERVAL '24 hours'
  UNION ALL
  SELECT 'Avg Movements/Hour', 
    ROUND(COUNT(*)::numeric / 24, 2),
    'per hour',
    CASE WHEN COUNT(*) / 24 > 100 THEN 'warning' ELSE 'success' END
  FROM inventory_movements WHERE created_at >= NOW() - INTERVAL '24 hours'
  UNION ALL
  SELECT 'Error Rate (24h)',
    ROUND(
      COALESCE(
        (SELECT COUNT(*) FROM inventory_movement_errors WHERE created_at >= NOW() - INTERVAL '24 hours')::numeric /
        NULLIF((SELECT COUNT(*) FROM inventory_movements WHERE created_at >= NOW() - INTERVAL '24 hours'), 0) * 100,
        0
      ),
      2
    ),
    'percent',
    CASE
      WHEN COALESCE(
        (SELECT COUNT(*) FROM inventory_movement_errors WHERE created_at >= NOW() - INTERVAL '24 hours')::numeric /
        NULLIF((SELECT COUNT(*) FROM inventory_movements WHERE created_at >= NOW() - INTERVAL '24 hours'), 0) * 100,
        0
      ) > 5 THEN 'error'
      WHEN COALESCE(
        (SELECT COUNT(*) FROM inventory_movement_errors WHERE created_at >= NOW() - INTERVAL '24 hours')::numeric /
        NULLIF((SELECT COUNT(*) FROM inventory_movements WHERE created_at >= NOW() - INTERVAL '24 hours'), 0) * 100,
        0
      ) > 1 THEN 'warning'
      ELSE 'success'
    END
  UNION ALL
  SELECT 'Unresolved Errors',
    COUNT(*)::numeric,
    'count',
    CASE WHEN COUNT(*) > 10 THEN 'error' WHEN COUNT(*) > 0 THEN 'warning' ELSE 'success' END
  FROM inventory_movement_errors WHERE resolved_at IS NULL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_trigger_performance_summary IS
  'Returns high-level trigger performance summary with status indicators';

GRANT EXECUTE ON FUNCTION get_trigger_performance_summary TO authenticated;
