/*
  # Multi-Mother Clone Support

  ## Summary
  Adds infrastructure to track multiple source mothers when creating a clone batch,
  and stores mother plant group IDs on the batch registry so traceability flows
  all the way through to finished inventory without any downstream schema changes.

  ## Changes

  ### Modified Tables

  #### plant_groups
  - Added: source_type (text, default 'clone') — 'clone' or 'seed'
    - clone: originated from cuttings taken from mother plants
    - seed: originated from seeds (no mother lineage required)

  #### batch_registry
  - Added: mother_plant_group_ids (uuid[], nullable) — array of all mother plant group IDs
    that contributed cuts to this batch. Set at group creation time. Provides mother
    traceability to every downstream stage (trim, packaging, labels, inventory) without
    additional joins.

  ### New Tables

  #### plant_group_cut_sessions
  Records each cutting event from a specific mother plant into a plant group.
  A single plant group can have cuts from multiple mothers of the same strain.

  Columns:
  - id (uuid, PK)
  - plant_group_id (uuid, FK → plant_groups.id)
  - mother_plant_group_id (uuid, FK → plant_groups.id) — the source mother
  - cut_count (integer) — number of cuts taken from this mother in this session
  - cut_date (date, nullable) — when the cuts were taken
  - notes (text, nullable)
  - created_at (timestamptz)
  - created_by (uuid → auth.users)

  ## Security
  - plant_group_cut_sessions: RLS enabled, authenticated users only
  - All policies follow existing cultivation table pattern

  ## Important Notes
  1. source_type defaults to 'clone' — backward compatible with all existing plant groups
  2. mother_plant_group_ids is nullable — legacy batches not created via new flow will have NULL
  3. plant_groups.mother_plant_group_id (singular) is kept for backward compatibility; it will
     be set to the first cut session's mother when creating via the new multi-mother flow
  4. The array on batch_registry is the authoritative traceability record; the linking table is
     the source of truth for cut counts and dates
*/

-- Add source_type to plant_groups
ALTER TABLE plant_groups ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'clone'
  CHECK (source_type IN ('clone', 'seed'));

-- Add mother_plant_group_ids array to batch_registry
ALTER TABLE batch_registry ADD COLUMN IF NOT EXISTS mother_plant_group_ids uuid[];

-- Create plant_group_cut_sessions table
CREATE TABLE IF NOT EXISTS plant_group_cut_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_group_id        uuid NOT NULL REFERENCES plant_groups(id) ON DELETE CASCADE,
  mother_plant_group_id uuid NOT NULL REFERENCES plant_groups(id),
  cut_count             integer NOT NULL CHECK (cut_count > 0),
  cut_date              date,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid REFERENCES auth.users(id)
);

ALTER TABLE plant_group_cut_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'plant_group_cut_sessions' AND policyname = 'Authenticated users can view cut sessions'
  ) THEN
    CREATE POLICY "Authenticated users can view cut sessions"
      ON plant_group_cut_sessions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'plant_group_cut_sessions' AND policyname = 'Authenticated users can insert cut sessions'
  ) THEN
    CREATE POLICY "Authenticated users can insert cut sessions"
      ON plant_group_cut_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'plant_group_cut_sessions' AND policyname = 'Authenticated users can update cut sessions'
  ) THEN
    CREATE POLICY "Authenticated users can update cut sessions"
      ON plant_group_cut_sessions FOR UPDATE TO authenticated
      USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'plant_group_cut_sessions' AND policyname = 'Authenticated users can delete cut sessions'
  ) THEN
    CREATE POLICY "Authenticated users can delete cut sessions"
      ON plant_group_cut_sessions FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cut_sessions_plant_group_id ON plant_group_cut_sessions(plant_group_id);
CREATE INDEX IF NOT EXISTS idx_cut_sessions_mother_id ON plant_group_cut_sessions(mother_plant_group_id);
CREATE INDEX IF NOT EXISTS idx_plant_groups_source_type ON plant_groups(source_type);
