/*
  # Production dispatch — deduplicate and prevent future duplicates

  ## Problem
  LoRa (InventoryDrawer) can send the same package to the production dispatch
  queue multiple times, creating duplicate entries. Ghost items (dispatched
  items pointing to depleted inventory) also accumulate.

  ## Solution
  1. Cancel all ghost dispatch items (active items with depleted inventory).
  2. Cancel duplicate active items per inventory_item_id, keeping oldest.
  3. Add a partial unique index so only one active dispatch per inventory item
     can exist at a time.

  ## Notes
  - Steps 1 and 2 were run ad-hoc on 2026-04-13 before this migration.
  - The index is idempotent (IF NOT EXISTS).
*/

-- Partial unique index: one active dispatch per inventory item
CREATE UNIQUE INDEX IF NOT EXISTS idx_pdi_one_active_per_item
ON production_dispatch_items (inventory_item_id)
WHERE status IN ('pending', 'in_progress');
