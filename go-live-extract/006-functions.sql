-- ============================================================
-- Functions
-- Source: https://fonreynkfeqywshijqpi.supabase.co
-- Extracted: 2026-03-02
-- Count: 186
-- ============================================================
-- Function: archive_product
CREATE OR REPLACE FUNCTION public.archive_product(p_product_id uuid, p_reason text, p_replaced_by_product_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
UPDATE products
SET 
is_archived = true,
archived_at = now(),
archive_reason = p_reason,
replaced_by_product_id = p_replaced_by_product_id,
is_active = false
WHERE id = p_product_id;
END;
$function$
;

-- Function: calculate_batch_projection
CREATE OR REPLACE FUNCTION public.calculate_batch_projection(p_strain text, p_source_stage text, p_source_weight numeric, p_target_stage text)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
v_projection numeric;
v_flower_ratio numeric;
v_smalls_ratio numeric;
v_trim_ratio numeric;
BEGIN
-- Get strain conversion ratios
SELECT 
avg_bucked_to_flower_ratio,
avg_bucked_to_smalls_ratio,
avg_bucked_to_trim_ratio
INTO 
v_flower_ratio,
v_smalls_ratio,
v_trim_ratio
FROM strain_metadata
WHERE name = p_strain;

-- Default ratios if strain not found
IF v_flower_ratio IS NULL THEN
v_flower_ratio := 0.50;
v_smalls_ratio := 0.25;
v_trim_ratio := 0.20;
END IF;

-- Calculate projection based on stage transition
IF p_source_stage = 'bucked' THEN
IF p_target_stage = 'bulk_flower' THEN
v_projection := p_source_weight * v_flower_ratio;
ELSIF p_target_stage = 'bulk_smalls' THEN
v_projection := p_source_weight * v_smalls_ratio;
ELSIF p_target_stage = 'bulk_trim' THEN
v_projection := p_source_weight * v_trim_ratio;
ELSIF p_target_stage = 'packaged' THEN
-- Assume packaged is flower with 7% overage
v_projection := p_source_weight * v_flower_ratio * 1.07;
ELSE
v_projection := p_source_weight;
END IF;
ELSIF p_source_stage LIKE 'bulk_%' AND p_target_stage = 'packaged' THEN
-- Bulk to packaged assumes 7% overage for packaging
v_projection := p_source_weight * 1.07;
ELSE
-- Default: no conversion
v_projection := p_source_weight;
END IF;

RETURN ROUND(v_projection, 2);
END;
$function$
;

-- Function: calculate_bucking_session_metrics
CREATE OR REPLACE FUNCTION public.calculate_bucking_session_metrics()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
-- Only calculate when session is completed
IF NEW.session_status = 'completed' AND OLD.session_status = 'active' THEN
-- Set completion timestamp if not already set
IF NEW.completed_at IS NULL THEN
NEW.completed_at = now();
END IF;

-- Calculate minutes bucked
NEW.minutes_bucked = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 60;

-- Calculate kg per hour (if time > 0)
IF NEW.minutes_bucked > 0 THEN
NEW.kg_per_hour = (NEW.binned_weight_grams / 1000.0) / (NEW.minutes_bucked / 60.0);
END IF;

-- Calculate variance
NEW.variance_grams = NEW.binned_weight_grams -
(NEW.bucked_flower_grams + NEW.bucked_smalls_grams + NEW.waste_grams);
END IF;

RETURN NEW;
END;
$function$
;

-- Function: calculate_ledger_quantity
CREATE OR REPLACE FUNCTION public.calculate_ledger_quantity(p_item_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
v_total numeric := 0;
BEGIN
-- Process movements in chronological order
-- Most recent absolute value (ADJUSTMENT/RECONCILIATION) becomes base
-- Then apply all subsequent relative movements

SELECT
COALESCE(
-- Start with most recent absolute movement if exists
(
SELECT qty FROM inventory_movements
WHERE (source_item_id = p_item_id OR dest_item_id = p_item_id)
AND movement_kind IN ('ADJUSTMENT', 'RECONCILIATION')
ORDER BY created_at DESC
LIMIT 1
),
0 -- Default to 0 if no absolute movements
) +
-- Add all relative movements after last absolute
COALESCE(
(
SELECT SUM(
CASE
-- Increment movements (to this item)
WHEN movement_kind IN ('RECEIPT', 'PRODUCE', 'RETURN', 'RELEASE')
AND dest_item_id = p_item_id
THEN qty
-- Decrement movements (from this item)
WHEN movement_kind IN ('CONSUME', 'FULFILLMENT', 'RESERVE')
AND source_item_id = p_item_id
THEN -qty
ELSE 0
END
)
FROM inventory_movements
WHERE (source_item_id = p_item_id OR dest_item_id = p_item_id)
AND movement_kind NOT IN ('ADJUSTMENT', 'RECONCILIATION')
AND created_at > COALESCE(
(
SELECT created_at FROM inventory_movements
WHERE (source_item_id = p_item_id OR dest_item_id = p_item_id)
AND movement_kind IN ('ADJUSTMENT', 'RECONCILIATION')
ORDER BY created_at DESC
LIMIT 1
),
'1970-01-01'::timestamptz
)
),
0
)
INTO v_total;

RETURN GREATEST(v_total, 0); -- Ensure non-negative
END;
$function$
;

-- Function: calculate_order_age_color
CREATE OR REPLACE FUNCTION public.calculate_order_age_color(order_date timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
RETURN CASE
WHEN EXTRACT(DAY FROM (now() - order_date)) <= 6 THEN 'green'
WHEN EXTRACT(DAY FROM (now() - order_date)) <= 10 THEN 'yellow'
ELSE 'red'
END;
END;
$function$
;

-- Function: calculate_packaging_metrics
CREATE OR REPLACE FUNCTION public.calculate_packaging_metrics()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
-- Only calculate metrics for completed sessions
IF NEW.session_status = 'completed' THEN
-- Set completion timestamp if not already set
IF NEW.completed_at IS NULL THEN
NEW.completed_at := now();
END IF;

-- Calculate minutes from started_at to completed_at
IF NEW.started_at IS NOT NULL AND NEW.completed_at IS NOT NULL THEN
NEW.minutes_packaged := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 60;
END IF;

-- Calculate units per hour if we have the data
IF NEW.minutes_packaged > 0 THEN
DECLARE
total_units numeric;
BEGIN
total_units := COALESCE(NEW.units_3_5g, 0) + COALESCE(NEW.units_14g, 0) + COALESCE(NEW.units_454g, 0);
NEW.units_per_hour := (total_units * 60.0) / NEW.minutes_packaged;
END;
END IF;

-- Calculate variance
IF NEW.pull_weight IS NOT NULL THEN
DECLARE
total_output numeric;
BEGIN
-- Calculate total output: ending weight + (units weights) + trim + waste
total_output := COALESCE(NEW.ending_weight, 0) +
(COALESCE(NEW.units_3_5g, 0) * 3.5) +
(COALESCE(NEW.units_14g, 0) * 14) +
(COALESCE(NEW.units_454g, 0) * 454) +
COALESCE(NEW.trim_grams, 0) +
COALESCE(NEW.waste_grams, 0);
NEW.variance_grams := NEW.pull_weight - total_output;
END;
END IF;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: calculate_packaging_yield_statistics
CREATE OR REPLACE FUNCTION public.calculate_packaging_yield_statistics(p_strain text, p_source_type text, p_target_type text, p_days_back integer DEFAULT 90)
 RETURNS TABLE(avg_yield numeric, std_dev numeric, ci_lower numeric, ci_upper numeric, sample_count integer)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

-- Function: calculate_trim_grams_per_hour
CREATE OR REPLACE FUNCTION public.calculate_trim_grams_per_hour()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
IF NEW.minutes_trimmed > 0 AND NEW.big_buds_grams IS NOT NULL THEN
NEW.grams_per_hour := (NEW.big_buds_grams * 60.0) / NEW.minutes_trimmed;
END IF;
RETURN NEW;
END;
$function$
;

-- Function: calculate_trim_metrics
CREATE OR REPLACE FUNCTION public.calculate_trim_metrics()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
-- Only calculate metrics for completed sessions
IF NEW.session_status = 'completed' THEN
-- Set completion timestamp if not already set
IF NEW.completed_at IS NULL THEN
NEW.completed_at := now();
END IF;

-- Calculate minutes from started_at to completed_at
IF NEW.started_at IS NOT NULL AND NEW.completed_at IS NOT NULL THEN
NEW.minutes_trimmed := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 60;
END IF;

-- Calculate grams per hour if we have the data
IF NEW.minutes_trimmed > 0 AND NEW.big_buds_grams IS NOT NULL THEN
NEW.grams_per_hour := (NEW.big_buds_grams * 60.0) / NEW.minutes_trimmed;
END IF;

-- Calculate variance including bucked smalls
IF NEW.pulled_weight IS NOT NULL THEN
NEW.variance_grams := NEW.pulled_weight -
(COALESCE(NEW.big_buds_grams, 0) +
COALESCE(NEW.small_buds_grams, 0) +
COALESCE(NEW.trim_grams, 0) +
COALESCE(NEW.waste_grams, 0) +
COALESCE(NEW.bucked_smalls_grams, 0));
END IF;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: can_close_conversion
CREATE OR REPLACE FUNCTION public.can_close_conversion(p_session_type text, p_session_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
v_remaining numeric;
BEGIN
IF p_session_type = 'bucking' THEN
v_remaining := get_bucking_remaining_weight(p_session_id);
ELSIF p_session_type = 'trim' THEN
v_remaining := get_trim_remaining_weight(p_session_id);
ELSIF p_session_type = 'packaging' THEN
v_remaining := get_packaging_remaining_weight(p_session_id);
ELSE
RAISE EXCEPTION 'Invalid session type: %', p_session_type;
END IF;

-- Can close if remaining is 0 or within 0.1g tolerance
RETURN (v_remaining IS NULL OR ABS(v_remaining) < 0.1);
END;
$function$
;

-- Function: check_batch_has_valid_coa
CREATE OR REPLACE FUNCTION public.check_batch_has_valid_coa(batch_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
coa_count INTEGER;
BEGIN
-- Count active COAs for this batch
SELECT COUNT(*) INTO coa_count
FROM certificates_of_analysis
WHERE batch_id = batch_uuid
AND is_active = true;

-- Return true if at least one active COA exists
RETURN coa_count > 0;
END;
$function$
;

-- Function: check_batch_over_allocation
CREATE OR REPLACE FUNCTION public.check_batch_over_allocation(p_batch_id uuid, p_stage text DEFAULT NULL::text)
 RETURNS TABLE(stage text, weight_grams numeric, allocated_grams numeric, available_grams numeric, allocation_percentage numeric, warning_level text)
 LANGUAGE plpgsql
AS $function$
BEGIN
RETURN QUERY
SELECT 
bsas.stage,
bsas.weight_grams,
bsas.allocated_weight_grams,
bsas.available_weight_grams,
bsas.stage_allocation_percentage,
bsas.allocation_warning_level
FROM batch_stage_allocation_status bsas
WHERE bsas.batch_id = p_batch_id
AND (p_stage IS NULL OR bsas.stage = p_stage)
ORDER BY 
CASE bsas.stage
WHEN 'bucked' THEN 1
WHEN 'bulk_flower' THEN 2
WHEN 'bulk_smalls' THEN 3
WHEN 'bulk_trim' THEN 4
WHEN 'packaged' THEN 5
END;
END;
$function$
;

-- Function: check_trigger_health
CREATE OR REPLACE FUNCTION public.check_trigger_health()
 RETURNS TABLE(trigger_name text, status text, enabled boolean, last_execution timestamp with time zone, total_movements bigint, movements_last_24h bigint, errors_last_24h bigint, error_rate_24h numeric)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
SELECT
'trg_update_inventory_on_hand'::text as trigger_name,
CASE
WHEN EXISTS (
SELECT 1 FROM pg_trigger
WHERE tgname = 'trg_update_inventory_on_hand'
AND tgenabled != 'D'
) THEN 'HEALTHY'
ELSE 'DISABLED'
END as status,
EXISTS (
SELECT 1 FROM pg_trigger
WHERE tgname = 'trg_update_inventory_on_hand'
AND tgenabled != 'D'
) as enabled,
(SELECT MAX(created_at) FROM inventory_movements) as last_execution,
(SELECT COUNT(*) FROM inventory_movements) as total_movements,
(SELECT COUNT(*) FROM inventory_movements WHERE created_at >= NOW() - INTERVAL '24 hours') as movements_last_24h,
(SELECT COUNT(*) FROM inventory_movement_errors WHERE created_at >= NOW() - INTERVAL '24 hours') as errors_last_24h,
CASE
WHEN (SELECT COUNT(*) FROM inventory_movements WHERE created_at >= NOW() - INTERVAL '24 hours') > 0
THEN ROUND(
(SELECT COUNT(*) FROM inventory_movement_errors WHERE created_at >= NOW() - INTERVAL '24 hours')::numeric /
(SELECT COUNT(*) FROM inventory_movements WHERE created_at >= NOW() - INTERVAL '24 hours') * 100,
2
)
ELSE 0
END as error_rate_24h;
END;
$function$
;

-- Function: cleanup_old_test_mode_logs
CREATE OR REPLACE FUNCTION public.cleanup_old_test_mode_logs()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
v_retention_days integer;
v_deleted_count integer;
BEGIN
-- Get retention period from settings
SELECT (setting_value)::integer INTO v_retention_days
FROM app_settings
WHERE category = 'testing'
AND setting_key = 'test_mode_audit_retention_days';

-- Default to 30 days if not set
v_retention_days := COALESCE(v_retention_days, 30);

-- Delete old logs
DELETE FROM test_mode_audit_log
WHERE created_at < (now() - (v_retention_days || ' days')::interval);

GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

RETURN v_deleted_count;
END;
$function$
;

-- Function: consolidate_packaging_session_output
CREATE OR REPLACE FUNCTION public.consolidate_packaging_session_output(p_session_id uuid, p_strain text, p_strain_abbreviation text, p_session_date date, p_units_3_5g integer, p_units_14g integer, p_units_454g integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
v_package_id text;
v_consolidated_id uuid;
v_product_type text;
v_units integer;
BEGIN
-- Process 3.5g units if any
IF p_units_3_5g > 0 THEN
v_product_type := '3.5g';

SELECT id, package_id INTO v_consolidated_id, v_package_id
FROM consolidated_packages
WHERE package_date = p_session_date
AND strain = p_strain
AND product_stage = 'Packaged'
AND product_type = v_product_type
AND session_type = 'packaging';

IF v_consolidated_id IS NULL THEN
v_package_id := generate_consolidated_package_id(p_session_date, p_strain_abbreviation);

INSERT INTO consolidated_packages (
package_id, package_date, strain, strain_abbreviation,
product_stage, product_type, total_units,
session_type, session_count, source_session_ids
) VALUES (
v_package_id, p_session_date, p_strain, p_strain_abbreviation,
'Packaged', v_product_type, p_units_3_5g,
'packaging', 1, ARRAY[p_session_id]
)
RETURNING id INTO v_consolidated_id;
ELSE
UPDATE consolidated_packages
SET total_units = total_units + p_units_3_5g,
session_count = session_count + 1,
source_session_ids = array_append(source_session_ids, p_session_id),
updated_at = now()
WHERE id = v_consolidated_id;
END IF;

INSERT INTO consolidated_package_sources (
consolidated_package_id, session_id, session_type,
session_date, contribution_units
) VALUES (
v_consolidated_id, p_session_id, 'packaging',
p_session_date, p_units_3_5g
);
END IF;

-- Process 14g units if any
IF p_units_14g > 0 THEN
v_product_type := '14g';

SELECT id, package_id INTO v_consolidated_id, v_package_id
FROM consolidated_packages
WHERE package_date = p_session_date
AND strain = p_strain
AND product_stage = 'Packaged'
AND product_type = v_product_type
AND session_type = 'packaging';

IF v_consolidated_id IS NULL THEN
v_package_id := generate_consolidated_package_id(p_session_date, p_strain_abbreviation);

INSERT INTO consolidated_packages (
package_id, package_date, strain, strain_abbreviation,
product_stage, product_type, total_units,
session_type, session_count, source_session_ids
) VALUES (
v_package_id, p_session_date, p_strain, p_strain_abbreviation,
'Packaged', v_product_type, p_units_14g,
'packaging', 1, ARRAY[p_session_id]
)
RETURNING id INTO v_consolidated_id;
ELSE
UPDATE consolidated_packages
SET total_units = total_units + p_units_14g,
session_count = session_count + 1,
source_session_ids = array_append(source_session_ids, p_session_id),
updated_at = now()
WHERE id = v_consolidated_id;
END IF;

INSERT INTO consolidated_package_sources (
consolidated_package_id, session_id, session_type,
session_date, contribution_units
) VALUES (
v_consolidated_id, p_session_id, 'packaging',
p_session_date, p_units_14g
);
END IF;

-- Process 454g units if any
IF p_units_454g > 0 THEN
v_product_type := '454g';

SELECT id, package_id INTO v_consolidated_id, v_package_id
FROM consolidated_packages
WHERE package_date = p_session_date
AND strain = p_strain
AND product_stage = 'Packaged'
AND product_type = v_product_type
AND session_type = 'packaging';

IF v_consolidated_id IS NULL THEN
v_package_id := generate_consolidated_package_id(p_session_date, p_strain_abbreviation);

INSERT INTO consolidated_packages (
package_id, package_date, strain, strain_abbreviation,
product_stage, product_type, total_units,
session_type, session_count, source_session_ids
) VALUES (
v_package_id, p_session_date, p_strain, p_strain_abbreviation,
'Packaged', v_product_type, p_units_454g,
'packaging', 1, ARRAY[p_session_id]
)
RETURNING id INTO v_consolidated_id;
ELSE
UPDATE consolidated_packages
SET total_units = total_units + p_units_454g,
session_count = session_count + 1,
source_session_ids = array_append(source_session_ids, p_session_id),
updated_at = now()
WHERE id = v_consolidated_id;
END IF;

INSERT INTO consolidated_package_sources (
consolidated_package_id, session_id, session_type,
session_date, contribution_units
) VALUES (
v_consolidated_id, p_session_id, 'packaging',
p_session_date, p_units_454g
);
END IF;
END;
$function$
;

-- Function: consolidate_trim_session_output
CREATE OR REPLACE FUNCTION public.consolidate_trim_session_output(p_session_id uuid, p_strain text, p_strain_abbreviation text, p_session_date date, p_flower_grams numeric, p_smalls_grams numeric, p_trim_grams numeric)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
v_package_id text;
v_consolidated_id uuid;
v_product_type text;
v_weight numeric;
BEGIN
-- Process Bulk Flower if any
IF p_flower_grams > 0 THEN
v_product_type := 'Flower';

-- Check if consolidated package exists
SELECT id, package_id INTO v_consolidated_id, v_package_id
FROM consolidated_packages
WHERE package_date = p_session_date
AND strain = p_strain
AND product_stage = 'Bulk'
AND product_type = v_product_type
AND session_type = 'trim';

IF v_consolidated_id IS NULL THEN
-- Create new consolidated package
v_package_id := generate_consolidated_package_id(p_session_date, p_strain_abbreviation);

INSERT INTO consolidated_packages (
package_id, package_date, strain, strain_abbreviation,
product_stage, product_type, total_weight_grams,
session_type, session_count, source_session_ids
) VALUES (
v_package_id, p_session_date, p_strain, p_strain_abbreviation,
'Bulk', v_product_type, p_flower_grams,
'trim', 1, ARRAY[p_session_id]
)
RETURNING id INTO v_consolidated_id;
ELSE
-- Update existing consolidated package
UPDATE consolidated_packages
SET total_weight_grams = total_weight_grams + p_flower_grams,
session_count = session_count + 1,
source_session_ids = array_append(source_session_ids, p_session_id),
updated_at = now()
WHERE id = v_consolidated_id;
END IF;

-- Record source contribution
INSERT INTO consolidated_package_sources (
consolidated_package_id, session_id, session_type,
session_date, contribution_weight_grams
) VALUES (
v_consolidated_id, p_session_id, 'trim',
p_session_date, p_flower_grams
);
END IF;

-- Process Bulk Smalls if any
IF p_smalls_grams > 0 THEN
v_product_type := 'Smalls';

SELECT id, package_id INTO v_consolidated_id, v_package_id
FROM consolidated_packages
WHERE package_date = p_session_date
AND strain = p_strain
AND product_stage = 'Bulk'
AND product_type = v_product_type
AND session_type = 'trim';

IF v_consolidated_id IS NULL THEN
v_package_id := generate_consolidated_package_id(p_session_date, p_strain_abbreviation);

INSERT INTO consolidated_packages (
package_id, package_date, strain, strain_abbreviation,
product_stage, product_type, total_weight_grams,
session_type, session_count, source_session_ids
) VALUES (
v_package_id, p_session_date, p_strain, p_strain_abbreviation,
'Bulk', v_product_type, p_smalls_grams,
'trim', 1, ARRAY[p_session_id]
)
RETURNING id INTO v_consolidated_id;
ELSE
UPDATE consolidated_packages
SET total_weight_grams = total_weight_grams + p_smalls_grams,
session_count = session_count + 1,
source_session_ids = array_append(source_session_ids, p_session_id),
updated_at = now()
WHERE id = v_consolidated_id;
END IF;

INSERT INTO consolidated_package_sources (
consolidated_package_id, session_id, session_type,
session_date, contribution_weight_grams
) VALUES (
v_consolidated_id, p_session_id, 'trim',
p_session_date, p_smalls_grams
);
END IF;

-- Process Bulk Trim if any
IF p_trim_grams > 0 THEN
v_product_type := 'Trim';

SELECT id, package_id INTO v_consolidated_id, v_package_id
FROM consolidated_packages
WHERE package_date = p_session_date
AND strain = p_strain
AND product_stage = 'Bulk'
AND product_type = v_product_type
AND session_type = 'trim';

IF v_consolidated_id IS NULL THEN
v_package_id := generate_consolidated_package_id(p_session_date, p_strain_abbreviation);

INSERT INTO consolidated_packages (
package_id, package_date, strain, strain_abbreviation,
product_stage, product_type, total_weight_grams,
session_type, session_count, source_session_ids
) VALUES (
v_package_id, p_session_date, p_strain, p_strain_abbreviation,
'Bulk', v_product_type, p_trim_grams,
'trim', 1, ARRAY[p_session_id]
)
RETURNING id INTO v_consolidated_id;
ELSE
UPDATE consolidated_packages
SET total_weight_grams = total_weight_grams + p_trim_grams,
session_count = session_count + 1,
source_session_ids = array_append(source_session_ids, p_session_id),
updated_at = now()
WHERE id = v_consolidated_id;
END IF;

INSERT INTO consolidated_package_sources (
consolidated_package_id, session_id, session_type,
session_date, contribution_weight_grams
) VALUES (
v_consolidated_id, p_session_id, 'trim',
p_session_date, p_trim_grams
);
END IF;
END;
$function$
;

-- Function: consume_source_on_session_complete
CREATE OR REPLACE FUNCTION public.consume_source_on_session_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
v_source_package_id TEXT;
v_consumed_weight NUMERIC;
v_inventory_item_id UUID;
v_operator_name TEXT;
BEGIN
IF OLD.session_status != 'completed' AND NEW.session_status = 'completed' THEN

IF TG_TABLE_NAME = 'bucking_sessions' THEN
v_source_package_id := NEW.binned_package_id;
v_consumed_weight := NEW.binned_weight_grams;
v_operator_name := COALESCE(NEW.bucker_name, 'unknown');
ELSIF TG_TABLE_NAME = 'trim_sessions' THEN
v_source_package_id := NEW.package_id;
v_consumed_weight := NEW.pulled_weight;
v_operator_name := COALESCE(NEW.trimmer_name, 'unknown');
ELSIF TG_TABLE_NAME = 'packaging_sessions' THEN
v_source_package_id := NEW.package_id;
v_consumed_weight := NEW.pull_weight;
v_operator_name := COALESCE(NEW.packager_name, 'unknown');
ELSE
RAISE WARNING 'consume_source_on_session_complete: unknown table %', TG_TABLE_NAME;
RETURN NEW;
END IF;

IF v_source_package_id IS NULL OR v_consumed_weight IS NULL OR v_consumed_weight <= 0 THEN
RAISE WARNING 'consume_source_on_session_complete: skipping - no source package or weight for session %', NEW.id;
RETURN NEW;
END IF;

SELECT id INTO v_inventory_item_id
FROM inventory_items
WHERE package_id = v_source_package_id;

IF v_inventory_item_id IS NULL THEN
RAISE WARNING 'consume_source_on_session_complete: source item % not found', v_source_package_id;
RETURN NEW;
END IF;

PERFORM set_config('app.allow_quantity_update', 'true', true);

UPDATE inventory_items
SET
on_hand_qty = GREATEST(0, on_hand_qty - v_consumed_weight),
reserved_qty = GREATEST(0, reserved_qty - v_consumed_weight),
available_qty = GREATEST(0, on_hand_qty - v_consumed_weight) - GREATEST(0, reserved_qty - v_consumed_weight),
last_updated = now()
WHERE id = v_inventory_item_id;

PERFORM set_config('app.allow_quantity_update', 'false', true);

INSERT INTO inventory_movements (
movement_kind,
source_item_id,
qty,
unit,
reference_id,
reference_type,
reason_code,
notes,
movement_date,
created_by
) VALUES (
'CONSUME',
v_inventory_item_id,
v_consumed_weight,
'g',
NEW.id,
TG_TABLE_NAME,
'session_finalization',
format('Source consumed: %s g from %s on %s completion by %s',
v_consumed_weight,
v_source_package_id,
TG_TABLE_NAME,
v_operator_name
),
now(),
COALESCE(auth.uid()::text, 'system')
);

RAISE NOTICE 'consume_source_on_session_complete: consumed % g from % for session %',
v_consumed_weight, v_source_package_id, NEW.id;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: create_order_item_fulfillment_checklist
CREATE OR REPLACE FUNCTION public.create_order_item_fulfillment_checklist()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
INSERT INTO order_fulfillment_checklist (order_id, order_item_id)
VALUES (NEW.order_id, NEW.id)
ON CONFLICT (order_item_id) DO NOTHING;

RETURN NEW;
END;
$function$
;

-- Function: create_reconciliation_movement
CREATE OR REPLACE FUNCTION public.create_reconciliation_movement(p_item_id uuid, p_counted_qty numeric, p_reason_code text DEFAULT 'physical_count'::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
v_movement_id uuid;
v_current_qty numeric;
v_ledger_qty numeric;
BEGIN
-- Get current quantities
SELECT on_hand_qty INTO v_current_qty
FROM inventory_items
WHERE id = p_item_id;

SELECT calculate_ledger_quantity(p_item_id) INTO v_ledger_qty;

-- Create reconciliation movement
INSERT INTO inventory_movements (
movement_kind,
dest_item_id,
qty,
unit,
reason_code,
reference_type,
notes,
created_by
) VALUES (
'RECONCILIATION',
p_item_id,
p_counted_qty,
'g',
p_reason_code,
'manual_reconciliation',
COALESCE(
p_notes,
format(
'Reconciliation: Current=%s, Ledger=%s, Counted=%s',
v_current_qty,
v_ledger_qty,
p_counted_qty
)
),
auth.uid()
)
RETURNING id INTO v_movement_id;

RETURN v_movement_id;
END;
$function$
;

-- Function: crm_dashboard_stats_by_range
CREATE OR REPLACE FUNCTION public.crm_dashboard_stats_by_range(p_start_date date, p_end_date date)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
result json;
period_days integer;
prev_start date;
prev_end date;
BEGIN
period_days := p_end_date - p_start_date;
prev_end := p_start_date - 1;
prev_start := prev_end - period_days;

SELECT json_build_object(
'period_revenue', COALESCE(curr.revenue, 0),
'period_orders', COALESCE(curr.order_count, 0),
'period_avg_order', CASE WHEN COALESCE(curr.order_count, 0) > 0 
THEN ROUND(COALESCE(curr.revenue, 0) / curr.order_count, 2) ELSE 0 END,
'prev_period_revenue', COALESCE(prev.revenue, 0),
'prev_period_orders', COALESCE(prev.order_count, 0),
'prev_period_avg_order', CASE WHEN COALESCE(prev.order_count, 0) > 0 
THEN ROUND(COALESCE(prev.revenue, 0) / prev.order_count, 2) ELSE 0 END,
'active_accounts', COALESCE(accts.active_count, 0),
'total_accounts', COALESCE(accts.total_count, 0),
'at_risk_count', COALESCE(accts.at_risk_count, 0),
'prospect_count', COALESCE(accts.prospect_count, 0),
'unique_customers_in_period', COALESCE(curr.unique_customers, 0)
) INTO result
FROM
(SELECT 
SUM(total_amount) AS revenue,
COUNT(*)::int AS order_count,
COUNT(DISTINCT customer_id)::int AS unique_customers
FROM orders
WHERE test_mode = false AND archived = false
AND order_date::date >= p_start_date AND order_date::date <= p_end_date
) curr,
(SELECT
SUM(total_amount) AS revenue,
COUNT(*)::int AS order_count
FROM orders
WHERE test_mode = false AND archived = false
AND order_date::date >= prev_start AND order_date::date <= prev_end
) prev,
(SELECT
COUNT(*) FILTER (WHERE account_status = 'active')::int AS active_count,
COUNT(*)::int AS total_count,
COUNT(*) FILTER (
WHERE account_status = 'active'
AND (SELECT MAX(o.order_date) FROM orders o WHERE o.customer_id = c.id AND o.test_mode = false) < now() - interval '30 days'
)::int AS at_risk_count,
COUNT(*) FILTER (WHERE account_status = 'prospect')::int AS prospect_count
FROM customers c
) accts;

RETURN result;
END;
$function$
;

-- Function: crm_product_mix_by_customer_range
CREATE OR REPLACE FUNCTION public.crm_product_mix_by_customer_range(p_customer_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(customer_id uuid, customer_name text, product_id uuid, product_name text, product_type text, product_category text, strain text, total_units integer, total_revenue numeric, avg_unit_price numeric, first_order_date date, last_order_date date, order_count integer)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
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
JOIN orders o ON o.id = oi.order_id
AND o.test_mode = false AND o.archived = false
AND o.order_date::date >= p_start_date AND o.order_date::date <= p_end_date
JOIN customers c ON c.id = o.customer_id
JOIN products p ON p.id = oi.product_id
WHERE c.id = p_customer_id
GROUP BY c.id, c.name, p.id, p.name, p.type, p.product_category, oi.strain
ORDER BY SUM(oi.subtotal) DESC;
END;
$function$
;

-- Function: crm_sku_performance_by_range
CREATE OR REPLACE FUNCTION public.crm_sku_performance_by_range(p_start_date date, p_end_date date)
 RETURNS TABLE(product_id uuid, product_name text, sku text, product_type text, product_category text, strain text, order_count integer, total_units_sold numeric, total_revenue numeric, avg_unit_price numeric, unique_customers integer)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
SELECT
p.id AS product_id,
p.name AS product_name,
p.sku,
p.type AS product_type,
p.product_category,
p.strain,
COUNT(DISTINCT oi.order_id)::int AS order_count,
SUM(oi.quantity) AS total_units_sold,
SUM(oi.subtotal) AS total_revenue,
ROUND(AVG(oi.unit_price), 2) AS avg_unit_price,
COUNT(DISTINCT o.customer_id)::int AS unique_customers
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN orders o ON oi.order_id = o.id
AND o.test_mode = false AND o.archived = false
AND o.order_date::date >= p_start_date AND o.order_date::date <= p_end_date
GROUP BY p.id, p.name, p.sku, p.type, p.product_category, p.strain
ORDER BY SUM(oi.subtotal) DESC
LIMIT 50;
END;
$function$
;

-- Function: crm_top_accounts_by_range
CREATE OR REPLACE FUNCTION public.crm_top_accounts_by_range(p_start_date date, p_end_date date)
 RETURNS TABLE(id uuid, name text, dispensary_code text, account_type text, account_status text, parent_customer_id uuid, period_revenue numeric, period_orders integer, period_avg_order numeric, last_order_in_period date, child_period_revenue numeric, child_period_orders integer, total_revenue numeric, days_since_last_order integer)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
SELECT
c.id,
c.name,
c.dispensary_code,
c.account_type,
c.account_status,
c.parent_customer_id,
COALESCE(direct.revenue, 0) AS period_revenue,
COALESCE(direct.order_count, 0)::integer AS period_orders,
CASE WHEN COALESCE(direct.order_count, 0) > 0
THEN ROUND(COALESCE(direct.revenue, 0) / direct.order_count, 2)
ELSE 0 END AS period_avg_order,
direct.last_order::date AS last_order_in_period,
COALESCE(child.revenue, 0) AS child_period_revenue,
COALESCE(child.order_count, 0)::integer AS child_period_orders,
COALESCE(alltime.revenue, 0) AS total_revenue,
EXTRACT(day FROM now() - alltime.last_order)::integer AS days_since_last_order
FROM customers c
LEFT JOIN LATERAL (
SELECT
SUM(o.total_amount) AS revenue,
COUNT(*)::int AS order_count,
MAX(o.order_date) AS last_order
FROM orders o
WHERE o.customer_id = c.id
AND o.test_mode = false AND o.archived = false
AND o.order_date::date >= p_start_date AND o.order_date::date <= p_end_date
) direct ON true
LEFT JOIN LATERAL (
SELECT
SUM(o.total_amount) AS revenue,
COUNT(*)::int AS order_count
FROM orders o
WHERE o.customer_id IN (
SELECT ch.id FROM customers ch WHERE ch.parent_customer_id = c.id
)
AND o.test_mode = false AND o.archived = false
AND o.order_date::date >= p_start_date AND o.order_date::date <= p_end_date
) child ON c.account_type = 'hub_parent'
LEFT JOIN LATERAL (
SELECT
SUM(o.total_amount) AS revenue,
MAX(o.order_date) AS last_order
FROM orders o
WHERE o.customer_id = c.id
AND o.test_mode = false
) alltime ON true
WHERE c.account_type != 'hub_child'
AND (COALESCE(direct.order_count, 0) > 0 OR COALESCE(child.order_count, 0) > 0 OR COALESCE(alltime.revenue, 0) > 0)
ORDER BY (COALESCE(direct.revenue, 0) + COALESCE(child.revenue, 0)) DESC
LIMIT 15;
END;
$function$
;

-- Function: disable_movement_trigger
CREATE OR REPLACE FUNCTION public.disable_movement_trigger()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
-- Check if user is admin
IF NOT is_admin() THEN
RAISE EXCEPTION 'Only admins can disable triggers';
END IF;

-- Disable trigger
ALTER TABLE inventory_movements DISABLE TRIGGER trg_update_inventory_on_hand;

RETURN 'Trigger disabled successfully. Re-enable with enable_movement_trigger()';
END;
$function$
;

-- Function: drop_deprecated_inventory_tables
CREATE OR REPLACE FUNCTION public.drop_deprecated_inventory_tables(confirm_text text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
-- Safety check: require explicit confirmation
IF confirm_text != 'I UNDERSTAND THIS WILL DELETE TABLES' THEN
RETURN 'ERROR: Must pass confirmation text: ''I UNDERSTAND THIS WILL DELETE TABLES''';
END IF;

-- Check if tables have data
IF EXISTS (SELECT 1 FROM internal_bucked_inventory LIMIT 1) THEN
RETURN 'ERROR: internal_bucked_inventory has data. Cannot drop.';
END IF;

IF EXISTS (SELECT 1 FROM internal_bulk_inventory LIMIT 1) THEN
RETURN 'ERROR: internal_bulk_inventory has data. Cannot drop.';
END IF;

IF EXISTS (SELECT 1 FROM internal_packaged_inventory LIMIT 1) THEN
RETURN 'ERROR: internal_packaged_inventory has data. Cannot drop.';
END IF;

-- Drop tables
DROP TABLE IF EXISTS internal_bucked_inventory CASCADE;
DROP TABLE IF EXISTS internal_bulk_inventory CASCADE;
DROP TABLE IF EXISTS internal_packaged_inventory CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS inventory_reconciliation CASCADE;
DROP TABLE IF EXISTS inventory_variances CASCADE;
DROP TABLE IF EXISTS order_fulfillment_items CASCADE;

-- Drop the view since tables are gone
DROP VIEW IF EXISTS deprecated_table_status CASCADE;

RETURN 'SUCCESS: All deprecated inventory tables have been dropped.';
END;
$function$
;

-- Function: enable_movement_trigger
CREATE OR REPLACE FUNCTION public.enable_movement_trigger()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
-- Check if user is admin
IF NOT is_admin() THEN
RAISE EXCEPTION 'Only admins can enable triggers';
END IF;

-- Enable trigger
ALTER TABLE inventory_movements ENABLE TRIGGER trg_update_inventory_on_hand;

RETURN 'Trigger enabled successfully';
END;
$function$
;

-- Function: ensure_inventory_item_strain_from_batch
CREATE OR REPLACE FUNCTION public.ensure_inventory_item_strain_from_batch()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
-- If inserting/updating with a batch_id, inherit strain_id from batch
IF NEW.batch_id IS NOT NULL THEN
SELECT strain_id INTO NEW.strain_id
FROM batch_registry
WHERE id = NEW.batch_id;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: ensure_packaging_session_strain_from_batch
CREATE OR REPLACE FUNCTION public.ensure_packaging_session_strain_from_batch()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
-- If strain_id not provided, inherit from batch
IF NEW.strain_id IS NULL AND NEW.batch_registry_id IS NOT NULL THEN
SELECT strain_id INTO NEW.strain_id
FROM batch_registry
WHERE id = NEW.batch_registry_id;
END IF;

-- Also populate text field from strain_id (backward compatibility)
IF NEW.strain_id IS NOT NULL AND (NEW.strain IS NULL OR NEW.strain = '') THEN
SELECT name INTO NEW.strain
FROM strains
WHERE id = NEW.strain_id;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: ensure_trim_session_strain_from_batch
CREATE OR REPLACE FUNCTION public.ensure_trim_session_strain_from_batch()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
-- If strain_id not provided, inherit from batch
IF NEW.strain_id IS NULL AND NEW.batch_registry_id IS NOT NULL THEN
SELECT strain_id INTO NEW.strain_id
FROM batch_registry
WHERE id = NEW.batch_registry_id;
END IF;

-- Also populate text field from strain_id (backward compatibility)
IF NEW.strain_id IS NOT NULL AND (NEW.strain IS NULL OR NEW.strain = '') THEN
SELECT name INTO NEW.strain
FROM strains
WHERE id = NEW.strain_id;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: exec_sql
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  clean_query text;
BEGIN
  clean_query := regexp_replace(trim(query), ';\s*$', '');
  EXECUTE format('SELECT json_agg(row_to_json(t)) FROM (%s) t', clean_query) INTO result;
  RETURN COALESCE(result, '[]'::json);
END;
$function$
;

-- Function: export_table_count
CREATE OR REPLACE FUNCTION public.export_table_count(p_table_name text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  cnt bigint;
BEGIN
  EXECUTE format('SELECT COUNT(*) FROM %I', p_table_name) INTO cnt;
  RETURN cnt;
END;
$function$
;

-- Function: export_table_inserts
CREATE OR REPLACE FUNCTION public.export_table_inserts(p_table_name text, p_order_by text DEFAULT 'id'::text, p_limit integer DEFAULT 10000, p_offset integer DEFAULT 0)
 RETURNS TABLE(row_num bigint, insert_sql text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  col_list text;
  val_expr text;
  q text;
BEGIN
  SELECT 
    string_agg(c.column_name, ', ' ORDER BY c.ordinal_position),
    string_agg(
      CASE 
        WHEN c.data_type IN ('uuid','text','character varying','character','date','timestamp with time zone','timestamp without time zone','jsonb','json','USER-DEFINED','ARRAY') THEN
          'COALESCE(quote_literal(' || quote_ident(c.column_name) || '::text), ''NULL'')'
        WHEN c.data_type IN ('boolean') THEN
          'CASE WHEN ' || quote_ident(c.column_name) || ' IS NULL THEN ''NULL'' WHEN ' || quote_ident(c.column_name) || ' THEN ''true'' ELSE ''false'' END'
        WHEN c.data_type IN ('integer','bigint','smallint','numeric','real','double precision') THEN
          'COALESCE(' || quote_ident(c.column_name) || '::text, ''NULL'')'
        ELSE
          'COALESCE(quote_literal(' || quote_ident(c.column_name) || '::text), ''NULL'')'
      END,
      ' || '', '' || ' ORDER BY c.ordinal_position
    )
  INTO col_list, val_expr
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = p_table_name;

  IF col_list IS NULL THEN
    RAISE EXCEPTION 'Table % not found in public schema', p_table_name;
  END IF;

  q := format(
    'SELECT ROW_NUMBER() OVER() AS row_num, ''INSERT INTO %I (%s) VALUES ('' || %s || '');'' AS insert_sql FROM %I ORDER BY %s LIMIT %s OFFSET %s',
    p_table_name, col_list, val_expr, p_table_name, p_order_by, p_limit, p_offset
  );

  RETURN QUERY EXECUTE q;
END;
$function$
;

-- Function: finalize_session_aggregated
CREATE OR REPLACE FUNCTION public.finalize_session_aggregated(p_batch_id uuid, p_product_name text DEFAULT NULL::text, p_session_type text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_session_type TEXT;
v_sessions_finalized INTEGER := 0;
v_session_ids UUID[];
v_inventory_item_id UUID;
v_package_id TEXT;
v_batch_number TEXT;
v_strain_id UUID;
v_strain_name TEXT;
v_net_weight NUMERIC;
v_total_units NUMERIC;
v_package_date DATE;
v_packaged_stage_id UUID := '323ee0fe-1342-4b26-9379-c373f3cabbb9';
v_error_message TEXT;
BEGIN
IF p_session_type IS NULL THEN
SELECT
CASE
WHEN EXISTS(SELECT 1 FROM trim_sessions WHERE batch_registry_id = p_batch_id AND session_status = 'completed') THEN 'trim'
WHEN EXISTS(SELECT 1 FROM packaging_sessions WHERE batch_registry_id = p_batch_id AND session_status = 'completed') THEN 'packaging'
WHEN EXISTS(SELECT 1 FROM bucking_sessions WHERE batch_registry_id = p_batch_id AND session_status = 'completed') THEN 'bucking'
ELSE NULL
END INTO v_session_type;
ELSE
v_session_type := p_session_type;
END IF;

IF v_session_type IS NULL THEN
RAISE EXCEPTION 'No completed sessions found for batch %', p_batch_id;
END IF;

CASE v_session_type
WHEN 'trim' THEN
IF p_product_name = 'Bulk Trim (Trimmed)' OR p_product_name IS NULL THEN
SELECT array_agg(id) INTO v_session_ids
FROM trim_sessions
WHERE batch_registry_id = p_batch_id
AND session_status = 'completed'
AND finalization_status_trim = 'pending'
AND output_product_trim_name = 'Bulk Trim (Trimmed)';

IF v_session_ids IS NOT NULL AND array_length(v_session_ids, 1) > 0 THEN
UPDATE trim_sessions
SET finalization_status_trim = 'finalized',
finalized_at_trim = NOW(),
finalized_by_trim = auth.uid()
WHERE id = ANY(v_session_ids);
GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
END IF;
END IF;

IF p_product_name = 'Bulk Flower (Trimmed)' OR p_product_name IS NULL THEN
SELECT array_agg(id) INTO v_session_ids
FROM trim_sessions
WHERE batch_registry_id = p_batch_id
AND session_status = 'completed'
AND finalization_status_bigs = 'pending'
AND output_product_bigs_name = 'Bulk Flower (Trimmed)';

IF v_session_ids IS NOT NULL AND array_length(v_session_ids, 1) > 0 THEN
UPDATE trim_sessions
SET finalization_status_bigs = 'finalized',
finalized_at_bigs = NOW(),
finalized_by_bigs = auth.uid()
WHERE id = ANY(v_session_ids);
GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
END IF;
END IF;

IF p_product_name = 'Bulk Smalls (Trimmed)' OR p_product_name IS NULL THEN
SELECT array_agg(id) INTO v_session_ids
FROM trim_sessions
WHERE batch_registry_id = p_batch_id
AND session_status = 'completed'
AND finalization_status_smalls = 'pending'
AND output_product_smalls_name = 'Bulk Smalls (Trimmed)';

IF v_session_ids IS NOT NULL AND array_length(v_session_ids, 1) > 0 THEN
UPDATE trim_sessions
SET finalization_status_smalls = 'finalized',
finalized_at_smalls = NOW(),
finalized_by_smalls = auth.uid()
WHERE id = ANY(v_session_ids);
GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
END IF;
END IF;

WHEN 'packaging' THEN
SELECT array_agg(id) INTO v_session_ids
FROM packaging_sessions
WHERE batch_registry_id = p_batch_id
AND session_status = 'completed'
AND finalization_status_packaged = 'pending'
AND (output_product_name = p_product_name OR p_product_name IS NULL);

IF v_session_ids IS NOT NULL AND array_length(v_session_ids, 1) > 0 THEN
BEGIN
SELECT
(SELECT strain_id FROM packaging_sessions WHERE id = ANY(v_session_ids) LIMIT 1),
SUM(COALESCE(units_3_5g, 0) + COALESCE(units_14g, 0) + COALESCE(units_454g, 0)),
MAX(completed_at)::DATE
INTO v_strain_id, v_total_units, v_package_date
FROM packaging_sessions
WHERE id = ANY(v_session_ids);

IF v_strain_id IS NULL THEN
RAISE EXCEPTION 'Cannot finalize: strain_id is NULL for batch %', p_batch_id;
END IF;

IF v_total_units IS NULL OR v_total_units <= 0 THEN
RAISE EXCEPTION 'Cannot finalize: total_units is % for batch %', v_total_units, p_batch_id;
END IF;

SELECT batch_number INTO v_batch_number FROM batch_registry WHERE id = p_batch_id;

IF v_batch_number IS NULL THEN
RAISE EXCEPTION 'Cannot finalize: batch_number not found for batch %', p_batch_id;
END IF;

SELECT name INTO v_strain_name FROM strains WHERE id = v_strain_id;

IF p_product_name IS NOT NULL AND p_product_name ~ '\d+\.?\d*g' THEN
v_net_weight := (substring(p_product_name from '(\d+\.?\d*)g'))::numeric;
ELSE
v_net_weight := NULL;
END IF;

v_package_id := generate_next_package_id(p_batch_id);

INSERT INTO inventory_items (
package_id, batch_id, batch_number, strain_id, strain, batch,
product_name, product_stage_id, category, net_weight,
on_hand_qty, available_qty, reserved_qty, unit, status, package_date
) VALUES (
v_package_id, p_batch_id, v_batch_number, v_strain_id, v_strain_name, v_batch_number,
p_product_name, v_packaged_stage_id, 'Packaged', v_net_weight,
v_total_units, v_total_units, 0, 'unit', 'Available', v_package_date
)
RETURNING id INTO v_inventory_item_id;

INSERT INTO inventory_movements (
movement_kind, dest_item_id, qty, unit, reason_code, reference_type, notes, created_by
) VALUES (
'PRODUCE', v_inventory_item_id, v_total_units, 'unit', 'session_finalization', 'packaging_session',
format('Finalized %s units from %s packaging session(s) for batch %s',
v_total_units, array_length(v_session_ids, 1), v_batch_number),
COALESCE(auth.uid()::text, 'system')
);

UPDATE packaging_sessions
SET finalization_status_packaged = 'finalized',
finalized_at_packaged = NOW(),
finalized_by_packaged = auth.uid(),
finalization_status_14g = CASE WHEN COALESCE(units_14g, 0) > 0 THEN 'finalized' ELSE finalization_status_14g END,
finalized_at_14g = CASE WHEN COALESCE(units_14g, 0) > 0 THEN NOW() ELSE finalized_at_14g END,
finalized_by_14g = CASE WHEN COALESCE(units_14g, 0) > 0 THEN auth.uid() ELSE finalized_by_14g END,
finalization_status_3_5g = CASE WHEN COALESCE(units_3_5g, 0) > 0 THEN 'finalized' ELSE finalization_status_3_5g END,
finalized_at_3_5g = CASE WHEN COALESCE(units_3_5g, 0) > 0 THEN NOW() ELSE finalized_at_3_5g END,
finalized_by_3_5g = CASE WHEN COALESCE(units_3_5g, 0) > 0 THEN auth.uid() ELSE finalized_by_3_5g END,
finalization_status_1lb = CASE WHEN COALESCE(units_454g, 0) > 0 THEN 'finalized' ELSE finalization_status_1lb END,
finalized_at_1lb = CASE WHEN COALESCE(units_454g, 0) > 0 THEN NOW() ELSE finalized_at_1lb END,
finalized_by_1lb = CASE WHEN COALESCE(units_454g, 0) > 0 THEN auth.uid() ELSE finalized_by_1lb END
WHERE id = ANY(v_session_ids);

GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;

EXCEPTION
WHEN OTHERS THEN
GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
RAISE WARNING 'Packaging finalization failed for batch % product %: %',
p_batch_id, p_product_name, v_error_message;
RAISE EXCEPTION 'Failed to finalize packaging sessions: %', v_error_message;
END;
END IF;

WHEN 'bucking' THEN
IF p_product_name = 'Bulk Flower (Bucked)' OR p_product_name IS NULL THEN
SELECT array_agg(id) INTO v_session_ids
FROM bucking_sessions
WHERE batch_registry_id = p_batch_id
AND session_status = 'completed'
AND finalization_status_bucked = 'pending'
AND output_product_flower_name = 'Bulk Flower (Bucked)';

IF v_session_ids IS NOT NULL AND array_length(v_session_ids, 1) > 0 THEN
UPDATE bucking_sessions
SET finalization_status_bucked = 'finalized',
finalized_at_bucked = NOW(),
finalized_by_bucked = auth.uid()
WHERE id = ANY(v_session_ids);
GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
END IF;
END IF;

IF p_product_name = 'Bulk Smalls (Bucked)' OR p_product_name IS NULL THEN
SELECT array_agg(id) INTO v_session_ids
FROM bucking_sessions
WHERE batch_registry_id = p_batch_id
AND session_status = 'completed'
AND finalization_status_smalls = 'pending'
AND output_product_smalls_name = 'Bulk Smalls (Bucked)';

IF v_session_ids IS NOT NULL AND array_length(v_session_ids, 1) > 0 THEN
UPDATE bucking_sessions
SET finalization_status_smalls = 'finalized',
finalized_at_smalls = NOW(),
finalized_by_smalls = auth.uid()
WHERE id = ANY(v_session_ids);
GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
END IF;
END IF;

ELSE
RAISE EXCEPTION 'Invalid session type: %', v_session_type;
END CASE;

RETURN jsonb_build_object(
'success', true,
'batch_id', p_batch_id,
'product_name', p_product_name,
'session_type', v_session_type,
'sessions_finalized', COALESCE(v_sessions_finalized, 0),
'session_ids', v_session_ids,
'inventory_item_id', v_inventory_item_id,
'package_id', v_package_id,
'total_units', v_total_units
);
END;
$function$
;

-- Function: find_strain_by_name
CREATE OR REPLACE FUNCTION public.find_strain_by_name(p_strain_name text, OUT strain_id uuid, OUT strain_name text, OUT strain_abbreviation text, OUT match_quality text)
 RETURNS record
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
v_normalized text;
BEGIN
-- Normalize input
v_normalized := LOWER(TRIM(p_strain_name));

-- Try exact match first (case-insensitive)
SELECT id, name, abbreviation, 'exact'
INTO strain_id, strain_name, strain_abbreviation, match_quality
FROM strains
WHERE LOWER(TRIM(name)) = v_normalized
AND is_active = true
LIMIT 1;

IF strain_id IS NOT NULL THEN
RETURN;
END IF;

-- Try partial match (starts with)
SELECT id, name, abbreviation, 'partial'
INTO strain_id, strain_name, strain_abbreviation, match_quality
FROM strains
WHERE LOWER(TRIM(name)) LIKE v_normalized || '%'
AND is_active = true
ORDER BY LENGTH(name)
LIMIT 1;

IF strain_id IS NOT NULL THEN
RETURN;
END IF;

-- Try contains match
SELECT id, name, abbreviation, 'contains'
INTO strain_id, strain_name, strain_abbreviation, match_quality
FROM strains
WHERE LOWER(TRIM(name)) LIKE '%' || v_normalized || '%'
AND is_active = true
ORDER BY LENGTH(name)
LIMIT 1;

-- If still nothing found, return null with 'not_found' quality
IF strain_id IS NULL THEN
match_quality := 'not_found';
END IF;

RETURN;
END;
$function$
;

-- Function: fix_strain_data_quality_issues
CREATE OR REPLACE FUNCTION public.fix_strain_data_quality_issues()
 RETURNS TABLE(issue_type text, fixed_count integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
v_products_fixed integer := 0;
v_order_items_fixed integer := 0;
v_batches_fixed integer := 0;
v_strain_id uuid;
BEGIN
-- Fix products missing strain_id
SELECT * INTO v_products_fixed FROM sync_product_strain_ids();

-- Fix order items missing strain
SELECT * INTO v_order_items_fixed FROM sync_order_item_strains();

-- Fix batches missing strain_id
UPDATE batch_registry br
SET strain_id = s.id
FROM strains s
WHERE lower(br.strain) = lower(s.name)
AND br.strain_id IS NULL
AND br.strain IS NOT NULL;

GET DIAGNOSTICS v_batches_fixed = ROW_COUNT;

-- Return results
RETURN QUERY 
SELECT 'products_fixed'::text, v_products_fixed
UNION ALL
SELECT 'order_items_fixed'::text, v_order_items_fixed
UNION ALL
SELECT 'batches_fixed'::text, v_batches_fixed;
END;
$function$
;

-- Function: fn_apply_audit_adjustments
CREATE OR REPLACE FUNCTION public.fn_apply_audit_adjustments(p_audit_id uuid, p_user_id uuid)
 RETURNS TABLE(adjustments_applied integer, variance_logs_created integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
line_record record;
movement_id uuid;
adjustments_count integer := 0;
variance_count integer := 0;
BEGIN
-- Validate audit is ready for completion
IF NOT EXISTS (
SELECT 1 FROM inventory_audits
WHERE id = p_audit_id
AND status = 'in_progress'
) THEN
RAISE EXCEPTION 'Audit is not in progress';
END IF;

-- Check all lines are confirmed
IF EXISTS (
SELECT 1 FROM inventory_audit_lines
WHERE audit_id = p_audit_id
AND confirmed = false
) THEN
RAISE EXCEPTION 'Not all audit lines are confirmed';
END IF;

-- Process each audit line
FOR line_record IN
SELECT *
FROM inventory_audit_lines
WHERE audit_id = p_audit_id
AND actual_qty IS NOT NULL
AND inventory_item_id IS NOT NULL
LOOP
-- Create RECONCILIATION movement
INSERT INTO inventory_movements (
source_item_id,
movement_kind,
qty,
unit,
reason_code,
notes,
occurred_at
)
VALUES (
line_record.inventory_item_id,
'RECONCILIATION',
line_record.actual_qty,
line_record.unit,
line_record.variance_reason::text,
'Audit reconciliation: ' || COALESCE(line_record.variance_notes, 'No notes provided'),
now()
)
RETURNING id INTO movement_id;

adjustments_count := adjustments_count + 1;

-- Create variance log entry if variance exists
IF line_record.variance_qty != 0 THEN
INSERT INTO variance_log (
source_type,
source_id,
inventory_item_id,
package_id,
expected_qty,
actual_qty,
variance_qty,
variance_percentage,
unit,
variance_reason,
notes,
inventory_stage,
strain,
batch,
product_name,
user_id,
movement_id
)
VALUES (
'audit_reconciliation',
p_audit_id,
line_record.inventory_item_id,
line_record.package_id,
line_record.expected_qty,
line_record.actual_qty,
line_record.variance_qty,
line_record.variance_percentage,
line_record.unit,
line_record.variance_reason,
line_record.variance_notes,
line_record.stage,
line_record.strain,
line_record.batch,
line_record.product_name,
p_user_id,
movement_id
);

variance_count := variance_count + 1;
END IF;
END LOOP;

-- Update audit status
UPDATE inventory_audits
SET status = 'completed',
completed_at = now(),
completed_by = p_user_id,
packages_with_variance = variance_count,
is_locked = false,
updated_at = now()
WHERE id = p_audit_id;

RETURN QUERY SELECT adjustments_count, variance_count;
END;
$function$
;

-- Function: fn_auto_generate_individual_plants
CREATE OR REPLACE FUNCTION public.fn_auto_generate_individual_plants()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
i integer;
existing_count integer;
BEGIN
-- Only act on clone → veg transition
IF OLD.growth_stage = 'clone' AND NEW.growth_stage = 'veg' THEN

-- Check if records already exist (e.g., manually added during clone stage)
SELECT COUNT(*) INTO existing_count
FROM individual_plants
WHERE plant_group_id = NEW.id AND is_active = true;

-- Only auto-generate if no active records exist yet
IF existing_count = 0 THEN
FOR i IN 1..COALESCE(NEW.plant_count, 0) LOOP
INSERT INTO individual_plants (plant_group_id, state_plant_id, is_active)
VALUES (NEW.id, fn_generate_plant_id(), true);
END LOOP;
END IF;

END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_auto_set_inventory_category
CREATE OR REPLACE FUNCTION public.fn_auto_set_inventory_category()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
v_stage_name text;
BEGIN
-- Only set category if not already set
IF NEW.category IS NOT NULL THEN
RETURN NEW;
END IF;

-- Get stage name from product_stage_id
IF NEW.product_stage_id IS NOT NULL THEN
SELECT name INTO v_stage_name
FROM product_stages
WHERE id = NEW.product_stage_id;

-- Map stage name to category
-- Note: Using lowercase for consistency with existing filter logic
CASE v_stage_name
WHEN 'Packaged' THEN
NEW.category := 'packaged';
WHEN 'Binned' THEN
NEW.category := 'binned';
WHEN 'Bucked' THEN
NEW.category := 'bucked';
WHEN 'Trimmed' THEN
NEW.category := 'bulk'; -- Trimmed products are bulk flower/smalls
ELSE
-- Default to stage name lowercase if no mapping
NEW.category := lower(v_stage_name);
END CASE;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_block_direct_quantity_updates
CREATE OR REPLACE FUNCTION public.fn_block_direct_quantity_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
-- Allow updates from triggers/system context
-- Check for security context flag set by authorized triggers
IF current_setting('app.allow_quantity_update', true) = 'true' THEN
RETURN NEW;
END IF;

-- Block direct UPDATE of on_hand_qty
IF TG_OP = 'UPDATE' AND OLD.on_hand_qty IS DISTINCT FROM NEW.on_hand_qty THEN
RAISE EXCEPTION 'Direct updates to on_hand_qty are not allowed. All quantity changes must flow through inventory_movements table.'
USING ERRCODE = 'integrity_constraint_violation',
HINT = 'Insert a row into inventory_movements with appropriate movement_kind instead.',
DETAIL = format('Item ID: %s, Attempted change: %s → %s', NEW.id, OLD.on_hand_qty, NEW.on_hand_qty);
END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_check_assignment_quantity_limit
CREATE OR REPLACE FUNCTION public.fn_check_assignment_quantity_limit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
v_ordered_qty numeric;
v_already_assigned numeric;
BEGIN
SELECT quantity INTO v_ordered_qty
FROM order_items
WHERE id = NEW.order_item_id;

IF v_ordered_qty IS NULL THEN
RAISE EXCEPTION 'Order item % not found', NEW.order_item_id;
END IF;

SELECT COALESCE(SUM(quantity_assigned), 0) INTO v_already_assigned
FROM package_assignments
WHERE order_item_id = NEW.order_item_id
AND status IN ('reserved', 'fulfilled');

IF v_already_assigned + NEW.quantity_assigned > v_ordered_qty THEN
RAISE EXCEPTION 'Over-allocation: assigning % would bring total to % against ordered qty of %',
NEW.quantity_assigned,
v_already_assigned + NEW.quantity_assigned,
v_ordered_qty;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_check_quarantine_before_movement
CREATE OR REPLACE FUNCTION public.fn_check_quarantine_before_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_batch_id uuid;
v_is_quarantined boolean;
v_quarantine_reason text;
v_batch_number text;
BEGIN
-- Only validate RESERVE and FULFILLMENT operations
IF NEW.movement_kind NOT IN ('RESERVE', 'FULFILLMENT') THEN
RETURN NEW;
END IF;

-- Get batch_id from source_item_id
IF NEW.source_item_id IS NOT NULL THEN
SELECT batch_id INTO v_batch_id
FROM inventory_items
WHERE id = NEW.source_item_id;
END IF;

-- Skip if no batch linkage
IF v_batch_id IS NULL THEN
RETURN NEW;
END IF;

-- Get batch quarantine status
SELECT 
is_quarantined,
quarantine_reason,
batch_number
INTO 
v_is_quarantined,
v_quarantine_reason,
v_batch_number
FROM batch_registry
WHERE id = v_batch_id;

-- Block if quarantined
IF v_is_quarantined = true THEN
-- Log violation
INSERT INTO quarantine_violation_log (
batch_id,
attempted_operation,
movement_kind,
order_id,
item_id,
blocked_by,
quarantine_reason,
violation_details
) VALUES (
v_batch_id,
NEW.movement_kind,
NEW.movement_kind,
NEW.order_id,
NEW.source_item_id,
NEW.created_by,
v_quarantine_reason,
jsonb_build_object(
'movement_id', NEW.id,
'qty', NEW.qty,
'unit', NEW.unit,
'blocked_at', now()
)
);

-- Raise standardized error
RAISE EXCEPTION 'QUARANTINE GATE: Cannot perform % operation on batch %. Batch is quarantined. Reason: %. Contact QC to release quarantine.',
NEW.movement_kind,
v_batch_number,
COALESCE(v_quarantine_reason, 'No reason provided')
USING ERRCODE = 'check_violation',
HINT = 'Release batch quarantine before attempting fulfillment or reservation operations.',
DETAIL = format('Batch ID: %s, Movement Kind: %s, Item ID: %s', v_batch_id, NEW.movement_kind, NEW.source_item_id);
END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_check_quarantine_on_session_start
CREATE OR REPLACE FUNCTION public.fn_check_quarantine_on_session_start()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_is_quarantined boolean;
v_quarantine_reason text;
v_batch_number text;
BEGIN
-- Only validate on session start (status = 'active')
IF NEW.session_status != 'active' OR (OLD.session_status IS NOT NULL AND OLD.session_status = 'active') THEN
RETURN NEW;
END IF;

-- Skip if no batch linkage
IF NEW.batch_registry_id IS NULL THEN
RETURN NEW;
END IF;

-- Get batch quarantine status
SELECT 
is_quarantined,
quarantine_reason,
batch_number
INTO 
v_is_quarantined,
v_quarantine_reason,
v_batch_number
FROM batch_registry
WHERE id = NEW.batch_registry_id;

-- WARNING only (allow sessions on quarantined batches for testing/QC)
IF v_is_quarantined = true THEN
RAISE WARNING 'Starting session on QUARANTINED batch %. Reason: %. Ensure QC approval before releasing output.',
v_batch_number,
COALESCE(v_quarantine_reason, 'No reason provided');
END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_check_stage_locked
CREATE OR REPLACE FUNCTION public.fn_check_stage_locked(stages text[])
 RETURNS TABLE(is_locked boolean, locked_by_audit uuid, audit_number text)
 LANGUAGE plpgsql
AS $function$
DECLARE
  stage_name text;
  active_audit_id uuid;
  active_audit_num text;
BEGIN
  -- Check for any active audit
  SELECT ia.id, ia.audit_number INTO active_audit_id, active_audit_num
  FROM inventory_audits ia
  WHERE ia.status IN ('initiated', 'in_progress')
    AND ia.is_locked = true
  LIMIT 1;

  IF active_audit_id IS NOT NULL THEN
    -- Check if any requested stage overlaps with active audit
    FOREACH stage_name IN ARRAY stages
    LOOP
      IF stage_name = ANY(
        SELECT unnest(selected_stages)
        FROM inventory_audits
        WHERE id = active_audit_id
      ) THEN
        RETURN QUERY SELECT true, active_audit_id, active_audit_num;
        RETURN;
      END IF;
    END LOOP;
  END IF;

  -- No lock found
  RETURN QUERY SELECT false, NULL::uuid, NULL::text;
END;
$function$
;

-- Function: fn_clear_placement_on_room_transfer
CREATE OR REPLACE FUNCTION public.fn_clear_placement_on_room_transfer()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.room_table_id := NULL;
NEW.room_section_id := NULL;
RETURN NEW;
END;
$function$
;

-- Function: fn_combine_inventory_packages
CREATE OR REPLACE FUNCTION public.fn_combine_inventory_packages(p_source_package_ids uuid[], p_new_package_id text, p_user_id uuid, p_variance_reason variance_reason DEFAULT NULL::variance_reason, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_source record;
v_first record;
v_total_qty numeric := 0;
v_unit text;
v_batch_id uuid;
v_product_id uuid;
v_product_stage_id uuid;
v_strain text;
v_product_name text;
v_batch_number text;
v_new_item_id uuid;
v_source_count int;
v_user_role text;
BEGIN
-- Validate user is admin
SELECT role INTO v_user_role
FROM user_profiles
WHERE id = p_user_id AND is_active = true;

IF v_user_role IS NULL THEN
RETURN jsonb_build_object('success', false, 'error', 'User not found or inactive');
END IF;

IF v_user_role != 'admin' THEN
RETURN jsonb_build_object('success', false, 'error', 'Only admins can combine packages');
END IF;

-- Validate minimum 2 packages
v_source_count := array_length(p_source_package_ids, 1);
IF v_source_count IS NULL OR v_source_count < 2 THEN
RETURN jsonb_build_object('success', false, 'error', 'At least 2 packages required');
END IF;

-- Validate new package_id doesn't exist
IF EXISTS (SELECT 1 FROM inventory_items WHERE package_id = p_new_package_id) THEN
RETURN jsonb_build_object('success', false, 'error', 'Package ID already exists: ' || p_new_package_id);
END IF;

-- Get first package for reference values
SELECT i.*, ps.name as stage_name, b.batch_number
INTO v_first
FROM inventory_items i
JOIN product_stages ps ON ps.id = i.product_stage_id
LEFT JOIN batches b ON b.id = i.batch_id
WHERE i.id = p_source_package_ids[1];

IF v_first IS NULL THEN
RETURN jsonb_build_object('success', false, 'error', 'First source package not found');
END IF;

v_unit := v_first.unit;
v_batch_id := v_first.batch_id;
v_product_id := v_first.product_id;
v_product_stage_id := v_first.product_stage_id;
v_strain := v_first.strain;
v_product_name := v_first.product_name;
v_batch_number := v_first.batch_number;

-- Validate all packages: same batch, product, stage, unit, qty > 0
FOR v_source IN
SELECT i.*
FROM inventory_items i
WHERE i.id = ANY(p_source_package_ids)
LOOP
IF v_source.on_hand_qty <= 0 THEN
RETURN jsonb_build_object('success', false, 'error', 'Package ' || v_source.package_id || ' has zero quantity');
END IF;
IF v_source.batch_id IS DISTINCT FROM v_batch_id THEN
RETURN jsonb_build_object('success', false, 'error', 'All packages must be from the same batch');
END IF;
IF v_source.product_id IS DISTINCT FROM v_product_id THEN
RETURN jsonb_build_object('success', false, 'error', 'All packages must be the same product');
END IF;
IF v_source.product_stage_id IS DISTINCT FROM v_product_stage_id THEN
RETURN jsonb_build_object('success', false, 'error', 'All packages must be at the same stage');
END IF;
IF v_source.unit IS DISTINCT FROM v_unit THEN
RETURN jsonb_build_object('success', false, 'error', 'All packages must use the same unit');
END IF;

v_total_qty := v_total_qty + v_source.on_hand_qty;
END LOOP;

-- Verify all source IDs were found
IF (SELECT count(*) FROM inventory_items WHERE id = ANY(p_source_package_ids)) != v_source_count THEN
RETURN jsonb_build_object('success', false, 'error', 'Not all source packages were found');
END IF;

-- Create CONSUME movements for each source (sets qty to 0)
FOR v_source IN
SELECT * FROM inventory_items WHERE id = ANY(p_source_package_ids)
LOOP
INSERT INTO inventory_movements (
movement_kind, source_item_id, qty, unit,
reason_code, notes, created_by, movement_date
) VALUES (
'CONSUME', v_source.id, 0, v_unit,
'combine_packages', 'Combined into ' || p_new_package_id,
p_user_id::text, now()
);
END LOOP;

-- Create the new combined inventory item
INSERT INTO inventory_items (
package_id, batch_id, product_id, product_stage_id,
on_hand_qty, available_qty, unit, strain, product_name,
batch, status
) VALUES (
p_new_package_id, v_batch_id, v_product_id, v_product_stage_id,
v_total_qty, v_total_qty, v_unit, v_strain, v_product_name,
v_batch_number, 'active'
)
RETURNING id INTO v_new_item_id;

-- Create PRODUCE movement for new item
INSERT INTO inventory_movements (
movement_kind, dest_item_id, qty, unit,
reason_code, notes, created_by, movement_date
) VALUES (
'PRODUCE', v_new_item_id, v_total_qty, v_unit,
'combine_packages', 'Combined from ' || v_source_count || ' source packages',
p_user_id::text, now()
);

-- Log to variance_log
INSERT INTO variance_log (
source_type, source_id, inventory_item_id, package_id,
expected_qty, actual_qty, variance_qty, variance_percentage,
unit, variance_reason, notes, inventory_stage,
strain, batch, product_name, user_id
) VALUES (
'combine_packages', v_new_item_id, v_new_item_id, p_new_package_id,
v_total_qty, v_total_qty, 0, 0,
v_unit, COALESCE(p_variance_reason, 'other'), 
COALESCE(p_notes, 'Combined from ' || v_source_count || ' source packages'),
v_first.stage_name, v_strain, v_batch_number, v_product_name, p_user_id
);

RETURN jsonb_build_object(
'success', true,
'new_package_id', p_new_package_id,
'new_item_id', v_new_item_id,
'combined_qty', v_total_qty,
'unit', v_unit,
'source_package_count', v_source_count,
'expected_qty', v_total_qty,
'variance_qty', 0,
'variance_percentage', 0,
'batch_id', v_batch_id,
'product_id', v_product_id,
'strain', v_strain,
'product_name', v_product_name
);
END;
$function$
;

-- Function: fn_complete_harvest_session
CREATE OR REPLACE FUNCTION public.fn_complete_harvest_session()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
v_strain_id      uuid;
v_strain_name    text;
v_strain_abbrev  text;
v_room_code      text;
v_batch_number   text;
v_batch_id       uuid;
v_date_prefix    text;
v_existing_batch uuid;
BEGIN
IF NEW.session_status != 'completed' THEN
RETURN NEW;
END IF;

SELECT pg.strain_id, pg.batch_registry_id, gr.room_code
INTO v_strain_id, v_existing_batch, v_room_code
FROM plant_groups pg
JOIN grow_rooms gr ON gr.id = pg.grow_room_id
WHERE pg.id = NEW.plant_group_id;

SELECT name, abbreviation INTO v_strain_name, v_strain_abbrev
FROM strains WHERE id = v_strain_id;

IF v_strain_abbrev IS NULL OR v_strain_abbrev = '' THEN
RAISE EXCEPTION
'Cannot complete harvest: strain "%" has no abbreviation set. Set the abbreviation in Settings → Strains first.',
v_strain_name;
END IF;

v_date_prefix  := to_char(NEW.harvest_date, 'YYMMDD');
v_batch_number := v_date_prefix || '-' || v_strain_abbrev;

IF v_existing_batch IS NOT NULL THEN
UPDATE batch_registry
SET
harvest_date          = NEW.harvest_date,
initial_weight_grams  = NEW.wet_weight_grams,
room                  = v_room_code,
lifecycle_state       = 'created',
batch_number          = v_batch_number,
updated_at            = now()
WHERE id = v_existing_batch;

v_batch_id := v_existing_batch;
ELSE
INSERT INTO batch_registry (
batch_number,
strain,
strain_id,
harvest_date,
initial_weight_grams,
room,
lifecycle_state,
created_by
) VALUES (
v_batch_number,
v_strain_name,
v_strain_id,
NEW.harvest_date,
NEW.wet_weight_grams,
v_room_code,
'created',
NEW.completed_by
)
ON CONFLICT (batch_number) DO NOTHING
RETURNING id INTO v_batch_id;

IF v_batch_id IS NULL THEN
SELECT id INTO v_batch_id
FROM batch_registry
WHERE batch_number = v_batch_number;
END IF;
END IF;

NEW.batch_registry_id := v_batch_id;
NEW.completed_at := COALESCE(NEW.completed_at, now());

UPDATE plant_groups
SET growth_stage = 'harvested', updated_at = now()
WHERE id = NEW.plant_group_id;

INSERT INTO batch_production_history (
batch_id,
event_type,
source_weight_grams,
notes,
performed_by
) VALUES (
v_batch_id,
'batch_created',
NEW.wet_weight_grams,
'Batch created from harvest session ' || NEW.id,
NEW.completed_by::text
);

RETURN NEW;
END;
$function$
;

-- Function: fn_fulfill_inventory_on_order_complete
CREATE OR REPLACE FUNCTION public.fn_fulfill_inventory_on_order_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_assignment RECORD;
v_inventory_item RECORD;
BEGIN
IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
RETURN NEW;
END IF;

FOR v_assignment IN
SELECT * FROM package_assignments
WHERE order_id = NEW.id AND status = 'reserved'
LOOP
SELECT * INTO v_inventory_item
FROM inventory_items
WHERE package_id = v_assignment.package_id;

IF NOT FOUND THEN
RAISE WARNING 'Inventory item % not found during order completion', v_assignment.package_id;
CONTINUE;
END IF;

PERFORM set_config('app.allow_quantity_update', 'true', true);

UPDATE inventory_items
SET
on_hand_qty = GREATEST(0, COALESCE(on_hand_qty, 0) - v_assignment.quantity_assigned),
reserved_qty = GREATEST(0, COALESCE(reserved_qty, 0) - v_assignment.quantity_assigned),
available_qty = GREATEST(0, COALESCE(on_hand_qty, 0) - v_assignment.quantity_assigned)
- GREATEST(0, COALESCE(reserved_qty, 0) - v_assignment.quantity_assigned),
last_updated = now()
WHERE id = v_inventory_item.id;

PERFORM set_config('app.allow_quantity_update', 'false', true);

INSERT INTO inventory_movements (
movement_kind,
source_item_id,
qty,
unit,
reference_id,
reference_type,
reason_code,
notes,
movement_date
) VALUES (
'FULFILLMENT',
v_inventory_item.id,
v_assignment.quantity_assigned,
COALESCE(v_inventory_item.unit, 'unit'),
NEW.id,
'order',
'order_fulfillment',
format('Fulfilled %s %s of %s for order %s',
v_assignment.quantity_assigned,
COALESCE(v_inventory_item.unit, 'unit'),
v_assignment.package_id,
COALESCE(NEW.order_number, NEW.id::text)
),
now()
);

UPDATE package_assignments
SET status = 'fulfilled', updated_at = now()
WHERE id = v_assignment.id;
END LOOP;

RETURN NEW;
END;
$function$
;

-- Function: fn_generate_audit_number
CREATE OR REPLACE FUNCTION public.fn_generate_audit_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
today_date text;
sequence_num integer;
audit_num text;
BEGIN
-- Format: AUD-YYYYMMDD-NNN
today_date := to_char(CURRENT_DATE, 'YYYYMMDD');

-- Get next sequence number for today
SELECT COALESCE(MAX(
CASE
WHEN audit_number ~ ('^AUD-' || today_date || '-[0-9]+$')
THEN CAST(substring(audit_number from '[0-9]+$') AS integer)
ELSE 0
END
), 0) + 1
INTO sequence_num
FROM inventory_audits
WHERE audit_number LIKE 'AUD-' || today_date || '-%';

-- Format with leading zeros
audit_num := 'AUD-' || today_date || '-' || LPAD(sequence_num::text, 3, '0');

RETURN audit_num;
END;
$function$
;

-- Function: fn_generate_plant_group_number
CREATE OR REPLACE FUNCTION public.fn_generate_plant_group_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
v_abbrev      text;
v_date_part   text;
v_batch_num   text;
v_batch_id    uuid;
v_strain_name text;
v_clone_date  date;
BEGIN
SELECT abbreviation, name INTO v_abbrev, v_strain_name
FROM strains WHERE id = NEW.strain_id;

IF v_abbrev IS NULL OR v_abbrev = '' THEN
RAISE EXCEPTION
'Cannot create plant group: strain has no abbreviation set. Set the abbreviation in Settings → Strains first.';
END IF;

v_clone_date := COALESCE(NEW.planted_date, CURRENT_DATE);
v_batch_num  := to_char(v_clone_date, 'YYMMDD') || '-' || v_abbrev;

INSERT INTO batch_registry (
batch_number,
strain,
strain_id,
clone_date,
lifecycle_state,
created_by
) VALUES (
v_batch_num,
v_strain_name,
NEW.strain_id,
v_clone_date,
'pre_harvest',
NEW.created_by
)
ON CONFLICT (batch_number) DO NOTHING
RETURNING id INTO v_batch_id;

IF v_batch_id IS NULL THEN
SELECT id INTO v_batch_id
FROM batch_registry
WHERE batch_number = v_batch_num;
END IF;

NEW.batch_registry_id := v_batch_id;

RETURN NEW;
END;
$function$
;

-- Function: fn_generate_plant_id
CREATE OR REPLACE FUNCTION public.fn_generate_plant_id()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
candidate text;
exists_check boolean;
BEGIN
LOOP
-- Generate a random 12-digit number (left-pad with zeros if needed)
candidate := lpad(
(floor(random() * 1000000000000)::bigint)::text,
12,
'0'
);

-- Verify uniqueness
SELECT EXISTS (
SELECT 1 FROM individual_plants WHERE state_plant_id = candidate
) INTO exists_check;

EXIT WHEN NOT exists_check;
END LOOP;

RETURN candidate;
END;
$function$
;

-- Function: fn_handle_bucking_session_cancellation
CREATE OR REPLACE FUNCTION public.fn_handle_bucking_session_cancellation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_current_state text;
BEGIN
-- Only act on status change to 'cancelled'
IF NEW.session_status = 'cancelled' AND OLD.session_status != 'cancelled' THEN

-- Skip if no batch linkage
IF NEW.batch_registry_id IS NULL THEN
RETURN NEW;
END IF;

-- Get current batch state
SELECT lifecycle_state INTO v_current_state
FROM batch_registry
WHERE id = NEW.batch_registry_id;

-- Only revert if batch is in 'bucked' state
IF v_current_state = 'bucked' THEN
-- Validate transition
PERFORM fn_validate_batch_lifecycle_transition(
NEW.batch_registry_id,
'bucked',
'created'
);

-- Revert batch lifecycle state
UPDATE batch_registry
SET
lifecycle_state = 'created',
updated_at = now()
WHERE id = NEW.batch_registry_id;

-- Log lifecycle event
INSERT INTO batch_lifecycle_events (
batch_id,
event_type,
from_state,
to_state,
triggered_by,
trigger_source,
metadata,
notes
) VALUES (
NEW.batch_registry_id,
'state_transition',
'bucked',
'created',
CURRENT_USER,
'bucking_session_cancellation',
jsonb_build_object(
'session_id', NEW.id,
'cancelled_at', now()
),
'Bucking session cancelled, reverting state'
);

RAISE NOTICE 'Reverted batch % lifecycle state: bucked → created (session cancelled)',
NEW.batch_registry_id;
END IF;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_handle_packaging_session_cancellation
CREATE OR REPLACE FUNCTION public.fn_handle_packaging_session_cancellation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_current_state text;
v_revert_state text;
BEGIN
-- Only act on status change to 'cancelled'
IF NEW.session_status = 'cancelled' AND OLD.session_status != 'cancelled' THEN

-- Get current batch state
SELECT lifecycle_state INTO v_current_state
FROM batch_registry
WHERE id = NEW.batch_registry_id;

-- Determine revert state
v_revert_state := CASE
WHEN v_current_state = 'in_packaging' THEN 'bulk_available'
WHEN v_current_state = 'packaged' THEN 'bulk_available' -- Revert completed packaging
ELSE v_current_state
END;

-- Only revert if state changed
IF v_revert_state != v_current_state THEN
-- Validate transition
PERFORM fn_validate_batch_lifecycle_transition(
NEW.batch_registry_id,
v_current_state,
v_revert_state
);

-- Revert batch lifecycle state
UPDATE batch_registry
SET 
lifecycle_state = v_revert_state,
completed_at = NULL, -- Clear completion timestamp
updated_at = now()
WHERE id = NEW.batch_registry_id;

-- Log lifecycle event
INSERT INTO batch_lifecycle_events (
batch_id,
event_type,
from_state,
to_state,
triggered_by,
trigger_source,
metadata,
notes
) VALUES (
NEW.batch_registry_id,
'state_transition',
v_current_state,
v_revert_state,
CURRENT_USER,
'packaging_session_cancellation',
jsonb_build_object(
'session_id', NEW.id,
'session_number', NEW.session_number,
'cancelled_at', now()
),
format('Packaging session %s cancelled, reverting state', NEW.session_number)
);

RAISE NOTICE 'Reverted batch % lifecycle state: % → % (session cancelled)', 
NEW.batch_registry_id, v_current_state, v_revert_state;
END IF;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_handle_trim_session_cancellation
CREATE OR REPLACE FUNCTION public.fn_handle_trim_session_cancellation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_current_state text;
v_revert_state text;
BEGIN
-- Only act on status change to 'cancelled'
IF NEW.session_status = 'cancelled' AND OLD.session_status != 'cancelled' THEN

-- Get current batch state
SELECT lifecycle_state INTO v_current_state
FROM batch_registry
WHERE id = NEW.batch_registry_id;

-- Determine revert state
v_revert_state := CASE
WHEN v_current_state = 'in_trim' THEN 'bucked'
WHEN v_current_state = 'bulk_available' THEN 'bucked' -- Revert completed trim
ELSE v_current_state -- Keep current if no change needed
END;

-- Only revert if state changed
IF v_revert_state != v_current_state THEN
-- Validate transition
PERFORM fn_validate_batch_lifecycle_transition(
NEW.batch_registry_id,
v_current_state,
v_revert_state
);

-- Revert batch lifecycle state
UPDATE batch_registry
SET 
lifecycle_state = v_revert_state,
updated_at = now()
WHERE id = NEW.batch_registry_id;

-- Log lifecycle event
INSERT INTO batch_lifecycle_events (
batch_id,
event_type,
from_state,
to_state,
triggered_by,
trigger_source,
metadata,
notes
) VALUES (
NEW.batch_registry_id,
'state_transition',
v_current_state,
v_revert_state,
CURRENT_USER,
'trim_session_cancellation',
jsonb_build_object(
'session_id', NEW.id,
'session_number', NEW.session_number,
'cancelled_at', now()
),
format('Trim session %s cancelled, reverting state', NEW.session_number)
);

RAISE NOTICE 'Reverted batch % lifecycle state: % → % (session cancelled)', 
NEW.batch_registry_id, v_current_state, v_revert_state;
END IF;

-- TODO: Create RETURN movements to reverse inventory changes
-- This requires inventory_movements ledger to be in place
-- Will be handled in Step 3 of this batch

END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_lock_inventory_stages
CREATE OR REPLACE FUNCTION public.fn_lock_inventory_stages(p_audit_id uuid, p_stages text[])
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
lock_check record;
BEGIN
-- Check if any stage is already locked
SELECT * INTO lock_check
FROM fn_check_stage_locked(p_stages);

IF lock_check.is_locked THEN
RAISE EXCEPTION 'Stages are locked by audit %', lock_check.audit_number;
END IF;

-- Lock the audit
UPDATE inventory_audits
SET is_locked = true,
status = 'in_progress',
updated_at = now()
WHERE id = p_audit_id;

RETURN true;
END;
$function$
;

-- Function: fn_log_plant_group_room_history
CREATE OR REPLACE FUNCTION public.fn_log_plant_group_room_history()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
INSERT INTO plant_group_room_history (
plant_group_id,
from_room_id,
to_room_id,
moved_at,
moved_by
) VALUES (
NEW.id,
OLD.grow_room_id,
NEW.grow_room_id,
now(),
auth.uid()
);
NEW.updated_at := now();
RETURN NEW;
END;
$function$
;

-- Function: fn_log_plant_group_stage_history
CREATE OR REPLACE FUNCTION public.fn_log_plant_group_stage_history()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
INSERT INTO plant_group_stage_history (
plant_group_id,
from_stage,
to_stage,
transitioned_at,
transitioned_by
) VALUES (
NEW.id,
OLD.growth_stage,
NEW.growth_stage,
NEW.stage_entered_at,
auth.uid()
);
RETURN NEW;
END;
$function$
;

-- Function: fn_populate_batch_registry_id
CREATE OR REPLACE FUNCTION public.fn_populate_batch_registry_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
v_batch_uuid uuid;
BEGIN
-- Skip if batch_registry_id is already set (allow explicit values)
IF NEW.batch_registry_id IS NOT NULL THEN
RETURN NEW;
END IF;

-- Look up batch UUID from batch_id text string
IF NEW.batch_id IS NOT NULL THEN
SELECT id INTO v_batch_uuid
FROM batch_registry
WHERE batch_number = NEW.batch_id;

IF v_batch_uuid IS NOT NULL THEN
NEW.batch_registry_id := v_batch_uuid;
RAISE NOTICE 'Auto-populated batch_registry_id: % for batch_id: %',
v_batch_uuid, NEW.batch_id;
ELSE
-- Log warning but don't fail (batch may not exist yet in development)
RAISE NOTICE 'Batch % not found in batch_registry, batch_registry_id will remain NULL',
NEW.batch_id;
END IF;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_prevent_batch_id_update
CREATE OR REPLACE FUNCTION public.fn_prevent_batch_id_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
IF TG_OP = 'INSERT' THEN
RETURN NEW;
END IF;

IF TG_OP = 'UPDATE' AND OLD.batch_id IS DISTINCT FROM NEW.batch_id THEN
RAISE EXCEPTION 'batch_id is immutable'
USING ERRCODE = 'integrity_constraint_violation';
END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_process_inventory_movement
CREATE OR REPLACE FUNCTION public.fn_process_inventory_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_item_id uuid;
v_qty_delta numeric;
v_current_qty numeric;
v_new_qty numeric;
BEGIN
-- Determine which item to update based on movement_kind
v_item_id := CASE
-- CONSUME, FULFILLMENT: Decrease source_item
WHEN NEW.movement_kind IN ('CONSUME', 'FULFILLMENT') THEN NEW.source_item_id

-- PRODUCE, RETURN, RECEIPT: Increase dest_item
WHEN NEW.movement_kind IN ('PRODUCE', 'RETURN', 'RECEIPT') THEN NEW.dest_item_id

-- ADJUSTMENT, RECONCILIATION: Absolute set on dest_item
WHEN NEW.movement_kind IN ('ADJUSTMENT', 'RECONCILIATION') THEN NEW.dest_item_id

-- RESERVE/RELEASE: Don't change on_hand_qty (only affects ATP)
WHEN NEW.movement_kind IN ('RESERVE', 'RELEASE') THEN NULL

ELSE NULL
END;

-- Skip if no item to update
IF v_item_id IS NULL THEN
RETURN NEW;
END IF;

-- Calculate quantity delta
v_qty_delta := CASE
-- Decrease operations (negative delta)
WHEN NEW.movement_kind IN ('CONSUME', 'FULFILLMENT') THEN -NEW.qty

-- Increase operations (positive delta)
WHEN NEW.movement_kind IN ('PRODUCE', 'RETURN', 'RECEIPT') THEN NEW.qty

-- Absolute set operations (ADJUSTMENT, RECONCILIATION)
WHEN NEW.movement_kind IN ('ADJUSTMENT', 'RECONCILIATION') THEN NULL -- Handled separately

ELSE 0
END;

-- Get current quantity
SELECT on_hand_qty INTO v_current_qty
FROM inventory_items
WHERE id = v_item_id
FOR UPDATE; -- Lock row for update

IF v_current_qty IS NULL THEN
RAISE EXCEPTION 'Inventory item % not found', v_item_id;
END IF;

-- Calculate new quantity
IF NEW.movement_kind IN ('ADJUSTMENT', 'RECONCILIATION') THEN
-- Absolute set
v_new_qty := NEW.qty;
ELSE
-- Delta change
v_new_qty := v_current_qty + v_qty_delta;
END IF;

-- Prevent negative inventory
IF v_new_qty < 0 THEN
RAISE EXCEPTION 'Movement would result in negative inventory. Item: %, Current: %, Delta: %, New: %',
v_item_id, v_current_qty, v_qty_delta, v_new_qty
USING ERRCODE = 'check_violation',
HINT = 'Verify the quantity and source item have sufficient on_hand_qty.';
END IF;

-- Update inventory item (set security context to allow trigger update)
BEGIN
-- Set flag to allow quantity update
PERFORM set_config('app.allow_quantity_update', 'true', true); -- true = transaction-local

-- Update quantity
UPDATE inventory_items
SET
on_hand_qty = v_new_qty,
updated_at = now()
WHERE id = v_item_id;

-- Reset flag
PERFORM set_config('app.allow_quantity_update', 'false', true);
EXCEPTION
WHEN OTHERS THEN
-- Reset flag on error
PERFORM set_config('app.allow_quantity_update', 'false', true);
RAISE;
END;

RETURN NEW;
END;
$function$
;

-- Function: fn_protect_dry_room_code
CREATE OR REPLACE FUNCTION public.fn_protect_dry_room_code()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
IF OLD.room_code IS DISTINCT FROM NEW.room_code THEN
RAISE EXCEPTION 'dry room room_code is immutable after creation';
END IF;
RETURN NEW;
END;
$function$
;

-- Function: fn_protect_plant_group_strain
CREATE OR REPLACE FUNCTION public.fn_protect_plant_group_strain()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
IF OLD.strain_id IS DISTINCT FROM NEW.strain_id THEN
RAISE EXCEPTION 'strain_id is immutable after plant group creation';
END IF;
RETURN NEW;
END;
$function$
;

-- Function: fn_protect_room_code
CREATE OR REPLACE FUNCTION public.fn_protect_room_code()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
IF OLD.room_code IS DISTINCT FROM NEW.room_code THEN
RAISE EXCEPTION 'room_code is immutable after creation';
END IF;
RETURN NEW;
END;
$function$
;

-- Function: fn_rebalance_inventory_weight
CREATE OR REPLACE FUNCTION public.fn_rebalance_inventory_weight(p_source_item_id uuid, p_dest_item_id uuid, p_transfer_qty numeric, p_user_id uuid, p_reason_code text DEFAULT 'measurement_error'::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_source record;
v_dest record;
v_user_role text;
v_source_new_qty numeric;
v_dest_new_qty numeric;
v_source_movement_id uuid;
v_dest_movement_id uuid;
v_variance_log_id uuid;
BEGIN
-- Validate user is admin
SELECT role INTO v_user_role
FROM user_profiles
WHERE id = p_user_id AND is_active = true;

IF v_user_role IS NULL THEN
RETURN jsonb_build_object('success', false, 'error', 'User not found or inactive');
END IF;

IF v_user_role != 'admin' THEN
RETURN jsonb_build_object('success', false, 'error', 'Only admins can rebalance inventory');
END IF;

-- Validate transfer quantity
IF p_transfer_qty <= 0 THEN
RETURN jsonb_build_object('success', false, 'error', 'Transfer quantity must be positive');
END IF;

-- Fetch source item
SELECT i.*, ps.name as stage_name
INTO v_source
FROM inventory_items i
JOIN product_stages ps ON ps.id = i.product_stage_id
WHERE i.id = p_source_item_id;

IF v_source IS NULL THEN
RETURN jsonb_build_object('success', false, 'error', 'Source item not found');
END IF;

-- Fetch destination item
SELECT i.*, ps.name as stage_name
INTO v_dest
FROM inventory_items i
JOIN product_stages ps ON ps.id = i.product_stage_id
WHERE i.id = p_dest_item_id;

IF v_dest IS NULL THEN
RETURN jsonb_build_object('success', false, 'error', 'Destination item not found');
END IF;

-- Validate same unit
IF v_source.unit != v_dest.unit THEN
RETURN jsonb_build_object('success', false, 'error', 'Source and destination must use the same unit');
END IF;

-- Validate source has enough quantity
IF p_transfer_qty > v_source.on_hand_qty THEN
RETURN jsonb_build_object('success', false, 'error', 
'Transfer amount (' || p_transfer_qty || ') exceeds source quantity (' || v_source.on_hand_qty || ')');
END IF;

-- Calculate new quantities
v_source_new_qty := v_source.on_hand_qty - p_transfer_qty;
v_dest_new_qty := v_dest.on_hand_qty + p_transfer_qty;

-- Create ADJUSTMENT movement for source (absolute new qty)
INSERT INTO inventory_movements (
movement_kind, source_item_id, qty, unit,
reason_code, notes, created_by, movement_date
) VALUES (
'ADJUSTMENT', p_source_item_id, v_source_new_qty, v_source.unit,
p_reason_code, 'Rebalance: transferred ' || p_transfer_qty || v_source.unit || ' to ' || v_dest.package_id || '. ' || COALESCE(p_notes, ''),
p_user_id::text, now()
)
RETURNING id INTO v_source_movement_id;

-- Create ADJUSTMENT movement for destination (absolute new qty)
INSERT INTO inventory_movements (
movement_kind, source_item_id, qty, unit,
reason_code, notes, created_by, movement_date
) VALUES (
'ADJUSTMENT', p_dest_item_id, v_dest_new_qty, v_dest.unit,
p_reason_code, 'Rebalance: received ' || p_transfer_qty || v_dest.unit || ' from ' || v_source.package_id || '. ' || COALESCE(p_notes, ''),
p_user_id::text, now()
)
RETURNING id INTO v_dest_movement_id;

-- Log to variance_log
INSERT INTO variance_log (
source_type, source_id, inventory_item_id, package_id,
expected_qty, actual_qty, variance_qty, variance_percentage,
unit, variance_reason, notes, inventory_stage,
strain, batch, product_name, user_id
) VALUES (
'weight_rebalance', v_source_movement_id, p_source_item_id, v_source.package_id,
v_source.on_hand_qty, v_source_new_qty,
v_source_new_qty - v_source.on_hand_qty,
CASE WHEN v_source.on_hand_qty = 0 THEN 0 
ELSE ((v_source_new_qty - v_source.on_hand_qty) / v_source.on_hand_qty * 100) END,
v_source.unit,
COALESCE(p_reason_code, 'measurement_error')::variance_reason,
COALESCE(p_notes, 'Weight rebalance: ' || v_source.package_id || ' -> ' || v_dest.package_id || ' (' || p_transfer_qty || v_source.unit || ')'),
v_source.stage_name, v_source.strain, v_source.batch, v_source.product_name, p_user_id
)
RETURNING id INTO v_variance_log_id;

RETURN jsonb_build_object(
'success', true,
'source_movement_id', v_source_movement_id,
'dest_movement_id', v_dest_movement_id,
'variance_log_id', v_variance_log_id,
'source_before', v_source.on_hand_qty,
'source_after', v_source_new_qty,
'dest_before', v_dest.on_hand_qty,
'dest_after', v_dest_new_qty,
'transfer_qty', p_transfer_qty,
'unit', v_source.unit
);
END;
$function$
;

-- Function: fn_release_inventory_on_order_cancel
CREATE OR REPLACE FUNCTION public.fn_release_inventory_on_order_cancel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_assignment RECORD;
v_inventory_item RECORD;
BEGIN
IF NEW.status != 'cancelled' OR OLD.status = 'cancelled' THEN
RETURN NEW;
END IF;

FOR v_assignment IN
SELECT * FROM package_assignments
WHERE order_id = NEW.id AND status = 'reserved'
LOOP
SELECT * INTO v_inventory_item
FROM inventory_items
WHERE package_id = v_assignment.package_id;

IF NOT FOUND THEN
RAISE WARNING 'Inventory item % not found during order cancellation', v_assignment.package_id;
CONTINUE;
END IF;

PERFORM set_config('app.allow_quantity_update', 'true', true);

UPDATE inventory_items
SET
available_qty = available_qty + v_assignment.quantity_assigned,
reserved_qty = GREATEST(0, COALESCE(reserved_qty, 0) - v_assignment.quantity_assigned),
last_updated = now()
WHERE id = v_inventory_item.id;

PERFORM set_config('app.allow_quantity_update', 'false', true);

INSERT INTO inventory_movements (
movement_kind,
dest_item_id,
qty,
unit,
reference_id,
reference_type,
reason_code,
notes,
movement_date
) VALUES (
'RELEASE',
v_inventory_item.id,
v_assignment.quantity_assigned,
COALESCE(v_inventory_item.unit, 'unit'),
NEW.id,
'order',
'order_fulfillment',
format('Released %s %s of %s — order %s cancelled',
v_assignment.quantity_assigned,
COALESCE(v_inventory_item.unit, 'unit'),
v_assignment.package_id,
COALESCE(NEW.order_number, NEW.id::text)
),
now()
);

UPDATE package_assignments
SET status = 'released', updated_at = now()
WHERE id = v_assignment.id;
END LOOP;

RETURN NEW;
END;
$function$
;

-- Function: fn_release_inventory_on_unassignment
CREATE OR REPLACE FUNCTION public.fn_release_inventory_on_unassignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_inventory_item RECORD;
BEGIN
IF OLD.status = 'fulfilled' THEN
RETURN OLD;
END IF;

IF OLD.status = 'released' THEN
RETURN OLD;
END IF;

SELECT * INTO v_inventory_item
FROM inventory_items
WHERE package_id = OLD.package_id;

IF NOT FOUND THEN
RAISE WARNING 'Inventory item % not found during assignment removal', OLD.package_id;
RETURN OLD;
END IF;

PERFORM set_config('app.allow_quantity_update', 'true', true);

UPDATE inventory_items
SET
available_qty = available_qty + OLD.quantity_assigned,
reserved_qty = GREATEST(0, COALESCE(reserved_qty, 0) - OLD.quantity_assigned),
last_updated = now()
WHERE id = v_inventory_item.id;

PERFORM set_config('app.allow_quantity_update', 'false', true);

INSERT INTO inventory_movements (
movement_kind,
dest_item_id,
qty,
unit,
reference_id,
reference_type,
reason_code,
notes,
movement_date
) VALUES (
'RELEASE',
v_inventory_item.id,
OLD.quantity_assigned,
COALESCE(v_inventory_item.unit, 'unit'),
OLD.order_id,
'order',
'assignment_removed',
format('Released %s %s of %s — assignment removed',
OLD.quantity_assigned,
COALESCE(v_inventory_item.unit, 'unit'),
OLD.package_id
),
now()
);

RETURN OLD;
END;
$function$
;

-- Function: fn_reserve_inventory_on_assignment
CREATE OR REPLACE FUNCTION public.fn_reserve_inventory_on_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_inventory_item RECORD;
BEGIN
SELECT * INTO v_inventory_item
FROM inventory_items
WHERE package_id = NEW.package_id;

IF NOT FOUND THEN
RAISE EXCEPTION 'Inventory item with package_id % not found', NEW.package_id;
END IF;

IF v_inventory_item.available_qty < NEW.quantity_assigned THEN
RAISE EXCEPTION 'Insufficient inventory for package %: available=%, requested=%',
NEW.package_id,
v_inventory_item.available_qty,
NEW.quantity_assigned;
END IF;

PERFORM set_config('app.allow_quantity_update', 'true', true);

UPDATE inventory_items
SET
available_qty = available_qty - NEW.quantity_assigned,
reserved_qty = COALESCE(reserved_qty, 0) + NEW.quantity_assigned,
last_updated = now()
WHERE id = v_inventory_item.id;

PERFORM set_config('app.allow_quantity_update', 'false', true);

INSERT INTO inventory_movements (
movement_kind,
source_item_id,
qty,
unit,
reference_id,
reference_type,
reason_code,
notes,
movement_date
) VALUES (
'RESERVE',
v_inventory_item.id,
NEW.quantity_assigned,
COALESCE(v_inventory_item.unit, 'unit'),
NEW.order_id,
'order',
'package_assignment',
format('Reserved %s %s of %s for order assignment',
NEW.quantity_assigned,
COALESCE(v_inventory_item.unit, 'unit'),
NEW.package_id
),
now()
);

RETURN NEW;
END;
$function$
;

-- Function: fn_reverse_fulfillment_on_order_revert
CREATE OR REPLACE FUNCTION public.fn_reverse_fulfillment_on_order_revert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_assignment RECORD;
v_inventory_item RECORD;
BEGIN
IF OLD.status != 'completed' OR NEW.status = 'completed' THEN
RETURN NEW;
END IF;

FOR v_assignment IN
SELECT * FROM package_assignments
WHERE order_id = NEW.id AND status = 'fulfilled'
LOOP
SELECT * INTO v_inventory_item
FROM inventory_items
WHERE package_id = v_assignment.package_id;

IF NOT FOUND THEN
RAISE WARNING 'Inventory item % not found during order revert', v_assignment.package_id;
CONTINUE;
END IF;

PERFORM set_config('app.allow_quantity_update', 'true', true);

UPDATE inventory_items
SET
on_hand_qty = COALESCE(on_hand_qty, 0) + v_assignment.quantity_assigned,
reserved_qty = COALESCE(reserved_qty, 0) + v_assignment.quantity_assigned,
available_qty = (COALESCE(on_hand_qty, 0) + v_assignment.quantity_assigned)
- (COALESCE(reserved_qty, 0) + v_assignment.quantity_assigned),
last_updated = now()
WHERE id = v_inventory_item.id;

PERFORM set_config('app.allow_quantity_update', 'false', true);

INSERT INTO inventory_movements (
movement_kind,
dest_item_id,
qty,
unit,
reference_id,
reference_type,
reason_code,
notes,
movement_date
) VALUES (
'RETURN',
v_inventory_item.id,
v_assignment.quantity_assigned,
COALESCE(v_inventory_item.unit, 'unit'),
NEW.id,
'order',
'order_fulfillment',
format('Returned %s %s of %s — order %s reverted from completed',
v_assignment.quantity_assigned,
COALESCE(v_inventory_item.unit, 'unit'),
v_assignment.package_id,
COALESCE(NEW.order_number, NEW.id::text)
),
now()
);

UPDATE package_assignments
SET status = 'reserved', updated_at = now()
WHERE id = v_assignment.id;
END LOOP;

RETURN NEW;
END;
$function$
;

-- Function: fn_sync_harvest_weight_adjustment
CREATE OR REPLACE FUNCTION public.fn_sync_harvest_weight_adjustment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
IF NEW.adjusted_weight_grams IS NULL THEN
RETURN NEW;
END IF;

IF NEW.batch_registry_id IS NULL THEN
RAISE EXCEPTION 'Cannot adjust weight: no batch linked to this harvest session';
END IF;

IF NEW.adjusted_weight_grams <= 0 THEN
RAISE EXCEPTION 'Adjusted weight must be greater than zero';
END IF;

IF NEW.adjustment_reason IS NULL OR NEW.adjustment_reason = '' THEN
RAISE EXCEPTION 'Adjustment reason is required when adjusting harvest weight';
END IF;

UPDATE batch_registry
SET initial_weight_grams = NEW.adjusted_weight_grams,
updated_at = now()
WHERE id = NEW.batch_registry_id;

RETURN NEW;
END;
$function$
;

-- Function: fn_unlock_inventory_stages
CREATE OR REPLACE FUNCTION public.fn_unlock_inventory_stages(p_audit_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
UPDATE inventory_audits
SET is_locked = false,
updated_at = now()
WHERE id = p_audit_id;

RETURN true;
END;
$function$
;

-- Function: fn_update_batch_lifecycle_on_bucking_complete
CREATE OR REPLACE FUNCTION public.fn_update_batch_lifecycle_on_bucking_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_current_state text;
BEGIN
-- Only act on status change to 'completed'
IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN

-- Skip batch lifecycle updates if no batch_registry_id
IF NEW.batch_registry_id IS NULL THEN
RAISE NOTICE 'Bucking session % completed without batch_registry linkage - skipping lifecycle update', NEW.id;
RETURN NEW;
END IF;

-- Get current batch state
SELECT lifecycle_state INTO v_current_state
FROM batch_registry
WHERE id = NEW.batch_registry_id;

-- Verify batch exists
IF NOT FOUND THEN
RAISE WARNING 'Batch registry % not found for bucking session %', NEW.batch_registry_id, NEW.id;
RETURN NEW;
END IF;

-- Skip if already bucked
IF v_current_state = 'bucked' THEN
RAISE NOTICE 'Batch % already in bucked state', NEW.batch_registry_id;
RETURN NEW;
END IF;

-- Only transition from 'created' to 'bucked'
IF v_current_state != 'created' THEN
RAISE WARNING 'Cannot transition batch % from % to bucked. Batch must be in created state. Skipping lifecycle update.',
NEW.batch_registry_id, v_current_state;
RETURN NEW;
END IF;

-- Validate transition
PERFORM fn_validate_batch_lifecycle_transition(
NEW.batch_registry_id,
'created',
'bucked'
);

-- Update batch lifecycle state
UPDATE batch_registry
SET
lifecycle_state = 'bucked',
bucking_started_at = COALESCE(bucking_started_at, NEW.started_at),
updated_at = now()
WHERE id = NEW.batch_registry_id;

-- Log lifecycle event
INSERT INTO batch_lifecycle_events (
batch_id,
event_type,
from_state,
to_state,
triggered_by,
trigger_source,
metadata,
notes
) VALUES (
NEW.batch_registry_id,
'state_transition',
v_current_state,
'bucked',
CURRENT_USER,
'bucking_session_completion',
jsonb_build_object(
'session_id', NEW.id,
'completed_at', NEW.completed_at,
'bucked_flower_grams', NEW.bucked_flower_grams,
'bucked_smalls_grams', NEW.bucked_smalls_grams
),
format('Bucking session completed with %sg flower, %sg smalls',
COALESCE(NEW.bucked_flower_grams, 0),
COALESCE(NEW.bucked_smalls_grams, 0))
);

RAISE NOTICE 'Updated batch % lifecycle state: % → bucked',
NEW.batch_registry_id, v_current_state;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_update_batch_lifecycle_on_packaging_complete
CREATE OR REPLACE FUNCTION public.fn_update_batch_lifecycle_on_packaging_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_current_state text;
BEGIN
-- Only act on status change to 'completed'
IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN

-- Skip batch lifecycle updates if no batch_registry_id
-- This allows sessions to complete without batch_registry linkage
IF NEW.batch_registry_id IS NULL THEN
RAISE NOTICE 'Packaging session % completed without batch_registry linkage - skipping lifecycle update', NEW.id;
RETURN NEW;
END IF;

-- Get current batch state
SELECT lifecycle_state INTO v_current_state
FROM batch_registry
WHERE id = NEW.batch_registry_id;

-- Verify batch exists
IF NOT FOUND THEN
RAISE WARNING 'Batch registry % not found for packaging session %', NEW.batch_registry_id, NEW.id;
RETURN NEW;
END IF;

-- Skip if already packaged
IF v_current_state = 'packaged' THEN
RAISE NOTICE 'Batch % already in packaged state', NEW.batch_registry_id;
RETURN NEW;
END IF;

-- Only transition to packaged if batch is in valid packaging state
-- Valid: in_packaging → packaged
IF v_current_state != 'in_packaging' THEN
RAISE WARNING 'Cannot transition batch % from % to packaged. Batch must be in in_packaging state first. Skipping lifecycle update.',
NEW.batch_registry_id, v_current_state;
RETURN NEW;
END IF;

-- Validate transition (should pass since we checked above)
PERFORM fn_validate_batch_lifecycle_transition(
NEW.batch_registry_id,
'in_packaging',
'packaged'
);

-- Update batch lifecycle state
UPDATE batch_registry
SET 
lifecycle_state = 'packaged',
packaging_started_at = NEW.started_at,
completed_at = NEW.completed_at,
updated_at = now()
WHERE id = NEW.batch_registry_id;

-- Log lifecycle event
INSERT INTO batch_lifecycle_events (
batch_id,
event_type,
from_state,
to_state,
triggered_by,
trigger_source,
metadata,
notes
) VALUES (
NEW.batch_registry_id,
'state_transition',
v_current_state,
'packaged',
CURRENT_USER,
'packaging_session_completion',
jsonb_build_object(
'session_id', NEW.id,
'completed_at', NEW.completed_at,
'output_units', NEW.output_units
),
format('Packaging session completed with %s output units', COALESCE(NEW.output_units, 0))
);

RAISE NOTICE 'Updated batch % lifecycle state: % → packaged', 
NEW.batch_registry_id, v_current_state;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_update_batch_lifecycle_on_trim_complete
CREATE OR REPLACE FUNCTION public.fn_update_batch_lifecycle_on_trim_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_current_state text;
v_target_state text;
BEGIN
-- Only act on status change to 'completed'
IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN

-- Skip batch lifecycle updates if no batch_registry_id
IF NEW.batch_registry_id IS NULL THEN
RAISE NOTICE 'Trim session % completed without batch_registry linkage - skipping lifecycle update', NEW.id;
RETURN NEW;
END IF;

-- Get current batch state
SELECT lifecycle_state INTO v_current_state
FROM batch_registry
WHERE id = NEW.batch_registry_id;

-- Verify batch exists
IF NOT FOUND THEN
RAISE WARNING 'Batch registry % not found for trim session %', NEW.batch_registry_id, NEW.id;
RETURN NEW;
END IF;

-- HANDLE INTERMEDIATE STATE TRANSITION
-- If batch is still in 'bucked' state (session started but never transitioned to in_trim),
-- we need to do TWO transitions: bucked → in_trim → bulk_available
IF v_current_state = 'bucked' THEN
RAISE NOTICE 'Batch % is in bucked state, transitioning through in_trim before bulk_available', 
NEW.batch_registry_id;

-- First transition: bucked → in_trim
PERFORM fn_validate_batch_lifecycle_transition(
NEW.batch_registry_id,
'bucked',
'in_trim'
);

UPDATE batch_registry
SET
lifecycle_state = 'in_trim',
trimming_started_at = COALESCE(trimming_started_at, NEW.started_at),
updated_at = now()
WHERE id = NEW.batch_registry_id;

INSERT INTO batch_lifecycle_events (
batch_id,
event_type,
from_state,
to_state,
triggered_by,
trigger_source,
metadata,
notes
) VALUES (
NEW.batch_registry_id,
'state_transition',
'bucked',
'in_trim',
CURRENT_USER,
'trim_session_completion_intermediate',
jsonb_build_object(
'session_id', NEW.id,
'note', 'Intermediate transition during completion - session started without state change'
),
'Trim session started without batch state update, correcting during completion'
);

-- Update current state for next transition
v_current_state := 'in_trim';
END IF;

-- Now handle the main transition to bulk_available
v_target_state := 'bulk_available';

-- Skip if already in target state
IF v_current_state = v_target_state THEN
RAISE NOTICE 'Batch % already in bulk_available state', NEW.batch_registry_id;
RETURN NEW;
END IF;

-- Validate final transition (should be in_trim → bulk_available now)
PERFORM fn_validate_batch_lifecycle_transition(
NEW.batch_registry_id,
v_current_state,
v_target_state
);

-- Update batch lifecycle state to final state
UPDATE batch_registry
SET
lifecycle_state = v_target_state,
updated_at = now()
WHERE id = NEW.batch_registry_id;

-- Log lifecycle event
INSERT INTO batch_lifecycle_events (
batch_id,
event_type,
from_state,
to_state,
triggered_by,
trigger_source,
metadata,
notes
) VALUES (
NEW.batch_registry_id,
'state_transition',
v_current_state,
v_target_state,
CURRENT_USER,
'trim_session_completion',
jsonb_build_object(
'session_id', NEW.id,
'completed_at', NEW.completed_at,
'big_buds_grams', NEW.big_buds_grams,
'small_buds_grams', NEW.small_buds_grams,
'trim_grams', NEW.trim_grams
),
format('Trim session completed with %sg flower, %sg smalls, %sg trim',
COALESCE(NEW.big_buds_grams, 0),
COALESCE(NEW.small_buds_grams, 0),
COALESCE(NEW.trim_grams, 0))
);

RAISE NOTICE 'Updated batch % lifecycle state: % → %',
NEW.batch_registry_id, v_current_state, v_target_state;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_update_inventory_on_hand
CREATE OR REPLACE FUNCTION public.fn_update_inventory_on_hand()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
target_item_id uuid;
qty_change numeric;
current_qty numeric;
BEGIN
IF NEW.movement_kind IN ('RESERVE', 'RELEASE') THEN
RAISE NOTICE 'RESERVE/RELEASE movement % - ATP handled by session triggers, no on_hand_qty change', NEW.id;
RETURN NEW;
END IF;

IF NEW.reason_code = 'session_finalization' THEN
RAISE NOTICE 'Session finalization movement % - audit trail only, quantities set directly', NEW.id;
RETURN NEW;
END IF;

IF NEW.reason_code = 'order_fulfillment' THEN
RAISE NOTICE 'Order fulfillment movement % - audit trail only, quantities set by fulfillment trigger', NEW.id;
RETURN NEW;
END IF;

IF NEW.dest_item_id IS NOT NULL THEN
target_item_id := NEW.dest_item_id;
ELSIF NEW.source_item_id IS NOT NULL THEN
target_item_id := NEW.source_item_id;
ELSE
RAISE EXCEPTION 'Movement must have either source_item_id or dest_item_id';
END IF;

SELECT on_hand_qty INTO current_qty
FROM inventory_items
WHERE id = target_item_id;

PERFORM set_config('app.allow_quantity_update', 'true', true);

BEGIN
CASE NEW.movement_kind
WHEN 'ADJUSTMENT', 'RECONCILIATION' THEN
UPDATE inventory_items
SET on_hand_qty = NEW.qty,
last_updated = now()
WHERE id = target_item_id;
RAISE NOTICE 'Absolute movement: % -> % for item %', current_qty, NEW.qty, target_item_id;

WHEN 'RECEIPT', 'PRODUCE', 'RETURN' THEN
UPDATE inventory_items
SET on_hand_qty = COALESCE(on_hand_qty, 0) + NEW.qty,
last_updated = now()
WHERE id = target_item_id;
RAISE NOTICE 'Increment movement: % + % = % for item %', current_qty, NEW.qty, (COALESCE(current_qty, 0) + NEW.qty), target_item_id;

WHEN 'CONSUME', 'FULFILLMENT' THEN
UPDATE inventory_items
SET on_hand_qty = GREATEST(0, COALESCE(on_hand_qty, 0) - NEW.qty),
last_updated = now()
WHERE id = target_item_id;
RAISE NOTICE 'Decrement movement: % - % = % for item %', current_qty, NEW.qty, GREATEST(0, COALESCE(current_qty, 0) - NEW.qty), target_item_id;

ELSE
RAISE EXCEPTION 'Unknown movement_kind: %', NEW.movement_kind;
END CASE;

IF NOT FOUND THEN
RAISE WARNING 'No inventory item found with id: %', target_item_id;
END IF;
EXCEPTION
WHEN OTHERS THEN
PERFORM set_config('app.allow_quantity_update', 'false', true);
RAISE;
END;

PERFORM set_config('app.allow_quantity_update', 'false', true);

RETURN NEW;
END;
$function$
;

-- Function: fn_update_updated_at_column
CREATE OR REPLACE FUNCTION public.fn_update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;

-- Function: fn_validate_batch_lifecycle_transition
CREATE OR REPLACE FUNCTION public.fn_validate_batch_lifecycle_transition(p_batch_id uuid, p_from_state text, p_to_state text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_current_state text;
v_is_valid boolean := false;
BEGIN
-- Get current state
SELECT lifecycle_state INTO v_current_state
FROM batch_registry
WHERE id = p_batch_id;

IF v_current_state IS NULL THEN
RAISE EXCEPTION 'Batch % not found', p_batch_id;
END IF;

-- Validate transition matches current state
IF p_from_state IS NOT NULL AND v_current_state != p_from_state THEN
RAISE EXCEPTION 'Invalid lifecycle transition: Expected current state %, but batch is in state %',
p_from_state, v_current_state;
END IF;

-- Define valid transitions
v_is_valid := CASE
-- Forward progressions
WHEN v_current_state = 'created' AND p_to_state = 'bucked' THEN true
WHEN v_current_state = 'bucked' AND p_to_state = 'in_trim' THEN true
WHEN v_current_state = 'in_trim' AND p_to_state = 'bulk_available' THEN true
WHEN v_current_state = 'bulk_available' AND p_to_state = 'in_packaging' THEN true
WHEN v_current_state = 'in_packaging' AND p_to_state = 'packaged' THEN true
WHEN v_current_state = 'packaged' AND p_to_state IN ('partially_depleted', 'depleted') THEN true
WHEN v_current_state = 'partially_depleted' AND p_to_state = 'depleted' THEN true
WHEN v_current_state = 'depleted' AND p_to_state = 'archived' THEN true

-- Quarantine transitions (from any state)
WHEN p_to_state = 'quarantined' THEN true
WHEN v_current_state = 'quarantined' AND p_to_state IN ('created', 'bucked', 'bulk_available', 'packaged') THEN true

-- Cancellation reversals
WHEN v_current_state = 'in_trim' AND p_to_state = 'bucked' THEN true -- Cancel trim
WHEN v_current_state = 'in_packaging' AND p_to_state = 'bulk_available' THEN true -- Cancel packaging

ELSE false
END;

IF NOT v_is_valid THEN
RAISE EXCEPTION 'Invalid lifecycle transition: % → % is not allowed',
v_current_state, p_to_state
USING HINT = 'Check batch_registry lifecycle_state documentation for valid transitions.';
END IF;

RETURN v_is_valid;
END;
$function$
;

-- Function: fn_validate_batch_not_quarantined
CREATE OR REPLACE FUNCTION public.fn_validate_batch_not_quarantined(p_batch_id uuid, p_operation text DEFAULT 'operation'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_is_quarantined boolean;
v_quarantine_reason text;
v_batch_number text;
BEGIN
-- Get batch quarantine status
SELECT 
is_quarantined,
quarantine_reason,
batch_number
INTO 
v_is_quarantined,
v_quarantine_reason,
v_batch_number
FROM batch_registry
WHERE id = p_batch_id;

-- Batch not found
IF v_batch_number IS NULL THEN
RAISE EXCEPTION 'Batch % not found', p_batch_id
USING ERRCODE = 'foreign_key_violation';
END IF;

-- Check quarantine status
IF v_is_quarantined = true THEN
RAISE EXCEPTION 'Operation blocked: Batch % is quarantined. Reason: %. Contact quality control to release quarantine before proceeding.',
v_batch_number,
COALESCE(v_quarantine_reason, 'No reason provided')
USING ERRCODE = 'check_violation',
HINT = format('The operation ''%s'' cannot be performed on quarantined batches.', p_operation),
DETAIL = format('Batch ID: %s, Quarantine Reason: %s', p_batch_id, COALESCE(v_quarantine_reason, 'Unknown'));
END IF;

RETURN true;
END;
$function$
;

-- Function: fn_validate_binning_session
CREATE OR REPLACE FUNCTION public.fn_validate_binning_session()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
v_harvest_status       text;
v_harvest_batch_id     uuid;
BEGIN
SELECT session_status, batch_registry_id
INTO v_harvest_status, v_harvest_batch_id
FROM harvest_sessions
WHERE id = NEW.harvest_session_id;

IF v_harvest_status IS NULL THEN
RAISE EXCEPTION 'Binning session error: harvest session not found';
END IF;

IF v_harvest_status != 'completed' THEN
RAISE EXCEPTION
'Cannot create binning session: harvest session is not completed (status: %)',
v_harvest_status;
END IF;

IF v_harvest_batch_id IS NULL THEN
RAISE EXCEPTION
'Cannot create binning session: harvest session has no linked batch';
END IF;

IF NEW.batch_registry_id IS DISTINCT FROM v_harvest_batch_id THEN
RAISE EXCEPTION
'Binning session error: batch_registry_id does not match the harvest session''s batch';
END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_validate_harvest_cancellation
CREATE OR REPLACE FUNCTION public.fn_validate_harvest_cancellation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
IF NEW.session_status = 'cancelled' AND OLD.batch_registry_id IS NOT NULL THEN
RAISE EXCEPTION
'Cannot cancel harvest session: batch % already created. Cancel the batch instead.',
(SELECT batch_number FROM batch_registry WHERE id = OLD.batch_registry_id);
END IF;

IF NEW.session_status = 'cancelled' THEN
NEW.cancelled_at := now();
END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_validate_movement
CREATE OR REPLACE FUNCTION public.fn_validate_movement()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
item_exists boolean;
BEGIN
-- Validate required fields
IF NEW.movement_kind IS NULL THEN
RAISE EXCEPTION 'movement_kind is required';
END IF;

IF NEW.qty IS NULL OR NEW.qty <= 0 THEN
RAISE EXCEPTION 'qty must be a positive number, got: %', NEW.qty;
END IF;

IF NEW.unit IS NULL THEN
RAISE EXCEPTION 'unit is required';
END IF;

-- Validate unit is 'g' (grams) OR 'unit' (count-based)
-- Updated to match CHECK constraint on inventory_movements table
IF NEW.unit NOT IN ('g', 'unit') THEN
RAISE EXCEPTION 'unit must be ''g'' (grams) or ''unit'' (count), got: %', NEW.unit;
END IF;

-- Validate source_item_id or dest_item_id is provided
IF NEW.source_item_id IS NULL AND NEW.dest_item_id IS NULL THEN
RAISE EXCEPTION 'Either source_item_id or dest_item_id must be provided';
END IF;

-- Validate movement_kind is valid
IF NEW.movement_kind NOT IN (
'RECEIPT', 'CONSUME', 'PRODUCE', 'FULFILLMENT', 
'RETURN', 'RESERVE', 'RELEASE', 'ADJUSTMENT', 'RECONCILIATION'
) THEN
RAISE EXCEPTION 'Invalid movement_kind: %', NEW.movement_kind;
END IF;

-- Validate target item exists
IF NEW.dest_item_id IS NOT NULL THEN
SELECT EXISTS(SELECT 1 FROM inventory_items WHERE id = NEW.dest_item_id) INTO item_exists;
IF NOT item_exists THEN
RAISE EXCEPTION 'dest_item_id does not exist: %', NEW.dest_item_id;
END IF;
END IF;

IF NEW.source_item_id IS NOT NULL THEN
SELECT EXISTS(SELECT 1 FROM inventory_items WHERE id = NEW.source_item_id) INTO item_exists;
IF NOT item_exists THEN
RAISE EXCEPTION 'source_item_id does not exist: %', NEW.source_item_id;
END IF;
END IF;

-- Set created_by to current user if not provided
IF NEW.created_by IS NULL THEN
NEW.created_by := auth.uid();
END IF;

-- Set created_at if not provided
IF NEW.created_at IS NULL THEN
NEW.created_at := now();
END IF;

RETURN NEW;
EXCEPTION
WHEN OTHERS THEN
-- Log validation error
INSERT INTO inventory_movement_errors (movement_data, error_message, error_code, error_context)
VALUES (
row_to_json(NEW)::jsonb,
SQLERRM,
SQLSTATE,
jsonb_build_object(
'trigger', 'fn_validate_movement',
'movement_kind', NEW.movement_kind,
'qty', NEW.qty,
'unit', NEW.unit
)
);

-- Re-raise to block the insert
RAISE;
END;
$function$
;

-- Function: fn_validate_movement_item_ids
CREATE OR REPLACE FUNCTION public.fn_validate_movement_item_ids()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
-- Validate item_id usage based on movement_kind
CASE NEW.movement_kind
-- Source item required (decreases inventory)
WHEN 'CONSUME', 'FULFILLMENT', 'RESERVE' THEN
IF NEW.source_item_id IS NULL THEN
RAISE EXCEPTION 'movement_kind % requires source_item_id', NEW.movement_kind;
END IF;

-- Dest item required (increases inventory)
WHEN 'PRODUCE', 'RETURN', 'RECEIPT', 'RELEASE', 'ADJUSTMENT', 'RECONCILIATION' THEN
IF NEW.dest_item_id IS NULL THEN
RAISE EXCEPTION 'movement_kind % requires dest_item_id', NEW.movement_kind;
END IF;

ELSE
RAISE EXCEPTION 'Unknown movement_kind: %', NEW.movement_kind;
END CASE;

-- Validate qty is positive
IF NEW.qty IS NULL OR NEW.qty <= 0 THEN
RAISE EXCEPTION 'qty must be positive, got: %', NEW.qty;
END IF;

-- Validate reason_code for adjustments
IF NEW.movement_kind IN ('ADJUSTMENT', 'RECONCILIATION') AND NEW.reason_code IS NULL THEN
RAISE EXCEPTION 'movement_kind % requires reason_code', NEW.movement_kind;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_validate_order_status_transition
CREATE OR REPLACE FUNCTION public.fn_validate_order_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
v_valid_transition boolean := false;
BEGIN
IF TG_OP = 'INSERT' THEN
RETURN NEW;
END IF;

IF OLD.status = NEW.status THEN
RETURN NEW;
END IF;

v_valid_transition := CASE
WHEN OLD.status = 'submitted' AND NEW.status IN ('accepted', 'cancelled') THEN true
WHEN OLD.status = 'accepted' AND NEW.status IN ('processing', 'submitted', 'cancelled') THEN true
WHEN OLD.status = 'processing' AND NEW.status IN ('ready_for_delivery', 'accepted', 'cancelled') THEN true
WHEN OLD.status = 'ready_for_delivery' AND NEW.status IN ('completed', 'processing', 'cancelled') THEN true
WHEN OLD.status = 'completed' AND NEW.status IN ('ready_for_delivery') THEN true
WHEN OLD.status = 'cancelled' AND NEW.status IN ('submitted') THEN true

WHEN current_setting('app.bypass_status_validation', true) = 'true' THEN true

ELSE false
END;

IF NOT v_valid_transition THEN
RAISE EXCEPTION 'Invalid order status transition: % -> %',
OLD.status, NEW.status
USING ERRCODE = 'check_violation',
HINT = 'Valid transitions: forward progression, one-step revert, cancellation from any active state, and reopen from cancelled.';
END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_validate_placement_room
CREATE OR REPLACE FUNCTION public.fn_validate_placement_room()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
v_table_room_id uuid;
BEGIN
IF NEW.room_table_id IS NULL THEN
RETURN NEW;
END IF;

SELECT grow_room_id INTO v_table_room_id
FROM room_tables WHERE id = NEW.room_table_id;

IF v_table_room_id IS NULL THEN
RAISE EXCEPTION 'Placement error: room table not found';
END IF;

IF v_table_room_id != NEW.grow_room_id THEN
RAISE EXCEPTION 'Placement error: table belongs to a different room than the plant group';
END IF;

RETURN NEW;
END;
$function$
;

-- Function: fn_validate_plant_group_stage_transition
CREATE OR REPLACE FUNCTION public.fn_validate_plant_group_stage_transition()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
IF OLD.growth_stage = NEW.growth_stage THEN
RETURN NEW;
END IF;

IF OLD.growth_stage = 'harvested' THEN
RAISE EXCEPTION 'Cannot transition plant group from harvested state';
END IF;

IF NOT (
(OLD.growth_stage = 'clone'   AND NEW.growth_stage = 'veg')     OR
(OLD.growth_stage = 'veg'     AND NEW.growth_stage = 'flower')  OR
(OLD.growth_stage = 'flower'  AND NEW.growth_stage = 'harvested')
) THEN
RAISE EXCEPTION 'Invalid stage transition: % → %', OLD.growth_stage, NEW.growth_stage;
END IF;

NEW.stage_entered_at := now();
NEW.updated_at := now();
RETURN NEW;
END;
$function$
;

-- Function: generate_consolidated_package_id
CREATE OR REPLACE FUNCTION public.generate_consolidated_package_id(p_package_date date, p_strain_abbreviation text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
v_date_str text;
v_sequence integer;
v_package_id text;
v_lock_key bigint;
BEGIN
-- Create a lock key based on date and strain (hash to bigint)
v_lock_key := ('x' || md5(p_package_date::text || '-' || p_strain_abbreviation))::bit(64)::bigint;

-- Acquire advisory lock to prevent concurrent sequence number conflicts
PERFORM pg_advisory_xact_lock(v_lock_key);

-- Format date as YYMMDD
v_date_str := TO_CHAR(p_package_date, 'YYMMDD');

-- Get next sequence number (now protected by lock)
v_sequence := get_next_package_sequence(p_package_date, p_strain_abbreviation);

-- Build package ID: YYMMDD-STRAIN_ABBR-SEQ
v_package_id := v_date_str || '-' || p_strain_abbreviation || '-' || v_sequence::text;

RETURN v_package_id;
END;
$function$
;

-- Function: generate_coversheet_token
CREATE OR REPLACE FUNCTION public.generate_coversheet_token()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
RETURN encode(gen_random_bytes(32), 'hex');
END;
$function$
;

-- Function: generate_invoice_number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
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
$function$
;

-- Function: generate_manifest_number
CREATE OR REPLACE FUNCTION public.generate_manifest_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
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
$function$
;

-- Function: generate_next_package_id
CREATE OR REPLACE FUNCTION public.generate_next_package_id(p_batch_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_strain_code text;
v_date_prefix text;
v_next_seq integer;
v_package_id text;
BEGIN
-- Get strain code from batch
SELECT s.abbreviation INTO v_strain_code
FROM batch_registry b
JOIN strains s ON b.strain_id = s.id
WHERE b.id = p_batch_id;

IF v_strain_code IS NULL THEN
RAISE EXCEPTION 'Batch not found or has no strain code: %', p_batch_id;
END IF;

-- Generate date prefix (YYMMDD format)
v_date_prefix := to_char(CURRENT_DATE, 'YYMMDD');

-- Find max sequence from conversion_packages (no FOR UPDATE)
SELECT COALESCE(MAX(CAST(regexp_replace(package_id, '^[0-9]{6}-[A-Z]+-([0-9]+)$', '\1') AS integer)), 0) + 1
INTO v_next_seq
FROM conversion_packages
WHERE package_id LIKE v_date_prefix || '-' || v_strain_code || '-%';

-- Check inventory_items for higher sequence number
SELECT GREATEST(v_next_seq, COALESCE(MAX(CAST(regexp_replace(package_id, '^[0-9]{6}-[A-Z]+-([0-9]+)$', '\1') AS integer)), 0) + 1)
INTO v_next_seq
FROM inventory_items
WHERE package_id LIKE v_date_prefix || '-' || v_strain_code || '-%';

-- Generate final package ID with zero-padded sequence
v_package_id := v_date_prefix || '-' || v_strain_code || '-' || lpad(v_next_seq::text, 3, '0');

RETURN v_package_id;
END;
$function$
;

-- Function: generate_order_number
CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
dispensary_code_val text;
date_part text;
base_order_number text;
next_suffix integer;
final_order_number text;
BEGIN
-- Only generate if order_number is not already set
IF NEW.order_number IS NULL OR NEW.order_number = '' THEN

-- Get dispensary code from customer
SELECT c.dispensary_code INTO dispensary_code_val
FROM customers c
WHERE c.id = NEW.customer_id;

-- If no dispensary code found, raise error
IF dispensary_code_val IS NULL THEN
RAISE EXCEPTION 'Customer must have a dispensary_code assigned';
END IF;

-- Generate date part (YYMMDD format)
date_part := TO_CHAR(COALESCE(NEW.order_date, CURRENT_TIMESTAMP), 'YYMMDD');

-- Create base order number (dispensary code + date)
base_order_number := dispensary_code_val || date_part;

-- Check if this exact order number already exists
IF EXISTS (SELECT 1 FROM orders WHERE order_number = base_order_number) THEN
-- Find the next available suffix
SELECT COALESCE(MAX(
CASE 
WHEN order_number ~ ('^' || base_order_number || '-[0-9]+$') 
THEN CAST(SUBSTRING(order_number FROM (length(base_order_number) + 2)) AS integer)
ELSE 0
END
), 0) + 1 INTO next_suffix
FROM orders
WHERE order_number LIKE base_order_number || '%';

final_order_number := base_order_number || '-' || next_suffix;
ELSE
final_order_number := base_order_number;
END IF;

NEW.order_number := final_order_number;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: generate_order_public_token
CREATE OR REPLACE FUNCTION public.generate_order_public_token()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
new_token text;
token_exists boolean;
BEGIN
LOOP
new_token := encode(gen_random_bytes(16), 'hex');
SELECT EXISTS(SELECT 1 FROM orders WHERE public_token = new_token) INTO token_exists;
EXIT WHEN NOT token_exists;
END LOOP;
RETURN new_token;
END;
$function$
;

-- Function: get_active_bucking_sessions
CREATE OR REPLACE FUNCTION public.get_active_bucking_sessions()
 RETURNS TABLE(id uuid, session_date date, bucker_name text, binned_package_id text, strain text, batch_id text, binned_weight_grams numeric, started_at timestamp with time zone, elapsed_minutes integer)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
SELECT
bs.id,
bs.session_date,
bs.bucker_name,
bs.binned_package_id,
bs.strain,
bs.batch_id,
bs.binned_weight_grams,
bs.started_at,
EXTRACT(EPOCH FROM (now() - bs.started_at))::integer / 60 as elapsed_minutes
FROM bucking_sessions bs
WHERE bs.session_status = 'active'
ORDER BY bs.started_at ASC;
END;
$function$
;

-- Function: get_active_products
CREATE OR REPLACE FUNCTION public.get_active_products()
 RETURNS SETOF products
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
SELECT * FROM products
WHERE is_archived = false
ORDER BY product_category, name;
END;
$function$
;

-- Function: get_aggregation_details
CREATE OR REPLACE FUNCTION public.get_aggregation_details(p_batch_id uuid, p_product_name text DEFAULT NULL::text, p_session_type text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_result jsonb;
BEGIN
SELECT jsonb_build_object(
'aggregation_id', aggregation_id,
'session_type', session_type,
'batch_id', batch_id,
'batch_name', batch_name,
'strain_id', strain_id,
'strain_name', strain_name,
'product_id', product_id,
'product_name', product_name,
'output_weight', output_weight,
'output_units', output_units,
'first_completed_at', first_completed_at,
'last_completed_at', last_completed_at,
'session_count', session_count,
'session_ids', session_ids
) INTO v_result
FROM pending_conversion_sessions
WHERE batch_id = p_batch_id
AND (product_name = p_product_name OR p_product_name IS NULL)
AND (session_type = p_session_type OR p_session_type IS NULL)
LIMIT 1;

RETURN v_result;
END;
$function$
;

-- Function: get_all_user_profiles
CREATE OR REPLACE FUNCTION public.get_all_user_profiles()
 RETURNS TABLE(id uuid, email text, full_name text, role text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
requesting_user_role text;
BEGIN
-- Get the role of the user making the request
SELECT up.role INTO requesting_user_role
FROM user_profiles up
WHERE up.id = auth.uid();

-- Only allow admins to see all profiles
IF requesting_user_role = 'admin' THEN
RETURN QUERY
SELECT 
up.id,
up.email,
up.full_name,
up.role,
up.is_active,
up.created_at,
up.updated_at
FROM user_profiles up
ORDER BY up.created_at DESC;
ELSE
-- Non-admins only see their own profile
RETURN QUERY
SELECT 
up.id,
up.email,
up.full_name,
up.role,
up.is_active,
up.created_at,
up.updated_at
FROM user_profiles up
WHERE up.id = auth.uid();
END IF;
END;
$function$
;

-- Function: get_batch_available_stages
CREATE OR REPLACE FUNCTION public.get_batch_available_stages(p_batch_id uuid)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
v_stages text[];
BEGIN
SELECT array_agg(stage ORDER BY stage)
INTO v_stages
FROM batch_stage_tracking
WHERE batch_id = p_batch_id
AND available_weight_grams > 0;

RETURN COALESCE(v_stages, ARRAY[]::text[]);
END;
$function$
;

-- Function: get_batch_coa_data
CREATE OR REPLACE FUNCTION public.get_batch_coa_data(p_batch_number text)
 RETURNS TABLE(batch_number text, strain text, harvest_date date, thc_percentage numeric, cbd_percentage numeric, total_cannabinoids numeric, total_terpenes numeric, coa_status text, coa_pdf_path text)
 LANGUAGE plpgsql
AS $function$
BEGIN
RETURN QUERY
SELECT 
bcoa.batch_number,
bcoa.strain,
bcoa.harvest_date,
bcoa.thc_percentage,
bcoa.cbd_percentage,
bcoa.total_cannabinoids_percentage,
bcoa.total_terpenes_mg_g,
bcoa.coa_status,
bcoa.pdf_file_path
FROM batch_with_coa_status bcoa
WHERE bcoa.batch_number = p_batch_number;
END;
$function$
;

-- Function: get_batch_strain_summary
CREATE OR REPLACE FUNCTION public.get_batch_strain_summary()
 RETURNS TABLE(strain_name text, batch_count integer, total_weight_grams numeric, stages_present text[])
 LANGUAGE sql
 STABLE
AS $function$
SELECT
s.name as strain_name,
COUNT(DISTINCT br.id) as batch_count,
COALESCE(SUM(bst.weight_grams), 0) as total_weight_grams,
array_agg(DISTINCT bst.stage) FILTER (WHERE bst.stage IS NOT NULL) as stages_present
FROM strains s
LEFT JOIN batch_registry br ON br.strain_id = s.id
LEFT JOIN batch_stage_tracking bst ON bst.batch_id = br.id
WHERE s.is_active = true
GROUP BY s.id, s.name
ORDER BY s.name;
$function$
;

-- Function: get_batches_for_strain
CREATE OR REPLACE FUNCTION public.get_batches_for_strain(p_strain text)
 RETURNS TABLE(batch_id uuid, batch_number text, strain text, harvest_date date, coa_id uuid, status text, has_bucked boolean, has_bulk_flower boolean, has_bulk_smalls boolean, has_bulk_trim boolean, has_packaged boolean, bucked_available_grams numeric, bulk_flower_available_grams numeric, bulk_smalls_available_grams numeric, bulk_trim_available_grams numeric, packaged_available_grams numeric, total_available_grams numeric)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
SELECT
br.id as batch_id,
br.batch_number,
br.strain,
br.harvest_date,
br.coa_id,
br.status,

COALESCE(BOOL_OR(bst.stage = 'bucked' AND bst.available_weight_grams > 0), false) as has_bucked,
COALESCE(BOOL_OR(bst.stage = 'bulk_flower' AND bst.available_weight_grams > 0), false) as has_bulk_flower,
COALESCE(BOOL_OR(bst.stage = 'bulk_smalls' AND bst.available_weight_grams > 0), false) as has_bulk_smalls,
COALESCE(BOOL_OR(bst.stage = 'bulk_trim' AND bst.available_weight_grams > 0), false) as has_bulk_trim,
COALESCE(BOOL_OR(bst.stage = 'packaged' AND bst.available_weight_grams > 0), false) as has_packaged,

COALESCE(MAX(CASE WHEN bst.stage = 'bucked' THEN bst.available_weight_grams ELSE 0 END), 0) as bucked_available_grams,
COALESCE(MAX(CASE WHEN bst.stage = 'bulk_flower' THEN bst.available_weight_grams ELSE 0 END), 0) as bulk_flower_available_grams,
COALESCE(MAX(CASE WHEN bst.stage = 'bulk_smalls' THEN bst.available_weight_grams ELSE 0 END), 0) as bulk_smalls_available_grams,
COALESCE(MAX(CASE WHEN bst.stage = 'bulk_trim' THEN bst.available_weight_grams ELSE 0 END), 0) as bulk_trim_available_grams,
COALESCE(MAX(CASE WHEN bst.stage = 'packaged' THEN bst.available_weight_grams ELSE 0 END), 0) as packaged_available_grams,

COALESCE(SUM(bst.available_weight_grams), 0) as total_available_grams

FROM batch_registry br
LEFT JOIN batch_stage_tracking bst ON bst.batch_id = br.id
WHERE
br.strain = p_strain
AND br.status = 'active'
AND (br.is_quarantined IS NULL OR br.is_quarantined = false)
GROUP BY br.id, br.batch_number, br.strain, br.harvest_date, br.coa_id, br.status
ORDER BY COALESCE(SUM(bst.available_weight_grams), 0) DESC, br.batch_number DESC;
END;
$function$
;

-- Function: get_bucking_remaining_weight
CREATE OR REPLACE FUNCTION public.get_bucking_remaining_weight(session_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE
AS $function$
SELECT 
COALESCE(binned_weight_grams, 0) - 
(COALESCE(bucked_flower_grams, 0) + COALESCE(bucked_smalls_grams, 0) + COALESCE(waste_grams, 0))
FROM bucking_sessions
WHERE id = session_id;
$function$
;

-- Function: get_bucking_session_stats
CREATE OR REPLACE FUNCTION public.get_bucking_session_stats(p_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(active_sessions bigint, completed_today bigint, total_kg_processed numeric, avg_kg_per_hour numeric, total_flower_grams numeric, total_smalls_grams numeric, total_waste_grams numeric)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
SELECT
COUNT(*) FILTER (WHERE session_status = 'active') as active_sessions,
COUNT(*) FILTER (WHERE session_status = 'completed' AND session_date = p_date) as completed_today,
SUM(binned_weight_grams) FILTER (WHERE session_status = 'completed' AND session_date = p_date) / 1000.0 as total_kg_processed,
AVG(kg_per_hour) FILTER (WHERE session_status = 'completed' AND session_date = p_date AND kg_per_hour IS NOT NULL) as avg_kg_per_hour,
SUM(bucked_flower_grams) FILTER (WHERE session_status = 'completed' AND session_date = p_date) as total_flower_grams,
SUM(bucked_smalls_grams) FILTER (WHERE session_status = 'completed' AND session_date = p_date) as total_smalls_grams,
SUM(waste_grams) FILTER (WHERE session_status = 'completed' AND session_date = p_date) as total_waste_grams
FROM bucking_sessions;
END;
$function$
;

-- Function: get_canonical_products_for_strain
CREATE OR REPLACE FUNCTION public.get_canonical_products_for_strain(p_strain_id uuid)
 RETURNS TABLE(product_id uuid, product_name text, product_type text, is_available boolean)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
SELECT 
p.id as product_id,
p.name as product_name,
pt.name as product_type,
(p.is_active AND NOT p.is_archived) as is_available
FROM products p
JOIN product_types pt ON p.type_id = pt.id
JOIN product_stages ps ON p.stage_id = ps.id
WHERE p.strain_id = p_strain_id
AND ps.name = 'Packaged'
AND pt.name IN ('1lb Flower (454g)', '1lb Smalls (454g)', '14g Smalls', '3.5g Flower', '1g Preroll')
AND p.is_archived = false
ORDER BY pt.sort_order, p.name;
END;
$function$
;

-- Function: get_conversion_lot_summary
CREATE OR REPLACE FUNCTION public.get_conversion_lot_summary(p_date date DEFAULT NULL::date)
 RETURNS TABLE(batch_id uuid, batch_name text, strain_id uuid, strain_name text, strain_code text, session_type text, session_count bigint, total_weight numeric, total_units integer, has_packages boolean, package_count bigint, pending_review_count bigint, session_date date, status text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
SELECT 
csv.batch_id,
csv.batch_name,
csv.strain_id,
csv.strain_name,
csv.strain_code,
csv.session_type,
COUNT(*)::BIGINT as session_count,
SUM(csv.total_weight) as total_weight,
SUM(csv.total_units)::INTEGER as total_units,
BOOL_OR(csv.has_packages) as has_packages,
SUM(csv.package_count)::BIGINT as package_count,
COALESCE((
SELECT COUNT(DISTINCT ii.id)
FROM conversion_packages cp2
JOIN inventory_items ii ON ii.package_id = cp2.package_id
WHERE cp2.batch_id = csv.batch_id
AND cp2.product_id IS NOT NULL
AND ii.review_status = 'pending'
), 0)::BIGINT as pending_review_count,
csv.session_date,
-- Set status based on packages state
CASE
WHEN BOOL_OR(csv.has_packages) THEN 'packages_created'
ELSE 'active'
END::TEXT as status
FROM conversion_summary_view csv
WHERE (p_date IS NULL OR csv.session_date = p_date)
GROUP BY 
csv.batch_id,
csv.batch_name,
csv.strain_id,
csv.strain_name,
csv.strain_code,
csv.session_type,
csv.session_date
ORDER BY 
csv.session_date DESC,
csv.strain_name ASC,
csv.session_type ASC;
END;
$function$
;

-- Function: get_coversheet_customer_info
CREATE OR REPLACE FUNCTION public.get_coversheet_customer_info(p_order_id uuid)
 RETURNS TABLE(customer_name text, license_number text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
RETURN QUERY
SELECT
c.name::text,
c.license_number::text
FROM orders o
INNER JOIN customers c ON c.id = o.customer_id
WHERE o.id = p_order_id
LIMIT 1;
END;
$function$
;

-- Function: get_inventory_discrepancies
CREATE OR REPLACE FUNCTION public.get_inventory_discrepancies(p_min_discrepancy numeric DEFAULT 0.01, p_limit integer DEFAULT 100)
 RETURNS TABLE(item_id uuid, package_id text, batch_id uuid, product_name text, strain text, current_qty numeric, ledger_qty numeric, discrepancy numeric, abs_discrepancy numeric, product_stage_id uuid, movement_count bigint, last_movement_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
SELECT
id.id as item_id,
id.package_id,
id.batch_id,
id.product_name,
id.strain,
id.current_qty,
id.ledger_qty,
id.discrepancy,
id.abs_discrepancy,
id.product_stage_id,
(
SELECT COUNT(*)
FROM inventory_movements im
WHERE im.source_item_id = id.id OR im.dest_item_id = id.id
) as movement_count,
(
SELECT MAX(created_at)
FROM inventory_movements im
WHERE im.source_item_id = id.id OR im.dest_item_id = id.id
) as last_movement_at
FROM inventory_discrepancies id
WHERE id.abs_discrepancy >= p_min_discrepancy
ORDER BY id.abs_discrepancy DESC
LIMIT p_limit;
END;
$function$
;

-- Function: get_item_movement_history
CREATE OR REPLACE FUNCTION public.get_item_movement_history(p_item_id uuid, p_limit integer DEFAULT 50)
 RETURNS TABLE(movement_id uuid, movement_kind text, qty numeric, unit text, reason_code text, reference_id uuid, reference_type text, notes text, created_by uuid, created_at timestamp with time zone, running_total numeric)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
WITH movements AS (
SELECT
im.id as movement_id,
im.movement_kind::text,
im.qty,
im.unit,
im.reason_code,
im.reference_id,
im.reference_type,
im.notes,
im.created_by,
im.created_at,
ROW_NUMBER() OVER (ORDER BY im.created_at) as row_num
FROM inventory_movements im
WHERE im.source_item_id = p_item_id OR im.dest_item_id = p_item_id
ORDER BY im.created_at DESC
LIMIT p_limit
)
SELECT
m.movement_id,
m.movement_kind,
m.qty,
m.unit,
m.reason_code,
m.reference_id,
m.reference_type,
m.notes,
m.created_by,
m.created_at,
calculate_ledger_quantity(p_item_id) as running_total
FROM movements m
ORDER BY m.created_at DESC;
END;
$function$
;

-- Function: get_movement_metrics
CREATE OR REPLACE FUNCTION public.get_movement_metrics(p_hours integer DEFAULT 24)
 RETURNS TABLE(time_bucket text, movement_count bigint, avg_qty numeric, error_count bigint, success_rate numeric)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
WITH hourly_movements AS (
SELECT
DATE_TRUNC('hour', created_at) as hour,
COUNT(*) as count,
AVG(qty) as avg_quantity
FROM inventory_movements
WHERE created_at >= NOW() - (p_hours || ' hours')::INTERVAL
GROUP BY DATE_TRUNC('hour', created_at)
),
hourly_errors AS (
SELECT
DATE_TRUNC('hour', created_at) as hour,
COUNT(*) as count
FROM inventory_movement_errors
WHERE created_at >= NOW() - (p_hours || ' hours')::INTERVAL
GROUP BY DATE_TRUNC('hour', created_at)
)
SELECT
TO_CHAR(hm.hour, 'YYYY-MM-DD HH24:00') as time_bucket,
hm.count as movement_count,
ROUND(hm.avg_quantity, 2) as avg_qty,
COALESCE(he.count, 0) as error_count,
CASE
WHEN hm.count > 0
THEN ROUND((1 - COALESCE(he.count, 0)::numeric / hm.count) * 100, 2)
ELSE 100
END as success_rate
FROM hourly_movements hm
LEFT JOIN hourly_errors he ON hm.hour = he.hour
ORDER BY hm.hour DESC;
END;
$function$
;

-- Function: get_next_package_sequence
CREATE OR REPLACE FUNCTION public.get_next_package_sequence(p_package_date date, p_strain_abbreviation text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
v_max_seq integer;
v_pattern text;
BEGIN
-- Build pattern for this date and strain (e.g., '251015-GAS-%')
v_pattern := TO_CHAR(p_package_date, 'YYMMDD') || '-' || p_strain_abbreviation || '-%';

-- Find highest sequence number for this date and strain
SELECT COALESCE(
MAX(
CAST(
SUBSTRING(package_id FROM LENGTH(TO_CHAR(p_package_date, 'YYMMDD') || '-' || p_strain_abbreviation || '-') + 1)
AS integer
)
),
0
)
INTO v_max_seq
FROM consolidated_packages
WHERE package_id LIKE v_pattern;

-- Return next sequence number
RETURN COALESCE(v_max_seq, 0) + 1;
END;
$function$
;

-- Function: get_or_create_batch_from_inventory
CREATE OR REPLACE FUNCTION public.get_or_create_batch_from_inventory(p_batch_number text, p_strain_name text, p_room text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
v_batch_id uuid;
v_strain_id uuid;
v_initial_weight numeric;
BEGIN
-- Return NULL for empty input
IF p_batch_number IS NULL OR trim(p_batch_number) = '' THEN
RETURN NULL;
END IF;

IF p_strain_name IS NULL OR trim(p_strain_name) = '' THEN
RETURN NULL;
END IF;

-- Normalize inputs
p_batch_number := trim(p_batch_number);
p_strain_name := trim(p_strain_name);

-- Try to find existing batch by batch_number
SELECT id INTO v_batch_id
FROM batch_registry
WHERE batch_number = p_batch_number
LIMIT 1;

-- If batch exists, return it
IF v_batch_id IS NOT NULL THEN
RETURN v_batch_id;
END IF;

-- Get or create strain
v_strain_id := get_or_create_strain(p_strain_name, 'unknown');

-- Calculate initial weight from current inventory
SELECT COALESCE(SUM(available_qty), 0) INTO v_initial_weight
FROM inventory_items
WHERE batch = p_batch_number;

-- Create new batch
INSERT INTO batch_registry (
batch_number,
strain,
strain_id,
harvest_date,
room,
initial_weight_grams,
lifecycle_state,
status,
notes,
created_at,
updated_at
) VALUES (
p_batch_number,
p_strain_name,
v_strain_id,
CURRENT_DATE - INTERVAL '60 days', -- Estimate 60 days ago
p_room,
v_initial_weight,
'bucked', -- Default to bucked since it's coming from inventory
'active',
'Auto-created from inventory import',
now(),
now()
)
RETURNING id INTO v_batch_id;

-- Log creation event if log function exists
BEGIN
PERFORM log_batch_lifecycle_event(
v_batch_id,
'state_transition',
NULL,
'bucked',
'system',
'Batch auto-created from inventory_items'
);
EXCEPTION
WHEN undefined_function THEN
NULL; -- Ignore if function doesn't exist
END;

RETURN v_batch_id;
END;
$function$
;

-- Function: get_or_create_strain
CREATE OR REPLACE FUNCTION public.get_or_create_strain(p_strain_name text, p_category text DEFAULT 'unknown'::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
v_strain_id uuid;
v_normalized text;
BEGIN
-- Return NULL for empty input
IF p_strain_name IS NULL OR trim(p_strain_name) = '' THEN
RETURN NULL;
END IF;

v_normalized := trim(p_strain_name);

-- Try to find existing strain
v_strain_id := normalize_strain_name(v_normalized);

-- If not found, create it
IF v_strain_id IS NULL THEN
INSERT INTO strains (
name,
display_name,
category,
is_active,
created_at,
updated_at
) VALUES (
v_normalized,
v_normalized,
p_category,
true,
now(),
now()
)
RETURNING id INTO v_strain_id;
END IF;

RETURN v_strain_id;
END;
$function$
;

-- Function: get_order_data_health
CREATE OR REPLACE FUNCTION public.get_order_data_health()
 RETURNS TABLE(total_orders bigint, orders_with_items bigint, orders_without_items bigint, orders_with_mismatched_totals bigint, total_revenue numeric, health_status text)
 LANGUAGE plpgsql
AS $function$
DECLARE
v_total_orders bigint;
v_orders_with_items bigint;
v_orders_without_items bigint;
v_mismatched bigint;
v_total_revenue numeric;
v_health_status text;
BEGIN
-- Count total active orders
SELECT COUNT(*) INTO v_total_orders
FROM orders
WHERE archived = false AND status != 'cancelled';

-- Count orders with items
SELECT COUNT(DISTINCT o.id) INTO v_orders_with_items
FROM orders o
INNER JOIN order_items oi ON o.id = oi.order_id
WHERE o.archived = false AND o.status != 'cancelled';

-- Count orders without items
v_orders_without_items := v_total_orders - v_orders_with_items;

-- Count orders with mismatched totals
SELECT COUNT(*) INTO v_mismatched
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.archived = false AND o.status != 'cancelled'
GROUP BY o.id, o.total_amount
HAVING o.total_amount != COALESCE(SUM(oi.subtotal), 0);

-- Calculate total revenue
SELECT COALESCE(SUM(total_amount), 0) INTO v_total_revenue
FROM orders
WHERE archived = false AND status != 'cancelled';

-- Determine health status
IF v_mismatched = 0 AND v_orders_without_items = 0 THEN
v_health_status := 'HEALTHY';
ELSIF v_mismatched > 0 THEN
v_health_status := 'WARNING: Mismatched totals detected';
ELSE
v_health_status := 'CAUTION: Some orders have no items';
END IF;

RETURN QUERY SELECT
v_total_orders,
v_orders_with_items,
v_orders_without_items,
v_mismatched,
v_total_revenue,
v_health_status;
END;
$function$
;

-- Function: get_package_date_from_conversion
CREATE OR REPLACE FUNCTION public.get_package_date_from_conversion(p_pending_conversion_id uuid)
 RETURNS date
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
v_package_date date;
BEGIN
-- Get the date portion of session_completed_at
SELECT DATE(session_completed_at) INTO v_package_date
FROM pending_conversions
WHERE id = p_pending_conversion_id;

RETURN COALESCE(v_package_date, CURRENT_DATE);
END;
$function$
;

-- Function: get_packaging_remaining_weight
CREATE OR REPLACE FUNCTION public.get_packaging_remaining_weight(session_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE
AS $function$
SELECT 
COALESCE(pull_weight, 0) - 
(COALESCE(units_3_5g, 0) * 3.5 + 
COALESCE(units_14g, 0) * 14 + 
COALESCE(units_454g, 0) * 454 + 
COALESCE(waste_grams, 0))
FROM packaging_sessions
WHERE id = session_id;
$function$
;

-- Function: get_pending_conversions
CREATE OR REPLACE FUNCTION public.get_pending_conversions(p_date date DEFAULT NULL::date)
 RETURNS TABLE(batch_id uuid, batch_name text, strain_id uuid, strain_name text, strain_code text, session_type text, session_id uuid, session_date date, output_weight numeric, output_units integer, has_pending_packages boolean, pending_package_count bigint, completed_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
SELECT
csv.batch_id,
csv.batch_name,
csv.strain_id,
csv.strain_name,
csv.strain_code,
csv.session_type,
csv.session_id,
csv.session_date,
csv.total_weight as output_weight,
csv.total_units as output_units,
(csv.pending_package_count > 0) as has_pending_packages,
csv.pending_package_count,
csv.completed_at
FROM conversion_summary_view csv
WHERE
-- Only show sessions that haven't been finalized yet
csv.is_finalized = false
-- Optional date filter
AND (p_date IS NULL OR csv.session_date = p_date)
ORDER BY
csv.completed_at DESC,
csv.strain_name ASC,
csv.session_type ASC;
END;
$function$
;

-- Function: get_product_coverage_report
CREATE OR REPLACE FUNCTION public.get_product_coverage_report()
 RETURNS TABLE(strain_name text, total_applicable_products integer, existing_products integer, missing_products integer, coverage_percentage numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
RETURN QUERY
WITH strain_expected_products AS (
SELECT
s.id AS strain_id,
s.name AS strain_name,
COUNT(DISTINCT (ps.id, pt.id)) AS expected_count
FROM strains s
CROSS JOIN product_stages ps
CROSS JOIN product_types pt
WHERE s.is_active = true
AND ps.is_active = true
AND pt.is_active = true
AND ps.name = ANY(pt.applicable_stages)
GROUP BY s.id, s.name
),
strain_actual_products AS (
SELECT
s.id AS strain_id,
COUNT(*) AS actual_count
FROM strains s
LEFT JOIN products p ON s.id = p.strain_id
WHERE s.is_active = true
GROUP BY s.id
)
SELECT
sep.strain_name,
sep.expected_count::integer AS total_applicable_products,
COALESCE(sap.actual_count, 0)::integer AS existing_products,
(sep.expected_count - COALESCE(sap.actual_count, 0))::integer AS missing_products,
ROUND((COALESCE(sap.actual_count, 0)::numeric / sep.expected_count::numeric) * 100, 2) AS coverage_percentage
FROM strain_expected_products sep
LEFT JOIN strain_actual_products sap ON sep.strain_id = sap.strain_id
ORDER BY coverage_percentage ASC, sep.strain_name;
END;
$function$
;

-- Function: get_product_id_by_strain_stage_and_type
CREATE OR REPLACE FUNCTION public.get_product_id_by_strain_stage_and_type(p_batch_id uuid, p_stage_name text, p_is_smalls boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
v_product_id uuid;
v_strain_id uuid;
v_stage_id uuid;
BEGIN
-- Get strain_id from batch
SELECT strain_id INTO v_strain_id
FROM batch_registry
WHERE id = p_batch_id;

IF v_strain_id IS NULL THEN
RAISE WARNING 'Batch % has no strain_id, cannot lookup product', p_batch_id;
RETURN NULL;
END IF;

-- Get stage_id
SELECT id INTO v_stage_id
FROM product_stages
WHERE name = p_stage_name
LIMIT 1;

IF v_stage_id IS NULL THEN
RAISE WARNING 'Stage "%" not found', p_stage_name;
RETURN NULL;
END IF;

-- Find product matching strain + stage + smalls flag
SELECT id INTO v_product_id
FROM products
WHERE strain_id = v_strain_id
AND stage_id = v_stage_id
AND (is_active IS NULL OR is_active = true)
AND (is_archived IS NULL OR is_archived = false)
AND (
(p_is_smalls = false AND (name NOT ILIKE '%smalls%'))
OR
(p_is_smalls = true AND name ILIKE '%smalls%')
)
ORDER BY created_at DESC
LIMIT 1;

IF v_product_id IS NULL THEN
RAISE WARNING 'No product found for strain_id=%, stage=%, smalls=%',
v_strain_id, p_stage_name, p_is_smalls;
END IF;

RETURN v_product_id;
END;
$function$
;

-- Function: get_recent_movement_errors
CREATE OR REPLACE FUNCTION public.get_recent_movement_errors(p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, movement_data jsonb, error_message text, error_code text, error_context jsonb, created_at timestamp with time zone, resolved_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
SELECT
ime.id,
ime.movement_data,
ime.error_message,
ime.error_code,
ime.error_context,
ime.created_at,
ime.resolved_at
FROM inventory_movement_errors ime
ORDER BY ime.created_at DESC
LIMIT p_limit;
END;
$function$
;

-- Function: get_strain_abbreviation
CREATE OR REPLACE FUNCTION public.get_strain_abbreviation(p_strain_name text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
v_result RECORD;
v_generated text;
v_words text[];
BEGIN
-- Try to find strain
SELECT * INTO v_result FROM find_strain_by_name(p_strain_name);

-- If found and has abbreviation, return it
IF v_result.strain_id IS NOT NULL AND v_result.strain_abbreviation IS NOT NULL THEN
RETURN v_result.strain_abbreviation;
END IF;

-- Fallback: Generate abbreviation from name
v_words := string_to_array(TRIM(p_strain_name), ' ');

IF array_length(v_words, 1) >= 2 THEN
-- Multi-word: take first letter of each word
v_generated := '';
FOR i IN 1..LEAST(array_length(v_words, 1), 3) LOOP
v_generated := v_generated || UPPER(substring(v_words[i] from 1 for 1));
END LOOP;
RETURN v_generated;
ELSE
-- Single word: take first 3 characters
RETURN UPPER(substring(TRIM(p_strain_name) from 1 for 3));
END IF;
END;
$function$
;

-- Function: get_trigger_performance_summary
CREATE OR REPLACE FUNCTION public.get_trigger_performance_summary()
 RETURNS TABLE(metric text, value numeric, unit text, status text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
SELECT 'Total Movements'::text, COUNT(*)::numeric, 'count'::text, 'info'::text
FROM inventory_movements
UNION ALL
SELECT 'Movements (24h)', COUNT(*)::numeric, 'count', 'info'
FROM inventory_movements WHERE created_at >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 'Avg Movements/Hour', 
ROUND(COUNT(*)::numeric / 24, 2),
'per hour',
CASE WHEN COUNT(*) / 24 > 100 THEN 'warning' ELSE 'success' END
FROM inventory_movements WHERE created_at >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 'Error Rate (24h)',
ROUND(
COALESCE(
(SELECT COUNT(*) FROM inventory_movement_errors WHERE created_at >= NOW() - INTERVAL '24 hours')::numeric /
NULLIF((SELECT COUNT(*) FROM inventory_movements WHERE created_at >= NOW() - INTERVAL '24 hours'), 0) * 100,
0
),
2
),
'percent',
CASE
WHEN COALESCE(
(SELECT COUNT(*) FROM inventory_movement_errors WHERE created_at >= NOW() - INTERVAL '24 hours')::numeric /
NULLIF((SELECT COUNT(*) FROM inventory_movements WHERE created_at >= NOW() - INTERVAL '24 hours'), 0) * 100,
0
) > 5 THEN 'error'
WHEN COALESCE(
(SELECT COUNT(*) FROM inventory_movement_errors WHERE created_at >= NOW() - INTERVAL '24 hours')::numeric /
NULLIF((SELECT COUNT(*) FROM inventory_movements WHERE created_at >= NOW() - INTERVAL '24 hours'), 0) * 100,
0
) > 1 THEN 'warning'
ELSE 'success'
END
UNION ALL
SELECT 'Unresolved Errors',
COUNT(*)::numeric,
'count',
CASE WHEN COUNT(*) > 10 THEN 'error' WHEN COUNT(*) > 0 THEN 'warning' ELSE 'success' END
FROM inventory_movement_errors WHERE resolved_at IS NULL;
END;
$function$
;

-- Function: get_trim_remaining_weight
CREATE OR REPLACE FUNCTION public.get_trim_remaining_weight(session_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE
AS $function$
SELECT 
COALESCE(pulled_weight, 0) - 
(COALESCE(big_buds_grams, 0) + COALESCE(small_buds_grams, 0) + 
COALESCE(bucked_smalls_grams, 0) + COALESCE(waste_grams, 0))
FROM trim_sessions
WHERE id = session_id;
$function$
;

-- Function: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
user_count integer;
new_role text;
BEGIN
-- Count existing profiles
SELECT COUNT(*) INTO user_count FROM public.user_profiles;

-- Determine role (first user is admin)
IF user_count = 0 THEN
new_role := 'admin';
ELSE
new_role := 'user';
END IF;

-- Insert new profile
INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
VALUES (
NEW.id,
NEW.email,
COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
new_role,
true
);

RETURN NEW;
EXCEPTION WHEN OTHERS THEN
-- Log error but don't fail the auth user creation
RAISE WARNING 'Error creating user profile for %: %', NEW.id, SQLERRM;
RETURN NEW;
END;
$function$
;

-- Function: is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
RETURN EXISTS (
SELECT 1 FROM user_profiles
WHERE user_profiles.id = auth.uid()
AND user_profiles.role = 'admin'
);
END;
$function$
;

-- Function: is_product_orderable
CREATE OR REPLACE FUNCTION public.is_product_orderable(p_product_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
v_stage_name text;
v_is_active boolean;
BEGIN
SELECT ps.name, p.is_active
INTO v_stage_name, v_is_active
FROM products p
JOIN product_stages ps ON p.stage_id = ps.id
WHERE p.id = p_product_id;

RETURN v_stage_name = 'Packaged' AND v_is_active = true;
END;
$function$
;

-- Function: is_test_mode_enabled
CREATE OR REPLACE FUNCTION public.is_test_mode_enabled()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
enabled boolean;
BEGIN
SELECT (setting_value)::boolean INTO enabled
FROM app_settings
WHERE category = 'testing'
AND setting_key = 'test_mode_enabled';

RETURN COALESCE(enabled, false);
END;
$function$
;

-- Function: log_test_mode_bypass
CREATE OR REPLACE FUNCTION public.log_test_mode_bypass(p_action text, p_validation_bypassed text, p_context jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
v_log_id uuid;
BEGIN
-- Only log if test mode is enabled
IF NOT is_test_mode_enabled() THEN
RETURN NULL;
END IF;

INSERT INTO test_mode_audit_log (
user_id,
action,
validation_bypassed,
context
) VALUES (
auth.uid(),
p_action,
p_validation_bypassed,
p_context
)
RETURNING id INTO v_log_id;

RETURN v_log_id;
END;
$function$
;

-- Function: mark_coversheet_outdated
CREATE OR REPLACE FUNCTION public.mark_coversheet_outdated()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
v_order_id uuid;
BEGIN
IF TG_TABLE_NAME = 'orders' THEN
v_order_id := NEW.id;
ELSE
v_order_id := NEW.order_id;
END IF;

UPDATE coversheets
SET
is_outdated = true,
last_order_update = now()
WHERE
order_id = v_order_id
AND is_active = true;

RETURN NEW;
END;
$function$
;

-- Function: normalize_strain_name
CREATE OR REPLACE FUNCTION public.normalize_strain_name(p_strain_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
v_strain_id uuid;
v_normalized text;
BEGIN
-- Return NULL for empty input
IF p_strain_name IS NULL OR trim(p_strain_name) = '' THEN
RETURN NULL;
END IF;

-- Normalize: trim whitespace
v_normalized := trim(p_strain_name);

-- Try exact match first
SELECT id INTO v_strain_id
FROM strains
WHERE name = v_normalized
LIMIT 1;

IF v_strain_id IS NOT NULL THEN
RETURN v_strain_id;
END IF;

-- Try case-insensitive match
SELECT id INTO v_strain_id
FROM strains
WHERE lower(name) = lower(v_normalized)
LIMIT 1;

IF v_strain_id IS NOT NULL THEN
RETURN v_strain_id;
END IF;

-- Try alias match
SELECT strain_id INTO v_strain_id
FROM strain_aliases
WHERE lower(alias) = lower(v_normalized)
LIMIT 1;

RETURN v_strain_id;
END;
$function$
;

-- Function: populate_batch_number
CREATE OR REPLACE FUNCTION public.populate_batch_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
-- Only populate if batch_number is NULL and batch_id is NOT NULL
IF NEW.batch_number IS NULL AND NEW.batch_id IS NOT NULL THEN
-- Query batch_registry to get batch_number
SELECT batch_number INTO NEW.batch_number
FROM batch_registry
WHERE id = NEW.batch_id;

-- If batch_id doesn't exist in batch_registry, log warning but don't fail
IF NEW.batch_number IS NULL THEN
RAISE WARNING 'batch_id % not found in batch_registry for inventory_item', NEW.batch_id;
END IF;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: prevent_consumed_allocation_changes
CREATE OR REPLACE FUNCTION public.prevent_consumed_allocation_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
IF OLD.allocation_status = 'consumed' AND TG_OP = 'UPDATE' THEN
RAISE EXCEPTION 'Cannot modify consumed allocations. Order must be moved back to processing status first.';
END IF;

IF OLD.allocation_status = 'consumed' AND TG_OP = 'DELETE' THEN
RAISE EXCEPTION 'Cannot delete consumed allocations. Order must be moved back to processing status first.';
END IF;

RETURN NEW;
END;
$function$
;

-- Function: record_session_loss_weight
CREATE OR REPLACE FUNCTION public.record_session_loss_weight(p_session_type text, p_session_id uuid, p_loss_grams numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_updated_count int;
BEGIN
-- Validate session type
IF p_session_type NOT IN ('trim', 'packaging', 'bucking') THEN
RAISE EXCEPTION 'Invalid session type: %', p_session_type;
END IF;

-- Validate loss amount
IF p_loss_grams < 0 THEN
RAISE EXCEPTION 'Loss weight cannot be negative';
END IF;

-- Update the appropriate session table
IF p_session_type = 'trim' THEN
UPDATE trim_sessions
SET
waste_grams = p_loss_grams,
updated_at = now()
WHERE id = p_session_id
AND finalization_status IS NULL;  -- Only update non-finalized sessions

GET DIAGNOSTICS v_updated_count = ROW_COUNT;

ELSIF p_session_type = 'packaging' THEN
UPDATE packaging_sessions
SET
waste_grams = p_loss_grams,
updated_at = now()
WHERE id = p_session_id
AND finalization_status IS NULL;

GET DIAGNOSTICS v_updated_count = ROW_COUNT;

ELSIF p_session_type = 'bucking' THEN
UPDATE bucking_sessions
SET
waste_grams = p_loss_grams,
updated_at = now()
WHERE id = p_session_id
AND finalization_status IS NULL;

GET DIAGNOSTICS v_updated_count = ROW_COUNT;
END IF;

-- Return result
IF v_updated_count = 0 THEN
RETURN jsonb_build_object(
'success', false,
'error', 'Session not found or already finalized'
);
END IF;

RETURN jsonb_build_object(
'success', true,
'session_id', p_session_id,
'loss_grams', p_loss_grams,
'updated_count', v_updated_count
);
END;
$function$
;

-- Function: release_inventory_on_cancellation
CREATE OR REPLACE FUNCTION public.release_inventory_on_cancellation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
v_inventory_item RECORD;
v_package_id_column text;
v_pull_weight_column text;
v_package_id text;
v_pull_weight numeric;
v_new_json jsonb;
BEGIN
-- Only process if session was actually cancelled
IF NEW.cancelled_at IS NULL OR OLD.cancelled_at IS NOT NULL THEN
RETURN NEW;
END IF;

-- Convert NEW to JSON for dynamic extraction
v_new_json := to_jsonb(NEW);

-- Determine column names based on table
IF TG_TABLE_NAME = 'bucking_sessions' THEN
v_package_id_column := 'binned_package_id';
v_pull_weight_column := 'binned_weight_grams';
ELSIF TG_TABLE_NAME = 'trim_sessions' THEN
v_package_id_column := 'package_id';
v_pull_weight_column := 'pulled_weight';  -- FIXED: was 'pull_weight'
ELSIF TG_TABLE_NAME = 'packaging_sessions' THEN
v_package_id_column := 'package_id';
v_pull_weight_column := 'pull_weight';
ELSE
RAISE EXCEPTION 'Unknown session table: %', TG_TABLE_NAME;
END IF;

-- Extract values
v_package_id := v_new_json->>v_package_id_column;
v_pull_weight := (v_new_json->>v_pull_weight_column)::numeric;

-- Validate fields exist
IF v_package_id IS NULL OR v_pull_weight IS NULL THEN
RAISE WARNING 'Cannot release inventory: missing package_id or pull_weight';
RETURN NEW;
END IF;

-- Get inventory item
SELECT * INTO v_inventory_item
FROM inventory_items
WHERE package_id = v_package_id;

IF NOT FOUND THEN
RAISE WARNING 'Inventory item % not found during session cancellation', v_package_id;
RETURN NEW;
END IF;

-- Release reserved inventory back to available
UPDATE inventory_items
SET
available_qty = available_qty + v_pull_weight,
reserved_qty = GREATEST(0, reserved_qty - v_pull_weight),
atp_qty = atp_qty + v_pull_weight,
updated_at = now()
WHERE id = v_inventory_item.id;

-- Create movement record in ledger
INSERT INTO inventory_movements (
occurred_at,
movement_kind,
package_id,
product_stage_from,
product_stage_to,
quantity_delta,
strain_id,
batch_id,
notes,
reference_type,
reference_id
)
VALUES (
now(),
'release',
v_package_id,
v_inventory_item.product_stage_id,
v_inventory_item.product_stage_id,
v_pull_weight,
v_inventory_item.strain_id,
v_inventory_item.batch_id,
format('Released due to %s session cancellation', TG_TABLE_NAME),
TG_TABLE_NAME,
NEW.id
);

RAISE NOTICE 'Released % g back to % due to session cancellation', v_pull_weight, v_package_id;

RETURN NEW;
END;
$function$
;

-- Function: release_inventory_on_session_cancel
CREATE OR REPLACE FUNCTION public.release_inventory_on_session_cancel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
v_inventory_item RECORD;
v_package_id_column text;
v_pull_weight_column text;
v_package_id text;
v_pull_weight numeric;
v_new_json jsonb;
BEGIN
-- Only process if session was actually cancelled
IF NEW.cancelled_at IS NULL OR OLD.cancelled_at IS NOT NULL THEN
RETURN NEW;
END IF;

-- Convert NEW to JSON for dynamic extraction
v_new_json := to_jsonb(NEW);

-- Determine column names based on table
IF TG_TABLE_NAME = 'bucking_sessions' THEN
v_package_id_column := 'binned_package_id';
v_pull_weight_column := 'binned_weight_grams';
ELSIF TG_TABLE_NAME = 'trim_sessions' THEN
v_package_id_column := 'package_id';
v_pull_weight_column := 'pull_weight';
ELSIF TG_TABLE_NAME = 'packaging_sessions' THEN
v_package_id_column := 'package_id';
v_pull_weight_column := 'pull_weight';
ELSE
RAISE EXCEPTION 'Unknown session table: %', TG_TABLE_NAME;
END IF;

-- Extract values
v_package_id := v_new_json->>v_package_id_column;
v_pull_weight := (v_new_json->>v_pull_weight_column)::numeric;

-- Validate fields exist
IF v_package_id IS NULL OR v_pull_weight IS NULL THEN
RAISE WARNING 'Cannot release inventory: missing package_id or pull_weight';
RETURN NEW;
END IF;

-- Get inventory item
SELECT * INTO v_inventory_item
FROM inventory_items
WHERE package_id = v_package_id;

IF NOT FOUND THEN
RAISE WARNING 'Inventory item % not found during session cancellation', v_package_id;
RETURN NEW;
END IF;

-- Release the reservation (restore ATP)
UPDATE inventory_items
SET
available_qty = available_qty + v_pull_weight,
reserved_qty = GREATEST(0, reserved_qty - v_pull_weight),
last_updated = now()
WHERE package_id = v_package_id;

-- Create audit trail with PURE event-driven architecture
INSERT INTO inventory_movements (
-- Event-driven architecture fields
movement_kind,      -- 'RELEASE'
dest_item_id,       -- UUID reference (restoring to this item)
qty,                -- Amount being released
unit,               -- 'g'

-- Context fields
reference_id,       -- Session UUID
reference_type,     -- Session type
reason_code,        -- 'session_cancel'

-- Human-readable notes
notes,
movement_date
) VALUES (
'RELEASE',
v_inventory_item.id,
v_pull_weight,
'g',

NEW.id,
TG_TABLE_NAME,
'session_cancel',

format('Released %s g reservation due to %s session cancellation',
v_pull_weight,
TG_TABLE_NAME
),
now()
);

RAISE NOTICE 'Released % g back to % due to session cancellation', v_pull_weight, v_package_id;

RETURN NEW;
END;
$function$
;

-- Function: repair_order_totals
CREATE OR REPLACE FUNCTION public.repair_order_totals()
 RETURNS TABLE(repaired_count integer, message text)
 LANGUAGE plpgsql
AS $function$
DECLARE
v_count integer;
BEGIN
-- Update all orders to have correct totals
UPDATE orders o
SET total_amount = (
SELECT COALESCE(SUM(oi.subtotal), 0)
FROM order_items oi
WHERE oi.order_id = o.id
);

GET DIAGNOSTICS v_count = ROW_COUNT;

RETURN QUERY SELECT v_count, 'Successfully recalculated totals for all orders'::text;
END;
$function$
;

-- Function: reserve_inventory_for_session
CREATE OR REPLACE FUNCTION public.reserve_inventory_for_session()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
v_inventory_item RECORD;
v_worker_name_column text;
v_worker_name text;
v_package_id_column text;
v_pull_weight_column text;
v_package_id text;
v_pull_weight numeric;
v_new_json jsonb;
BEGIN
-- Convert NEW to JSON once for all dynamic extractions
v_new_json := to_jsonb(NEW);

-- Determine column names based on table (string literals only)
IF TG_TABLE_NAME = 'bucking_sessions' THEN
v_worker_name_column := 'bucker_name';
v_package_id_column := 'binned_package_id';
v_pull_weight_column := 'binned_weight_grams';
ELSIF TG_TABLE_NAME = 'trim_sessions' THEN
v_worker_name_column := 'trimmer_name';
v_package_id_column := 'package_id';
v_pull_weight_column := 'pulled_weight';  -- FIXED: was 'pull_weight'
ELSIF TG_TABLE_NAME = 'packaging_sessions' THEN
v_worker_name_column := 'packager_name';
v_package_id_column := 'package_id';
v_pull_weight_column := 'pull_weight';
ELSE
-- Unknown session type
RAISE EXCEPTION 'Unknown session table: %', TG_TABLE_NAME;
END IF;

-- Extract values dynamically from JSON
v_worker_name := v_new_json->>v_worker_name_column;
v_package_id := v_new_json->>v_package_id_column;
v_pull_weight := (v_new_json->>v_pull_weight_column)::numeric;

-- Validate required fields exist
IF v_package_id IS NULL OR v_pull_weight IS NULL THEN
RAISE EXCEPTION 'Session missing required fields: package_id=%, pull_weight=%',
v_package_id, v_pull_weight;
END IF;

-- Get the inventory item (need id for event-driven fields)
SELECT * INTO v_inventory_item
FROM inventory_items
WHERE package_id = v_package_id;

-- Validate inventory exists
IF NOT FOUND THEN
RAISE EXCEPTION 'Inventory item % not found', v_package_id;
END IF;

-- Validate sufficient quantity
IF v_inventory_item.available_qty < v_pull_weight THEN
RAISE EXCEPTION 'Insufficient inventory in %: available=%, requested=%',
v_package_id,
v_inventory_item.available_qty,
v_pull_weight;
END IF;

-- Update inventory quantities (event-driven fields)
UPDATE inventory_items
SET
available_qty = available_qty - v_pull_weight,
reserved_qty = reserved_qty + v_pull_weight,
atp_qty = atp_qty - v_pull_weight,
updated_at = now()
WHERE id = v_inventory_item.id;

-- Create movement record in ledger
INSERT INTO inventory_movements (
occurred_at,
movement_kind,
package_id,
product_stage_from,
product_stage_to,
quantity_delta,
strain_id,
batch_id,
notes,
reference_type,
reference_id
)
VALUES (
now(),
'reserve',
v_package_id,
v_inventory_item.product_stage_id,
v_inventory_item.product_stage_id,
v_pull_weight,
v_inventory_item.strain_id,
v_inventory_item.batch_id,
format('Reserved for %s session by %s', TG_TABLE_NAME, v_worker_name),
TG_TABLE_NAME,
NEW.id
);

RAISE NOTICE 'Reserved % g from % for % session', v_pull_weight, v_package_id, TG_TABLE_NAME;

RETURN NEW;
END;
$function$
;

-- Function: reserve_inventory_on_session_start
CREATE OR REPLACE FUNCTION public.reserve_inventory_on_session_start()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
v_inventory_item RECORD;
v_worker_name_column text;
v_worker_name text;
v_package_id_column text;
v_pull_weight_column text;
v_package_id text;
v_pull_weight numeric;
v_new_json jsonb;
BEGIN
-- Convert NEW to JSON once for all dynamic extractions
v_new_json := to_jsonb(NEW);

-- Determine column names based on table (string literals only)
IF TG_TABLE_NAME = 'bucking_sessions' THEN
v_worker_name_column := 'bucker_name';
v_package_id_column := 'binned_package_id';
v_pull_weight_column := 'binned_weight_grams';
ELSIF TG_TABLE_NAME = 'trim_sessions' THEN
v_worker_name_column := 'trimmer_name';
v_package_id_column := 'package_id';
v_pull_weight_column := 'pulled_weight';  -- FIXED: was 'pull_weight'
ELSIF TG_TABLE_NAME = 'packaging_sessions' THEN
v_worker_name_column := 'packager_name';
v_package_id_column := 'package_id';
v_pull_weight_column := 'pull_weight';
ELSE
-- Unknown session type
RAISE EXCEPTION 'Unknown session table: %', TG_TABLE_NAME;
END IF;

-- Extract values dynamically from JSON
v_worker_name := v_new_json->>v_worker_name_column;
v_package_id := v_new_json->>v_package_id_column;
v_pull_weight := (v_new_json->>v_pull_weight_column)::numeric;

-- Validate required fields exist
IF v_package_id IS NULL OR v_pull_weight IS NULL THEN
RAISE EXCEPTION 'Session missing required fields: package_id=%, pull_weight=%',
v_package_id, v_pull_weight;
END IF;

-- Get the inventory item (need id for event-driven fields)
SELECT * INTO v_inventory_item
FROM inventory_items
WHERE package_id = v_package_id;

-- Validate inventory exists
IF NOT FOUND THEN
RAISE EXCEPTION 'Inventory item % not found', v_package_id;
END IF;

-- Validate sufficient inventory available
IF v_inventory_item.available_qty < v_pull_weight THEN
RAISE EXCEPTION 'Insufficient inventory: % has only % available, but % required',
v_package_id,
v_inventory_item.available_qty,
v_pull_weight;
END IF;

-- ========================================================================
-- PURE EVENT-DRIVEN: Create movement, let trigger handle quantity updates
-- ========================================================================
-- Note: We still directly update available_qty/reserved_qty here because
-- those are ATP (Available-To-Promise) tracking fields, separate from
-- on_hand_qty which is managed by the movement trigger.
-- TODO: In future, move ATP tracking to views based on RESERVE/RELEASE movements

UPDATE inventory_items
SET
available_qty = available_qty - v_pull_weight,
reserved_qty = reserved_qty + v_pull_weight,
last_updated = now()
WHERE package_id = v_package_id;

-- Create audit trail with PURE event-driven architecture
INSERT INTO inventory_movements (
-- Event-driven architecture fields (NEW SYSTEM)
movement_kind,      -- 'RESERVE'
source_item_id,     -- UUID reference to inventory_items
qty,                -- Amount being reserved
unit,               -- 'g' for grams

-- Context fields (replaces legacy session_type/source_identifier)
reference_id,       -- Session UUID
reference_type,     -- 'bucking_session', 'trim_session', etc.
reason_code,        -- 'session_start'

-- Human-readable notes
notes,
movement_date
) VALUES (
'RESERVE',
v_inventory_item.id,
v_pull_weight,
'g',

NEW.id,
TG_TABLE_NAME,  -- e.g., 'bucking_sessions'
'session_start',

format('Reserved %s g for %s session by %s',
v_pull_weight,
TG_TABLE_NAME,
COALESCE(v_worker_name, 'unknown')
),
now()
);

RAISE NOTICE 'Reserved % g from % for % session', v_pull_weight, v_package_id, TG_TABLE_NAME;

RETURN NEW;
END;
$function$
;

-- Function: resolve_movement_error
CREATE OR REPLACE FUNCTION public.resolve_movement_error(p_error_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
UPDATE inventory_movement_errors
SET resolved_at = now(),
resolved_by = auth.uid()
WHERE id = p_error_id;
END;
$function$
;

-- Function: rollback_to_direct_updates
CREATE OR REPLACE FUNCTION public.rollback_to_direct_updates()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
-- Check if user is admin
IF NOT is_admin() THEN
RAISE EXCEPTION 'Only admins can perform rollback';
END IF;

-- Disable trigger
ALTER TABLE inventory_movements DISABLE TRIGGER trg_update_inventory_on_hand;

-- Remove immutability policies
DROP POLICY IF EXISTS "Movements are immutable" ON inventory_movements;
DROP POLICY IF EXISTS "Movements cannot be deleted" ON inventory_movements;
DROP POLICY IF EXISTS "Block direct on_hand_qty updates" ON inventory_items;

RETURN 'Rollback complete. System reverted to direct updates. Trigger disabled. Immutability policies removed.';
END;
$function$
;

-- Function: set_bucking_product_names
CREATE OR REPLACE FUNCTION public.set_bucking_product_names()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
-- Only set product names when session completes
IF NEW.session_status = 'completed' AND 
(OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN

-- Set flower product name if we produced flower
IF COALESCE(NEW.bucked_flower_grams, 0) > 0 THEN
NEW.output_product_flower_name := 'Bulk Flower (Bucked)';
ELSE
NEW.output_product_flower_name := NULL;
END IF;

-- Set smalls product name if we produced smalls
IF COALESCE(NEW.bucked_smalls_grams, 0) > 0 THEN
NEW.output_product_smalls_name := 'Bulk Smalls (Bucked)';
ELSE
NEW.output_product_smalls_name := NULL;
END IF;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: set_packaging_product_names
CREATE OR REPLACE FUNCTION public.set_packaging_product_names()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
v_strain_name text;
BEGIN
IF NEW.session_status = 'completed' AND
(OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN

SELECT name INTO v_strain_name
FROM strains
WHERE id = NEW.strain_id;

IF v_strain_name IS NULL THEN
v_strain_name := 'Unknown Strain';
END IF;

IF COALESCE(NEW.units_3_5g, 0) > 0 THEN
NEW.output_product_3_5g_name := 'Packaged - ' || v_strain_name || ' - 3.5g Flower';
ELSE
NEW.output_product_3_5g_name := NULL;
END IF;

IF COALESCE(NEW.units_14g, 0) > 0 THEN
NEW.output_product_14g_name := 'Packaged - ' || v_strain_name || ' - 14g Smalls';
ELSE
NEW.output_product_14g_name := NULL;
END IF;

IF COALESCE(NEW.units_454g, 0) > 0 THEN
NEW.output_product_1lb_name := 'Packaged - ' || v_strain_name || ' - 1lb Flower (454g)';
ELSE
NEW.output_product_1lb_name := NULL;
END IF;

NEW.output_product_name := COALESCE(
NEW.output_product_3_5g_name,
NEW.output_product_14g_name,
NEW.output_product_1lb_name,
'Packaged Products'
);
END IF;

RETURN NEW;
END;
$function$
;

-- Function: set_trim_product_names
CREATE OR REPLACE FUNCTION public.set_trim_product_names()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
-- Only set product names when session completes
IF NEW.session_status = 'completed' AND 
(OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN

-- Set bigs product name if we produced bigs
IF COALESCE(NEW.big_buds_grams, 0) > 0 THEN
NEW.output_product_bigs_name := 'Bulk Flower (Trimmed)';
ELSE
NEW.output_product_bigs_name := NULL;
END IF;

-- Set smalls product name if we produced smalls
IF COALESCE(NEW.small_buds_grams, 0) > 0 THEN
NEW.output_product_smalls_name := 'Bulk Smalls (Trimmed)';
ELSE
NEW.output_product_smalls_name := NULL;
END IF;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: set_trim_session_product_names
CREATE OR REPLACE FUNCTION public.set_trim_session_product_names()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
-- Only set product names when session is being completed
IF NEW.session_status = 'completed' AND OLD.session_status != 'completed' THEN

-- Set bigs product name if we produced bigs
IF COALESCE(NEW.big_buds_grams, 0) > 0 THEN
NEW.output_product_bigs_name := 'Bulk Flower (Trimmed)';
ELSE
NEW.output_product_bigs_name := NULL;
END IF;

-- Set smalls product name if we produced smalls
IF COALESCE(NEW.small_buds_grams, 0) > 0 THEN
NEW.output_product_smalls_name := 'Bulk Smalls (Trimmed)';
ELSE
NEW.output_product_smalls_name := NULL;
END IF;

-- Set trim product name if we produced trim
IF COALESCE(NEW.trim_grams, 0) > 0 THEN
NEW.output_product_trim_name := 'Bulk Trim (Trimmed)';
ELSE
NEW.output_product_trim_name := NULL;
END IF;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: simulate_movement_scenario
CREATE OR REPLACE FUNCTION public.simulate_movement_scenario(scenario_name text)
 RETURNS TABLE(step text, action text, result text)
 LANGUAGE plpgsql
AS $function$
DECLARE
test_item_id uuid;
test_package_id text;
BEGIN
test_package_id := 'SCENARIO-' || gen_random_uuid()::text;

CASE scenario_name
WHEN 'production' THEN
-- Simulate production workflow: bins -> bucked -> bulk -> packaged

RETURN QUERY SELECT 
'Setup'::text,
'Create test item'::text,
'Created item with 1000g'::text;

INSERT INTO inventory_items (package_id, product_name, on_hand_qty, unit, status)
VALUES (test_package_id, 'Test Production', 1000, 'g', 'active')
RETURNING id INTO test_item_id;

RETURN QUERY SELECT 
'Step 1'::text,
'CONSUME for bucking (900g)'::text,
'Remaining: 100g'::text;

INSERT INTO inventory_movements (movement_kind, source_item_id, qty, unit, reason_code)
VALUES ('CONSUME', test_item_id, 900, 'g', 'bucking_session');

RETURN QUERY SELECT 
'Step 2'::text,
'PRODUCE bulk (850g after trim)'::text,
'Total: 950g'::text;

INSERT INTO inventory_movements (movement_kind, dest_item_id, qty, unit, reason_code)
VALUES ('PRODUCE', test_item_id, 850, 'g', 'trim_session');

-- Cleanup
DELETE FROM inventory_movements WHERE dest_item_id = test_item_id OR source_item_id = test_item_id;
DELETE FROM inventory_items WHERE id = test_item_id;

RETURN QUERY SELECT 'Cleanup'::text, 'Delete test data'::text, 'Success'::text;

WHEN 'fulfillment' THEN
-- Simulate order fulfillment workflow

RETURN QUERY SELECT 'Setup'::text, 'Create test item'::text, 'Created item with 500g'::text;

INSERT INTO inventory_items (package_id, product_name, on_hand_qty, unit, status)
VALUES (test_package_id, 'Test Fulfillment', 500, 'g', 'active')
RETURNING id INTO test_item_id;

RETURN QUERY SELECT 'Step 1'::text, 'RESERVE for order (100g)'::text, 'Reserved'::text;

INSERT INTO inventory_movements (movement_kind, source_item_id, qty, unit, reason_code)
VALUES ('RESERVE', test_item_id, 100, 'g', 'order_reservation');

RETURN QUERY SELECT 'Step 2'::text, 'FULFILLMENT (100g)'::text, 'Remaining: 300g'::text;

INSERT INTO inventory_movements (movement_kind, source_item_id, qty, unit, reason_code)
VALUES ('FULFILLMENT', test_item_id, 100, 'g', 'order_fulfillment');

-- Cleanup
DELETE FROM inventory_movements WHERE dest_item_id = test_item_id OR source_item_id = test_item_id;
DELETE FROM inventory_items WHERE id = test_item_id;

RETURN QUERY SELECT 'Cleanup'::text, 'Delete test data'::text, 'Success'::text;

WHEN 'reconciliation' THEN
-- Simulate audit and reconciliation

RETURN QUERY SELECT 'Setup'::text, 'Create test item'::text, 'Created item with 200g'::text;

INSERT INTO inventory_items (package_id, product_name, on_hand_qty, unit, status)
VALUES (test_package_id, 'Test Reconciliation', 200, 'g', 'active')
RETURNING id INTO test_item_id;

RETURN QUERY SELECT 'Step 1'::text, 'Physical count shows 195g'::text, 'Discrepancy: -5g'::text;

RETURN QUERY SELECT 'Step 2'::text, 'RECONCILIATION to 195g'::text, 'Corrected'::text;

INSERT INTO inventory_movements (movement_kind, dest_item_id, qty, unit, reason_code, notes)
VALUES ('RECONCILIATION', test_item_id, 195, 'g', 'physical_count', 'Audit variance: moisture loss');

-- Cleanup
DELETE FROM inventory_movements WHERE dest_item_id = test_item_id OR source_item_id = test_item_id;
DELETE FROM inventory_items WHERE id = test_item_id;

RETURN QUERY SELECT 'Cleanup'::text, 'Delete test data'::text, 'Success'::text;

ELSE
RETURN QUERY SELECT 
'Error'::text,
'Unknown scenario'::text,
format('Available scenarios: production, fulfillment, reconciliation. Got: %s', scenario_name)::text;
END CASE;

EXCEPTION
WHEN OTHERS THEN
-- Cleanup on error
IF test_item_id IS NOT NULL THEN
DELETE FROM inventory_movements WHERE dest_item_id = test_item_id OR source_item_id = test_item_id;
DELETE FROM inventory_items WHERE id = test_item_id;
END IF;
RAISE;
END;
$function$
;

-- Function: sync_batch_stage_tracking
CREATE OR REPLACE FUNCTION public.sync_batch_stage_tracking()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
-- Clear existing tracking data
DELETE FROM batch_stage_tracking;

-- Populate from inventory_items
INSERT INTO batch_stage_tracking (batch_id, stage, weight_grams, allocated_weight_grams)
SELECT
br.id as batch_id,
stage_name,
COALESCE(stage_weight, 0) as weight_grams,
0 as allocated_weight_grams
FROM batch_registry br
CROSS JOIN (
SELECT unnest(ARRAY['bucked', 'bulk_flower', 'bulk_smalls', 'bulk_trim', 'packaged']) as stage_name
) stages
LEFT JOIN (
SELECT
batch as batch_number,
CASE
WHEN product_name ILIKE '%bucked%' THEN 'bucked'
WHEN product_name ILIKE '%bulk%flower%' OR product_name ILIKE '%bulk flower%' THEN 'bulk_flower'
WHEN product_name ILIKE '%bulk%small%' OR product_name ILIKE '%bulk small%' THEN 'bulk_smalls'
WHEN product_name ILIKE '%bulk%trim%' OR product_name ILIKE '%bulk trim%' THEN 'bulk_trim'
WHEN product_name ILIKE '%packaged%' OR product_name ILIKE '%8th%'
OR product_name ILIKE '%3.5%' OR product_name ILIKE '%14g%'
OR product_name ILIKE '%half%' OR product_name ILIKE '%1/2%' THEN 'packaged'
ELSE NULL
END as inferred_stage,
SUM(available_qty) as stage_weight
FROM inventory_items
WHERE batch IS NOT NULL AND available_qty > 0
GROUP BY batch, inferred_stage
) inv ON inv.batch_number = br.batch_number AND inv.inferred_stage = stage_name
ON CONFLICT (batch_id, stage) DO UPDATE
SET
weight_grams = EXCLUDED.weight_grams,
updated_at = now();

-- Also sync allocated weights from batch_allocations
UPDATE batch_stage_tracking bst
SET allocated_weight_grams = COALESCE(alloc.total_allocated, 0)
FROM (
SELECT
ba.batch_id,
CASE
WHEN ba.allocation_stage = 'bucked' THEN 'bucked'
WHEN ba.allocation_stage = 'bulk' THEN 'bulk_flower'
WHEN ba.allocation_stage = 'packaged' THEN 'packaged'
ELSE ba.allocation_stage
END as stage,
SUM(ba.allocated_weight_grams) as total_allocated
FROM batch_allocations ba
WHERE ba.status IN ('pending', 'confirmed')
GROUP BY ba.batch_id, stage
) alloc
WHERE bst.batch_id = alloc.batch_id
AND bst.stage = alloc.stage;

END;
$function$
;

-- Function: sync_batches_from_inventory
CREATE OR REPLACE FUNCTION public.sync_batches_from_inventory()
 RETURNS TABLE(batches_found integer, batches_created integer, batches_updated integer, stage_records_created integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
v_batch record;
v_batch_id uuid;
v_batches_found integer := 0;
v_batches_created integer := 0;
v_batches_updated integer := 0;
v_stage_records integer := 0;
v_existing_count integer;
BEGIN
-- Count existing batches before sync
SELECT COUNT(*) INTO v_existing_count FROM batch_registry;

-- Loop through all unique batch-strain combinations in inventory
FOR v_batch IN
SELECT DISTINCT
ii.batch as batch_number,
ii.strain,
ii.room,
COUNT(*) as package_count,
SUM(ii.available_qty) as total_weight
FROM inventory_items ii
WHERE ii.batch IS NOT NULL 
AND trim(ii.batch) != ''
AND ii.strain IS NOT NULL
AND trim(ii.strain) != ''
GROUP BY ii.batch, ii.strain, ii.room
LOOP
v_batches_found := v_batches_found + 1;

-- Get or create batch
v_batch_id := get_or_create_batch_from_inventory(
v_batch.batch_number,
v_batch.strain,
v_batch.room
);

IF v_batch_id IS NOT NULL THEN
-- Update batch weights if needed
UPDATE batch_registry
SET
initial_weight_grams = GREATEST(initial_weight_grams, v_batch.total_weight),
updated_at = now()
WHERE id = v_batch_id
AND initial_weight_grams < v_batch.total_weight;

IF FOUND THEN
v_batches_updated := v_batches_updated + 1;
END IF;
END IF;
END LOOP;

-- Calculate how many batches were created
SELECT COUNT(*) - v_existing_count INTO v_batches_created FROM batch_registry;

-- Now sync batch stage tracking
SELECT COUNT(*) INTO v_stage_records
FROM update_batch_tracking_from_inventory();

RETURN QUERY SELECT 
v_batches_found,
v_batches_created,
v_batches_updated,
v_stage_records;
END;
$function$
;

-- Function: sync_order_item_strains
CREATE OR REPLACE FUNCTION public.sync_order_item_strains()
 RETURNS TABLE(order_items_updated integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
v_updated integer;
BEGIN
-- Update order items from products
UPDATE order_items oi
SET 
strain = p.strain,
strain_id = p.strain_id,
updated_at = now()
FROM products p
WHERE oi.product_id = p.id
AND (
oi.strain IS NULL 
OR oi.strain_id IS NULL
OR oi.strain != p.strain
OR oi.strain_id != p.strain_id
)
AND p.strain IS NOT NULL
AND p.strain_id IS NOT NULL;

GET DIAGNOSTICS v_updated = ROW_COUNT;

RETURN QUERY SELECT v_updated;
END;
$function$
;

-- Function: sync_product_strain_ids
CREATE OR REPLACE FUNCTION public.sync_product_strain_ids()
 RETURNS TABLE(products_updated integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
v_product record;
v_strain_id uuid;
v_updated integer := 0;
BEGIN
-- Loop through products with strain text but no strain_id
FOR v_product IN
SELECT id, strain
FROM products
WHERE strain IS NOT NULL
AND trim(strain) != ''
AND strain_id IS NULL
LOOP
-- Get or create strain
v_strain_id := get_or_create_strain(v_product.strain, 'unknown');

IF v_strain_id IS NOT NULL THEN
-- Update product with strain_id
UPDATE products
SET strain_id = v_strain_id,
updated_at = now()
WHERE id = v_product.id;

v_updated := v_updated + 1;
END IF;
END LOOP;

RETURN QUERY SELECT v_updated;
END;
$function$
;

-- Function: sync_products_for_all_strains
CREATE OR REPLACE FUNCTION public.sync_products_for_all_strains()
 RETURNS TABLE(total_strains_processed integer, total_products_created integer, strains_processed text[])
 LANGUAGE plpgsql
AS $function$
DECLARE
v_strain record;
v_result record;
v_total_strains integer := 0;
v_total_products integer := 0;
v_strain_names text[] := ARRAY[]::text[];
BEGIN
FOR v_strain IN
SELECT id, name, is_active
FROM strains
WHERE is_active = true
ORDER BY name
LOOP
SELECT * INTO v_result
FROM sync_products_for_strain(v_strain.id, v_strain.is_active);

v_total_strains := v_total_strains + 1;
v_total_products := v_total_products + COALESCE(v_result.products_created, 0);
v_strain_names := array_append(v_strain_names, v_strain.name);
END LOOP;

RETURN QUERY SELECT v_total_strains, v_total_products, v_strain_names;
END;
$function$
;

-- Function: sync_products_for_strain
CREATE OR REPLACE FUNCTION public.sync_products_for_strain(p_strain_id uuid, p_is_active boolean DEFAULT true)
 RETURNS TABLE(products_created integer, strain_name text)
 LANGUAGE plpgsql
AS $function$
DECLARE
v_strain_name text;
v_products_created integer := 0;
v_stage record;
v_type record;
v_product_category text;
v_pricing_unit text;
v_allows_fractional boolean;
v_product_name text;
v_canonical_types text[] := ARRAY[
'1lb Flower (454g)',
'1lb Smalls (454g)',
'14g Smalls',
'3.5g Flower',
'1g Preroll'
];
BEGIN
-- Only process active strains
IF NOT p_is_active THEN
RETURN;
END IF;

-- Get strain name for logging
SELECT name INTO v_strain_name FROM strains WHERE id = p_strain_id;

-- Loop through all active product stages
FOR v_stage IN
SELECT id, name, default_pricing_unit, allows_fractional_quantity
FROM product_stages
WHERE is_active = true
ORDER BY sort_order
LOOP
-- Loop through ONLY canonical product types that apply to this stage
FOR v_type IN
SELECT id, name, applicable_stages
FROM product_types
WHERE is_active = true
AND name = ANY(v_canonical_types)
AND v_stage.name = ANY(applicable_stages)
ORDER BY sort_order
LOOP
-- Determine product_category based on stage and type
IF v_stage.name IN ('Bulk', 'Binned', 'Bucked') THEN
v_product_category := 'bulk';
ELSIF LOWER(v_type.name) LIKE '%preroll%' OR LOWER(v_type.name) LIKE '%pre-roll%' THEN
v_product_category := 'preroll';
ELSE
v_product_category := 'packaged';
END IF;

-- Get pricing unit and fractional quantity setting from stage
v_pricing_unit := v_stage.default_pricing_unit;
v_allows_fractional := v_stage.allows_fractional_quantity;

-- Generate product name: "{Stage} - {Strain} - {Type}"
v_product_name := v_stage.name || ' - ' || v_strain_name || ' - ' || v_type.name;

-- Insert product if it doesn't exist (ON CONFLICT DO NOTHING prevents duplicates)
INSERT INTO products (
name,
stage_id,
type_id,
strain_id,
product_category,
pricing_unit,
allows_fractional_quantity,
price_per_unit,
is_active,
is_archived,
generated_at,
created_at
)
VALUES (
v_product_name,
v_stage.id,
v_type.id,
p_strain_id,
v_product_category,
v_pricing_unit,
v_allows_fractional,
0, -- Price to be set manually
true,
false, -- Ensure new products are not archived
now(),
now()
)
ON CONFLICT (strain_id, type_id, stage_id) DO NOTHING;

-- Check if product was inserted
IF FOUND THEN
v_products_created := v_products_created + 1;
END IF;
END LOOP;
END LOOP;

RETURN QUERY SELECT v_products_created, v_strain_name;
END;
$function$
;

-- Function: test_movement_trigger
CREATE OR REPLACE FUNCTION public.test_movement_trigger()
 RETURNS TABLE(test_name text, status text, expected_qty numeric, actual_qty numeric, passed boolean)
 LANGUAGE plpgsql
AS $function$
DECLARE
test_item_id uuid;
test_package_id text;
initial_qty numeric := 100;
result_qty numeric;
BEGIN
-- Create test inventory item
test_package_id := 'TEST-' || gen_random_uuid()::text;

INSERT INTO inventory_items (
package_id,
product_name,
strain,
on_hand_qty,
unit,
status
) VALUES (
test_package_id,
'Test Product',
'Test Strain',
initial_qty,
'g',
'active'
)
RETURNING id INTO test_item_id;

-- Test 1: ADJUSTMENT (absolute)
INSERT INTO inventory_movements (
movement_kind,
dest_item_id,
qty,
unit,
reason_code,
notes
) VALUES (
'ADJUSTMENT',
test_item_id,
150,
'g',
'test',
'Test trigger: ADJUSTMENT'
);

SELECT on_hand_qty INTO result_qty FROM inventory_items WHERE id = test_item_id;
RETURN QUERY SELECT 
'ADJUSTMENT sets absolute value'::text,
CASE WHEN result_qty = 150 THEN 'PASS' ELSE 'FAIL' END,
150::numeric,
result_qty,
result_qty = 150;

-- Test 2: PRODUCE (increment)
INSERT INTO inventory_movements (
movement_kind,
dest_item_id,
qty,
unit,
reason_code,
notes
) VALUES (
'PRODUCE',
test_item_id,
50,
'g',
'test',
'Test trigger: PRODUCE'
);

SELECT on_hand_qty INTO result_qty FROM inventory_items WHERE id = test_item_id;
RETURN QUERY SELECT 
'PRODUCE increments quantity'::text,
CASE WHEN result_qty = 200 THEN 'PASS' ELSE 'FAIL' END,
200::numeric,
result_qty,
result_qty = 200;

-- Test 3: CONSUME (decrement)
INSERT INTO inventory_movements (
movement_kind,
source_item_id,
qty,
unit,
reason_code,
notes
) VALUES (
'CONSUME',
test_item_id,
75,
'g',
'test',
'Test trigger: CONSUME'
);

SELECT on_hand_qty INTO result_qty FROM inventory_items WHERE id = test_item_id;
RETURN QUERY SELECT 
'CONSUME decrements quantity'::text,
CASE WHEN result_qty = 125 THEN 'PASS' ELSE 'FAIL' END,
125::numeric,
result_qty,
result_qty = 125;

-- Test 4: RECONCILIATION (absolute)
INSERT INTO inventory_movements (
movement_kind,
dest_item_id,
qty,
unit,
reason_code,
notes
) VALUES (
'RECONCILIATION',
test_item_id,
100,
'g',
'test',
'Test trigger: RECONCILIATION'
);

SELECT on_hand_qty INTO result_qty FROM inventory_items WHERE id = test_item_id;
RETURN QUERY SELECT 
'RECONCILIATION sets absolute value'::text,
CASE WHEN result_qty = 100 THEN 'PASS' ELSE 'FAIL' END,
100::numeric,
result_qty,
result_qty = 100;

-- Cleanup: Delete test data
DELETE FROM inventory_movements WHERE dest_item_id = test_item_id OR source_item_id = test_item_id;
DELETE FROM inventory_items WHERE id = test_item_id;

RETURN QUERY SELECT 
'Cleanup completed'::text,
'INFO'::text,
0::numeric,
0::numeric,
true;

EXCEPTION
WHEN OTHERS THEN
-- Cleanup on error
DELETE FROM inventory_movements WHERE dest_item_id = test_item_id OR source_item_id = test_item_id;
DELETE FROM inventory_items WHERE id = test_item_id;

RETURN QUERY SELECT 
'Test failed with error'::text,
'ERROR'::text,
0::numeric,
0::numeric,
false;

RAISE;
END;
$function$
;

-- Function: track_label_print
CREATE OR REPLACE FUNCTION public.track_label_print()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
current_user_id uuid;
BEGIN
-- Get current user ID (null for anonymous/system prints)
BEGIN
current_user_id := auth.uid();
EXCEPTION WHEN OTHERS THEN
current_user_id := NULL;
END;

-- If printed_at is being set (either first time or update)
IF NEW.printed_at IS NOT NULL AND (OLD.printed_at IS NULL OR NEW.printed_at <> OLD.printed_at) THEN
-- Increment print count
NEW.print_count := COALESCE(OLD.print_count, 0) + 1;

-- Update last printed timestamp
NEW.last_printed_at := NEW.printed_at;

-- Append to print history
NEW.print_history := COALESCE(OLD.print_history, '[]'::jsonb) || jsonb_build_array(
jsonb_build_object(
'printed_at', NEW.printed_at,
'printed_by', current_user_id,
'print_number', NEW.print_count
)
);
END IF;

RETURN NEW;
END;
$function$
;

-- Function: trigger_auto_register_batch_from_inventory
CREATE OR REPLACE FUNCTION public.trigger_auto_register_batch_from_inventory()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
v_batch_id uuid;
BEGIN
-- Only process if batch and strain are present
IF NEW.batch IS NULL OR trim(NEW.batch) = '' THEN
RETURN NEW;
END IF;

IF NEW.strain IS NULL OR trim(NEW.strain) = '' THEN
RETURN NEW;
END IF;

-- Get or create batch
v_batch_id := get_or_create_batch_from_inventory(
NEW.batch,
NEW.strain,
NEW.room
);

RETURN NEW;
END;
$function$
;

-- Function: trigger_consolidate_packaging_session_output
CREATE OR REPLACE FUNCTION public.trigger_consolidate_packaging_session_output()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
v_strain_abbr text;
BEGIN
-- Only consolidate when session is newly completed
IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN
-- Get strain abbreviation from strains table
SELECT abbreviation INTO v_strain_abbr
FROM strains
WHERE name = NEW.strain;

-- If no abbreviation found, use first 3 letters of strain name
IF v_strain_abbr IS NULL THEN
v_strain_abbr := UPPER(SUBSTRING(NEW.strain, 1, 3));
END IF;

-- Call consolidation function
PERFORM consolidate_packaging_session_output(
NEW.id,
NEW.strain,
v_strain_abbr,
NEW.session_date,
COALESCE(NEW.units_3_5g, 0),
COALESCE(NEW.units_14g, 0),
COALESCE(NEW.units_454g, 0)
);
END IF;

RETURN NEW;
END;
$function$
;

-- Function: trigger_consolidate_trim_session_output
CREATE OR REPLACE FUNCTION public.trigger_consolidate_trim_session_output()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
v_strain_abbr text;
BEGIN
-- Only consolidate when session is newly completed
IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN
-- Get strain abbreviation from strains table
SELECT abbreviation INTO v_strain_abbr
FROM strains
WHERE name = NEW.strain;

-- If no abbreviation found, use first 3 letters of strain name
IF v_strain_abbr IS NULL THEN
v_strain_abbr := UPPER(SUBSTRING(NEW.strain, 1, 3));
END IF;

-- Call consolidation function
PERFORM consolidate_trim_session_output(
NEW.id,
NEW.strain,
v_strain_abbr,
NEW.session_date,
COALESCE(NEW.big_buds_grams, 0),
COALESCE(NEW.small_buds_grams, 0),
COALESCE(NEW.trim_grams, 0)
);
END IF;

RETURN NEW;
END;
$function$
;

-- Function: trigger_populate_order_item_strain
CREATE OR REPLACE FUNCTION public.trigger_populate_order_item_strain()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
v_product record;
BEGIN
-- Get product details
SELECT strain, strain_id INTO v_product
FROM products
WHERE id = NEW.product_id;

-- Populate strain fields if product has them
IF v_product.strain IS NOT NULL THEN
NEW.strain := v_product.strain;
END IF;

IF v_product.strain_id IS NOT NULL THEN
NEW.strain_id := v_product.strain_id;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: trigger_set_updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;

-- Function: trigger_sync_products_on_strain_change
CREATE OR REPLACE FUNCTION public.trigger_sync_products_on_strain_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
IF (TG_OP = 'INSERT' AND NEW.is_active = true) OR
(TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false) THEN
PERFORM sync_products_for_strain(NEW.id, NEW.is_active);
END IF;
RETURN NEW;
END;
$function$
;

-- Function: trigger_update_product_strain_id
CREATE OR REPLACE FUNCTION public.trigger_update_product_strain_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
v_strain_id uuid;
BEGIN
-- If strain text changed, update strain_id
IF NEW.strain IS NOT NULL AND trim(NEW.strain) != '' THEN
IF OLD.strain IS NULL OR NEW.strain != OLD.strain OR NEW.strain_id IS NULL THEN
v_strain_id := get_or_create_strain(NEW.strain, 'unknown');
NEW.strain_id := v_strain_id;
END IF;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: update_allocation_updated_at
CREATE OR REPLACE FUNCTION public.update_allocation_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;

-- Function: update_allocation_workflow_stage
CREATE OR REPLACE FUNCTION public.update_allocation_workflow_stage(allocation_id uuid, new_stage allocation_workflow_stage)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
UPDATE order_item_allocations
SET
workflow_stage = new_stage,
stage_entered_at = now(),
trimming_started_at = CASE WHEN new_stage = 'in_trimming' THEN now() ELSE trimming_started_at END,
trimming_completed_at = CASE WHEN new_stage = 'trimmed' THEN now() ELSE trimming_completed_at END,
packaging_started_at = CASE WHEN new_stage = 'in_packaging' THEN now() ELSE packaging_started_at END,
packaging_completed_at = CASE WHEN new_stage = 'packaged' THEN now() ELSE packaging_completed_at END,
updated_at = now()
WHERE id = allocation_id;
END;
$function$
;

-- Function: update_batch_registry_updated_at
CREATE OR REPLACE FUNCTION public.update_batch_registry_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;

-- Function: update_batch_stage_on_inventory_change
CREATE OR REPLACE FUNCTION public.update_batch_stage_on_inventory_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
v_batch_id uuid;
v_stage text;
BEGIN
-- Determine the batch_id
IF TG_OP = 'DELETE' THEN
IF OLD.batch IS NULL THEN
RETURN OLD;
END IF;

SELECT id INTO v_batch_id
FROM batch_registry
WHERE batch_number = OLD.batch;

IF v_batch_id IS NULL THEN
RETURN OLD;
END IF;
ELSE
IF NEW.batch IS NULL THEN
RETURN NEW;
END IF;

SELECT id INTO v_batch_id
FROM batch_registry
WHERE batch_number = NEW.batch;

IF v_batch_id IS NULL THEN
RETURN NEW;
END IF;
END IF;

-- Infer stage from product name
v_stage := CASE
WHEN COALESCE(NEW.product_name, OLD.product_name) ILIKE '%bucked%' THEN 'bucked'
WHEN COALESCE(NEW.product_name, OLD.product_name) ILIKE '%bulk%flower%'
OR COALESCE(NEW.product_name, OLD.product_name) ILIKE '%bulk flower%' THEN 'bulk_flower'
WHEN COALESCE(NEW.product_name, OLD.product_name) ILIKE '%bulk%small%'
OR COALESCE(NEW.product_name, OLD.product_name) ILIKE '%bulk small%' THEN 'bulk_smalls'
WHEN COALESCE(NEW.product_name, OLD.product_name) ILIKE '%bulk%trim%'
OR COALESCE(NEW.product_name, OLD.product_name) ILIKE '%bulk trim%' THEN 'bulk_trim'
WHEN COALESCE(NEW.product_name, OLD.product_name) ILIKE '%packaged%'
OR COALESCE(NEW.product_name, OLD.product_name) ILIKE '%8th%'
OR COALESCE(NEW.product_name, OLD.product_name) ILIKE '%3.5%'
OR COALESCE(NEW.product_name, OLD.product_name) ILIKE '%14g%'
OR COALESCE(NEW.product_name, OLD.product_name) ILIKE '%half%'
OR COALESCE(NEW.product_name, OLD.product_name) ILIKE '%1/2%' THEN 'packaged'
ELSE NULL
END;

IF v_stage IS NULL THEN
IF TG_OP = 'DELETE' THEN
RETURN OLD;
ELSE
RETURN NEW;
END IF;
END IF;

-- Update or insert the stage tracking
INSERT INTO batch_stage_tracking (batch_id, stage, weight_grams, allocated_weight_grams)
SELECT
v_batch_id,
v_stage,
COALESCE(SUM(available_qty), 0),
0
FROM inventory_items
WHERE batch = COALESCE(NEW.batch, OLD.batch)
AND CASE
WHEN product_name ILIKE '%bucked%' THEN 'bucked'
WHEN product_name ILIKE '%bulk%flower%' OR product_name ILIKE '%bulk flower%' THEN 'bulk_flower'
WHEN product_name ILIKE '%bulk%small%' OR product_name ILIKE '%bulk small%' THEN 'bulk_smalls'
WHEN product_name ILIKE '%bulk%trim%' OR product_name ILIKE '%bulk trim%' THEN 'bulk_trim'
WHEN product_name ILIKE '%packaged%' OR product_name ILIKE '%8th%'
OR product_name ILIKE '%3.5%' OR product_name ILIKE '%14g%'
OR product_name ILIKE '%half%' OR product_name ILIKE '%1/2%' THEN 'packaged'
ELSE NULL
END = v_stage
ON CONFLICT (batch_id, stage) DO UPDATE
SET
weight_grams = EXCLUDED.weight_grams,
updated_at = now();

IF TG_OP = 'DELETE' THEN
RETURN OLD;
ELSE
RETURN NEW;
END IF;
END;
$function$
;

-- Function: update_batch_tracking_from_inventory
CREATE OR REPLACE FUNCTION public.update_batch_tracking_from_inventory()
 RETURNS TABLE(stage_records_updated integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
v_inventory record;
v_batch_id uuid;
v_stage text;
v_records_updated integer := 0;
BEGIN
-- Loop through inventory and update batch stage tracking
FOR v_inventory IN
SELECT
ii.batch,
ii.strain,
ii.product_name,
ii.category,
SUM(ii.available_qty) as total_weight
FROM inventory_items ii
WHERE ii.batch IS NOT NULL 
AND trim(ii.batch) != ''
GROUP BY ii.batch, ii.strain, ii.product_name, ii.category
LOOP
-- Find batch ID
SELECT id INTO v_batch_id
FROM batch_registry
WHERE batch_number = v_inventory.batch
LIMIT 1;

IF v_batch_id IS NULL THEN
CONTINUE;
END IF;

-- Determine stage from product name and category
v_stage := CASE
WHEN lower(v_inventory.product_name) LIKE '%bucked%' THEN 'bucked'
WHEN lower(v_inventory.product_name) LIKE '%bulk%' AND lower(v_inventory.category) LIKE '%flower%' THEN 'bulk_flower'
WHEN lower(v_inventory.product_name) LIKE '%bulk%' AND lower(v_inventory.category) LIKE '%smalls%' THEN 'bulk_smalls'
WHEN lower(v_inventory.product_name) LIKE '%bulk%' AND lower(v_inventory.category) LIKE '%trim%' THEN 'bulk_trim'
WHEN lower(v_inventory.product_name) LIKE '%3.5%' OR lower(v_inventory.product_name) LIKE '%eighth%' THEN 'packaged_3_5g'
WHEN lower(v_inventory.product_name) LIKE '%14%' OR lower(v_inventory.product_name) LIKE '%half%' THEN 'packaged_14g'
WHEN lower(v_inventory.product_name) LIKE '%28%' THEN 'packaged_28g'
WHEN lower(v_inventory.product_name) LIKE '%454%' OR lower(v_inventory.product_name) LIKE '%lb%' OR lower(v_inventory.product_name) LIKE '%pound%' THEN 'packaged_454g'
WHEN lower(v_inventory.product_name) LIKE '%1g%' AND lower(v_inventory.product_name) LIKE '%preroll%' THEN 'packaged_1g_preroll'
WHEN lower(v_inventory.product_name) LIKE '%3-pack%' AND lower(v_inventory.product_name) LIKE '%preroll%' THEN 'packaged_3pack_preroll'
ELSE 'bulk_flower' -- Default
END;

-- Upsert batch stage tracking
INSERT INTO batch_stage_tracking (
batch_id,
stage,
weight_grams,
allocated_weight_grams,
location,
created_at,
updated_at
)
VALUES (
v_batch_id,
v_stage,
v_inventory.total_weight,
0, -- Will be calculated from allocations
v_inventory.batch, -- Use batch number as location for now
now(),
now()
)
ON CONFLICT (batch_id, stage) DO UPDATE SET
weight_grams = batch_stage_tracking.weight_grams + EXCLUDED.weight_grams,
updated_at = now();

v_records_updated := v_records_updated + 1;
END LOOP;

RETURN QUERY SELECT v_records_updated;
END;
$function$
;

-- Function: update_bucked_inventory_on_trim
CREATE OR REPLACE FUNCTION public.update_bucked_inventory_on_trim()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
IF NEW.bucked_inventory_id IS NOT NULL THEN
UPDATE bucked_inventory
SET current_weight_grams = current_weight_grams - NEW.pulled_weight,
status = CASE
WHEN current_weight_grams - NEW.pulled_weight <= 0 THEN 'depleted'
ELSE status
END,
updated_at = now()
WHERE id = NEW.bucked_inventory_id;
END IF;
RETURN NEW;
END;
$function$
;

-- Function: update_bucking_sessions_updated_at
CREATE OR REPLACE FUNCTION public.update_bucking_sessions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;

-- Function: update_certificates_of_analysis_updated_at
CREATE OR REPLACE FUNCTION public.update_certificates_of_analysis_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;

-- Function: update_draft_order_timestamp
CREATE OR REPLACE FUNCTION public.update_draft_order_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;

-- Function: update_invoice_timestamp
CREATE OR REPLACE FUNCTION public.update_invoice_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;

-- Function: update_order_item_timestamp
CREATE OR REPLACE FUNCTION public.update_order_item_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;

-- Function: update_order_total
CREATE OR REPLACE FUNCTION public.update_order_total()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
UPDATE orders
SET total_amount = (
SELECT COALESCE(SUM(subtotal), 0)
FROM order_items
WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
)
WHERE id = COALESCE(NEW.order_id, OLD.order_id);
RETURN COALESCE(NEW, OLD);
END;
$function$
;

-- Function: update_package_assignments_updated_at
CREATE OR REPLACE FUNCTION public.update_package_assignments_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;

-- Function: update_packaging_sessions_updated_at
CREATE OR REPLACE FUNCTION public.update_packaging_sessions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;

-- Function: update_product_labels_updated_at
CREATE OR REPLACE FUNCTION public.update_product_labels_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;

-- Function: update_strains_updated_at
CREATE OR REPLACE FUNCTION public.update_strains_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;

-- Function: update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;

-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;

-- Function: update_user_profile
CREATE OR REPLACE FUNCTION public.update_user_profile(target_user_id uuid, new_full_name text DEFAULT NULL::text, new_role text DEFAULT NULL::text, new_is_active boolean DEFAULT NULL::boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
requesting_user_role text;
BEGIN
-- Get the role of the user making the request
SELECT up.role INTO requesting_user_role
FROM user_profiles up
WHERE up.id = auth.uid();

-- Only allow admins to update other users' profiles or roles
IF requesting_user_role != 'admin' AND target_user_id != auth.uid() THEN
RAISE EXCEPTION 'Only admins can update other users profiles';
END IF;

-- Only allow admins to change roles
IF requesting_user_role != 'admin' AND new_role IS NOT NULL THEN
RAISE EXCEPTION 'Only admins can change user roles';
END IF;

-- Perform the update
UPDATE user_profiles
SET
full_name = COALESCE(new_full_name, full_name),
role = COALESCE(new_role, role),
is_active = COALESCE(new_is_active, is_active),
updated_at = now()
WHERE id = target_user_id;
END;
$function$
;

-- Function: upsert_conversion_lot_from_pending
CREATE OR REPLACE FUNCTION public.upsert_conversion_lot_from_pending()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_lot_id uuid;
v_total_weight numeric;
v_total_units integer;
v_remaining_weight numeric;
v_remaining_units integer;
v_session_count integer;
v_lot_status conversion_lot_status;
v_has_weight boolean;
v_has_units boolean;
BEGIN
-- Only process active pending conversions
IF NEW.status NOT IN ('pending', 'converting') THEN
RETURN NEW;
END IF;

RAISE NOTICE 'Aggregating pending conversion % (batch=%, product=%) into conversion lot',
NEW.id, NEW.batch_id, NEW.product_id;

-- Determine if this product uses weight or units
SELECT
BOOL_OR(original_weight IS NOT NULL AND original_weight > 0),
BOOL_OR(original_units IS NOT NULL AND original_units > 0)
INTO v_has_weight, v_has_units
FROM pending_conversions
WHERE batch_id = NEW.batch_id
AND product_id = NEW.product_id
AND DATE(created_at) = CURRENT_DATE
AND status IN ('pending', 'converting');

-- Calculate totals based on whether this is weight or unit based
IF v_has_weight THEN
-- Weight-based conversion (bucking, trim)
SELECT
COALESCE(SUM(original_weight), 0),
COALESCE(SUM(remaining_weight), 0),
COUNT(DISTINCT session_id)
INTO
v_total_weight,
v_remaining_weight,
v_session_count
FROM pending_conversions
WHERE batch_id = NEW.batch_id
AND product_id = NEW.product_id
AND DATE(created_at) = CURRENT_DATE
AND status IN ('pending', 'converting');

v_total_units := NULL;
v_remaining_units := NULL;

ELSIF v_has_units THEN
-- Unit-based conversion (packaging)
SELECT
COALESCE(SUM(original_units), 0),
COALESCE(SUM(remaining_units), 0),
COUNT(DISTINCT session_id)
INTO
v_total_units,
v_remaining_units,
v_session_count
FROM pending_conversions
WHERE batch_id = NEW.batch_id
AND product_id = NEW.product_id
AND DATE(created_at) = CURRENT_DATE
AND status IN ('pending', 'converting');

v_total_weight := NULL;
v_remaining_weight := NULL;

ELSE
-- No weight or units - this shouldn't happen
RAISE WARNING 'Pending conversion % has neither weight nor units', NEW.id;
RETURN NEW;
END IF;

-- Determine lot status based on remaining quantities
IF (v_remaining_weight IS NULL OR v_remaining_weight = 0) AND
(v_remaining_units IS NULL OR v_remaining_units = 0) THEN
v_lot_status := 'completed_today'::conversion_lot_status;
ELSE
v_lot_status := 'active'::conversion_lot_status;
END IF;

-- Check if lot already exists for this batch+product+date
SELECT id INTO v_lot_id
FROM conversion_lots
WHERE batch_id = NEW.batch_id
AND product_id = NEW.product_id
AND lot_date = CURRENT_DATE;

IF v_lot_id IS NULL THEN
-- Create new conversion lot
INSERT INTO conversion_lots (
batch_id,
product_id,
lot_date,
total_weight,
total_units,
remaining_weight,
remaining_units,
contributing_session_count,
status,
created_at
) VALUES (
NEW.batch_id,
NEW.product_id,
CURRENT_DATE,
v_total_weight,
v_total_units,
v_remaining_weight,
v_remaining_units,
v_session_count,
v_lot_status,
now()
);

IF v_has_weight THEN
RAISE NOTICE 'Created conversion lot for batch % product % with %g weight total (%u sessions)',
NEW.batch_id, NEW.product_id, v_total_weight, v_session_count;
ELSE
RAISE NOTICE 'Created conversion lot for batch % product % with %u units total (%u sessions)',
NEW.batch_id, NEW.product_id, v_total_units, v_session_count;
END IF;

ELSE
-- Update existing conversion lot
UPDATE conversion_lots
SET
total_weight = v_total_weight,
total_units = v_total_units,
remaining_weight = v_remaining_weight,
remaining_units = v_remaining_units,
contributing_session_count = v_session_count,
status = v_lot_status,
updated_at = now()
WHERE id = v_lot_id;

IF v_has_weight THEN
RAISE NOTICE 'Updated conversion lot % with %g weight remaining (status=%)',
v_lot_id, v_remaining_weight, v_lot_status;
ELSE
RAISE NOTICE 'Updated conversion lot % with %u units remaining (status=%)',
v_lot_id, v_remaining_units, v_lot_status;
END IF;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: validate_batch_strain_match
CREATE OR REPLACE FUNCTION public.validate_batch_strain_match(p_batch_id uuid, p_strain text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
v_batch_strain text;
BEGIN
SELECT strain INTO v_batch_strain
FROM batch_registry
WHERE id = p_batch_id;

IF v_batch_strain IS NULL THEN
RETURN false;
END IF;

RETURN v_batch_strain = p_strain;
END;
$function$
;

-- Function: validate_canonical_product_catalog
CREATE OR REPLACE FUNCTION public.validate_canonical_product_catalog()
 RETURNS TABLE(strain_name text, canonical_type text, product_exists boolean, product_id uuid, is_archived boolean)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
WITH canonical_types AS (
SELECT unnest(ARRAY[
'1lb Flower (454g)',
'1lb Smalls (454g)',
'14g Smalls',
'3.5g Flower',
'1g Preroll'
]) as type_name
),
active_strains AS (
SELECT id, name FROM strains WHERE is_active = true
)
SELECT
s.name as strain_name,
ct.type_name as canonical_type,
(p.id IS NOT NULL) as product_exists,
p.id as product_id,
COALESCE(p.is_archived, false) as is_archived
FROM active_strains s
CROSS JOIN canonical_types ct
LEFT JOIN product_types pt ON pt.name = ct.type_name
LEFT JOIN product_stages ps ON ps.name = 'Packaged'
LEFT JOIN products p ON (
p.strain_id = s.id 
AND p.type_id = pt.id 
AND p.stage_id = ps.id
)
ORDER BY s.name, 
CASE ct.type_name
WHEN '1lb Flower (454g)' THEN 1
WHEN '1lb Smalls (454g)' THEN 2
WHEN '14g Smalls' THEN 3
WHEN '3.5g Flower' THEN 4
WHEN '1g Preroll' THEN 5
END;
END;
$function$
;

-- Function: validate_coa_before_packaging
CREATE OR REPLACE FUNCTION public.validate_coa_before_packaging()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
-- Check if batch has valid COA
IF NOT check_batch_has_valid_coa(NEW.batch_registry_id) THEN
RAISE EXCEPTION 
'Cannot start packaging session: Batch requires valid Certificate of Analysis (COA). Please upload COA for batch % before packaging.',
NEW.batch_id;
END IF;

-- Validation passed, allow insert
RETURN NEW;
END;
$function$
;

-- Function: validate_label_coa_requirement
CREATE OR REPLACE FUNCTION public.validate_label_coa_requirement(p_batch_number text, p_label_type_code text)
 RETURNS TABLE(can_generate boolean, message text, has_coa boolean, requires_coa boolean)
 LANGUAGE plpgsql
AS $function$
DECLARE
v_has_coa boolean;
v_requires_coa boolean;
v_can_generate boolean;
v_message text;
BEGIN
-- Check if label type requires COA
SELECT lt.requires_coa
INTO v_requires_coa
FROM label_types lt
WHERE lt.code = p_label_type_code;

IF v_requires_coa IS NULL THEN
RETURN QUERY SELECT false, 'Invalid label type', false, false;
RETURN;
END IF;

-- Check if batch has COA
SELECT (coa_id IS NOT NULL AND coa_status = 'active')
INTO v_has_coa
FROM batch_with_coa_status
WHERE batch_with_coa_status.batch_number = p_batch_number;

IF v_has_coa IS NULL THEN
RETURN QUERY SELECT false, 'Batch not found', false, v_requires_coa;
RETURN;
END IF;

-- Determine if can generate
IF v_requires_coa AND NOT v_has_coa THEN
v_can_generate := false;
v_message := 'COA required but not found for batch ' || p_batch_number;
ELSE
v_can_generate := true;
v_message := 'Label can be generated';
END IF;

RETURN QUERY SELECT v_can_generate, v_message, v_has_coa, v_requires_coa;
END;
$function$
;

-- Function: validate_order_totals
CREATE OR REPLACE FUNCTION public.validate_order_totals()
 RETURNS TABLE(order_id uuid, order_number text, stored_total numeric, calculated_total numeric, difference numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
RETURN QUERY
SELECT
o.id as order_id,
o.order_number,
o.total_amount as stored_total,
COALESCE(SUM(oi.subtotal), 0) as calculated_total,
o.total_amount - COALESCE(SUM(oi.subtotal), 0) as difference
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_number, o.total_amount
HAVING o.total_amount != COALESCE(SUM(oi.subtotal), 0);
END;
$function$
;

-- Function: validate_product_stage_type_alignment
CREATE OR REPLACE FUNCTION public.validate_product_stage_type_alignment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
v_stage_name text;
v_type_name text;
v_type_applicable_stages text[];
BEGIN
-- Get stage name
IF NEW.stage_id IS NOT NULL THEN
SELECT name INTO v_stage_name
FROM product_stages
WHERE id = NEW.stage_id;
END IF;

-- Get product type info
IF NEW.type_id IS NOT NULL THEN
SELECT name, applicable_stages INTO v_type_name, v_type_applicable_stages
FROM product_types
WHERE id = NEW.type_id;
END IF;

-- Validation 1: Check if stage is in type's applicable_stages
IF v_stage_name IS NOT NULL AND v_type_name IS NOT NULL THEN
IF NOT (v_stage_name = ANY(v_type_applicable_stages)) THEN
RAISE EXCEPTION 'Product type "%" is not applicable to stage "%". Valid stages for this type: %',
v_type_name, v_stage_name, array_to_string(v_type_applicable_stages, ', ');
END IF;
END IF;

-- Validation 2: Bulk stage products should not have packaged product categories
IF v_stage_name IN ('Bulk', 'Binned', 'Bucked') AND NEW.product_category = 'packaged' THEN
RAISE EXCEPTION 'Products in stage "%" cannot have product_category "packaged". Bulk stage is for backend processing only.',
v_stage_name;
END IF;

-- Validation 3: Packaged stage products must have packaged category or preroll
IF v_stage_name = 'Packaged' AND NEW.product_category NOT IN ('packaged', 'preroll') THEN
RAISE EXCEPTION 'Products in Packaged stage must have product_category "packaged" or "preroll", not "%"',
NEW.product_category;
END IF;

RETURN NEW;
END;
$function$
;

-- Function: validate_ready_for_delivery
CREATE OR REPLACE FUNCTION public.validate_ready_for_delivery(order_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
order_status_current text;
BEGIN
SELECT status INTO order_status_current
FROM orders
WHERE id = order_id_param;

IF order_status_current = 'completed' THEN
RAISE EXCEPTION 'Cannot mark completed orders as ready for delivery';
END IF;

RETURN true;
END;
$function$
;

-- Function: validate_strain_names
CREATE OR REPLACE FUNCTION public.validate_strain_names(p_strain_names text[])
 RETURNS TABLE(strain_name text, exists_in_db boolean, matched_name text, abbreviation text, match_quality text, needs_attention boolean)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
SELECT
unnest.strain_name,
(fs.strain_id IS NOT NULL) as exists_in_db,
fs.strain_name as matched_name,
fs.strain_abbreviation as abbreviation,
fs.match_quality,
(fs.match_quality != 'exact' OR fs.strain_abbreviation IS NULL) as needs_attention
FROM unnest(p_strain_names) AS unnest(strain_name)
LEFT JOIN LATERAL find_strain_by_name(unnest.strain_name) fs ON true;
END;
$function$
;

-- Function: verify_all_inventory
CREATE OR REPLACE FUNCTION public.verify_all_inventory()
 RETURNS TABLE(total_items bigint, items_with_discrepancies bigint, total_discrepancy numeric, max_discrepancy numeric, items_verified bigint)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
RETURN QUERY
WITH stats AS (
SELECT
COUNT(*) as total,
COUNT(CASE WHEN ABS(ii.on_hand_qty - calculate_ledger_quantity(ii.id)) > 0.01 THEN 1 END) as with_discrepancies,
COALESCE(SUM(ABS(ii.on_hand_qty - calculate_ledger_quantity(ii.id))), 0) as total_disc,
COALESCE(MAX(ABS(ii.on_hand_qty - calculate_ledger_quantity(ii.id))), 0) as max_disc,
COUNT(CASE WHEN ABS(ii.on_hand_qty - calculate_ledger_quantity(ii.id)) <= 0.01 THEN 1 END) as verified
FROM inventory_items ii
)
SELECT
s.total,
s.with_discrepancies,
s.total_disc,
s.max_disc,
s.verified
FROM stats s;
END;
$function$
;

-- Function: void_session_aggregated
CREATE OR REPLACE FUNCTION public.void_session_aggregated(p_batch_id uuid, p_product_name text DEFAULT NULL::text, p_session_type text DEFAULT NULL::text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
v_session_ids UUID[];
v_sessions_voided INTEGER := 0;
v_session_type TEXT;
BEGIN
-- Validate reason provided
IF p_reason IS NULL OR trim(p_reason) = '' THEN
RAISE EXCEPTION 'Void reason is required';
END IF;

-- Use provided session type or auto-detect
v_session_type := p_session_type;

-- If session type not provided, detect from pending sessions
IF v_session_type IS NULL THEN
SELECT session_type INTO v_session_type
FROM pending_conversion_sessions
WHERE batch_id = p_batch_id
AND (product_name = p_product_name OR p_product_name IS NULL)
LIMIT 1;

IF v_session_type IS NULL THEN
RAISE EXCEPTION 'No pending sessions found for batch % and product "%"', p_batch_id, p_product_name;
END IF;
END IF;

-- Find and void all matching sessions based on type and output
CASE v_session_type
WHEN 'trim' THEN
-- Bulk Flower (Trimmed) - Update ONLY bigs fields
IF p_product_name = 'Bulk Flower (Trimmed)' OR p_product_name IS NULL THEN
SELECT array_agg(id) INTO v_session_ids
FROM trim_sessions
WHERE batch_registry_id = p_batch_id
AND session_status = 'completed'
AND finalization_status_bigs = 'pending'
AND output_product_bigs_name = 'Bulk Flower (Trimmed)';

UPDATE trim_sessions
SET
finalization_status_bigs = 'voided',
finalized_at_bigs = NOW(),
finalized_by_bigs = auth.uid(),
void_reason_bigs = p_reason
WHERE id = ANY(v_session_ids);

GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;
END IF;

-- Bulk Smalls (Trimmed) - Update ONLY smalls fields
IF p_product_name = 'Bulk Smalls (Trimmed)' OR p_product_name IS NULL THEN
SELECT array_agg(id) INTO v_session_ids
FROM trim_sessions
WHERE batch_registry_id = p_batch_id
AND session_status = 'completed'
AND finalization_status_smalls = 'pending'
AND output_product_smalls_name = 'Bulk Smalls (Trimmed)';

UPDATE trim_sessions
SET
finalization_status_smalls = 'voided',
finalized_at_smalls = NOW(),
finalized_by_smalls = auth.uid(),
void_reason_smalls = p_reason
WHERE id = ANY(v_session_ids);

GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;
END IF;

-- Bulk Trim (Trimmed) - Update ONLY trim fields
IF p_product_name = 'Bulk Trim (Trimmed)' OR p_product_name IS NULL THEN
SELECT array_agg(id) INTO v_session_ids
FROM trim_sessions
WHERE batch_registry_id = p_batch_id
AND session_status = 'completed'
AND finalization_status_trim = 'pending'
AND output_product_trim_name = 'Bulk Trim (Trimmed)';

UPDATE trim_sessions
SET
finalization_status_trim = 'voided',
finalized_at_trim = NOW(),
finalized_by_trim = auth.uid(),
void_reason_trim = p_reason
WHERE id = ANY(v_session_ids);

GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;
END IF;

WHEN 'packaging' THEN
-- Packaged products - Update packaged fields
SELECT array_agg(id) INTO v_session_ids
FROM packaging_sessions
WHERE batch_registry_id = p_batch_id
AND session_status = 'completed'
AND finalization_status_packaged = 'pending'
AND (output_product_name = p_product_name OR p_product_name IS NULL);

UPDATE packaging_sessions
SET
finalization_status_packaged = 'voided',
finalized_at_packaged = NOW(),
finalized_by_packaged = auth.uid(),
void_reason_packaged = p_reason
WHERE id = ANY(v_session_ids);

GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;

WHEN 'bucking' THEN
-- Bulk Flower (Bucked) - Update ONLY bucked fields
IF p_product_name = 'Bulk Flower (Bucked)' OR p_product_name IS NULL THEN
SELECT array_agg(id) INTO v_session_ids
FROM bucking_sessions
WHERE batch_registry_id = p_batch_id
AND session_status = 'completed'
AND finalization_status_bucked = 'pending'
AND output_product_flower_name = 'Bulk Flower (Bucked)';

UPDATE bucking_sessions
SET
finalization_status_bucked = 'voided',
finalized_at_bucked = NOW(),
finalized_by_bucked = auth.uid(),
void_reason_bucked = p_reason
WHERE id = ANY(v_session_ids);

GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;
END IF;

-- Bulk Smalls (Bucked) - Update ONLY smalls fields
IF p_product_name = 'Bulk Smalls (Bucked)' OR p_product_name IS NULL THEN
SELECT array_agg(id) INTO v_session_ids
FROM bucking_sessions
WHERE batch_registry_id = p_batch_id
AND session_status = 'completed'
AND finalization_status_smalls = 'pending'
AND output_product_smalls_name = 'Bulk Smalls (Bucked)';

UPDATE bucking_sessions
SET
finalization_status_smalls = 'voided',
finalized_at_smalls = NOW(),
finalized_by_smalls = auth.uid(),
void_reason_smalls = p_reason
WHERE id = ANY(v_session_ids);

GET DIAGNOSTICS v_sessions_voided = ROW_COUNT;
END IF;

ELSE
RAISE EXCEPTION 'Invalid session type: %', v_session_type;
END CASE;

RETURN jsonb_build_object(
'success', true,
'batch_id', p_batch_id,
'product_name', p_product_name,
'session_type', v_session_type,
'sessions_voided', v_sessions_voided,
'session_ids', v_session_ids,
'void_reason', p_reason
);
END;
$function$
;
