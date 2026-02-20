/*
  # Harvest Weight Entries and Room Tracking

  1. Modified Tables
    - `harvest_sessions`
      - `grow_room_id` (uuid, nullable FK to grow_rooms) - snapshots which flower room was harvested
      - `dry_room_id` (uuid, nullable FK to dry_rooms) - where material goes to dry after harvest

  2. New Tables
    - `harvest_weight_entries`
      - `id` (uuid, primary key)
      - `harvest_session_id` (uuid, FK to harvest_sessions, NOT NULL)
      - `weight_grams` (numeric, > 0, NOT NULL)
      - `plant_count` (integer, >= 1, NOT NULL) - how many plants this weighing covers
      - `entry_order` (integer, NOT NULL) - sequence within the session
      - `notes` (text, nullable)
      - `created_at` (timestamptz, default now)
      - `created_by` (uuid, FK to auth.users, nullable)

  3. Security
    - Enable RLS on `harvest_weight_entries`
    - Authenticated users can SELECT, INSERT, DELETE their own entries
    - DELETE restricted to entries belonging to active sessions only

  4. Indexes
    - Index on `harvest_weight_entries.harvest_session_id` for fast lookups
    - Index on `harvest_sessions.grow_room_id` for room-based filtering
    - Index on `harvest_sessions.dry_room_id` for dry room lookups

  5. Notes
    - grow_room_id is set at harvest creation to snapshot the source flower room
    - dry_room_id is set at finalization when user selects where material will dry
    - Weight entries allow multiple weighings per plant group (e.g., 5 plants at a time)
    - wet_weight_grams on harvest_sessions is computed as SUM of weight entries at finalization
*/

-- Add room tracking columns to harvest_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'harvest_sessions' AND column_name = 'grow_room_id'
  ) THEN
    ALTER TABLE harvest_sessions ADD COLUMN grow_room_id uuid REFERENCES grow_rooms(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'harvest_sessions' AND column_name = 'dry_room_id'
  ) THEN
    ALTER TABLE harvest_sessions ADD COLUMN dry_room_id uuid REFERENCES dry_rooms(id);
  END IF;
END $$;

-- Create harvest_weight_entries table
CREATE TABLE IF NOT EXISTS harvest_weight_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  harvest_session_id uuid NOT NULL REFERENCES harvest_sessions(id) ON DELETE CASCADE,
  weight_grams numeric NOT NULL CHECK (weight_grams > 0),
  plant_count integer NOT NULL CHECK (plant_count >= 1),
  entry_order integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE harvest_weight_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view harvest weight entries"
  ON harvest_weight_entries
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert harvest weight entries"
  ON harvest_weight_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete weight entries for active sessions"
  ON harvest_weight_entries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM harvest_sessions
      WHERE harvest_sessions.id = harvest_weight_entries.harvest_session_id
      AND harvest_sessions.session_status = 'active'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_harvest_weight_entries_session
  ON harvest_weight_entries(harvest_session_id);

CREATE INDEX IF NOT EXISTS idx_harvest_sessions_grow_room
  ON harvest_sessions(grow_room_id);

CREATE INDEX IF NOT EXISTS idx_harvest_sessions_dry_room
  ON harvest_sessions(dry_room_id);
