/*
  # Fix cultivation constraints and triggers — session 17 audit

  Four issues found during comprehensive audit of production DB vs app code:

  1. plant_mortality_log.cause CHECK — missing 'cull_at_move' value used by
     the new kill-plants-during-move feature.

  2. plant_groups.plant_count CHECK — was > 0, but splitAndMoveToRoom sets
     source group to 0 when all plants are moved out. Changed to >= 0.

  3. fn_log_plant_group_room_history — enhanced to capture from_table_id,
     from_section_id, and plant_count (previously only wrote room IDs).
     The manual history insert in cultivation.service.ts moveToRoom was also
     removed to prevent duplicate rows.

  4. fn_generate_plant_group_number — removed dead v_date_part variable
     (group_number column doesn't exist on plant_groups).
*/


-- ═══ 1. Allow 'cull_at_move' in mortality log causes ═══

ALTER TABLE plant_mortality_log DROP CONSTRAINT IF EXISTS plant_mortality_log_cause_check;
ALTER TABLE plant_mortality_log ADD CONSTRAINT plant_mortality_log_cause_check
  CHECK (cause = ANY (ARRAY[
    'pest', 'disease', 'nutrient', 'environmental',
    'mechanical', 'unknown', 'other', 'cull_at_move'
  ]));


-- ═══ 2. Allow plant_count = 0 for archived/depleted source groups ═══

ALTER TABLE plant_groups DROP CONSTRAINT IF EXISTS plant_groups_plant_count_check;
ALTER TABLE plant_groups ADD CONSTRAINT plant_groups_plant_count_check
  CHECK (plant_count >= 0);


-- ═══ 3. Enhanced room history trigger (captures table/section/count) ═══

CREATE OR REPLACE FUNCTION fn_log_plant_group_room_history()
RETURNS trigger AS $$
BEGIN
  INSERT INTO plant_group_room_history (
    plant_group_id,
    from_room_id,
    to_room_id,
    from_table_id,
    from_section_id,
    plant_count,
    moved_at,
    moved_by
  ) VALUES (
    NEW.id,
    OLD.grow_room_id,
    NEW.grow_room_id,
    OLD.room_table_id,
    OLD.room_section_id,
    NEW.plant_count,
    now(),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══ 4. Clean fn_generate_plant_group_number (remove dead v_date_part) ═══

CREATE OR REPLACE FUNCTION fn_generate_plant_group_number()
RETURNS trigger AS $$
DECLARE
  v_abbrev      text;
  v_batch_num   text;
  v_batch_id    uuid;
  v_strain_name text;
  v_clone_date  date;
BEGIN
  SELECT abbreviation, name INTO v_abbrev, v_strain_name
  FROM strains WHERE id = NEW.strain_id;

  IF v_abbrev IS NULL OR v_abbrev = '' THEN
    RAISE EXCEPTION
      'Cannot create plant group: strain has no abbreviation set. Set the abbreviation in Settings → Strains first.';
  END IF;

  v_clone_date := COALESCE(NEW.planted_date, CURRENT_DATE);
  v_batch_num  := to_char(v_clone_date, 'YYMMDD') || '-' || v_abbrev;

  INSERT INTO batch_registry (
    batch_number,
    strain,
    strain_id,
    clone_date,
    lifecycle_state,
    created_by
  ) VALUES (
    v_batch_num,
    v_strain_name,
    NEW.strain_id,
    v_clone_date,
    'pre_harvest',
    NEW.created_by
  )
  ON CONFLICT (batch_number) DO NOTHING
  RETURNING id INTO v_batch_id;

  IF v_batch_id IS NULL THEN
    SELECT id INTO v_batch_id
    FROM batch_registry
    WHERE batch_number = v_batch_num;
  END IF;

  NEW.batch_registry_id := v_batch_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
