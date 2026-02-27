/*
  # Fix 14g Product Naming & Finalization Status Sync

  1. Bug Fix: Trigger `set_packaging_product_names()`
    - Changed 14g product name from '14g Flower' to '14g Smalls'
    - 14g = Smalls is the established system convention (products catalog, productNaming.ts, order items)
    - All historical 14g packaging sessions sourced from "Bulk Smalls (Trimmed)"
    - 3.5g Flower and 1lb Flower (454g) remain unchanged (correct)

  2. Bug Fix: RPC `finalize_session_aggregated()` packaging path
    - Now syncs product-specific finalization columns (finalization_status_14g, _3_5g, _1lb)
      alongside the generic finalization_status_packaged column
    - Prevents the pending_conversion_sessions view from showing already-finalized sessions
      as still pending (double-finalization risk)

  3. Data Backfill
    - Updates 3 packaging sessions: output_product_14g_name '14g Flower' -> '14g Smalls'
    - Updates affected inventory_items: product_name '14g Flower' -> '14g Smalls'
    - Syncs finalization_status_14g for sessions already finalized via generic column

  Impact: Fixes Story Bell order package assignment (inventory now matches order product name)
*/

-- ============================================================
-- 1. Fix the trigger: 14g Flower -> 14g Smalls
-- ============================================================
CREATE OR REPLACE FUNCTION set_packaging_product_names()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. Fix the RPC: sync product-specific finalization columns
-- ============================================================
CREATE OR REPLACE FUNCTION finalize_session_aggregated(
  p_batch_id UUID,
  p_product_name TEXT DEFAULT NULL,
  p_session_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- ============================================================
-- 3. Backfill: Fix existing wrong data
-- ============================================================

-- 3a. Fix packaging sessions: 14g Flower -> 14g Smalls
UPDATE packaging_sessions
SET output_product_14g_name = REPLACE(output_product_14g_name, '14g Flower', '14g Smalls'),
    output_product_name = CASE
      WHEN output_product_name LIKE '%14g Flower%'
      THEN REPLACE(output_product_name, '14g Flower', '14g Smalls')
      ELSE output_product_name
    END
WHERE output_product_14g_name LIKE '%14g Flower%';

-- 3b. Fix inventory items: 14g Flower -> 14g Smalls
UPDATE inventory_items
SET product_name = REPLACE(product_name, '14g Flower', '14g Smalls')
WHERE product_name LIKE '%14g Flower%';

-- 3c. Sync finalization_status_14g for sessions already finalized via generic column
UPDATE packaging_sessions
SET finalization_status_14g = 'finalized',
    finalized_at_14g = COALESCE(finalized_at_14g, finalized_at_packaged, NOW()),
    finalized_by_14g = COALESCE(finalized_by_14g, finalized_by_packaged)
WHERE finalization_status_packaged = 'finalized'
  AND finalization_status_14g = 'pending'
  AND COALESCE(units_14g, 0) > 0;
