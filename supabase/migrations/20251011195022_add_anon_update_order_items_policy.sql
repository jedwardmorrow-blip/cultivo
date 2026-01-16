/*
  # Add anonymous user update policy for order items

  1. Changes
    - Add RLS policy to allow anonymous users to update order_items
  
  2. Security
    - Policy allows anon role to UPDATE order_items
    - Consistent with existing anon policies for INSERT and DELETE on order_items
*/

-- Drop policy if it exists (for idempotency)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anonymous users can update order items" ON order_items;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add policy for anonymous users to update order items
CREATE POLICY "Anonymous users can update order items"
  ON order_items
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
