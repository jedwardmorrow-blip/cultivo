-- CUL-64: v_forecast_summary — Rolling 6-month forecast aggregated by calendar month
-- Depends on CUL-62: planned_cycles table + v_planned_cycles_timeline view
--
-- Two series:
--   projected  — from v_planned_cycles_timeline (non-cancelled/non-completed planned cycles)
--   committed  — from plant_groups (active in-progress plant groups, not yet harvested)
--
-- Yield + revenue are booked in the harvest month.
-- Labor is distributed across every calendar month the cycle overlaps (flower_start → harvest).

CREATE OR REPLACE VIEW v_forecast_summary AS
WITH months AS (
  -- Rolling 6-month planning horizon starting current month (6 rows inclusive)
  SELECT generate_series(
    date_trunc('month', current_date),
    date_trunc('month', current_date) + interval '5 months',
    interval '1 month'
  )::date AS month
),

-- ── Projected series ──────────────────────────────────────────────────────────

-- Yield + revenue booked in the month containing estimated_harvest_date
projected_yield_rev AS (
  SELECT
    date_trunc('month', vct.estimated_harvest_date)::date AS month,
    SUM(COALESCE(vct.forecast_yield_grams, 0))            AS yield_grams,
    SUM(COALESCE(vct.forecast_revenue, 0))                AS revenue
  FROM v_planned_cycles_timeline vct
  GROUP BY 1
),

-- Labor distributed across each calendar month the cycle occupies (flower_start → harvest)
-- hours = (overlap_days / 7) * labor_hours_per_week_room
projected_labor AS (
  SELECT
    m.month,
    SUM(
      GREATEST(0,
        EXTRACT(EPOCH FROM (
          LEAST(
            (m.month + interval '1 month')::timestamptz,
            vct.estimated_harvest_date::timestamptz
          ) -
          GREATEST(
            m.month::timestamptz,
            vct.flower_start_date::timestamptz
          )
        )) / 86400.0
        / 7.0
        * COALESCE(vct.labor_hours_per_week_room, 0)
      )
    ) AS labor_hours
  FROM v_planned_cycles_timeline vct
  CROSS JOIN months m
  WHERE vct.flower_start_date  < (m.month + interval '1 month')::date
    AND vct.estimated_harvest_date >= m.month
  GROUP BY m.month
),

-- ── Committed series ─────────────────────────────────────────────────────────
-- In-progress plant groups (growth_stage ≠ 'harvested', estimated_harvest_date set)

-- Yield + revenue booked in harvest month; falls back to strain averages
committed_yield_rev AS (
  SELECT
    date_trunc('month', pg.estimated_harvest_date)::date                       AS month,
    SUM(COALESCE(pg.plant_count * s.avg_wet_weight_per_plant_g, 0))            AS yield_grams,
    SUM(COALESCE(
      pg.plant_count * s.avg_wet_weight_per_plant_g * s.forecast_price_per_gram,
      0
    ))                                                                          AS revenue
  FROM plant_groups pg
  JOIN strains s ON s.id = pg.strain_id
  WHERE pg.growth_stage NOT IN ('harvested')
    AND pg.estimated_harvest_date IS NOT NULL
  GROUP BY 1
),

-- Labor distributed from stage_entered_at → estimated_harvest_date per month
committed_labor AS (
  SELECT
    m.month,
    SUM(
      GREATEST(0,
        EXTRACT(EPOCH FROM (
          LEAST(
            (m.month + interval '1 month')::timestamptz,
            pg.estimated_harvest_date::timestamptz
          ) -
          GREATEST(
            m.month::timestamptz,
            pg.stage_entered_at
          )
        )) / 86400.0
        / 7.0
        * COALESCE(gr.labor_hours_per_week, 0)
      )
    ) AS labor_hours
  FROM plant_groups pg
  JOIN grow_rooms gr ON gr.id = pg.grow_room_id
  CROSS JOIN months m
  WHERE pg.growth_stage NOT IN ('harvested')
    AND pg.estimated_harvest_date IS NOT NULL
    AND pg.stage_entered_at       < (m.month + interval '1 month')
    AND pg.estimated_harvest_date::date >= m.month
  GROUP BY m.month
)

-- ── Final output ─────────────────────────────────────────────────────────────
SELECT
  m.month,
  ROUND(COALESCE(pyr.yield_grams, 0), 2) AS projected_yield_grams,
  ROUND(COALESCE(pyr.revenue,     0), 2) AS projected_revenue,
  ROUND(COALESCE(pl.labor_hours,  0), 2) AS projected_labor_hours,
  ROUND(COALESCE(cyr.yield_grams, 0), 2) AS committed_yield_grams,
  ROUND(COALESCE(cyr.revenue,     0), 2) AS committed_revenue,
  ROUND(COALESCE(cl.labor_hours,  0), 2) AS committed_labor_hours
FROM months m
LEFT JOIN projected_yield_rev pyr ON pyr.month = m.month
LEFT JOIN projected_labor     pl  ON pl.month  = m.month
LEFT JOIN committed_yield_rev cyr ON cyr.month = m.month
LEFT JOIN committed_labor     cl  ON cl.month  = m.month
ORDER BY m.month;

COMMENT ON VIEW v_forecast_summary IS
  'Rolling 6-month forward forecast by calendar month. '
  'Projected series: planned_cycles via v_planned_cycles_timeline (non-cancelled/non-completed). '
  'Committed series: active plant_groups not yet harvested. '
  'Yield + revenue booked in harvest month; labor distributed across cycle duration. '
  'Created CUL-64, 2026-04-01.';
