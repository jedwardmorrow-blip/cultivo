/*
  # Create Cultivation Schema — C-2-1

  Version control record for the cultivation schema. All five tables and their
  RLS policies were deployed to the live database during Session C-2/C-3
  (2026-02-19). This migration is idempotent — it uses IF NOT EXISTS and
  DO $$ blocks to skip objects that already exist.

  ## Tables Created

  1. grow_rooms — physical rooms; room_code unique + immutable (trigger in C-2-2)
  2. plant_groups — plant groups with strain/room/stage tracking; group_number auto-generated
  3. plant_group_stage_history — immutable stage transition audit log
  4. plant_group_room_history — immutable room transfer audit log
  5. harvest_sessions — harvest events; completion trigger creates batch_registry row

  ## Security

  All tables: RLS enabled, authenticated users only (no anon access).
  History tables: SELECT + INSERT only (no UPDATE/DELETE — append-only).

  ## Notes

  - group_number is set by trg_generate_plant_group_number (C-2-2); app passes 'PENDING'
  - strains.abbreviation nullable; enforcement is trigger-only (C-2-2)
  - batch_registry.strain_id has no FK constraint; referential integrity is app-enforced
  - ON CONFLICT (batch_number) DO NOTHING in harvest completion trigger (C-2-2) handles
    same-strain same-day harvests; initial_weight_grams = first session only (Invariant C-17)
*/

CREATE TABLE IF NOT EXISTS grow_rooms (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  room_code        text NOT NULL,
  room_type        text NOT NULL DEFAULT 'flower'
                     CHECK (room_type IN ('clone', 'veg', 'flower', 'mother', 'mixed')),
  capacity_plants  integer,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES auth.users(id),

  CONSTRAINT grow_rooms_room_code_unique UNIQUE (room_code),
  CONSTRAINT grow_rooms_capacity_positive CHECK (
    capacity_plants IS NULL OR capacity_plants > 0
  )
);

ALTER TABLE grow_rooms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'grow_rooms' AND policyname = 'Authenticated users can view grow rooms'
  ) THEN
    CREATE POLICY "Authenticated users can view grow rooms"
      ON grow_rooms FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'grow_rooms' AND policyname = 'Authenticated users can insert grow rooms'
  ) THEN
    CREATE POLICY "Authenticated users can insert grow rooms"
      ON grow_rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'grow_rooms' AND policyname = 'Authenticated users can update grow rooms'
  ) THEN
    CREATE POLICY "Authenticated users can update grow rooms"
      ON grow_rooms FOR UPDATE TO authenticated
      USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS plant_groups (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_number           text UNIQUE NOT NULL,
  name                   text,
  strain_id              uuid NOT NULL REFERENCES strains(id),
  grow_room_id           uuid NOT NULL REFERENCES grow_rooms(id),
  mother_plant_group_id  uuid REFERENCES plant_groups(id),
  is_mother              boolean NOT NULL DEFAULT false,
  plant_count            integer NOT NULL CHECK (plant_count > 0),
  growth_stage           text NOT NULL DEFAULT 'clone'
                           CHECK (growth_stage IN ('clone', 'veg', 'flower', 'harvested')),
  stage_entered_at       timestamptz NOT NULL DEFAULT now(),
  planted_date           date,
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  created_by             uuid REFERENCES auth.users(id),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plant_groups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'plant_groups' AND policyname = 'Authenticated users can view plant groups'
  ) THEN
    CREATE POLICY "Authenticated users can view plant groups"
      ON plant_groups FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'plant_groups' AND policyname = 'Authenticated users can insert plant groups'
  ) THEN
    CREATE POLICY "Authenticated users can insert plant groups"
      ON plant_groups FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'plant_groups' AND policyname = 'Authenticated users can update plant groups'
  ) THEN
    CREATE POLICY "Authenticated users can update plant groups"
      ON plant_groups FOR UPDATE TO authenticated
      USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS plant_group_stage_history (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_group_id   uuid NOT NULL REFERENCES plant_groups(id),
  from_stage       text,
  to_stage         text NOT NULL,
  transitioned_at  timestamptz NOT NULL DEFAULT now(),
  transitioned_by  uuid REFERENCES auth.users(id),
  notes            text
);

