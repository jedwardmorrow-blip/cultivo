/*
  # Fix RLS policies for anonymous access

  1. Changes
    - Add policy to allow anonymous users to read order_items
    - Add policy to allow anonymous users to read products
    - Add policy to allow anonymous users to read orders
    - Add policy to allow anonymous users to read customers

  2. Security
    - These policies allow read-only access for the application to function
    - Write operations still require authentication
*/

-- Drop existing restrictive policy and create separate policies for read/write
DROP POLICY IF EXISTS "Authenticated users can manage order_items" ON order_items;

CREATE POLICY "Anyone can read order_items"
  ON order_items FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert order_items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update order_items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete order_items"
  ON order_items FOR DELETE
  TO authenticated
  USING (true);

-- Fix products policies
DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;

CREATE POLICY "Anyone can read products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (true);

-- Fix orders policies
DROP POLICY IF EXISTS "Authenticated users can manage orders" ON orders;

CREATE POLICY "Anyone can read orders"
  ON orders FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (true);

-- Fix customers policies
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON customers;

CREATE POLICY "Anyone can read customers"
  ON customers FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (true);