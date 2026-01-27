/*
  # Backfill Category Field for Packaged Inventory

  ## Purpose
  Set category='packaged' for existing inventory items that belong to the Packaged stage.
  This ensures they appear in the Packaged Inventory view which filters by category field.

  ## Problem
  Existing packaged inventory items have NULL category field, making them invisible in
  the Packaged Inventory view which uses `category.includes('prepack')` or 
  `category.includes('packaged')` filter.

  ## Solution
  1. Backfill category='packaged' for items with product_stage_id matching Packaged stage
  2. Backfill category='packaged' for items with product_name containing "Packaged"
  3. Add trigger to auto-populate category based on product_stage_id for future items

  ## Changes
  1. UPDATE existing inventory_items to set category based on stage
  2. CREATE trigger to auto-populate category on INSERT/UPDATE

  ## Impact
  - Existing packaged items will appear in Packaged Inventory view
  - Future packaged items will automatically have correct category
  - No breaking changes to other inventory stages
*/

-- ============================================================================
-- STEP 1: Backfill category for existing packaged inventory items
-- ============================================================================

-- Update items with Packaged stage UUID
UPDATE inventory_items
SET category = 'packaged'
WHERE product_stage_id = '323ee0fe-1342-4b26-9379-c373f3cabbb9' -- Packaged stage
  AND (category IS NULL OR category != 'packaged');

-- Update items with "Packaged" in product_name (safety net)
UPDATE inventory_items
SET category = 'packaged'
WHERE product_name LIKE 'Packaged%'
  AND (category IS NULL OR category != 'packaged');

-- ============================================================================
-- STEP 2: Create trigger to auto-populate category based on stage
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_auto_set_inventory_category()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_stage_name text;
BEGIN
  -- Only set category if not already set
  IF NEW.category IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get stage name from product_stage_id
  IF NEW.product_stage_id IS NOT NULL THEN
    SELECT name INTO v_stage_name
    FROM product_stages
    WHERE id = NEW.product_stage_id;

    -- Map stage name to category
    -- Note: Using lowercase for consistency with existing filter logic
    CASE v_stage_name
      WHEN 'Packaged' THEN
        NEW.category := 'packaged';
      WHEN 'Binned' THEN
        NEW.category := 'binned';
      WHEN 'Bucked' THEN
        NEW.category := 'bucked';
      WHEN 'Trimmed' THEN
        NEW.category := 'bulk'; -- Trimmed products are bulk flower/smalls
      ELSE
        -- Default to stage name lowercase if no mapping
        NEW.category := lower(v_stage_name);
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on inventory_items
DROP TRIGGER IF EXISTS trg_auto_set_inventory_category ON inventory_items;

CREATE TRIGGER trg_auto_set_inventory_category
  BEFORE INSERT OR UPDATE OF product_stage_id ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_set_inventory_category();

COMMENT ON FUNCTION fn_auto_set_inventory_category IS
  'Automatically sets inventory_items.category based on product_stage_id.
   Maps stage names to category values used in inventory filtering:
   - Packaged → packaged
   - Binned → binned
   - Bucked → bucked
   - Trimmed → bulk (for flower/smalls)
   Created: 2026-01-28';

-- ============================================================================
-- STEP 3: Verification and logging
-- ============================================================================

DO $$
DECLARE
  v_packaged_count INTEGER;
  v_null_category_count INTEGER;
BEGIN
  -- Count packaged items
  SELECT COUNT(*)
  INTO v_packaged_count
  FROM inventory_items
  WHERE category = 'packaged';

  -- Count items with NULL category
  SELECT COUNT(*)
  INTO v_null_category_count
  FROM inventory_items
  WHERE category IS NULL;

  RAISE NOTICE '✓ Packaged items with category set: %', v_packaged_count;
  RAISE NOTICE '✓ Items with NULL category (non-packaged): %', v_null_category_count;
  RAISE NOTICE '✓ Auto-category trigger created for future items';
END $$;
