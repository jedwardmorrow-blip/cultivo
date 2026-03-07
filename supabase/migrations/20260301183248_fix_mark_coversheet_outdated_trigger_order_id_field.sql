/*
  # Fix mark_coversheet_outdated trigger referencing non-existent order_id column

  1. Problem
    - The `mark_coversheet_outdated()` function uses `COALESCE(NEW.order_id, NEW.id)`
    - When fired from the `orders` table, `NEW.order_id` does not exist (the column is `id`)
    - PL/pgSQL raises a hard error instead of returning NULL for missing fields
    - This causes "record 'new' has no field 'order_id'" when updating order status

  2. Fix
    - Use `TG_TABLE_NAME` to determine which column to reference
    - `orders` table -> use `NEW.id`
    - `order_items` table -> use `NEW.order_id`

  3. No other changes
    - Existing triggers remain attached and do not need recreation
*/

CREATE OR REPLACE FUNCTION public.mark_coversheet_outdated()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
DECLARE
  v_order_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    v_order_id := NEW.id;
  ELSE
    v_order_id := NEW.order_id;
  END IF;

  UPDATE coversheets
  SET
    is_outdated = true,
    last_order_update = now()
  WHERE
    order_id = v_order_id
    AND is_active = true;

  RETURN NEW;
END;
$function$;
