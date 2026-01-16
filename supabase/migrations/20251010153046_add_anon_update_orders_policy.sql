/*
  # Add anonymous update policy for orders

  1. Changes
    - Add UPDATE policy for orders table to allow anonymous users
    - This allows the drag-and-drop feature to update delivery dates
  
  2. Security
    - Anonymous users can update orders (internal tool, no authentication required)
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anonymous users can update orders" ON orders;

-- Add UPDATE policy for orders (anonymous users)
CREATE POLICY "Anonymous users can update orders"
  ON orders FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
