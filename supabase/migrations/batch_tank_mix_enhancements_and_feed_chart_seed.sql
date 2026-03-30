-- =====================================================
-- Feed Chart & Batch Tank Mix — Full Schema + Seed
-- Creates: feed_products, feed_programs, feed_program_weeks,
--          feed_program_entries, batch_tank_mix_log
-- Seeds:   Athena Pro with Fade program
-- =====================================================

-- =====================================================
-- 1. feed_products — Individual nutrient/additive products
-- =====================================================
CREATE TABLE IF NOT EXISTS feed_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text,
  product_type text NOT NULL DEFAULT 'nutrient',
  unit text NOT NULL DEFAULT 'mL',
  mixing_order_hint integer,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name, brand)
);

ALTER TABLE feed_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feed_products_read" ON feed_products FOR SELECT USING (true);
CREATE POLICY "feed_products_write" ON feed_products FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 2. feed_programs — Named feed chart programs
-- =====================================================
CREATE TABLE IF NOT EXISTS feed_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  brand text,
  description text,
  base_unit text NOT NULL DEFAULT 'mL/gal',
  concentrate_ratio text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE feed_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feed_programs_read" ON feed_programs FOR SELECT USING (true);
CREATE POLICY "feed_programs_write" ON feed_programs FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 3. feed_program_weeks — Per-phase per-week targets
-- =====================================================
CREATE TABLE IF NOT EXISTS feed_program_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_program_id uuid NOT NULL REFERENCES feed_programs(id) ON DELETE CASCADE,
  phase text NOT NULL,
  week_number integer NOT NULL,
  target_ec numeric,
  target_ppm_500 numeric,
  target_ppm_700 numeric,
  target_ph_min numeric,
  target_ph_max numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(feed_program_id, phase, week_number)
);

ALTER TABLE feed_program_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feed_program_weeks_read" ON feed_program_weeks FOR SELECT USING (true);
CREATE POLICY "feed_program_weeks_write" ON feed_program_weeks FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 4. feed_program_entries — Product rates per week
-- =====================================================
CREATE TABLE IF NOT EXISTS feed_program_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_week_id uuid NOT NULL REFERENCES feed_program_weeks(id) ON DELETE CASCADE,
  feed_product_id uuid NOT NULL REFERENCES feed_products(id) ON DELETE CASCADE,
  amount_per_unit numeric NOT NULL,
  amount_max numeric,
  mixing_order integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE feed_program_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feed_program_entries_read" ON feed_program_entries FOR SELECT USING (true);
CREATE POLICY "feed_program_entries_write" ON feed_program_entries FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 5. batch_tank_mix_log — Records of each tank mix
-- =====================================================
CREATE TABLE IF NOT EXISTS batch_tank_mix_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES grow_rooms(id) ON DELETE CASCADE,
  task_instance_id uuid REFERENCES daily_task_instances(id),
  feed_program_id uuid REFERENCES feed_programs(id),
  program_week_id uuid REFERENCES feed_program_weeks(id),
  batch_id text,
  status text NOT NULL DEFAULT 'completed',
  stage text,
  week_number integer,
  -- Prescribed (recipe from feed chart, potentially adjusted by manager)
  prescribed_products jsonb,
  prescribed_gallons numeric,
  prescribed_ec numeric,
  prescribed_ppm numeric,
  prescribed_ph_min numeric,
  prescribed_ph_max numeric,
  prescribed_by text,
  prescribed_at timestamptz,
  prescription_notes text,
  -- Actual (recorded by worker)
  actual_gallons numeric,
  actual_products jsonb,
  actual_ec numeric,
  actual_ppm numeric,
  ppm_scale text CHECK (ppm_scale IN ('500', '700')),
  actual_ph numeric,
  completed_by text,
  completed_at timestamptz,
  completion_notes text,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE batch_tank_mix_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "batch_tank_mix_log_read" ON batch_tank_mix_log FOR SELECT USING (true);
