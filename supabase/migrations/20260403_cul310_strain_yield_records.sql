-- CUL-310 / CUL-323: Strain yield history and performance summary
-- Tracks per-harvest yield metrics per strain for capacity planning and
-- performance benchmarking. Backfills from all finalized/completed harvest
-- sessions, joining trim_sessions via batch_registry.batch_number.

CREATE TABLE strain_yield_records (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  strain_id           uuid        NOT NULL REFERENCES strains(id),
  batch_registry_id   uuid        NOT NULL REFERENCES batch_registry(id),
  harvest_session_id  uuid        REFERENCES harvest_sessions(id) ON DELETE SET NULL,
  harvest_date        date        NOT NULL,
  wet_weight_g        numeric,                 -- from harvest_sessions.wet_weight_grams
  dry_flower_g        numeric,                 -- SUM(big_buds + small_buds) from trim_sessions
  trim_g              numeric,                 -- SUM(trim_grams) from trim_sessions
  waste_g             numeric,                 -- SUM(waste_grams) from trim_sessions
  cycle_days          integer,                 -- planted_date → harvest_date
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_registry_id, harvest_session_id)
);

CREATE INDEX idx_syr_strain_id      ON strain_yield_records(strain_id);
CREATE INDEX idx_syr_harvest_date   ON strain_yield_records(harvest_date DESC);
CREATE INDEX idx_syr_batch_registry ON strain_yield_records(batch_registry_id);

ALTER TABLE strain_yield_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can view strain yield records"
  ON strain_yield_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can insert strain yield records"
  ON strain_yield_records FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated can update strain yield records"
  ON strain_yield_records FOR UPDATE TO authenticated USING (true);

-- Performance summary view: per-strain averages across all harvests
CREATE OR REPLACE VIEW v_strain_performance_summary AS
SELECT
  s.id                                                        AS strain_id,
  s.name                                                      AS strain_name,
  s.abbreviation                                              AS strain_abbr,
  COUNT(syr.id)                                               AS harvest_count,
  ROUND(AVG(syr.wet_weight_g), 1)                             AS avg_wet_weight_g,
  ROUND(AVG(syr.dry_flower_g), 1)                             AS avg_dry_flower_g,
  ROUND(AVG(syr.trim_g), 1)                                   AS avg_trim_g,
  ROUND(AVG(
    CASE WHEN syr.wet_weight_g > 0
    THEN syr.dry_flower_g / syr.wet_weight_g * 100 END
  ), 2)                                                       AS avg_dry_pct,
  ROUND(AVG(syr.cycle_days), 0)::int                          AS avg_cycle_days,
  MIN(syr.harvest_date)                                       AS first_harvest_date,
  MAX(syr.harvest_date)                                       AS last_harvest_date
FROM strain_yield_records syr
JOIN strains s ON s.id = syr.strain_id
GROUP BY s.id, s.name, s.abbreviation
ORDER BY harvest_count DESC, s.name;

-- Backfill: all finalized/completed harvest sessions
INSERT INTO strain_yield_records (
  strain_id, batch_registry_id, harvest_session_id,
  harvest_date, wet_weight_g, dry_flower_g, trim_g, waste_g,
  cycle_days, notes
)
SELECT
  pg.strain_id,
  hs.batch_registry_id,
  hs.id,
  hs.harvest_date,
  hs.wet_weight_grams,
  SUM(ts.big_buds_grams + ts.small_buds_grams),
  SUM(ts.trim_grams),
  SUM(ts.waste_grams),
  CASE WHEN pg.planted_date IS NOT NULL
    THEN (hs.harvest_date - pg.planted_date)
    ELSE NULL END,
  'Backfill: migration CUL-310'
FROM harvest_sessions hs
JOIN batch_registry br ON br.id = hs.batch_registry_id
JOIN plant_groups pg   ON pg.id = hs.plant_group_id
LEFT JOIN trim_sessions ts
  ON ts.batch_id = br.batch_number
  AND ts.session_status = 'finalized'
WHERE hs.session_status IN ('completed', 'finalized')
  AND pg.strain_id IS NOT NULL
GROUP BY pg.strain_id, hs.batch_registry_id, hs.id, hs.harvest_date,
         hs.wet_weight_grams, pg.planted_date;

GRANT SELECT ON strain_yield_records          TO authenticated;
GRANT SELECT ON v_strain_performance_summary  TO authenticated;
