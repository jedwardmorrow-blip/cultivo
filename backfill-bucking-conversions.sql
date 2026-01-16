/*
  Backfill Script: Create Pending Conversions for Historical Bucking Sessions

  This script processes all completed bucking sessions that don't have
  pending_conversions records yet. It manually calls the same logic that
  the trigger would have executed.

  WHEN TO RUN:
  - After applying the enable_bucking_session_conversions migration
  - If you have existing completed bucking sessions
  - Before expecting historical sessions to appear in Conversions tab

  SAFETY:
  - Only processes sessions without existing pending_conversions
  - Uses same product lookup logic as trigger
  - Logs all actions for audit trail
  - Does not modify session records
*/

-- Backfill pending conversions for completed bucking sessions
DO $$
DECLARE
  v_session RECORD;
  v_batch_id uuid;
  v_flower_product_id uuid;
  v_smalls_product_id uuid;
  v_processed_count integer := 0;
  v_flower_count integer := 0;
  v_smalls_count integer := 0;
BEGIN
  RAISE NOTICE 'Starting backfill of bucking session conversions...';

  -- Loop through all completed bucking sessions without conversions
  FOR v_session IN
    SELECT bs.*
    FROM bucking_sessions bs
    WHERE bs.session_status = 'completed'
      AND NOT EXISTS (
        SELECT 1 FROM pending_conversions pc
        WHERE pc.session_id = bs.id
          AND pc.session_type = 'bucking'
      )
    ORDER BY bs.completed_at DESC
  LOOP
    -- Look up batch UUID
    SELECT id INTO v_batch_id
    FROM batch_registry
    WHERE batch_number = v_session.batch_id;

    IF v_batch_id IS NULL THEN
      RAISE WARNING 'Bucking session % has batch_id % not found in batch_registry - SKIPPING',
        v_session.id, v_session.batch_id;
      CONTINUE;
    END IF;

    -- Get product IDs using helper function
    v_flower_product_id := get_product_id_by_strain_stage_and_type(v_batch_id, 'Bucked', false);
    v_smalls_product_id := get_product_id_by_strain_stage_and_type(v_batch_id, 'Bucked', true);

    -- Create conversion for bucked flower
    IF v_session.bucked_flower_grams IS NOT NULL
       AND v_session.bucked_flower_grams > 0
       AND v_flower_product_id IS NOT NULL THEN

      INSERT INTO pending_conversions (
        session_id,
        session_type,
        batch_id,
        product_id,
        original_weight,
        remaining_weight,
        status,
        created_by,
        created_at
      ) VALUES (
        v_session.id,
        'bucking',
        v_batch_id,
        v_flower_product_id,
        v_session.bucked_flower_grams,
        v_session.bucked_flower_grams,
        'pending',
        auth.uid(),
        v_session.completed_at  -- Use session completion time
      );

      v_flower_count := v_flower_count + 1;
      RAISE NOTICE 'Created pending conversion for %g bucked flower from session % (batch %)',
        v_session.bucked_flower_grams, v_session.id, v_session.batch_id;

    ELSIF v_session.bucked_flower_grams > 0 AND v_flower_product_id IS NULL THEN
      RAISE WARNING 'Session % has bucked flower but no Bucked Flower product found for batch %',
        v_session.id, v_session.batch_id;
    END IF;

    -- Create conversion for bucked smalls
    IF v_session.bucked_smalls_grams IS NOT NULL
       AND v_session.bucked_smalls_grams > 0
       AND v_smalls_product_id IS NOT NULL THEN

      INSERT INTO pending_conversions (
        session_id,
        session_type,
        batch_id,
        product_id,
        original_weight,
        remaining_weight,
        status,
        created_by,
        created_at
      ) VALUES (
        v_session.id,
        'bucking',
        v_batch_id,
        v_smalls_product_id,
        v_session.bucked_smalls_grams,
        v_session.bucked_smalls_grams,
        'pending',
        auth.uid(),
        v_session.completed_at  -- Use session completion time
      );

      v_smalls_count := v_smalls_count + 1;
      RAISE NOTICE 'Created pending conversion for %g bucked smalls from session % (batch %)',
        v_session.bucked_smalls_grams, v_session.id, v_session.batch_id;

    ELSIF v_session.bucked_smalls_grams > 0 AND v_smalls_product_id IS NULL THEN
      RAISE WARNING 'Session % has bucked smalls but no Bucked Smalls product found for batch %',
        v_session.id, v_session.batch_id;
    END IF;

    v_processed_count := v_processed_count + 1;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % sessions processed, % flower conversions, % smalls conversions',
    v_processed_count, v_flower_count, v_smalls_count;

  -- Note: conversion_lots will be automatically updated by the aggregation trigger
  RAISE NOTICE 'Aggregation trigger will automatically create/update conversion_lots';
END $$;

-- Verify results
SELECT
  bs.id,
  bs.strain,
  bs.batch_id,
  bs.bucked_flower_grams,
  bs.bucked_smalls_grams,
  bs.completed_at,
  COUNT(pc.id) as conversion_count
FROM bucking_sessions bs
LEFT JOIN pending_conversions pc ON pc.session_id = bs.id AND pc.session_type = 'bucking'
WHERE bs.session_status = 'completed'
GROUP BY bs.id
ORDER BY bs.completed_at DESC
LIMIT 10;
