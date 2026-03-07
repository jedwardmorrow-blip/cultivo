/*
  # Fix auto-archive trigger to skip batches with active sessions

  ## Problem
  The auto-archive trigger (`trigger_auto_archive_depleted_batch`) was archiving
  batches that still had active trim/bucking/packaging sessions. When inventory
  `available_qty` drops to zero during session processing (material consumed but
  output not yet created), the trigger incorrectly treated the batch as depleted.

  This caused Laura to get: "Invalid lifecycle transition: archived -> bulk_available
  is not allowed" when completing a trim session for batch 260121-SWF.

  ## Root Cause
  The trigger only checked `inventory_items.available_qty` totals. It did not
  consider that active production sessions will create new inventory upon completion.

  ## Solution
  1. Update `trigger_auto_archive_depleted_batch()` to check for active sessions
     (trim, bucking, packaging) and pending conversions before archiving
  2. If any active session or pending conversion exists for the batch, skip archival

  ## Changes
  - Modified: `trigger_auto_archive_depleted_batch()` function
  - No new tables or columns
  - No RLS changes
*/

CREATE OR REPLACE FUNCTION trigger_auto_archive_depleted_batch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch_id uuid;
  v_total_available numeric;
  v_item_count bigint;
  v_current_state text;
  v_has_active_sessions boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_batch_id := OLD.batch_id;
  ELSE
    v_batch_id := NEW.batch_id;
  END IF;

  IF v_batch_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  SELECT lifecycle_state INTO v_current_state
  FROM batch_registry
  WHERE id = v_batch_id;

  IF v_current_state IS NULL OR v_current_state IN ('archived', 'pre_harvest') THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(SUM(available_qty), 0),
    COUNT(*)
  INTO v_total_available, v_item_count
  FROM inventory_items
  WHERE batch_id = v_batch_id;

  IF v_total_available <= 0 AND v_item_count > 0 THEN

    v_has_active_sessions := false;

    IF EXISTS (
      SELECT 1 FROM trim_sessions
      WHERE batch_registry_id = v_batch_id AND session_status = 'active'
    ) THEN
      v_has_active_sessions := true;
    END IF;

    IF NOT v_has_active_sessions AND EXISTS (
      SELECT 1 FROM bucking_sessions
      WHERE batch_registry_id = v_batch_id AND session_status = 'active'
    ) THEN
      v_has_active_sessions := true;
    END IF;

    IF NOT v_has_active_sessions AND EXISTS (
      SELECT 1 FROM packaging_sessions
      WHERE batch_registry_id = v_batch_id AND session_status = 'active'
    ) THEN
      v_has_active_sessions := true;
    END IF;

    IF NOT v_has_active_sessions AND EXISTS (
      SELECT 1 FROM pending_conversion_sessions
      WHERE batch_id = v_batch_id
        AND finalization_status IS DISTINCT FROM 'finalized'
    ) THEN
      v_has_active_sessions := true;
    END IF;

    IF v_has_active_sessions THEN
      RAISE NOTICE 'Skipping auto-archive for batch %: active sessions or pending conversions in progress',
        v_batch_id;
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      END IF;
      RETURN NEW;
    END IF;

    UPDATE batch_registry
    SET
      lifecycle_state = 'archived',
      status = 'archived',
      depleted_at = COALESCE(depleted_at, now()),
      updated_at = now()
    WHERE id = v_batch_id
      AND lifecycle_state NOT IN ('archived', 'pre_harvest');

    IF FOUND THEN
      PERFORM log_batch_lifecycle_event(
        v_batch_id,
        'state_transition',
        v_current_state,
        'archived',
        'system',
        'Auto-archived: all inventory depleted'
      );
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
