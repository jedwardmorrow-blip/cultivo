/*
  # Packaging Yield Tracking and Statistical Analysis System

  ## Overview
  This migration creates a comprehensive packaging yield tracking system that captures yield data
  from packaging sessions and calculates statistical metrics for accurate inventory projections.

  ## New Tables

  ### 1. packaging_yields
  Stores individual yield records from each packaging session:
  - `id` (uuid, primary key) - Unique identifier
  - `strain` (text) - Strain name
  - `source_type` (text) - Source material type (flower, smalls, trim)
  - `target_type` (text) - Target package size (3.5g, 14g, 454g)
  - `input_weight_grams` (numeric) - Input weight in grams
  - `output_quantity_units` (integer) - Number of units produced
  - `yield_percentage` (numeric) - Calculated yield percentage
  - `yield_rate_units_per_gram` (numeric) - Units produced per gram of input
  - `packaging_date` (date) - Date of packaging
  - `batch_id` (text) - Batch identifier
  - `packaging_session_id` (uuid) - Reference to packaging_sessions
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Record creation time

  ### 2. packaging_yield_history
  Stores aggregated statistical metrics over time:
  - `id` (uuid, primary key) - Unique identifier
  - `strain` (text) - Strain name
  - `source_type` (text) - Source material type
  - `target_type` (text) - Target package size
  - `average_yield_percentage` (numeric) - Mean yield percentage
  - `standard_deviation` (numeric) - Standard deviation of yield
  - `confidence_interval_lower` (numeric) - Lower bound of 95% CI
  - `confidence_interval_upper` (numeric) - Upper bound of 95% CI
  - `sample_size` (integer) - Number of samples in calculation
  - `date_range_start` (date) - Start of data range
  - `date_range_end` (date) - End of data range
  - `created_at` (timestamptz) - Record creation time

  ### 3. monthly_performance_metrics
  Stores monthly business performance metrics:
  - `id` (uuid, primary key) - Unique identifier
  - `month` (date) - Month being tracked (first day of month)
  - `orders_fulfilled` (integer) - Orders completed
  - `average_fulfillment_days` (numeric) - Avg days from creation to ready
  - `total_weight_trimmed_grams` (numeric) - Total weight trimmed
  - `total_units_packaged` (integer) - Total units packaged
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last update time

  ## Schema Updates

  - Add `partial_quantity` to order_item_allocations for partial package usage
  - Add `conversion_metadata` JSONB to packaging_sessions for detailed yield data

  ## Views

  - packaging_yield_statistics - Aggregated yield stats per strain
  - order_age_metrics - Days since order creation with status
  - monthly_sku_deliveries - SKU counts delivered per month

  ## Functions

  - calculate_packaging_yield_statistics() - Computes statistical metrics
  - update_packaging_yield_history() - Updates history after new data
  - calculate_order_age_color() - Returns color code based on order age

  ## Security
  - Enable RLS on all new tables
  - Add policies for authenticated users
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

    COMMENT ON COLUMN order_item_allocations.partial_quantity IS
    'Quantity allocated from this package (may be less than total available). NULL means entire package allocated.';
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

    COMMENT ON COLUMN packaging_sessions.conversion_metadata IS
    'Detailed conversion data including input weights, output counts, and calculated yields';
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
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_packaging_source_type CHECK (source_type IN ('flower', 'smalls', 'trim')),
  CONSTRAINT valid_packaging_target_type CHECK (target_type IN ('3.5g', '14g', '454g')),
  CONSTRAINT positive_input_weight CHECK (input_weight_grams > 0),
  CONSTRAINT positive_output_quantity CHECK (output_quantity_units > 0)
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
  sample_size integer NOT NULL DEFAULT 0,
  date_range_start date,
  date_range_end date,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_yield_history_source_type CHECK (source_type IN ('flower', 'smalls', 'trim')),
  CONSTRAINT valid_yield_history_target_type CHECK (target_type IN ('3.5g', '14g', '454g')),
  CONSTRAINT positive_yield_sample_size CHECK (sample_size > 0)
);

-- Create monthly_performance_metrics table
CREATE TABLE IF NOT EXISTS monthly_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL,
  orders_fulfilled integer DEFAULT 0,
  average_fulfillment_days numeric DEFAULT 0,
  total_weight_trimmed_grams numeric DEFAULT 0,
  total_units_packaged integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(month)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_packaging_yields_strain_types ON packaging_yields(strain, source_type, target_type);
CREATE INDEX IF NOT EXISTS idx_packaging_yields_date ON packaging_yields(packaging_date DESC);
CREATE INDEX IF NOT EXISTS idx_packaging_yields_session ON packaging_yields(packaging_session_id);
CREATE INDEX IF NOT EXISTS idx_packaging_yield_history_strain_types ON packaging_yield_history(strain, source_type, target_type);
CREATE INDEX IF NOT EXISTS idx_packaging_yield_history_date_range ON packaging_yield_history(date_range_start, date_range_end);
CREATE INDEX IF NOT EXISTS idx_monthly_metrics_month ON monthly_performance_metrics(month DESC);
CREATE INDEX IF NOT EXISTS idx_order_allocations_partial ON order_item_allocations(order_item_id, partial_quantity);

-- Create function to calculate packaging yield statistics
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
  -- Calculate statistics from recent packaging yield data
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

  -- Calculate 95% confidence interval margin (1.96 * standard error)
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

-- Create function to update packaging yield history
CREATE OR REPLACE FUNCTION update_packaging_yield_history()
RETURNS void AS $$
DECLARE
  v_record RECORD;
  v_stats RECORD;
BEGIN
  -- Loop through all unique strain/source/target combinations
  FOR v_record IN
    SELECT DISTINCT strain, source_type, target_type
    FROM packaging_yields
  LOOP
    -- Calculate statistics for this combination
    SELECT * INTO v_stats
    FROM calculate_packaging_yield_statistics(
      v_record.strain,
      v_record.source_type,
      v_record.target_type,
      90
    );

    -- Insert or update history record
    INSERT INTO packaging_yield_history (
      strain,
      source_type,
      target_type,
      average_yield_percentage,
      standard_deviation,
      confidence_interval_lower,
      confidence_interval_upper,
      sample_size,
      date_range_start,
      date_range_end
    )
    VALUES (
      v_record.strain,
      v_record.source_type,
      v_record.target_type,
      v_stats.avg_yield,
      v_stats.std_dev,
      v_stats.ci_lower,
      v_stats.ci_upper,
      v_stats.sample_count,
      CURRENT_DATE - 90,
      CURRENT_DATE
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate order age color
CREATE OR REPLACE FUNCTION calculate_order_age_color(order_date timestamptz)
RETURNS text AS $$
DECLARE
  days_old integer;
BEGIN
  days_old := EXTRACT(DAY FROM (now() - order_date));

  IF days_old <= 6 THEN
    RETURN 'green';
  ELSIF days_old <= 10 THEN
    RETURN 'yellow';
  ELSE
    RETURN 'red';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create view for packaging yield statistics
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

-- Create view for order age metrics
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
    WHEN o.status = 'ready_for_delivery' THEN
      EXTRACT(DAY FROM (o.updated_at - o.created_at))
    ELSE NULL
  END as fulfillment_days
FROM orders o
WHERE o.archived = false;

-- Create view for monthly SKU deliveries
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

-- Update bulk_inventory_availability view to handle partial quantities
CREATE OR REPLACE VIEW bulk_inventory_availability AS
SELECT
  bi.id,
  bi.strain,
  bi.product_type,
  bi.weight_grams as total_weight,
  COALESCE(
    SUM(
      CASE
        WHEN oia.partial_quantity IS NOT NULL THEN oia.partial_quantity
        ELSE oia.allocated_quantity
      END
    ) FILTER (WHERE oia.allocation_status IN ('reserved', 'confirmed')),
    0
  ) as allocated_weight,
  bi.weight_grams - COALESCE(
    SUM(
      CASE
        WHEN oia.partial_quantity IS NOT NULL THEN oia.partial_quantity
        ELSE oia.allocated_quantity
      END
    ) FILTER (WHERE oia.allocation_status IN ('reserved', 'confirmed')),
    0
  ) as available_weight,
  bi.batch_id,
  bi.quality_grade,
  bi.trim_date,
  bi.created_at
FROM internal_bulk_inventory bi
LEFT JOIN order_item_allocations oia ON oia.inventory_id = bi.id AND oia.inventory_type = 'bulk'
GROUP BY bi.id, bi.strain, bi.product_type, bi.weight_grams, bi.batch_id, bi.quality_grade, bi.trim_date, bi.created_at;

-- Update packaged_inventory_availability view to handle partial quantities
CREATE OR REPLACE VIEW packaged_inventory_availability AS
SELECT
  pi.id,
  pi.strain,
  pi.product_type,
  pi.unit_size,
  pi.units_count as total_units,
  COALESCE(
    SUM(
      CASE
        WHEN oia.partial_quantity IS NOT NULL THEN oia.partial_quantity
        ELSE oia.allocated_quantity
      END
    ) FILTER (WHERE oia.allocation_status IN ('reserved', 'confirmed')),
    0
  ) as allocated_units,
  pi.units_count - COALESCE(
    SUM(
      CASE
        WHEN oia.partial_quantity IS NOT NULL THEN oia.partial_quantity
        ELSE oia.allocated_quantity
      END
    ) FILTER (WHERE oia.allocation_status IN ('reserved', 'confirmed')),
    0
  ) as available_units,
  pi.batch_id,
  pi.package_date,
  pi.created_at
FROM internal_packaged_inventory pi
LEFT JOIN order_item_allocations oia ON oia.inventory_id = pi.id AND oia.inventory_type = 'packaged'
GROUP BY pi.id, pi.strain, pi.product_type, pi.unit_size, pi.units_count, pi.batch_id, pi.package_date, pi.created_at;

-- Create trigger to update monthly metrics
CREATE OR REPLACE FUNCTION update_monthly_metrics()
RETURNS void AS $$
DECLARE
  v_month date;
BEGIN
  -- Get current month
  v_month := DATE_TRUNC('month', CURRENT_DATE)::date;

  -- Update or insert current month metrics
  INSERT INTO monthly_performance_metrics (
    month,
    orders_fulfilled,
    average_fulfillment_days,
    total_weight_trimmed_grams,
    total_units_packaged
  )
  SELECT
    v_month,
    COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'completed'),
    AVG(EXTRACT(DAY FROM (o.updated_at - o.created_at))) FILTER (WHERE o.status IN ('completed', 'ready_for_delivery')),
    COALESCE(SUM(ts.weight_after_trim_grams), 0),
    COALESCE(SUM(ps.output_units), 0)
  FROM orders o
  LEFT JOIN trim_sessions ts ON DATE_TRUNC('month', ts.trim_date) = v_month
  LEFT JOIN packaging_sessions ps ON DATE_TRUNC('month', ps.packaging_date) = v_month
  WHERE DATE_TRUNC('month', o.created_at) = v_month
  ON CONFLICT (month) DO UPDATE SET
    orders_fulfilled = EXCLUDED.orders_fulfilled,
    average_fulfillment_days = EXCLUDED.average_fulfillment_days,
    total_weight_trimmed_grams = EXCLUDED.total_weight_trimmed_grams,
    total_units_packaged = EXCLUDED.total_units_packaged,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE packaging_yields ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_yield_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Authenticated users can view packaging_yields"
  ON packaging_yields FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can modify packaging_yields"
  ON packaging_yields FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view packaging_yield_history"
  ON packaging_yield_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can modify packaging_yield_history"
  ON packaging_yield_history FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view monthly_performance_metrics"
  ON monthly_performance_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can modify monthly_performance_metrics"
  ON monthly_performance_metrics FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create trigger for updating updated_at timestamp
DROP TRIGGER IF EXISTS update_monthly_metrics_updated_at ON monthly_performance_metrics;
CREATE TRIGGER update_monthly_metrics_updated_at
  BEFORE UPDATE ON monthly_performance_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
