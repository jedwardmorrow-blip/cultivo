-- CUL-62: Production Planner Phase 1 — Data Foundation
-- Adds planned_cycles table, strain/room forecast columns, and v_planned_cycles_timeline view

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Strain cultivation timing + forecast columns
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE strains
  ADD COLUMN IF NOT EXISTS avg_wet_weight_per_plant_g  numeric,
  ADD COLUMN IF NOT EXISTS veg_days_avg                integer,
  ADD COLUMN IF NOT EXISTS flowering_time_days         integer,
  ADD COLUMN IF NOT EXISTS forecast_price_per_gram     numeric;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Room labor config
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE grow_rooms
  ADD COLUMN IF NOT EXISTS labor_hours_per_week numeric DEFAULT 20;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. planned_cycles table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planned_cycles (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  strain_id               uuid        NOT NULL REFERENCES strains(id),
  target_room_id          uuid        NOT NULL REFERENCES grow_rooms(id),
  planned_plant_count     integer     NOT NULL CHECK (planned_plant_count > 0),

  -- Pipeline dates (clone cut → veg → flower → harvest)
  clone_cut_date          date,
  veg_start_date          date,
  flower_start_date       date        NOT NULL,
  estimated_harvest_date  date        NOT NULL,

  -- Lifecycle
  status                  text        NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','committed','active','cancelled','completed')),
  linked_plant_group_id   uuid        REFERENCES plant_groups(id),

  -- Per-cycle forecast overrides (nullable — falls back to strain averages)
  forecast_yield_grams    numeric,
  forecast_price_per_gram numeric,

  -- Source tracking
  mom_plant_group_id      uuid        REFERENCES plant_groups(id),
  notes                   text,
  created_by              uuid        REFERENCES auth.users(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE planned_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planned_cycles_select" ON planned_cycles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "planned_cycles_insert" ON planned_cycles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "planned_cycles_update" ON planned_cycles
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "planned_cycles_delete" ON planned_cycles
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_planned_cycles_updated_at
  BEFORE UPDATE ON planned_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. v_planned_cycles_timeline view
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_planned_cycles_timeline AS
SELECT
  pc.id                                                      AS cycle_id,
  pc.strain_id,
  s.display_name                                             AS strain_name,
  pc.target_room_id                                          AS room_id,
  gr.name                                                    AS room_name,
  gr.room_type,
  gr.capacity_plants,
  pc.planned_plant_count,
  pc.status,
  pc.clone_cut_date,
  pc.veg_start_date,
  pc.flower_start_date,
  pc.estimated_harvest_date,
  COALESCE(
    pc.forecast_yield_grams,
    pc.planned_plant_count * s.avg_wet_weight_per_plant_g
  )                                                          AS forecast_yield_grams,
  COALESCE(
    pc.forecast_price_per_gram,
    s.forecast_price_per_gram
  )                                                          AS forecast_price_per_gram,
  COALESCE(
    pc.forecast_yield_grams,
    pc.planned_plant_count * s.avg_wet_weight_per_plant_g
  ) * COALESCE(
    pc.forecast_price_per_gram,
    s.forecast_price_per_gram
  )                                                          AS forecast_revenue,
  gr.labor_hours_per_week                                    AS labor_hours_per_week_room
FROM planned_cycles pc
JOIN strains s  ON s.id  = pc.strain_id
JOIN grow_rooms gr ON gr.id = pc.target_room_id
WHERE pc.status NOT IN ('cancelled', 'completed');
