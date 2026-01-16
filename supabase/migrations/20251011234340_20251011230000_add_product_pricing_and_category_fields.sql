/*
  # Add Product Pricing Unit and Category Fields

  1. Schema Changes
    - Add `pricing_unit` column to products table
      - Possible values: 'lb' (pound), 'g' (gram), 'unit' (count)
      - Determines how the product is priced
    - Add `product_category` column to products table
      - Possible values: 'bulk', 'packaged', 'preroll'
      - Categorizes products for filtering and business logic
    - Add `allows_fractional_quantity` column to products table
      - Boolean to allow fractional quantities (e.g., 0.5 lbs)
      - Typically true for bulk products, false for packaged/preroll

  2. Data Migration
    - Set initial values based on product naming patterns
    - Bulk products get: category='bulk', pricing_unit='lb', allows_fractional_quantity=true
    - Packaged products get: category='packaged', pricing_unit='unit', allows_fractional_quantity=false
    - Pre-roll products get: category='preroll', pricing_unit='unit', allows_fractional_quantity=false

  3. Notes
    - Pricing conversion (gram to pound) will be done separately via script
    - This migration only adds the structure, not the price adjustments
*/

-- Add new columns to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS pricing_unit TEXT DEFAULT 'g',
ADD COLUMN IF NOT EXISTS product_category TEXT DEFAULT 'packaged',
ADD COLUMN IF NOT EXISTS allows_fractional_quantity BOOLEAN DEFAULT false;

-- Categorize and set pricing units based on product naming patterns
UPDATE products
SET
  product_category = 'bulk',
  pricing_unit = 'lb',
  allows_fractional_quantity = true
WHERE name LIKE 'Bulk -%';

UPDATE products
SET
  product_category = 'packaged',
  pricing_unit = 'unit',
  allows_fractional_quantity = false
WHERE name LIKE 'Packaged -%';

UPDATE products
SET
  product_category = 'preroll',
  pricing_unit = 'unit',
  allows_fractional_quantity = false
WHERE name LIKE 'Pre-Roll -%';

-- Add check constraints for valid values
ALTER TABLE products
ADD CONSTRAINT products_pricing_unit_check
CHECK (pricing_unit IN ('lb', 'g', 'unit'));

ALTER TABLE products
ADD CONSTRAINT products_category_check
CHECK (product_category IN ('bulk', 'packaged', 'preroll'));

-- Create index for faster filtering by category
CREATE INDEX IF NOT EXISTS idx_products_category ON products(product_category);
CREATE INDEX IF NOT EXISTS idx_products_pricing_unit ON products(pricing_unit);
