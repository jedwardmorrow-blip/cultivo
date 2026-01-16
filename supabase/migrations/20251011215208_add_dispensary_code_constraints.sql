/*
  # Add Constraints to Dispensary Code Column

  1. Changes
    - Add NOT NULL constraint to dispensary_code
    - Add CHECK constraint to ensure codes are exactly 3 uppercase alphanumeric characters
    - Add UNIQUE constraint to prevent duplicate codes

  2. Security
    - No changes to RLS policies

  3. Notes
    - Pattern allows alphanumeric characters (e.g., S7A for Story - 7th Ave)
*/

-- Make dispensary_code required
ALTER TABLE customers 
  ALTER COLUMN dispensary_code SET NOT NULL;

-- Add check constraint for format (3 uppercase alphanumeric characters)
ALTER TABLE customers 
  ADD CONSTRAINT dispensary_code_format 
  CHECK (dispensary_code ~ '^[A-Z0-9]{3}$');

-- Add unique constraint
ALTER TABLE customers 
  ADD CONSTRAINT dispensary_code_unique 
  UNIQUE (dispensary_code);
