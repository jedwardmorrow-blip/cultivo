/*
  # Add SKU Column to Products Table

  1. Changes
    - Add `sku` column to products table for tracking product SKUs
    - Add unique index on SKU column
    - Update existing products with SKU values from strain catalog

  2. Security
    - No changes to RLS policies
*/

-- Add SKU column to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'sku'
  ) THEN
    ALTER TABLE products ADD COLUMN sku text;
  END IF;
END $$;

-- Create unique index on SKU (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'products_sku_key'
  ) THEN
    CREATE UNIQUE INDEX products_sku_key ON products(sku) WHERE sku IS NOT NULL;
  END IF;
END $$;

-- Update products with SKU values based on name patterns
UPDATE products SET sku = 'GAS-0001' WHERE name LIKE 'Bulk - Gas Face%' AND type = 'flower' AND sku IS NULL;
UPDATE products SET sku = 'GAS-0003' WHERE name LIKE 'Packaged - Gas Face%' AND name LIKE '%3.5g%' AND sku IS NULL;
UPDATE products SET sku = 'GAS-0002' WHERE name LIKE 'Packaged - Gas Face%' AND name LIKE '%14g%' AND sku IS NULL;

UPDATE products SET sku = 'CHP-0001' WHERE name LIKE 'Bulk - Cherry Paloma%' AND type = 'flower' AND sku IS NULL;
UPDATE products SET sku = 'CHP-0003' WHERE name LIKE 'Packaged - Cherry Paloma%' AND name LIKE '%3.5g%' AND sku IS NULL;
UPDATE products SET sku = 'CHP-0002' WHERE name LIKE 'Packaged - Cherry Paloma%' AND name LIKE '%14g%' AND sku IS NULL;

UPDATE products SET sku = 'ZMK-0001' WHERE name LIKE 'Bulk - Z Marker%' AND type = 'flower' AND name NOT LIKE '%Smalls%' AND sku IS NULL;
UPDATE products SET sku = 'ZMK-0003' WHERE name LIKE 'Packaged - Z Marker%' AND name LIKE '%3.5g%' AND sku IS NULL;
UPDATE products SET sku = 'ZMK-0004' WHERE name LIKE 'Bulk - Z Marker%' AND name LIKE '%Smalls%' AND sku IS NULL;
UPDATE products SET sku = 'ZMK-0008' WHERE name LIKE 'Bulk - Z Marker%' AND name LIKE '%Fresh Frozen%' AND sku IS NULL;

UPDATE products SET sku = 'LMD-0001' WHERE name LIKE 'Bulk - Lemondary%' AND type = 'flower' AND name NOT LIKE '%Smalls%' AND sku IS NULL;
UPDATE products SET sku = 'LMD-0003' WHERE name LIKE 'Packaged - Lemondary%' AND name LIKE '%3.5g%' AND sku IS NULL;
UPDATE products SET sku = 'LMD-0002' WHERE name LIKE 'Bulk - Lemondary%' AND name LIKE '%Smalls%' AND sku IS NULL;
UPDATE products SET sku = 'LMD-0009' WHERE name LIKE 'Bulk - Lemondary%' AND name LIKE '%Fresh Frozen%' AND sku IS NULL;

UPDATE products SET sku = 'MGM-0001' WHERE name LIKE 'Bulk - Magic Marker%' AND type = 'flower' AND name NOT LIKE '%Smalls%' AND sku IS NULL;
UPDATE products SET sku = 'MGM-0002' WHERE name LIKE 'Packaged - Magic Marker%' AND name LIKE '%3.5g%' AND sku IS NULL;
UPDATE products SET sku = 'MGM-0005' WHERE name LIKE 'Bulk - Magic Marker%' AND name LIKE '%Smalls%' AND sku IS NULL;

UPDATE products SET sku = 'PPB-0001' WHERE name LIKE 'Bulk - Peanut Butter Breath%' AND type = 'flower' AND sku IS NULL;
UPDATE products SET sku = 'PPB-0003' WHERE name LIKE 'Packaged - Peanut Butter Breath%' AND name LIKE '%3.5g%' AND sku IS NULL;

UPDATE products SET sku = 'RBI-0001' WHERE name LIKE 'Bulk - Rainbow Inferno%' AND type = 'flower' AND sku IS NULL;
UPDATE products SET sku = 'RBI-0003' WHERE name LIKE 'Packaged - Rainbow Inferno%' AND name LIKE '%3.5g%' AND sku IS NULL;

