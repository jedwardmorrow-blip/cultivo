/*
  # Create Conversion Lots Aggregation Trigger

  ## Overview
  This migration creates the missing aggregation logic that automatically populates
  the conversion_lots table from pending_conversions records. This is the critical
  missing piece that prevents trim and packaging session outputs from appearing in
  the Conversions UI.

  ## Problem Being Solved
  1. pending_conversions records are created when sessions complete ✅
  2. conversion_lots table exists but is never populated ❌
  3. UI queries conversion_lots via get_conversion_lot_summary() and finds nothing ❌
  4. Result: Managers cannot see or process completed session outputs ❌

  ## Solution
  Create a trigger that automatically:
  - Aggregates pending_conversions by (batch_id, product_id, lot_date)
  - Creates or updates conversion_lots records
  - Maintains accurate totals and session counts
  - Updates lot status based on remaining quantities

  ## How It Works
  1. When pending_conversion is INSERTed → Trigger aggregates into conversion_lot
  2. When pending_conversion remaining_weight/units UPDATEd → Re-aggregate
  3. Conversion lot shows total from all sessions for that batch+product+date
  4. Manager sees aggregated lots in UI and can create packages

  ## Safety Features
  - Only processes 'pending' and 'converting' statuses
  - Handles both weight-based (bulk) and unit-based (packaged) conversions
  - Determines lot status automatically (active vs completed_today)
  - Extensive logging for troubleshooting
  - Idempotent (can run multiple times safely)

  ## Backfill
  - Processes all existing pending_conversions records
  - One-time operation to populate conversion_lots from historical data
*/

-- =====================================================
-- FUNCTION: Aggregate Pending Conversions into Lots
-- =====================================================

CREATE OR REPLACE FUNCTION upsert_conversion_lot_from_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lot_id uuid;
  v_total_weight numeric;
  v_total_units integer;
  v_remaining_weight numeric;
  v_remaining_units integer;
  v_session_count integer;
  v_lot_status conversion_lot_status;
BEGIN
  -- Only process active pending conversions
  IF NEW.status NOT IN ('pending', 'converting') THEN
    RETURN NEW;
  END IF;

  RAISE NOTICE 'Aggregating pending conversion % (batch=%, product=%) into conversion lot',
    NEW.id, NEW.batch_id, NEW.product_id;

  -- Calculate totals from ALL pending conversions for this batch+product+date
  -- This ensures the lot reflects the sum of all contributing sessions
  SELECT
    COALESCE(SUM(CASE WHEN original_weight IS NOT NULL THEN original_weight ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN original_units IS NOT NULL THEN original_units ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN remaining_weight IS NOT NULL THEN remaining_weight ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN remaining_units IS NOT NULL THEN remaining_units ELSE 0 END), 0),
    COUNT(DISTINCT session_id)
  INTO
    v_total_weight,
    v_total_units,
    v_remaining_weight,
    v_remaining_units,
    v_session_count
  FROM pending_conversions
  WHERE batch_id = NEW.batch_id
    AND product_id = NEW.product_id
    AND DATE(created_at) = CURRENT_DATE
    AND status IN ('pending', 'converting');

  -- Determine lot status based on remaining quantities
  IF v_remaining_weight = 0 AND v_remaining_units = 0 THEN
    v_lot_status := 'completed_today'::conversion_lot_status;
  ELSE
    v_lot_status := 'active'::conversion_lot_status;
  END IF;

  -- Check if lot already exists for this batch+product+date
  SELECT id INTO v_lot_id
  FROM conversion_lots
  WHERE batch_id = NEW.batch_id
    AND product_id = NEW.product_id
    AND lot_date = CURRENT_DATE;

  IF v_lot_id IS NULL THEN
    -- Create new conversion lot
    INSERT INTO conversion_lots (
      batch_id,
      product_id,
      lot_date,
      total_weight,
      total_units,
      remaining_weight,
      remaining_units,
      contributing_session_count,
      status,
      created_at
    ) VALUES (
      NEW.batch_id,
      NEW.product_id,
      CURRENT_DATE,
      v_total_weight,
      v_total_units,
      v_remaining_weight,
      v_remaining_units,
      v_session_count,
      v_lot_status,
      now()
    );

    RAISE NOTICE 'Created conversion lot for batch % product % with %g weight / %u units total (%u sessions)',
      NEW.batch_id, NEW.product_id, v_total_weight, v_total_units, v_session_count;
  ELSE
    -- Update existing conversion lot
    UPDATE conversion_lots
    SET
      total_weight = v_total_weight,
      total_units = v_total_units,
      remaining_weight = v_remaining_weight,
      remaining_units = v_remaining_units,
      contributing_session_count = v_session_count,
      status = v_lot_status,
      updated_at = now()
    WHERE id = v_lot_id;

    RAISE NOTICE 'Updated conversion lot % with %g/%u remaining (status=%)',
      v_lot_id, v_remaining_weight, v_remaining_units, v_lot_status;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION upsert_conversion_lot_from_pending IS
