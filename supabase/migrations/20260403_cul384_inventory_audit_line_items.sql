-- CUL-384: audit_variance_status enum, inventory_audit_line_items, inventory_audit_notifications
-- inventory_audits (header) already existed; these are children + archived_at retention column
-- Board variance thresholds (2026-04-03): 0-0.5g=tolerance, >=0.5g=requires_explanation, >=5g=flagged

CREATE TYPE audit_variance_status AS ENUM (
  'within_scale_tolerance',
  'requires_explanation',
  'flagged',
  'resolved'
);

ALTER TABLE inventory_audits ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE TABLE inventory_audit_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid REFERENCES inventory_audits(id) ON DELETE CASCADE NOT NULL,
  batch_id uuid REFERENCES batch_registry(id),
  product_name text NOT NULL,
  expected_qty numeric NOT NULL,
  actual_qty numeric NOT NULL,
  variance_g numeric GENERATED ALWAYS AS (actual_qty - expected_qty) STORED,
  variance_status audit_variance_status NOT NULL DEFAULT 'within_scale_tolerance',
  explanation text,
  corrective_action text,
  criminal_activity_flag boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_audit_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read audit line items" ON inventory_audit_line_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert audit line items" ON inventory_audit_line_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update audit line items" ON inventory_audit_line_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_audit_line_items_audit_id_status ON inventory_audit_line_items(audit_id, variance_status);
CREATE INDEX idx_audit_line_items_batch_id ON inventory_audit_line_items(batch_id);

CREATE TRIGGER set_audit_line_items_updated_at
  BEFORE UPDATE ON inventory_audit_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE inventory_audit_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_line_item_id uuid REFERENCES inventory_audit_line_items(id) ON DELETE CASCADE NOT NULL,
  notified_at timestamptz NOT NULL DEFAULT now(),
  notified_user_id uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_audit_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read audit notifications" ON inventory_audit_notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert audit notifications" ON inventory_audit_notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update audit notifications" ON inventory_audit_notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_audit_notifications_line_item_id ON inventory_audit_notifications(audit_line_item_id);

CREATE OR REPLACE FUNCTION fn_set_audit_variance_status()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_abs_variance numeric;
BEGIN
  v_abs_variance := ABS(NEW.actual_qty - NEW.expected_qty);
  IF v_abs_variance >= 5 THEN NEW.variance_status := 'flagged';
  ELSIF v_abs_variance >= 0.5 THEN NEW.variance_status := 'requires_explanation';
  ELSE NEW.variance_status := 'within_scale_tolerance';
  END IF;
  IF OLD IS NOT NULL AND OLD.variance_status = 'resolved' THEN
    NEW.variance_status := 'resolved';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_audit_variance_status_on_upsert
  BEFORE INSERT OR UPDATE OF actual_qty, expected_qty
  ON inventory_audit_line_items
  FOR EACH ROW EXECUTE FUNCTION fn_set_audit_variance_status();
