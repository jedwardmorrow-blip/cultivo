/*
  # Add ATO Number Column to Customers Table

  1. Changes
    - Add `ato_number` column to customers table for storing state ID/license numbers
    - Add `city` column for customer city
    - Add `state` column for customer state
    - Add `postal_code` column for customer postal code

  2. Security
    - No changes to RLS policies
*/

-- Add new columns to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'ato_number'
  ) THEN
    ALTER TABLE customers ADD COLUMN ato_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'city'
  ) THEN
    ALTER TABLE customers ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'state'
  ) THEN
    ALTER TABLE customers ADD COLUMN state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE customers ADD COLUMN postal_code text;
  END IF;
END $$;