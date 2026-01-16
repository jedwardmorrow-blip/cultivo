/*
  # Re-enable Automatic Pending Conversions for Trim and Packaging Sessions

  ## Overview
  Fixes and re-enables the conversion triggers that were disabled in migration
  20251126205237. These triggers automatically create pending_conversions records
  when trim and packaging sessions complete, allowing managers to review and
  confirm conversions through the UI.

  ## Problem Being Solved
  1. Trim trigger used wrong field names (flower_weight_grams vs bucked_weight_grams)
  2. Trim trigger used wrong field (batch_id uuid vs batch_number string)
  3. Trim trigger didn't handle missing batch_id lookup gracefully
  4. Product lookup used simplistic name patterns that don't match actual naming
  5. Both triggers were replaced with no-op stubs in Nov 26 migration

  ## Solution
  1. Enhanced product lookup function using strain_id + stage_id (more reliable)
  2. Fixed trim trigger to use correct schema fields
  3. Added batch_number → batch_id lookup with error handling
  4. Restored working packaging trigger from Oct 27 migration
  5. Added comprehensive logging for troubleshooting

  ## Changes Made
  - New helper function: get_product_id_by_strain_stage_and_type()
  - Fixed function: auto_create_pending_conversions_from_trim()
  - Restored function: auto_create_pending_conversions_from_packaging()
  - Triggers recreated on both session tables

  ## Safety Features
  - Fails gracefully (logs warning, doesn't crash session)
  - Handles missing batches/products without errors
  - Uses auth.uid() for created_by (trim has no completed_by field)
  - Extensive RAISE NOTICE/WARNING for debugging
*/

-- =====================================================
-- HELPER FUNCTION: Enhanced Product Lookup
-- =====================================================

CREATE OR REPLACE FUNCTION get_product_id_by_strain_stage_and_type(
  p_batch_id uuid,
  p_stage_name text,
  p_is_smalls boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_product_id uuid;
  v_strain_id uuid;
  v_stage_id uuid;
BEGIN
  -- Get strain_id from batch
  SELECT strain_id INTO v_strain_id
  FROM batch_registry
  WHERE id = p_batch_id;

  -- If no strain_id (legacy batches), log and return NULL
  IF v_strain_id IS NULL THEN
    RAISE WARNING 'Batch % has no strain_id, cannot lookup product', p_batch_id;
    RETURN NULL;
  END IF;

  -- Get stage_id
  SELECT id INTO v_stage_id
  FROM product_stages
  WHERE name = p_stage_name
  LIMIT 1;

  IF v_stage_id IS NULL THEN
    RAISE WARNING 'Stage "%" not found', p_stage_name;
    RETURN NULL;
  END IF;

  -- Find product matching strain + stage + smalls flag
  SELECT id INTO v_product_id
  FROM products
  WHERE strain_id = v_strain_id
    AND stage_id = v_stage_id
    AND (is_active IS NULL OR is_active = true)
    AND (is_archived IS NULL OR is_archived = false)
    AND (
      (p_is_smalls = false AND (name NOT ILIKE '%smalls%'))
      OR
      (p_is_smalls = true AND name ILIKE '%smalls%')
    )
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE WARNING 'No product found for strain_id=%, stage=%, smalls=%',
      v_strain_id, p_stage_name, p_is_smalls;
  END IF;

  RETURN v_product_id;
END;
$$;

COMMENT ON FUNCTION get_product_id_by_strain_stage_and_type IS
'Enhanced product lookup using strain_id + stage_id instead of name patterns. More reliable for finding products.';

-- =====================================================
-- TRIGGER FUNCTION: Fixed Trim Session Conversions
-- =====================================================

CREATE OR REPLACE FUNCTION auto_create_pending_conversions_from_trim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch_id uuid;
  v_flower_product_id uuid;
  v_smalls_product_id uuid;
BEGIN
  -- Only process if session_status changed to 'completed'
  IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN

    -- Look up batch_id from batch_number
    SELECT id INTO v_batch_id
    FROM batch_registry
    WHERE batch_number = NEW.batch_number;

    IF v_batch_id IS NULL THEN
      RAISE WARNING 'Trim session % completed but batch_number % not found in batch_registry',
        NEW.id, NEW.batch_number;
      RETURN NEW;
    END IF;

    -- Get product IDs using enhanced lookup
    v_flower_product_id := get_product_id_by_strain_stage_and_type(v_batch_id, 'Bulk', false);
    v_smalls_product_id := get_product_id_by_strain_stage_and_type(v_batch_id, 'Bulk', true);

    -- Create pending conversion for Flower (if weight > 0 and product exists)
    IF NEW.bucked_weight_grams IS NOT NULL
       AND NEW.bucked_weight_grams > 0
       AND v_flower_product_id IS NOT NULL THEN

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
        v_batch_id,
        v_flower_product_id,
        NEW.bucked_weight_grams,
        NEW.bucked_weight_grams,
        'pending',
        auth.uid()
      );

      RAISE NOTICE 'Created pending conversion for %g flower from trim session %',
        NEW.bucked_weight_grams, NEW.id;
    END IF;

    -- Create pending conversion for Smalls (if weight > 0 and product exists)
    IF NEW.bucked_smalls_grams IS NOT NULL
       AND NEW.bucked_smalls_grams > 0
       AND v_smalls_product_id IS NOT NULL THEN

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
        v_batch_id,
        v_smalls_product_id,
        NEW.bucked_smalls_grams,
        NEW.bucked_smalls_grams,
        'pending',
        auth.uid()
      );

      RAISE NOTICE 'Created pending conversion for %g smalls from trim session %',
        NEW.bucked_smalls_grams, NEW.id;
    END IF;

    -- Note: trim_weight_grams is waste trim, not tracked as saleable inventory

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_pending_conversions_from_trim IS
'Creates pending conversions when trim sessions complete. Fixed to use correct schema: bucked_weight_grams, bucked_smalls_grams, batch_number lookup, session_status field.';

