-- Fix trigger_auto_archive_depleted_batch: replace call to nonexistent
-- log_batch_lifecycle_event() with a direct INSERT INTO batch_lifecycle_events,
-- matching the pattern used by every other lifecycle trigger in the system.
--
-- This trigger fires on inventory_items UPDATE/DELETE. When all items for a
-- batch are depleted (and no active sessions exist), it archives the batch.
-- The old version crashed on the PERFORM log_batch_lifecycle_event(...) call
-- because that function was never created, which caused any operation that
-- fully depleted a batch to fail (including audit apply, order fulfillment,
-- manual adjustments, etc.).

CREATE OR REPLACE FUNCTION public.trigger_auto_archive_depleted_batch()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
INSERT INTO batch_lifecycle_events (
  batch_id, event_type, from_state, to_state,
  triggered_by, trigger_source, metadata, notes
) VALUES (
  v_batch_id, 'state_transition', v_current_state, 'archived',
  'system', 'auto_archive_depleted_batch',
  jsonb_build_object('trigger_op', TG_OP, 'archived_at', now()),
  'Auto-archived: all inventory depleted'
);
END IF;
END IF;

IF TG_OP = 'DELETE' THEN
RETURN OLD;
END IF;
RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION trigger_auto_archive_depleted_batch() IS
  'Auto-archives a batch when all its inventory items are depleted and no active sessions exist. Fires on inventory_items UPDATE/DELETE.';
