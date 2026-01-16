/*
  # Fix Movement Kind Check Constraint

  ## Problem
  The valid_movement_kind_new CHECK constraint still uses OLD movement_kind names:
  - CONSUME_SESSION_INPUT (old)
  - PRODUCE_SESSION_OUTPUT (old)

  Should use NEW standardized names:
  - CONSUME (new)
  - PRODUCE (new)

  ## Solution
  Drop old constraint and create new one with standardized movement_kind values.

  ## Migration Date
  2025-11-28
*/

-- Drop old constraint
ALTER TABLE inventory_movements
  DROP CONSTRAINT IF EXISTS valid_movement_kind_new;

-- Create new constraint with standardized movement_kind values
ALTER TABLE inventory_movements
  ADD CONSTRAINT valid_movement_kind_standardized CHECK (
    movement_kind IN (
      'RECEIPT',
      'CONSUME',          -- NEW (was CONSUME_SESSION_INPUT)
      'PRODUCE',          -- NEW (was PRODUCE_SESSION_OUTPUT)
      'FULFILLMENT',
      'RETURN',
      'RESERVE',
      'RELEASE',
      'ADJUSTMENT',
      'RECONCILIATION'
    )
  );

COMMENT ON CONSTRAINT valid_movement_kind_standardized ON inventory_movements IS
  'Validates movement_kind uses standardized names: CONSUME, PRODUCE (not old _SESSION_INPUT/_SESSION_OUTPUT). Updated 2025-11-28.';
