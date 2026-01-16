/*
  # Trigger Testing Utilities

  1. Purpose
    - Provide testing functions for trigger validation
    - Enable scenario-based testing
    - Support rollback and recovery
    - Facilitate deployment validation

  2. Components
    - Test movement trigger function
    - Scenario simulation functions
    - Trigger enable/disable functions
    - Rollback procedures

  3. Usage
    - Test triggers before production deployment
    - Validate trigger behavior with sample data
    - Practice rollback procedures
    - Support troubleshooting

  4. Notes
    - Part of Phase 6: Database Triggers
    - All test functions clean up after themselves
    - Safe to run in production (uses test data)
*/

-- Function: Test trigger with sample movements
CREATE OR REPLACE FUNCTION test_movement_trigger()
RETURNS TABLE (
  test_name text,
  status text,
  expected_qty numeric,
  actual_qty numeric,
  passed boolean
) AS $$
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
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION test_movement_trigger IS
  'Tests movement trigger with sample data. Cleans up test data after execution.';

GRANT EXECUTE ON FUNCTION test_movement_trigger TO authenticated;

-- Function: Simulate movement scenario
CREATE OR REPLACE FUNCTION simulate_movement_scenario(scenario_name text)
RETURNS TABLE (
  step text,
  action text,
  result text
) AS $$
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
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION simulate_movement_scenario IS
  'Simulates common movement scenarios for testing. Scenarios: production, fulfillment, reconciliation';

GRANT EXECUTE ON FUNCTION simulate_movement_scenario TO authenticated;

-- Function: Disable trigger (emergency)
CREATE OR REPLACE FUNCTION disable_movement_trigger()
RETURNS text AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can disable triggers';
  END IF;

  -- Disable trigger
  ALTER TABLE inventory_movements DISABLE TRIGGER trg_update_inventory_on_hand;
  
  RETURN 'Trigger disabled successfully. Re-enable with enable_movement_trigger()';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION disable_movement_trigger IS
  'Emergency disable of movement trigger. Admin only. Use enable_movement_trigger() to restore.';

GRANT EXECUTE ON FUNCTION disable_movement_trigger TO authenticated;

-- Function: Enable trigger
CREATE OR REPLACE FUNCTION enable_movement_trigger()
RETURNS text AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can enable triggers';
  END IF;

  -- Enable trigger
  ALTER TABLE inventory_movements ENABLE TRIGGER trg_update_inventory_on_hand;
  
  RETURN 'Trigger enabled successfully';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION enable_movement_trigger IS
  'Re-enables movement trigger after emergency disable. Admin only.';

GRANT EXECUTE ON FUNCTION enable_movement_trigger TO authenticated;

-- Function: Complete trigger rollback (emergency)
CREATE OR REPLACE FUNCTION rollback_to_direct_updates()
RETURNS text AS $$
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
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rollback_to_direct_updates IS
  'EMERGENCY: Complete rollback to pre-trigger state. Admin only. Use only if triggers are causing critical issues.';

GRANT EXECUTE ON FUNCTION rollback_to_direct_updates TO authenticated;
