/*
  # Create Cultivation Triggers — C-2-2

  Nine trigger + function pairs for the Cultivation module. All use
  CREATE OR REPLACE so they are idempotent — safe to re-run if schema
  changes require trigger updates.

  ## Triggers (in dependency order)

  1. trg_generate_plant_group_number — BEFORE INSERT on plant_groups
     Generates group_number as PG-YYMMDD-ABBREV from strains.abbreviation.
     Raises exception if abbreviation is null or empty (no fallback).

  2. trg_validate_plant_group_stage — BEFORE UPDATE on plant_groups (stage change)
     Enforces forward-only stage transitions: clone→veg→flower→harvested.
     Updates stage_entered_at and updated_at on valid transitions.

  3. trg_log_plant_group_stage_history — AFTER UPDATE on plant_groups (stage change)
     Inserts a row into plant_group_stage_history on every stage transition.
     Service must NOT also insert into this table.

  4. trg_log_plant_group_room_history — AFTER UPDATE on plant_groups (room change)
     Inserts a row into plant_group_room_history on every grow_room_id update.
     Service must NOT also insert into this table.

  5. trg_complete_harvest_session — BEFORE UPDATE on harvest_sessions (→ completed)
     Critical integration trigger: creates or links batch_registry row, sets
     batch_registry_id and completed_at on NEW, advances plant group to 'harvested',
     inserts batch_production_history audit record.
     Raises exception if strains.abbreviation is null or empty.

  6. trg_sync_harvest_weight_adjustment — AFTER UPDATE on harvest_sessions (adjusted_weight change)
     Updates batch_registry.initial_weight_grams to the adjusted value.
     Re-validates weight > 0 and reason present.

  7. trg_validate_harvest_cancellation — BEFORE UPDATE on harvest_sessions (→ cancelled)
     Blocks cancellation if batch_registry_id is already set.
     Sets cancelled_at on NEW when cancellation proceeds.

  8. trg_protect_room_code — BEFORE UPDATE on grow_rooms (room_code change)
     Blocks any attempt to change room_code after creation.

  9. trg_protect_plant_group_strain — BEFORE UPDATE on plant_groups (strain_id change)
     Blocks any attempt to change strain_id after creation.

  ## Key Design Decisions

  - fn_complete_harvest_session uses strains.name (NOT display_name) for batch_registry.strain
  - performed_by in batch_production_history is text type; completed_by (uuid) is cast to text
  - ON CONFLICT (batch_number) DO NOTHING handles same-strain same-day harvests
  - initial_weight_grams stores first harvest session weight only (Invariant C-17)
  - No COALESCE fallback on abbreviation — hard error if missing (Invariant C-11)
*/

CREATE OR REPLACE FUNCTION fn_generate_plant_group_number()
RETURNS trigger AS $$
DECLARE
  v_abbrev    text;
  v_date_part text;
BEGIN
  SELECT abbreviation INTO v_abbrev
  FROM strains WHERE id = NEW.strain_id;

  IF v_abbrev IS NULL OR v_abbrev = '' THEN
    RAISE EXCEPTION
      'Cannot create plant group: strain has no abbreviation set. Set the abbreviation in Settings → Strains first.';
  END IF;

  v_date_part  := to_char(now(), 'YYMMDD');
  NEW.group_number := 'PG-' || v_date_part || '-' || v_abbrev;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_plant_group_number ON plant_groups;
CREATE TRIGGER trg_generate_plant_group_number
BEFORE INSERT ON plant_groups
FOR EACH ROW
EXECUTE FUNCTION fn_generate_plant_group_number();

CREATE OR REPLACE FUNCTION fn_validate_plant_group_stage_transition()
RETURNS trigger AS $$
BEGIN
  IF OLD.growth_stage = NEW.growth_stage THEN
    RETURN NEW;
  END IF;

  IF OLD.growth_stage = 'harvested' THEN
    RAISE EXCEPTION 'Cannot transition plant group from harvested state';
  END IF;

  IF NOT (
    (OLD.growth_stage = 'clone'   AND NEW.growth_stage = 'veg')     OR
    (OLD.growth_stage = 'veg'     AND NEW.growth_stage = 'flower')  OR
    (OLD.growth_stage = 'flower'  AND NEW.growth_stage = 'harvested')
  ) THEN
    RAISE EXCEPTION 'Invalid stage transition: % → %', OLD.growth_stage, NEW.growth_stage;
  END IF;

  NEW.stage_entered_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_plant_group_stage ON plant_groups;
CREATE TRIGGER trg_validate_plant_group_stage
BEFORE UPDATE ON plant_groups
FOR EACH ROW
WHEN (OLD.growth_stage IS DISTINCT FROM NEW.growth_stage)
EXECUTE FUNCTION fn_validate_plant_group_stage_transition();

