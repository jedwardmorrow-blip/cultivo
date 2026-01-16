/*
  # Add license_name to customers table

  1. Changes
    - Add license_name column to store the legal license name
    - This will be used alongside license_number for invoice generation
  
  2. Notes
    - License name may differ from the business name
    - Both license_name and license_number will appear on invoices
*/

-- Add license_name column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS license_name text;

-- Add comment for clarity
COMMENT ON COLUMN customers.license_name IS 'Legal name as it appears on the marijuana establishment license';
COMMENT ON COLUMN customers.license_number IS 'State-issued marijuana establishment license number';
