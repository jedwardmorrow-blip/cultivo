/*
  # Fix RPC: Set Missing Inventory Fields During Finalization

  ## Summary
  Updates the `finalize_session_aggregated` function to populate all fields
  that the label service and inventory UI need. Previously the packaging branch
  omitted strain (text), batch (text), category, and net_weight, causing NULLs
  that broke label generation.

  ## Changes
  1. Added `strain` (text) - looked up from strains table via v_strain_id
  2. Added `batch` (text) - set equal to batch_number for label barcode generation
  3. Added `category` - set to 'Packaged' for packaging sessions
  4. Added `net_weight` - parsed from product_name (e.g. "3.5g" -> 3.5, "14g" -> 14)

  ## Notes
  - Only the packaging branch INSERT is modified (trim/bucking don't create inventory via RPC)
  - net_weight extraction uses regex matching on the gram pattern in product names
  - All other behavior unchanged
*/

CREATE OR REPLACE FUNCTION finalize_session_aggregated(
  p_batch_id uuid,
  p_product_name text DEFAULT NULL,
  p_session_type text DEFAULT NULL
)
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

          -- Look up strain name for the text field
          SELECT name INTO v_strain_name FROM strains WHERE id = v_strain_id;

          -- Extract net_weight from product_name (e.g. "3.5g" -> 3.5, "14g" -> 14, "454g" -> 454)
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
              finalized_by_packaged = auth.uid()
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
$function$;

COMMENT ON FUNCTION finalize_session_aggregated IS
  'Finalizes completed sessions by aggregating outputs and creating inventory.
   SIMPLIFIED PATTERN (2026-01-28): Treats finalization as CREATION, not MOVEMENT.
   PACKAGING SESSIONS: Sets quantities directly without trigger choreography.
   FIX (2026-02-15): Now also sets strain, batch, category, net_weight on inventory_items
   to prevent NULL fields that break label generation.';
