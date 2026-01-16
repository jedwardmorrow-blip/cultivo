/*
  # Add Anonymous Update Policy for Customers

  1. Changes
    - Add policy to allow anonymous users to update customers (needed for customer data import)

  2. Security
    - This allows the import script to update customer information
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anonymous users can update customers" ON customers;

-- Add policy for anonymous users to update customers
CREATE POLICY "Anonymous users can update customers"
  ON customers
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
