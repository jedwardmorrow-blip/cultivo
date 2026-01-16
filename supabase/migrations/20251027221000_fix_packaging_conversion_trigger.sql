/*
  # Fix Packaging Session Conversion Trigger

  ## Overview
  Updates the auto_create_pending_conversions_from_packaging trigger function to work
  correctly with the actual packaging_sessions table schema.

  ## Issues Fixed

  1. **Field Name Mismatch**: Changed `status` to `session_status` to match actual table
  2. **Units Calculation**: Calculate total units from `units_3_5g + units_14g + units_454g`
  3. **Created By**: Use `packager_name` instead of non-existent `completed_by` field
  4. **Product ID Derivation**: Look up product_id based on strain and unit sizes packaged
  5. **Completed By Tracking**: Use packager_name for audit trail

  ## How It Works

  When a packaging session status changes to 'completed':
  1. Calculate total units packaged (sum of all unit sizes)
  2. For each unit size that has units > 0:
     - Find the corresponding product in products table
     - Create a pending_conversion record
     - Link to batch and session for traceability
  3. Use packager_name for created_by tracking

  ## Product ID Lookup Logic

  Products are matched by:
  - Strain name (from session)
  - Product name pattern matching unit size (e.g., "3.5g", "14g", "1lb")
  - Active products only (not archived)

  ## Notes
  - Only creates pending conversions on completion, not on start
  - Start trigger handles inventory reservation separately
  - Zero-unit sizes are skipped (no pending conversion created)
  - Each unit size gets its own pending_conversion record for proper tracking
*/

-- =====================================================
-- DROP OLD VERSION OF FUNCTION
-- =====================================================

DROP FUNCTION IF EXISTS auto_create_pending_conversions_from_packaging();

-- =====================================================
-- CREATE UPDATED FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION auto_create_pending_conversions_from_packaging()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_id_3_5g uuid;
  v_product_id_14g uuid;
  v_product_id_454g uuid;
  v_total_units integer;
BEGIN
  -- Only process if session_status changed to 'completed'
  IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN

    -- Calculate total units packaged
    v_total_units := COALESCE(NEW.units_3_5g, 0) + COALESCE(NEW.units_14g, 0) + COALESCE(NEW.units_454g, 0);

    -- Only proceed if units were actually packaged
    IF v_total_units > 0 THEN

      -- Look up product IDs for each unit size based on strain and product name pattern
      -- 3.5g / Eighth products
      IF NEW.units_3_5g > 0 THEN
        SELECT id INTO v_product_id_3_5g
        FROM products
        WHERE strain = NEW.strain
          AND (
            name ILIKE '%3.5g%' OR
            name ILIKE '%eighth%' OR
            name ILIKE '%1/8%'
          )
          AND archived = false
        ORDER BY
          CASE
            WHEN name ILIKE '%flower%' THEN 1
            WHEN name ILIKE '%smalls%' THEN 2
            ELSE 3
          END
        LIMIT 1;

        -- Create pending conversion for 3.5g units
        IF v_product_id_3_5g IS NOT NULL THEN
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
            v_product_id_3_5g,
            NEW.units_3_5g,
            NEW.units_3_5g,
            'pending',
            NEW.packager_name
          );

          RAISE NOTICE 'Created pending conversion for % units of 3.5g from packaging session %',
            NEW.units_3_5g, NEW.id;
        ELSE
          RAISE WARNING 'No 3.5g product found for strain % in packaging session %',
            NEW.strain, NEW.id;
        END IF;
      END IF;

      -- 14g / Half Ounce products
      IF NEW.units_14g > 0 THEN
        SELECT id INTO v_product_id_14g
        FROM products
        WHERE strain = NEW.strain
          AND (
            name ILIKE '%14g%' OR
            name ILIKE '%half%ounce%' OR
            name ILIKE '%1/2%oz%'
          )
          AND archived = false
        ORDER BY
          CASE
            WHEN name ILIKE '%flower%' THEN 1
            WHEN name ILIKE '%smalls%' THEN 2
            ELSE 3
          END
        LIMIT 1;

        -- Create pending conversion for 14g units
        IF v_product_id_14g IS NOT NULL THEN
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
            v_product_id_14g,
            NEW.units_14g,
            NEW.units_14g,
            'pending',
            NEW.packager_name
          );

          RAISE NOTICE 'Created pending conversion for % units of 14g from packaging session %',
            NEW.units_14g, NEW.id;
        ELSE
          RAISE WARNING 'No 14g product found for strain % in packaging session %',
            NEW.strain, NEW.id;
        END IF;
      END IF;

      -- 454g / 1lb products
      IF NEW.units_454g > 0 THEN
        SELECT id INTO v_product_id_454g
        FROM products
        WHERE strain = NEW.strain
          AND (
            name ILIKE '%454g%' OR
            name ILIKE '%1lb%' OR
            name ILIKE '%pound%'
          )
          AND archived = false
        ORDER BY
          CASE
            WHEN name ILIKE '%flower%' THEN 1
            WHEN name ILIKE '%smalls%' THEN 2
            ELSE 3
          END
        LIMIT 1;

        -- Create pending conversion for 454g units
        IF v_product_id_454g IS NOT NULL THEN
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
            v_product_id_454g,
            NEW.units_454g,
            NEW.units_454g,
            'pending',
            NEW.packager_name
          );

          RAISE NOTICE 'Created pending conversion for % units of 454g from packaging session %',
            NEW.units_454g, NEW.id;
        ELSE
          RAISE WARNING 'No 454g product found for strain % in packaging session %',
            NEW.strain, NEW.id;
        END IF;
      END IF;

    END IF;

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_pending_conversions_from_packaging IS
'Creates pending conversions when packaging sessions complete. Updated to use session_status field and calculate units from individual unit size fields. Creates separate pending_conversion records for each unit size.';

