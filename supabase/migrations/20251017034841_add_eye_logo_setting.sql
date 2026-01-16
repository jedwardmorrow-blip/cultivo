/*
  # Add Eye Logo Setting to Branding

  1. New Settings
    - Add `logo_eye_url` setting for the eye graphic/icon
    - Used for special branding elements and design accents

  2. Purpose
    - Allows upload and management of the eye graphic
    - Provides flexibility for brand identity elements
    - Enables dynamic loading of decorative graphics
*/

-- Add eye logo setting to app_settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('logo_eye_url', '', 'text', 'URL to eye graphic/icon for branding', 'branding')
ON CONFLICT (setting_key) DO NOTHING;
