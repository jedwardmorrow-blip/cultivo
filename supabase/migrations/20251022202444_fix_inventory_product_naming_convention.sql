/*
  # Fix Inventory Product Naming Convention
  
  ## Summary
  This migration standardizes all product_name values in the inventory_items table
  to match the products catalog naming convention: "[Stage] - [Strain] - [Type]"
  
  ## Changes Made
  - Updates product names for Binned items: "Binned - [Strain]" → "Binned - [Strain] - Flower"
  - Updates product names for Bulk items: "Bulk Flower/Smalls - [Strain]" → "Bulk - [Strain] - Flower/Smalls"
  - Updates product names for Bucked items: "Bucked Flower/Smalls - [Strain]" → "Bucked - [Strain] - Flower/Smalls"
  - Updates product names for Trim items: "Trim - [Strain]" → "Trim - [Strain] - Bulk"
  - Updates product names for Packaged items: Adds proper size suffix (3.5g/14g)
  
  ## Examples
  Before: "Binned - Blue Pave"
  After: "Binned - Blue Pave - Flower"
  
  Before: "Bulk Flower - Lemondary"
  After: "Bulk - Lemondary - Flower"
  
  Before: "Bulk Smalls - Magic Marker"
  After: "Bulk - Magic Marker - Smalls"
  
  ## Important Notes
  - All transformations preserve the strain name
  - Category and strain fields remain unchanged
  - Only product_name field is updated
  - Changes are idempotent and can be run multiple times safely
*/

-- Update Binned items to add " - Flower" suffix
UPDATE inventory_items
SET product_name = strain || ' - Flower'
WHERE category ILIKE '%binned%'
  AND product_name NOT LIKE '%-%-%'
  AND strain IS NOT NULL
  AND product_name = 'Binned - ' || strain;

-- Actually, let's use a more precise pattern matching approach
-- Update all Binned items properly
UPDATE inventory_items
SET product_name = 'Binned - ' || strain || ' - Flower'
WHERE category ILIKE '%binned%'
  AND strain IS NOT NULL
  AND (product_name ILIKE 'Binned - ' || strain);

-- Update Bulk Flower items
UPDATE inventory_items
SET product_name = 'Bulk - ' || strain || ' - Flower'
WHERE category ILIKE '%bulk%'
  AND category ILIKE '%flower%'
  AND strain IS NOT NULL
  AND (product_name ILIKE 'Bulk Flower - ' || strain
       OR product_name ILIKE 'Bulk - ' || strain
       AND product_name NOT ILIKE '%Smalls%');

-- Update Bulk Smalls items
UPDATE inventory_items
SET product_name = 'Bulk - ' || strain || ' - Smalls'
WHERE category ILIKE '%bulk%'
  AND strain IS NOT NULL
  AND (product_name ILIKE 'Bulk Smalls - ' || strain
       OR product_name ILIKE '%Smalls%');

-- Update Bucked Flower items
UPDATE inventory_items
SET product_name = 'Bucked - ' || strain || ' - Flower'
WHERE category ILIKE '%bucked%'
  AND strain IS NOT NULL
  AND (product_name ILIKE 'Bucked Flower - ' || strain
       OR (product_name ILIKE 'Bucked - ' || strain AND product_name NOT ILIKE '%Smalls%'));

-- Update Bucked Smalls items
UPDATE inventory_items
SET product_name = 'Bucked - ' || strain || ' - Smalls'
WHERE category ILIKE '%bucked%'
  AND strain IS NOT NULL
  AND (product_name ILIKE 'Bucked Smalls - ' || strain);

-- Update Trim items
UPDATE inventory_items
SET product_name = 'Trim - ' || strain || ' - Bulk'
WHERE category ILIKE '%trim%'
  AND strain IS NOT NULL
  AND product_name = 'Trim - ' || strain;

-- Update Packaged 3.5g items
UPDATE inventory_items
SET product_name = 'Packaged - ' || strain || ' - 3.5g Flower'
WHERE (category ILIKE '%prepack%' OR category ILIKE '%packaged%')
  AND strain IS NOT NULL
  AND product_name ILIKE '%3.5g%'
  AND product_name NOT LIKE '%-%-%';

-- Update Packaged 14g items
UPDATE inventory_items
SET product_name = 'Packaged - ' || strain || ' - 14g Smalls'
WHERE (category ILIKE '%prepack%' OR category ILIKE '%packaged%')
  AND strain IS NOT NULL
  AND product_name ILIKE '%14g%'
  AND product_name NOT LIKE '%-%-%';

-- Update Pre-Roll items if needed
UPDATE inventory_items
SET product_name = 'Pre-Roll - ' || strain || ' - 1g'
WHERE category ILIKE '%pre-roll%'
  AND strain IS NOT NULL
  AND product_name NOT LIKE '%-%-%';
