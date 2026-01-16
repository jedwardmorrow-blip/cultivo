/*
  # Manually Aggregate Pending Conversions into Conversion Lots

  ## Problem
  Phase 3 migration disabled aggregation triggers and the manual aggregation failed because
  the function `upsert_conversion_lot_from_pending_manual` doesn't exist.

  ## Solution
  Manually insert conversion_lots records for all pending_conversions created in Phase 3.

  ## Impact
  Dog Walker conversions (and any others from Phase 3) will now appear in the UI.
*/

DO $$
DECLARE
  v_pc_group RECORD;
  v_lot_id uuid;
BEGIN
  RAISE NOTICE '=== MANUALLY AGGREGATING PENDING CONVERSIONS ===';

  -- For each unique batch_id + product_id combination in pending_conversions
  FOR v_pc_group IN
    SELECT
      pc.batch_id,
      pc.product_id,
      COUNT(*) as session_count,
      SUM(pc.original_weight) as total_weight,
      SUM(pc.remaining_weight) as remaining_weight,
      SUM(pc.original_units) as total_units,
      SUM(pc.remaining_units) as remaining_units
    FROM pending_conversions pc
    WHERE pc.status = 'pending'
      AND pc.created_at >= (now() - interval '14 days')
      AND pc.created_by IS NULL  -- System-created from Phase 3
    GROUP BY pc.batch_id, pc.product_id
  LOOP
    RAISE NOTICE 'Creating conversion lot for batch=%, product=%',
      v_pc_group.batch_id, v_pc_group.product_id;

    -- Insert or update conversion_lot
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
      v_pc_group.batch_id,
      v_pc_group.product_id,
      CURRENT_DATE,
      v_pc_group.total_weight,
      v_pc_group.total_units,
      v_pc_group.remaining_weight,
      v_pc_group.remaining_units,
      v_pc_group.session_count,
      'active',
      now()
    )
    ON CONFLICT (batch_id, product_id, lot_date)
    DO UPDATE SET
      total_weight = EXCLUDED.total_weight,
      total_units = EXCLUDED.total_units,
      remaining_weight = EXCLUDED.remaining_weight,
      remaining_units = EXCLUDED.remaining_units,
      contributing_session_count = EXCLUDED.contributing_session_count,
      updated_at = now()
    RETURNING id INTO v_lot_id;

    RAISE NOTICE '  ✓ Created/Updated lot %', v_lot_id;
    RAISE NOTICE '    Weight: %g / Units: %',
      v_pc_group.total_weight, v_pc_group.total_units;

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== AGGREGATION COMPLETE ===';
  RAISE NOTICE 'Check Inventory > Conversions in UI to see pending conversions';

END $$;
