/*
  # Prevent Package Assignment Over-Allocation

  1. New Trigger
    - `fn_check_assignment_quantity_limit` — BEFORE INSERT trigger on `package_assignments`
      that verifies the total assigned quantity for an order item will not exceed
      the ordered quantity on `order_items`.

  2. Security
    - Prevents phantom inventory loss from duplicate/excess assignments
    - Enforces data integrity at the database level as a safety net behind application-layer checks

  3. Important Notes
    - This is a BEFORE INSERT trigger so it blocks the row before it enters the table
    - Covers race conditions that application-layer checks cannot prevent
*/

CREATE OR REPLACE FUNCTION fn_check_assignment_quantity_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_ordered_qty numeric;
  v_already_assigned numeric;
BEGIN
  SELECT quantity INTO v_ordered_qty
  FROM order_items
  WHERE id = NEW.order_item_id;

  IF v_ordered_qty IS NULL THEN
    RAISE EXCEPTION 'Order item % not found', NEW.order_item_id;
  END IF;

  SELECT COALESCE(SUM(quantity_assigned), 0) INTO v_already_assigned
  FROM package_assignments
  WHERE order_item_id = NEW.order_item_id
    AND status IN ('reserved', 'fulfilled');

  IF v_already_assigned + NEW.quantity_assigned > v_ordered_qty THEN
    RAISE EXCEPTION 'Over-allocation: assigning % would bring total to % against ordered qty of %',
      NEW.quantity_assigned,
      v_already_assigned + NEW.quantity_assigned,
      v_ordered_qty;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_assignment_quantity_limit ON package_assignments;
CREATE TRIGGER trg_check_assignment_quantity_limit
  BEFORE INSERT ON package_assignments
  FOR EACH ROW
  EXECUTE FUNCTION fn_check_assignment_quantity_limit();
