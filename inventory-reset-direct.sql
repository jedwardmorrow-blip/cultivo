-- Full Inventory Reset with Auto-Created Batches
-- This script creates missing batches and resets inventory
--
-- ⚠️  WARNING: DO NOT DELETE OR TRUNCATE THE ORDERS OR ORDER_ITEMS TABLES
-- Historical sales data is preserved in these tables and must not be lost.
-- If you need to restore historical orders, run: scripts/import-orders.ts
--
-- This script only resets inventory data, NOT sales/order history.

BEGIN;

-- Step 1: Create missing batches
-- 250916-CHP (Cherry Paloma)
INSERT INTO batch_registry (batch_number, strain, harvest_date, initial_weight_grams, lifecycle_state, status, notes)
VALUES (
  '250916-CHP',
  'Cherry Paloma',
  '2025-09-16',
  10870.0,
  'binned',
  'active',
  'Auto-created from CSV import - 11 items'
)
ON CONFLICT (batch_number) DO NOTHING;

-- 250916-MGM (Magic Marker)
INSERT INTO batch_registry (batch_number, strain, harvest_date, initial_weight_grams, lifecycle_state, status, notes)
VALUES (
  '250916-MGM',
  'Magic Marker',
  '2025-09-16',
  4983.0,
  'binned',
  'active',
  'Auto-created from CSV import - 5 items'
)
ON CONFLICT (batch_number) DO NOTHING;

-- 250916-SSM (Silver Marker)
INSERT INTO batch_registry (batch_number, strain, harvest_date, initial_weight_grams, lifecycle_state, status, notes)
VALUES (
  '250916-SSM',
  'Silver Marker',
  '2025-09-16',
  5590.0,
  'binned',
  'active',
  'Auto-created from CSV import - 6 items'
)
ON CONFLICT (batch_number) DO NOTHING;

-- 250916-WTD (White Devil)
INSERT INTO batch_registry (batch_number, strain, harvest_date, initial_weight_grams, lifecycle_state, status, notes)
VALUES (
  '250916-WTD',
  'White Devil',
  '2025-09-16',
  5905.0,
  'binned',
  'active',
  'Auto-created from CSV import - 7 items'
)
ON CONFLICT (batch_number) DO NOTHING;

-- 250916-ZMK (Z Marker)
INSERT INTO batch_registry (batch_number, strain, harvest_date, initial_weight_grams, lifecycle_state, status, notes)
VALUES (
  '250916-ZMK',
  'Z Marker',
  '2025-09-16',
  2442.0,
  'binned',
  'active',
  'Auto-created from CSV import - 3 items'
)
ON CONFLICT (batch_number) DO NOTHING;

-- Create all other batches from the CSV (this gets all 42 unique batches)
-- I'll add the most common ones

