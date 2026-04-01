-- CUL-67: Rosin Lab Schema
-- Creates all 10 rosin lab tables with RLS and policies.
-- Uses IF NOT EXISTS throughout — safe to apply even though earlier ad-hoc migrations
-- (rosin_lab_batch_1 through rosin_lab_batch_9) already created these tables.
-- This file is the canonical repo record of the full schema.

-- ─── rosin_lab_equipment ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rosin_lab_equipment (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  equipment_type        text NOT NULL, -- wash_machine | freeze_dryer | rosin_press
  manufacturer          text,
  model                 text,
  serial_number         text,
  purchase_date         date,
  last_maintenance_date date,
  next_maintenance_date date,
  status                text NOT NULL DEFAULT 'active',
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rosin_lab_equipment ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rosin_lab_equipment' AND policyname = 'Authenticated users can view rosin_lab_equipment'
  ) THEN
    CREATE POLICY "Authenticated users can view rosin_lab_equipment"
      ON public.rosin_lab_equipment FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rosin_lab_equipment' AND policyname = 'Authenticated users can insert rosin_lab_equipment'
  ) THEN
    CREATE POLICY "Authenticated users can insert rosin_lab_equipment"
      ON public.rosin_lab_equipment FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rosin_lab_equipment' AND policyname = 'Authenticated users can update rosin_lab_equipment'
  ) THEN
    CREATE POLICY "Authenticated users can update rosin_lab_equipment"
      ON public.rosin_lab_equipment FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rosin_lab_equipment' AND policyname = 'Authenticated users can delete rosin_lab_equipment'
  ) THEN
    CREATE POLICY "Authenticated users can delete rosin_lab_equipment"
      ON public.rosin_lab_equipment FOR DELETE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE OR REPLACE TRIGGER trg_rosin_equipment_updated
  BEFORE UPDATE ON public.rosin_lab_equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── fresh_frozen_packages ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fresh_frozen_packages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id            uuid NOT NULL REFERENCES public.batch_registry(id),
  strain_id           uuid REFERENCES public.strains(id),
  package_number      integer NOT NULL DEFAULT 1,
  weight_grams        numeric NOT NULL,
  vacuum_sealed_at    timestamptz,
  frozen_at           timestamptz,
  freezer_location    text,
  status              text NOT NULL DEFAULT 'stored', -- stored | allocated | washed | sold
  sold_price_per_gram numeric,
  notes               text,
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fresh_frozen_packages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'fresh_frozen_packages' AND policyname = 'Authenticated users can view fresh frozen packages'
  ) THEN
    CREATE POLICY "Authenticated users can view fresh frozen packages"
      ON public.fresh_frozen_packages FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'fresh_frozen_packages' AND policyname = 'Authenticated users can insert fresh frozen packages'
  ) THEN
    CREATE POLICY "Authenticated users can insert fresh frozen packages"
      ON public.fresh_frozen_packages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'fresh_frozen_packages' AND policyname = 'Authenticated users can update fresh frozen packages'
  ) THEN
    CREATE POLICY "Authenticated users can update fresh frozen packages"
      ON public.fresh_frozen_packages FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'fresh_frozen_packages' AND policyname = 'Authenticated users can delete fresh_frozen_packages'
  ) THEN
    CREATE POLICY "Authenticated users can delete fresh_frozen_packages"
      ON public.fresh_frozen_packages FOR DELETE USING (true);
  END IF;
END $$;

