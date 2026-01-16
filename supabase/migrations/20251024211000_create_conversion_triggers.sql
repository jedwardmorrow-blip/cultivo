/*
  # Inventory Conversion System - Phase 2: Automation Triggers

  ## Overview
  Creates database triggers to automatically manage conversion workflow.
  Triggers handle pending conversion creation and lot aggregation updates.

  ## Triggers Created

  ### 1. auto_create_pending_conversions_from_trim
  Automatically creates pending conversion records when trim sessions complete.
  - Triggers on trim_sessions UPDATE when status changes to 'completed'
  - Creates 3 pending conversions: Flower, Smalls, Trim (if weight > 0)
  - Links to batch and appropriate product IDs

  ### 2. auto_create_pending_conversions_from_packaging
  Automatically creates pending conversion records when packaging sessions complete.
  - Triggers on packaging_sessions UPDATE when status changes to 'completed'
  - Creates 1 pending conversion for the packaged product
  - Links to batch and product ID

  ### 3. auto_update_conversion_lots
  Maintains conversion_lots aggregation table in sync with pending_conversions.
  - Triggers on pending_conversions INSERT
  - Updates or creates conversion_lot for the batch+product+date combination
  - Aggregates total weights/units and session counts

  ## Data Flow
  Session Completes → Trigger Creates pending_conversion → Trigger Updates conversion_lot

  ## Notes
  - Triggers only fire when sessions transition to 'completed' status
  - Zero-weight outputs are skipped (no pending conversion created)
  - Lot aggregation is real-time, no manual sync needed
  - Product IDs must be looked up based on product name patterns
*/

-- =====================================================
-- HELPER FUNCTION: Get Product ID by Name Pattern
-- =====================================================

