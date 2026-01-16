/*
  # Fix Conversion Trigger - Use Correct Field Names

  ## Problem
  The `auto_create_pending_conversions_from_trim()` function references incorrect field names:
  - Uses: `bucked_weight_grams` and `bucked_smalls_grams`
  - Actual schema: `big_buds_grams` and `small_buds_grams`

  This causes "record 'new' has no field 'bucked_weight_grams'" error when completing trim sessions.

  ## Root Cause
  Migration 20251202212233 created the function with wrong field names.
  The actual trim_sessions table schema (from 20251010183047) defines:
  - big_buds_grams (numeric) - Flower output in grams
  - small_buds_grams (numeric) - Smalls output in grams
  - trim_grams (numeric) - Trim output in grams

  ## Solution
  Recreate the function with correct field names. Changes:
  - Line 66: NEW.bucked_weight_grams → NEW.big_buds_grams
  - Line 84: NEW.bucked_weight_grams → NEW.big_buds_grams
  - Line 95: NEW.bucked_smalls_grams → NEW.small_buds_grams
  - Line 113: NEW.bucked_smalls_grams → NEW.small_buds_grams

  All other logic remains unchanged (batch lookup, product lookup, error handling).

  ## Files Changed
  - Recreates: auto_create_pending_conversions_from_trim() function

  ## Verified
  - Schema confirmed in migration 20251010183047_create_inventory_and_trim_workflow.sql
  - Follows minimal edit principle: only fixes field names, no other changes
*/

-- Drop and recreate the trim trigger with correct field names
CREATE OR REPLACE FUNCTION auto_create_pending_conversions_from_trim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch_id_uuid uuid;
  v_flower_product_id uuid;
  v_smalls_product_id uuid;
BEGIN
  -- Only process if session_status changed to 'completed'
  IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN

    -- Look up batch_id (uuid) from batch_id (text) field or batch_registry_id if available
    IF NEW.batch_registry_id IS NOT NULL THEN
      -- Use the FK if available
      v_batch_id_uuid := NEW.batch_registry_id;
    ELSIF NEW.batch_id IS NOT NULL THEN
      -- Look up from batch_id text field
      SELECT id INTO v_batch_id_uuid
      FROM batch_registry
      WHERE batch_number = NEW.batch_id;
    END IF;

    IF v_batch_id_uuid IS NULL THEN
      RAISE WARNING 'Trim session % completed but batch_id % could not be resolved to batch_registry',
        NEW.id, COALESCE(NEW.batch_registry_id::text, NEW.batch_id, 'NULL');
      RETURN NEW;
    END IF;

    -- Get product IDs using enhanced lookup
    v_flower_product_id := get_product_id_by_strain_stage_and_type(v_batch_id_uuid, 'Bulk', false);
    v_smalls_product_id := get_product_id_by_strain_stage_and_type(v_batch_id_uuid, 'Bulk', true);

    -- Create pending conversion for Flower (if weight > 0 and product exists)
    IF NEW.big_buds_grams IS NOT NULL
       AND NEW.big_buds_grams > 0
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
        v_batch_id_uuid,
        v_flower_product_id,
        NEW.big_buds_grams,
        NEW.big_buds_grams,
        'pending',
        auth.uid()
      );

      RAISE NOTICE 'Created pending conversion for %g flower from trim session %',
        NEW.big_buds_grams, NEW.id;
    END IF;

    -- Create pending conversion for Smalls (if weight > 0 and product exists)
    IF NEW.small_buds_grams IS NOT NULL
       AND NEW.small_buds_grams > 0
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
        v_batch_id_uuid,
        v_smalls_product_id,
        NEW.small_buds_grams,
        NEW.small_buds_grams,
        'pending',
        auth.uid()
      );

      RAISE NOTICE 'Created pending conversion for %g smalls from trim session %',
        NEW.small_buds_grams, NEW.id;
    END IF;

    -- Note: trim_grams is waste trim, not tracked as saleable inventory

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_pending_conversions_from_trim IS
'Creates pending conversions when trim sessions complete. Uses correct field names: big_buds_grams and small_buds_grams.';
