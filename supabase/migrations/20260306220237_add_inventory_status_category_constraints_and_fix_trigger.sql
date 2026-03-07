/*
  # Add CHECK constraints and fix auto-category trigger

  ## Problem
  Code paths were inserting inventory items with 'Available' (capital A) status
  and simplified category names ('Binned', 'Bucked', etc.) instead of the
  normalized lowercase values expected by reporting views.

  ## Changes
  1. Add CHECK constraint on `status` to enforce lowercase values
  2. Add CHECK constraint on `category` to enforce only known normalized values
  3. Fix `fn_auto_set_inventory_category()` trigger to map stage names to
     proper prefixed category values (flower_binned, flower_bucked, etc.)

  ## Security
  - No changes to RLS policies
  - Constraints are additive safety measures
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_inventory_status_lowercase'
    AND conrelid = 'inventory_items'::regclass
  ) THEN
    ALTER TABLE inventory_items
      ADD CONSTRAINT chk_inventory_status_lowercase
      CHECK (status = lower(status));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_inventory_category_valid'
    AND conrelid = 'inventory_items'::regclass
  ) THEN
    ALTER TABLE inventory_items
      ADD CONSTRAINT chk_inventory_category_valid
      CHECK (category IN (
        'flower_binned', 'flower_bucked', 'flower_bulk', 'flower_packaged',
        'smalls_bucked', 'smalls_bulk', 'trim_bulk', 'binned'
      ) OR category IS NULL);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION fn_auto_set_inventory_category()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_stage_name text;
BEGIN
  IF NEW.category IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.product_stage_id IS NOT NULL THEN
    SELECT name INTO v_stage_name
    FROM product_stages
    WHERE id = NEW.product_stage_id;

    CASE v_stage_name
      WHEN 'Packaged' THEN
        NEW.category := 'flower_packaged';
      WHEN 'Binned' THEN
        NEW.category := 'flower_binned';
      WHEN 'Bucked' THEN
        NEW.category := 'flower_bucked';
      WHEN 'Trimmed' THEN
        NEW.category := 'flower_bulk';
      ELSE
        NEW.category := lower(v_stage_name);
    END CASE;
  END IF;

  RETURN NEW;
END;
$function$;
