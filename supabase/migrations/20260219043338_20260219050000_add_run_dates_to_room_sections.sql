/*
  # Add Flip Date and Projected Harvest Date to Room Sections

  ## Summary
  Adds two nullable date columns to the room_sections table to track the operational
  dates for a specific flower run occupying that section.

  ## Why room_sections (not grow_rooms)
  A single grow room can hold mixed batches. For example, VEG-01 may be feeding two
  different FLW room batches simultaneously, each with different flip and harvest dates.
  Dates are tracked at the section level because sections represent the finest physical
  placement unit — each section holds one batch run at a time.

  ## New Columns
  - `flip_date` (date, nullable) — the date the batch occupying this section was flipped
    from Veg to Flower. Used to calculate "Day N" of flower (days since flip + 1).
  - `projected_harvest_date` (date, nullable) — the expected harvest date for the current
    run in this section. Used to calculate total run length and days remaining/overdue.

  ## Behaviour
  - Both columns are nullable. Not all sections will have dates set (e.g. veg/clone sections).
  - Both columns are mutable — they are operational notes that change with every run.
    No trigger tracks changes; no audit log is maintained (see Invariant C-22).
  - No new RLS policies are needed. The existing UPDATE policy on room_sections already
    permits authenticated users to update rows.

  ## Affected Tables
  - room_sections: +flip_date (date), +projected_harvest_date (date)

  ## Security
  No changes to RLS. Existing authenticated UPDATE policy covers these new columns.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_sections' AND column_name = 'flip_date'
  ) THEN
    ALTER TABLE room_sections ADD COLUMN flip_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_sections' AND column_name = 'projected_harvest_date'
  ) THEN
    ALTER TABLE room_sections ADD COLUMN projected_harvest_date date;
  END IF;
END $$;
