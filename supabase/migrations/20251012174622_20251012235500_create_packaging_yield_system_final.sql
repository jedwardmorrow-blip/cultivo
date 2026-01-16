/*
  # Packaging Yield Tracking System - Final

  This migration creates the packaging yield tracking system with proper handling of existing objects.
*/

-- Add partial_quantity field to order_item_allocations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_item_allocations' AND column_name = 'partial_quantity'
  ) THEN
    ALTER TABLE order_item_allocations
    ADD COLUMN partial_quantity numeric;
  END IF;
END $$;

-- Add conversion_metadata to packaging_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packaging_sessions' AND column_name = 'conversion_metadata'
  ) THEN
    ALTER TABLE packaging_sessions
    ADD COLUMN conversion_metadata jsonb;
  END IF;
END $$;

-- Create packaging_yields table
CREATE TABLE IF NOT EXISTS packaging_yields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strain text NOT NULL,
  source_type text NOT NULL,
  target_type text NOT NULL,
  input_weight_grams numeric NOT NULL,
  output_quantity_units integer NOT NULL,
  yield_percentage numeric GENERATED ALWAYS AS (
    CASE
      WHEN input_weight_grams > 0 THEN
        (output_quantity_units *
          CASE target_type
            WHEN '3.5g' THEN 3.5
            WHEN '14g' THEN 14
            WHEN '454g' THEN 454
            ELSE 0
          END / input_weight_grams) * 100
      ELSE 0
    END
  ) STORED,
  yield_rate_units_per_gram numeric GENERATED ALWAYS AS (
    CASE
      WHEN input_weight_grams > 0 THEN output_quantity_units::numeric / input_weight_grams
      ELSE 0
    END
  ) STORED,
  packaging_date date DEFAULT CURRENT_DATE,
  batch_id text,
  packaging_session_id uuid REFERENCES packaging_sessions(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create packaging_yield_history table
CREATE TABLE IF NOT EXISTS packaging_yield_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strain text NOT NULL,
  source_type text NOT NULL,
  target_type text NOT NULL,
  average_yield_percentage numeric NOT NULL,
  standard_deviation numeric,
  confidence_interval_lower numeric,
  confidence_interval_upper numeric,
  sample_size integer NOT NULL DEFAULT 1,
  date_range_start date,
  date_range_end date,
  created_at timestamptz DEFAULT now()
);

-- Create monthly_performance_metrics table
CREATE TABLE IF NOT EXISTS monthly_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL UNIQUE,
  orders_fulfilled integer DEFAULT 0,
  average_fulfillment_days numeric DEFAULT 0,
  total_weight_trimmed_grams numeric DEFAULT 0,
  total_units_packaged integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_packaging_yields_strain ON packaging_yields(strain, source_type, target_type);
CREATE INDEX IF NOT EXISTS idx_packaging_yields_date ON packaging_yields(packaging_date DESC);
CREATE INDEX IF NOT EXISTS idx_order_allocations_partial ON order_item_allocations(order_item_id) WHERE partial_quantity IS NOT NULL;

-- Create functions
CREATE OR REPLACE FUNCTION calculate_packaging_yield_statistics(
  p_strain text,
  p_source_type text,
  p_target_type text,
  p_days_back integer DEFAULT 90
)
RETURNS TABLE(
  avg_yield numeric,
  std_dev numeric,
  ci_lower numeric,
  ci_upper numeric,
  sample_count integer
) AS $$
DECLARE
  v_avg numeric;
  v_stddev numeric;
  v_count integer;
  v_ci_margin numeric;
BEGIN
  SELECT
    AVG(yield_percentage),
    STDDEV(yield_percentage),
    COUNT(*)
  INTO v_avg, v_stddev, v_count
  FROM packaging_yields
  WHERE strain = p_strain
    AND source_type = p_source_type
    AND target_type = p_target_type
    AND packaging_date >= CURRENT_DATE - p_days_back;

  IF v_count > 1 AND v_stddev IS NOT NULL THEN
    v_ci_margin := 1.96 * (v_stddev / SQRT(v_count));
  ELSE
    v_ci_margin := 0;
  END IF;

  RETURN QUERY SELECT
    COALESCE(v_avg, 0),
    COALESCE(v_stddev, 0),
    COALESCE(v_avg - v_ci_margin, 0),
    COALESCE(v_avg + v_ci_margin, 0),
    COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_order_age_color(order_date timestamptz)
RETURNS text AS $$
BEGIN
  RETURN CASE
    WHEN EXTRACT(DAY FROM (now() - order_date)) <= 6 THEN 'green'
    WHEN EXTRACT(DAY FROM (now() - order_date)) <= 10 THEN 'yellow'
    ELSE 'red'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create views
CREATE OR REPLACE VIEW packaging_yield_statistics AS
SELECT
  strain,
  source_type,
  target_type,
  COUNT(*) as total_conversions,
  AVG(yield_percentage) as avg_yield_percentage,
  STDDEV(yield_percentage) as std_dev_yield,
  MIN(yield_percentage) as min_yield,
  MAX(yield_percentage) as max_yield,
  AVG(yield_rate_units_per_gram) as avg_units_per_gram,
  MIN(packaging_date) as first_conversion_date,
  MAX(packaging_date) as last_conversion_date
FROM packaging_yields
GROUP BY strain, source_type, target_type;

CREATE OR REPLACE VIEW order_age_metrics AS
SELECT
  o.id as order_id,
  o.order_number,
  o.customer_id,
  o.status,
  o.created_at,
  o.requested_delivery_date,
  EXTRACT(DAY FROM (now() - o.created_at))::integer as days_since_created,
  calculate_order_age_color(o.created_at) as age_color_code,
  CASE
    WHEN o.status = 'ready_for_delivery' THEN EXTRACT(DAY FROM (o.updated_at - o.created_at))
    ELSE NULL
  END as fulfillment_days
FROM orders o
WHERE o.archived = false;

CREATE OR REPLACE VIEW monthly_sku_deliveries AS
SELECT
  DATE_TRUNC('month', o.updated_at)::date as month,
  p.name as product_name,
  p.type as product_type,
  p.strain,
  SUM(oi.quantity) as total_units_delivered,
  COUNT(DISTINCT o.id) as orders_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE o.status = 'completed'
  AND o.updated_at IS NOT NULL
GROUP BY DATE_TRUNC('month', o.updated_at), p.name, p.type, p.strain;

-- Enable RLS
ALTER TABLE packaging_yields ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_yield_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Auth users can view packaging_yields" ON packaging_yields FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can modify packaging_yields" ON packaging_yields FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can view packaging_yield_history" ON packaging_yield_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can modify packaging_yield_history" ON packaging_yield_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can view monthly_performance_metrics" ON monthly_performance_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can modify monthly_performance_metrics" ON monthly_performance_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create trigger
DROP TRIGGER IF EXISTS update_monthly_metrics_updated_at ON monthly_performance_metrics;
CREATE TRIGGER update_monthly_metrics_updated_at
  BEFORE UPDATE ON monthly_performance_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
