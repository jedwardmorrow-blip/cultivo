/*
  # Fix Address Field Consolidation for Geocoding

  1. Problem
    - The UI saves customer addresses to: address, city, state, postal_code
    - The geocoding service reads from: delivery_address, delivery_city, delivery_state, delivery_postal_code
    - This mismatch causes geocoding to fail because delivery fields are empty
    
  2. Solution
    - Copy existing address data from main fields to delivery fields for all customers
    - This ensures geocoding service has data to work with
    - Both invoicing and geocoding use delivery fields with fallback to main fields
    
  3. Changes
    - Populate delivery_address from address where delivery_address is null
    - Populate delivery_city from city where delivery_city is null
    - Populate delivery_state from state where delivery_state is null
    - Populate delivery_postal_code from postal_code where delivery_postal_code is null
    
  4. Notes
    - This is a one-time data migration to fix existing records
    - Future updates will populate both sets of fields
    - No data is lost - main address fields remain unchanged
*/

-- Copy address data from main fields to delivery fields where delivery fields are empty
UPDATE customers 
SET 
  delivery_address = address,
  delivery_city = city,
  delivery_state = state,
  delivery_postal_code = postal_code
WHERE 
  delivery_address IS NULL 
  AND address IS NOT NULL;