UPDATE products SET sku = 'THL-0001' WHERE name LIKE 'Bulk - Tahoe Larry%' AND type = 'flower' AND name NOT LIKE '%Smalls%' AND sku IS NULL;
UPDATE products SET sku = 'THL-0003' WHERE name LIKE 'Packaged - Tahoe Larry%' AND name LIKE '%3.5g%' AND sku IS NULL;
UPDATE products SET sku = 'THL-0005' WHERE name LIKE 'Bulk - Tahoe Larry%' AND name LIKE '%Smalls%' AND sku IS NULL;

UPDATE products SET sku = 'GAP-0001' WHERE name LIKE 'Bulk - Georgia Apple Pie%' AND type = 'flower' AND sku IS NULL;
UPDATE products SET sku = 'GAP-0003' WHERE name LIKE 'Packaged - Georgia Apple Pie%' AND name LIKE '%3.5g%' AND sku IS NULL;

UPDATE products SET sku = 'WHB-0001' WHERE name LIKE 'Bulk - White Burgundy%' AND type = 'flower' AND sku IS NULL;

UPDATE products SET sku = 'CAP-0002' WHERE name LIKE 'Bulk - Cap Junky%' AND type = 'flower' AND sku IS NULL;

UPDATE products SET sku = 'DOG-0003' WHERE name LIKE 'Packaged - Dog Walker%' AND name LIKE '%3.5g%' AND sku IS NULL;

UPDATE products SET sku = 'CHL-0003' WHERE name LIKE 'Packaged - Chemlatto%' AND name LIKE '%3.5g%' AND sku IS NULL;
UPDATE products SET sku = 'CHL-0002' WHERE name LIKE 'Packaged - Chemlatto%' AND name LIKE '%14g%' AND sku IS NULL;

UPDATE products SET sku = 'ASU-0003' WHERE name LIKE 'Packaged - Animal Tsunami%' AND name LIKE '%3.5g%' AND sku IS NULL;
UPDATE products SET sku = 'ASU-0002' WHERE name LIKE 'Packaged - Animal Tsunami%' AND name LIKE '%14g%' AND sku IS NULL;

UPDATE products SET sku = 'SWF-0003' WHERE name LIKE 'Packaged - Swamp Water Fumez%' AND name LIKE '%3.5g%' AND sku IS NULL;

UPDATE products SET sku = 'CHB-0001' WHERE name LIKE 'Bulk - Chembanger%' AND type = 'flower' AND sku IS NULL;

UPDATE products SET sku = 'BLP-0001' WHERE name LIKE 'Bulk - Blue Pave%' AND type = 'flower' AND sku IS NULL;

UPDATE products SET sku = 'FGF-0001' WHERE name LIKE 'Bulk - Fugazi Funk%' AND type = 'flower' AND sku IS NULL;
UPDATE products SET sku = 'FGF-0006' WHERE name LIKE 'Bulk - Fugazi Funk%' AND name LIKE '%Bulk%' AND sku IS NULL;

UPDATE products SET sku = 'SOD-0001' WHERE name LIKE 'Bulk - Sour Diesel%' AND type = 'flower' AND sku IS NULL;

UPDATE products SET sku = 'CZD-0001' WHERE name LIKE 'Bulk - Cherry Zoda%' AND type = 'flower' AND sku IS NULL;

UPDATE products SET sku = 'DD-0005' WHERE name LIKE 'Bulk - Devil Driver%' AND type = 'flower' AND sku IS NULL;

UPDATE products SET sku = 'ZCH-0001' WHERE name LIKE 'Bulk - Z Chem%' AND type = 'flower' AND name NOT LIKE '%Fresh Frozen%' AND sku IS NULL;
UPDATE products SET sku = 'ZCH-0008' WHERE name LIKE 'Bulk - Z Chem%' AND name LIKE '%Fresh Frozen%' AND sku IS NULL;

UPDATE products SET sku = 'DON-0006' WHERE name LIKE 'Bulk - Donny Burger%' AND name LIKE '%Fresh Frozen%' AND sku IS NULL;

-- Pre-rolls
UPDATE products SET sku = '42792679' WHERE name LIKE 'Pre-Roll - Lemondary%' AND name LIKE '%1g%' AND sku IS NULL;
UPDATE products SET sku = '02945696' WHERE name LIKE 'Pre-Roll - Cherry Paloma%' AND name LIKE '%1g%' AND sku IS NULL;
UPDATE products SET sku = '40382185' WHERE name LIKE 'Pre-Roll - Z Marker%' AND name LIKE '%1g%' AND sku IS NULL;
UPDATE products SET sku = '59523373' WHERE name LIKE 'Pre-Roll - Tahoe Larry%' AND name LIKE '%1g%' AND sku IS NULL;
