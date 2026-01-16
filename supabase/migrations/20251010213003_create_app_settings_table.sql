/*
  # Create Application Settings Table

  1. New Tables
    - `app_settings`
      - `id` (uuid, primary key) - Unique identifier for each setting
      - `setting_key` (text, unique, not null) - Unique key for the setting (e.g., 'trim_lead_time_days')
      - `setting_value` (text, not null) - Value of the setting stored as text (can be parsed as needed)
      - `setting_type` (text, not null) - Data type of the setting (number, text, boolean, json)
      - `description` (text) - Human-readable description of what the setting controls
      - `category` (text) - Category for grouping settings (e.g., 'operations', 'notifications')
      - `created_at` (timestamptz) - When the setting was created
      - `updated_at` (timestamptz) - When the setting was last updated

  2. Security
    - Enable RLS on `app_settings` table
    - Add policy for anonymous users to read settings (needed for client-side app)
    - Add policy for anonymous users to update settings (needed for configuration management)

  3. Initial Data
    - Insert default settings for trim lead time (2 days before delivery)
    - Insert default settings for packaging lead time (1 day before delivery)
    - Insert default overage percentage setting
*/

-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  setting_type text NOT NULL DEFAULT 'text',
  description text,
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read settings
CREATE POLICY "Anyone can read app settings"
  ON app_settings
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to update settings
CREATE POLICY "Anyone can update app settings"
  ON app_settings
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create index on setting_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(category);

-- Insert default settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('trim_lead_time_days', '2', 'number', 'Number of days before delivery that trim work must be completed', 'operations'),
  ('packaging_lead_time_days', '1', 'number', 'Number of days before delivery that packaging work must be completed', 'operations'),
  ('default_overage_percentage', '10', 'number', 'Default overage percentage for order calculations (e.g., 10 for 10%)', 'operations'),
  ('notification_threshold_days', '7', 'number', 'Days in advance to send notifications for upcoming deadlines', 'notifications')
ON CONFLICT (setting_key) DO NOTHING;