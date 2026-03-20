-- generate_daily_tasks: Layer 2 of the Unified Command Center
-- Reads room_task_schedules + v_room_operational_state to auto-create
-- daily_task_instances for a given date. Idempotent — skips duplicates.
--
-- Usage: SELECT * FROM generate_daily_tasks('2026-03-20');
-- Or for today: SELECT * FROM generate_daily_tasks();

CREATE OR REPLACE FUNCTION public.generate_daily_tasks(
  target_date date DEFAULT current_date
)
RETURNS TABLE(
  task_id uuid,
  room_code text,
  task_type text,
  priority text,
  source text  -- 'schedule' or 'urgency'
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_dow int := extract(isodow FROM target_date)::int;
  v_inserted int := 0;
BEGIN
  -- ============================================================
  -- PHASE 1: Generate tasks from recurring schedules
  -- ============================================================
  RETURN QUERY
  WITH matching_schedules AS (
    SELECT
      rts.id AS schedule_id,
      rts.room_id,
      rts.task_type,
      rts.priority,
      rts.scope,
      rts.default_config,
      rts.notes,
      rts.recurrence,
      rts.day_of_week
    FROM room_task_schedules rts
    WHERE rts.is_active = true
      AND rts.start_date <= target_date
      AND (rts.end_date IS NULL OR rts.end_date >= target_date)
      -- Recurrence matching
      AND (
        rts.recurrence = 'daily'
        OR (rts.recurrence = 'weekly' AND rts.day_of_week @> ARRAY[target_dow])
        OR (rts.recurrence = 'mon_wed_fri' AND target_dow IN (1, 3, 5))
        OR (rts.recurrence = 'tue_thu' AND target_dow IN (2, 4))
        OR (rts.recurrence = 'tue_fri' AND target_dow IN (2, 5))
        OR (rts.recurrence = 'biweekly' AND rts.day_of_week @> ARRAY[target_dow]
            AND mod(extract(week FROM target_date)::int, 2) = mod(extract(week FROM rts.start_date)::int, 2))
        OR (rts.recurrence = 'monthly' AND extract(day FROM target_date)::int = extract(day FROM rts.start_date)::int)
        OR (rts.recurrence = 'one_time' AND rts.start_date = target_date)
      )
      -- No duplicate: skip if task already exists for this schedule+date
      AND NOT EXISTS (
        SELECT 1 FROM daily_task_instances dti
        WHERE dti.schedule_id = rts.id
          AND dti.task_date = target_date
      )
  ),
  inserted_schedule_tasks AS (
    INSERT INTO daily_task_instances (
      schedule_id, room_id, task_date, task_type, status, scope,
      task_config, notes
    )
    SELECT
      ms.schedule_id,
      ms.room_id,
      target_date,
      ms.task_type,
      'pending',
      ms.scope,
      ms.default_config,
      ms.notes
    FROM matching_schedules ms
    RETURNING id, room_id, daily_task_instances.task_type, 'schedule'::text AS source
  )
  SELECT
    ist.id,
    gr.room_code,
    ist.task_type,
    COALESCE(
      (SELECT ms2.priority FROM room_task_schedules ms2
       WHERE ms2.room_id = ist.room_id AND ms2.task_type = ist.task_type AND ms2.is_active
       LIMIT 1),
      'normal'
    ),
    ist.source
  FROM inserted_schedule_tasks ist
  JOIN grow_rooms gr ON gr.id = ist.room_id;

  -- ============================================================
  -- PHASE 2: Urgency-driven bonus tasks from v_room_operational_state
  -- ============================================================
  RETURN QUERY
  WITH urgency_rooms AS (
    SELECT ros.room_id, ros.room_code, ros.urgency_score
    FROM v_room_operational_state ros
    WHERE ros.urgency_score >= 2
      AND NOT EXISTS (
        SELECT 1 FROM daily_task_instances dti
        WHERE dti.room_id = ros.room_id
          AND dti.task_date = target_date
          AND dti.task_type = 'scouting'
      )
  ),
  inserted_urgency_tasks AS (
    INSERT INTO daily_task_instances (
      room_id, task_date, task_type, status, scope, notes
    )
    SELECT
      ur.room_id,
      target_date,
      'scouting',
      'pending',
      'single_day',
      CASE
        WHEN ur.urgency_score = 3 THEN 'AUTO: Harvest imminent — priority scouting required'
        WHEN ur.urgency_score = 2 THEN 'AUTO: Room needs attention — elevated scouting'
      END
    FROM urgency_rooms ur
    RETURNING id, room_id, daily_task_instances.task_type, 'urgency'::text AS source
  )
  SELECT
    iut.id,
    gr.room_code,
    iut.task_type,
    'urgent'::text,
    iut.source
  FROM inserted_urgency_tasks iut
  JOIN grow_rooms gr ON gr.id = iut.room_id;

  -- ============================================================
  -- PHASE 3: Priority elevation for urgent rooms
  -- ============================================================
  UPDATE daily_task_instances dti
  SET task_config = dti.task_config || jsonb_build_object('urgency_elevated', true, 'original_source', 'generate_daily_tasks')
  FROM v_room_operational_state ros
  WHERE dti.room_id = ros.room_id
    AND dti.task_date = target_date
    AND dti.status = 'pending'
    AND ros.urgency_score = 3
    AND NOT (dti.task_config ? 'urgency_elevated');

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.generate_daily_tasks IS
  'Layer 2 of the Unified Command Center. Generates daily_task_instances from room_task_schedules (recurrence matching) and v_room_operational_state (urgency-driven bonus tasks). Idempotent — safe to call multiple times. Created 2026-03-20.';
