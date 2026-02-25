/*
  # CRM Phase 2: Sales Activity Management System

  1. New Tables
    - `crm_tasks`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, FK -> customers)
      - `assigned_user_id` (uuid, FK -> user_profiles, nullable)
      - `task_type` (text: callback, visit_reminder, sample_drop, reorder_prompt, general)
      - `title` (text, NOT NULL)
      - `description` (text, nullable)
      - `due_date` (date, NOT NULL)
      - `priority` (text: low, medium, high, urgent)
      - `status` (text: open, in_progress, completed, cancelled)
      - `completed_at` (timestamptz, nullable)
      - `related_activity_id` (uuid, FK -> customer_activity_log, nullable)
      - `created_at`, `updated_at` (timestamptz)
    - `crm_visit_schedule`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, FK -> customers)
      - `user_id` (uuid, FK -> user_profiles, nullable)
      - `visit_date` (date, NOT NULL)
      - `visit_time_window` (text, nullable)
      - `visit_type` (text: check_in, sample_drop, new_pitch, relationship)
      - `location_notes` (text, nullable)
      - `status` (text: scheduled, completed, cancelled, rescheduled)
      - `outcome_notes` (text, nullable)
      - `linked_activity_id` (uuid, FK -> customer_activity_log, nullable)
      - `created_at`, `updated_at` (timestamptz)

  2. Modified Tables
    - `customer_activity_log`
      - Added `linked_task_id` (uuid, FK -> crm_tasks, nullable)
      - Added `visit_id` (uuid, FK -> crm_visit_schedule, nullable)

  3. New Views
    - `crm_account_scores` — health score per customer (recency/frequency/trend/engagement)
    - `crm_product_mix_by_customer` — per-customer product breakdown from order history

  4. Security
    - RLS enabled on `crm_tasks` and `crm_visit_schedule`
    - Authenticated users can SELECT, INSERT, UPDATE, DELETE own-org data
    - Policies check auth.uid() for all operations

  5. Important Notes
    - Health scores are computed on-read via VIEW (Architecture Decision 15)
    - Auto-logging of task/visit completions is handled at the service layer (Architecture Decision 14)
    - All new columns on customer_activity_log are nullable with no default — no risk to existing data
*/

