/*
  # Add Anonymous Insert Policy for Orders

  1. Changes
    - Add policy to allow anonymous users to insert orders (needed for order import script)

  2. Security
    - This allows the standalone order form and import scripts to work
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anonymous users can insert orders" ON orders;

-- Add policy for anonymous users to insert orders
CREATE POLICY "Anonymous users can insert orders"
  ON orders
  FOR INSERT
  TO anon
  WITH CHECK (true);