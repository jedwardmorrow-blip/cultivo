/*
  # Batch 1.5: Enforce Quarantine Gate
  
  ## Purpose
  Blocks RESERVE/FULFILLMENT movements for quarantined batches.
  Allows sessions (production continues) but prevents sales operations.
  
  ## Changes
  1. Add trigger to validate batch quarantine status before movements
  2. Standardize quarantine error messages
  3. Log quarantine violations for audit
  
  ## Safety
  - Does NOT modify existing data
  - Only adds validation logic for future operations
  - Idempotent: Checks for existing triggers
*/

-- =====================================================
-- STEP 1: Create quarantine violation log table
-- =====================================================

CREATE TABLE IF NOT EXISTS quarantine_violation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES batch_registry(id) ON DELETE SET NULL,
  attempted_operation text NOT NULL, -- 'RESERVE', 'FULFILLMENT', 'LABEL_PRINT', etc.
  movement_kind text,
  order_id uuid,
  item_id uuid,
  blocked_at timestamptz DEFAULT now(),
  blocked_by uuid,
  quarantine_reason text,
  violation_details jsonb
);

COMMENT ON TABLE quarantine_violation_log IS
'Audit log of operations blocked due to batch quarantine status. Used for compliance reporting.';

-- Create index
CREATE INDEX IF NOT EXISTS idx_quarantine_violation_batch 
  ON quarantine_violation_log(batch_id) 
  WHERE batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quarantine_violation_blocked_at 
  ON quarantine_violation_log(blocked_at DESC);

-- Enable RLS
ALTER TABLE quarantine_violation_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view
CREATE POLICY "Authenticated users can view quarantine violations"
  ON quarantine_violation_log FOR SELECT
  TO authenticated
  USING (true);

-- Allow system to insert violations
CREATE POLICY "System can log quarantine violations"
  ON quarantine_violation_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- STEP 2: Create quarantine validation function
-- =====================================================

CREATE OR REPLACE FUNCTION fn_validate_batch_not_quarantined(
  p_batch_id uuid,
  p_operation text DEFAULT 'operation'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

COMMENT ON FUNCTION fn_validate_batch_not_quarantined IS
'Validates batch is not quarantined before allowing operations. Raises exception if quarantined.';

-- =====================================================
-- STEP 3: Create inventory movement quarantine gate
-- =====================================================

CREATE OR REPLACE FUNCTION fn_check_quarantine_before_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch_id uuid;
  v_item_batch_id uuid;
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
  
  -- Skip if no batch linkage (shouldn't happen with constraint in place)
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
$$;

COMMENT ON FUNCTION fn_check_quarantine_before_movement IS
'Quarantine gate: Blocks RESERVE and FULFILLMENT movements on quarantined batches. Logs violations.';

-- Create trigger
DROP TRIGGER IF EXISTS trg_check_quarantine_before_movement ON inventory_movements;

CREATE TRIGGER trg_check_quarantine_before_movement
  BEFORE INSERT ON inventory_movements
  FOR EACH ROW
  WHEN (NEW.movement_kind IN ('RESERVE', 'FULFILLMENT'))
  EXECUTE FUNCTION fn_check_quarantine_before_movement();

COMMENT ON TRIGGER trg_check_quarantine_before_movement ON inventory_movements IS
'Enforces quarantine gate: Prevents sales operations (RESERVE/FULFILLMENT) on quarantined batches.';

-- =====================================================
-- STEP 4: Add quarantine check to session start
-- =====================================================

CREATE OR REPLACE FUNCTION fn_check_quarantine_on_session_start()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

COMMENT ON FUNCTION fn_check_quarantine_on_session_start IS
'Warns when starting sessions on quarantined batches. Does NOT block (QC may need to process for testing).';

-- Create trigger for trim_sessions
DROP TRIGGER IF EXISTS trg_check_quarantine_on_trim_start ON trim_sessions;

CREATE TRIGGER trg_check_quarantine_on_trim_start
  BEFORE INSERT OR UPDATE ON trim_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'active')
  EXECUTE FUNCTION fn_check_quarantine_on_session_start();

-- Create trigger for packaging_sessions
DROP TRIGGER IF EXISTS trg_check_quarantine_on_packaging_start ON packaging_sessions;

CREATE TRIGGER trg_check_quarantine_on_packaging_start
  BEFORE INSERT OR UPDATE ON packaging_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'active')
  EXECUTE FUNCTION fn_check_quarantine_on_session_start();

