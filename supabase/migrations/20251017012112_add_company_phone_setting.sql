-- Add company phone number to app_settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('company_phone', '', 'text', 'Company phone number for manifests and invoices', 'company')
ON CONFLICT (setting_key) DO NOTHING;