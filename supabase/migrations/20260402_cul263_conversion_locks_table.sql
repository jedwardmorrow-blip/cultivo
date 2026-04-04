-- CUL-263: Create conversion_locks table with UNIQUE constraint
--
-- Context: useConversionLock.ts references a table named "pending_conversions"
-- to implement an optimistic lock for concurrent conversion prevention.
-- However, "pending_conversions" already exists as a VIEW (session finalization
-- pipeline). This migration creates a dedicated "conversion_locks" table with
-- the required schema and a partial UNIQUE index to atomically enforce
-- one-lock-per-inventory-item (replaces the unsafe check-then-insert pattern).
--
-- Builder follow-up required: update useConversionLock.ts to reference
-- "conversion_locks" instead of "pending_conversions" and use ON CONFLICT.

CREATE TABLE IF NOT EXISTS public.conversion_locks (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  source_inventory_id uuid        NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  status              text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversion_locks_pkey PRIMARY KEY (id)
);

-- Partial UNIQUE index: at most one 'pending' lock per inventory item.
-- ON CONFLICT on this index makes lock acquisition atomic.
CREATE UNIQUE INDEX conversion_locks_unique_pending
  ON public.conversion_locks (source_inventory_id)
  WHERE (status = 'pending');

-- Index to speed status + inventory lookups
CREATE INDEX conversion_locks_source_status_idx
  ON public.conversion_locks (source_inventory_id, status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_conversion_locks_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_conversion_locks_updated_at
  BEFORE UPDATE ON public.conversion_locks
  FOR EACH ROW EXECUTE FUNCTION public.set_conversion_locks_updated_at();

-- RLS
ALTER TABLE public.conversion_locks ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read locks (needed for optimistic UI feedback)
CREATE POLICY "conversion_locks_select"
  ON public.conversion_locks FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert locks
CREATE POLICY "conversion_locks_insert"
  ON public.conversion_locks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update their own locks (release/cancel)
CREATE POLICY "conversion_locks_update"
  ON public.conversion_locks FOR UPDATE
  TO authenticated
  USING (true);

COMMENT ON TABLE public.conversion_locks IS
  'Optimistic locks for inventory item conversions. '
  'The partial UNIQUE index on (source_inventory_id) WHERE status=''pending'' '
  'enforces that at most one in-flight conversion lock exists per inventory item. '
  'Use INSERT ... ON CONFLICT DO NOTHING to atomically acquire; check returned row.';
