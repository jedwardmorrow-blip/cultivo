-- CUL-341: Cultivation Today Summary RPC
-- Returns attention_items (harvest_imminent + stage_move_pending) sourced from plant_groups.
-- todays_tasks / this_week_tasks return empty arrays until cultivation task tables exist.

CREATE OR REPLACE FUNCTION get_cultivation_today_summary(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_harvest_imminent jsonb;
  v_stage_move       jsonb;
BEGIN
  -- Harvest imminent: flower-stage groups with harvest date within 3 days
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'type',                    'harvest_imminent',
    'plant_group_id',          pg.id,
    'plant_group_name',        pg.name,
    'strain_name',             s.name,
    'room_name',               gr.name,
    'plant_count',             pg.plant_count,
    'estimated_harvest_date',  pg.estimated_harvest_date
  ) ORDER BY pg.estimated_harvest_date), '[]'::jsonb)
  INTO v_harvest_imminent
  FROM plant_groups pg
  JOIN strains    s  ON s.id  = pg.strain_id
  JOIN grow_rooms gr ON gr.id = pg.grow_room_id
  WHERE pg.growth_stage = 'flower'
    AND pg.estimated_harvest_date IS NOT NULL
    AND pg.estimated_harvest_date <= (CURRENT_DATE + interval '3 days')::date;

  -- Stage move pending: non-harvested groups unchanged for > 2 days
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'type',             'stage_move_pending',
    'plant_group_id',   pg.id,
    'plant_group_name', pg.name,
    'strain_name',      s.name,
    'room_name',        gr.name,
    'growth_stage',     pg.growth_stage,
    'days_in_stage',    (EXTRACT(epoch FROM now() - pg.stage_entered_at) / 86400)::int
  ) ORDER BY pg.stage_entered_at), '[]'::jsonb)
  INTO v_stage_move
  FROM plant_groups pg
  JOIN strains    s  ON s.id  = pg.strain_id
  JOIN grow_rooms gr ON gr.id = pg.grow_room_id
  WHERE pg.growth_stage <> 'harvested'
    AND pg.stage_entered_at < now() - interval '2 days';

  RETURN jsonb_build_object(
    'attention_items', v_harvest_imminent || v_stage_move,
    'todays_tasks',    '[]'::jsonb,
    'this_week_tasks', '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_cultivation_today_summary(uuid) TO authenticated;