ALTER TABLE plant_group_stage_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'plant_group_stage_history' AND policyname = 'Authenticated users can view stage history'
  ) THEN
    CREATE POLICY "Authenticated users can view stage history"
      ON plant_group_stage_history FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'plant_group_stage_history' AND policyname = 'Authenticated users can insert stage history'
  ) THEN
    CREATE POLICY "Authenticated users can insert stage history"
      ON plant_group_stage_history FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS plant_group_room_history (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_group_id   uuid NOT NULL REFERENCES plant_groups(id),
  from_room_id     uuid NOT NULL REFERENCES grow_rooms(id),
  to_room_id       uuid NOT NULL REFERENCES grow_rooms(id),
  moved_at         timestamptz NOT NULL DEFAULT now(),
  moved_by         uuid REFERENCES auth.users(id),
  notes            text
);

ALTER TABLE plant_group_room_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'plant_group_room_history' AND policyname = 'Authenticated users can view room history'
  ) THEN
    CREATE POLICY "Authenticated users can view room history"
      ON plant_group_room_history FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'plant_group_room_history' AND policyname = 'Authenticated users can insert room history'
  ) THEN
    CREATE POLICY "Authenticated users can insert room history"
      ON plant_group_room_history FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS harvest_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_group_id        uuid NOT NULL REFERENCES plant_groups(id),
  harvest_date          date NOT NULL,
  wet_weight_grams      numeric(10, 2) NOT NULL CHECK (wet_weight_grams > 0),
  adjusted_weight_grams numeric(10, 2),
  adjustment_reason     text,
  plant_count_harvested integer NOT NULL CHECK (plant_count_harvested > 0),
  batch_registry_id     uuid REFERENCES batch_registry(id),
  session_status        text NOT NULL DEFAULT 'active'
                          CHECK (session_status IN ('active', 'completed', 'cancelled')),
  completed_at          timestamptz,
  completed_by          uuid REFERENCES auth.users(id),
  cancelled_at          timestamptz,
  cancelled_by          uuid REFERENCES auth.users(id),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid REFERENCES auth.users(id),

  CONSTRAINT harvest_sessions_completed_has_batch CHECK (
    session_status != 'completed' OR batch_registry_id IS NOT NULL
  ),
  CONSTRAINT harvest_sessions_completed_has_timestamp CHECK (
    session_status != 'completed' OR completed_at IS NOT NULL
  ),
  CONSTRAINT harvest_sessions_cancelled_no_batch CHECK (
    session_status != 'cancelled' OR batch_registry_id IS NULL
  ),
  CONSTRAINT harvest_sessions_adjusted_weight_positive CHECK (
    adjusted_weight_grams IS NULL OR adjusted_weight_grams > 0
  ),
  CONSTRAINT harvest_sessions_adjustment_reason_required CHECK (
    adjusted_weight_grams IS NULL OR adjustment_reason IS NOT NULL
  )
);

ALTER TABLE harvest_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'harvest_sessions' AND policyname = 'Authenticated users can view harvest sessions'
  ) THEN
    CREATE POLICY "Authenticated users can view harvest sessions"
      ON harvest_sessions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'harvest_sessions' AND policyname = 'Authenticated users can insert harvest sessions'
  ) THEN
    CREATE POLICY "Authenticated users can insert harvest sessions"
      ON harvest_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'harvest_sessions' AND policyname = 'Authenticated users can update harvest sessions'
  ) THEN
    CREATE POLICY "Authenticated users can update harvest sessions"
      ON harvest_sessions FOR UPDATE TO authenticated
      USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;
