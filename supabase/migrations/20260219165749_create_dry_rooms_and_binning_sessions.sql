/*
  # D-2: Create dry_rooms and binning_sessions tables

  ## Summary
  Adds two new tables to support the drying phase of the cultivation pipeline:
  1. `dry_rooms` — physical drying spaces (simple container identifiers, no sub-structure)
  2. `binning_sessions` — dry weight records after drying, 1:1 with harvest_sessions

  ## New Tables

  ### dry_rooms
  - Simple identifier for a physical drying location
  - `room_code` is immutable after creation (enforced by trigger 12)
  - `capacity_lbs` is informational only — not enforced against binning weights
  - Archive via `is_active = false`; no hard delete

  ### binning_sessions
  - Records dry weight of harvested material after the drying process
  - One binning session per harvest session (UNIQUE constraint on harvest_session_id)
  - `batch_registry_id` is denormalized from the linked harvest session for query efficiency
  - A DB trigger validates the harvest session is completed and batch_registry_id matches
  - Binning is data-capture only — no batch or inventory rows are created on completion
  - Cancel instead of delete

  ## Security (RLS)
  - Both tables: authenticated SELECT/INSERT/UPDATE only
  - No DELETE policies on either table

  ## Triggers
  - Trigger 12: `trg_protect_dry_room_code` — blocks room_code changes on dry_rooms (mirrors grow_rooms pattern)
  - Trigger 13: `trg_validate_binning_session` — validates harvest session is completed and batch_registry_id matches on INSERT

  ## Constraints
  - `dry_rooms`: UNIQUE(room_code), CHECK(capacity_lbs > 0 OR NULL)
  - `binning_sessions`: UNIQUE(harvest_session_id), CHECK(dry_weight_grams > 0), completed_has_timestamp, cancelled_no_completion
  - Indexes: harvest_session_id, batch_registry_id on binning_sessions

  ## Important Notes
  1. No changes to existing tables — all new schema
  2. Binning sessions do NOT create inventory (invariant C-37, Decision 13)
  3. `batch_registry_id` on binning_sessions references `batch_registry(id)` (existing table)
  4. `harvest_session_id` FK references `harvest_sessions(id)` (existing cultivation table)
*/

-- ============================================================
-- TABLE: dry_rooms
-- ============================================================

CREATE TABLE IF NOT EXISTS dry_rooms (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  room_code     text        NOT NULL,
  capacity_lbs  numeric(8,2),
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid        REFERENCES auth.users(id),

  CONSTRAINT dry_rooms_room_code_unique UNIQUE (room_code),
  CONSTRAINT dry_rooms_capacity_positive CHECK (
    capacity_lbs IS NULL OR capacity_lbs > 0
  )
);

ALTER TABLE dry_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dry rooms"
  ON dry_rooms FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert dry rooms"
  ON dry_rooms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update dry rooms"
  ON dry_rooms FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- TABLE: binning_sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS binning_sessions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  harvest_session_id  uuid        NOT NULL REFERENCES harvest_sessions(id),
  dry_room_id         uuid        NOT NULL REFERENCES dry_rooms(id),
  batch_registry_id   uuid        NOT NULL REFERENCES batch_registry(id),
  dry_weight_grams    numeric(10,2) NOT NULL CHECK (dry_weight_grams > 0),
  bin_date            date        NOT NULL,
  session_status      text        NOT NULL DEFAULT 'active'
                        CHECK (session_status IN ('active', 'completed', 'cancelled')),
  completed_at        timestamptz,
  completed_by        uuid        REFERENCES auth.users(id),
  cancelled_at        timestamptz,
  cancelled_by        uuid        REFERENCES auth.users(id),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid        REFERENCES auth.users(id),

  CONSTRAINT binning_sessions_one_per_harvest UNIQUE (harvest_session_id),
  CONSTRAINT binning_sessions_completed_has_timestamp CHECK (
    session_status != 'completed' OR completed_at IS NOT NULL
  ),
  CONSTRAINT binning_sessions_cancelled_no_completion CHECK (
    NOT (session_status = 'cancelled' AND completed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_binning_sessions_harvest_session_id
  ON binning_sessions(harvest_session_id);
CREATE INDEX IF NOT EXISTS idx_binning_sessions_batch_registry_id
  ON binning_sessions(batch_registry_id);

ALTER TABLE binning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view binning sessions"
  ON binning_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert binning sessions"
  ON binning_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update binning sessions"
  ON binning_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- TRIGGER 12: Block dry_room_code changes after creation
-- Mirrors trigger 8 (trg_protect_room_code) on grow_rooms
-- ============================================================

CREATE OR REPLACE FUNCTION fn_protect_dry_room_code()
RETURNS trigger AS $$
BEGIN
  IF OLD.room_code IS DISTINCT FROM NEW.room_code THEN
    RAISE EXCEPTION 'dry room room_code is immutable after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_dry_room_code
BEFORE UPDATE ON dry_rooms
FOR EACH ROW
WHEN (OLD.room_code IS DISTINCT FROM NEW.room_code)
EXECUTE FUNCTION fn_protect_dry_room_code();

-- ============================================================
-- TRIGGER 13: Validate binning session on insert
-- Validates: harvest session is completed + batch_registry_id matches
-- ============================================================

CREATE OR REPLACE FUNCTION fn_validate_binning_session()
RETURNS trigger AS $$
DECLARE
  v_harvest_status       text;
  v_harvest_batch_id     uuid;
BEGIN
  SELECT session_status, batch_registry_id
  INTO v_harvest_status, v_harvest_batch_id
  FROM harvest_sessions
  WHERE id = NEW.harvest_session_id;

  IF v_harvest_status IS NULL THEN
    RAISE EXCEPTION 'Binning session error: harvest session not found';
  END IF;

  IF v_harvest_status != 'completed' THEN
    RAISE EXCEPTION
      'Cannot create binning session: harvest session is not completed (status: %)',
      v_harvest_status;
  END IF;

  IF v_harvest_batch_id IS NULL THEN
    RAISE EXCEPTION
      'Cannot create binning session: harvest session has no linked batch';
  END IF;

  IF NEW.batch_registry_id IS DISTINCT FROM v_harvest_batch_id THEN
    RAISE EXCEPTION
      'Binning session error: batch_registry_id does not match the harvest session''s batch';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_binning_session
BEFORE INSERT ON binning_sessions
FOR EACH ROW
EXECUTE FUNCTION fn_validate_binning_session();
