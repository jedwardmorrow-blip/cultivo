/*
  # Analytics, Documents, and Compliance System

  ## New Tables Created

  ### Analytics Schema
  1. `throughput_metrics` - Daily rollup of productivity data
    - `date`, `trimmer_name`, `total_grams_processed`, `total_minutes`, `avg_grams_per_hour`
    - Aggregated from trim and packaging sessions

  2. `conversion_analytics` - Tracks actual vs expected conversion ratios
    - `strain`, `from_stage`, `to_stage`, `actual_percentage`, `expected_percentage`, `variance`

  ### Documents Schema
  3. `invoices` - Auto-generated invoices for orders
    - `invoice_number`, `order_id`, `customer_id`, `line_items`, `subtotal`, `tax`, `total`
    - `issue_date`, `due_date`, `payment_terms`, `status`, `notes`

  4. `manifests` - Shipping manifests for compliance
    - `manifest_number`, `manifest_date`, `driver_name`, `vehicle_info`
    - `orders` (array), `total_weight`, `total_units`, `status`

  5. `labels` - Product labels with compliance data
    - `label_id`, `product_id`, `batch_id`, `package_id`, `qr_code`
    - `thc_percentage`, `cbd_percentage`, `net_weight`, `test_date`, `printed_at`

  6. `coversheets` - Public-facing order coversheets
    - `coversheet_id`, `order_id`, `qr_code`, `access_token`
    - `created_at`, `accessed_count`, `last_accessed_at`

  7. `coa_documents` - Certificate of Analysis library
    - `coa_id`, `batch_id`, `strain`, `test_date`, `lab_name`
    - `file_url`, `thc_percentage`, `cbd_percentage`, `terpene_profile`, `is_public`

  ## Views Created
  - `daily_throughput_summary` - Aggregated productivity metrics
  - `strain_conversion_analysis` - Conversion ratio performance
  - `pending_invoices` - Orders ready for invoicing

  ## Security
  - RLS enabled on all tables
  - Public access for coversheets and COA documents
  - Authenticated access for invoices and internal documents
*/

-- Analytics: Throughput Metrics Table
CREATE TABLE IF NOT EXISTS throughput_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL,
  worker_name text NOT NULL,
  worker_type text NOT NULL CHECK (worker_type IN ('trimmer', 'packager')),
  strain text,
  total_weight_processed numeric NOT NULL DEFAULT 0,
  total_units_produced integer NOT NULL DEFAULT 0,
  total_minutes_worked integer NOT NULL DEFAULT 0,
  avg_grams_per_hour numeric,
  avg_units_per_hour numeric,
  sessions_completed integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(metric_date, worker_name, worker_type, strain)
);

ALTER TABLE throughput_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read throughput_metrics"
  ON throughput_metrics FOR SELECT
  TO authenticated
  USING (true);

-- Analytics: Conversion Analytics Table
CREATE TABLE IF NOT EXISTS conversion_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_date date NOT NULL DEFAULT CURRENT_DATE,
  strain text NOT NULL,
  from_stage text NOT NULL,
  to_stage text NOT NULL,
  sample_size integer NOT NULL DEFAULT 0,
  actual_percentage numeric NOT NULL,
  expected_percentage numeric,
  variance_percentage numeric,
  total_input_grams numeric,
  total_output_grams numeric,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(analysis_date, strain, from_stage, to_stage)
);

ALTER TABLE conversion_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read conversion_analytics"
  ON conversion_analytics FOR SELECT
  TO authenticated
  USING (true);

-- Documents: Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  payment_terms text DEFAULT 'Net 30',
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (true);

-- Documents: Manifests Table
CREATE TABLE IF NOT EXISTS manifests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_number text UNIQUE NOT NULL,
  manifest_date date NOT NULL DEFAULT CURRENT_DATE,
  driver_name text,
  vehicle_info text,
  route_number text,
  order_ids uuid[] NOT NULL DEFAULT '{}',
  total_packages integer DEFAULT 0,
  total_weight_grams numeric DEFAULT 0,
  total_units integer DEFAULT 0,
  departure_time timestamptz,
  estimated_delivery_time timestamptz,
  actual_delivery_time timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'cancelled')),
  compliance_notes text,
  signature_data text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE manifests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read manifests"
  ON manifests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert manifests"
  ON manifests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update manifests"
  ON manifests FOR UPDATE
  TO authenticated
  USING (true);

-- Documents: Labels Table
CREATE TABLE IF NOT EXISTS labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_number text UNIQUE NOT NULL,
  product_id uuid REFERENCES products(id),
  package_id text NOT NULL,
  batch_id text NOT NULL,
  strain text NOT NULL,
  product_name text NOT NULL,
  product_type text NOT NULL,
  net_weight_grams numeric NOT NULL,
  unit_count integer,
  qr_code_data text NOT NULL,
  qr_code_url text,
  thc_percentage numeric,
  cbd_percentage numeric,
  total_cannabinoids numeric,
  terpene_profile jsonb,
  test_date date,
  lab_name text,
  harvest_date date,
  package_date date,
  expiration_date date,
  compliance_uid text,
  warnings text[],
  printed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read labels"
  ON labels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert labels"
  ON labels FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update labels"
  ON labels FOR UPDATE
  TO authenticated
  USING (true);

-- Documents: Coversheets Table (Public Access)
CREATE TABLE IF NOT EXISTS coversheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coversheet_number text UNIQUE NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  access_token text UNIQUE NOT NULL,
  qr_code_data text NOT NULL,
  qr_code_url text,
  customer_name text NOT NULL,
  delivery_date date,
  total_packages integer DEFAULT 0,
  total_weight_grams numeric DEFAULT 0,
  items_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  accessed_count integer DEFAULT 0,
  last_accessed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coversheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read coversheets by token"
  ON coversheets FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Allow authenticated full access coversheets"
  ON coversheets FOR ALL
  TO authenticated
  USING (true);

