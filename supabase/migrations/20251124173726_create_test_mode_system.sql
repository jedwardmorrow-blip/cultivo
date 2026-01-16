/*
  # Test Mode System - Database Schema

  1. Purpose
    - Enable facility testing and workflow validation
    - Provide bypass layer for inventory validations
    - Maintain audit trail of test mode actions
    - Support transition from testing to production

  2. New Tables
    - `test_mode_audit_log`
      - Logs all bypassed validations during test mode
      - Captures user, action, validation type, context
      - Enables review of test actions before production

  3. App Settings Integration
    - Uses existing `app_settings` table
    - Key: 'test_mode_enabled' (boolean)
    - Key: 'test_mode_audit_retention_days' (integer, default 30)

  4. Security
    - Only admin users can enable/disable test mode
    - All users can create audit log entries (when test mode active)
    - Audit log readable by admins and managers
    - RLS enforced for data security

  5. Notes
    - Test mode is OFF by default
    - Audit trail helps facilities validate system before production
    - Test mode bypasses inventory validations, NOT compliance rules
*/

-- Create test mode audit log table
CREATE TABLE IF NOT EXISTS test_mode_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  validation_bypassed text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_test_mode_audit_log_user_id
  ON test_mode_audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_test_mode_audit_log_created_at
  ON test_mode_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_mode_audit_log_validation
  ON test_mode_audit_log(validation_bypassed);

-- Add comments
COMMENT ON TABLE test_mode_audit_log IS
  'Audit trail of all validations bypassed during test mode operations';

COMMENT ON COLUMN test_mode_audit_log.user_id IS
  'User who performed the action (nullable if user deleted)';

COMMENT ON COLUMN test_mode_audit_log.action IS
  'Action performed (e.g., create_order, mark_ready, generate_invoice)';

COMMENT ON COLUMN test_mode_audit_log.validation_bypassed IS
  'Type of validation that was bypassed (e.g., on_hand_quantity_check, batch_allocation_required)';

COMMENT ON COLUMN test_mode_audit_log.context IS
  'Additional context about the bypassed validation (product, quantity, order details, etc.)';

-- Enable RLS
ALTER TABLE test_mode_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- All authenticated users can insert (when test mode active)
CREATE POLICY "Authenticated users can create audit entries"
  ON test_mode_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins and managers can view audit log
CREATE POLICY "Admins and managers can view audit log"
  ON test_mode_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

-- Only admins can delete audit entries (for cleanup)
CREATE POLICY "Only admins can delete audit entries"
  ON test_mode_audit_log
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Initialize test mode settings (if not exists)
INSERT INTO app_settings (category, setting_key, setting_value, setting_type, description)
VALUES
  ('testing', 'test_mode_enabled', 'false', 'boolean', 'Enable test mode for facility validation'),
  ('testing', 'test_mode_audit_retention_days', '30', 'number', 'Number of days to retain test mode audit logs')
ON CONFLICT (setting_key) DO NOTHING;

-- Helper function: Check if test mode is enabled
CREATE OR REPLACE FUNCTION is_test_mode_enabled()
RETURNS boolean AS $$
DECLARE
  enabled boolean;
BEGIN
  SELECT (setting_value)::boolean INTO enabled
  FROM app_settings
  WHERE category = 'testing'
  AND setting_key = 'test_mode_enabled';

  RETURN COALESCE(enabled, false);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_test_mode_enabled() IS
  'Returns true if test mode is currently enabled, false otherwise';

-- Helper function: Log test mode bypass
CREATE OR REPLACE FUNCTION log_test_mode_bypass(
  p_action text,
  p_validation_bypassed text,
  p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  -- Only log if test mode is enabled
  IF NOT is_test_mode_enabled() THEN
    RETURN NULL;
  END IF;

  INSERT INTO test_mode_audit_log (
    user_id,
    action,
    validation_bypassed,
    context
  ) VALUES (
    auth.uid(),
    p_action,
    p_validation_bypassed,
    p_context
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_test_mode_bypass IS
  'Convenience function to log a test mode bypass. Returns audit log ID.';

-- Helper function: Clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_test_mode_logs()
RETURNS integer AS $$
DECLARE
  v_retention_days integer;
  v_deleted_count integer;
BEGIN
  -- Get retention period from settings
  SELECT (setting_value)::integer INTO v_retention_days
  FROM app_settings
  WHERE category = 'testing'
  AND setting_key = 'test_mode_audit_retention_days';

  -- Default to 30 days if not set
  v_retention_days := COALESCE(v_retention_days, 30);

  -- Delete old logs
  DELETE FROM test_mode_audit_log
  WHERE created_at < (now() - (v_retention_days || ' days')::interval);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_test_mode_logs IS
  'Deletes test mode audit logs older than retention period. Returns count of deleted rows.';

-- Create view for test mode status (convenience)
CREATE OR REPLACE VIEW test_mode_status AS
SELECT
  (SELECT (setting_value)::boolean FROM app_settings
   WHERE category = 'testing' AND setting_key = 'test_mode_enabled') as enabled,
  (SELECT (setting_value)::integer FROM app_settings
   WHERE category = 'testing' AND setting_key = 'test_mode_audit_retention_days') as retention_days,
  (SELECT COUNT(*) FROM test_mode_audit_log) as total_audit_entries,
  (SELECT COUNT(*) FROM test_mode_audit_log
   WHERE created_at >= now() - interval '24 hours') as audit_entries_last_24h,
  (SELECT COUNT(DISTINCT validation_bypassed) FROM test_mode_audit_log) as unique_validations_bypassed;

COMMENT ON VIEW test_mode_status IS
  'Summary view of test mode configuration and usage statistics';

-- Grant access to test mode status view
GRANT SELECT ON test_mode_status TO authenticated;