'Automatically aggregates pending_conversions into conversion_lots by batch+product+date. Creates or updates lot with current totals and session count.';

-- =====================================================
-- TRIGGERS: Auto-aggregate on Insert/Update
-- =====================================================

-- Trigger on INSERT: New pending conversion created
DROP TRIGGER IF EXISTS trg_aggregate_pending_to_lots_insert ON pending_conversions;
CREATE TRIGGER trg_aggregate_pending_to_lots_insert
  AFTER INSERT ON pending_conversions
  FOR EACH ROW
  EXECUTE FUNCTION upsert_conversion_lot_from_pending();

-- Trigger on UPDATE: Remaining quantities or status changed
DROP TRIGGER IF EXISTS trg_aggregate_pending_to_lots_update ON pending_conversions;
CREATE TRIGGER trg_aggregate_pending_to_lots_update
  AFTER UPDATE OF remaining_weight, remaining_units, status ON pending_conversions
  FOR EACH ROW
  EXECUTE FUNCTION upsert_conversion_lot_from_pending();

COMMENT ON TRIGGER trg_aggregate_pending_to_lots_insert ON pending_conversions IS
'Creates or updates conversion_lots when new pending_conversion is created';

COMMENT ON TRIGGER trg_aggregate_pending_to_lots_update ON pending_conversions IS
'Re-aggregates conversion_lots when pending_conversion quantities or status change';

-- =====================================================
-- BACKFILL: Process Existing Pending Conversions
-- =====================================================

DO $$
DECLARE
  v_pending_record RECORD;
  v_count integer := 0;
  v_lots_created integer := 0;
BEGIN
  RAISE NOTICE 'Starting backfill of conversion_lots from existing pending_conversions...';

  -- Get count of pending conversions to process
  SELECT COUNT(*) INTO v_count
  FROM pending_conversions
  WHERE status IN ('pending', 'converting');

  RAISE NOTICE 'Found % pending conversions to process', v_count;

  -- Process each unique batch+product combination
  FOR v_pending_record IN
    SELECT DISTINCT batch_id, product_id, DATE(created_at) as lot_date
    FROM pending_conversions
    WHERE status IN ('pending', 'converting')
    ORDER BY DATE(created_at) DESC
  LOOP
    -- Check if lot already exists
    IF NOT EXISTS (
      SELECT 1 FROM conversion_lots
      WHERE batch_id = v_pending_record.batch_id
        AND product_id = v_pending_record.product_id
        AND lot_date = v_pending_record.lot_date
    ) THEN
      -- Trigger will create the lot when we process any pending conversion
      DECLARE
        v_sample_pending RECORD;
      BEGIN
        SELECT * INTO v_sample_pending
        FROM pending_conversions
        WHERE batch_id = v_pending_record.batch_id
          AND product_id = v_pending_record.product_id
          AND DATE(created_at) = v_pending_record.lot_date
          AND status IN ('pending', 'converting')
        LIMIT 1;

        IF FOUND THEN
          PERFORM upsert_conversion_lot_from_pending()
          FROM (SELECT v_sample_pending.*) AS NEW;
          v_lots_created := v_lots_created + 1;
        END IF;
      END;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete: processed % pending conversions, created/updated % conversion lots',
    v_count, v_lots_created;
END;
$$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Show conversion lots created
DO $$
DECLARE
  v_lot_count integer;
  v_pending_count integer;
BEGIN
  SELECT COUNT(*) INTO v_lot_count FROM conversion_lots;
  SELECT COUNT(*) INTO v_pending_count FROM pending_conversions WHERE status IN ('pending', 'converting');

  RAISE NOTICE 'Verification: % conversion lots exist, % active pending conversions',
    v_lot_count, v_pending_count;
END;
$$;