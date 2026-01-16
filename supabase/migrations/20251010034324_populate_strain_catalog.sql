/*
  # Populate Strain Catalog

  ## Overview
  This migration populates the products table with the actual strain catalog including:
  - 41 unique cannabis strains with detailed genetics information
  - 3 SKU types per strain: Pre-rolls (1g), Flower (3.5g), Smalls (14g)
  - Total of 123 product SKUs

  ## Changes
  1. Clear existing sample products
  2. Insert all strains with their metadata (type, genetics, abbreviation)
  3. Create product SKUs for each strain in all available formats
  4. Set appropriate pricing and time estimates

  ## Pricing Structure
  - Pre-rolls (1g): $12-15 per unit
  - Flower (3.5g): $35-45 per eighth
  - Smalls (14g): $100-120 per half ounce

  ## Notes
  - All products start with 100 units available quantity
  - Trim and packaging times are estimates based on product type
  - Prices can be adjusted per strain quality tier in future updates
*/

-- Clear existing sample products
DELETE FROM products;

-- Insert all strains with Pre-roll SKUs (1g)
INSERT INTO products (name, type, strain, unit, available_quantity, price_per_unit, trim_time_minutes, packaging_time_minutes, notes) VALUES
('Prerolls - Acid Dawg - 1g', 'pre-roll', 'Acid Dawg', 'unit', 100, 12, 10, 5, 'Hybrid - Stardawg x Sour Diesel bx3'),
('Prerolls - Animal Tsunami - 1g', 'pre-roll', 'Animal Tsunami', 'unit', 100, 12, 10, 5, 'Indica-Hybrid - Animal Cookies x Caramel Tsunami'),
('Prerolls - Bananaconda - 1g', 'pre-roll', 'Bananaconda', 'unit', 100, 12, 10, 5, 'Sativa-Hybrid - Snake Cake x Dual OG #4'),
('Prerolls - Blue Pave - 1g', 'pre-roll', 'Blue Pave', 'unit', 100, 12, 10, 5, 'Hybrid - Azul Runtz x Pave'),
('Prerolls - Bonnfire - 1g', 'pre-roll', 'Bonnfire', 'unit', 100, 12, 10, 5, 'Indica-Hybrid - Blockberry x Super Sherb'),
('Prerolls - Capulator Junky - 1g', 'pre-roll', 'Capulator Junky', 'unit', 100, 13, 10, 5, 'Hybrid - Kush Mints #11 x Alien Cookies'),
('Prerolls - Cementer Pops - 1g', 'pre-roll', 'Cementer Pops', 'unit', 100, 12, 10, 5, 'Hybrid - Sunset Sherbet x Cement Shoes'),
('Prerolls - Chembanger - 1g', 'pre-roll', 'Chembanger', 'unit', 100, 12, 10, 5, 'Hybrid - Blockberry x Super Sherb'),
('Prerolls - Chemlatto - 1g', 'pre-roll', 'Chemlatto', 'unit', 100, 13, 10, 5, 'Hybrid - Gelato 33 x 707 ChemDog'),
('Prerolls - Cherry Paloma - 1g', 'pre-roll', 'Cherry Paloma', 'unit', 100, 13, 10, 5, 'Sativa-Hybrid - Tropicana Cookies x Georgia Pie'),
('Prerolls - Dog Walker - 1g', 'pre-roll', 'Dog Walker', 'unit', 100, 12, 10, 5, 'Indica-Hybrid - Albert Walker OG x Chemdawg 91'),
('Prerolls - Donny Burger - 1g', 'pre-roll', 'Donny Burger', 'unit', 100, 13, 10, 5, 'Indica - GMO x Han Solo Burger'),
('Prerolls - Flavor Flav - 1g', 'pre-roll', 'Flavor Flav', 'unit', 100, 12, 10, 5, 'Indica-Hybrid - Sticky Ricky x LIT OG'),
('Prerolls - Fugazi Funk - 1g', 'pre-roll', 'Fugazi Funk', 'unit', 100, 13, 10, 5, 'Indica-Hybrid - LA Kush Cake x White Truffle'),
('Prerolls - Gas Face - 1g', 'pre-roll', 'Gas Face', 'unit', 100, 13, 10, 5, 'Indica-Hybrid - (Face Off OG x Kush Mints) x (Biscotti x Sherb BX)'),
('Prerolls - Georgia Apple Pie - 1g', 'pre-roll', 'Georgia Apple Pie', 'unit', 100, 13, 10, 5, 'Hybrid - Apple Fritter x Georgia Pie'),
('Prerolls - Highlighter - 1g', 'pre-roll', 'Highlighter', 'unit', 100, 13, 10, 5, 'Hybrid - Bubble Bath x Permanent Marker'),
('Prerolls - Lemondary - 1g', 'pre-roll', 'Lemondary', 'unit', 100, 12, 10, 5, 'Indica-Hybrid - Lemon Pepper x Zonuts'),
('Prerolls - Magic Marker - 1g', 'pre-roll', 'Magic Marker', 'unit', 100, 13, 10, 5, 'Indica - Permanent Marker x RS-11'),
('Prerolls - Orange Sherb - 1g', 'pre-roll', 'Orange Sherb', 'unit', 100, 12, 10, 5, 'Indica-Hybrid - (Orange Push Pops x Wedding Cake) x Super Sherb'),
('Prerolls - Peanut Butter Breath - 1g', 'pre-roll', 'Peanut Butter Breath', 'unit', 100, 13, 10, 5, 'Hybrid - Dosidos x Mendo Breath'),
('Prerolls - Pie Scream - 1g', 'pre-roll', 'Pie Scream', 'unit', 100, 13, 10, 5, 'Indica-Hybrid - Wedding Pie x (Gelato 33 x Cherry Limeade F5)'),
('Prerolls - Rainbow Inferno - 1g', 'pre-roll', 'Rainbow Inferno', 'unit', 100, 13, 10, 5, 'Indica-Hybrid - Dantes Inferno x RS-11'),
('Prerolls - Smackles - 1g', 'pre-roll', 'Smackles', 'unit', 100, 12, 10, 5, 'Indica-Hybrid - Gorilla Glue #4 x Rozay'),
('Prerolls - Sour Diesel - 1g', 'pre-roll', 'Sour Diesel', 'unit', 100, 12, 10, 5, 'Sativa - Chemdawg x Super Skunk'),
('Prerolls - Stay Puft - 1g', 'pre-roll', 'Stay Puft', 'unit', 100, 13, 10, 5, 'Indica-Hybrid - Marshmallow OG x Grape Gas'),
('Prerolls - Super Silver Marker - 1g', 'pre-roll', 'Super Silver Marker', 'unit', 100, 13, 10, 5, 'Hybrid - Super Silver Haze x Magic Marker'),
('Prerolls - Swamp Water Fumez - 1g', 'pre-roll', 'Swamp Water Fumez', 'unit', 100, 13, 10, 5, 'Indica-Hybrid - OGKB 2.1 x Candy Fumez'),
('Prerolls - Tahoe Larry - 1g', 'pre-roll', 'Tahoe Larry', 'unit', 100, 12, 10, 5, 'Indica-Hybrid - OG x Larry OG'),
('Prerolls - Trillionz - 1g', 'pre-roll', 'Trillionz', 'unit', 100, 13, 10, 5, 'Indica-Hybrid - Triangle Kush S1 x Jokerz #31'),
('Prerolls - Valley Dog - 1g', 'pre-roll', 'Valley Dog', 'unit', 100, 12, 10, 5, 'Indica-Hybrid - SFV x Chemdawg 91'),
('Prerolls - Violet Fog - 1g', 'pre-roll', 'Violet Fog', 'unit', 100, 13, 10, 5, 'Indica-Hybrid - Grape Gasoline x Kalifa Mints'),
('Prerolls - White Burgundy - 1g', 'pre-roll', 'White Burgundy', 'unit', 100, 13, 10, 5, 'Hybrid - (Daily Grape #9 x White Truffle) x (Daily Grape #9 x White Truffle) S1'),
('Prerolls - White Devil - 1g', 'pre-roll', 'White Devil', 'unit', 100, 12, 10, 5, 'Sativa-Hybrid - Jack Herer x Blueberry'),
('Prerolls - Z Chem - 1g', 'pre-roll', 'Z Chem', 'unit', 100, 13, 10, 5, 'Sativa-Hybrid - Sundae Driver x Zkittlez x Chemdawg'),
('Prerolls - Z Marker - 1g', 'pre-roll', 'Z Marker', 'unit', 100, 13, 10, 5, 'Indica-Hybrid - Permanent Marker x Zkittlez'),
('Prerolls - Zoda Pop - 1g', 'pre-roll', 'Zoda Pop', 'unit', 100, 13, 10, 5, 'Indica-Hybrid - Be 91 x Zoda'),
('Prerolls - Purple Ice Water - 1g', 'pre-roll', 'Purple Ice Water', 'unit', 100, 13, 10, 5, 'Sativa-Hybrid - Ice Cream Cake #5 x Grape Cream Cake'),
('Prerolls - Black Maple - 1g', 'pre-roll', 'Black Maple', 'unit', 100, 13, 10, 5, 'Indica-Hybrid - Dulce de Uva x Sherbanger'),
('Prerolls - Early Riser - 1g', 'pre-roll', 'Early Riser', 'unit', 100, 12, 10, 5, 'Sativa-Hybrid - Sumo Grande x Early Orange'),
('Prerolls - Strawguava - 1g', 'pre-roll', 'Strawguava', 'unit', 100, 12, 10, 5, 'Hybrid strain');