CREATE OR REPLACE FUNCTION get_product_id_by_name(p_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_product_id uuid;
BEGIN
  SELECT id INTO v_product_id
  FROM products
  WHERE name ILIKE p_name
  LIMIT 1;

  RETURN v_product_id;
END;
$$;

COMMENT ON FUNCTION get_product_id_by_name IS 'Helper function to find product ID by name pattern';

-- =====================================================
-- TRIGGER FUNCTION: Auto-create pending conversions from trim sessions
-- =====================================================

CREATE OR REPLACE FUNCTION auto_create_pending_conversions_from_trim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flower_product_id uuid;
  v_smalls_product_id uuid;
  v_trim_product_id uuid;
BEGIN
  -- Only process if status changed to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Get product IDs for trim outputs
    v_flower_product_id := get_product_id_by_name('%Flower%');
    v_smalls_product_id := get_product_id_by_name('%Smalls%');
    v_trim_product_id := get_product_id_by_name('%Trim%');

    -- Create pending conversion for Flower (if weight > 0)
    IF NEW.flower_weight_grams IS NOT NULL AND NEW.flower_weight_grams > 0 AND v_flower_product_id IS NOT NULL THEN
      INSERT INTO pending_conversions (
        session_id,
        session_type,
        batch_id,
        product_id,
        original_weight,
        remaining_weight,
        status,
        created_by
      ) VALUES (
        NEW.id,
        'trim',
        NEW.batch_id,
        v_flower_product_id,
        NEW.flower_weight_grams,
        NEW.flower_weight_grams,
        'pending',
        NEW.completed_by
      );
    END IF;

    -- Create pending conversion for Smalls (if weight > 0)
    IF NEW.smalls_weight_grams IS NOT NULL AND NEW.smalls_weight_grams > 0 AND v_smalls_product_id IS NOT NULL THEN
      INSERT INTO pending_conversions (
        session_id,
        session_type,
        batch_id,
        product_id,
        original_weight,
        remaining_weight,
        status,
        created_by
      ) VALUES (
        NEW.id,
        'trim',
        NEW.batch_id,
        v_smalls_product_id,
        NEW.smalls_weight_grams,
        NEW.smalls_weight_grams,
        'pending',
        NEW.completed_by
      );
    END IF;

    -- Create pending conversion for Trim (if weight > 0)
    IF NEW.trim_weight_grams IS NOT NULL AND NEW.trim_weight_grams > 0 AND v_trim_product_id IS NOT NULL THEN
      INSERT INTO pending_conversions (
        session_id,
        session_type,
        batch_id,
        product_id,
        original_weight,
        remaining_weight,
        status,
        created_by
      ) VALUES (
        NEW.id,
        'trim',
        NEW.batch_id,
        v_trim_product_id,
        NEW.trim_weight_grams,
        NEW.trim_weight_grams,
        'pending',
        NEW.completed_by
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_create_pending_conversions_from_trim ON trim_sessions;

-- Create trigger on trim_sessions
CREATE TRIGGER trigger_auto_create_pending_conversions_from_trim
  AFTER UPDATE ON trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_pending_conversions_from_trim();

COMMENT ON FUNCTION auto_create_pending_conversions_from_trim IS 'Automatically creates pending conversions when trim sessions complete';

-- =====================================================
-- TRIGGER FUNCTION: Auto-create pending conversions from packaging sessions
-- =====================================================

CREATE OR REPLACE FUNCTION auto_create_pending_conversions_from_packaging()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_id uuid;
  v_total_units integer;
BEGIN
  -- Only process if status changed to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Get product ID for the packaged product
    v_product_id := NEW.product_id;

    -- Calculate total units packaged
    v_total_units := COALESCE(NEW.units_packaged, 0);

    -- Create pending conversion for packaged units (if units > 0)
    IF v_total_units > 0 AND v_product_id IS NOT NULL THEN
      INSERT INTO pending_conversions (
        session_id,
        session_type,
        batch_id,
        product_id,
        original_units,
        remaining_units,
        status,
        created_by
      ) VALUES (
        NEW.id,
        'packaging',
        NEW.batch_id,
        v_product_id,
        v_total_units,
        v_total_units,
        'pending',
        NEW.completed_by
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_create_pending_conversions_from_packaging ON packaging_sessions;

-- Create trigger on packaging_sessions
CREATE TRIGGER trigger_auto_create_pending_conversions_from_packaging
  AFTER UPDATE ON packaging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_pending_conversions_from_packaging();

COMMENT ON FUNCTION auto_create_pending_conversions_from_packaging IS 'Automatically creates pending conversions when packaging sessions complete';

-- =====================================================
-- TRIGGER FUNCTION: Auto-update conversion lots
-- =====================================================

CREATE OR REPLACE FUNCTION auto_update_conversion_lots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lot_id uuid;
  v_existing_lot conversion_lots%ROWTYPE;
  v_total_weight numeric(10,2);
  v_total_units integer;
  v_session_count integer;
BEGIN
  -- Only process on INSERT of pending conversions
  IF TG_OP = 'INSERT' THEN

    -- Check if lot already exists for this batch+product+date
    SELECT * INTO v_existing_lot
    FROM conversion_lots
    WHERE batch_id = NEW.batch_id
      AND product_id = NEW.product_id
      AND lot_date = CURRENT_DATE;

    -- Calculate new totals from all pending conversions for this batch+product
    SELECT
      SUM(COALESCE(original_weight, 0)),
      SUM(COALESCE(original_units, 0)),
      COUNT(DISTINCT session_id)
    INTO v_total_weight, v_total_units, v_session_count
    FROM pending_conversions
    WHERE batch_id = NEW.batch_id
      AND product_id = NEW.product_id
      AND status = 'pending'
      AND DATE(created_at) = CURRENT_DATE;

    IF v_existing_lot.id IS NOT NULL THEN
      -- Update existing lot
      UPDATE conversion_lots
      SET
        total_weight = CASE WHEN v_total_weight > 0 THEN v_total_weight ELSE NULL END,
        total_units = CASE WHEN v_total_units > 0 THEN v_total_units ELSE NULL END,
        remaining_weight = CASE WHEN v_total_weight > 0 THEN v_total_weight - COALESCE(converted_weight, 0) ELSE NULL END,
        remaining_units = CASE WHEN v_total_units > 0 THEN v_total_units - COALESCE(converted_units, 0) ELSE NULL END,
        contributing_session_count = v_session_count,
        updated_at = now()
      WHERE id = v_existing_lot.id;
    ELSE
      -- Create new lot
      INSERT INTO conversion_lots (
        batch_id,
        product_id,
        lot_date,
        total_weight,
        total_units,
        remaining_weight,
        remaining_units,
        contributing_session_count,
        status
      ) VALUES (
        NEW.batch_id,
        NEW.product_id,
        CURRENT_DATE,
        CASE WHEN v_total_weight > 0 THEN v_total_weight ELSE NULL END,
        CASE WHEN v_total_units > 0 THEN v_total_units ELSE NULL END,
        CASE WHEN v_total_weight > 0 THEN v_total_weight ELSE NULL END,
        CASE WHEN v_total_units > 0 THEN v_total_units ELSE NULL END,
        v_session_count,
        'active'
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_update_conversion_lots ON pending_conversions;

-- Create trigger on pending_conversions
CREATE TRIGGER trigger_auto_update_conversion_lots
  AFTER INSERT ON pending_conversions
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_conversion_lots();

COMMENT ON FUNCTION auto_update_conversion_lots IS 'Automatically updates conversion_lots aggregation when pending conversions are created';

-- =====================================================
-- CLEANUP FUNCTION: Remove old completed lots
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_conversion_lots()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  -- Mark lots older than 1 day as 'depleted' if they're completed_today
  UPDATE conversion_lots
  SET status = 'depleted'
  WHERE status = 'completed_today'
    AND lot_date < CURRENT_DATE;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_conversion_lots IS 'Marks old completed lots as depleted for archival (run daily via cron)';

-- =====================================================
-- VALIDATION NOTES
-- =====================================================

/*
  ## Testing the Triggers

  ### Test Trim Session Completion:

  -- Create a test trim session (assuming you have test batch and user)
  UPDATE trim_sessions
  SET status = 'completed',
      flower_weight_grams = 1500,
      smalls_weight_grams = 300,
      trim_weight_grams = 200,
      completed_by = 'user-id-here'
  WHERE id = 'session-id-here';

  -- Verify pending conversions created:
  SELECT * FROM pending_conversions WHERE session_id = 'session-id-here';

  -- Verify conversion lot created:
  SELECT * FROM conversion_lots WHERE batch_id = 'batch-id-here';

  ### Test Packaging Session Completion:

  UPDATE packaging_sessions
  SET status = 'completed',
      units_packaged = 100,
      completed_by = 'user-id-here'
  WHERE id = 'session-id-here';

  -- Verify pending conversion created:
  SELECT * FROM pending_conversions WHERE session_id = 'session-id-here';

  -- Verify conversion lot updated:
  SELECT * FROM conversion_lots WHERE product_id = 'product-id-here';
*/
