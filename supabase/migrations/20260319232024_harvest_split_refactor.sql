-- Migration for Harvest Splitting Refactor

-- 1. Add new columns to harvest_weight_entries to handle split mass routing
ALTER TABLE public.harvest_weight_entries 
ADD COLUMN destination text CHECK (destination IN ('flower', 'fresh_frozen')),
ADD COLUMN location_id uuid;

-- 2. Safely backfill existing entries from their parent session properties
UPDATE public.harvest_weight_entries hwe
SET 
  destination = hs.harvest_type,
  location_id = hs.dry_room_id
FROM public.harvest_sessions hs
WHERE hwe.harvest_session_id = hs.id;

-- 3. Require the new columns for all future inserts (optional, but good practice. We might wait to enforce if old code runs).
-- Let's leave them nullable at DB level, but enforce at application level for a smoother rollout.

-- 4. Ensure all harvest_sessions have a batch_registry_id by lifting it from the plant_group
UPDATE public.harvest_sessions hs
SET batch_registry_id = pg.batch_registry_id
FROM public.plant_groups pg
WHERE hs.plant_group_id = pg.id AND hs.batch_registry_id IS NULL;

-- 5. Alter harvest_sessions to reflect the new batch-centric paradigm
ALTER TABLE public.harvest_sessions
  ALTER COLUMN plant_group_id DROP NOT NULL,
  DROP COLUMN harvest_type,
  DROP COLUMN dry_room_id;

-- We could enforce batch_registry_id IS NOT NULL, but to avoid strictly breaking edge cases, 
-- we leave it nullable here and enforce in typescript.