INSERT INTO batch_registry (batch_number, strain, harvest_date, initial_weight_grams, lifecycle_state, status, notes)
SELECT *FROM (VALUES
  ('250916-CAP', 'Capulator Junky', '2025-09-16'::date, 8000.0, 'binned', 'active', 'Auto-created'),
  ('250916-BLP', 'Blue Pave', '2025-09-16'::date, 15000.0, 'binned', 'active', 'Auto-created'),
  ('250916-DOG', 'Dog Walker', '2025-09-16'::date, 5000.0, 'binned', 'active', 'Auto-created'),
  ('250916-GAS', 'Gas Face', '2025-09-16'::date, 3500.0, 'binned', 'active', 'Auto-created'),
  ('250916-PBB', 'Peanut Butter Breath', '2025-09-16'::date, 3500.0, 'binned', 'active', 'Auto-created'),
  ('250916-CHL', 'Chemlatto', '2025-09-16'::date, 4500.0, 'binned', 'active', 'Auto-created'),
  ('250916-SWF', 'Swamp Water Fumez', '2025-09-16'::date, 6000.0, 'binned', 'active', 'Auto-created'),
  ('250916-ASU', 'Animal Tsunami', '2025-09-16'::date, 5000.0, 'binned', 'active', 'Auto-created'),
  ('250704HA', 'Lemondary', '2025-07-04'::date, 10000.0, 'bulk_available', 'active', 'Auto-created'),
  ('250704HB', 'Tahoe Larry', '2025-07-04'::date, 4000.0, 'bulk_available', 'active', 'Auto-created'),
  ('250704HH', 'Z Marker', '2025-07-04'::date, 5000.0, 'bulk_available', 'active', 'Auto-created'),
  ('25064HF', 'Cherry Paloma', '2025-06-04'::date, 4000.0, 'bulk_available', 'active', 'Auto-created'),
  ('25074HA', 'Lemondary', '2025-07-04'::date, 431.0, 'bulk_available', 'active', 'Auto-created'),
  ('25064H', 'Gas Face', '2025-06-04'::date, 2000.0, 'bulk_available', 'active', 'Auto-created'),
  ('250704HI', 'Z Chem', '2025-07-04'::date, 8000.0, 'bulk_available', 'active', 'Auto-created'),
  ('25064HA', 'Rainbow Inferno', '2025-06-04'::date, 5500.0, 'bulk_available', 'active', 'Auto-created'),
  ('250704HF', 'Magic Marker', '2025-07-04'::date, 6000.0, 'bulk_available', 'active', 'Auto-created'),
  ('250218HL', 'Gas Face', '2025-02-18'::date, 600.0, 'bulk_available', 'active', 'Auto-created'),
  ('241209HE', 'Donny Burger', '2024-12-09'::date, 1816.0, 'bulk_available', 'active', 'Auto-created'),
  ('250218HN', 'Bananaconda', '2025-02-18'::date, 550.0, 'bulk_available', 'active', 'Auto-created'),
  ('250318HL', 'Dante''s Inferno', '2025-03-18'::date, 85.3, 'bulk_available', 'active', 'Auto-created'),
  ('250520HC', 'Rainbow Inferno', '2025-05-20'::date, 1500.0, 'bulk_available', 'active', 'Auto-created'),
  ('250128HE', 'Strawguava', '2025-01-28'::date, 48.5, 'bulk_available', 'active', 'Auto-created'),
  ('250218HG', 'Peanut Butter Breath', '2025-02-18'::date, 102.0, 'bulk_available', 'active', 'Auto-created'),
  ('250403HG', 'White Devil', '2025-04-03'::date, 404.0, 'bulk_available', 'active', 'Auto-created'),
  ('25064HB', 'Strawguava', '2025-06-04'::date, 4640.0, 'bulk_available', 'active', 'Auto-created'),
  ('250704H', 'Devil Driver', '2025-07-04'::date, 1074.3, 'bulk_available', 'active', 'Auto-created'),
  ('250520HN', 'Chembanger', '2025-05-20'::date, 42.0, 'bulk_available', 'active', 'Auto-created'),
  ('250520HH', 'Peanut Butter Breath', '2025-05-20'::date, 62.9, 'bulk_available', 'active', 'Auto-created'),
  ('25064HM', 'Valley Dog', '2025-06-04'::date, 1495.0, 'bulk_available', 'active', 'Auto-created'),
  ('250704HD', 'Chemlatto', '2025-07-04'::date, 9.0, 'packaged', 'active', 'Auto-created'),
  ('250318HN', 'Strawguava', '2025-03-18'::date, 2052.2, 'bulk_available', 'active', 'Auto-created'),
  ('250704HC', 'Animal Tsunami', '2025-07-04'::date, 1468.0, 'bulk_available', 'active', 'Auto-created'),
  ('250403HB', 'Fugazi Funk', '2025-04-03'::date, 100.0, 'bulk_available', 'active', 'Auto-created'),
  ('250520HM', 'Georgia Apple Pie', '2025-05-20'::date, 880.4, 'bulk_available', 'active', 'Auto-created'),
  ('25064HD', 'Capulator Junky', '2025-06-04'::date, 1626.0, 'bulk_available', 'active', 'Auto-created'),
  ('250520HE', 'Lemondary', '2025-05-20'::date, 672.0, 'bulk_available', 'active', 'Auto-created')
) AS t(batch_number, strain, harvest_date, initial_weight_grams, lifecycle_state, status, notes)
ON CONFLICT (batch_number) DO NOTHING;

-- Step 2: Clear existing inventory
DELETE FROM inventory_items;

-- Step 3: Create snapshot
INSERT INTO inventory_snapshots (snapshot_type, source, notes, created_by, status)
VALUES (
  'full_reset',
  'consolidated_csv',
  'Full inventory reset from consolidated CSV - Event-driven system initialization',
  'system',
  'completed'
);

COMMIT;

-- Now you can run the TypeScript script to import the inventory items
SELECT 'Batches created and inventory cleared. Ready to import items.' as status;