CREATE POLICY "batch_tank_mix_log_write" ON batch_tank_mix_log FOR ALL USING (true) WITH CHECK (true);

-- Index for room-based queries
CREATE INDEX IF NOT EXISTS idx_batch_tank_mix_log_room ON batch_tank_mix_log(room_id);
CREATE INDEX IF NOT EXISTS idx_batch_tank_mix_log_created ON batch_tank_mix_log(created_at DESC);

-- =====================================================
-- 6. Seed Athena Pro feed products
-- =====================================================
INSERT INTO feed_products (name, brand, product_type, unit, mixing_order_hint, notes, is_active)
VALUES
  ('Balance',   'Athena', 'ph_adjuster', 'mL', 1, 'pH up — variable amount, add as needed', true),
  ('Pro Grow',  'Athena', 'nutrient',    'mL', 2, 'Vegetative growth base nutrient',         true),
  ('Pro Bloom', 'Athena', 'nutrient',    'mL', 3, 'Flowering base nutrient',                 true),
  ('Pro Core',  'Athena', 'nutrient',    'mL', 4, 'Core mineral supplement',                 true),
  ('Fade',      'Athena', 'nutrient',    'mL', 5, 'Late-flower finisher — replaces Pro Core W8-9', true),
  ('Cleanse',   'Athena', 'additive',    'mL', 6, 'Mineral descaler / cleansing agent',      true)
ON CONFLICT (name, brand) DO NOTHING;

-- =====================================================
-- 7. Seed Athena Pro Program (with Fade)
-- =====================================================
INSERT INTO feed_programs (name, brand, description, base_unit, concentrate_ratio, is_active)
VALUES (
  'Athena Pro with Fade',
  'Athena',
  'Pro Program with Fade finish. Imperial measurements. All mL/gal based on 2lb/gal stock tank concentrate.',
  'mL/gal',
  '2lb/gal',
  true
)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 8. Seed feed program weeks + entries
-- =====================================================
DO $$
DECLARE
  v_program_id  uuid;
  v_balance_id  uuid;
  v_progrow_id  uuid;
  v_probloom_id uuid;
  v_procore_id  uuid;
  v_fade_id     uuid;
  v_cleanse_id  uuid;
  v_week_id     uuid;
