/*
  # Backfill Null Fields on Inventory Items

  ## Summary
  Repairs missing data on existing inventory_items rows so that label generation
  and inventory UI filtering work correctly for all 96 items in the system.

  ## Changes
  1. **strain** (text) - Backfills 9 rows by looking up strain name from strains table via strain_id
  2. **batch** (text) - Backfills 42 rows by copying batch_number (they represent the same value)
  3. **category** - Backfills 9 rows by inferring from product_name using keyword matching
  4. **net_weight** - Backfills 96 rows by parsing gram weight from product_name (e.g. "3.5g" -> 3.5)

  ## Notes
  - All updates are additive (only fills NULLs, never overwrites existing data)
  - net_weight for bulk/binned items without a gram value in the name remains NULL (correct behavior)
  - No destructive operations
*/

-- Step 1: Backfill strain from strains table where strain_id exists
UPDATE inventory_items
SET strain = s.name
FROM strains s
WHERE inventory_items.strain_id = s.id
  AND inventory_items.strain IS NULL;

-- Step 2: Backfill batch from batch_number
UPDATE inventory_items
SET batch = batch_number
WHERE batch IS NULL
  AND batch_number IS NOT NULL;

-- Step 3: Backfill category from product_name
UPDATE inventory_items
SET category = CASE
  WHEN LOWER(product_name) LIKE '%binned%' THEN 'Binned'
  WHEN LOWER(product_name) LIKE '%bucked%' THEN 'Bucked'
  WHEN LOWER(product_name) LIKE '%packaged%' THEN 'Packaged'
  WHEN LOWER(product_name) LIKE '%1lb%' THEN 'Packaged'
  WHEN LOWER(product_name) LIKE '%454%' THEN 'Packaged'
  WHEN LOWER(product_name) LIKE '%bulk%' THEN 'Bulk'
  WHEN LOWER(product_name) LIKE '%trimmed%' THEN 'Bulk'
  ELSE 'Bulk'
END
WHERE category IS NULL
  AND product_name IS NOT NULL;

-- Step 4: Backfill net_weight by parsing gram value from product_name
-- Matches patterns like "3.5g", "14g", "454g" in product names
UPDATE inventory_items
SET net_weight = (substring(product_name from '(\d+\.?\d*)g'))::numeric
WHERE net_weight IS NULL
  AND product_name ~ '\d+\.?\d*g';
