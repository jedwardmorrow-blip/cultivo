/*
  # Fix Validation Trigger Movement Kinds

  ## Problem
  The fn_validate_movement_item_ids() function still validates for OLD movement_kind names:
  - CONSUME_SESSION_INPUT (old)
  - PRODUCE_SESSION_OUTPUT (old)

  But we standardized on NEW names:
  - CONSUME (new)
  - PRODUCE (new)

  This causes validation to fail when trying to create movements with new names.

  ## Solution
  Update validation function to accept new standardized movement_kind names.

  ## Migration Date
  2025-11-28
*/

CREATE OR REPLACE FUNCTION fn_validate_movement_item_ids()
RETURNS TRIGGER
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
$function$;

COMMENT ON FUNCTION fn_validate_movement_item_ids IS
  'Validates movement_kind and required item_ids. Uses standardized movement_kind names: CONSUME, PRODUCE (not old _SESSION_INPUT/_SESSION_OUTPUT). Updated 2025-11-28.';
