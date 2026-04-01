/*
  # CUL-24: Batch ID Propagation on Package Assignment

  ## Problem
  order_items.batch_id is a nullable UUID FK → batch_registry. Of 722 rows:
  - 167 already have batch_id set
  - 555 are NULL
    - 33 have package_assignments → inventory_items with a valid batch_id (backfillable)
    - 522 have no package_assignments yet (legitimately pre-fulfillment, intentionally NULL)

  NOT NULL cannot be enforced globally — order items are created before packages are assigned.
  The 522 un-assignable rows are pending order items where batch is unknown at order time.

  ## Changes
  1. BACKFILL: Update 33 order_items.batch_id from inventory_items via package_assignments.
  2. TRIGGER: fn_sync_order_item_batch_from_assignment() — on AFTER INSERT on package_assignments,
     set order_items.batch_id from inventory_items.batch_id (only if currently NULL).

  ## Applies to
  - Production: fonreynkfeqywshijqpi
  - Staging:    cbxwippkzeszvxewhebd
*/

-- Step 1: Backfill 33 order_items with batch_id from inventory_items via package_assignments
UPDATE order_items oi
SET batch_id = ii.batch_id
FROM package_assignments pa
JOIN inventory_items ii ON ii.package_id = pa.package_id
WHERE pa.order_item_id = oi.id
  AND oi.batch_id IS NULL
  AND ii.batch_id IS NOT NULL;

-- Step 2: Trigger function to propagate batch_id on future package assignments
CREATE OR REPLACE FUNCTION fn_sync_order_item_batch_from_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_batch_id uuid;
BEGIN
  -- Look up batch_id from the assigned inventory item
  SELECT ii.batch_id INTO v_batch_id
  FROM inventory_items ii
  WHERE ii.package_id = NEW.package_id;

  -- Set on order_item if batch_id is currently NULL
  IF v_batch_id IS NOT NULL THEN
    UPDATE order_items
    SET batch_id = v_batch_id
    WHERE id = NEW.order_item_id
      AND batch_id IS NULL;
  END IF;

  RETURN NEW;
END;
$function$;

-- Step 3: Attach trigger
DROP TRIGGER IF EXISTS trg_sync_order_item_batch_from_assignment ON package_assignments;
CREATE TRIGGER trg_sync_order_item_batch_from_assignment
  AFTER INSERT ON package_assignments
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_order_item_batch_from_assignment();
