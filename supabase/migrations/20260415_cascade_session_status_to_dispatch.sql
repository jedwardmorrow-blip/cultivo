-- Cascade session lifecycle to production_dispatch_items
--
-- Problem: bucking/trim/packaging sessions can be cancelled or completed, but
-- their linked production_dispatch_items row was not being updated. This left
-- dispatch rows stuck as 'pending' or 'in_progress' forever, causing:
--   - Stale "In Queue" badges in InventoryDrawer
--   - 23505 unique-index errors when trying to re-dispatch the same inventory
--   - Queue accumulation (Laura: "there's a lot in our queue we are not working on")
--
-- Fix: a DB trigger on each session table that cascades session_status changes
-- to the linked dispatch item. The DB is now the single source of truth — no
-- app code needs to remember to do this.
--
-- Invariant: a production_dispatch_items row does not outlive its linked
-- session. If the session ends (cancelled or completed), the dispatch row
-- ends with the same status.

-- ── Trigger function ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_cascade_session_status_to_dispatch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only act on meaningful transitions into a terminal state
  IF NEW.session_status IS DISTINCT FROM OLD.session_status
     AND NEW.session_status IN ('cancelled', 'completed')
     AND NEW.dispatch_item_id IS NOT NULL
  THEN
    UPDATE public.production_dispatch_items
    SET
      status     = NEW.session_status,
      updated_at = now()
    WHERE id = NEW.dispatch_item_id
      AND status IN ('pending', 'in_progress');
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_cascade_session_status_to_dispatch() IS
  'When a session transitions to cancelled or completed, cascade that status to the linked production_dispatch_items row. Idempotent via the status IN (pending,in_progress) guard.';

-- ── Triggers on each session table ────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_bucking_session_dispatch_cascade ON public.bucking_sessions;
CREATE TRIGGER trg_bucking_session_dispatch_cascade
  AFTER UPDATE OF session_status ON public.bucking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cascade_session_status_to_dispatch();

DROP TRIGGER IF EXISTS trg_trim_session_dispatch_cascade ON public.trim_sessions;
CREATE TRIGGER trg_trim_session_dispatch_cascade
  AFTER UPDATE OF session_status ON public.trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cascade_session_status_to_dispatch();

DROP TRIGGER IF EXISTS trg_packaging_session_dispatch_cascade ON public.packaging_sessions;
CREATE TRIGGER trg_packaging_session_dispatch_cascade
  AFTER UPDATE OF session_status ON public.packaging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cascade_session_status_to_dispatch();

-- ── One-time backfill for existing orphans ────────────────────────────────
-- If a dispatch item has ANY linked session that completed, mark it completed.
-- Otherwise if ANY linked session was cancelled, mark it cancelled.
-- (Completed takes precedence: work actually happened.)
UPDATE public.production_dispatch_items pdi
SET
  status = CASE
    WHEN EXISTS (
      SELECT 1 FROM public.bucking_sessions
        WHERE dispatch_item_id = pdi.id AND session_status = 'completed'
      UNION ALL
      SELECT 1 FROM public.trim_sessions
        WHERE dispatch_item_id = pdi.id AND session_status = 'completed'
      UNION ALL
      SELECT 1 FROM public.packaging_sessions
        WHERE dispatch_item_id = pdi.id AND session_status = 'completed'
    ) THEN 'completed'
    ELSE 'cancelled'
  END,
  updated_at = now()
WHERE pdi.status IN ('pending', 'in_progress')
  AND EXISTS (
    SELECT 1 FROM public.bucking_sessions
      WHERE dispatch_item_id = pdi.id AND session_status IN ('cancelled', 'completed')
    UNION ALL
    SELECT 1 FROM public.trim_sessions
      WHERE dispatch_item_id = pdi.id AND session_status IN ('cancelled', 'completed')
    UNION ALL
    SELECT 1 FROM public.packaging_sessions
      WHERE dispatch_item_id = pdi.id AND session_status IN ('cancelled', 'completed')
  );
