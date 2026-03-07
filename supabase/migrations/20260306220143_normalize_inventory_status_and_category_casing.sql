/*
  # Normalize inventory_items status and category casing

  ## Problem
  75 inventory items have `status = 'Available'` (capital A) instead of `'available'`.
  These same items have simplified category values ('Binned', 'Bucked', 'Bulk', 'Packaged')
  instead of the expected normalized values ('flower_binned', 'flower_bucked', 'flower_bulk', 'flower_packaged').

  This causes:
  - The `sales_inventory_summary` view (which filters `status = 'available'`) to exclude all 75 items
  - The `v_sales_dashboard` to show zero inventory for affected strains
  - The Dashboard Inventory Pipeline widget to contradict the Sales Pipeline numbers
  - 4 strains (Early Riser, Smackles, Strawguava, Trillionz) to be completely invisible

  ## Changes
  1. Normalize `status` from 'Available' to 'available' (75 rows)
  2. Normalize `category` values:
     - 'Binned' -> 'flower_binned' (56 rows)
     - 'Bucked' -> 'flower_bucked' (10 rows -- all appear to be flower based on strain analysis)
     - 'Bulk' -> 'flower_bulk' (3 rows -- trimmed flower that was miscategorized)
     - 'Packaged' -> 'flower_packaged' (5 rows)

  ## Impact
  - ~61,000g Binned, ~11,000g Bucked, ~944g Trimmed, 96 Packaged units become visible
  - 15 strains corrected, 4 previously invisible strains now appear in dashboards

  ## Safety
  - UPDATE only, no DELETE or DROP
  - Only changes metadata fields (status, category), not quantities
  - All affected rows already visible in v_batch_stage_balances, just hidden from sales views
*/

UPDATE inventory_items
SET status = 'available'
WHERE status = 'Available';

UPDATE inventory_items
SET category = 'flower_binned'
WHERE category = 'Binned';

UPDATE inventory_items
SET category = 'flower_bucked'
WHERE category = 'Bucked';

UPDATE inventory_items
SET category = 'flower_bulk'
WHERE category = 'Bulk';

UPDATE inventory_items
SET category = 'flower_packaged'
WHERE category = 'Packaged';
