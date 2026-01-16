/*
  # Seed Product Catalog Master Data

  1. Seed Strains
    - Import all 42 strains from master list with abbreviations, dominance types, and genetics
  
  2. Seed Product Stages
    - Bulk (allows fractional, priced by lb)
    - Binned (inventory tracking stage)
    - Bucked (inventory tracking stage)
    - Packaged (unit-based, whole numbers only)

  3. Seed Product Types
    - Flower (applicable to all stages)
    - Smalls (applicable to all stages)
    - Trim (applicable to all stages)
    - 3.5g Flower (packaged only)
    - 14g Flower (packaged only)
    - 28g Flower (packaged only)
    - 14g Smalls (packaged only)
    - 1g Preroll (packaged only)
    - 3-pack Preroll (packaged only)
    - Preroll (bulk/binned/bucked only)
*/

-- Insert strains from master list
INSERT INTO strains (name, abbreviation, dominance_type, genetics_description) VALUES
  ('Acid Dawg', 'ACD', 'Hybrid', 'Stardawg x Sour Diesel bx3'),
  ('Animal Tsunami', 'ASU', 'Indica-Hybrid', 'Animal Cookies x Caramel Tsunami'),
  ('Bananaconda', 'BAN', 'Sativa-Hybrid', 'Snake Cake x Dual OG #4'),
  ('Blue Pave', 'BLP', 'Hybrid', 'Azul Runtz x Pave'),
  ('Bonnfire', 'BON', 'Indica-Hybrid', 'Blockberry x Super Sherb'),
  ('Capulator Junky', 'CAP', 'Hybrid', 'Kush Mints #11 x Alien Cookies'),
  ('Cementer Pops', 'CEP', 'Hybrid', 'Sunset Sherbet x Cement Shoes'),
  ('Chembanger', 'CHB', 'Hybrid', 'Blockberry x Super Sherb'),
  ('Chemlatto', 'CHL', 'Hybrid', 'Gelato 33 x 707 ChemDog'),
  ('Cherry Paloma', 'CHP', 'Sativa-Hybrid', 'Tropicana Cookies x Georgia Pie'),
  ('Dog Walker', 'DOG', 'Indica-Hybrid', 'Albert Walker OG x Chemdawg 91'),
  ('Donny Burger', 'DON', 'Indica', 'GMO x Han Solo Burger'),
  ('Flavor Flav', 'FLF', 'Indica-Hybrid', 'Sticky Ricky x LIT OG'),
  ('Fugazi Funk', 'FGF', 'Indica-Hybrid', 'LA Kush Cake x White Truffle'),
  ('Gas Face', 'GAS', 'Indica-Hybrid', '(Face Off OG x Kush Mints) x (Biscotti x Sherb BX)'),
  ('Georgia Apple Pie', 'GAP', 'Hybrid', 'Apple Fritter x Georgia Pie'),
  ('Highlighter', 'HLR', 'Hybrid', 'Bubble Bath x Permanent Marker'),
  ('Lemondary', 'LMD', 'Indica-Hybrid', 'Lemon Pepper x Zonuts'),
  ('Magic Marker', 'MGM', 'Indica', 'Permanent Marker x RS-11'),
  ('Orange Sherb', 'ORS', 'Indica-Hybrid', '(Orange Push Pops x Wedding Cake) x Super Sherb'),
  ('Peanut Butter Breath', 'PPB', 'Hybrid', 'Dosidos x Mendo Breath'),
  ('Pie Scream', 'PIS', 'Indica-Hybrid', 'Wedding Pie x (Gelato 33 x Cherry Limeade F5)'),
  ('Rainbow Inferno', 'RBI', 'Indica-Hybrid', 'Dante''s Inferno x RS-11'),
  ('Smackles', 'SMA', 'Indica-Hybrid', 'Gorilla Glue #4 x Rozay.'),
  ('Sour Diesel', 'SOD', 'Sativa', 'Chemdawg x Super Skunk'),
  ('Stay Puft', 'STP', 'Indica-Hybrid', 'Marshmallow OG x Grape Gas'),
  ('Super Silver Marker', 'SSM', 'Hybrid', 'Super Silver Haze x Magic Marker (?)'),
  ('Swamp Water Fumez', 'SWF', 'Indica-Hybrid', 'OGKB 2.1 x Candy Fumez'),
  ('Tahoe Larry', 'THL', 'Indica-Hybrid', 'OG x Larry OG'),
  ('Trillionz', 'TIZ', 'Indica-Hybrid', 'Triangle Kush S1 x Jokerz #31'),
  ('Valley Dog', 'VLD', 'Indica-Hybrid', 'SFV x Chemdawg 91'),
  ('Violet Fog', 'VIO', 'Indica-Hybrid', 'Grape Gasoline x Kalifa Mints'),
  ('White Burgundy', 'WHB', 'Hybrid', '(Daily Grape #9 x White Truffle) x (Daily Grape #9 x White Truffle) S1'),
  ('White Devil', 'WTD', 'Sativa-Hybrid', 'Jack Herer x Blueberry'),
  ('Z Chem', 'ZCH', 'Sativa-Hybrid', 'Sundae Driver x Zkittlez x Chemdawg'),
  ('Z Marker', 'ZMK', 'Indica-Hybrid', 'Permanent Marker x Zkittlez'),
  ('Zoda Pop', 'ZOP', 'Indica-Hybrid', 'Be ''91 x Zoda'),
  ('Purple Ice Water', 'PIW', 'Sativa-Hybrid', 'Ice Cream Cake #5 x Grape Cream Cake'),
  ('Black Maple', 'BLM', 'Indica-Hybrid', 'Dulce de Uva x Sherbanger'),
  ('Early Riser', 'EAR', 'Sativa-Hybrid', 'Sumo Grande x Early Orange'),
  ('Strawguava', 'SGA', NULL, NULL)
