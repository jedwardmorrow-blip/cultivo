-- CUL-359: inventory_audit_periods (period accounting), batch_chemical_additives,
--          get_audit_period_summary RPC, inventory_audit_status 30-day clock view
-- NOTE: inventory_audit_periods renamed from spec's inventory_audits (conflict with existing table)

CREATE TABLE inventory_audit_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_period_start date NOT NULL,
  audit_period_end date NOT NULL,
  auditor_user_id uuid REFERENCES auth.users(id),
  beginning_inventory_g numeric NOT NULL DEFAULT 0,
  acquisitions_g numeric NOT NULL DEFAULT 0,
  harvests_g numeric NOT NULL DEFAULT 0,
  sales_g numeric NOT NULL DEFAULT 0,
  transfers_g numeric NOT NULL DEFAULT 0,
  testing_submissions_g numeric NOT NULL DEFAULT 0,
  disposals_g numeric NOT NULL DEFAULT 0,
  ending_inventory_calculated_g numeric GENERATED ALWAYS AS (
    beginning_inventory_g + acquisitions_g + harvests_g
    - sales_g - transfers_g - testing_submissions_g - disposals_g
  ) STORED,
  ending_inventory_physical_g numeric,
  variance_g numeric GENERATED ALWAYS AS (
    COALESCE(ending_inventory_physical_g, 0)
    - (beginning_inventory_g + acquisitions_g + harvests_g
       - sales_g - transfers_g - testing_submissions_g - disposals_g)
  ) STORED,
  variance_explanation text,
  corrective_action text,
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'flagged')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_audit_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read audit periods" ON inventory_audit_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert audit periods" ON inventory_audit_periods FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update audit periods" ON inventory_audit_periods FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_inventory_audit_periods_end ON inventory_audit_periods(audit_period_end);
CREATE INDEX idx_inventory_audit_periods_status ON inventory_audit_periods(status);

CREATE TRIGGER set_inventory_audit_periods_updated_at
  BEFORE UPDATE ON inventory_audit_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE batch_chemical_additives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES batch_registry(id) NOT NULL,
  ipm_spray_log_id uuid REFERENCES ipm_spray_log(id),
  additive_type text NOT NULL CHECK (additive_type IN ('pesticide', 'herbicide', 'fertilizer', 'other')),
  product_name text NOT NULL,
  active_ingredient text,
  application_date date NOT NULL,
  rate_applied text,
  application_method text,
  applicator_user_id uuid REFERENCES auth.users(id),
  epa_registration_number text,
  pre_harvest_interval_days int,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE batch_chemical_additives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read batch chemical additives" ON batch_chemical_additives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert batch chemical additives" ON batch_chemical_additives FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update batch chemical additives" ON batch_chemical_additives FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_batch_chemical_additives_batch_id ON batch_chemical_additives(batch_id);
CREATE INDEX idx_batch_chemical_additives_date ON batch_chemical_additives(application_date);

-- RPC: movement kind mapping: RECEIPT=acquisitions, PRODUCE=harvests, FULFILLMENT=sales,
--      CONSUME+reason=transfer/testing_submission/disposal
CREATE OR REPLACE FUNCTION get_audit_period_summary(period_start date, period_end date)
RETURNS TABLE (beginning_inventory_g numeric, acquisitions_g numeric, harvests_g numeric,
  sales_g numeric, transfers_g numeric, testing_submissions_g numeric, disposals_g numeric,
  ending_inventory_calculated_g numeric, movement_count bigint)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_beginning numeric; v_acquisitions numeric; v_harvests numeric; v_sales numeric;
  v_transfers numeric; v_testing numeric; v_disposals numeric;
BEGIN
  SELECT COALESCE(SUM(ii.on_hand_qty), 0) INTO v_beginning
  FROM inventory_items ii WHERE ii.created_at < period_start::timestamptz;
  SELECT
    COALESCE(SUM(CASE WHEN movement_kind='RECEIPT' THEN qty ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN movement_kind='PRODUCE' THEN qty ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN movement_kind='FULFILLMENT' THEN qty ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN movement_kind='CONSUME' AND reason_code='transfer' THEN qty ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN movement_kind='CONSUME' AND reason_code='testing_submission' THEN qty ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN movement_kind='CONSUME' AND reason_code IN ('disposal','waste') THEN qty ELSE 0 END),0)
  INTO v_acquisitions,v_harvests,v_sales,v_transfers,v_testing,v_disposals
  FROM inventory_movements
  WHERE created_at >= period_start::timestamptz AND created_at < (period_end+1)::timestamptz
    AND reason_code NOT IN ('session_finalization','order_fulfillment');
  RETURN QUERY SELECT v_beginning,v_acquisitions,v_harvests,v_sales,v_transfers,v_testing,v_disposals,
    v_beginning+v_acquisitions+v_harvests-v_sales-v_transfers-v_testing-v_disposals,
    (SELECT COUNT(*) FROM inventory_movements WHERE created_at >= period_start::timestamptz
     AND created_at < (period_end+1)::timestamptz);
END;
$$;

CREATE OR REPLACE VIEW inventory_audit_status AS
SELECT MAX(audit_period_end) AS last_audit_date,
  CURRENT_DATE - MAX(audit_period_end) AS days_since_last_audit,
  CASE WHEN MAX(audit_period_end) IS NULL THEN 'overdue'
       WHEN CURRENT_DATE - MAX(audit_period_end) > 30 THEN 'overdue'
       WHEN CURRENT_DATE - MAX(audit_period_end) >= 28 THEN 'warning'
       ELSE 'current' END AS audit_clock_status
FROM inventory_audit_periods WHERE status = 'completed';
