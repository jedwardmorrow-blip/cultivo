-- CUL-302: Labor log aggregation views
-- Unifies 8 cultivation log tables into daily and weekly summaries by staff + task type.
-- Source: cleaning_log, custom_task_log, defoliation_log, feeding_log,
--         ipm_spray_log, plant_mortality_log, scouting_log, training_log

-- Daily summary: staff × task_type × day × room
CREATE OR REPLACE VIEW v_labor_log_daily AS
WITH log_entries AS (
  SELECT cleaned_by    AS staff_id, 'cleaning'::text AS task_type,
         cleaned_at::date AS log_date, room_id, created_at
  FROM cleaning_log WHERE cleaned_by IS NOT NULL
  UNION ALL
  SELECT performed_by, 'custom_task', performed_at::date, room_id, created_at
  FROM custom_task_log WHERE performed_by IS NOT NULL
  UNION ALL
  SELECT performed_by, 'defoliation', performed_at::date, room_id, created_at
  FROM defoliation_log WHERE performed_by IS NOT NULL
  UNION ALL
  SELECT fed_by, 'feeding', fed_at::date, room_id, created_at
  FROM feeding_log WHERE fed_by IS NOT NULL
  UNION ALL
  SELECT applied_by, 'ipm_spray', applied_at::date, room_id, created_at
  FROM ipm_spray_log WHERE applied_by IS NOT NULL
  UNION ALL
  SELECT scouted_by, 'scouting', scouted_at::date, room_id, created_at
  FROM scouting_log WHERE scouted_by IS NOT NULL
  UNION ALL
  SELECT trained_by, 'training', trained_at::date, room_id, created_at
  FROM training_log WHERE trained_by IS NOT NULL
  UNION ALL
  SELECT reported_by, 'plant_mortality', mortality_date, room_id, created_at
  FROM plant_mortality_log WHERE reported_by IS NOT NULL
)
SELECT
  staff_id, task_type, log_date, room_id,
  COUNT(*)        AS entry_count,
  MIN(created_at) AS first_entry_at,
  MAX(created_at) AS last_entry_at
FROM log_entries
GROUP BY staff_id, task_type, log_date, room_id
ORDER BY log_date DESC, staff_id, task_type;

-- Weekly rollup: staff × task_type × week
CREATE OR REPLACE VIEW v_labor_log_weekly AS
SELECT
  staff_id, task_type,
  DATE_TRUNC('week', log_date::timestamptz)::date AS week_start,
  SUM(entry_count)         AS entry_count,
  COUNT(DISTINCT log_date) AS active_days,
  COUNT(DISTINCT room_id)  AS rooms_worked
FROM v_labor_log_daily
GROUP BY staff_id, task_type, week_start
ORDER BY week_start DESC, staff_id, task_type;

-- Staff weekly totals (cross-task summary — for capacity planning)
CREATE OR REPLACE VIEW v_labor_log_staff_weekly AS
SELECT
  staff_id,
  DATE_TRUNC('week', log_date::timestamptz)::date AS week_start,
  SUM(entry_count)           AS total_entries,
  COUNT(DISTINCT task_type)  AS distinct_task_types,
  COUNT(DISTINCT log_date)   AS active_days
FROM v_labor_log_daily
GROUP BY staff_id, week_start
ORDER BY week_start DESC, staff_id;

GRANT SELECT ON v_labor_log_daily        TO authenticated;
GRANT SELECT ON v_labor_log_weekly       TO authenticated;
GRANT SELECT ON v_labor_log_staff_weekly TO authenticated;
