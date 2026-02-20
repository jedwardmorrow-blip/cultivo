/*
  # Backfill Missing Individual Plants

  1. Data Repair
    - Generates individual_plants records for any plant_groups in veg/flower/harvested
      that have zero individual_plants rows
    - Uses the existing fn_generate_plant_id() function for unique 12-digit state IDs
    - Currently affects 1 group: Dante's Inferno mother (260105-DIF)

  2. Important Notes
    - Non-destructive: only INSERTs new rows, never modifies existing data
    - Idempotent: skips groups that already have the correct number of plants
*/

DO $$
DECLARE
  grp RECORD;
  i INTEGER;
  new_plant_id TEXT;
BEGIN
  FOR grp IN
    SELECT pg.id, pg.plant_count, COUNT(ip.id) AS existing_count
    FROM plant_groups pg
    LEFT JOIN individual_plants ip ON ip.plant_group_id = pg.id
    WHERE pg.growth_stage IN ('veg', 'flower', 'harvested')
    GROUP BY pg.id, pg.plant_count
    HAVING COUNT(ip.id) < pg.plant_count
  LOOP
    FOR i IN 1..(grp.plant_count - grp.existing_count) LOOP
      new_plant_id := fn_generate_plant_id();
      INSERT INTO individual_plants (id, plant_group_id, state_plant_id, is_active)
      VALUES (gen_random_uuid(), grp.id, new_plant_id, true);
    END LOOP;
  END LOOP;
END $$;
