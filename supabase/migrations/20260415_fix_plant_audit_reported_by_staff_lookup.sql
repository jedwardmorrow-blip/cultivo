-- Fix fn_apply_plant_audit: resolve staff.id via user_profile_id lookup
--
-- Problem: the function was inserting `auth.uid()` (an auth.users UUID) into
-- `plant_mortality_log.reported_by`, which has a FK to `staff.id`. These are
-- different UUID spaces. Any staff member whose `staff.user_profile_id` is
-- NULL (11 of 19 active staff today) hits a FK violation when applying an
-- audit. Andrew Mason triggered this on PA-260415-01.
--
-- Fix: look up the staff row via `staff.user_profile_id = auth.uid()`. If
-- there's no match, write NULL (column allows it) — the audit still applies
-- and the per-line count trail in plant_audit_counts preserves attribution.
--
-- Also: backfill Andrew's staff.user_profile_id so his mortality rows will
-- record `reported_by` correctly going forward.

CREATE OR REPLACE FUNCTION public.fn_apply_plant_audit(p_audit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_audit plant_audit_sessions%ROWTYPE;
  v_caller uuid := auth.uid();
  v_line plant_audit_counts%ROWTYPE;
  v_pending integer;
  v_mortality_id uuid;
  v_delta integer;

  v_total_lines integer := 0;
  v_counted_clean integer := 0;
  v_variances_neg integer := 0;
  v_variances_pos integer := 0;
  v_not_found integer := 0;
  v_orphans integer := 0;
  v_skipped integer := 0;
  v_mortality_rows_written integer := 0;
  v_total_deaths_logged integer := 0;
  v_total_plants_added integer := 0;

  v_by_cause jsonb := '{}'::jsonb;
  v_by_room jsonb := '{}'::jsonb;
  v_summary jsonb;
BEGIN
  SELECT * INTO v_audit FROM plant_audit_sessions WHERE id = p_audit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fn_apply_plant_audit: session % not found', p_audit_id USING ERRCODE = 'P0002';
  END IF;

  IF v_audit.status = 'applied' THEN
    RAISE EXCEPTION 'fn_apply_plant_audit: session % already applied at %', p_audit_id, v_audit.applied_at
      USING ERRCODE = 'P0001';
  END IF;
  IF v_audit.status = 'abandoned' THEN
    RAISE EXCEPTION 'fn_apply_plant_audit: session % is abandoned', p_audit_id USING ERRCODE = 'P0001';
  END IF;
  IF v_audit.status NOT IN ('in_progress','review') THEN
    RAISE EXCEPTION 'fn_apply_plant_audit: session % has unexpected status %', p_audit_id, v_audit.status
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*) INTO v_pending FROM plant_audit_counts
    WHERE audit_session_id = p_audit_id AND status = 'pending';
  IF v_pending > 0 THEN
    RAISE EXCEPTION 'fn_apply_plant_audit: % pending lines remain in session %', v_pending, p_audit_id
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_line IN
    SELECT * FROM plant_audit_counts
    WHERE audit_session_id = p_audit_id
    ORDER BY grow_room_id, created_at
  LOOP
    v_total_lines := v_total_lines + 1;

    IF v_line.status = 'skipped' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    IF v_line.status = 'orphan_created' THEN
      v_orphans := v_orphans + 1;
      CONTINUE;
    END IF;

    IF v_line.status = 'counted' THEN
      v_counted_clean := v_counted_clean + 1;
      CONTINUE;
    END IF;

    IF v_line.status = 'variance_noted' THEN
      v_delta := COALESCE(v_line.physical_count, 0) - v_line.db_count_snapshot;

      IF v_delta < 0 THEN
        IF v_line.plant_group_id IS NULL THEN
          RAISE EXCEPTION 'fn_apply_plant_audit: variance line % has NULL plant_group_id', v_line.id
            USING ERRCODE = 'P0001';
        END IF;

        INSERT INTO plant_mortality_log (
          plant_group_id, room_id, mortality_date, reported_by,
          quantity, cause, cause_detail, notes
        ) VALUES (
          v_line.plant_group_id,
          v_line.grow_room_id,
          CURRENT_DATE,
          -- Resolve auth.uid() → staff.id via user_profile_id bridge.
          -- Falls back to NULL if the staff row isn't linked (column is nullable).
          (SELECT s.id FROM staff s
           WHERE s.user_profile_id = COALESCE(v_line.counted_by, v_caller)
           LIMIT 1),
          ABS(v_delta),
          COALESCE(v_line.cause_of_death, 'unknown'),
          NULL,
          COALESCE(v_line.notes, 'Plant audit ' || v_audit.audit_number || ' variance line')
        )
        RETURNING id INTO v_mortality_id;

        UPDATE plant_audit_counts SET mortality_log_id = v_mortality_id WHERE id = v_line.id;

        v_variances_neg := v_variances_neg + 1;
        v_mortality_rows_written := v_mortality_rows_written + 1;
        v_total_deaths_logged := v_total_deaths_logged + ABS(v_delta);

        v_by_cause := jsonb_set(
          v_by_cause,
          ARRAY[COALESCE(v_line.cause_of_death, 'unknown')],
          to_jsonb(COALESCE((v_by_cause ->> COALESCE(v_line.cause_of_death, 'unknown'))::int, 0) + ABS(v_delta))
        );
      ELSIF v_delta > 0 THEN
        IF v_line.plant_group_id IS NULL THEN
          RAISE EXCEPTION 'fn_apply_plant_audit: positive variance line % has NULL plant_group_id', v_line.id
            USING ERRCODE = 'P0001';
        END IF;

        UPDATE plant_groups
        SET plant_count = plant_count + v_delta,
            updated_at = now()
        WHERE id = v_line.plant_group_id;

        v_variances_pos := v_variances_pos + 1;
        v_total_plants_added := v_total_plants_added + v_delta;
      ELSE
        v_counted_clean := v_counted_clean + 1;
      END IF;

      CONTINUE;
    END IF;

    IF v_line.status = 'not_found' THEN
      IF v_line.plant_group_id IS NULL THEN
        RAISE EXCEPTION 'fn_apply_plant_audit: not_found line % has NULL plant_group_id', v_line.id
          USING ERRCODE = 'P0001';
      END IF;

      IF v_line.db_count_snapshot > 0 THEN
        INSERT INTO plant_mortality_log (
          plant_group_id, room_id, mortality_date, reported_by,
          quantity, cause, cause_detail, notes
        ) VALUES (
          v_line.plant_group_id,
          v_line.grow_room_id,
          CURRENT_DATE,
          (SELECT s.id FROM staff s
           WHERE s.user_profile_id = COALESCE(v_line.counted_by, v_caller)
           LIMIT 1),
          v_line.db_count_snapshot,
          COALESCE(v_line.cause_of_death, 'unknown'),
          NULL,
          COALESCE(v_line.notes, 'Plant audit ' || v_audit.audit_number || ' not_found — full group absent')
        )
        RETURNING id INTO v_mortality_id;

        UPDATE plant_audit_counts SET mortality_log_id = v_mortality_id WHERE id = v_line.id;

        v_mortality_rows_written := v_mortality_rows_written + 1;
        v_total_deaths_logged := v_total_deaths_logged + v_line.db_count_snapshot;

        v_by_cause := jsonb_set(
          v_by_cause,
          ARRAY[COALESCE(v_line.cause_of_death, 'unknown')],
          to_jsonb(COALESCE((v_by_cause ->> COALESCE(v_line.cause_of_death, 'unknown'))::int, 0) + v_line.db_count_snapshot)
        );
      END IF;

      v_not_found := v_not_found + 1;
      CONTINUE;
    END IF;

    RAISE EXCEPTION 'fn_apply_plant_audit: line % has unrecognised status %', v_line.id, v_line.status
      USING ERRCODE = 'P0001';
  END LOOP;

  SELECT jsonb_object_agg(
    room_key,
    jsonb_build_object(
      'total', total,
      'clean', clean,
      'neg_variance', neg_variance,
      'pos_variance', pos_variance,
      'not_found', not_found,
      'orphan', orphan,
      'skipped', skipped,
      'deaths_logged', deaths_logged,
      'plants_added', plants_added
    )
  )
  INTO v_by_room
  FROM (
    SELECT
      COALESCE(gr.name, pac.grow_room_id::text) AS room_key,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE pac.status = 'counted' OR (pac.status = 'variance_noted' AND COALESCE(pac.physical_count,0) = pac.db_count_snapshot)) AS clean,
      COUNT(*) FILTER (WHERE pac.status = 'variance_noted' AND COALESCE(pac.physical_count,0) < pac.db_count_snapshot) AS neg_variance,
      COUNT(*) FILTER (WHERE pac.status = 'variance_noted' AND COALESCE(pac.physical_count,0) > pac.db_count_snapshot) AS pos_variance,
      COUNT(*) FILTER (WHERE pac.status = 'not_found') AS not_found,
      COUNT(*) FILTER (WHERE pac.status = 'orphan_created') AS orphan,
      COUNT(*) FILTER (WHERE pac.status = 'skipped') AS skipped,
      COALESCE(SUM(
        CASE
          WHEN pac.status = 'variance_noted' AND COALESCE(pac.physical_count,0) < pac.db_count_snapshot
            THEN pac.db_count_snapshot - COALESCE(pac.physical_count,0)
          WHEN pac.status = 'not_found' THEN pac.db_count_snapshot
          ELSE 0
        END
      ), 0) AS deaths_logged,
      COALESCE(SUM(
        CASE
          WHEN pac.status = 'variance_noted' AND COALESCE(pac.physical_count,0) > pac.db_count_snapshot
            THEN COALESCE(pac.physical_count,0) - pac.db_count_snapshot
          ELSE 0
        END
      ), 0) AS plants_added
    FROM plant_audit_counts pac
    LEFT JOIN grow_rooms gr ON gr.id = pac.grow_room_id
    WHERE pac.audit_session_id = p_audit_id
    GROUP BY COALESCE(gr.name, pac.grow_room_id::text)
  ) t;

  v_summary := jsonb_build_object(
    'rooms_audited', COALESCE(array_length(v_audit.room_scope, 1), (SELECT COUNT(DISTINCT grow_room_id) FROM plant_audit_counts WHERE audit_session_id = p_audit_id)),
    'groups_in_scope', v_total_lines,
    'groups_counted', v_counted_clean + v_variances_neg + v_variances_pos + v_not_found,
    'groups_clean', v_counted_clean,
    'groups_with_neg_variance', v_variances_neg,
    'groups_with_pos_variance', v_variances_pos,
    'groups_orphan_created', v_orphans,
    'groups_not_found', v_not_found,
    'groups_skipped', v_skipped,
    'mortality_rows_written', v_mortality_rows_written,
    'total_deaths_logged', v_total_deaths_logged,
    'total_plants_added', v_total_plants_added,
    'by_cause', v_by_cause,
    'by_room', COALESCE(v_by_room, '{}'::jsonb),
    'applied_at', now(),
    'applied_by', v_caller
  );

  UPDATE plant_audit_sessions
  SET
    status = 'applied',
    applied_at = now(),
    applied_by = v_caller,
    completed_at = COALESCE(completed_at, now()),
    summary = v_summary,
    updated_at = now()
  WHERE id = p_audit_id;

  RETURN v_summary;
END;
$function$;

COMMENT ON FUNCTION public.fn_apply_plant_audit(uuid) IS
  'Applies a plant audit session. Resolves staff.id via staff.user_profile_id bridge for mortality reported_by; falls back to NULL if the staff row is not linked to an auth user.';

-- Backfill Andrew Mason's staff.user_profile_id so his audit attribution works
UPDATE public.staff
SET user_profile_id = 'ed5fb636-5625-488f-9e03-b751469965af',
    updated_at = now()
WHERE id = 'efaed246-401b-45a7-9c7e-b6f92261aa9e'
  AND user_profile_id IS NULL;
