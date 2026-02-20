/*
  # Add Cultivation Performance Indexes

  ## Summary
  Adds targeted indexes to eliminate slow queries on the cultivation rooms page.

  ## Problem
  The grow rooms page fires N separate queries (one per room card) to load plant groups.
  The most common filter pattern — `WHERE grow_room_id = $1 AND growth_stage != 'harvested'` —
  uses two separate single-column indexes, forcing PostgreSQL to pick one and scan for the other.

  ## Changes

  ### New Indexes
  1. `idx_plant_groups_room_stage` — composite index on `(grow_room_id, growth_stage)`.
     Covers the most common query: fetch active plant groups for a given room.

  2. `idx_grow_rooms_active_code` — partial index on `grow_rooms` where `is_active = true`,
     ordered by `room_code`. Covers the default room list query.

  ## Notes
  - Both are non-destructive additions; no existing data is altered.
  - Concurrent creation is not used here (migrations run in a transaction context).
*/

CREATE INDEX IF NOT EXISTS idx_plant_groups_room_stage
  ON plant_groups (grow_room_id, growth_stage);

CREATE INDEX IF NOT EXISTS idx_grow_rooms_active_code
  ON grow_rooms (room_code)
  WHERE is_active = true;
