-- Migration: Auto-advance order_item status on first batch assignment
-- Decision #7: When the first package_assignment is created for an order_item
-- that is currently in 'trimming' status, automatically advance it to 'packaging'.
-- This signals downstream that batch assignment has begun.
-- Combined with a progress indicator (total_units_assigned / total_units_ordered)
-- so the team knows whether assignment is partial or complete.

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION fn_advance_status_on_first_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status order_item_status;
  v_prior_assignments integer;
BEGIN
  -- Get current status of the order item
  SELECT status INTO v_current_status
  FROM order_items
  WHERE id = NEW.order_item_id;

  -- Only act if the item is still in 'trimming' (the initial state)
  IF v_current_status = 'trimming' THEN
    -- Check if any prior assignments exist for this order_item
    -- (excluding the one we just inserted, which is NEW)
    SELECT COUNT(*) INTO v_prior_assignments
    FROM package_assignments
    WHERE order_item_id = NEW.order_item_id
      AND id != NEW.id;

    -- If this is the first assignment, advance to 'packaging'
    IF v_prior_assignments = 0 THEN
      UPDATE order_items
      SET status = 'packaging',
          updated_at = NOW()
      WHERE id = NEW.order_item_id;

      RAISE LOG 'Auto-advanced order_item % from trimming to packaging on first assignment (assignment_id: %)',
        NEW.order_item_id, NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Create the trigger (AFTER INSERT so the assignment row exists when we count)
DROP TRIGGER IF EXISTS trg_advance_status_on_first_assignment ON package_assignments;

CREATE TRIGGER trg_advance_status_on_first_assignment
  AFTER INSERT ON package_assignments
  FOR EACH ROW
  EXECUTE FUNCTION fn_advance_status_on_first_assignment();

-- 3. Add a comment documenting the trigger's purpose
COMMENT ON FUNCTION fn_advance_status_on_first_assignment() IS
  'Auto-advances order_item status from trimming → packaging when the first '
  'package_assignment is created. Part of batch-assign workflow (decision #7). '
  'Only fires on the transition from zero to one assignments.';
