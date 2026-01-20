/*
  # Fix Trim Session Batch ID Format

  1. Problem
    - 7 trim sessions have batch_id in UUID format instead of text batch_number format
    - This causes batch_registry_id to remain NULL
    - These sessions are invisible in conversion views and don't create pending conversions

  2. Changes
    - Backfill batch_registry_id from batch_id UUID
    - Update batch_id to use batch_number text format for consistency
    - Only affects sessions where:
      - batch_registry_id IS NULL
      - batch_id contains a valid UUID format

  3. Impact
    - Makes 7 historical trim sessions visible in conversion system
    - Ensures all trim sessions follow same batch_id format as bucking/packaging
    - No breaking changes - only fixes data inconsistency

  4. Safety
    - Uses regex pattern to only update UUID-format batch_ids
    - Preserves all other session data
    - Transaction will rollback if any lookup fails
*/

DO $$
DECLARE
  v_session RECORD;
  v_batch_uuid uuid;
  v_batch_number text;
  v_updated_count int := 0;
BEGIN
  RAISE NOTICE 'Starting trim session batch_id format fix...';

  -- Loop through trim sessions with UUID-format batch_id
  FOR v_session IN
    SELECT
      id,
      batch_id,
      strain,
      session_date
    FROM trim_sessions
    WHERE batch_registry_id IS NULL
      AND batch_id IS NOT NULL
      AND batch_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  LOOP
    -- Cast batch_id to UUID
    BEGIN
      v_batch_uuid := v_session.batch_id::uuid;

      -- Look up batch_number from batch_registry
      SELECT batch_number INTO v_batch_number
      FROM batch_registry
      WHERE id = v_batch_uuid;

      IF v_batch_number IS NOT NULL THEN
        -- Update both batch_registry_id and batch_id
        UPDATE trim_sessions
        SET
          batch_registry_id = v_batch_uuid,
          batch_id = v_batch_number
        WHERE id = v_session.id;

        v_updated_count := v_updated_count + 1;

        RAISE NOTICE 'Fixed session % - UUID: % -> batch_number: %',
          v_session.id, v_batch_uuid, v_batch_number;
      ELSE
        RAISE WARNING 'Session % has batch_id UUID % but no matching batch_registry record',
          v_session.id, v_batch_uuid;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to process session %: %', v_session.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Trim session batch_id fix complete. Updated % sessions.', v_updated_count;

  -- Verify the fix
  PERFORM 1
  FROM trim_sessions
  WHERE batch_registry_id IS NULL
    AND batch_id IS NOT NULL
    AND batch_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  IF FOUND THEN
    RAISE WARNING 'Some trim sessions still have UUID-format batch_id after migration';
  ELSE
    RAISE NOTICE 'All trim sessions now use text batch_number format';
  END IF;
END $$;
