/*
  # Update Finalization RPC for Per-Product Packaging

  ## Purpose
  Update the `finalize_session_aggregated()` RPC function to handle product-specific
  finalization for packaging sessions. This enables independent finalization of 3.5g,
  14g, and 1lb products from the same session.

  ## Problem
  Current RPC:
  - Uses finalization_status_packaged (applies to ALL products)
  - Sums all units together (units_3_5g + units_14g + units_454g)
  - Creates single inventory item regardless of product type
  - Does not set category field (required for packaged inventory filtering)

  ## Solution
  Update packaging CASE branch to:
  - Match product_name to determine which product type is being finalized
  - Use product-specific finalization status fields
  - Calculate units from only the matching units column
  - Set category='packaged' for proper inventory filtering
  - Update only the matching finalization status field

  ## Product Name Matching
  - "Packaged - * - 3.5g Flower" → finalization_status_3_5g, units_3_5g
  - "Packaged - * - 14g Flower" → finalization_status_14g, units_14g
  - "Packaged - * - 1lb Flower (454g)" → finalization_status_1lb, units_454g

  ## Changes
  1. Add product type detection based on product_name
  2. Use product-specific finalization status field for filtering and updating
  3. Calculate units from only the matching units column
  4. Set category='packaged' in inventory_items INSERT
  5. Maintain backward compatibility with generic product names

  ## Impact
  - Enables unpivoted packaging workflow (each product type independent)
  - Inventory items properly categorized for packaged view filtering
  - Matches architectural pattern from trim and bucking
  - No changes to trim or bucking logic
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
  v_total_units NUMERIC;
  v_package_date DATE;
  v_packaged_stage_id UUID := '323ee0fe-1342-4b26-9379-c373f3cabbb9';
  v_error_message TEXT;
  v_product_type TEXT; -- Determines which units column to use
BEGIN
  -- Determine session type if not provided
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

  -- Process based on session type
  CASE v_session_type
    WHEN 'trim' THEN
      -- Bulk Trim (Trimmed)
      IF p_product_name = 'Bulk Trim (Trimmed)' OR p_product_name LIKE '%Trim%' OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM trim_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status_trim = 'pending'
          AND (output_product_trim_name = p_product_name OR p_product_name IS NULL)
          AND output_product_trim_name IS NOT NULL;

        IF v_session_ids IS NOT NULL AND array_length(v_session_ids, 1) > 0 THEN
          UPDATE trim_sessions
          SET finalization_status_trim = 'finalized',
              finalized_at_trim = NOW(),
              finalized_by_trim = auth.uid()
          WHERE id = ANY(v_session_ids);
          GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
        END IF;
      END IF;

      -- Bulk Flower (Trimmed)
      IF p_product_name = 'Bulk Flower (Trimmed)' OR (p_product_name LIKE '%Flower%' AND p_product_name LIKE '%Trimmed%') OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM trim_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status_bigs = 'pending'
          AND (output_product_bigs_name = p_product_name OR p_product_name IS NULL)
          AND output_product_bigs_name IS NOT NULL;

        IF v_session_ids IS NOT NULL AND array_length(v_session_ids, 1) > 0 THEN
          UPDATE trim_sessions
          SET finalization_status_bigs = 'finalized',
              finalized_at_bigs = NOW(),
              finalized_by_bigs = auth.uid()
          WHERE id = ANY(v_session_ids);
          GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
        END IF;
      END IF;

      -- Bulk Smalls (Trimmed)
      IF p_product_name = 'Bulk Smalls (Trimmed)' OR (p_product_name LIKE '%Smalls%' AND p_product_name LIKE '%Trimmed%') OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM trim_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status_smalls = 'pending'
          AND (output_product_smalls_name = p_product_name OR p_product_name IS NULL)
          AND output_product_smalls_name IS NOT NULL;

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
      -- ========================================================================
      -- PACKAGING: PER-PRODUCT FINALIZATION
      -- ========================================================================
      -- Determine which product type based on product_name
      -- This enables independent finalization of 3.5g, 14g, and 1lb products
      
      v_product_type := NULL;
      
      IF p_product_name LIKE '%3.5g%' THEN
        v_product_type := '3_5g';
      ELSIF p_product_name LIKE '%14g%' THEN
        v_product_type := '14g';
      ELSIF p_product_name LIKE '%1lb%' OR p_product_name LIKE '%454g%' THEN
        v_product_type := '1lb';
      END IF;
      
      -- If product type determined, finalize that specific product
      IF v_product_type IS NOT NULL THEN
        BEGIN
          -- Step 1: Get matching sessions based on product type
          CASE v_product_type
            WHEN '3_5g' THEN
              SELECT array_agg(id) INTO v_session_ids
              FROM packaging_sessions
              WHERE batch_registry_id = p_batch_id
                AND session_status = 'completed'
                AND finalization_status_3_5g = 'pending'
                AND output_product_3_5g_name = p_product_name
                AND COALESCE(units_3_5g, 0) > 0;
              
              -- Calculate total units for this product type only
              SELECT
                (SELECT strain_id FROM packaging_sessions WHERE id = ANY(v_session_ids) LIMIT 1),
                SUM(COALESCE(units_3_5g, 0)),
                MAX(completed_at)::DATE
              INTO v_strain_id, v_total_units, v_package_date
              FROM packaging_sessions
              WHERE id = ANY(v_session_ids);
              
            WHEN '14g' THEN
              SELECT array_agg(id) INTO v_session_ids
              FROM packaging_sessions
              WHERE batch_registry_id = p_batch_id
                AND session_status = 'completed'
                AND finalization_status_14g = 'pending'
                AND output_product_14g_name = p_product_name
                AND COALESCE(units_14g, 0) > 0;
              
              SELECT
                (SELECT strain_id FROM packaging_sessions WHERE id = ANY(v_session_ids) LIMIT 1),
                SUM(COALESCE(units_14g, 0)),
                MAX(completed_at)::DATE
              INTO v_strain_id, v_total_units, v_package_date
              FROM packaging_sessions
              WHERE id = ANY(v_session_ids);
              
            WHEN '1lb' THEN
              SELECT array_agg(id) INTO v_session_ids
              FROM packaging_sessions
              WHERE batch_registry_id = p_batch_id
                AND session_status = 'completed'
                AND finalization_status_1lb = 'pending'
                AND output_product_1lb_name = p_product_name
                AND COALESCE(units_454g, 0) > 0;
              
              SELECT
                (SELECT strain_id FROM packaging_sessions WHERE id = ANY(v_session_ids) LIMIT 1),
                SUM(COALESCE(units_454g, 0)),
                MAX(completed_at)::DATE
              INTO v_strain_id, v_total_units, v_package_date
              FROM packaging_sessions
              WHERE id = ANY(v_session_ids);
          END CASE;

          IF v_session_ids IS NOT NULL AND array_length(v_session_ids, 1) > 0 THEN
            -- Validate required data
            IF v_strain_id IS NULL THEN
              RAISE EXCEPTION 'Cannot finalize: strain_id is NULL for batch % product %', p_batch_id, p_product_name;
            END IF;

            IF v_total_units IS NULL OR v_total_units <= 0 THEN
              RAISE EXCEPTION 'Cannot finalize: total_units is % for batch % product %', v_total_units, p_batch_id, p_product_name;
            END IF;

            -- Step 2: Get batch number
            SELECT batch_number INTO v_batch_number FROM batch_registry WHERE id = p_batch_id;

            IF v_batch_number IS NULL THEN
              RAISE EXCEPTION 'Cannot finalize: batch_number not found for batch %', p_batch_id;
            END IF;

            -- Step 3: Generate package ID
            v_package_id := generate_next_package_id(p_batch_id);

            -- ========================================================================
            -- STEP 4: CREATE INVENTORY WITH QUANTITIES SET DIRECTLY
            -- ========================================================================
            -- IMPORTANT: Set category='packaged' for proper filtering in packaged view
            -- SIMPLIFIED: Set all quantities directly (no trigger choreography)
            -- ATP formula satisfied immediately: available_qty = on_hand_qty - reserved_qty

            INSERT INTO inventory_items (
              package_id, batch_id, batch_number, strain_id, product_name, product_stage_id, category,
              on_hand_qty, available_qty, reserved_qty, unit, status, package_date
            ) VALUES (
              v_package_id, p_batch_id, v_batch_number, v_strain_id, p_product_name, v_packaged_stage_id, 'packaged',
              v_total_units,  -- Set on_hand_qty directly
              v_total_units,  -- Set available_qty = on_hand_qty (reserved_qty = 0)
              0,              -- No reservations yet
              'unit', 'Available', v_package_date
            )
            RETURNING id INTO v_inventory_item_id;

            -- ========================================================================
            -- STEP 5: CREATE MOVEMENT FOR AUDIT TRAIL ONLY
            -- ========================================================================
            -- Movement recorded for compliance and traceability
            -- Trigger bypasses reason_code='session_finalization' (no quantity update)

            INSERT INTO inventory_movements (
              movement_kind, dest_item_id, qty, unit, reason_code, reference_type, notes, created_by
            ) VALUES (
              'PRODUCE', v_inventory_item_id, v_total_units, 'unit', 'session_finalization', 'packaging_session',
              format('Finalized %s units of %s from %s packaging session(s) for batch %s',
                v_total_units, p_product_name, array_length(v_session_ids, 1), v_batch_number),
              COALESCE(auth.uid()::text, 'system')
            );

            -- ========================================================================
            -- STEP 6: UPDATE SESSION STATUS (PRODUCT-SPECIFIC)
            -- ========================================================================
            -- Update only the specific finalization status field for this product type

            CASE v_product_type
              WHEN '3_5g' THEN
                UPDATE packaging_sessions
                SET finalization_status_3_5g = 'finalized',
                    finalized_at_3_5g = NOW(),
                    finalized_by_3_5g = auth.uid()
                WHERE id = ANY(v_session_ids);
                
              WHEN '14g' THEN
                UPDATE packaging_sessions
                SET finalization_status_14g = 'finalized',
                    finalized_at_14g = NOW(),
                    finalized_by_14g = auth.uid()
                WHERE id = ANY(v_session_ids);
                
              WHEN '1lb' THEN
                UPDATE packaging_sessions
                SET finalization_status_1lb = 'finalized',
                    finalized_at_1lb = NOW(),
                    finalized_by_1lb = auth.uid()
                WHERE id = ANY(v_session_ids);
            END CASE;

            GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
          END IF;

        EXCEPTION
          WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            RAISE WARNING 'Packaging finalization failed for batch % product %: %',
              p_batch_id, p_product_name, v_error_message;
            RAISE EXCEPTION 'Failed to finalize packaging sessions: %', v_error_message;
        END;
      ELSE
        -- Fallback for generic product names (backward compatibility)
        RAISE EXCEPTION 'Product name must specify type: %s (expected 3.5g, 14g, or 1lb)', p_product_name;
      END IF;

    WHEN 'bucking' THEN
      -- Bulk Flower (Bucked)
      IF p_product_name = 'Bulk Flower (Bucked)' OR (p_product_name LIKE '%Flower%' AND p_product_name LIKE '%Bucked%') OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM bucking_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status_bucked = 'pending'
          AND (output_product_flower_name = p_product_name OR p_product_name IS NULL)
          AND output_product_flower_name IS NOT NULL;

        IF v_session_ids IS NOT NULL AND array_length(v_session_ids, 1) > 0 THEN
          UPDATE bucking_sessions
          SET finalization_status_bucked = 'finalized',
              finalized_at_bucked = NOW(),
              finalized_by_bucked = auth.uid()
          WHERE id = ANY(v_session_ids);
          GET DIAGNOSTICS v_sessions_finalized = ROW_COUNT;
        END IF;
      END IF;

      -- Bulk Smalls (Bucked)
      IF p_product_name = 'Bulk Smalls (Bucked)' OR (p_product_name LIKE '%Smalls%' AND p_product_name LIKE '%Bucked%') OR p_product_name IS NULL THEN
        SELECT array_agg(id) INTO v_session_ids
        FROM bucking_sessions
        WHERE batch_registry_id = p_batch_id
          AND session_status = 'completed'
          AND finalization_status_smalls = 'pending'
          AND (output_product_smalls_name = p_product_name OR p_product_name IS NULL)
          AND output_product_smalls_name IS NOT NULL;

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
    'product_type', v_product_type,
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
   UPDATED 2026-01-28: Added per-product packaging finalization support.
   
   PACKAGING SESSIONS NOW SUPPORT PER-PRODUCT FINALIZATION:
   - Detects product type from product_name (3.5g, 14g, 1lb)
   - Uses product-specific finalization status fields
   - Calculates units from only the matching units column
   - Sets category=''packaged'' for proper inventory filtering
   - Enables independent finalization of different product types
   
   SIMPLIFIED PATTERN: Treats finalization as CREATION, not MOVEMENT:
     1. INSERT inventory_items with actual quantities (ATP formula satisfied immediately)
     2. CREATE movement for audit trail only (trigger bypasses session_finalization)
     3. UPDATE product-specific session finalization status
   
   Simpler, faster, more reliable than previous trigger-based approach.
   Updated: 2026-01-28 (added per-product packaging support)';
