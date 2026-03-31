/*
  # Auto-sync growth_stage to room type + relax stage transitions

  Two related changes:

  1. New trigger: fn_sync_stage_to_room_type
     Automatically sets growth_stage to match the destination room's room_type
     whenever grow_room_id changes. This means moving a plant group from a
     flower room back to a veg room will auto-set growth_stage = 'veg'.
     - Maps 'mother' room_type → 'veg' stage
     - Skips harvested groups (terminal state)
     - Fires BEFORE the stage validation trigger (alphabetical: trg_a_*)

  2. Relaxed stage validation: fn_validate_plant_group_stage_transition
     Previously only allowed forward: clone→veg→flower→harvested.
     Now allows free movement between clone, veg, and flower.
     Only harvested remains terminal (can't leave it, can only enter from flower).

  Applied to production on 2026-03-30.
*/

-- 1. Auto-sync growth_stage to room type
CREATE OR REPLACE FUNCTION fn_sync_stage_to_room_type()
RETURNS TRIGGER AS $$
DECLARE
  v_room_type TEXT;
BEGIN
  IF NEW.grow_room_id IS DISTINCT FROM OLD.grow_room_id THEN
    IF OLD.growth_stage = 'harvested' THEN
      RETURN NEW;
    END IF;

    SELECT room_type INTO v_room_type
    FROM grow_rooms
    WHERE id = NEW.grow_room_id;

    IF v_room_type IS NOT NULL AND v_room_type IN ('clone', 'veg', 'flower', 'mother') THEN
      IF v_room_type = 'mother' THEN
        v_room_type := 'veg';
      END IF;

      IF NEW.growth_stage IS DISTINCT FROM v_room_type THEN
        NEW.growth_stage := v_room_type;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_a_sync_stage_to_room ON plant_groups;
CREATE TRIGGER trg_a_sync_stage_to_room
  BEFORE UPDATE ON plant_groups
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_stage_to_room_type();

-- 2. Relaxed stage validation
CREATE OR REPLACE FUNCTION fn_validate_plant_group_stage_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.growth_stage = NEW.growth_stage THEN
    RETURN NEW;
  END IF;

  IF OLD.growth_stage = 'harvested' THEN
    RAISE EXCEPTION 'Cannot transition plant group from harvested state';
  END IF;

  IF NEW.growth_stage NOT IN ('clone', 'veg', 'flower', 'harvested') THEN
    RAISE EXCEPTION 'Invalid growth stage: %', NEW.growth_stage;
  END IF;

  IF NEW.growth_stage = 'harvested' AND OLD.growth_stage <> 'flower' THEN
    RAISE EXCEPTION 'Only flower stage can transition to harvested, current: %', OLD.growth_stage;
  END IF;

  NEW.stage_entered_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
