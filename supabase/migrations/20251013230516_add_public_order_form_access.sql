/*
  # Enable Public Order Form Access

  1. Security
    - Add anon (anonymous/public) policies for order creation
    - Allow public users to:
      - Read customers list (for order form dropdown)
      - Create new orders
      - Create order items
      - Read products (already public, but ensuring consistency)
    
  2. Important Notes
    - Only SELECT on customers for dropdown population
    - Only INSERT on orders and order_items for new order creation
    - Also allow UPDATE and SELECT for order management
    - This enables the standalone order form at `?order=new` to work without login
*/

DROP POLICY IF EXISTS "Anonymous users can read customers" ON customers;
CREATE POLICY "Anonymous users can read customers"
  ON customers
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Anonymous users can insert orders" ON orders;
CREATE POLICY "Anonymous users can insert orders"
  ON orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anonymous users can insert order_items" ON order_items;
CREATE POLICY "Anonymous users can insert order_items"
  ON order_items
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anonymous users can read orders" ON orders;
CREATE POLICY "Anonymous users can read orders"
  ON orders
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Anonymous users can read order_items" ON order_items;
CREATE POLICY "Anonymous users can read order_items"
  ON order_items
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Anonymous users can update orders" ON orders;
CREATE POLICY "Anonymous users can update orders"
  ON orders
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anonymous users can update order_items" ON order_items;
CREATE POLICY "Anonymous users can update order_items"
  ON order_items
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