-- =====================================================
-- RECREATE TRIGGER
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_create_pending_conversions_from_packaging ON packaging_sessions;

-- Create trigger on packaging_sessions with correct field references
CREATE TRIGGER trigger_auto_create_pending_conversions_from_packaging
  AFTER UPDATE ON packaging_sessions
  FOR EACH ROW
  WHEN (OLD.session_status IS DISTINCT FROM NEW.session_status)
  EXECUTE FUNCTION auto_create_pending_conversions_from_packaging();

-- =====================================================
-- VALIDATION QUERIES
-- =====================================================

/*
  ## Testing the Fixed Trigger

  ### Test 1: Verify products exist for packaging
  ```sql
  SELECT id, name, strain, archived
  FROM products
  WHERE (
    name ILIKE '%3.5g%' OR
    name ILIKE '%14g%' OR
    name ILIKE '%454g%' OR
    name ILIKE '%1lb%'
  )
  AND archived = false
  ORDER BY strain, name;
  ```

  ### Test 2: Complete a packaging session
  ```sql
  UPDATE packaging_sessions
  SET
    session_status = 'completed',
    units_3_5g = 10,
    units_14g = 5,
    units_454g = 2,
    completed_at = now()
  WHERE id = 'session-id-here';
  ```

  ### Test 3: Verify pending conversions were created
  ```sql
  SELECT
    pc.id,
    pc.session_type,
    p.name as product_name,
    pc.original_units,
    pc.remaining_units,
    pc.status,
    pc.created_by
  FROM pending_conversions pc
  JOIN products p ON p.id = pc.product_id
  WHERE pc.session_id = 'session-id-here'
  ORDER BY p.name;
  ```

  ### Test 4: Verify conversion lots were updated
  ```sql
  SELECT
    cl.lot_date,
    p.name as product_name,
    cl.total_units,
    cl.remaining_units,
    cl.contributing_session_count,
    cl.status
  FROM conversion_lots cl
  JOIN products p ON p.id = cl.product_id
  WHERE cl.batch_id = 'batch-id-here'
  ORDER BY cl.lot_date DESC, p.name;
  ```
*/
