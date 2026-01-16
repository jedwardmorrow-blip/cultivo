/*
  # Event-Driven Inventory Core - Daily Snapshot Functions

  ## Overview
  This migration creates functions for generating and managing daily inventory snapshots.
  Snapshots provide fast historical reporting without replaying the ledger.

  ## Functions Created

  1. **fn_generate_daily_snapshot(snapshot_date)**
     - Generates snapshot for a specific date
     - Idempotent (ON CONFLICT DO UPDATE)
     - Calculates on_hand and ATP for all active items

  2. **fn_backfill_historical_snapshots(start_date, end_date)**
     - Backfills snapshots for a date range
     - Useful for historical data reconstruction
     - Progress logging for long-running operations

  3. **fn_purge_old_snapshots(retention_days)**
     - Deletes snapshots older than retention period
     - Data retention management

  4. **fn_get_snapshot_stats(snapshot_date)**
     - Returns statistics for a specific snapshot date
     - Useful for validation and monitoring

  ## Usage
  - Schedule fn_generate_daily_snapshot() to run daily (e.g., midnight UTC)
  - Use fn_backfill_historical_snapshots() for one-time historical data creation
  - Use fn_purge_old_snapshots() for periodic cleanup

  ## Performance
  - Snapshots materialize data for fast reads
  - Avoids scanning entire inventory_movements table for reports
  - Composite primary key (snapshot_date, item_id) enables fast lookups
*/

-- =====================================================
-- FUNCTION 1: fn_generate_daily_snapshot
-- =====================================================

CREATE OR REPLACE FUNCTION fn_generate_daily_snapshot(
  p_snapshot_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_inserted_count integer := 0;
  v_updated_count integer := 0;
  v_start_time timestamptz;
  v_end_time timestamptz;
BEGIN
  v_start_time := clock_timestamp();

  -- Insert or update snapshot records for all active items
  INSERT INTO inventory_daily_snapshots (
    snapshot_date,
    item_id,
    on_hand_qty,
    atp_qty,
    unit,
    batch_id
  )
  SELECT
    p_snapshot_date,
    item_id,
    on_hand_qty,
    atp_qty,
    unit,
    batch_id
  FROM v_atp
  WHERE on_hand_qty > 0
  ON CONFLICT (snapshot_date, item_id)
  DO UPDATE SET
    on_hand_qty = EXCLUDED.on_hand_qty,
    atp_qty = EXCLUDED.atp_qty,
    unit = EXCLUDED.unit,
    batch_id = EXCLUDED.batch_id,
    created_at = now();

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  v_end_time := clock_timestamp();

  RETURN jsonb_build_object(
    'success', true,
    'snapshot_date', p_snapshot_date,
    'records_processed', v_inserted_count,
    'duration_ms', EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time)),
    'message', format('Snapshot generated for %s with %s items', p_snapshot_date, v_inserted_count)
  );
END;
$$;

COMMENT ON FUNCTION fn_generate_daily_snapshot IS
'Generates daily inventory snapshot for a specific date.
Idempotent: ON CONFLICT DO UPDATE allows re-running for same date.
Source: v_atp view (materialized on_hand and calculated ATP).
Schedule: Run daily at midnight UTC via cron or edge function.
Returns: jsonb with success status and statistics.';

-- =====================================================
-- FUNCTION 2: fn_backfill_historical_snapshots
-- =====================================================

