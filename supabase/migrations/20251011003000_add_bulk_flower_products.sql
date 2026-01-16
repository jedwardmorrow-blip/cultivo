/*
  # Add Bulk Flower Products

  1. New Products
    - Add bulk flower products (1lb packages) for various strains
    - Add fresh frozen products for specific strains
    - Each product includes SKU for inventory tracking

  2. Products Added
    - Bulk Flower (SKU-0001 pattern): Georgia Apple Pie, White Burgundy, Cap Junky, Gas Face, Cherry Paloma, Z Marker, Lemondary, Magic Marker, Peanut Butter Breath, Chembanger, Rainbow Inferno, Blue Pave, Fugazi Funk, Sour Diesel, Tahoe Larry, Cherry Zoda, Devil Driver, Z Chem
    - Fresh Frozen (SKU-0008/0009 pattern): Z Marker, Donny Burger, Z Chem, Lemondary
*/

-- Insert bulk flower products
INSERT INTO products (name, type, unit, sku, category) VALUES
  ('Bulk - Georgia Apple Pie - Flower', 'flower', 'g', 'GAP-0001', 'flower'),
  ('Bulk - White Burgundy - Flower', 'flower', 'g', 'WHB-0001', 'flower'),
  ('Bulk - Cap Junky - Flower', 'flower', 'g', 'CAP-0002', 'flower'),
  ('Bulk - Gas Face - Flower', 'flower', 'g', 'GAS-0001', 'flower'),
  ('Bulk - Cherry Paloma - Flower', 'flower', 'g', 'CHP-0001', 'flower'),
  ('Bulk - Z Marker - Flower', 'flower', 'g', 'ZMK-0001', 'flower'),
  ('Bulk - Lemondary - Flower', 'flower', 'g', 'LMD-0001', 'flower'),
  ('Bulk - Magic Marker - Flower', 'flower', 'g', 'MGM-0001', 'flower'),
  ('Bulk - Peanut Butter Breath - Flower', 'flower', 'g', 'PPB-0001', 'flower'),
  ('Bulk - Chembanger - Flower', 'flower', 'g', 'CHB-0001', 'flower'),
  ('Bulk - Rainbow Inferno - Flower', 'flower', 'g', 'RBI-0001', 'flower'),
  ('Bulk - Blue Pave - Flower', 'flower', 'g', 'BLP-0001', 'flower'),
  ('Bulk - Fugazi Funk - Flower', 'flower', 'g', 'FGF-0001', 'flower'),
  ('Bulk - Sour Diesel - Flower', 'flower', 'g', 'SOD-0001', 'flower'),
  ('Bulk - Tahoe Larry - Flower', 'flower', 'g', 'THL-0001', 'flower'),
  ('Bulk - Cherry Zoda - Flower', 'flower', 'g', 'CZD-0001', 'flower'),
  ('Bulk - Devil Driver - Flower', 'flower', 'g', 'DD-0005', 'flower'),
  ('Bulk - Z Chem - Flower', 'flower', 'g', 'ZCH-0001', 'flower'),
  ('Bulk - Fugazi Funk - Flower (Alt)', 'flower', 'g', 'FGF-0006', 'flower')
ON CONFLICT (sku) DO NOTHING;

-- Insert fresh frozen products
INSERT INTO products (name, type, unit, sku, category) VALUES
  ('Bulk - Z Marker - Fresh Frozen', 'fresh_frozen', 'g', 'ZMK-0008', 'fresh_frozen'),
  ('Bulk - Donny Burger - Fresh Frozen', 'fresh_frozen', 'g', 'DON-0006', 'fresh_frozen'),
  ('Bulk - Z Chem - Fresh Frozen', 'fresh_frozen', 'g', 'ZCH-0008', 'fresh_frozen'),
  ('Bulk - Lemondary - Fresh Frozen', 'fresh_frozen', 'g', 'LMD-0009', 'fresh_frozen')
ON CONFLICT (sku) DO NOTHING;
