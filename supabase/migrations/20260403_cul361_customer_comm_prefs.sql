-- CUL-361: customer_communication_preferences, email_send_log.document_type, customer_contacts.role

CREATE TABLE customer_communication_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  invoice_lead_time_hours int NOT NULL DEFAULT 48,
  coa_send_timing text NOT NULL DEFAULT 'with_delivery'
    CHECK (coa_send_timing IN ('with_invoice', 'with_delivery', 'post_testing')),
  manifest_method text NOT NULL DEFAULT 'email'
    CHECK (manifest_method IN ('email', 'print', 'portal')),
  scheduling_link text,
  label_requirements text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id)
);

ALTER TABLE customer_communication_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read customer comm prefs"
  ON customer_communication_preferences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert customer comm prefs"
  ON customer_communication_preferences FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update customer comm prefs"
  ON customer_communication_preferences FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER set_customer_comm_prefs_updated_at
  BEFORE UPDATE ON customer_communication_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed defaults for all existing customers
INSERT INTO customer_communication_preferences (customer_id)
SELECT id FROM customers
ON CONFLICT (customer_id) DO NOTHING;

ALTER TABLE email_send_log
  ADD COLUMN IF NOT EXISTS document_type text
    CHECK (document_type IN ('invoice', 'coa', 'manifest', 'label'));

ALTER TABLE customer_contacts
  ADD COLUMN IF NOT EXISTS role text
    CHECK (role IN ('AP', 'Compliance', 'Purchasing', 'General'));
