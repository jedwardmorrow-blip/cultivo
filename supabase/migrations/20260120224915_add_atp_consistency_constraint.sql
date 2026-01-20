/*
  # Add ATP Consistency Constraint
  
  ## Problem
  No database-level enforcement of ATP formula:
  - available_qty = on_hand_qty - reserved_qty
  
  This allows data integrity issues where available_qty diverges from the formula.
  
  ## Solution
  Add CHECK constraint to enforce ATP consistency at database level.
  
  ## Prerequisites
  All existing violations must be fixed first:
  - fix_broken_available_qty_bug (3 packages)
  - fix_atp_violations_bucking_sessions (9 packages)
  
  ## Impact
  - Prevents future ATP violations
  - Ensures data consistency
  - Catches bugs at write-time instead of discovery-time
  
  ## Performance
  CHECK constraints are evaluated on INSERT/UPDATE only - minimal overhead.
*/

-- Step 1: Validate no violations exist
DO $$
DECLARE
  v_violations_count INTEGER;
  v_violations TEXT;
BEGIN
  SELECT COUNT(*), string_agg(package_id, ', ')
  INTO v_violations_count, v_violations
  FROM inventory_qty_health
  WHERE health_status = 'MISMATCH';
  
  IF v_violations_count > 0 THEN
    RAISE EXCEPTION 'Found % packages violating ATP consistency. Run inventory_qty_health view to identify issues. Packages: %',
      v_violations_count, v_violations;
  END IF;
  
  RAISE NOTICE 'Validation passed: No ATP violations found. Safe to add constraint.';
END $$;

-- Step 2: Add CHECK constraint
ALTER TABLE inventory_items
ADD CONSTRAINT chk_atp_consistency
CHECK (available_qty = on_hand_qty - COALESCE(reserved_qty, 0));

-- Step 3: Add constraint comment
COMMENT ON CONSTRAINT chk_atp_consistency ON inventory_items IS
'Enforces ATP (Available-to-Promise) formula: available_qty = on_hand_qty - reserved_qty.
Prevents data integrity issues at write-time. Added 2026-01-21 after fixing all violations.';

-- Step 4: Success message
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: ATP consistency constraint added. Formula enforced: available_qty = on_hand_qty - reserved_qty';
END $$;