-- Documents: COA Documents Table (Public Access)
CREATE TABLE IF NOT EXISTS coa_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coa_number text UNIQUE NOT NULL,
  batch_id text NOT NULL,
  strain text NOT NULL,
  test_date date NOT NULL,
  lab_name text NOT NULL,
  lab_license text,
  file_url text NOT NULL,
  file_type text DEFAULT 'pdf',
  file_size_kb integer,
  thc_percentage numeric,
  thca_percentage numeric,
  cbd_percentage numeric,
  cbda_percentage numeric,
  total_cannabinoids numeric,
  terpene_profile jsonb,
  microbial_status text,
  heavy_metals_status text,
  pesticides_status text,
  pass_fail text CHECK (pass_fail IN ('pass', 'fail', 'pending')),
  is_public boolean DEFAULT true,
  tags text[],
  notes text,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE coa_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read coa_documents"
  ON coa_documents FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "Allow authenticated insert coa_documents"
  ON coa_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update coa_documents"
  ON coa_documents FOR UPDATE
  TO authenticated
  USING (true);

-- View: Daily Throughput Summary
CREATE OR REPLACE VIEW daily_throughput_summary AS
SELECT
  metric_date,
  worker_type,
  COUNT(DISTINCT worker_name) as total_workers,
  SUM(total_weight_processed) as total_weight_grams,
  SUM(total_units_produced) as total_units,
  SUM(total_minutes_worked) as total_minutes,
  AVG(avg_grams_per_hour) as avg_grams_per_hour,
  AVG(avg_units_per_hour) as avg_units_per_hour,
  SUM(sessions_completed) as total_sessions
FROM throughput_metrics
GROUP BY metric_date, worker_type
ORDER BY metric_date DESC;

-- View: Strain Conversion Analysis
CREATE OR REPLACE VIEW strain_conversion_analysis AS
SELECT
  ca.strain,
  ca.from_stage,
  ca.to_stage,
  ca.actual_percentage,
  ca.expected_percentage,
  ca.variance_percentage,
  ca.sample_size,
  ca.analysis_date,
  CASE
    WHEN ca.variance_percentage > 5 THEN 'over_performing'
    WHEN ca.variance_percentage < -5 THEN 'under_performing'
    ELSE 'on_target'
  END as performance_status
FROM conversion_analytics ca
ORDER BY ca.analysis_date DESC, ca.strain, ca.from_stage;

-- View: Pending Invoices
CREATE OR REPLACE VIEW pending_invoices AS
SELECT
  o.id as order_id,
  o.order_number,
  o.status as order_status,
  c.name as customer_name,
  c.id as customer_id,
  o.total_amount,
  o.scheduled_delivery_date,
  COALESCE(i.id IS NOT NULL, false) as has_invoice,
  i.invoice_number,
  i.status as invoice_status
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN invoices i ON i.order_id = o.id
WHERE o.status IN ('ready_for_delivery', 'completed')
  AND o.archived = false
ORDER BY o.scheduled_delivery_date DESC;

-- Function: Auto-generate Invoice Number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  invoice_num text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS integer)), 0) + 1
  INTO next_number
  FROM invoices
  WHERE invoice_number ~ '^INV-[0-9]+$';

  invoice_num := 'INV-' || LPAD(next_number::text, 6, '0');
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-generate Manifest Number
CREATE OR REPLACE FUNCTION generate_manifest_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  manifest_num text;
  date_prefix text;
BEGIN
  date_prefix := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  SELECT COALESCE(MAX(CAST(SUBSTRING(manifest_number FROM '[0-9]+$') AS integer)), 0) + 1
  INTO next_number
  FROM manifests
  WHERE manifest_number LIKE 'MAN-' || date_prefix || '-%';

  manifest_num := 'MAN-' || date_prefix || '-' || LPAD(next_number::text, 3, '0');
  RETURN manifest_num;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate Coversheet Access Token
CREATE OR REPLACE FUNCTION generate_coversheet_token()
RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update invoice updated_at
CREATE OR REPLACE FUNCTION update_invoice_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_timestamp
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_timestamp();

-- Trigger: Auto-update manifest updated_at
CREATE TRIGGER update_manifests_timestamp
  BEFORE UPDATE ON manifests
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_timestamp();

-- Trigger: Auto-update coa_documents updated_at
CREATE TRIGGER update_coa_documents_timestamp
  BEFORE UPDATE ON coa_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_timestamp();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_throughput_metrics_date ON throughput_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_throughput_metrics_worker ON throughput_metrics(worker_name, worker_type);
CREATE INDEX IF NOT EXISTS idx_conversion_analytics_strain ON conversion_analytics(strain, analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_manifests_date ON manifests(manifest_date DESC);
CREATE INDEX IF NOT EXISTS idx_manifests_status ON manifests(status);
CREATE INDEX IF NOT EXISTS idx_labels_package_id ON labels(package_id);
CREATE INDEX IF NOT EXISTS idx_labels_batch_id ON labels(batch_id);
CREATE INDEX IF NOT EXISTS idx_coversheets_access_token ON coversheets(access_token);
CREATE INDEX IF NOT EXISTS idx_coversheets_order_id ON coversheets(order_id);
CREATE INDEX IF NOT EXISTS idx_coa_documents_batch ON coa_documents(batch_id);
CREATE INDEX IF NOT EXISTS idx_coa_documents_strain ON coa_documents(strain);
CREATE INDEX IF NOT EXISTS idx_coa_documents_public ON coa_documents(is_public) WHERE is_public = true;
