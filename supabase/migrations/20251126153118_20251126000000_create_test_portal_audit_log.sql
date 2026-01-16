/*
  # Create Test Portal Audit Log

  1. New Tables
    - `test_mode_audit_log` - Tracks all bypassed validations in test portal

  2. Table Updates
    - Add `test_mode` boolean flag to key tables

  3. Settings
    - Add test mode configuration to app_settings

  4. Security
    - Enable RLS on `test_mode_audit_log`
*/

-- Create test_mode_audit_log table
CREATE TABLE IF NOT EXISTS test_mode_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  validation_bypassed text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_mode_audit_log_user_id ON test_mode_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_test_mode_audit_log_created_at ON test_mode_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_mode_audit_log_validation ON test_mode_audit_log(validation_bypassed);

-- Enable RLS
ALTER TABLE test_mode_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit log
CREATE POLICY "Authenticated users can insert audit logs"
  ON test_mode_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read audit logs"
  ON test_mode_audit_log
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete audit logs"
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

-- Add test_mode column to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'test_mode'
  ) THEN
    ALTER TABLE orders ADD COLUMN test_mode boolean DEFAULT false NOT NULL;
    CREATE INDEX idx_orders_test_mode ON orders(test_mode);
  END IF;
END $$;

-- Add test_mode column to order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'test_mode'
  ) THEN
    ALTER TABLE order_items ADD COLUMN test_mode boolean DEFAULT false NOT NULL;
    CREATE INDEX idx_order_items_test_mode ON order_items(test_mode);
  END IF;
END $$;

-- Add test_mode column to inventory_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'test_mode'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN test_mode boolean DEFAULT false NOT NULL;
    CREATE INDEX idx_inventory_items_test_mode ON inventory_items(test_mode);
  END IF;
END $$;

-- Add test_mode column to trim_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trim_sessions' AND column_name = 'test_mode'
  ) THEN
    ALTER TABLE trim_sessions ADD COLUMN test_mode boolean DEFAULT false NOT NULL;
    CREATE INDEX idx_trim_sessions_test_mode ON trim_sessions(test_mode);
  END IF;
END $$;

-- Add test_mode column to packaging_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packaging_sessions' AND column_name = 'test_mode'
  ) THEN
    ALTER TABLE packaging_sessions ADD COLUMN test_mode boolean DEFAULT false NOT NULL;
    CREATE INDEX idx_packaging_sessions_test_mode ON packaging_sessions(test_mode);
  END IF;
END $$;

-- Add test mode settings to app_settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, category, description)
VALUES
  ('test_mode_enabled', 'false', 'boolean', 'testing', 'Enable test portal mode - bypasses inventory validations for testing')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO app_settings (setting_key, setting_value, setting_type, category, description)
VALUES
  ('test_mode_audit_retention_days', '30', 'integer', 'testing', 'Number of days to retain test mode audit logs')
ON CONFLICT (setting_key) DO NOTHING;

-- Create view for test mode status
CREATE OR REPLACE VIEW test_mode_status AS
SELECT
  COALESCE((SELECT setting_value = 'true' FROM app_settings WHERE setting_key = 'test_mode_enabled'), false) as enabled,
  COALESCE((SELECT setting_value::int FROM app_settings WHERE setting_key = 'test_mode_audit_retention_days'), 30) as retention_days,
  (SELECT COUNT(*) FROM test_mode_audit_log) as total_audit_entries,
  (SELECT COUNT(*) FROM test_mode_audit_log WHERE created_at >= NOW() - INTERVAL '24 hours') as audit_entries_last_24h,
  (SELECT COUNT(DISTINCT validation_bypassed) FROM test_mode_audit_log) as unique_validations_bypassed;

-- Grant access to views
GRANT SELECT ON test_mode_status TO authenticated;
