/*
  # Invoice System Enhancement - Add Required Fields and Company Settings

  1. Customer Table Updates
    - Add `license_number` field to store dispensary license information
    - Add `delivery_address` field separate from general billing address
    - Add `delivery_city`, `delivery_state`, `delivery_postal_code` fields

  2. Company Settings
    - Populate app_settings table with company information:
      - Entity name: Syn-Ag Inc.
      - Company legal name: Cult Cannabis Cultivation
      - Company address: 3303 South 40th Street, Phoenix, AZ 85040
      - Originator license number: 00000078DCBK00628996
      - Logo path reference

  3. Security
    - Maintain existing RLS policies on customers table
    - Maintain existing RLS policies on app_settings table
*/

-- Add delivery address fields to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'license_number'
  ) THEN
    ALTER TABLE customers ADD COLUMN license_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'delivery_address'
  ) THEN
    ALTER TABLE customers ADD COLUMN delivery_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'delivery_city'
  ) THEN
    ALTER TABLE customers ADD COLUMN delivery_city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'delivery_state'
  ) THEN
    ALTER TABLE customers ADD COLUMN delivery_state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'delivery_postal_code'
  ) THEN
    ALTER TABLE customers ADD COLUMN delivery_postal_code text;
  END IF;
END $$;

-- Populate company settings in app_settings table
INSERT INTO app_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('company_entity_name', 'Syn-Ag Inc.', 'text', 'Legal entity name for the company', 'company')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

INSERT INTO app_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('company_name', 'Cult Cannabis Cultivation', 'text', 'Company business name', 'company')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

INSERT INTO app_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('company_address', '3303 South 40th Street', 'text', 'Company street address', 'company')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

INSERT INTO app_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('company_city', 'Phoenix', 'text', 'Company city', 'company')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

INSERT INTO app_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('company_state', 'AZ', 'text', 'Company state', 'company')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

INSERT INTO app_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('company_postal_code', '85040', 'text', 'Company postal code', 'company')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

INSERT INTO app_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('company_license_number', '00000078DCBK00628996', 'text', 'Originator license number', 'company')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

INSERT INTO app_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('company_logo_path', '/Cult Cannabis Co Final Black (5).png', 'text', 'Path to company logo for invoices', 'company')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;