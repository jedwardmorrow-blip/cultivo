-- CUL-195: Enforce batch_id cross-check on package_assignments
-- Raises check_violation if the inventory package's batch_id does not match
-- the order item's batch_id. Prevents cross-batch assignment errors silently
-- slipping through at the application layer.

CREATE OR REPLACE FUNCTION fn_check_package_assignment_batch_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inv_batch_id   uuid;
  v_order_batch_id uuid;
BEGIN
  -- Look up the batch on the inventory package being assigned
  SELECT batch_id INTO v_inv_batch_id
  FROM inventory_items
  WHERE package_id = NEW.package_id
  LIMIT 1;

  -- Look up the batch on the order item being fulfilled
  SELECT batch_id INTO v_order_batch_id
  FROM order_items
  WHERE id = NEW.order_item_id;

  -- Only enforce when both sides are resolved
  IF v_inv_batch_id IS NOT NULL AND v_order_batch_id IS NOT NULL THEN
    IF v_inv_batch_id <> v_order_batch_id THEN
      RAISE EXCEPTION
        'Batch mismatch: package % belongs to batch % but order item % belongs to batch %',
        NEW.package_id, v_inv_batch_id, NEW.order_item_id, v_order_batch_id
        USING ERRCODE = '23514';  -- check_violation
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_package_assignment_batch_check
  BEFORE INSERT ON package_assignments
  FOR EACH ROW EXECUTE FUNCTION fn_check_package_assignment_batch_match();

COMMENT ON FUNCTION fn_check_package_assignment_batch_match() IS
  'CUL-195: Guards package_assignments against cross-batch assignment. Fires BEFORE INSERT.';
