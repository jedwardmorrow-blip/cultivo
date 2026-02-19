/*
  # Update Cultivation Triggers — Batch-at-Clone-Time

  ## Summary
  Updates two trigger functions to implement batch-at-clone-time:

  1. **fn_generate_plant_group_number** (BEFORE INSERT on plant_groups)
     Previously: generated group_number only.
     Now: also INSERTs a batch_registry row with lifecycle_state='pre_harvest' and
     clone_date set to NOW() (or planted_date if provided). Sets NEW.batch_registry_id.
     Uses ON CONFLICT (batch_number) DO NOTHING — if the same strain was already planted
     today, reuses the existing batch (same pattern as harvest trigger).

  2. **fn_complete_harvest_session** (BEFORE UPDATE on harvest_sessions → completed)
     Previously: always INSERTed a new batch_registry row.
     Now: first tries to UPDATE the existing batch row via plant_groups.batch_registry_id
     (setting harvest_date, initial_weight_grams, lifecycle_state='created', room).
     Falls back to INSERT if no existing batch row is found (handles legacy plant groups
     that predate this migration and have batch_registry_id = NULL).

  ## No breaking changes
  - All existing data is unaffected (legacy plant groups still have batch_registry_id = NULL
    on plant_groups; the harvest trigger fallback handles them identically to before).
  - All existing batch_registry rows are untouched.
  - harvest_sessions.batch_registry_id still gets set on completion (unchanged).
*/

CREATE OR REPLACE FUNCTION fn_generate_plant_group_number()
RETURNS trigger AS $$
DECLARE
  v_abbrev      text;
  v_date_part   text;
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

  v_date_part      := to_char(now(), 'YYMMDD');
  NEW.group_number := 'PG-' || v_date_part || '-' || v_abbrev;

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

DROP TRIGGER IF EXISTS trg_generate_plant_group_number ON plant_groups;
CREATE TRIGGER trg_generate_plant_group_number
BEFORE INSERT ON plant_groups
FOR EACH ROW
EXECUTE FUNCTION fn_generate_plant_group_number();

CREATE OR REPLACE FUNCTION fn_complete_harvest_session()
RETURNS trigger AS $$
DECLARE
  v_strain_id      uuid;
  v_strain_name    text;
  v_strain_abbrev  text;
  v_room_code      text;
  v_batch_number   text;
  v_batch_id       uuid;
  v_date_prefix    text;
  v_existing_batch uuid;
BEGIN
  IF NEW.session_status != 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT pg.strain_id, pg.batch_registry_id, gr.room_code
  INTO v_strain_id, v_existing_batch, v_room_code
  FROM plant_groups pg
  JOIN grow_rooms gr ON gr.id = pg.grow_room_id
  WHERE pg.id = NEW.plant_group_id;

  SELECT name, abbreviation INTO v_strain_name, v_strain_abbrev
  FROM strains WHERE id = v_strain_id;

  IF v_strain_abbrev IS NULL OR v_strain_abbrev = '' THEN
    RAISE EXCEPTION
      'Cannot complete harvest: strain "%" has no abbreviation set. Set the abbreviation in Settings → Strains first.',
      v_strain_name;
  END IF;

  v_date_prefix  := to_char(NEW.harvest_date, 'YYMMDD');
  v_batch_number := v_date_prefix || '-' || v_strain_abbrev;

  IF v_existing_batch IS NOT NULL THEN
    UPDATE batch_registry
    SET
      harvest_date          = NEW.harvest_date,
      initial_weight_grams  = NEW.wet_weight_grams,
      room                  = v_room_code,
      lifecycle_state       = 'created',
      batch_number          = v_batch_number,
      updated_at            = now()
    WHERE id = v_existing_batch;

    v_batch_id := v_existing_batch;
  ELSE
    INSERT INTO batch_registry (
      batch_number,
      strain,
      strain_id,
      harvest_date,
      initial_weight_grams,
      room,
      lifecycle_state,
      created_by
    ) VALUES (
      v_batch_number,
      v_strain_name,
      v_strain_id,
      NEW.harvest_date,
      NEW.wet_weight_grams,
      v_room_code,
      'created',
      NEW.completed_by
    )
    ON CONFLICT (batch_number) DO NOTHING
    RETURNING id INTO v_batch_id;

    IF v_batch_id IS NULL THEN
      SELECT id INTO v_batch_id
      FROM batch_registry
      WHERE batch_number = v_batch_number;
    END IF;
  END IF;

  NEW.batch_registry_id := v_batch_id;
  NEW.completed_at := COALESCE(NEW.completed_at, now());

  UPDATE plant_groups
  SET growth_stage = 'harvested', updated_at = now()
  WHERE id = NEW.plant_group_id;

  INSERT INTO batch_production_history (
    batch_id,
    event_type,
    source_weight_grams,
    notes,
    performed_by
  ) VALUES (
    v_batch_id,
    'batch_created',
    NEW.wet_weight_grams,
    'Batch created from harvest session ' || NEW.id,
    NEW.completed_by::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_complete_harvest_session ON harvest_sessions;
CREATE TRIGGER trg_complete_harvest_session
BEFORE UPDATE ON harvest_sessions
FOR EACH ROW
WHEN (NEW.session_status = 'completed' AND OLD.session_status = 'active')
EXECUTE FUNCTION fn_complete_harvest_session();
