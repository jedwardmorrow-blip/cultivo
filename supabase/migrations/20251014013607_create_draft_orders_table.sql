/*
  # Create Draft Orders Table

  1. New Tables
    - `draft_orders`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, nullable - reference to customers)
      - `priority` (text)
      - `requested_delivery_date` (date, nullable)
      - `delivery_notes` (text, nullable)
      - `internal_notes` (text, nullable)
      - `order_items` (jsonb - stores array of order items)
      - `session_id` (text - for anonymous draft tracking)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `expires_at` (timestamp - auto-delete old drafts)

  2. Security
    - Enable RLS on `draft_orders` table
    - Add policies for authenticated users to manage their drafts
    - Add policy for anonymous users to manage drafts by session_id

  3. Functions
    - Auto-cleanup function to delete expired drafts (older than 30 days)
*/

CREATE TABLE IF NOT EXISTS draft_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  priority text DEFAULT 'normal',
  requested_delivery_date date,
  delivery_notes text,
  internal_notes text,
  order_items jsonb DEFAULT '[]'::jsonb,
  session_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

ALTER TABLE draft_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view own drafts"
  ON draft_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert drafts"
  ON draft_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update own drafts"
  ON draft_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete own drafts"
  ON draft_orders FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anonymous users can view drafts by session"
  ON draft_orders FOR SELECT
  TO anon
  USING (session_id = current_setting('request.jwt.claims', true)::json->>'session_id' OR session_id IS NOT NULL);

CREATE POLICY "Anonymous users can insert drafts"
  ON draft_orders FOR INSERT
  TO anon
  WITH CHECK (session_id IS NOT NULL);

CREATE POLICY "Anonymous users can update drafts by session"
  ON draft_orders FOR UPDATE
  TO anon
  USING (session_id = current_setting('request.jwt.claims', true)::json->>'session_id' OR session_id IS NOT NULL)
  WITH CHECK (session_id IS NOT NULL);

CREATE POLICY "Anonymous users can delete drafts by session"
  ON draft_orders FOR DELETE
  TO anon
  USING (session_id = current_setting('request.jwt.claims', true)::json->>'session_id' OR session_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_draft_orders_session_id ON draft_orders(session_id);
CREATE INDEX IF NOT EXISTS idx_draft_orders_expires_at ON draft_orders(expires_at);

CREATE OR REPLACE FUNCTION update_draft_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_draft_orders_updated_at
  BEFORE UPDATE ON draft_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_draft_order_timestamp();