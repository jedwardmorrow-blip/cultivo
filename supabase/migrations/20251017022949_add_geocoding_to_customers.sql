/*
  # Add Geocoding Fields to Customers

  1. Changes
    - Add latitude and longitude columns to customers table
    - Add geocoded_at timestamp to track when geocoding was last performed
    - Add geocoding_error field to track any geocoding failures
    - Create index on lat/long for spatial queries

  2. Notes
    - These fields will be populated by the geocoding service
    - The geocoded_at field helps determine if re-geocoding is needed
    - The geocoding_error field helps debug address issues
*/

-- Add geocoding fields to customers table
ALTER TABLE customers 
  ADD COLUMN IF NOT EXISTS latitude numeric(10, 7),
  ADD COLUMN IF NOT EXISTS longitude numeric(10, 7),
  ADD COLUMN IF NOT EXISTS geocoded_at timestamptz,
  ADD COLUMN IF NOT EXISTS geocoding_error text;

-- Create index for spatial queries
CREATE INDEX IF NOT EXISTS idx_customers_location ON customers(latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;