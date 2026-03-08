/*
  # Update order status transition validation

  1. Changes
    - Expand `fn_validate_order_status_transition()` to support the full set of
      transitions the application needs:
      - Forward: submitted->accepted, accepted->processing,
        processing->ready_for_delivery, ready_for_delivery->completed
      - Backward (one-step revert): accepted->submitted, processing->accepted,
        ready_for_delivery->processing, completed->ready_for_delivery
      - Cancellation from ANY non-completed, non-cancelled state
        (including ready_for_delivery, which was previously blocked)
      - Reopen: cancelled->submitted

  2. Important Notes
    - The `handle_order_status_change` trigger already handles inventory
      restoration when rolling back from ready_for_delivery, so backward
      transitions and cancellation from that state are data-safe
    - The admin bypass via `current_setting('app.bypass_status_validation')`
      is preserved
    - No data is modified; only the trigger function logic changes
*/

CREATE OR REPLACE FUNCTION fn_validate_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_valid_transition boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_valid_transition := CASE
    WHEN OLD.status = 'submitted' AND NEW.status IN ('accepted', 'cancelled') THEN true
    WHEN OLD.status = 'accepted' AND NEW.status IN ('processing', 'submitted', 'cancelled') THEN true
    WHEN OLD.status = 'processing' AND NEW.status IN ('ready_for_delivery', 'accepted', 'cancelled') THEN true
    WHEN OLD.status = 'ready_for_delivery' AND NEW.status IN ('completed', 'processing', 'cancelled') THEN true
    WHEN OLD.status = 'completed' AND NEW.status IN ('ready_for_delivery') THEN true
    WHEN OLD.status = 'cancelled' AND NEW.status IN ('submitted') THEN true

    WHEN current_setting('app.bypass_status_validation', true) = 'true' THEN true

    ELSE false
  END;

  IF NOT v_valid_transition THEN
    RAISE EXCEPTION 'Invalid order status transition: % -> %',
      OLD.status, NEW.status
    USING ERRCODE = 'check_violation',
          HINT = 'Valid transitions: forward progression, one-step revert, cancellation from any active state, and reopen from cancelled.';
  END IF;

  RETURN NEW;
END;
$$;
