/*
  # Enable Automatic Pending Conversions for Bucking Sessions

  ## Overview
  Adds conversion trigger for bucking sessions, completing the conversion system
  for all three session types (bucking, trim, packaging). When a bucking session
  completes, this trigger automatically creates pending_conversions records for
  the bucked flower and smalls outputs.

  ## Problem Being Solved
  1. Bucking sessions were completing successfully but not creating conversions
  2. Bucked material outputs were invisible to managers in Conversions tab
  3. Inventory stuck in bucked stage with no path to next stage
  4. Inconsistent behavior: trim and packaging had triggers, bucking didn't

  ## Solution
  1. Create trigger function for bucking session conversions
  2. Use existing helper function for product lookup (strain + stage based)
  3. Handle both bucked flower and bucked smalls outputs
  4. Follow same patterns as trim and packaging triggers
  5. Integrate with existing conversion_lots aggregation system

  ## Changes Made
  - New function: auto_create_pending_conversions_from_bucking()
  - New trigger: trigger_auto_create_pending_conversions_from_bucking
  - Uses existing helper: get_product_id_by_strain_stage_and_type()
  - Uses existing aggregation: upsert_conversion_lot_from_pending()

  ## Safety Features
  - Fails gracefully (logs warning, doesn't crash session)
  - Handles missing batches/products without errors
  - Uses auth.uid() for created_by tracking
  - Extensive RAISE NOTICE/WARNING for debugging
*/

-- =====================================================
-- TRIGGER FUNCTION: Bucking Session Conversions
-- =====================================================

CREATE OR REPLACE FUNCTION auto_create_pending_conversions_from_bucking()
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

    -- Look up batch_id (UUID) from batch_id field (string/batch_number)
    -- NOTE: bucking_sessions.batch_id is a text field containing the batch_number
    SELECT id INTO v_batch_id
    FROM batch_registry
    WHERE batch_number = NEW.batch_id;

    IF v_batch_id IS NULL THEN
      RAISE WARNING 'Bucking session % completed but batch_id % not found in batch_registry',
        NEW.id, NEW.batch_id;
      RETURN NEW;
    END IF;

    -- Get product IDs using enhanced lookup for "Bucked" stage
    -- This finds products like "Lemondary - Bucked Flower" and "Lemondary - Bucked Smalls"
    v_flower_product_id := get_product_id_by_strain_stage_and_type(v_batch_id, 'Bucked', false);
    v_smalls_product_id := get_product_id_by_strain_stage_and_type(v_batch_id, 'Bucked', true);

    -- Create pending conversion for Bucked Flower (if weight > 0 and product exists)
    IF NEW.bucked_flower_grams IS NOT NULL
       AND NEW.bucked_flower_grams > 0
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
        'bucking',
        v_batch_id,
        v_flower_product_id,
        NEW.bucked_flower_grams,
        NEW.bucked_flower_grams,
        'pending',
        auth.uid()
      );

      RAISE NOTICE 'Created pending conversion for %g bucked flower from bucking session %',
        NEW.bucked_flower_grams, NEW.id;
    ELSIF NEW.bucked_flower_grams > 0 AND v_flower_product_id IS NULL THEN
      RAISE WARNING 'Bucking session % has bucked flower but no Bucked Flower product found for batch %',
        NEW.id, NEW.batch_id;
    END IF;

    -- Create pending conversion for Bucked Smalls (if weight > 0 and product exists)
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
        'bucking',
        v_batch_id,
        v_smalls_product_id,
        NEW.bucked_smalls_grams,
        NEW.bucked_smalls_grams,
        'pending',
        auth.uid()
      );

      RAISE NOTICE 'Created pending conversion for %g bucked smalls from bucking session %',
        NEW.bucked_smalls_grams, NEW.id;
    ELSIF NEW.bucked_smalls_grams > 0 AND v_smalls_product_id IS NULL THEN
      RAISE WARNING 'Bucking session % has bucked smalls but no Bucked Smalls product found for batch %',
        NEW.id, NEW.batch_id;
    END IF;

    -- Note: waste_grams is tracked for reporting but not converted to inventory

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_pending_conversions_from_bucking IS
'Creates pending conversions when bucking sessions complete. Outputs bucked flower and smalls as pending conversions for manager review.';

-- =====================================================
-- CREATE TRIGGER
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_create_pending_conversions_from_bucking ON bucking_sessions;

-- Create trigger on bucking_sessions
CREATE TRIGGER trigger_auto_create_pending_conversions_from_bucking
  AFTER UPDATE ON bucking_sessions
  FOR EACH ROW
  WHEN (OLD.session_status IS DISTINCT FROM NEW.session_status)
  EXECUTE FUNCTION auto_create_pending_conversions_from_bucking();

COMMENT ON TRIGGER trigger_auto_create_pending_conversions_from_bucking ON bucking_sessions IS
'Automatically creates pending conversions when bucking sessions are marked as completed';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these queries after migration to verify setup:
--
-- 1. Check trigger exists:
-- SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'trigger_auto_create_pending_conversions_from_bucking';
--
-- 2. Check function exists:
-- SELECT proname FROM pg_proc WHERE proname = 'auto_create_pending_conversions_from_bucking';
--
-- 3. Test with a bucking session (if any completed sessions exist):
-- SELECT
--   bs.id,
--   bs.strain,
--   bs.batch_id,
--   bs.bucked_flower_grams,
--   bs.bucked_smalls_grams,
--   bs.session_status,
--   COUNT(pc.id) as conversion_count
-- FROM bucking_sessions bs
-- LEFT JOIN pending_conversions pc ON pc.session_id = bs.id AND pc.session_type = 'bucking'
-- WHERE bs.session_status = 'completed'
-- GROUP BY bs.id
-- ORDER BY bs.completed_at DESC
-- LIMIT 10;