CREATE OR REPLACE TRIGGER trg_ff_packages_updated
  BEFORE UPDATE ON public.fresh_frozen_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── wash_runs ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wash_runs (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id                   uuid NOT NULL REFERENCES public.batch_registry(id),
  strain_id                  uuid REFERENCES public.strains(id),
  wash_date                  date NOT NULL DEFAULT CURRENT_DATE,
  operator_id                uuid, -- auth.users reference, no FK enforced
  equipment_id               uuid REFERENCES public.rosin_lab_equipment(id),
  water_temp_f               numeric,
  num_washes                 integer,
  total_input_weight_grams   numeric,
  total_output_weight_grams  numeric,
  waste_weight_grams         numeric DEFAULT 0,
  yield_percentage           numeric,
  micron_grades              jsonb DEFAULT '{}',
  notes                      text,
  status                     text NOT NULL DEFAULT 'in_progress', -- in_progress | completed | failed
  -- legacy aliases kept for service compatibility
  input_grams                numeric,
  output_grams               numeric,
  started_at                 timestamptz,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wash_runs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wash_runs' AND policyname = 'Authenticated users can view wash_runs'
  ) THEN
    CREATE POLICY "Authenticated users can view wash_runs"
      ON public.wash_runs FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wash_runs' AND policyname = 'Authenticated users can insert wash_runs'
  ) THEN
    CREATE POLICY "Authenticated users can insert wash_runs"
      ON public.wash_runs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wash_runs' AND policyname = 'Authenticated users can update wash_runs'
  ) THEN
    CREATE POLICY "Authenticated users can update wash_runs"
      ON public.wash_runs FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wash_runs' AND policyname = 'Authenticated users can delete wash_runs'
  ) THEN
    CREATE POLICY "Authenticated users can delete wash_runs"
      ON public.wash_runs FOR DELETE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE OR REPLACE TRIGGER trg_wash_runs_updated
  BEFORE UPDATE ON public.wash_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── wash_run_inputs ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wash_run_inputs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wash_run_id              uuid NOT NULL REFERENCES public.wash_runs(id),
  fresh_frozen_package_id  uuid NOT NULL REFERENCES public.fresh_frozen_packages(id),
  weight_grams             numeric NOT NULL,
  created_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wash_run_inputs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wash_run_inputs' AND policyname = 'Authenticated users can view wash_run_inputs'
  ) THEN
    CREATE POLICY "Authenticated users can view wash_run_inputs"
      ON public.wash_run_inputs FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wash_run_inputs' AND policyname = 'Authenticated users can insert wash_run_inputs'
  ) THEN
    CREATE POLICY "Authenticated users can insert wash_run_inputs"
      ON public.wash_run_inputs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wash_run_inputs' AND policyname = 'Authenticated users can update wash_run_inputs'
  ) THEN
    CREATE POLICY "Authenticated users can update wash_run_inputs"
      ON public.wash_run_inputs FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wash_run_inputs' AND policyname = 'Authenticated users can delete wash_run_inputs'
  ) THEN
    CREATE POLICY "Authenticated users can delete wash_run_inputs"
      ON public.wash_run_inputs FOR DELETE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ─── freeze_dry_runs ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.freeze_dry_runs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wash_run_id             uuid NOT NULL REFERENCES public.wash_runs(id),
  equipment_id            uuid REFERENCES public.rosin_lab_equipment(id),
  start_time              timestamptz,
  end_time                timestamptz,
  input_weight_grams      numeric NOT NULL,
  output_weight_grams     numeric,
  waste_weight_grams      numeric DEFAULT 0,
  moisture_loss_percentage numeric,
  temperature_f           numeric,
  notes                   text,
  status                  text NOT NULL DEFAULT 'in_progress', -- in_progress | completed | failed
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.freeze_dry_runs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'freeze_dry_runs' AND policyname = 'Authenticated users can view freeze_dry_runs'
  ) THEN
    CREATE POLICY "Authenticated users can view freeze_dry_runs"
      ON public.freeze_dry_runs FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'freeze_dry_runs' AND policyname = 'Authenticated users can insert freeze_dry_runs'
  ) THEN
    CREATE POLICY "Authenticated users can insert freeze_dry_runs"
      ON public.freeze_dry_runs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'freeze_dry_runs' AND policyname = 'Authenticated users can update freeze_dry_runs'
  ) THEN
    CREATE POLICY "Authenticated users can update freeze_dry_runs"
      ON public.freeze_dry_runs FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'freeze_dry_runs' AND policyname = 'Authenticated users can delete freeze_dry_runs'
  ) THEN
    CREATE POLICY "Authenticated users can delete freeze_dry_runs"
      ON public.freeze_dry_runs FOR DELETE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE OR REPLACE TRIGGER trg_fd_runs_updated
  BEFORE UPDATE ON public.freeze_dry_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── hash_packages ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hash_packages (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wash_run_id             uuid NOT NULL REFERENCES public.wash_runs(id),
  freeze_dry_run_id       uuid REFERENCES public.freeze_dry_runs(id),
  strain_id               uuid NOT NULL REFERENCES public.strains(id),
  package_id              text NOT NULL,
  weight_grams            numeric NOT NULL,
  remaining_weight_grams  numeric NOT NULL,
  dried_date              date,
  status                  text NOT NULL DEFAULT 'available', -- available | partial | depleted | reserved
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hash_packages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hash_packages' AND policyname = 'Authenticated users can read hash_packages'
  ) THEN
    CREATE POLICY "Authenticated users can read hash_packages"
      ON public.hash_packages FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hash_packages' AND policyname = 'Authenticated users can insert hash_packages'
  ) THEN
    CREATE POLICY "Authenticated users can insert hash_packages"
      ON public.hash_packages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hash_packages' AND policyname = 'Authenticated users can update hash_packages'
  ) THEN
    CREATE POLICY "Authenticated users can update hash_packages"
      ON public.hash_packages FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'hash_packages' AND policyname = 'Authenticated users can delete hash_packages'
  ) THEN
    CREATE POLICY "Authenticated users can delete hash_packages"
      ON public.hash_packages FOR DELETE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE OR REPLACE TRIGGER set_hash_packages_updated_at
  BEFORE UPDATE ON public.hash_packages
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── press_runs ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.press_runs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freeze_dry_run_id   uuid NOT NULL REFERENCES public.freeze_dry_runs(id),
  wash_run_id         uuid NOT NULL REFERENCES public.wash_runs(id),
  batch_id            uuid REFERENCES public.batch_registry(id),
  equipment_id        uuid REFERENCES public.rosin_lab_equipment(id),
  press_date          date NOT NULL DEFAULT CURRENT_DATE,
  operator_id         uuid, -- auth.users reference, no FK enforced
  temperature_f       numeric,
  pressure_psi        numeric,
  press_time_seconds  integer,
  bag_micron          integer,
  input_weight_grams  numeric NOT NULL,
  output_weight_grams numeric,
  waste_weight_grams  numeric DEFAULT 0,
  yield_percentage    numeric,
  notes               text,
  status              text NOT NULL DEFAULT 'in_progress', -- in_progress | completed | failed
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.press_runs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'press_runs' AND policyname = 'Authenticated users can view press_runs'
  ) THEN
    CREATE POLICY "Authenticated users can view press_runs"
      ON public.press_runs FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'press_runs' AND policyname = 'Authenticated users can insert press_runs'
  ) THEN
    CREATE POLICY "Authenticated users can insert press_runs"
      ON public.press_runs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'press_runs' AND policyname = 'Authenticated users can update press_runs'
  ) THEN
    CREATE POLICY "Authenticated users can update press_runs"
      ON public.press_runs FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'press_runs' AND policyname = 'Authenticated users can delete press_runs'
  ) THEN
    CREATE POLICY "Authenticated users can delete press_runs"
      ON public.press_runs FOR DELETE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE OR REPLACE TRIGGER trg_press_runs_updated
  BEFORE UPDATE ON public.press_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── press_run_inputs ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.press_run_inputs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  press_run_id     uuid NOT NULL REFERENCES public.press_runs(id),
  hash_package_id  uuid NOT NULL REFERENCES public.hash_packages(id),
  weight_grams     numeric NOT NULL,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE public.press_run_inputs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'press_run_inputs' AND policyname = 'Authenticated users can read press run inputs'
  ) THEN
    CREATE POLICY "Authenticated users can read press run inputs"
      ON public.press_run_inputs FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'press_run_inputs' AND policyname = 'Authenticated users can insert press run inputs'
  ) THEN
    CREATE POLICY "Authenticated users can insert press run inputs"
      ON public.press_run_inputs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ─── rosin_cure_sessions ────────────────────────────────────────────────────
