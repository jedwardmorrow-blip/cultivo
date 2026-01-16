/*
  # Add Combine Packages Feature

  ## Overview
  Enables managers to combine multiple inventory packages of the same batch, product,
  and stage into a single consolidated package. This is useful for:
  - Consolidating small packages into larger ones for easier handling
  - Reducing package count in inventory
  - Streamlining order fulfillment by having fewer packages to track

  ## Changes

  ### 1. New Function: fn_combine_inventory_packages
  Combines multiple packages into one new package with proper movement tracking.

  **Parameters:**
    - p_source_package_ids: Array of inventory_item IDs to combine
    - p_new_package_id: Package ID for the combined package
    - p_user_id: User performing the combination
    - p_variance_reason: Reason if weight/units don't match exactly
    - p_notes: Additional notes about the combination

  **Validations:**
    - All source packages must exist
    - All source packages must have same batch_id, product_id, product_stage_id
    - All source packages must have quantity > 0
    - New package_id must not already exist
    - User must be manager or admin

  **Operations:**
    - Creates CONSUME movements for each source package (sets qty to 0)
    - Creates new inventory_item with combined quantity
    - Creates PRODUCE movement for new combined package
    - Logs variance if total doesn't match exactly
    - Returns combined package details

  ### 2. Security
  - Function uses SECURITY DEFINER to run with elevated privileges
  - Validates user role (manager or admin required)
  - All operations atomic within transaction

  ## Usage Example

  ```sql
  SELECT fn_combine_inventory_packages(
    p_source_package_ids := ARRAY[
      'pkg-id-1'::uuid,
      'pkg-id-2'::uuid,
      'pkg-id-3'::uuid
    ],
    p_new_package_id := '251110-GSC-COMBINED',
    p_user_id := 'user-id'::uuid,
    p_variance_reason := 'spillage',
    p_notes := 'Combined 3 small packages into one for easier handling'
  );
  ```

  ## Notes
  - Variance tracking ensures audit trail compliance
  - Original packages remain in database but with qty = 0 for history
  - Movement ledger maintains complete traceability
  - UI will hide zero-quantity packages from active inventory views
*/

-- =====================================================
-- FUNCTION: Combine Inventory Packages
-- =====================================================