COMMENT ON TRIGGER trg_check_quarantine_on_trim_start ON trim_sessions IS
'Warns when trim session starts on quarantined batch (does not block).';

COMMENT ON TRIGGER trg_check_quarantine_on_packaging_start ON packaging_sessions IS
'Warns when packaging session starts on quarantined batch (does not block).';

-- =====================================================
-- STEP 5: Create quarantine status view
-- =====================================================

CREATE OR REPLACE VIEW v_quarantined_batches AS
SELECT 
  br.id as batch_id,
  br.batch_number,
  br.strain,
  br.lifecycle_state,
  br.is_quarantined,
  br.quarantine_reason,
  br.quarantined_at,
  
  -- Count inventory items affected
  COUNT(DISTINCT ii.id) as affected_item_count,
  
  -- Total on-hand inventory affected
  SUM(ii.on_hand_qty) as total_on_hand_qty,
  
  -- Count blocked operations
  (SELECT COUNT(*) 
   FROM quarantine_violation_log 
   WHERE batch_id = br.id) as blocked_operation_count,
  
  br.created_at,
  br.updated_at
FROM batch_registry br
LEFT JOIN inventory_items ii ON ii.batch_id = br.id
WHERE br.is_quarantined = true
GROUP BY br.id, br.batch_number, br.strain, br.lifecycle_state, 
         br.is_quarantined, br.quarantine_reason, br.quarantined_at,
         br.created_at, br.updated_at
ORDER BY br.quarantined_at DESC;

COMMENT ON VIEW v_quarantined_batches IS
'Shows all currently quarantined batches with impact metrics (affected inventory, blocked operations).';

-- Grant access
GRANT SELECT ON v_quarantined_batches TO authenticated;

-- =====================================================
-- STEP 6: Validation tests
-- =====================================================

DO $$
DECLARE
  v_test_passed boolean := true;
BEGIN
  RAISE NOTICE 'Running quarantine gate validation tests...';
  
  -- Test 1: Verify violation log table exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'quarantine_violation_log'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: Quarantine violation log table not found';
  ELSE
    RAISE NOTICE '  ✓ Quarantine violation log table exists';
  END IF;
  
  -- Test 2: Verify validation function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'fn_validate_batch_not_quarantined'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: Quarantine validation function not found';
  ELSE
    RAISE NOTICE '  ✓ Quarantine validation function exists';
  END IF;
  
  -- Test 3: Verify movement quarantine gate trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_check_quarantine_before_movement'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: Movement quarantine gate trigger not found';
  ELSE
    RAISE NOTICE '  ✓ Movement quarantine gate trigger exists';
  END IF;
  
  -- Test 4: Verify session quarantine check triggers exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_check_quarantine_on_trim_start'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: Trim session quarantine check not found';
  ELSE
    RAISE NOTICE '  ✓ Trim session quarantine check exists';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_check_quarantine_on_packaging_start'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: Packaging session quarantine check not found';
  ELSE
    RAISE NOTICE '  ✓ Packaging session quarantine check exists';
  END IF;
  
  -- Test 5: Verify quarantined batches view exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'v_quarantined_batches'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: Quarantined batches view not found';
  ELSE
    RAISE NOTICE '  ✓ Quarantined batches view exists';
  END IF;
  
  IF v_test_passed THEN
    RAISE NOTICE E'\n✅ All validation tests PASSED';
  ELSE
    RAISE EXCEPTION 'One or more validation tests FAILED. Check warnings above.';
  END IF;
END $$;

-- =====================================================
-- MIGRATION METADATA
-- =====================================================

COMMENT ON TRIGGER trg_check_quarantine_before_movement ON inventory_movements IS
'Migration: 20251107000005_enforce_quarantine_gate.sql
Status: Completed
Purpose: Block RESERVE/FULFILLMENT on quarantined batches, allow sessions
Rollback: DROP TRIGGER trg_check_quarantine_before_movement ON inventory_movements;';
