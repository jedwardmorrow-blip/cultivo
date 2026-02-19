/*
  # C-5B-1: Add Plant Group Placement Columns to plant_groups

  ## Summary
  Adds physical placement tracking to plant_groups so each group can be
  assigned to a specific table and section within its grow room. This
  enables the Room Map grid view in the Cultivation dashboard.

  ## Changes

  ### Modified Tables
  - **plant_groups**
    - Added `room_table_id` (uuid, nullable) — FK → room_tables(id); the physical
      table the plant group is currently placed on within its grow room
    - Added `room_section_id` (uuid, nullable) — FK → room_sections(id); the
      section within the table where the group is placed
    - Added CHECK constraint `room_section_requires_table` — if a section is
      assigned, a table must also be assigned (section without table is invalid)
    - Added partial indexes on both new FK columns for query performance

  ## New Triggers

  ### trg_clear_placement_on_room_transfer (BEFORE UPDATE on plant_groups)
  When a plant group is moved to a different grow room, automatically clears
  room_table_id and room_section_id. Prevents stale placement data pointing
  to tables/sections in the old room. Fires before the room history trigger
  (which is AFTER) — no conflict.

  ### trg_validate_placement_room (BEFORE INSERT OR UPDATE on plant_groups)
  When room_table_id is set, validates that the referenced table belongs to
  the same grow_room_id as the plant group. Raises an exception if there is
  a mismatch, preventing cross-room placement errors.

  ## Security
  No new RLS policies needed — existing authenticated UPDATE policy on
  plant_groups already covers the new columns.

  ## Notes
  1. Both new columns are nullable — existing plant groups are unaffected.
  2. The placement can be updated at any time without affecting grow_room_id
     or growth_stage — placement is independent operational data.
  3. Room transfer (changing grow_room_id) automatically clears placement
     via the trigger, so the UI does not need to explicitly clear it.
  4. Invariant C-26: placement is stored directly on plant_groups (not a
     separate placements table) for simplicity.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plant_groups' AND column_name = 'room_table_id'
  ) THEN
    ALTER TABLE plant_groups
      ADD COLUMN room_table_id uuid REFERENCES room_tables(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plant_groups' AND column_name = 'room_section_id'
  ) THEN
    ALTER TABLE plant_groups
      ADD COLUMN room_section_id uuid REFERENCES room_sections(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'plant_groups'
      AND constraint_name = 'room_section_requires_table'
  ) THEN
    ALTER TABLE plant_groups
      ADD CONSTRAINT room_section_requires_table CHECK (
        room_section_id IS NULL OR room_table_id IS NOT NULL
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_plant_groups_room_table_id
  ON plant_groups(room_table_id)
  WHERE room_table_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plant_groups_room_section_id
  ON plant_groups(room_section_id)
  WHERE room_section_id IS NOT NULL;

CREATE OR REPLACE FUNCTION fn_clear_placement_on_room_transfer()
RETURNS trigger AS $$
BEGIN
  NEW.room_table_id := NULL;
  NEW.room_section_id := NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clear_placement_on_room_transfer ON plant_groups;

CREATE TRIGGER trg_clear_placement_on_room_transfer
BEFORE UPDATE ON plant_groups
FOR EACH ROW
WHEN (OLD.grow_room_id IS DISTINCT FROM NEW.grow_room_id)
EXECUTE FUNCTION fn_clear_placement_on_room_transfer();

CREATE OR REPLACE FUNCTION fn_validate_placement_room()
RETURNS trigger AS $$
DECLARE
  v_table_room_id uuid;
BEGIN
  IF NEW.room_table_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT grow_room_id INTO v_table_room_id
  FROM room_tables WHERE id = NEW.room_table_id;

  IF v_table_room_id IS NULL THEN
    RAISE EXCEPTION 'Placement error: room table not found';
  END IF;

  IF v_table_room_id != NEW.grow_room_id THEN
    RAISE EXCEPTION 'Placement error: table belongs to a different room than the plant group';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_placement_room ON plant_groups;

CREATE TRIGGER trg_validate_placement_room
BEFORE INSERT OR UPDATE ON plant_groups
FOR EACH ROW
WHEN (NEW.room_table_id IS NOT NULL)
EXECUTE FUNCTION fn_validate_placement_room();