ON CONFLICT (name) DO NOTHING;

-- Insert product stages
INSERT INTO product_stages (name, sort_order, default_pricing_unit, allows_fractional_quantity, description) VALUES
  ('Bulk', 1, 'lb', true, 'Raw bulk material sold by weight'),
  ('Binned', 2, 'lb', true, 'Material separated into bins for processing'),
  ('Bucked', 3, 'lb', true, 'Material that has been bucked and ready for trimming'),
  ('Packaged', 4, 'unit', false, 'Finished packaged products sold by unit')
ON CONFLICT (name) DO NOTHING;

-- Insert product types
INSERT INTO product_types (name, base_weight, base_unit, sort_order, applicable_stages, description) VALUES
  ('Flower', NULL, 'lb', 1, ARRAY['Bulk', 'Binned', 'Bucked'], 'Whole flower material'),
  ('Smalls', NULL, 'lb', 2, ARRAY['Bulk', 'Binned', 'Bucked'], 'Small bud material'),
  ('Trim', NULL, 'lb', 3, ARRAY['Bulk', 'Binned', 'Bucked'], 'Trim material'),
  ('3.5g Flower', 3.5, 'g', 10, ARRAY['Packaged'], 'Packaged 3.5 gram flower'),
  ('14g Flower', 14, 'g', 11, ARRAY['Packaged'], 'Packaged 14 gram (half ounce) flower'),
  ('28g Flower', 28, 'g', 12, ARRAY['Packaged'], 'Packaged 28 gram (ounce) flower'),
  ('14g Smalls', 14, 'g', 13, ARRAY['Packaged'], 'Packaged 14 gram smalls'),
  ('1g Preroll', 1, 'g', 20, ARRAY['Packaged'], 'Single 1 gram preroll'),
  ('3-pack Preroll', 3, 'g', 21, ARRAY['Packaged'], '3-pack of 1 gram prerolls'),
  ('Preroll', NULL, 'unit', 22, ARRAY['Bulk', 'Binned', 'Bucked'], 'Bulk preroll material')
ON CONFLICT (name) DO NOTHING;
