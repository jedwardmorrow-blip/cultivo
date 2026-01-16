/*
  # Fix Conversion Aggregation Trigger - Batch Field Name

  ## Problem
  The aggregation trigger created earlier today references NEW.batch_number
  but trim_sessions table uses batch_id (text) field, not batch_number.
  This causes "record 'new' has no field 'batch_number'" error when
  completing trim sessions.

  ## Solution
  This is actually NOT an issue with the aggregation trigger itself!
  The aggregation trigger operates on pending_conversions table which
  HAS batch_id as UUID (correct).

  The issue is that when completing a trim session, the earlier trigger
  (auto_create_pending_conversions_from_trim) runs FIRST and it's using
  NEW.batch_number when it should use NEW.batch_id or NEW.batch_registry_id.

  However, looking at the migration from this morning
  (20251202204925_enable_trim_and_packaging_conversions), it correctly uses
  NEW.batch_number which should exist...

  Let me check if the issue is that it's using batch_number but should use
  batch_id (the text field) instead.

  ## Fix
  Update the trim trigger to use batch_id (text field) instead of batch_number
*/

-- Drop and recreate the trim trigger with correct field name
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
        v_batch_id_uuid,
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
        v_batch_id_uuid,
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
'Creates pending conversions when trim sessions complete. FIXED: Uses batch_id (text) or batch_registry_id (uuid) fields, not batch_number.';
