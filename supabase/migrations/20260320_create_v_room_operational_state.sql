-- v_room_operational_state: Layer 1 of the Unified Command Center
-- Single view giving complete operational picture of every grow room
-- Consumed by: CultivationDashboard, task suggestion engine, API

CREATE OR REPLACE VIEW public.v_room_operational_state AS
WITH room_plants AS (
  SELECT
    pg.grow_room_id,
    count(pg.id) AS plant_group_count,
    coalesce(sum(pg.plant_count), 0) AS total_plants,
    count(DISTINCT pg.strain_id) AS strain_count,
    min(pg.stage_entered_at) AS oldest_stage_entry,
    max(pg.stage_entered_at) AS newest_stage_entry,
    min(pg.estimated_harvest_date) AS earliest_harvest_date,
    max(pg.estimated_harvest_date) AS latest_harvest_date,
    extract(day FROM now() - min(pg.stage_entered_at))::int AS days_in_stage,
    mode() WITHIN GROUP (ORDER BY pg.growth_stage) AS dominant_stage,
    array_agg(DISTINCT s.name ORDER BY s.name) FILTER (WHERE s.name IS NOT NULL) AS strain_names
  FROM plant_groups pg
  LEFT JOIN strains s ON s.id = pg.strain_id
  WHERE pg.growth_stage NOT IN ('harvested')
  GROUP BY pg.grow_room_id
),
room_tasks_today AS (
  SELECT
    dti.room_id,
    count(*) AS tasks_today,
    count(*) FILTER (WHERE dti.status = 'completed') AS tasks_completed,
    count(*) FILTER (WHERE dti.status = 'pending') AS tasks_pending,
    count(*) FILTER (WHERE dti.status = 'in_progress') AS tasks_in_progress
  FROM daily_task_instances dti
  WHERE dti.task_date = current_date
  GROUP BY dti.room_id
),
last_harvest AS (
  SELECT DISTINCT ON (hs.grow_room_id)
    hs.grow_room_id,
    hs.harvest_date AS last_harvest_date,
    hs.wet_weight_grams AS last_harvest_wet_grams
  FROM harvest_sessions hs
  WHERE hs.session_status = 'completed' AND hs.grow_room_id IS NOT NULL
  ORDER BY hs.grow_room_id, hs.harvest_date DESC
),
upcoming_harvests AS (
  SELECT
    pg.grow_room_id,
    count(*) AS groups_near_harvest,
    min(pg.estimated_harvest_date) AS next_harvest_date
  FROM plant_groups pg
  WHERE pg.growth_stage = 'flower'
    AND pg.estimated_harvest_date IS NOT NULL
    AND pg.estimated_harvest_date <= current_date + interval '14 days'
    AND pg.estimated_harvest_date >= current_date
  GROUP BY pg.grow_room_id
)
SELECT
  gr.id AS room_id,
  gr.room_code,
  gr.room_type,
  gr.capacity_plants,
  gr.is_active,
  coalesce(rp.plant_group_count, 0) AS plant_group_count,
  coalesce(rp.total_plants, 0) AS total_plants,
  coalesce(rp.strain_count, 0) AS strain_count,
  rp.strain_names,
  rp.dominant_stage,
  rp.days_in_stage,
  rp.oldest_stage_entry,
  rp.newest_stage_entry,
  CASE
    WHEN gr.capacity_plants IS NOT NULL AND gr.capacity_plants > 0
    THEN round(coalesce(rp.total_plants, 0)::numeric / gr.capacity_plants * 100, 1)
    ELSE NULL
  END AS occupancy_pct,
  CASE
    WHEN coalesce(rp.total_plants, 0) = 0 THEN 'empty'
    WHEN gr.capacity_plants IS NOT NULL AND rp.total_plants >= gr.capacity_plants THEN 'full'
    ELSE 'occupied'
  END AS occupancy_status,
  rp.earliest_harvest_date,
  rp.latest_harvest_date,
  uh.groups_near_harvest,
  uh.next_harvest_date,
  lh.last_harvest_date,
  lh.last_harvest_wet_grams,
  CASE
    WHEN rp.earliest_harvest_date IS NOT NULL
    THEN (rp.earliest_harvest_date - current_date)
    ELSE NULL
  END AS days_to_harvest,
  coalesce(rt.tasks_today, 0) AS tasks_today,
  coalesce(rt.tasks_completed, 0) AS tasks_completed_today,
  coalesce(rt.tasks_pending, 0) AS tasks_pending_today,
  coalesce(rt.tasks_in_progress, 0) AS tasks_in_progress_today,
  CASE
    WHEN uh.next_harvest_date IS NOT NULL THEN 3
    WHEN rp.days_in_stage > 70 AND gr.room_type = 'flower' THEN 2
    WHEN coalesce(rt.tasks_pending, 0) > 3 THEN 2
    WHEN rp.days_in_stage > 30 AND gr.room_type = 'veg' THEN 1
    ELSE 0
  END AS urgency_score
FROM grow_rooms gr
LEFT JOIN room_plants rp ON rp.grow_room_id = gr.id
LEFT JOIN room_tasks_today rt ON rt.room_id = gr.id
LEFT JOIN last_harvest lh ON lh.grow_room_id = gr.id
LEFT JOIN upcoming_harvests uh ON uh.grow_room_id = gr.id
WHERE gr.is_active = true;

COMMENT ON VIEW public.v_room_operational_state IS
  'Layer 1 of the Unified Command Center. Aggregates plant groups, tasks, harvest data, and urgency signals into a single room-level operational view. Created 2026-03-20.';