-- Insert Packaged Flower SKUs (3.5g)
INSERT INTO products (name, type, strain, unit, available_quantity, price_per_unit, trim_time_minutes, packaging_time_minutes, notes) VALUES
('Packaged - Acid Dawg - 3.5g Flower', 'flower', 'Acid Dawg', 'eighth', 100, 38, 45, 20, 'Hybrid - Stardawg x Sour Diesel bx3'),
('Packaged - Animal Tsunami - 3.5g Flower', 'flower', 'Animal Tsunami', 'eighth', 100, 38, 45, 20, 'Indica-Hybrid - Animal Cookies x Caramel Tsunami'),
('Packaged - Bananaconda - 3.5g Flower', 'flower', 'Bananaconda', 'eighth', 100, 38, 45, 20, 'Sativa-Hybrid - Snake Cake x Dual OG #4'),
('Packaged - Blue Pave - 3.5g Flower', 'flower', 'Blue Pave', 'eighth', 100, 40, 45, 20, 'Hybrid - Azul Runtz x Pave'),
('Packaged - Bonnfire - 3.5g Flower', 'flower', 'Bonnfire', 'eighth', 100, 38, 45, 20, 'Indica-Hybrid - Blockberry x Super Sherb'),
('Packaged - Capulator Junky - 3.5g Flower', 'flower', 'Capulator Junky', 'eighth', 100, 42, 45, 20, 'Hybrid - Kush Mints #11 x Alien Cookies'),
('Packaged - Cementer Pops - 3.5g Flower', 'flower', 'Cementer Pops', 'eighth', 100, 38, 45, 20, 'Hybrid - Sunset Sherbet x Cement Shoes'),
('Packaged - Chembanger - 3.5g Flower', 'flower', 'Chembanger', 'eighth', 100, 38, 45, 20, 'Hybrid - Blockberry x Super Sherb'),
('Packaged - Chemlatto - 3.5g Flower', 'flower', 'Chemlatto', 'eighth', 100, 42, 45, 20, 'Hybrid - Gelato 33 x 707 ChemDog'),
('Packaged - Cherry Paloma - 3.5g Flower', 'flower', 'Cherry Paloma', 'eighth', 100, 40, 45, 20, 'Sativa-Hybrid - Tropicana Cookies x Georgia Pie'),
('Packaged - Dog Walker - 3.5g Flower', 'flower', 'Dog Walker', 'eighth', 100, 38, 45, 20, 'Indica-Hybrid - Albert Walker OG x Chemdawg 91'),
('Packaged - Donny Burger - 3.5g Flower', 'flower', 'Donny Burger', 'eighth', 100, 42, 45, 20, 'Indica - GMO x Han Solo Burger'),
('Packaged - Flavor Flav - 3.5g Flower', 'flower', 'Flavor Flav', 'eighth', 100, 38, 45, 20, 'Indica-Hybrid - Sticky Ricky x LIT OG'),
('Packaged - Fugazi Funk - 3.5g Flower', 'flower', 'Fugazi Funk', 'eighth', 100, 42, 45, 20, 'Indica-Hybrid - LA Kush Cake x White Truffle'),
('Packaged - Gas Face - 3.5g Flower', 'flower', 'Gas Face', 'eighth', 100, 42, 45, 20, 'Indica-Hybrid - (Face Off OG x Kush Mints) x (Biscotti x Sherb BX)'),
('Packaged - Georgia Apple Pie - 3.5g Flower', 'flower', 'Georgia Apple Pie', 'eighth', 100, 42, 45, 20, 'Hybrid - Apple Fritter x Georgia Pie'),
('Packaged - Highlighter - 3.5g Flower', 'flower', 'Highlighter', 'eighth', 100, 42, 45, 20, 'Hybrid - Bubble Bath x Permanent Marker'),
('Packaged - Lemondary - 3.5g Flower', 'flower', 'Lemondary', 'eighth', 100, 38, 45, 20, 'Indica-Hybrid - Lemon Pepper x Zonuts'),
('Packaged - Magic Marker - 3.5g Flower', 'flower', 'Magic Marker', 'eighth', 100, 45, 45, 20, 'Indica - Permanent Marker x RS-11'),
('Packaged - Orange Sherb - 3.5g Flower', 'flower', 'Orange Sherb', 'eighth', 100, 38, 45, 20, 'Indica-Hybrid - (Orange Push Pops x Wedding Cake) x Super Sherb'),
('Packaged - Peanut Butter Breath - 3.5g Flower', 'flower', 'Peanut Butter Breath', 'eighth', 100, 42, 45, 20, 'Hybrid - Dosidos x Mendo Breath'),
('Packaged - Pie Scream - 3.5g Flower', 'flower', 'Pie Scream', 'eighth', 100, 40, 45, 20, 'Indica-Hybrid - Wedding Pie x (Gelato 33 x Cherry Limeade F5)'),
('Packaged - Rainbow Inferno - 3.5g Flower', 'flower', 'Rainbow Inferno', 'eighth', 100, 42, 45, 20, 'Indica-Hybrid - Dantes Inferno x RS-11'),
('Packaged - Smackles - 3.5g Flower', 'flower', 'Smackles', 'eighth', 100, 38, 45, 20, 'Indica-Hybrid - Gorilla Glue #4 x Rozay'),
('Packaged - Sour Diesel - 3.5g Flower', 'flower', 'Sour Diesel', 'eighth', 100, 38, 45, 20, 'Sativa - Chemdawg x Super Skunk'),
('Packaged - Stay Puft - 3.5g Flower', 'flower', 'Stay Puft', 'eighth', 100, 40, 45, 20, 'Indica-Hybrid - Marshmallow OG x Grape Gas'),
('Packaged - Super Silver Marker - 3.5g Flower', 'flower', 'Super Silver Marker', 'eighth', 100, 42, 45, 20, 'Hybrid - Super Silver Haze x Magic Marker'),
('Packaged - Swamp Water Fumez - 3.5g Flower', 'flower', 'Swamp Water Fumez', 'eighth', 100, 42, 45, 20, 'Indica-Hybrid - OGKB 2.1 x Candy Fumez'),
('Packaged - Tahoe Larry - 3.5g Flower', 'flower', 'Tahoe Larry', 'eighth', 100, 38, 45, 20, 'Indica-Hybrid - OG x Larry OG'),
('Packaged - Trillionz - 3.5g Flower', 'flower', 'Trillionz', 'eighth', 100, 42, 45, 20, 'Indica-Hybrid - Triangle Kush S1 x Jokerz #31'),
('Packaged - Valley Dog - 3.5g Flower', 'flower', 'Valley Dog', 'eighth', 100, 38, 45, 20, 'Indica-Hybrid - SFV x Chemdawg 91'),
('Packaged - Violet Fog - 3.5g Flower', 'flower', 'Violet Fog', 'eighth', 100, 42, 45, 20, 'Indica-Hybrid - Grape Gasoline x Kalifa Mints'),
('Packaged - White Burgundy - 3.5g Flower', 'flower', 'White Burgundy', 'eighth', 100, 42, 45, 20, 'Hybrid - (Daily Grape #9 x White Truffle) x (Daily Grape #9 x White Truffle) S1'),
('Packaged - White Devil - 3.5g Flower', 'flower', 'White Devil', 'eighth', 100, 38, 45, 20, 'Sativa-Hybrid - Jack Herer x Blueberry'),
('Packaged - Z Chem - 3.5g Flower', 'flower', 'Z Chem', 'eighth', 100, 40, 45, 20, 'Sativa-Hybrid - Sundae Driver x Zkittlez x Chemdawg'),
('Packaged - Z Marker - 3.5g Flower', 'flower', 'Z Marker', 'eighth', 100, 42, 45, 20, 'Indica-Hybrid - Permanent Marker x Zkittlez'),
('Packaged - Zoda Pop - 3.5g Flower', 'flower', 'Zoda Pop', 'eighth', 100, 40, 45, 20, 'Indica-Hybrid - Be 91 x Zoda'),
('Packaged - Purple Ice Water - 3.5g Flower', 'flower', 'Purple Ice Water', 'eighth', 100, 42, 45, 20, 'Sativa-Hybrid - Ice Cream Cake #5 x Grape Cream Cake'),
('Packaged - Black Maple - 3.5g Flower', 'flower', 'Black Maple', 'eighth', 100, 42, 45, 20, 'Indica-Hybrid - Dulce de Uva x Sherbanger'),
('Packaged - Early Riser - 3.5g Flower', 'flower', 'Early Riser', 'eighth', 100, 38, 45, 20, 'Sativa-Hybrid - Sumo Grande x Early Orange'),
('Packaged - Strawguava - 3.5g Flower', 'flower', 'Strawguava', 'eighth', 100, 38, 45, 20, 'Hybrid strain');

