/*
  # Auto-Generate Individual Plant IDs on Clone-to-Veg Transition

  ## Summary
  When a plant group advances from 'clone' to 'veg', individual plant ID records
  are automatically created in the `individual_plants` table — one per plant in
  the group. This removes the need for manual entry of placeholder IDs at this
  transition point.

  ## New DB Objects

  ### Function: fn_generate_plant_id()
  - Generates a unique random 12-digit numeric string
  - Loops until a non-colliding value is found (satisfies UNIQUE constraint on
    individual_plants.state_plant_id)
  - Format: 12 numeric digits (matches existing CHECK constraint)

  ### Trigger: trg_auto_generate_individual_plants
  - Fires AFTER UPDATE on plant_groups
  - Only activates when growth_stage transitions FROM 'clone' TO 'veg'
  - Inserts one individual_plants row per plant (up to plant_groups.plant_count)
  - IDs are auto-generated placeholders; users may still manually import or
    overwrite with state-issued IDs via the existing bulk import workflow

  ## Important Notes
  1. This trigger is safe to run multiple times because it checks
     whether individual_plants rows already exist for the group before inserting.
     If records already exist (e.g., manually added during clone stage), it skips.
  2. The state_plant_id format is: 12 zero-padded digits starting with a random
     base. This satisfies the existing `^[0-9]{12}$` CHECK constraint.
  3. The generated IDs are NOT official state-issued IDs — they are internal
     placeholders. The cultivation rules (C-38 / C-42) allow manual replacement.
  4. RLS: individual_plants already has authenticated-only RLS. No changes needed.
  5. Invariant reference: C-43 (new) — auto-generation on clone-to-veg.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: fn_generate_plant_id
-- Returns a unique 12-digit numeric string not yet in individual_plants
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_generate_plant_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  candidate text;
  exists_check boolean;
BEGIN
  LOOP
    -- Generate a random 12-digit number (left-pad with zeros if needed)
    candidate := lpad(
      (floor(random() * 1000000000000)::bigint)::text,
      12,
      '0'
    );

    -- Verify uniqueness
    SELECT EXISTS (
      SELECT 1 FROM individual_plants WHERE state_plant_id = candidate
    ) INTO exists_check;

    EXIT WHEN NOT exists_check;
  END LOOP;

  RETURN candidate;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: fn_auto_generate_individual_plants (trigger function)
-- Fires on plant_groups UPDATE when growth_stage changes clone → veg
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_auto_generate_individual_plants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  i integer;
  existing_count integer;
BEGIN
  -- Only act on clone → veg transition
  IF OLD.growth_stage = 'clone' AND NEW.growth_stage = 'veg' THEN

    -- Check if records already exist (e.g., manually added during clone stage)
    SELECT COUNT(*) INTO existing_count
    FROM individual_plants
    WHERE plant_group_id = NEW.id AND is_active = true;

    -- Only auto-generate if no active records exist yet
    IF existing_count = 0 THEN
      FOR i IN 1..COALESCE(NEW.plant_count, 0) LOOP
        INSERT INTO individual_plants (plant_group_id, state_plant_id, is_active)
        VALUES (NEW.id, fn_generate_plant_id(), true);
      END LOOP;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: trg_auto_generate_individual_plants
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_auto_generate_individual_plants ON plant_groups;

CREATE TRIGGER trg_auto_generate_individual_plants
  AFTER UPDATE ON plant_groups
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_generate_individual_plants();
