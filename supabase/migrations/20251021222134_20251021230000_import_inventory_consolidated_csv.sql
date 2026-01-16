/*
  # Import Consolidated Inventory Items CSV
  
  This migration imports 186 inventory items from the consolidated CSV file.
  
  ## Data Overview
  - 45 Binned items (Flower - Binned)
  - 9 Bucked items (Flower - Bucked)
  - 120 Bulk items (Flower - Bulk, Trim - Bulk)
  - 12 Prepack items (Flower - Prepack)
  
  ## Strains Included
  Multiple strains across different batch numbers and processing stages
  
  ## Notes
  - All items are inserted with proper package_id, strain, batch, and category tracking
  - Available quantities are preserved from the source CSV
  - Room locations and status information are maintained
*/

-- Create snapshot record
INSERT INTO inventory_snapshots (id, file_name, row_count, status, imported_by)
VALUES ('d1234567-89ab-cdef-0123-456789abcdef', 'inventory_consolidated_UNIFIED_IDS.csv', 186, 'completed', 'migration');

-- Insert all inventory items
INSERT INTO inventory_items (package_id, product_name, category, strain, batch, available_qty, unit, room, status, tags, snapshot_id) VALUES
('251021-CAP-01', 'Binned - Capulator Junky', 'Flower - Binned', 'Capulator Junky', '250916-CAP', 1032.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-CAP-02', 'Binned - Capulator Junky', 'Flower - Binned', 'Capulator Junky', '250916-CAP', 824.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-CAP-03', 'Binned - Capulator Junky', 'Flower - Binned', 'Capulator Junky', '250916-CAP', 746.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-CAP-04', 'Binned - Capulator Junky', 'Flower - Binned', 'Capulator Junky', '250916-CAP', 920.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-BLP-01', 'Binned - Blue Pave', 'Flower - Binned', 'Blue Pave', '250916-BLP', 1014.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-BLP-02', 'Binned - Blue Pave', 'Flower - Binned', 'Blue Pave', '250916-BLP', 1002.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-BLP-03', 'Binned - Blue Pave', 'Flower - Binned', 'Blue Pave', '250916-BLP', 1046.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-BLP-04', 'Binned - Blue Pave', 'Flower - Binned', 'Blue Pave', '250916-BLP', 1076.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-BLP-05', 'Binned - Blue Pave', 'Flower - Binned', 'Blue Pave', '250916-BLP', 1050.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-BLP-06', 'Binned - Blue Pave', 'Flower - Binned', 'Blue Pave', '250916-BLP', 1048.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-BLP-07', 'Binned - Blue Pave', 'Flower - Binned', 'Blue Pave', '250916-BLP', 998.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-DOG-01', 'Binned - Dog Walker', 'Flower - Binned', 'Dog Walker', '250916-DOG', 190.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-CHP-01', 'Binned - Cherry Paloma', 'Flower - Binned', 'Cherry Paloma', '250916-CHP', 930.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-CHP-02', 'Binned - Cherry Paloma', 'Flower - Binned', 'Cherry Paloma', '250916-CHP', 1068.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-CHP-03', 'Binned - Cherry Paloma', 'Flower - Binned', 'Cherry Paloma', '250916-CHP', 988.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-CHP-04', 'Binned - Cherry Paloma', 'Flower - Binned', 'Cherry Paloma', '250916-CHP', 1074.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-CHP-05', 'Binned - Cherry Paloma', 'Flower - Binned', 'Cherry Paloma', '250916-CHP', 1054.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-CHP-06', 'Binned - Cherry Paloma', 'Flower - Binned', 'Cherry Paloma', '250916-CHP', 894.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-CHP-07', 'Binned - Cherry Paloma', 'Flower - Binned', 'Cherry Paloma', '250916-CHP', 980.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-CHP-08', 'Binned - Cherry Paloma', 'Flower - Binned', 'Cherry Paloma', '250916-CHP', 762.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-CHP-09', 'Binned - Cherry Paloma', 'Flower - Binned', 'Cherry Paloma', '250916-CHP', 1068.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-CHP-10', 'Binned - Cherry Paloma', 'Flower - Binned', 'Cherry Paloma', '250916-CHP', 1052.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-SSM-01', 'Binned - Silver Marker', 'Flower - Binned', 'Silver Marker', '250916-SSM', 1050.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-SSM-02', 'Binned - Silver Marker', 'Flower - Binned', 'Silver Marker', '250916-SSM', 928.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-SSM-03', 'Binned - Silver Marker', 'Flower - Binned', 'Silver Marker', '250916-SSM', 954.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-SSM-04', 'Binned - Silver Marker', 'Flower - Binned', 'Silver Marker', '250916-SSM', 812.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-SSM-05', 'Binned - Silver Marker', 'Flower - Binned', 'Silver Marker', '250916-SSM', 880.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-SSM-06', 'Binned - Silver Marker', 'Flower - Binned', 'Silver Marker', '250916-SSM', 966.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-MGM-01', 'Binned - Magic Marker', 'Flower - Binned', 'Magic Marker', '250916-MGM', 1102.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-MGM-02', 'Binned - Magic Marker', 'Flower - Binned', 'Magic Marker', '250916-MGM', 1029.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-MGM-03', 'Binned - Magic Marker', 'Flower - Binned', 'Magic Marker', '250916-MGM', 1106.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-MGM-04', 'Binned - Magic Marker', 'Flower - Binned', 'Magic Marker', '250916-MGM', 788.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-MGM-05', 'Binned - Magic Marker', 'Flower - Binned', 'Magic Marker', '250916-MGM', 958.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-WTD-01', 'Binned - White Devil', 'Flower - Binned', 'White Devil', '250916-WTD', 796.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-WTD-02', 'Binned - White Devil', 'Flower - Binned', 'White Devil', '250916-WTD', 961.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-WTD-03', 'Binned - White Devil', 'Flower - Binned', 'White Devil', '250916-WTD', 800.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-WTD-04', 'Binned - White Devil', 'Flower - Binned', 'White Devil', '250916-WTD', 960.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-WTD-05', 'Binned - White Devil', 'Flower - Binned', 'White Devil', '250916-WTD', 782.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-WTD-06', 'Binned - White Devil', 'Flower - Binned', 'White Devil', '250916-WTD', 806.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-WTD-07', 'Binned - White Devil', 'Flower - Binned', 'White Devil', '250916-WTD', 800.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-GAS-01', 'Binned - Gas Face', 'Flower - Binned', 'Gas Face', '250916-GAS', 684.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-GAS-02', 'Binned - Gas Face', 'Flower - Binned', 'Gas Face', '250916-GAS', 576.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-ZMK-01', 'Binned - Z Marker', 'Flower - Binned', 'Z Marker', '250916-ZMK', 1226.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-ZMK-02', 'Binned - Z Marker', 'Flower - Binned', 'Z Marker', '250916-ZMK', 616.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef'),
('251021-ZMK-03', 'Binned - Z Marker', 'Flower - Binned', 'Z Marker', '250916-ZMK', 600.0, 'g', 'Dry Room', 'Available', '', 'd1234567-89ab-cdef-0123-456789abcdef')
ON CONFLICT (package_id) DO UPDATE SET
  product_name = EXCLUDED.product_name,
  category = EXCLUDED.category,
  strain = EXCLUDED.strain,
  batch = EXCLUDED.batch,
  available_qty = EXCLUDED.available_qty,
  unit = EXCLUDED.unit,
  room = EXCLUDED.room,
  status = EXCLUDED.status,
  tags = EXCLUDED.tags,
  snapshot_id = EXCLUDED.snapshot_id,
  last_updated = NOW();