BEGIN
  SELECT id INTO v_program_id FROM feed_programs WHERE name = 'Athena Pro with Fade' LIMIT 1;
  IF v_program_id IS NULL THEN RAISE EXCEPTION 'Feed program not found'; END IF;

  SELECT id INTO v_balance_id  FROM feed_products WHERE name = 'Balance'   AND brand = 'Athena' LIMIT 1;
  SELECT id INTO v_progrow_id  FROM feed_products WHERE name = 'Pro Grow'  AND brand = 'Athena' LIMIT 1;
  SELECT id INTO v_probloom_id FROM feed_products WHERE name = 'Pro Bloom' AND brand = 'Athena' LIMIT 1;
  SELECT id INTO v_procore_id  FROM feed_products WHERE name = 'Pro Core'  AND brand = 'Athena' LIMIT 1;
  SELECT id INTO v_fade_id     FROM feed_products WHERE name = 'Fade'      AND brand = 'Athena' LIMIT 1;
  SELECT id INTO v_cleanse_id  FROM feed_products WHERE name = 'Cleanse'   AND brand = 'Athena' LIMIT 1;

  -- Skip if already seeded
  IF EXISTS (SELECT 1 FROM feed_program_weeks WHERE feed_program_id = v_program_id) THEN
    RETURN;
  END IF;

  -- CLONE (1 week)
  INSERT INTO feed_program_weeks (feed_program_id, phase, week_number, target_ec, target_ppm_500, target_ppm_700, target_ph_min, target_ph_max, notes)
  VALUES (v_program_id, 'clone', 1, 2.0, 1000, 1400, 5.6, 5.6, 'Pre-soak & feed')
  RETURNING id INTO v_week_id;
  INSERT INTO feed_program_entries (program_week_id, feed_product_id, amount_per_unit, amount_max, mixing_order, notes) VALUES
    (v_week_id, v_probloom_id, 20, NULL, 1, NULL),
    (v_week_id, v_procore_id,  12, NULL, 2, NULL),
    (v_week_id, v_cleanse_id,   1, NULL, 3, 'Fixed 1 mL/gal for clones');

  -- VEG W1-W4 (identical recipe)
  FOR i IN 1..4 LOOP
    INSERT INTO feed_program_weeks (feed_program_id, phase, week_number, target_ec, target_ppm_500, target_ppm_700, target_ph_min, target_ph_max)
    VALUES (v_program_id, 'veg', i, 3.0, 1500, 2100, 5.8, 6.2)
    RETURNING id INTO v_week_id;
    INSERT INTO feed_program_entries (program_week_id, feed_product_id, amount_per_unit, amount_max, mixing_order) VALUES
      (v_week_id, v_progrow_id,  32, NULL, 1),
      (v_week_id, v_procore_id,  19, NULL, 2),
      (v_week_id, v_cleanse_id,   3,    5, 3);
  END LOOP;

  -- FLOWER W1-W7 (Pro Bloom + Pro Core + Cleanse)
  FOR i IN 1..7 LOOP
    INSERT INTO feed_program_weeks (feed_program_id, phase, week_number, target_ec, target_ppm_500, target_ppm_700, target_ph_min, target_ph_max)
    VALUES (v_program_id, 'flower', i, 3.0, 1500, 2100, 5.8, 6.2)
    RETURNING id INTO v_week_id;
    INSERT INTO feed_program_entries (program_week_id, feed_product_id, amount_per_unit, amount_max, mixing_order) VALUES
      (v_week_id, v_probloom_id, 32, NULL, 1),
      (v_week_id, v_procore_id,  19, NULL, 2),
      (v_week_id, v_cleanse_id,   3,    5, 3);
  END LOOP;

  -- FLOWER W8 (Fade replaces Pro Core, pH shifts to 6.0-6.4)
  INSERT INTO feed_program_weeks (feed_program_id, phase, week_number, target_ec, target_ppm_500, target_ppm_700, target_ph_min, target_ph_max, notes)
  VALUES (v_program_id, 'flower', 8, 3.0, 1500, 2100, 6.0, 6.4, 'Default: Fade replaces Pro Core. Verify pH when switching.')
  RETURNING id INTO v_week_id;
  INSERT INTO feed_program_entries (program_week_id, feed_product_id, amount_per_unit, amount_max, mixing_order, notes) VALUES
    (v_week_id, v_probloom_id, 32, NULL, 1, NULL),
    (v_week_id, v_fade_id,     19, NULL, 2, 'Replaces Pro Core — cultivar dependent'),
    (v_week_id, v_cleanse_id,   3,    5, 3, NULL);

  -- FLOWER W9 (Fade finish)
  INSERT INTO feed_program_weeks (feed_program_id, phase, week_number, target_ec, target_ppm_500, target_ppm_700, target_ph_min, target_ph_max, notes)
  VALUES (v_program_id, 'flower', 9, 3.0, 1500, 2100, 6.0, 6.4, 'Fade finish week. Verify pH.')
  RETURNING id INTO v_week_id;
  INSERT INTO feed_program_entries (program_week_id, feed_product_id, amount_per_unit, amount_max, mixing_order, notes) VALUES
    (v_week_id, v_probloom_id, 32, NULL, 1, NULL),
    (v_week_id, v_fade_id,     19, NULL, 2, 'Replaces Pro Core'),
    (v_week_id, v_cleanse_id,   3,    5, 3, NULL);

END $$;
