/*
  # Add DELETE policies for anonymous users

  1. Changes
    - Add DELETE policy for orders table to allow anonymous users
    - Add DELETE policy for order_items table to allow anonymous users (cascade)
    - Add DELETE policy for customers table to allow anonymous users

  2. Security
    - Since this is an internal tool, anonymous users need full delete access
*/

-- Add DELETE policy for orders (anonymous users)
DROP POLICY IF EXISTS "Anonymous users can delete orders" ON orders;
CREATE POLICY "Anonymous users can delete orders"
  ON orders FOR DELETE
  TO anon
  USING (true);

-- Add DELETE policy for order_items (anonymous users)
DROP POLICY IF EXISTS "Anonymous users can delete order items" ON order_items;
CREATE POLICY "Anonymous users can delete order items"
  ON order_items FOR DELETE
  TO anon
  USING (true);

-- Add DELETE policy for customers (anonymous users)
DROP POLICY IF EXISTS "Anonymous users can delete customers" ON customers;
CREATE POLICY "Anonymous users can delete customers"
  ON customers FOR DELETE
  TO anon
  USING (true);