-- =====================================================
-- TRIGGER FUNCTION: Restored Packaging Session Conversions
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
  v_batch_id uuid;
BEGIN
  -- Only process if session_status changed to 'completed'
  IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN

    -- Look up batch_id from batch_id field (note: packaging uses batch_id, not batch_number)
    SELECT id INTO v_batch_id
    FROM batch_registry
    WHERE batch_number = NEW.batch_id;

    IF v_batch_id IS NULL THEN
      RAISE WARNING 'Packaging session % completed but batch_id % not found in batch_registry',
        NEW.id, NEW.batch_id;
      RETURN NEW;
    END IF;

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
          AND (is_archived IS NULL OR is_archived = false)
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
            v_batch_id,
            v_product_id_3_5g,
            NEW.units_3_5g,
            NEW.units_3_5g,
            'pending',
            auth.uid()
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
          AND (is_archived IS NULL OR is_archived = false)
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
            v_batch_id,
            v_product_id_14g,
            NEW.units_14g,
            NEW.units_14g,
            'pending',
            auth.uid()
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
          AND (is_archived IS NULL OR is_archived = false)
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
            v_batch_id,
            v_product_id_454g,
            NEW.units_454g,
            NEW.units_454g,
            'pending',
            auth.uid()
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
'Creates pending conversions when packaging sessions complete. Restored working version from Oct 27 migration with batch_id lookup added.';

-- =====================================================
-- RECREATE TRIGGERS
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_auto_create_pending_conversions_from_trim ON trim_sessions;
DROP TRIGGER IF EXISTS trigger_auto_create_pending_conversions_from_packaging ON packaging_sessions;

-- Create trigger on trim_sessions
CREATE TRIGGER trigger_auto_create_pending_conversions_from_trim
  AFTER UPDATE ON trim_sessions
  FOR EACH ROW
  WHEN (OLD.session_status IS DISTINCT FROM NEW.session_status)
  EXECUTE FUNCTION auto_create_pending_conversions_from_trim();

-- Create trigger on packaging_sessions
CREATE TRIGGER trigger_auto_create_pending_conversions_from_packaging
  AFTER UPDATE ON packaging_sessions
  FOR EACH ROW
  WHEN (OLD.session_status IS DISTINCT FROM NEW.session_status)
  EXECUTE FUNCTION auto_create_pending_conversions_from_packaging();