CREATE OR REPLACE FUNCTION fn_backfill_historical_snapshots(
  p_start_date date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_date date;
  v_total_days integer;
  v_days_processed integer := 0;
  v_total_records integer := 0;
  v_start_time timestamptz;
  v_end_time timestamptz;
  v_result jsonb;
BEGIN
  v_start_time := clock_timestamp();
  v_total_days := p_end_date - p_start_date + 1;

  -- Validate date range
  IF p_start_date > p_end_date THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'start_date must be before or equal to end_date'
    );
  END IF;

  -- Loop through each date
  v_current_date := p_start_date;
  WHILE v_current_date <= p_end_date LOOP
    -- Generate snapshot for this date
    v_result := fn_generate_daily_snapshot(v_current_date);

    -- Accumulate stats
    v_days_processed := v_days_processed + 1;
    v_total_records := v_total_records + (v_result->>'records_processed')::integer;

    -- Progress logging every 7 days
    IF v_days_processed % 7 = 0 THEN
      RAISE NOTICE 'Backfill progress: % of % days (%.1f%%), % total records',
        v_days_processed, v_total_days,
        (v_days_processed::numeric / v_total_days * 100),
        v_total_records;
    END IF;

    -- Move to next date
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  v_end_time := clock_timestamp();

  RETURN jsonb_build_object(
    'success', true,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'days_processed', v_days_processed,
    'total_records', v_total_records,
    'duration_seconds', EXTRACT(EPOCH FROM (v_end_time - v_start_time)),
    'message', format('Backfilled %s days with %s total records', v_days_processed, v_total_records)
  );
END;
$$;

COMMENT ON FUNCTION fn_backfill_historical_snapshots IS
'Backfills daily inventory snapshots for a date range.
Use for: Historical data reconstruction, reporting setup.
Progress: Logs every 7 days during long-running operations.
Warning: Large date ranges may take significant time.
Returns: jsonb with backfill statistics.';

-- =====================================================
-- FUNCTION 3: fn_purge_old_snapshots
-- =====================================================

CREATE OR REPLACE FUNCTION fn_purge_old_snapshots(
  p_retention_days integer DEFAULT 365
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_cutoff_date date;
  v_deleted_count integer;
BEGIN
  v_cutoff_date := CURRENT_DATE - p_retention_days;

  -- Delete snapshots older than retention period
  DELETE FROM inventory_daily_snapshots
  WHERE snapshot_date < v_cutoff_date;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'retention_days', p_retention_days,
    'cutoff_date', v_cutoff_date,
    'deleted_count', v_deleted_count,
    'message', format('Purged %s snapshots older than %s', v_deleted_count, v_cutoff_date)
  );
END;
$$;

COMMENT ON FUNCTION fn_purge_old_snapshots IS
'Deletes inventory snapshots older than retention period.
Default retention: 365 days.
Use for: Data retention management, storage optimization.
Schedule: Run monthly or quarterly.
Returns: jsonb with deletion statistics.';

-- =====================================================
-- FUNCTION 4: fn_get_snapshot_stats
-- =====================================================

