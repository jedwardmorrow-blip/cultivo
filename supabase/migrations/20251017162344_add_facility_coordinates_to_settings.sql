/*
  # Add Facility Coordinates to App Settings

  1. Changes
    - Add `facility_latitude` setting with value '33.417454' (Cult Cannabis facility)
    - Add `facility_longitude` setting with value '-111.994514' (Cult Cannabis facility)
    - Set category as 'routing' to group with other routing settings
    - These coordinates correspond to: 3303 S 40th St, Phoenix, AZ 85040

  2. Purpose
    - Store facility geolocation in database instead of hardcoding
    - Enable route generation and mapping with default facility origin
    - Allow administrators to update facility coordinates through Settings UI
    - Fix routing feature to work without requiring customer selection

  3. Notes
    - These coordinates are used as the default origin for all delivery routes
    - The RouteTestingTool and routing services will read these values
    - Fallback to these coordinates if custom facility address geocoding fails
*/

-- Add facility latitude and longitude to app_settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('facility_latitude', '33.417454', 'text', 'Cultivation facility latitude coordinate', 'routing'),
  ('facility_longitude', '-111.994514', 'text', 'Cultivation facility longitude coordinate (use negative for west)', 'routing')
ON CONFLICT (setting_key) DO UPDATE 
SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  category = EXCLUDED.category;