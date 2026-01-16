-- Add gross_weight column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS gross_weight numeric DEFAULT 0;

-- Update existing products with default gross weights
-- 3.5g jars = 54g
UPDATE products
SET gross_weight = 54
WHERE product_category = 'packaged'
  AND (name LIKE '%3.5g%' OR name LIKE '%3.5 g%');

-- 14g smalls = 22g
UPDATE products
SET gross_weight = 22
WHERE product_category = 'packaged'
  AND (name LIKE '%14g%' OR name LIKE '%14 g%')
  AND name LIKE '%Smalls%';

-- Bulk lbs = 468g
UPDATE products
SET gross_weight = 468
WHERE product_category = 'bulk';