CREATE OR REPLACE FUNCTION fn_get_snapshot_stats(
  p_snapshot_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_item_count integer;
  v_total_grams numeric;
  v_total_units numeric;
  v_atp_grams numeric;
  v_atp_units numeric;
  v_batch_count integer;
BEGIN
  SELECT
    COUNT(*),
    SUM(CASE WHEN unit = 'g' THEN on_hand_qty ELSE 0 END),
    SUM(CASE WHEN unit = 'unit' THEN on_hand_qty ELSE 0 END),
    SUM(CASE WHEN unit = 'g' THEN atp_qty ELSE 0 END),
    SUM(CASE WHEN unit = 'unit' THEN atp_qty ELSE 0 END),
    COUNT(DISTINCT batch_id)
  INTO
    v_item_count,
    v_total_grams,
    v_total_units,
    v_atp_grams,
    v_atp_units,
    v_batch_count
  FROM inventory_daily_snapshots
  WHERE snapshot_date = p_snapshot_date;

  RETURN jsonb_build_object(
    'snapshot_date', p_snapshot_date,
    'item_count', COALESCE(v_item_count, 0),
    'total_grams', COALESCE(v_total_grams, 0),
    'total_units', COALESCE(v_total_units, 0),
    'atp_grams', COALESCE(v_atp_grams, 0),
    'atp_units', COALESCE(v_atp_units, 0),
    'batch_count', COALESCE(v_batch_count, 0)
  );
END;
$$;

COMMENT ON FUNCTION fn_get_snapshot_stats IS
'Returns summary statistics for a specific snapshot date.
Use for: Snapshot validation, monitoring, dashboard displays.
Returns: jsonb with item counts, totals, and ATP values.';

-- =====================================================
-- SECTION 5: Create helper views for snapshot analysis
-- =====================================================

-- View for snapshot comparison (day-over-day changes)
CREATE OR REPLACE VIEW v_snapshot_changes AS
WITH daily_totals AS (
  SELECT
    snapshot_date,
    SUM(CASE WHEN unit = 'g' THEN on_hand_qty ELSE 0 END) as total_grams,
    SUM(CASE WHEN unit = 'unit' THEN on_hand_qty ELSE 0 END) as total_units,
    COUNT(*) as item_count
  FROM inventory_daily_snapshots
  GROUP BY snapshot_date
),
with_prev AS (
  SELECT
    snapshot_date,
    total_grams,
    total_units,
    item_count,
    LAG(total_grams) OVER (ORDER BY snapshot_date) as prev_grams,
    LAG(total_units) OVER (ORDER BY snapshot_date) as prev_units,
    LAG(item_count) OVER (ORDER BY snapshot_date) as prev_item_count
  FROM daily_totals
)
SELECT
  snapshot_date,
  total_grams,
  total_units,
  item_count,
  total_grams - COALESCE(prev_grams, 0) as grams_change,
  total_units - COALESCE(prev_units, 0) as units_change,
  item_count - COALESCE(prev_item_count, 0) as items_change,
  CASE
    WHEN prev_grams > 0 THEN
      ROUND(((total_grams - prev_grams) / prev_grams * 100)::numeric, 2)
    ELSE NULL
  END as grams_change_pct
FROM with_prev
ORDER BY snapshot_date DESC
LIMIT 30;

COMMENT ON VIEW v_snapshot_changes IS
'Day-over-day inventory changes from snapshots.
Shows: Daily totals, previous day totals, absolute and percentage changes.
Use for: Trend analysis, anomaly detection, inventory velocity.
Limit: Last 30 days for performance.';

GRANT SELECT ON v_snapshot_changes TO authenticated;

-- View for batch inventory over time
CREATE OR REPLACE VIEW v_batch_inventory_history AS
SELECT
  snapshot_date,
  batch_id,
  SUM(CASE WHEN unit = 'g' THEN on_hand_qty ELSE 0 END) as on_hand_grams,
  SUM(CASE WHEN unit = 'g' THEN atp_qty ELSE 0 END) as atp_grams,
  SUM(CASE WHEN unit = 'unit' THEN on_hand_qty ELSE 0 END) as on_hand_units,
  COUNT(*) as item_count
FROM inventory_daily_snapshots
WHERE batch_id IS NOT NULL
GROUP BY snapshot_date, batch_id
ORDER BY snapshot_date DESC, batch_id;

COMMENT ON VIEW v_batch_inventory_history IS
'Historical inventory balances by batch from snapshots.
Shows: On-hand and ATP quantities over time per batch.
Use for: Batch aging analysis, depletion tracking, capacity planning.';

GRANT SELECT ON v_batch_inventory_history TO authenticated;

-- =====================================================
-- SECTION 6: Create scheduled job helper
-- =====================================================

-- Function to be called by pg_cron or edge function
CREATE OR REPLACE FUNCTION scheduled_daily_snapshot()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Generate snapshot for current date
  v_result := fn_generate_daily_snapshot(CURRENT_DATE);

  -- Log result
  RAISE NOTICE 'Daily snapshot completed: %', v_result;

  -- Optional: Alert on errors
  IF (v_result->>'success')::boolean = false THEN
    RAISE WARNING 'Daily snapshot failed: %', v_result->>'message';
  END IF;
END;
$$;

COMMENT ON FUNCTION scheduled_daily_snapshot IS
'Wrapper function for scheduled execution of daily snapshot generation.
Schedule with: pg_cron or edge function via cron trigger.
Example pg_cron: SELECT cron.schedule(''daily-snapshot'', ''0 0 * * *'', ''SELECT scheduled_daily_snapshot()'');
Logs: NOTICE on success, WARNING on failure.';
