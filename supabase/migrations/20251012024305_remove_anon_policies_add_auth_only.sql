/*
  # Remove Anonymous Access and Enforce Authentication

  1. Changes
    - Drop all anonymous (anon) and public access policies
    - Keep authenticated policies that already exist
    - Add missing authenticated policies for read operations
  
  2. Security Model
    - Only authenticated users can access any data
    - No anonymous or public access allowed
*/

-- Drop all anonymous and public policies
DROP POLICY IF EXISTS "Anonymous users can delete customers" ON customers;
DROP POLICY IF EXISTS "Anonymous users can update customers" ON customers;
DROP POLICY IF EXISTS "Anyone can read customers" ON customers;

DROP POLICY IF EXISTS "Anonymous users can delete order items" ON order_items;
DROP POLICY IF EXISTS "Anonymous users can insert order items" ON order_items;
DROP POLICY IF EXISTS "Anonymous users can update order items" ON order_items;
DROP POLICY IF EXISTS "Anyone can read order_items" ON order_items;

DROP POLICY IF EXISTS "Anonymous users can delete orders" ON orders;
DROP POLICY IF EXISTS "Anonymous users can insert orders" ON orders;
DROP POLICY IF EXISTS "Anonymous users can update orders" ON orders;
DROP POLICY IF EXISTS "Anyone can read orders" ON orders;

-- Add authenticated read policies
CREATE POLICY "Authenticated users can read customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read order_items"
  ON order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

-- Check and add policies for other tables
DO $$
BEGIN
  -- Products
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Authenticated users can read products'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read products" ON products FOR SELECT TO authenticated USING (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Authenticated users can insert products'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can insert products" ON products FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Authenticated users can update products'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can update products" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Authenticated users can delete products'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can delete products" ON products FOR DELETE TO authenticated USING (true)';
  END IF;

  -- Trim Sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'trim_sessions' AND policyname = 'Authenticated users can read trim_sessions'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read trim_sessions" ON trim_sessions FOR SELECT TO authenticated USING (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'trim_sessions' AND policyname = 'Authenticated users can insert trim_sessions'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can insert trim_sessions" ON trim_sessions FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'trim_sessions' AND policyname = 'Authenticated users can update trim_sessions'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can update trim_sessions" ON trim_sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'trim_sessions' AND policyname = 'Authenticated users can delete trim_sessions'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can delete trim_sessions" ON trim_sessions FOR DELETE TO authenticated USING (true)';
  END IF;

  -- Packaging Sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'packaging_sessions' AND policyname = 'Authenticated users can read packaging_sessions'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read packaging_sessions" ON packaging_sessions FOR SELECT TO authenticated USING (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'packaging_sessions' AND policyname = 'Authenticated users can insert packaging_sessions'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can insert packaging_sessions" ON packaging_sessions FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'packaging_sessions' AND policyname = 'Authenticated users can update packaging_sessions'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can update packaging_sessions" ON packaging_sessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'packaging_sessions' AND policyname = 'Authenticated users can delete packaging_sessions'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can delete packaging_sessions" ON packaging_sessions FOR DELETE TO authenticated USING (true)';
  END IF;

  -- Inventory Items
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'Authenticated users can read inventory_items'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read inventory_items" ON inventory_items FOR SELECT TO authenticated USING (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'Authenticated users can insert inventory_items'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can insert inventory_items" ON inventory_items FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'Authenticated users can update inventory_items'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can update inventory_items" ON inventory_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'Authenticated users can delete inventory_items'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can delete inventory_items" ON inventory_items FOR DELETE TO authenticated USING (true)';
  END IF;

  -- Inventory Snapshots
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_snapshots' AND policyname = 'Authenticated users can read inventory_snapshots'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read inventory_snapshots" ON inventory_snapshots FOR SELECT TO authenticated USING (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_snapshots' AND policyname = 'Authenticated users can insert inventory_snapshots'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can insert inventory_snapshots" ON inventory_snapshots FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_snapshots' AND policyname = 'Authenticated users can update inventory_snapshots'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can update inventory_snapshots" ON inventory_snapshots FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory_snapshots' AND policyname = 'Authenticated users can delete inventory_snapshots'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can delete inventory_snapshots" ON inventory_snapshots FOR DELETE TO authenticated USING (true)';
  END IF;

  -- App Settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Authenticated users can read app_settings'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read app_settings" ON app_settings FOR SELECT TO authenticated USING (true)';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Authenticated users can update app_settings'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can update app_settings" ON app_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;
