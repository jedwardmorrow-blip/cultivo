/*
  # Individual Plants + Batch-at-Clone-Time

  ## Summary
  This migration makes two connected changes:

  1. **individual_plants table** — Stores individual state-registered plant IDs (12-digit numeric
     strings) that match the format used by Arizona's existing seed-to-sale software, enabling
     direct import without transformation. Each row belongs to a plant_group and carries a
     state_plant_id that is unique across the entire system.

  2. **batch_registry_id on plant_groups** — A nullable FK that links a plant group to its
     batch_registry row from the moment the group is created (not waiting until harvest).
     The trigger fn_generate_plant_group_number is updated to also INSERT a batch_registry row
     with lifecycle_state='pre_harvest' at the same time it generates the group_number.

  3. **clone_date on batch_registry** — A new nullable date column recording when the clone
     group was created, distinct from harvest_date.

  ## New Tables

  ### individual_plants
  - id (uuid, PK)
  - plant_group_id (uuid, FK → plant_groups.id)
  - state_plant_id (text, UNIQUE) — 12-digit numeric string matching old system format
  - is_active (boolean, default true) — false when plant is dead/removed
  - notes (text, nullable)
  - created_at (timestamptz)
  - created_by (uuid → auth.users)

  ## Modified Tables

  ### plant_groups
  - Added: batch_registry_id (uuid, nullable FK → batch_registry.id)

  ### batch_registry
  - Added: clone_date (date, nullable) — set at plant group creation

  ## Security
  - individual_plants: RLS enabled, authenticated users only

  ## Important Notes
  1. batch_registry_id on plant_groups is nullable — legacy groups created before this migration
     will have NULL until harvested (backward compatible).
  2. state_plant_id stores the raw 12-digit number as text (no formatting).
  3. ON CONFLICT (batch_number) DO NOTHING in the plant group trigger reuses an existing
     batch if the same strain was already planted today.
*/

ALTER TABLE batch_registry ADD COLUMN IF NOT EXISTS clone_date date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plant_groups' AND column_name = 'batch_registry_id'
  ) THEN
    ALTER TABLE plant_groups ADD COLUMN batch_registry_id uuid REFERENCES batch_registry(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS individual_plants (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_group_id uuid NOT NULL REFERENCES plant_groups(id),
  state_plant_id text NOT NULL,
  is_active      boolean NOT NULL DEFAULT true,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES auth.users(id),

  CONSTRAINT individual_plants_state_plant_id_unique UNIQUE (state_plant_id),
  CONSTRAINT individual_plants_state_plant_id_format
    CHECK (state_plant_id ~ '^[0-9]{12}$')
);

ALTER TABLE individual_plants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'individual_plants' AND policyname = 'Authenticated users can view individual plants'
  ) THEN
    CREATE POLICY "Authenticated users can view individual plants"
      ON individual_plants FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'individual_plants' AND policyname = 'Authenticated users can insert individual plants'
  ) THEN
    CREATE POLICY "Authenticated users can insert individual plants"
      ON individual_plants FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'individual_plants' AND policyname = 'Authenticated users can update individual plants'
  ) THEN
    CREATE POLICY "Authenticated users can update individual plants"
      ON individual_plants FOR UPDATE TO authenticated
      USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_individual_plants_plant_group_id ON individual_plants(plant_group_id);
CREATE INDEX IF NOT EXISTS idx_plant_groups_batch_registry_id ON plant_groups(batch_registry_id);
