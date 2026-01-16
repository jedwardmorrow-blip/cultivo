/*
  # Fix Remaining Inventory Naming Issues
  
  ## Summary
  Fixes remaining inventory items that weren't caught by the previous migration.
  Uses more robust pattern matching to handle all edge cases.
  
  ## Changes
  - Fixes Binned items missing the "Binned -" prefix
  - Fixes Bucked Flower items in Bulk category
  - Handles all special cases and edge patterns
*/

-- Fix Binned items that are missing the "Binned -" prefix
-- These show as "[Strain] - Flower" instead of "Binned - [Strain] - Flower"
UPDATE inventory_items
SET product_name = 'Binned - ' || product_name
WHERE category ILIKE '%binned%'
  AND strain IS NOT NULL
  AND product_name LIKE strain || ' - Flower'
  AND product_name NOT LIKE 'Binned -%';

-- Fix "Bucked Flower - [Strain]" pattern in Bulk category
UPDATE inventory_items
SET product_name = 'Bucked - ' || strain || ' - Flower'
WHERE category ILIKE '%bulk%'
  AND strain IS NOT NULL
  AND product_name = 'Bucked Flower - ' || strain;

-- Fix "Bucked Smalls - [Strain]" pattern in Bulk category  
UPDATE inventory_items
SET product_name = 'Bucked - ' || strain || ' - Smalls'
WHERE category ILIKE '%bulk%'
  AND strain IS NOT NULL
  AND product_name = 'Bucked Smalls - ' || strain;

-- Handle any remaining Bulk Flower items with old naming
UPDATE inventory_items
SET product_name = 'Bulk - ' || strain || ' - Flower'
WHERE category ILIKE '%flower%'
  AND category ILIKE '%bulk%'
  AND strain IS NOT NULL
  AND product_name NOT LIKE '%-%-%'
  AND product_name NOT LIKE 'Bucked%';

-- Handle any remaining Bulk Smalls items
UPDATE inventory_items
SET product_name = 'Bulk - ' || strain || ' - Smalls'
WHERE category ILIKE '%bulk%'
  AND strain IS NOT NULL
  AND product_name ILIKE '%smalls%'
  AND product_name NOT LIKE '%-%-%';

-- Handle Packaged items with generic naming
UPDATE inventory_items
SET product_name = 'Packaged - ' || strain || ' - 3.5g Flower'
WHERE (category ILIKE '%prepack%' OR product_name ILIKE '%packaged%')
  AND strain IS NOT NULL
  AND product_name ILIKE '%3.5g%'
  AND product_name NOT LIKE 'Packaged - %';

UPDATE inventory_items
SET product_name = 'Packaged - ' || strain || ' - 14g Smalls'
WHERE (category ILIKE '%prepack%' OR product_name ILIKE '%packaged%')
  AND strain IS NOT NULL
  AND product_name ILIKE '%14g%'
  AND product_name NOT LIKE 'Packaged - %';

-- Handle Pre-Roll items
UPDATE inventory_items
SET product_name = 'Pre-Roll - ' || strain || ' - 1g'
WHERE category ILIKE '%pre-roll%'
  AND strain IS NOT NULL
  AND (product_name ILIKE 'bulk flower%' OR product_name NOT LIKE 'Pre-Roll - %');
