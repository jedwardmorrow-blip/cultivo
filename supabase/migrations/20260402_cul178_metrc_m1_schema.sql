-- CUL-178 / CUL-184: Metrc M1 — schema foundation
-- Adds metrc tag columns, sync status enum, metrc_sync_log, and metrc_credentials tables.

-- ============================================================
-- 1. metrc_sync_status enum
-- ============================================================
DO $$ BEGIN
  CREATE TYPE metrc_sync_status AS ENUM (
    'pending',
    'synced',
    'error',
    'not_applicable'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. metrc_tag columns on existing tables
-- ============================================================
ALTER TABLE individual_plants  ADD COLUMN IF NOT EXISTS metrc_tag         TEXT;
ALTER TABLE plant_groups       ADD COLUMN IF NOT EXISTS metrc_batch_tag   TEXT;
ALTER TABLE harvest_sessions   ADD COLUMN IF NOT EXISTS metrc_harvest_id  TEXT;
ALTER TABLE inventory_items    ADD COLUMN IF NOT EXISTS metrc_package_tag TEXT;
ALTER TABLE orders             ADD COLUMN IF NOT EXISTS metrc_transfer_id TEXT;

-- ============================================================
-- 3. metrc_sync_status column on existing tables
-- ============================================================
ALTER TABLE individual_plants  ADD COLUMN IF NOT EXISTS metrc_sync_status metrc_sync_status DEFAULT 'not_applicable';
ALTER TABLE plant_groups       ADD COLUMN IF NOT EXISTS metrc_sync_status metrc_sync_status DEFAULT 'not_applicable';
ALTER TABLE harvest_sessions   ADD COLUMN IF NOT EXISTS metrc_sync_status metrc_sync_status DEFAULT 'not_applicable';
ALTER TABLE inventory_items    ADD COLUMN IF NOT EXISTS metrc_sync_status metrc_sync_status DEFAULT 'not_applicable';
ALTER TABLE orders             ADD COLUMN IF NOT EXISTS metrc_sync_status metrc_sync_status DEFAULT 'not_applicable';

-- ============================================================
-- 4. metrc_sync_log table
-- ============================================================
CREATE TABLE IF NOT EXISTS metrc_sync_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT        NOT NULL,
  entity_id   UUID        NOT NULL,
  direction   TEXT        NOT NULL CHECK (direction IN ('push', 'pull')),
  payload     JSONB,
  response    JSONB,
  status      metrc_sync_status NOT NULL DEFAULT 'pending',
  error_msg   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS metrc_sync_log_entity_idx  ON metrc_sync_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS metrc_sync_log_status_idx  ON metrc_sync_log (status, created_at);

-- ============================================================
-- 5. metrc_credentials table + RLS
-- ============================================================
CREATE TABLE IF NOT EXISTS metrc_credentials (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code          TEXT    NOT NULL,
  api_base_url        TEXT    NOT NULL,
  api_key_encrypted   TEXT    NOT NULL,  -- pgp_sym_encrypt(api_key, current_setting('app.metrc_key')) — pending CEO approval
  facility_license    TEXT    NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS — admin role only
ALTER TABLE metrc_credentials ENABLE ROW LEVEL SECURITY;

-- Admin read
DROP POLICY IF EXISTS metrc_credentials_admin_select ON metrc_credentials;
CREATE POLICY metrc_credentials_admin_select
  ON metrc_credentials
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Admin insert
DROP POLICY IF EXISTS metrc_credentials_admin_insert ON metrc_credentials;
CREATE POLICY metrc_credentials_admin_insert
  ON metrc_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Admin update
DROP POLICY IF EXISTS metrc_credentials_admin_update ON metrc_credentials;
CREATE POLICY metrc_credentials_admin_update
  ON metrc_credentials
  FOR UPDATE
  TO authenticated
  USING      (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Admin delete
DROP POLICY IF EXISTS metrc_credentials_admin_delete ON metrc_credentials;
CREATE POLICY metrc_credentials_admin_delete
  ON metrc_credentials
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');