-- =============================================================================
-- 1. Create crm_tasks table
-- =============================================================================
CREATE TABLE IF NOT EXISTS crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  task_type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  completed_at timestamptz,
  related_activity_id uuid REFERENCES customer_activity_log(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT crm_tasks_task_type_check CHECK (task_type IN ('callback', 'visit_reminder', 'sample_drop', 'reorder_prompt', 'general')),
  CONSTRAINT crm_tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT crm_tasks_status_check CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled'))
);

ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tasks"
  ON crm_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create tasks"
  ON crm_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tasks"
  ON crm_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tasks"
  ON crm_tasks FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_customer_id ON crm_tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned_user_id ON crm_tasks(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status_due_date ON crm_tasks(status, due_date);

-- =============================================================================
-- 2. Create crm_visit_schedule table
-- =============================================================================
CREATE TABLE IF NOT EXISTS crm_visit_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  visit_date date NOT NULL,
  visit_time_window text,
  visit_type text NOT NULL DEFAULT 'check_in',
  location_notes text,
  status text NOT NULL DEFAULT 'scheduled',
  outcome_notes text,
  linked_activity_id uuid REFERENCES customer_activity_log(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT crm_visit_type_check CHECK (visit_type IN ('check_in', 'sample_drop', 'new_pitch', 'relationship')),
  CONSTRAINT crm_visit_status_check CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled'))
);

ALTER TABLE crm_visit_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view visits"
  ON crm_visit_schedule FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create visits"
  ON crm_visit_schedule FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update visits"
  ON crm_visit_schedule FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete visits"
  ON crm_visit_schedule FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_crm_visit_schedule_customer_id ON crm_visit_schedule(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_visit_schedule_user_id ON crm_visit_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_visit_schedule_visit_date ON crm_visit_schedule(visit_date);
CREATE INDEX IF NOT EXISTS idx_crm_visit_schedule_status ON crm_visit_schedule(status);

-- =============================================================================
-- 3. Add linked_task_id and visit_id columns to customer_activity_log
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_activity_log' AND column_name = 'linked_task_id'
  ) THEN
    ALTER TABLE customer_activity_log ADD COLUMN linked_task_id uuid REFERENCES crm_tasks(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_activity_log' AND column_name = 'visit_id'
  ) THEN
    ALTER TABLE customer_activity_log ADD COLUMN visit_id uuid REFERENCES crm_visit_schedule(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- 4. Updated_at trigger function (reusable)
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_crm_tasks_updated_at') THEN
    CREATE TRIGGER trg_crm_tasks_updated_at
      BEFORE UPDATE ON crm_tasks
      FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_crm_visit_schedule_updated_at') THEN
    CREATE TRIGGER trg_crm_visit_schedule_updated_at
      BEFORE UPDATE ON crm_visit_schedule
      FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- 5. crm_account_scores VIEW
--    Health score per customer: recency (40%), frequency (25%), revenue trend (20%), engagement (15%)
-- =============================================================================
CREATE OR REPLACE VIEW crm_account_scores AS
WITH order_stats AS (
  SELECT
    c.id AS customer_id,
    c.name AS customer_name,
    c.dispensary_code,
    COUNT(o.id) FILTER (WHERE o.order_date >= CURRENT_DATE - INTERVAL '30 days') AS orders_30d,
    COUNT(o.id) FILTER (WHERE o.order_date >= CURRENT_DATE - INTERVAL '90 days') AS orders_90d,
    MAX(o.order_date) AS last_order_date,
    COALESCE(SUM(o.total_amount) FILTER (WHERE o.order_date >= CURRENT_DATE - INTERVAL '60 days'), 0) AS revenue_recent_60d,
    COALESCE(SUM(o.total_amount) FILTER (WHERE o.order_date >= CURRENT_DATE - INTERVAL '120 days' AND o.order_date < CURRENT_DATE - INTERVAL '60 days'), 0) AS revenue_prior_60d
  FROM customers c
  LEFT JOIN orders o ON o.customer_id = c.id AND o.test_mode = false AND o.archived = false
  WHERE c.account_status IN ('active', 'prospect')
  GROUP BY c.id, c.name, c.dispensary_code
),
task_stats AS (
  SELECT
    customer_id,
    COUNT(*) FILTER (WHERE status IN ('open', 'in_progress')) AS open_task_count
  FROM crm_tasks
  GROUP BY customer_id
),
visit_stats AS (
  SELECT
    customer_id,
    MAX(visit_date) FILTER (WHERE status = 'completed') AS last_visit_date
  FROM crm_visit_schedule
  GROUP BY customer_id
),
engagement_stats AS (
  SELECT
    t.customer_id,
    COUNT(*) FILTER (WHERE t.status = 'completed' AND t.completed_at >= CURRENT_DATE - INTERVAL '30 days') AS tasks_completed_30d,
    COALESCE(v.visits_30d, 0) AS visits_completed_30d
  FROM crm_tasks t
  LEFT JOIN (
    SELECT customer_id, COUNT(*) AS visits_30d
    FROM crm_visit_schedule
    WHERE status = 'completed' AND visit_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY customer_id
  ) v ON v.customer_id = t.customer_id
  GROUP BY t.customer_id, v.visits_30d
),
scored AS (
  SELECT
    os.customer_id,
    os.customer_name,
    os.dispensary_code,
    EXTRACT(DAY FROM CURRENT_DATE - os.last_order_date)::integer AS days_since_last_order,
    os.orders_30d::integer AS order_frequency_30d,
    os.orders_90d::integer AS order_frequency_90d,
    CASE
      WHEN os.revenue_recent_60d > os.revenue_prior_60d * 1.1 THEN 'growing'
      WHEN os.revenue_recent_60d >= os.revenue_prior_60d * 0.9 THEN 'stable'
      WHEN os.revenue_recent_60d > 0 THEN 'declining'
      ELSE 'inactive'
    END AS revenue_trend,
    COALESCE(ts.open_task_count, 0)::integer AS open_task_count,
    vs.last_visit_date,
    -- Recency score (40%): 0 days = 40, 60+ days = 0
    LEAST(40, GREATEST(0,
      CASE
        WHEN os.last_order_date IS NULL THEN 0
        ELSE 40.0 - (EXTRACT(DAY FROM CURRENT_DATE - os.last_order_date) * 40.0 / 60.0)
      END
    )) AS recency_score,
    -- Frequency score (25%): 6+ orders in 90d = 25, 0 = 0
    LEAST(25, GREATEST(0,
      os.orders_90d * 25.0 / 6.0
    )) AS frequency_score,
    -- Revenue trend score (20%)
    CASE
      WHEN os.revenue_recent_60d > os.revenue_prior_60d * 1.1 THEN 20
      WHEN os.revenue_recent_60d >= os.revenue_prior_60d * 0.9 THEN 15
      WHEN os.revenue_recent_60d > 0 THEN 5
      ELSE 0
    END AS trend_score,
    -- Engagement score (15%)
    CASE
      WHEN COALESCE(es.tasks_completed_30d, 0) + COALESCE(es.visits_completed_30d, 0) >= 2 THEN 15
      WHEN COALESCE(es.tasks_completed_30d, 0) + COALESCE(es.visits_completed_30d, 0) >= 1 THEN 10
      WHEN EXISTS (SELECT 1 FROM crm_tasks WHERE customer_id = os.customer_id) OR EXISTS (SELECT 1 FROM crm_visit_schedule WHERE customer_id = os.customer_id) THEN 5
      ELSE 0
    END AS engagement_score
  FROM order_stats os
  LEFT JOIN task_stats ts ON ts.customer_id = os.customer_id
  LEFT JOIN visit_stats vs ON vs.customer_id = os.customer_id
  LEFT JOIN engagement_stats es ON es.customer_id = os.customer_id
)
SELECT
  customer_id,
  customer_name,
  dispensary_code,
  ROUND(recency_score + frequency_score + trend_score + engagement_score)::numeric AS health_score,
  CASE
    WHEN ROUND(recency_score + frequency_score + trend_score + engagement_score) >= 75 THEN 'healthy'
    WHEN ROUND(recency_score + frequency_score + trend_score + engagement_score) >= 50 THEN 'cooling'
    WHEN ROUND(recency_score + frequency_score + trend_score + engagement_score) >= 25 THEN 'at_risk'
    ELSE 'dormant'
  END AS health_label,
  days_since_last_order,
  order_frequency_30d,
  order_frequency_90d,
  revenue_trend,
  open_task_count,
  last_visit_date
FROM scored;

-- =============================================================================
-- 6. crm_product_mix_by_customer VIEW
--    Per-customer product breakdown aggregated from order history
-- =============================================================================
CREATE OR REPLACE VIEW crm_product_mix_by_customer AS
SELECT
  c.id AS customer_id,
  c.name AS customer_name,
  p.id AS product_id,
  p.name AS product_name,
  p.type AS product_type,
  p.product_category,
  oi.strain,
  SUM(oi.quantity)::integer AS total_units,
  SUM(oi.subtotal)::numeric AS total_revenue,
  ROUND(AVG(oi.unit_price), 2)::numeric AS avg_unit_price,
  MIN(o.order_date)::date AS first_order_date,
  MAX(o.order_date)::date AS last_order_date,
  COUNT(DISTINCT o.id)::integer AS order_count
FROM order_items oi
JOIN orders o ON o.id = oi.order_id AND o.test_mode = false AND o.archived = false
JOIN customers c ON c.id = o.customer_id
JOIN products p ON p.id = oi.product_id
GROUP BY c.id, c.name, p.id, p.name, p.type, p.product_category, oi.strain;