-- Insert Packaged Smalls SKUs (14g)
INSERT INTO products (name, type, strain, unit, available_quantity, price_per_unit, trim_time_minutes, packaging_time_minutes, notes) VALUES
('Packaged - Acid Dawg - 14g Smalls', 'smalls', 'Acid Dawg', 'half-oz', 100, 105, 30, 15, 'Hybrid - Stardawg x Sour Diesel bx3'),
('Packaged - Animal Tsunami - 14g Smalls', 'smalls', 'Animal Tsunami', 'half-oz', 100, 105, 30, 15, 'Indica-Hybrid - Animal Cookies x Caramel Tsunami'),
('Packaged - Bananaconda - 14g Smalls', 'smalls', 'Bananaconda', 'half-oz', 100, 105, 30, 15, 'Sativa-Hybrid - Snake Cake x Dual OG #4'),
('Packaged - Blue Pave - 14g Smalls', 'smalls', 'Blue Pave', 'half-oz', 100, 110, 30, 15, 'Hybrid - Azul Runtz x Pave'),
('Packaged - Bonnfire - 14g Smalls', 'smalls', 'Bonnfire', 'half-oz', 100, 105, 30, 15, 'Indica-Hybrid - Blockberry x Super Sherb'),
('Packaged - Capulator Junky - 14g Smalls', 'smalls', 'Capulator Junky', 'half-oz', 100, 115, 30, 15, 'Hybrid - Kush Mints #11 x Alien Cookies'),
('Packaged - Cementer Pops - 14g Smalls', 'smalls', 'Cementer Pops', 'half-oz', 100, 105, 30, 15, 'Hybrid - Sunset Sherbet x Cement Shoes'),
('Packaged - Chembanger - 14g Smalls', 'smalls', 'Chembanger', 'half-oz', 100, 105, 30, 15, 'Hybrid - Blockberry x Super Sherb'),
('Packaged - Chemlatto - 14g Smalls', 'smalls', 'Chemlatto', 'half-oz', 100, 115, 30, 15, 'Hybrid - Gelato 33 x 707 ChemDog'),
('Packaged - Cherry Paloma - 14g Smalls', 'smalls', 'Cherry Paloma', 'half-oz', 100, 110, 30, 15, 'Sativa-Hybrid - Tropicana Cookies x Georgia Pie'),
('Packaged - Dog Walker - 14g Smalls', 'smalls', 'Dog Walker', 'half-oz', 100, 105, 30, 15, 'Indica-Hybrid - Albert Walker OG x Chemdawg 91'),
('Packaged - Donny Burger - 14g Smalls', 'smalls', 'Donny Burger', 'half-oz', 100, 115, 30, 15, 'Indica - GMO x Han Solo Burger'),
('Packaged - Flavor Flav - 14g Smalls', 'smalls', 'Flavor Flav', 'half-oz', 100, 105, 30, 15, 'Indica-Hybrid - Sticky Ricky x LIT OG'),
('Packaged - Fugazi Funk - 14g Smalls', 'smalls', 'Fugazi Funk', 'half-oz', 100, 115, 30, 15, 'Indica-Hybrid - LA Kush Cake x White Truffle'),
('Packaged - Gas Face - 14g Smalls', 'smalls', 'Gas Face', 'half-oz', 100, 115, 30, 15, 'Indica-Hybrid - (Face Off OG x Kush Mints) x (Biscotti x Sherb BX)'),
('Packaged - Georgia Apple Pie - 14g Smalls', 'smalls', 'Georgia Apple Pie', 'half-oz', 100, 115, 30, 15, 'Hybrid - Apple Fritter x Georgia Pie'),
('Packaged - Highlighter - 14g Smalls', 'smalls', 'Highlighter', 'half-oz', 100, 115, 30, 15, 'Hybrid - Bubble Bath x Permanent Marker'),
('Packaged - Lemondary - 14g Smalls', 'smalls', 'Lemondary', 'half-oz', 100, 105, 30, 15, 'Indica-Hybrid - Lemon Pepper x Zonuts'),
('Packaged - Magic Marker - 14g Smalls', 'smalls', 'Magic Marker', 'half-oz', 100, 120, 30, 15, 'Indica - Permanent Marker x RS-11'),
('Packaged - Orange Sherb - 14g Smalls', 'smalls', 'Orange Sherb', 'half-oz', 100, 105, 30, 15, 'Indica-Hybrid - (Orange Push Pops x Wedding Cake) x Super Sherb'),
('Packaged - Peanut Butter Breath - 14g Smalls', 'smalls', 'Peanut Butter Breath', 'half-oz', 100, 115, 30, 15, 'Hybrid - Dosidos x Mendo Breath'),
('Packaged - Pie Scream - 14g Smalls', 'smalls', 'Pie Scream', 'half-oz', 100, 110, 30, 15, 'Indica-Hybrid - Wedding Pie x (Gelato 33 x Cherry Limeade F5)'),
('Packaged - Rainbow Inferno - 14g Smalls', 'smalls', 'Rainbow Inferno', 'half-oz', 100, 115, 30, 15, 'Indica-Hybrid - Dantes Inferno x RS-11'),
('Packaged - Smackles - 14g Smalls', 'smalls', 'Smackles', 'half-oz', 100, 105, 30, 15, 'Indica-Hybrid - Gorilla Glue #4 x Rozay'),
('Packaged - Sour Diesel - 14g Smalls', 'smalls', 'Sour Diesel', 'half-oz', 100, 105, 30, 15, 'Sativa - Chemdawg x Super Skunk'),
('Packaged - Stay Puft - 14g Smalls', 'smalls', 'Stay Puft', 'half-oz', 100, 110, 30, 15, 'Indica-Hybrid - Marshmallow OG x Grape Gas'),
('Packaged - Super Silver Marker - 14g Smalls', 'smalls', 'Super Silver Marker', 'half-oz', 100, 115, 30, 15, 'Hybrid - Super Silver Haze x Magic Marker'),
('Packaged - Swamp Water Fumez - 14g Smalls', 'smalls', 'Swamp Water Fumez', 'half-oz', 100, 115, 30, 15, 'Indica-Hybrid - OGKB 2.1 x Candy Fumez'),
('Packaged - Tahoe Larry - 14g Smalls', 'smalls', 'Tahoe Larry', 'half-oz', 100, 105, 30, 15, 'Indica-Hybrid - OG x Larry OG'),
('Packaged - Trillionz - 14g Smalls', 'smalls', 'Trillionz', 'half-oz', 100, 115, 30, 15, 'Indica-Hybrid - Triangle Kush S1 x Jokerz #31'),
('Packaged - Valley Dog - 14g Smalls', 'smalls', 'Valley Dog', 'half-oz', 100, 105, 30, 15, 'Indica-Hybrid - SFV x Chemdawg 91'),
('Packaged - Violet Fog - 14g Smalls', 'smalls', 'Violet Fog', 'half-oz', 100, 115, 30, 15, 'Indica-Hybrid - Grape Gasoline x Kalifa Mints'),
('Packaged - White Burgundy - 14g Smalls', 'smalls', 'White Burgundy', 'half-oz', 100, 115, 30, 15, 'Hybrid - (Daily Grape #9 x White Truffle) x (Daily Grape #9 x White Truffle) S1'),
('Packaged - White Devil - 14g Smalls', 'smalls', 'White Devil', 'half-oz', 100, 105, 30, 15, 'Sativa-Hybrid - Jack Herer x Blueberry'),
('Packaged - Z Chem - 14g Smalls', 'smalls', 'Z Chem', 'half-oz', 100, 110, 30, 15, 'Sativa-Hybrid - Sundae Driver x Zkittlez x Chemdawg'),
('Packaged - Z Marker - 14g Smalls', 'smalls', 'Z Marker', 'half-oz', 100, 115, 30, 15, 'Indica-Hybrid - Permanent Marker x Zkittlez'),
('Packaged - Zoda Pop - 14g Smalls', 'smalls', 'Zoda Pop', 'half-oz', 100, 110, 30, 15, 'Indica-Hybrid - Be 91 x Zoda'),
('Packaged - Purple Ice Water - 14g Smalls', 'smalls', 'Purple Ice Water', 'half-oz', 100, 115, 30, 15, 'Sativa-Hybrid - Ice Cream Cake #5 x Grape Cream Cake'),
('Packaged - Black Maple - 14g Smalls', 'smalls', 'Black Maple', 'half-oz', 100, 115, 30, 15, 'Indica-Hybrid - Dulce de Uva x Sherbanger'),
('Packaged - Early Riser - 14g Smalls', 'smalls', 'Early Riser', 'half-oz', 100, 105, 30, 15, 'Sativa-Hybrid - Sumo Grande x Early Orange'),
('Packaged - Strawguava - 14g Smalls', 'smalls', 'Strawguava', 'half-oz', 100, 105, 30, 15, 'Hybrid strain');