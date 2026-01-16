/*
  # Fix Conversion Lot Aggregation for Weight vs Units

  ## Problem
  The upsert_conversion_lot_from_pending() trigger was setting both total_weight
  and total_units, which violates the valid_lot_weight_or_units constraint that
  requires EITHER weight OR units to be NULL (not both populated).

  ## Solution
  Update the trigger to:
  - Use NULL for total_units when dealing with weight-based conversions
  - Use NULL for total_weight when dealing with unit-based conversions
  - Properly handle the distinction between weight and unit types

  ## Changes
  - Recreates upsert_conversion_lot_from_pending() function
  - Checks if conversion has weight or units
  - Sets unused type to NULL instead of 0
*/

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
  v_has_weight boolean;
  v_has_units boolean;
BEGIN
  -- Only process active pending conversions
  IF NEW.status NOT IN ('pending', 'converting') THEN
    RETURN NEW;
  END IF;

  RAISE NOTICE 'Aggregating pending conversion % (batch=%, product=%) into conversion lot',
    NEW.id, NEW.batch_id, NEW.product_id;

  -- Determine if this product uses weight or units
  SELECT
    BOOL_OR(original_weight IS NOT NULL AND original_weight > 0),
    BOOL_OR(original_units IS NOT NULL AND original_units > 0)
  INTO v_has_weight, v_has_units
  FROM pending_conversions
  WHERE batch_id = NEW.batch_id
    AND product_id = NEW.product_id
    AND DATE(created_at) = CURRENT_DATE
    AND status IN ('pending', 'converting');

  -- Calculate totals based on whether this is weight or unit based
  IF v_has_weight THEN
    -- Weight-based conversion (bucking, trim)
    SELECT
      COALESCE(SUM(original_weight), 0),
      COALESCE(SUM(remaining_weight), 0),
      COUNT(DISTINCT session_id)
    INTO
      v_total_weight,
      v_remaining_weight,
      v_session_count
    FROM pending_conversions
    WHERE batch_id = NEW.batch_id
      AND product_id = NEW.product_id
      AND DATE(created_at) = CURRENT_DATE
      AND status IN ('pending', 'converting');

    v_total_units := NULL;
    v_remaining_units := NULL;

  ELSIF v_has_units THEN
    -- Unit-based conversion (packaging)
    SELECT
      COALESCE(SUM(original_units), 0),
      COALESCE(SUM(remaining_units), 0),
      COUNT(DISTINCT session_id)
    INTO
      v_total_units,
      v_remaining_units,
      v_session_count
    FROM pending_conversions
    WHERE batch_id = NEW.batch_id
      AND product_id = NEW.product_id
      AND DATE(created_at) = CURRENT_DATE
      AND status IN ('pending', 'converting');

    v_total_weight := NULL;
    v_remaining_weight := NULL;

  ELSE
    -- No weight or units - this shouldn't happen
    RAISE WARNING 'Pending conversion % has neither weight nor units', NEW.id;
    RETURN NEW;
  END IF;

  -- Determine lot status based on remaining quantities
  IF (v_remaining_weight IS NULL OR v_remaining_weight = 0) AND
     (v_remaining_units IS NULL OR v_remaining_units = 0) THEN
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

    IF v_has_weight THEN
      RAISE NOTICE 'Created conversion lot for batch % product % with %g weight total (%u sessions)',
        NEW.batch_id, NEW.product_id, v_total_weight, v_session_count;
    ELSE
      RAISE NOTICE 'Created conversion lot for batch % product % with %u units total (%u sessions)',
        NEW.batch_id, NEW.product_id, v_total_units, v_session_count;
    END IF;

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

    IF v_has_weight THEN
      RAISE NOTICE 'Updated conversion lot % with %g weight remaining (status=%)',
        v_lot_id, v_remaining_weight, v_lot_status;
    ELSE
      RAISE NOTICE 'Updated conversion lot % with %u units remaining (status=%)',
        v_lot_id, v_remaining_units, v_lot_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION upsert_conversion_lot_from_pending IS
'Aggregates pending conversions into conversion lots. Handles weight-based (bucking, trim) and unit-based (packaging) conversions separately, ensuring constraint compliance.';
