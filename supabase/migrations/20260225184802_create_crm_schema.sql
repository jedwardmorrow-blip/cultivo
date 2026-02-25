/*
  # Create CRM Schema - Core Tables and Customer Enhancements

  1. Customer Table Enhancements
    - `parent_customer_id` (uuid, self-referential FK) - sub-account hierarchy for hub deliveries
    - `account_type` (text) - 'direct' | 'hub_parent' | 'hub_child'
    - `account_status` (text) - 'active' | 'inactive' | 'prospect' | 'churned'
    - `default_payment_terms` (text) - e.g., 'Net 30'
    - `preferred_delivery_day` (text) - e.g., 'Tuesday'
    - `credit_limit` (numeric) - optional credit cap
    - `last_order_date` (timestamptz) - denormalized for fast dashboard
    - `lifetime_revenue` (numeric) - denormalized total revenue
    - `tags` (text[]) - flexible grouping tags

  2. New Tables
    - `customer_contacts` - multiple contacts per dispensary
    - `customer_price_lists` - per-customer pricing overrides
    - `customer_activity_log` - CRM interaction tracking
    - `sales_rep_assignments` - sales rep to account linkage

  3. Security
    - RLS enabled on all new tables
    - Policies for authenticated users (matching existing customer table pattern)

  4. Important Notes
    - All new columns on customers are nullable or have defaults
    - parent_customer_id uses ON DELETE SET NULL to prevent cascade issues
    - Sol Flower and Earth's Healing flagged as hub_parent accounts
    - Denormalized fields backfilled from existing order data
*/

-- ============================================================
-- 1. Add CRM columns to customers table
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'parent_customer_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN parent_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE customers ADD COLUMN account_type text NOT NULL DEFAULT 'direct';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE customers ADD COLUMN account_status text NOT NULL DEFAULT 'active';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'default_payment_terms'
  ) THEN
    ALTER TABLE customers ADD COLUMN default_payment_terms text DEFAULT 'Net 30';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'preferred_delivery_day'
  ) THEN
    ALTER TABLE customers ADD COLUMN preferred_delivery_day text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'credit_limit'
  ) THEN
    ALTER TABLE customers ADD COLUMN credit_limit numeric;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'last_order_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN last_order_date timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'lifetime_revenue'
  ) THEN
    ALTER TABLE customers ADD COLUMN lifetime_revenue numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'tags'
  ) THEN
    ALTER TABLE customers ADD COLUMN tags text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- Index for sub-account lookups
CREATE INDEX IF NOT EXISTS idx_customers_parent_customer_id ON customers(parent_customer_id) WHERE parent_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_account_type ON customers(account_type);
CREATE INDEX IF NOT EXISTS idx_customers_account_status ON customers(account_status);

-- ============================================================
-- 2. Create customer_contacts table
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  email text,
  phone text,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);

ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customer contacts"
  ON customer_contacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customer contacts"
  ON customer_contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customer contacts"
  ON customer_contacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customer contacts"
  ON customer_contacts FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 3. Create customer_price_lists table
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  custom_price numeric NOT NULL,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  expires_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id, product_id, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_customer_price_lists_customer_id ON customer_price_lists(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_price_lists_product_id ON customer_price_lists(product_id);

ALTER TABLE customer_price_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customer price lists"
  ON customer_price_lists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customer price lists"
  ON customer_price_lists FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customer price lists"
  ON customer_price_lists FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customer price lists"
  ON customer_price_lists FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 4. Create customer_activity_log table
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type text NOT NULL DEFAULT 'note',
  subject text NOT NULL,
  body text,
  follow_up_date date,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_activity_log_customer_id ON customer_activity_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_activity_log_user_id ON customer_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_activity_log_follow_up ON customer_activity_log(follow_up_date) WHERE follow_up_date IS NOT NULL AND completed = false;

ALTER TABLE customer_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customer activity log"
  ON customer_activity_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customer activity log"
  ON customer_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customer activity log"
  ON customer_activity_log FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customer activity log"
  ON customer_activity_log FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 5. Create sales_rep_assignments table
-- ============================================================

CREATE TABLE IF NOT EXISTS sales_rep_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'primary',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sales_rep_assignments_customer_id ON sales_rep_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_assignments_user_id ON sales_rep_assignments(user_id);

ALTER TABLE sales_rep_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sales rep assignments"
  ON sales_rep_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sales rep assignments"
  ON sales_rep_assignments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales rep assignments"
  ON sales_rep_assignments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sales rep assignments"
  ON sales_rep_assignments FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 6. Backfill denormalized CRM fields from existing data
-- ============================================================

UPDATE customers c SET
  last_order_date = sub.last_order,
  lifetime_revenue = COALESCE(sub.total_rev, 0)
FROM (
  SELECT
    o.customer_id,
    MAX(o.order_date) as last_order,
    SUM(o.total_amount) as total_rev
  FROM orders o
  WHERE o.test_mode = false AND o.archived = false
  GROUP BY o.customer_id
) sub
WHERE c.id = sub.customer_id;

-- ============================================================
-- 7. Flag Sol Flower and Earth's Healing as hub parents
-- ============================================================

UPDATE customers SET account_type = 'hub_parent'
WHERE dispensary_code IN ('SOL', 'WEE');

-- Flag prospect accounts (those with zero orders)
UPDATE customers SET account_status = 'prospect'
WHERE id NOT IN (
  SELECT DISTINCT customer_id FROM orders WHERE customer_id IS NOT NULL AND test_mode = false
);