CREATE OR REPLACE FUNCTION fn_log_plant_group_stage_history()
RETURNS trigger AS $$
BEGIN
  INSERT INTO plant_group_stage_history (
    plant_group_id,
    from_stage,
    to_stage,
    transitioned_at,
    transitioned_by
  ) VALUES (
    NEW.id,
    OLD.growth_stage,
    NEW.growth_stage,
    NEW.stage_entered_at,
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_plant_group_stage_history ON plant_groups;
CREATE TRIGGER trg_log_plant_group_stage_history
AFTER UPDATE ON plant_groups
FOR EACH ROW
WHEN (OLD.growth_stage IS DISTINCT FROM NEW.growth_stage)
EXECUTE FUNCTION fn_log_plant_group_stage_history();

CREATE OR REPLACE FUNCTION fn_log_plant_group_room_history()
RETURNS trigger AS $$
BEGIN
  INSERT INTO plant_group_room_history (
    plant_group_id,
    from_room_id,
    to_room_id,
    moved_at,
    moved_by
  ) VALUES (
    NEW.id,
    OLD.grow_room_id,
    NEW.grow_room_id,
    now(),
    auth.uid()
  );
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_plant_group_room_history ON plant_groups;
CREATE TRIGGER trg_log_plant_group_room_history
AFTER UPDATE ON plant_groups
FOR EACH ROW
WHEN (OLD.grow_room_id IS DISTINCT FROM NEW.grow_room_id)
EXECUTE FUNCTION fn_log_plant_group_room_history();

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
BEGIN
  IF NEW.session_status != 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT pg.strain_id, gr.room_code
  INTO v_strain_id, v_room_code
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

CREATE OR REPLACE FUNCTION fn_sync_harvest_weight_adjustment()
RETURNS trigger AS $$
BEGIN
  IF NEW.adjusted_weight_grams IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.batch_registry_id IS NULL THEN
    RAISE EXCEPTION 'Cannot adjust weight: no batch linked to this harvest session';
  END IF;

  IF NEW.adjusted_weight_grams <= 0 THEN
    RAISE EXCEPTION 'Adjusted weight must be greater than zero';
  END IF;

  IF NEW.adjustment_reason IS NULL OR NEW.adjustment_reason = '' THEN
    RAISE EXCEPTION 'Adjustment reason is required when adjusting harvest weight';
  END IF;

  UPDATE batch_registry
  SET initial_weight_grams = NEW.adjusted_weight_grams,
      updated_at = now()
  WHERE id = NEW.batch_registry_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_harvest_weight_adjustment ON harvest_sessions;
CREATE TRIGGER trg_sync_harvest_weight_adjustment
AFTER UPDATE ON harvest_sessions
FOR EACH ROW
WHEN (
  NEW.adjusted_weight_grams IS DISTINCT FROM OLD.adjusted_weight_grams
  AND NEW.adjusted_weight_grams IS NOT NULL
)
EXECUTE FUNCTION fn_sync_harvest_weight_adjustment();

CREATE OR REPLACE FUNCTION fn_validate_harvest_cancellation()
RETURNS trigger AS $$
BEGIN
  IF NEW.session_status = 'cancelled' AND OLD.batch_registry_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot cancel harvest session: batch % already created. Cancel the batch instead.',
      (SELECT batch_number FROM batch_registry WHERE id = OLD.batch_registry_id);
  END IF;

  IF NEW.session_status = 'cancelled' THEN
    NEW.cancelled_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_harvest_cancellation ON harvest_sessions;
CREATE TRIGGER trg_validate_harvest_cancellation
BEFORE UPDATE ON harvest_sessions
FOR EACH ROW
WHEN (NEW.session_status = 'cancelled' AND OLD.session_status = 'active')
EXECUTE FUNCTION fn_validate_harvest_cancellation();

CREATE OR REPLACE FUNCTION fn_protect_room_code()
RETURNS trigger AS $$
BEGIN
  IF OLD.room_code IS DISTINCT FROM NEW.room_code THEN
    RAISE EXCEPTION 'room_code is immutable after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_room_code ON grow_rooms;
CREATE TRIGGER trg_protect_room_code
BEFORE UPDATE ON grow_rooms
FOR EACH ROW
WHEN (OLD.room_code IS DISTINCT FROM NEW.room_code)
EXECUTE FUNCTION fn_protect_room_code();

CREATE OR REPLACE FUNCTION fn_protect_plant_group_strain()
RETURNS trigger AS $$
BEGIN
  IF OLD.strain_id IS DISTINCT FROM NEW.strain_id THEN
    RAISE EXCEPTION 'strain_id is immutable after plant group creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_plant_group_strain ON plant_groups;
CREATE TRIGGER trg_protect_plant_group_strain
BEFORE UPDATE ON plant_groups
FOR EACH ROW
WHEN (OLD.strain_id IS DISTINCT FROM NEW.strain_id)
EXECUTE FUNCTION fn_protect_plant_group_strain();