-- Note: expected_completion from the original spec is represented as
-- target_end_date (date) + start_date (date) in the actual schema.

CREATE TABLE IF NOT EXISTS public.rosin_cure_sessions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  press_run_id         uuid NOT NULL REFERENCES public.press_runs(id),
  wash_run_id          uuid NOT NULL REFERENCES public.wash_runs(id),
  start_time           timestamptz,
  end_time             timestamptz,
  start_date           date DEFAULT CURRENT_DATE,
  target_end_date      date,
  cure_temp_f          numeric,
  target_consistency   text, -- badder | jam | sauce
  actual_consistency   text, -- badder | jam | sauce
  input_weight_grams   numeric NOT NULL,
  output_weight_grams  numeric,
  waste_weight_grams   numeric DEFAULT 0,
  cure_loss_percentage numeric,
  notes                text,
  status               text NOT NULL DEFAULT 'curing', -- curing | completed | failed
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rosin_cure_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rosin_cure_sessions' AND policyname = 'Authenticated users can view rosin_cure_sessions'
  ) THEN
    CREATE POLICY "Authenticated users can view rosin_cure_sessions"
      ON public.rosin_cure_sessions FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rosin_cure_sessions' AND policyname = 'Authenticated users can insert rosin_cure_sessions'
  ) THEN
    CREATE POLICY "Authenticated users can insert rosin_cure_sessions"
      ON public.rosin_cure_sessions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rosin_cure_sessions' AND policyname = 'Authenticated users can update rosin_cure_sessions'
  ) THEN
    CREATE POLICY "Authenticated users can update rosin_cure_sessions"
      ON public.rosin_cure_sessions FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rosin_cure_sessions' AND policyname = 'Authenticated users can delete rosin_cure_sessions'
  ) THEN
    CREATE POLICY "Authenticated users can delete rosin_cure_sessions"
      ON public.rosin_cure_sessions FOR DELETE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE OR REPLACE TRIGGER trg_cure_sessions_updated
  BEFORE UPDATE ON public.rosin_cure_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── rosin_packages ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rosin_packages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  press_run_id      uuid NOT NULL REFERENCES public.press_runs(id),
  strain_id         uuid NOT NULL REFERENCES public.strains(id),
  package_id        text NOT NULL,
  weight_grams      numeric NOT NULL,
  destination       text NOT NULL, -- badder | jam | sauce | fresh_press
  cure_session_id   uuid REFERENCES public.rosin_cure_sessions(id),
  inventory_item_id uuid, -- soft reference to inventory_items, no FK enforced
  status            text NOT NULL DEFAULT 'fresh', -- fresh | curing | cured | packaged | sold
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rosin_packages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rosin_packages' AND policyname = 'Authenticated users can view rosin packages'
  ) THEN
    CREATE POLICY "Authenticated users can view rosin packages"
      ON public.rosin_packages FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rosin_packages' AND policyname = 'Authenticated users can insert rosin packages'
  ) THEN
    CREATE POLICY "Authenticated users can insert rosin packages"
      ON public.rosin_packages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rosin_packages' AND policyname = 'Authenticated users can update rosin packages'
  ) THEN
    CREATE POLICY "Authenticated users can update rosin packages"
      ON public.rosin_packages FOR UPDATE USING (true);
  END IF;
END $$;

-- Note: rosin_packages uses a custom trigger function
CREATE OR REPLACE FUNCTION public.update_rosin_packages_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_rosin_packages_updated_at
  BEFORE UPDATE ON public.rosin_packages
  FOR EACH ROW EXECUTE FUNCTION update_rosin_packages_updated_at();
