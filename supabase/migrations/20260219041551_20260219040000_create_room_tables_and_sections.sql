/*
  # C-4: Create room_tables and room_sections

  ## Summary
  Adds the physical layout layer beneath grow_rooms. Each grow room contains
  numbered tables; each table is subdivided into labeled sections. This structure
  is the prerequisite for plant group placement (Session C-5).

  ## New Tables

  ### room_tables
  Represents a physical cultivation table inside a grow room.
  - `id` — uuid primary key
  - `grow_room_id` — FK to grow_rooms (cascade delete)
  - `table_number` — positive integer, unique per room (enforced by constraint)
  - `table_name` — optional human-friendly label (e.g. "Back Wall Left")
  - `total_sqft` — optional numeric square footage of the table surface
  - `is_active` — soft-delete flag; archive instead of hard-delete
  - `created_at`, `created_by` — audit fields

  ### room_sections
  Represents a labeled subdivision of a room_table (e.g. "A", "B", "01").
  - `id` — uuid primary key
  - `room_table_id` — FK to room_tables (cascade delete)
  - `section_label` — short label unique per table (enforced by constraint)
  - `section_sqft` — optional numeric square footage of the section
  - `is_active` — soft-delete flag
  - `created_at`, `created_by` — audit fields

  ## Constraints
  - `room_tables`: UNIQUE (grow_room_id, table_number); CHECK table_number > 0
  - `room_sections`: UNIQUE (room_table_id, section_label)

  ## Security
  - RLS enabled on both tables
  - Authenticated users may SELECT, INSERT, UPDATE (no hard-delete policy)
  - `created_by` always set to auth.uid() on insert (WITH CHECK)

  ## Indexes
  - `room_tables(grow_room_id)` for room-scoped queries
  - `room_sections(room_table_id)` for table-scoped queries
*/

-- ─── room_tables ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS room_tables (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  grow_room_id  uuid        NOT NULL REFERENCES grow_rooms(id) ON DELETE CASCADE,
  table_number  integer     NOT NULL,
  table_name    text,
  total_sqft    numeric(8,2),
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid        REFERENCES auth.users(id),

  CONSTRAINT room_tables_number_positive CHECK (table_number > 0),
  CONSTRAINT room_tables_unique_number_per_room UNIQUE (grow_room_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_room_tables_grow_room_id ON room_tables(grow_room_id);

ALTER TABLE room_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view room tables"
  ON room_tables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert room tables"
  ON room_tables FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update room tables"
  ON room_tables FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── room_sections ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS room_sections (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_table_id  uuid        NOT NULL REFERENCES room_tables(id) ON DELETE CASCADE,
  section_label  text        NOT NULL,
  section_sqft   numeric(8,2),
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid        REFERENCES auth.users(id),

  CONSTRAINT room_sections_unique_label_per_table UNIQUE (room_table_id, section_label)
);

CREATE INDEX IF NOT EXISTS idx_room_sections_room_table_id ON room_sections(room_table_id);

ALTER TABLE room_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view room sections"
  ON room_sections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert room sections"
  ON room_sections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update room sections"
  ON room_sections FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
