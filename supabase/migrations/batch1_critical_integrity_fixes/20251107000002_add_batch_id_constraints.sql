/*
  # Batch 1.2: Add batch_id NOT NULL and Immutability Constraints
  
  ## Purpose
  Enforces batch_id as required and immutable after creation.
  
  ## Changes
  1. Add NOT NULL constraint on inventory_items.batch_id (DEFERRABLE)
  2. Add trigger to prevent batch_id updates post-insert
  3. Add CHECK constraint validating batch_id FK relationship
  
  ## Safety
  - Prerequisite: 20251107000001_backfill_inventory_batch_ids.sql must run first
  - DEFERRABLE constraint allows transaction-level backfill
  - Trigger only blocks UPDATE, not INSERT
  - Idempotent: Checks for existing constraints before adding
*/

-- =====================================================
-- STEP 1: Verify all batch_ids are populated
-- =====================================================

DO $$
DECLARE
  v_null_count integer;
  v_error_message text;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM inventory_items
  WHERE batch_id IS NULL;
  
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'Cannot add NOT NULL constraint: % inventory items still have NULL batch_id. Run backfill migration first.', v_null_count;
  END IF;
  
  RAISE NOTICE '✅ Verified: All inventory_items have non-NULL batch_id';
END $$;

-- =====================================================
-- STEP 2: Add NOT NULL constraint (DEFERRABLE)
-- =====================================================

DO $$
DECLARE
  v_constraint_exists boolean;
BEGIN
  -- Check if constraint already exists
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_items_batch_id_not_null'
  ) INTO v_constraint_exists;
  
  IF v_constraint_exists THEN
    RAISE NOTICE 'Constraint inventory_items_batch_id_not_null already exists, skipping';
  ELSE
    -- Add NOT NULL constraint as CHECK constraint (allows DEFERRABLE)
    ALTER TABLE inventory_items
    ADD CONSTRAINT inventory_items_batch_id_not_null
    CHECK (batch_id IS NOT NULL)
    DEFERRABLE INITIALLY DEFERRED;
    
    RAISE NOTICE '✅ Added NOT NULL constraint on inventory_items.batch_id (DEFERRABLE)';
  END IF;
END $$;

COMMENT ON CONSTRAINT inventory_items_batch_id_not_null ON inventory_items IS
'Ensures all inventory items are linked to a batch. DEFERRABLE to allow transaction-level backfills.';

-- =====================================================
-- STEP 3: Add FK constraint if missing
-- =====================================================

DO $$
DECLARE
  v_fk_exists boolean;
  v_invalid_refs integer;
BEGIN
  -- Check if FK already exists
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_items_batch_id_fkey'
      AND conrelid = 'inventory_items'::regclass
  ) INTO v_fk_exists;
  
  IF v_fk_exists THEN
    RAISE NOTICE 'FK constraint inventory_items_batch_id_fkey already exists, skipping';
  ELSE
    -- Validate all batch_ids reference valid batches
    SELECT COUNT(*) INTO v_invalid_refs
    FROM inventory_items ii
    LEFT JOIN batch_registry br ON br.id = ii.batch_id
    WHERE ii.batch_id IS NOT NULL
      AND br.id IS NULL;
    
    IF v_invalid_refs > 0 THEN
      RAISE EXCEPTION 'Cannot add FK constraint: % inventory items reference non-existent batches', v_invalid_refs;
    END IF;
    
    -- Add FK constraint
    ALTER TABLE inventory_items
    ADD CONSTRAINT inventory_items_batch_id_fkey
    FOREIGN KEY (batch_id)
    REFERENCES batch_registry(id)
    ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED;
    
    RAISE NOTICE '✅ Added FK constraint on inventory_items.batch_id → batch_registry.id';
  END IF;
END $$;

-- =====================================================
-- STEP 4: Create immutability trigger function
-- =====================================================

CREATE OR REPLACE FUNCTION fn_prevent_batch_id_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow initial INSERT (OLD is NULL)
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Block UPDATE if batch_id changes
  IF TG_OP = 'UPDATE' AND OLD.batch_id IS DISTINCT FROM NEW.batch_id THEN
    RAISE EXCEPTION 'batch_id is immutable and cannot be changed after creation. Item ID: %, Old batch_id: %, Attempted new batch_id: %',
      OLD.id,
      OLD.batch_id,
      NEW.batch_id
    USING ERRCODE = 'integrity_constraint_violation',
          HINT = 'Create a new inventory item if batch assignment is incorrect.';
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_prevent_batch_id_update IS
'Enforces batch_id immutability. Once set on INSERT, batch_id cannot be changed via UPDATE.';

-- =====================================================
-- STEP 5: Create immutability trigger
-- =====================================================

DO $$
BEGIN
  -- Drop trigger if exists (for idempotency)
  DROP TRIGGER IF EXISTS trg_prevent_batch_id_update ON inventory_items;
  
  -- Create trigger
  CREATE TRIGGER trg_prevent_batch_id_update
    BEFORE INSERT OR UPDATE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION fn_prevent_batch_id_update();
  
  RAISE NOTICE '✅ Created trigger trg_prevent_batch_id_update on inventory_items';
END $$;

-- =====================================================
-- STEP 6: Add index on batch_id if missing
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_inventory_items_batch_id_not_null
  ON inventory_items(batch_id)
  WHERE batch_id IS NOT NULL;

COMMENT ON INDEX idx_inventory_items_batch_id_not_null IS
'Performance index for batch_id lookups. Includes all rows now that batch_id is NOT NULL.';

-- =====================================================
-- STEP 7: Validation test
-- =====================================================

DO $$
DECLARE
  v_test_passed boolean := true;
  v_error_msg text;
BEGIN
  RAISE NOTICE 'Running constraint validation tests...';
  
  -- Test 1: Verify NOT NULL constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_items_batch_id_not_null'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: NOT NULL constraint not found';
  ELSE
    RAISE NOTICE '  ✓ NOT NULL constraint exists';
  END IF;
  
  -- Test 2: Verify FK constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_items_batch_id_fkey'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: FK constraint not found';
  ELSE
    RAISE NOTICE '  ✓ FK constraint exists';
  END IF;
  
  -- Test 3: Verify trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_prevent_batch_id_update'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: Immutability trigger not found';
  ELSE
    RAISE NOTICE '  ✓ Immutability trigger exists';
  END IF;
  
  -- Test 4: Verify no NULL batch_ids
  IF EXISTS (SELECT 1 FROM inventory_items WHERE batch_id IS NULL LIMIT 1) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: Found NULL batch_ids';
  ELSE
    RAISE NOTICE '  ✓ No NULL batch_ids found';
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

COMMENT ON CONSTRAINT inventory_items_batch_id_not_null ON inventory_items IS
'Migration: 20251107000002_add_batch_id_constraints.sql
Status: Completed
Purpose: Enforce batch_id NOT NULL and immutability
Rollback: ALTER TABLE inventory_items DROP CONSTRAINT inventory_items_batch_id_not_null; DROP TRIGGER trg_prevent_batch_id_update ON inventory_items;';
