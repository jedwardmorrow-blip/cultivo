-- ============================================================================
-- Migration: Inventory Depleted Status Lifecycle
-- Date: 2026-04-17
-- Purpose: Add automatic status transitions for inventory items that reach
--          zero quantity, solving the "phantom inventory" problem where 68%
--          of items sit at qty=0 with status='available'.
--
-- Design:
--   - BEFORE UPDATE trigger on inventory_items modifies NEW.status in-place
--   - Bidirectional: available → depleted when qty hits 0,
--                    depleted → available when qty rises above 0
--   - Handles packaging return edge case (CONSUME→RETURN in same txn)
--   - No recursion risk (BEFORE trigger, not AFTER)
--   - Trigger name trg_auto_set_depleted_status fires after
--     trg_block_direct_quantity_updates alphabetically (correct order)
--
-- Impact analysis (13 RPC functions verified safe):
--   - consume_source_on_session_complete: bidirectional handles CONSUME→RETURN
--   - fn_update_inventory_on_hand: catches transition on qty change
--   - fn_fulfill/release/reverse order functions: all handled
--   - fn_apply_audit_adjustments: RECONCILIATION to 0 → depleted, to >0 → available
--   - get_projected_inventory: already filters available_qty > 0
--   - get_production_pipeline_summary: sums on_hand_qty, depleted = 0
--   - finalize_session_aggregated: new items start available with positive qty
--   - trigger_auto_archive_depleted_batch: checks available_qty, not status
--   - RLS: all policies use TRUE, no status filtering
--   - Frontend: filters by on_hand_qty > 0, not by status
-- ============================================================================

-- Step 1: Add depleted_at timestamp column
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS depleted_at timestamptz;

COMMENT ON COLUMN inventory_items.depleted_at IS
  'Timestamp when item was automatically marked depleted (on_hand_qty reached 0). Cleared when qty rises above 0.';

-- Step 2: Create the trigger function
CREATE OR REPLACE FUNCTION fn_auto_set_depleted_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Guard: only act when on_hand_qty actually changed
  IF OLD.on_hand_qty IS NOT DISTINCT FROM NEW.on_hand_qty THEN
    RETURN NEW;
  END IF;

  -- Transition TO depleted: qty dropped to 0 (or below) from a positive value
  IF NEW.on_hand_qty <= 0 AND OLD.on_hand_qty > 0 AND NEW.status = 'available' THEN
    NEW.status := 'depleted';
    NEW.depleted_at := now();
    RAISE NOTICE 'fn_auto_set_depleted_status: item % transitioned to depleted (qty % -> %)',
      NEW.id, OLD.on_hand_qty, NEW.on_hand_qty;
  END IF;

  -- Transition FROM depleted: qty went back above 0
  -- Covers: packaging ending_weight return, audit corrections, order reverts
  IF NEW.on_hand_qty > 0 AND OLD.on_hand_qty <= 0 AND NEW.status = 'depleted' THEN
    NEW.status := 'available';
    NEW.depleted_at := NULL;
    RAISE NOTICE 'fn_auto_set_depleted_status: item % restored to available (qty % -> %)',
      NEW.id, OLD.on_hand_qty, NEW.on_hand_qty;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_auto_set_depleted_status() IS
  'BEFORE UPDATE trigger: auto-transitions inventory_items status between available and depleted based on on_hand_qty crossing the zero boundary. Bidirectional to handle packaging returns and audit corrections.';

-- Step 3: Create the trigger
-- Named trg_auto_set_depleted_status so it fires AFTER trg_block_direct_quantity_updates
-- (Postgres fires BEFORE triggers in alphabetical order by trigger name)
DROP TRIGGER IF EXISTS trg_auto_set_depleted_status ON inventory_items;

CREATE TRIGGER trg_auto_set_depleted_status
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_set_depleted_status();

-- Step 4: Update get_production_pipeline_summary to exclude 'depleted'
-- (Cosmetic — depleted items have qty=0 so they contribute 0 to sums,
--  but cleaner to exclude them from counts)
CREATE OR REPLACE FUNCTION get_production_pipeline_summary()
RETURNS TABLE(stage text, item_count bigint, total_qty_g numeric, batch_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  WITH categorized AS (
    SELECT
      CASE ii.category
        WHEN 'flower_binned'   THEN 'binned'
        WHEN 'flower_bucked'   THEN 'bucked'
        WHEN 'smalls_bucked'   THEN 'bucked'
        WHEN 'flower_bulk'     THEN 'bulk'
        WHEN 'trim_bulk'       THEN 'bulk'
        WHEN 'smalls_bulk'     THEN 'bulk'
        WHEN 'flower_packaged' THEN 'packaged'
        ELSE NULL
      END AS stage,
      ii.on_hand_qty,
      ii.batch_id
    FROM inventory_items ii
    WHERE ii.status NOT IN ('consumed', 'archived', 'depleted')
      AND ii.category IN (
        'flower_binned','flower_bucked','smalls_bucked',
        'flower_bulk','trim_bulk','smalls_bulk','flower_packaged'
      )
  )
  SELECT
    c.stage,
    COUNT(*)                        AS item_count,
    COALESCE(SUM(c.on_hand_qty), 0) AS total_qty_g,
    COUNT(DISTINCT c.batch_id)      AS batch_count
  FROM categorized c
  GROUP BY c.stage
  ORDER BY
    CASE c.stage
      WHEN 'binned'   THEN 1
      WHEN 'bucked'   THEN 2
      WHEN 'bulk'     THEN 3
      WHEN 'packaged' THEN 4
      ELSE 5
    END;
$$;

-- Step 5: Backfill existing zero-qty items
-- 971 items currently at on_hand_qty=0 with status='available'
UPDATE inventory_items
SET status = 'depleted',
    depleted_at = now()
WHERE on_hand_qty <= 0
  AND status = 'available';