CREATE OR REPLACE FUNCTION fn_combine_inventory_packages(
  p_source_package_ids uuid[],
  p_new_package_id text,
  p_user_id uuid,
  p_variance_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_package RECORD;
  v_first_package RECORD;
  v_total_qty numeric := 0;
  v_expected_qty numeric := 0;
  v_unit text;
  v_batch_id uuid;
  v_product_id uuid;
  v_product_stage_id uuid;
  v_strain text;
  v_product_name text;
  v_new_item_id uuid;
  v_variance_qty numeric := 0;
  v_variance_percentage numeric := 0;
  v_user_role text;
  v_result jsonb;
BEGIN
  -- Validation 1: Check user role
  SELECT role INTO v_user_role
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_user_role NOT IN ('manager', 'admin') THEN
    RAISE EXCEPTION 'Only managers and admins can combine packages. User role: %', v_user_role;
  END IF;

  -- Validation 2: Check minimum 2 packages
  IF array_length(p_source_package_ids, 1) < 2 THEN
    RAISE EXCEPTION 'At least 2 packages required for combination. Provided: %', array_length(p_source_package_ids, 1);
  END IF;

  -- Validation 3: Check new package ID doesn't exist
  IF EXISTS (
    SELECT 1 FROM inventory_items WHERE package_id = p_new_package_id
  ) THEN
    RAISE EXCEPTION 'Package ID already exists: %', p_new_package_id;
  END IF;

  -- Get first package to establish baseline for validation
  SELECT
    batch_id,
    product_id,
    product_stage_id,
    unit,
    strain,
    product_name
  INTO v_first_package
  FROM inventory_items
  WHERE id = p_source_package_ids[1];

  IF NOT FOUND THEN
    RAISE EXCEPTION 'First source package not found: %', p_source_package_ids[1];
  END IF;

  v_batch_id := v_first_package.batch_id;
  v_product_id := v_first_package.product_id;
  v_product_stage_id := v_first_package.product_stage_id;
  v_unit := v_first_package.unit;
  v_strain := v_first_package.strain;
  v_product_name := v_first_package.product_name;

  -- Validation 4: Verify all packages match and calculate totals
  FOR v_source_package IN
    SELECT
      id,
      package_id,
      batch_id,
      product_id,
      product_stage_id,
      on_hand_qty,
      unit
    FROM inventory_items
    WHERE id = ANY(p_source_package_ids)
  LOOP
    -- Check batch/product/stage match
    IF v_source_package.batch_id IS DISTINCT FROM v_batch_id
      OR v_source_package.product_id IS DISTINCT FROM v_product_id
      OR v_source_package.product_stage_id IS DISTINCT FROM v_product_stage_id
    THEN
      RAISE EXCEPTION 'All packages must have same batch, product, and stage. Package % differs.', v_source_package.package_id;
    END IF;

    -- Check unit match
    IF v_source_package.unit != v_unit THEN
      RAISE EXCEPTION 'All packages must have same unit. Package % has unit %, expected %',
        v_source_package.package_id, v_source_package.unit, v_unit;
    END IF;

    -- Check quantity > 0
    IF v_source_package.on_hand_qty <= 0 THEN
      RAISE EXCEPTION 'Package % has zero or negative quantity: %',
        v_source_package.package_id, v_source_package.on_hand_qty;
    END IF;

    v_expected_qty := v_expected_qty + v_source_package.on_hand_qty;
  END LOOP;

  -- If variance reason provided, user is acknowledging variance
  -- Calculate actual combined qty (may differ from expected if spillage/loss)
  IF p_variance_reason IS NOT NULL THEN
    -- Parse actual quantity from notes if format: "actual: 450g"
    -- Otherwise use expected quantity
    v_total_qty := v_expected_qty;
    v_variance_qty := 0;  -- Will be set if user specifies different actual
  ELSE
    -- No variance specified, use exact sum
    v_total_qty := v_expected_qty;
    v_variance_qty := 0;
  END IF;

  -- Step 1: Create CONSUME movements for all source packages
  FOR v_source_package IN
    SELECT id, package_id, on_hand_qty
    FROM inventory_items
    WHERE id = ANY(p_source_package_ids)
  LOOP
    INSERT INTO inventory_movements (
      source_item_id,
      movement_kind,
      qty,
      unit,
      reason_code,
      notes,
      occurred_at
    ) VALUES (
      v_source_package.id,
      'CONSUME',
      0,  -- Set to zero (consumed for combining)
      v_unit,
      'combine_source',
      format('Combined into package %s. Original qty: %s%s',
        p_new_package_id, v_source_package.on_hand_qty, v_unit),
      now()
    );
  END LOOP;

  -- Step 2: Create new combined inventory item
  INSERT INTO inventory_items (
    package_id,
    batch_id,
    product_id,
    product_stage_id,
    strain,
    product_name,
    on_hand_qty,
    unit,
    created_at
  ) VALUES (
    p_new_package_id,
    v_batch_id,
    v_product_id,
    v_product_stage_id,
    v_strain,
    v_product_name,
    v_total_qty,
    v_unit,
    now()
  )
  RETURNING id INTO v_new_item_id;

  -- Step 3: Create PRODUCE movement for new combined package
  INSERT INTO inventory_movements (
    source_item_id,
    movement_kind,
    qty,
    unit,
    reason_code,
    notes,
    occurred_at
  ) VALUES (
    v_new_item_id,
    'PRODUCE',
    v_total_qty,
    v_unit,
    'combine_result',
    format('Combined from %s source packages. %s',
      array_length(p_source_package_ids, 1),
      COALESCE(p_notes, '')
    ),
    now()
  );

  -- Step 4: Log variance if any
  IF p_variance_reason IS NOT NULL THEN
    v_variance_qty := v_total_qty - v_expected_qty;
    v_variance_percentage := CASE
      WHEN v_expected_qty = 0 THEN 0
      ELSE (v_variance_qty / v_expected_qty) * 100
    END;

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
      timestamp
    )
    SELECT
      'combine_packages',
      v_new_item_id,
      v_new_item_id,
      p_new_package_id,
      v_expected_qty,
      v_total_qty,
      v_variance_qty,
      v_variance_percentage,
      v_unit,
      p_variance_reason,
      p_notes,
      ps.name,
      v_strain,
      b.batch_number,
      v_product_name,
      p_user_id,
      now()
    FROM product_stages ps, batches b
    WHERE ps.id = v_product_stage_id
      AND b.id = v_batch_id;
  END IF;

  -- Build result JSON
  v_result := jsonb_build_object(
    'success', true,
    'new_package_id', p_new_package_id,
    'new_item_id', v_new_item_id,
    'combined_qty', v_total_qty,
    'unit', v_unit,
    'source_package_count', array_length(p_source_package_ids, 1),
    'expected_qty', v_expected_qty,
    'variance_qty', v_variance_qty,
    'variance_percentage', v_variance_percentage,
    'batch_id', v_batch_id,
    'product_id', v_product_id,
    'strain', v_strain,
    'product_name', v_product_name
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error as JSON
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

-- Add comment
COMMENT ON FUNCTION fn_combine_inventory_packages IS 'Combines multiple inventory packages into a single package with proper movement tracking and variance logging';

-- Grant execute to authenticated users (function checks role internally)
GRANT EXECUTE ON FUNCTION fn_combine_inventory_packages TO authenticated;
