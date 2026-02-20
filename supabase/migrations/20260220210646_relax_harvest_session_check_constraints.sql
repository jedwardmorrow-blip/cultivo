/*
  # Relax harvest_sessions CHECK constraints for D-14 empty-shell pattern

  1. Modified Constraints
    - `harvest_sessions_wet_weight_grams_check`: changed from `> 0` to `>= 0`
    - `harvest_sessions_plant_count_harvested_check`: changed from `> 0` to `>= 0`

  2. Why
    - The D-14 room-based harvest workflow creates sessions as empty shells
      (wet_weight_grams = 0, plant_count_harvested = 0)
    - Individual weights are recorded via `harvest_weight_entries` (each entry
      enforces weight_grams > 0 and plant_count >= 1)
    - The `finalizeHarvest` method aggregates entries into the session totals
      before completing the session, so finalized values are always > 0
    - The old `> 0` constraints blocked the initial INSERT at session creation

  3. Data Integrity
    - Per-entry validity enforced by harvest_weight_entries constraints
    - Application-layer validation in finalizeHarvest ensures entries exist
    - Invariants C-8 and C-9 still require > 0 at completion time (enforced
      by the finalization logic, not the CHECK constraint)
*/

ALTER TABLE harvest_sessions
  DROP CONSTRAINT IF EXISTS harvest_sessions_wet_weight_grams_check;

ALTER TABLE harvest_sessions
  ADD CONSTRAINT harvest_sessions_wet_weight_grams_check
  CHECK (wet_weight_grams >= 0);

ALTER TABLE harvest_sessions
  DROP CONSTRAINT IF EXISTS harvest_sessions_plant_count_harvested_check;

ALTER TABLE harvest_sessions
  ADD CONSTRAINT harvest_sessions_plant_count_harvested_check
  CHECK (plant_count_harvested >= 0);
