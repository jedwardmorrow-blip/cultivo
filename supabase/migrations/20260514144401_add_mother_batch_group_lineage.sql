-- Production Planner: mother batch group lineage
--
-- The demo planner models mother batch groups as a first-class planning signal.
-- Live cultivation already has plant_groups with is_mother=true, so this keeps
-- plant_groups canonical and adds the missing lineage/health contract around it.

ALTER TABLE public.plant_groups
  ADD COLUMN IF NOT EXISTS source_cycle_id uuid,
  ADD COLUMN IF NOT EXISTS source_batch_registry_id uuid REFERENCES public.batch_registry(id),
  ADD COLUMN IF NOT EXISTS health text NOT NULL DEFAULT 'healthy',
  ADD COLUMN IF NOT EXISTS cuts_taken_lifetime integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cuts_max_rotations integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS retired_at timestamptz,
  ADD COLUMN IF NOT EXISTS retirement_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'plant_groups_health_check'
      AND conrelid = 'public.plant_groups'::regclass
  ) THEN
    ALTER TABLE public.plant_groups
      ADD CONSTRAINT plant_groups_health_check
      CHECK (health IN ('healthy', 'watch', 'needs_replacement', 'retired'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'plant_groups_cuts_taken_lifetime_check'
      AND conrelid = 'public.plant_groups'::regclass
  ) THEN
    ALTER TABLE public.plant_groups
      ADD CONSTRAINT plant_groups_cuts_taken_lifetime_check
      CHECK (cuts_taken_lifetime >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'plant_groups_cuts_max_rotations_check'
      AND conrelid = 'public.plant_groups'::regclass
  ) THEN
    ALTER TABLE public.plant_groups
      ADD CONSTRAINT plant_groups_cuts_max_rotations_check
      CHECK (cuts_max_rotations > 0);
  END IF;

  IF to_regclass('public.cycles') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'plant_groups_source_cycle_id_fkey'
        AND conrelid = 'public.plant_groups'::regclass
    )
  THEN
    ALTER TABLE public.plant_groups
      ADD CONSTRAINT plant_groups_source_cycle_id_fkey
      FOREIGN KEY (source_cycle_id) REFERENCES public.cycles(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_plant_groups_mother_room_health
  ON public.plant_groups (grow_room_id, health)
  WHERE is_mother = true;

CREATE INDEX IF NOT EXISTS idx_plant_groups_source_cycle_id
  ON public.plant_groups (source_cycle_id)
  WHERE source_cycle_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plant_groups_source_batch_registry_id
  ON public.plant_groups (source_batch_registry_id)
  WHERE source_batch_registry_id IS NOT NULL;

DO $$
DECLARE
  v_security_clause text := CASE
    WHEN current_setting('server_version_num')::integer >= 150000
    THEN ' WITH (security_invoker = true)'
    ELSE ''
  END;
  v_cycle_join text := CASE
    WHEN to_regclass('public.cycles') IS NOT NULL
    THEN 'LEFT JOIN public.cycles c ON c.id = pg.source_cycle_id'
    ELSE ''
  END;
  v_cycle_select text := CASE
    WHEN to_regclass('public.cycles') IS NOT NULL
    THEN 'c.cycle_code AS source_cycle_code'
    ELSE 'NULL::text AS source_cycle_code'
  END;
BEGIN
  EXECUTE format($view$
    CREATE OR REPLACE VIEW public.v_mother_batch_groups%s AS
    SELECT
      COALESCE(
        pg.source_cycle_id::text,
        pg.source_batch_registry_id::text,
        pg.grow_room_id::text || ':' || pg.strain_id::text || ':' || COALESCE(pg.planted_date::text, 'unplanted')
      ) AS mother_batch_group_key,
      pg.source_cycle_id,
      %s,
      pg.source_batch_registry_id,
      br.batch_number AS source_batch_number,
      pg.grow_room_id AS room_id,
      gr.room_code,
      gr.name AS room_name,
      pg.strain_id,
      s.display_name AS strain_name,
      count(*)::integer AS plant_group_count,
      count(*) FILTER (WHERE pg.retired_at IS NULL)::integer AS active_plant_group_count,
      COALESCE(sum(pg.plant_count), 0)::integer AS plant_count,
      COALESCE(sum(pg.plant_count) FILTER (WHERE pg.retired_at IS NULL), 0)::integer AS active_plant_count,
      min(pg.planted_date) AS planted_date_min,
      max(pg.stage_entered_at) AS last_stage_entered_at,
      max(pg.created_at) AS last_created_at,
      bool_or(pg.retired_at IS NOT NULL) AS has_retired_moms,
      jsonb_agg(
        jsonb_build_object(
          'plant_group_id', pg.id,
          'group_number', pg.group_number,
          'name', pg.name,
          'plant_count', pg.plant_count,
          'growth_stage', pg.growth_stage,
          'health', pg.health,
          'cuts_taken_lifetime', pg.cuts_taken_lifetime,
          'cuts_max_rotations', pg.cuts_max_rotations,
          'retired_at', pg.retired_at,
          'retirement_reason', pg.retirement_reason
        )
        ORDER BY pg.retired_at NULLS FIRST, pg.created_at DESC
      ) AS moms
    FROM public.plant_groups pg
    JOIN public.grow_rooms gr ON gr.id = pg.grow_room_id
    JOIN public.strains s ON s.id = pg.strain_id
    LEFT JOIN public.batch_registry br ON br.id = pg.source_batch_registry_id
    %s
    WHERE pg.is_mother = true
    GROUP BY
      pg.source_cycle_id,
      source_cycle_code,
      pg.source_batch_registry_id,
      br.batch_number,
      pg.grow_room_id,
      gr.room_code,
      gr.name,
      pg.strain_id,
      s.display_name,
      COALESCE(
        pg.source_cycle_id::text,
        pg.source_batch_registry_id::text,
        pg.grow_room_id::text || ':' || pg.strain_id::text || ':' || COALESCE(pg.planted_date::text, 'unplanted')
      )
  $view$, v_security_clause, v_cycle_select, v_cycle_join);
END $$;

GRANT SELECT ON public.v_mother_batch_groups TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_hold_back_moms(
  p_source_cycle_id uuid,
  p_room_id uuid,
  p_moms jsonb,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  plant_group_id uuid,
  strain_id uuid,
  plant_count integer
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_entry jsonb;
  v_source_batch_registry_id uuid;
  v_plant_count integer;
  v_cuts_max_rotations integer;
  v_inserted_id uuid;
BEGIN
  IF p_room_id IS NULL THEN
    RAISE EXCEPTION 'p_room_id is required';
  END IF;

  IF p_moms IS NULL OR jsonb_typeof(p_moms) <> 'array' OR jsonb_array_length(p_moms) = 0 THEN
    RAISE EXCEPTION 'p_moms must be a non-empty JSON array';
  END IF;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_moms)
  LOOP
    IF NULLIF(v_entry->>'strain_id', '') IS NULL THEN
      RAISE EXCEPTION 'Each mom entry requires strain_id';
    END IF;

    v_plant_count := COALESCE(NULLIF(v_entry->>'plant_count', '')::integer, 1);
    v_cuts_max_rotations := COALESCE(NULLIF(v_entry->>'cuts_max_rotations', '')::integer, 4);
    v_source_batch_registry_id := NULLIF(v_entry->>'source_batch_registry_id', '')::uuid;

    IF v_plant_count <= 0 THEN
      RAISE EXCEPTION 'plant_count must be greater than 0';
    END IF;

    IF v_cuts_max_rotations <= 0 THEN
      RAISE EXCEPTION 'cuts_max_rotations must be greater than 0';
    END IF;

    INSERT INTO public.plant_groups (
      strain_id,
      grow_room_id,
      source_cycle_id,
      source_batch_registry_id,
      is_mother,
      plant_count,
      growth_stage,
      health,
      cuts_taken_lifetime,
      cuts_max_rotations,
      planted_date,
      stage_entered_at,
      source_type,
      notes,
      created_by
    )
    VALUES (
      (v_entry->>'strain_id')::uuid,
      p_room_id,
      p_source_cycle_id,
      v_source_batch_registry_id,
      true,
      v_plant_count,
      COALESCE(NULLIF(v_entry->>'growth_stage', ''), 'veg'),
      COALESCE(NULLIF(v_entry->>'health', ''), 'healthy'),
      COALESCE(NULLIF(v_entry->>'cuts_taken_lifetime', '')::integer, 0),
      v_cuts_max_rotations,
      COALESCE(NULLIF(v_entry->>'planted_date', '')::date, current_date),
      now(),
      'clone',
      p_notes,
      auth.uid()
    )
    RETURNING id INTO v_inserted_id;

    plant_group_id := v_inserted_id;
    strain_id := (v_entry->>'strain_id')::uuid;
    plant_count := v_plant_count;
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_retire_mom(
  p_plant_group_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_retired_id uuid;
BEGIN
  UPDATE public.plant_groups
  SET
    health = 'retired',
    retired_at = COALESCE(retired_at, now()),
    retirement_reason = COALESCE(p_reason, retirement_reason),
    plant_count = 0,
    updated_at = now()
  WHERE id = p_plant_group_id
    AND is_mother = true
  RETURNING id INTO v_retired_id;

  IF v_retired_id IS NULL THEN
    RAISE EXCEPTION 'Mother plant group not found: %', p_plant_group_id;
  END IF;

  RETURN v_retired_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_hold_back_moms(uuid, uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_retire_mom(uuid, text) TO authenticated;

COMMENT ON VIEW public.v_mother_batch_groups IS
  'Production Planner read model for mother batch groups, grouped from canonical plant_groups rows.';

COMMENT ON FUNCTION public.fn_hold_back_moms(uuid, uuid, jsonb, text) IS
  'Creates mother plant_groups held back from a source production cycle or batch group.';

COMMENT ON FUNCTION public.fn_retire_mom(uuid, text) IS
  'Retires a mother plant_group while preserving lineage and historical counts.';
