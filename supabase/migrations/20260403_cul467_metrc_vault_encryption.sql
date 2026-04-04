-- CUL-467: Supabase Vault encryption for metrc_credentials API keys
--
-- CEO approved Option B (Vault) on 2026-04-03.
--
-- Current state divergence (handled by IF NOT EXISTS / IF EXISTS guards):
--   Production (fonreynkfeqywshijqpi): no metrc_credentials table yet
--   Staging (cbxwippkzeszvxewhebd):   table exists with api_key_encrypted TEXT, no data
--   Both:                              supabase_vault 0.3.1 already installed
--
-- Changes applied:
--   1. Create metrc_credentials if absent (production only; no-op on staging)
--   2. Drop api_key_encrypted column if present (staging cleanup; no-op on production)
--   3. Add vault_secret_id UUID column
--   4. Ensure RLS enabled + admin-only policies
--   5. get_metrc_api_key(state_code) — service_role only, reads from vault
--   6. store_metrc_api_key(credential_id, state_code, api_key) — service_role only, writes to vault
--
-- Builder follow-up (CUL-468):
--   - Update metrc-sync edge function: replace api_key_encrypted read with get_metrc_api_key() RPC
--   - Update MetrcCredentialsSettings.tsx write path: call store_metrc_api_key() via service-role edge fn

-- ============================================================
-- 1. Create table (no-op on staging, creates fresh on production)
-- ============================================================
CREATE TABLE IF NOT EXISTS metrc_credentials (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code       TEXT        NOT NULL,
  api_base_url     TEXT        NOT NULL,
  facility_license TEXT        NOT NULL,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. Drop Option-A column (staging); no-op on production
-- ============================================================
ALTER TABLE metrc_credentials DROP COLUMN IF EXISTS api_key_encrypted;

-- ============================================================
-- 3. Add Vault reference column
-- ============================================================
ALTER TABLE metrc_credentials ADD COLUMN IF NOT EXISTS vault_secret_id UUID;

-- ============================================================
-- 4. RLS — admin-only on all operations
-- ============================================================
ALTER TABLE metrc_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS metrc_credentials_admin_select ON metrc_credentials;
CREATE POLICY metrc_credentials_admin_select
  ON metrc_credentials FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS metrc_credentials_admin_insert ON metrc_credentials;
CREATE POLICY metrc_credentials_admin_insert
  ON metrc_credentials FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS metrc_credentials_admin_update ON metrc_credentials;
CREATE POLICY metrc_credentials_admin_update
  ON metrc_credentials FOR UPDATE TO authenticated
  USING      ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS metrc_credentials_admin_delete ON metrc_credentials;
CREATE POLICY metrc_credentials_admin_delete
  ON metrc_credentials FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');

-- ============================================================
-- 5. get_metrc_api_key — service_role only
--    Reads decrypted API key from Vault for a given state_code.
--    Used by metrc-sync edge function (runs as service_role).
-- ============================================================
CREATE OR REPLACE FUNCTION get_metrc_api_key(p_state_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT ds.decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets ds
  JOIN public.metrc_credentials mc ON mc.vault_secret_id = ds.id
  WHERE mc.state_code = p_state_code
    AND mc.is_active = true
  LIMIT 1;
  RETURN v_secret;
END;
$$;

REVOKE ALL ON FUNCTION get_metrc_api_key(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_metrc_api_key(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION get_metrc_api_key(text) TO service_role;

-- ============================================================
-- 6. store_metrc_api_key — service_role only
--    Creates or rotates the Vault secret for a credential row.
--    Called by the metrc-save edge function (Builder CUL-468).
--    Args:
--      p_credential_id — uuid of the metrc_credentials row
--      p_state_code    — e.g. 'AZ', used as vault secret name suffix
--      p_api_key       — plaintext API key to encrypt in Vault
-- ============================================================
CREATE OR REPLACE FUNCTION store_metrc_api_key(
  p_credential_id uuid,
  p_state_code    text,
  p_api_key       text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_existing_vault_id uuid;
  v_new_vault_id      uuid;
BEGIN
  SELECT vault_secret_id INTO v_existing_vault_id
  FROM public.metrc_credentials
  WHERE id = p_credential_id;

  IF v_existing_vault_id IS NOT NULL THEN
    -- Rotate existing Vault secret in-place (keeps the same secret_id)
    PERFORM vault.update_secret(
      v_existing_vault_id,
      p_api_key,
      'metrc_api_key_' || p_state_code,
      'Metrc API key for state ' || p_state_code
    );
  ELSE
    -- Create new Vault secret and store the returned id on the credential row
    v_new_vault_id := vault.create_secret(
      p_api_key,
      'metrc_api_key_' || p_state_code,
      'Metrc API key for state ' || p_state_code
    );
    UPDATE public.metrc_credentials
    SET vault_secret_id = v_new_vault_id
    WHERE id = p_credential_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION store_metrc_api_key(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION store_metrc_api_key(uuid, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION store_metrc_api_key(uuid, text, text) TO service_role;
