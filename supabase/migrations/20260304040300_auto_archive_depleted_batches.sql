/*
  # Auto-archive depleted batches

  1. New Trigger Function
    - `trigger_auto_archive_depleted_batch()` fires AFTER UPDATE or DELETE on inventory_items
    - When available_qty changes or an inventory item is deleted, checks if the batch
      has any remaining available inventory
    - If total available_qty across all inventory_items for the batch is zero or less,
      AND the batch has at least one inventory_items row (to avoid archiving new batches
      that never had inventory), the batch is automatically archived
    - Logs the transition via log_batch_lifecycle_event()
    - Skips batches already in 'archived' or 'pre_harvest' state

  2. Data Backfill
    - Archives 8 historical batches that have initial_weight_grams > 0 but zero
      inventory remaining
    - These batches were depleted before this trigger existed

  3. Security
    - No RLS changes (trigger runs in security definer context)

  4. Important Notes
    - The existing trigger_batch_stage_weight_changed on batch_stage_tracking is
      inert in production (no rows in that table). This new trigger on inventory_items
      is where the real depletion signal lives.
    - Only fires when available_qty actually changes, minimizing overhead
*/

-- Create the auto-archive trigger function
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

DROP TRIGGER IF EXISTS on_inventory_item_depleted_archive ON inventory_items;
CREATE TRIGGER on_inventory_item_depleted_archive
  AFTER UPDATE OF available_qty ON inventory_items
  FOR EACH ROW
  WHEN (OLD.available_qty IS DISTINCT FROM NEW.available_qty)
  EXECUTE FUNCTION trigger_auto_archive_depleted_batch();

DROP TRIGGER IF EXISTS on_inventory_item_deleted_archive ON inventory_items;
CREATE TRIGGER on_inventory_item_deleted_archive
  AFTER DELETE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_archive_depleted_batch();

-- Backfill: archive historical batches that have initial_weight > 0 but no inventory
UPDATE batch_registry
SET
  lifecycle_state = 'archived',
  status = 'archived',
  depleted_at = COALESCE(depleted_at, now()),
  updated_at = now()
WHERE lifecycle_state NOT IN ('archived', 'pre_harvest')
  AND initial_weight_grams > 0
  AND NOT EXISTS (
    SELECT 1 FROM inventory_items ii
    WHERE ii.batch_id = batch_registry.id
      AND ii.available_qty > 0
  )
  AND EXISTS (
    SELECT 1 FROM inventory_items ii2
    WHERE ii2.batch_id = batch_registry.id
  );