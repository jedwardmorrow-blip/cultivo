-- Add net_weight column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS net_weight numeric DEFAULT 0;

-- Update existing products with default net weights based on product category
-- For packaged products, net weight is typically the weight stated in the name
-- 3.5g jars: net weight = 3.5g
UPDATE products
SET net_weight = 3.5
WHERE product_category = 'packaged'
  AND (name LIKE '%3.5g%' OR name LIKE '%3.5 g%')
  AND net_weight = 0;

-- 14g smalls: net weight = 14g
UPDATE products
SET net_weight = 14
WHERE product_category = 'packaged'
  AND (name LIKE '%14g%' OR name LIKE '%14 g%')
  AND name LIKE '%Smalls%'
  AND net_weight = 0;

-- Bulk lbs: net weight = 1 lb = 453.592g (we'll use 454g for simplicity)
UPDATE products
SET net_weight = 454
WHERE product_category = 'bulk'
  AND net_weight = 0;