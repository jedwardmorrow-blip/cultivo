/*
  # Event-Driven Inventory Core - Read Model Views

  ## Overview
  This migration creates optimized views for querying inventory balances, ATP
  (Available-To-Promise), batch stage balances, and item lineage.

  ## Views Created

  1. **v_inventory_balances**
     - Fast per-item balance lookups with batch and stage info

  2. **v_atp**
     - Available-To-Promise calculation (on_hand minus RESERVE plus RELEASE)
     - Critical for Sales visibility into uncommitted inventory

  3. **v_batch_stage_balances**
     - Aggregated batch × stage balances replacing batch_stage_tracking
     - Shows weight_grams and available_weight_grams per batch/stage

  4. **v_lineage**
     - Recursive lineage from item → parent → ... → batch
     - Used for COA resolution, label generation, traceability

  ## Performance
  - Views use indexes on batch_id, product_stage_id, parent_item_id
  - Materialized on_hand_qty avoids ledger replay
  - ATP calculation only scans RESERVE/RELEASE movements

  ## Usage
  - Sales: Query v_atp for available inventory
  - Production: Query v_batch_stage_balances for batch status
  - Compliance: Query v_lineage for traceability
  - Operations: Query v_inventory_balances for on-hand status
*/

-- =====================================================
-- VIEW 1: v_inventory_balances
-- =====================================================

CREATE OR REPLACE VIEW v_inventory_balances AS
SELECT
  i.id AS item_id,
  i.package_id,
  i.sku,
  i.product_name,
  i.batch,
  i.batch_id,
  i.batch_number,
  i.strain,
  i.product_stage_id,
  ps.name AS stage_name,
  i.parent_item_id,
  i.unit,
  COALESCE(i.on_hand_qty, 0) AS on_hand_qty,
  i.status,
  i.category,
  i.room,
  i.created_at,
  i.last_updated
FROM inventory_items i
LEFT JOIN product_stages ps ON ps.id = i.product_stage_id
WHERE i.status != 'deleted' OR i.status IS NULL;

COMMENT ON VIEW v_inventory_balances IS
'Fast read model for inventory item balances.
Shows: item details, batch info, stage, materialized on_hand_qty.
Use for: Inventory management UI, balance queries, reporting.
Performance: Uses materialized on_hand_qty (no ledger replay needed).';

GRANT SELECT ON v_inventory_balances TO authenticated;

-- =====================================================
-- VIEW 2: v_atp (Available-To-Promise)
-- =====================================================

CREATE OR REPLACE VIEW v_atp AS
SELECT
  i.id AS item_id,
  i.package_id,
  i.product_name,
  i.strain,
  i.batch_id,
  i.batch_number,
  i.product_stage_id,
  ps.name AS stage_name,
  i.unit,
  COALESCE(i.on_hand_qty, 0) AS on_hand_qty,
  -- Calculate reserved quantity (RESERVE movements minus RELEASE movements)
  COALESCE(
    (SELECT SUM(qty)
     FROM inventory_movements
     WHERE source_item_id = i.id
       AND movement_kind = 'RESERVE'),
    0
  ) -
  COALESCE(
    (SELECT SUM(qty)
     FROM inventory_movements
     WHERE dest_item_id = i.id
       AND movement_kind = 'RELEASE'),
    0
  ) AS reserved_qty,
  -- ATP = on_hand minus net reserves
  COALESCE(i.on_hand_qty, 0) -
  (
    COALESCE(
      (SELECT SUM(qty)
       FROM inventory_movements
       WHERE source_item_id = i.id
         AND movement_kind = 'RESERVE'),
      0
    ) -
    COALESCE(
      (SELECT SUM(qty)
       FROM inventory_movements
       WHERE dest_item_id = i.id
         AND movement_kind = 'RELEASE'),
      0
    )
  ) AS atp_qty
FROM inventory_items i
LEFT JOIN product_stages ps ON ps.id = i.product_stage_id
WHERE (i.status != 'deleted' OR i.status IS NULL)
  AND COALESCE(i.on_hand_qty, 0) > 0;

COMMENT ON VIEW v_atp IS
'Available-To-Promise calculation for Sales visibility.
ATP = on_hand_qty minus net reserves (RESERVE - RELEASE).
Shows only items with positive on_hand_qty.
Use for: Order entry, allocation planning, sales forecasting.
Performance: Only scans RESERVE/RELEASE movements per item.';

GRANT SELECT ON v_atp TO authenticated;

-- =====================================================
-- VIEW 3: v_batch_stage_balances
-- =====================================================

CREATE OR REPLACE VIEW v_batch_stage_balances AS
SELECT
  i.batch_id,
  br.batch_number,
  br.strain,
  i.product_stage_id,
  ps.name AS stage,
  ps.display_order,
  -- Sum weight in grams (only for gram-based items)
  SUM(CASE WHEN i.unit = 'g' THEN COALESCE(i.on_hand_qty, 0) ELSE 0 END) AS weight_grams,
  -- Sum units (only for unit-based items)
  SUM(CASE WHEN i.unit = 'unit' THEN COALESCE(i.on_hand_qty, 0) ELSE 0 END) AS unit_count,
  -- Calculate available weight (weight minus reserves)
  SUM(CASE WHEN i.unit = 'g' THEN COALESCE(i.on_hand_qty, 0) ELSE 0 END) -
  COALESCE(
    (SELECT SUM(m.qty)
     FROM inventory_movements m
     WHERE m.source_item_id = i.id
       AND m.movement_kind = 'RESERVE'
       AND i.unit = 'g'),
    0
  ) +
  COALESCE(
    (SELECT SUM(m.qty)
     FROM inventory_movements m
     WHERE m.dest_item_id = i.id
       AND m.movement_kind = 'RELEASE'
       AND i.unit = 'g'),
    0
  ) AS available_weight_grams,
  COUNT(DISTINCT i.id) AS item_count,
  MAX(i.last_updated) AS last_updated
FROM inventory_items i
LEFT JOIN batch_registry br ON br.id = i.batch_id
LEFT JOIN product_stages ps ON ps.id = i.product_stage_id
WHERE (i.status != 'deleted' OR i.status IS NULL)
  AND i.batch_id IS NOT NULL
  AND COALESCE(i.on_hand_qty, 0) > 0
GROUP BY i.batch_id, br.batch_number, br.strain, i.product_stage_id, ps.name, ps.display_order
ORDER BY br.batch_number, ps.display_order;

COMMENT ON VIEW v_batch_stage_balances IS
'Aggregated batch × stage inventory balances.
Replaces batch_stage_tracking with item-level aggregation.
Shows: weight_grams (for bulk), unit_count (for packaged), available_weight_grams (ATP for bulk).
Use for: Batch management, production planning, allocation decisions.
Performance: Aggregates from inventory_items (no separate tracking table needed).';

GRANT SELECT ON v_batch_stage_balances TO authenticated;

-- =====================================================
-- VIEW 4: v_lineage (Recursive parent tracking)
-- =====================================================

CREATE OR REPLACE VIEW v_lineage AS
WITH RECURSIVE lineage AS (
  -- Base case: all items
  SELECT
    id AS item_id,
    parent_item_id,
    batch_id,
    0 AS depth,
    ARRAY[id] AS path
  FROM inventory_items

  UNION ALL

  -- Recursive case: follow parent chain
  SELECT
    l.item_id,
    p.parent_item_id,
    p.batch_id,
    l.depth + 1,
    l.path || p.id
  FROM lineage l
  JOIN inventory_items p ON p.id = l.parent_item_id
  WHERE l.depth < 10  -- Prevent infinite loops
)
SELECT DISTINCT ON (item_id)
  item_id,
  parent_item_id,
  batch_id,
  depth,
  path
FROM lineage
ORDER BY item_id, depth DESC;

COMMENT ON VIEW v_lineage IS
'Recursive lineage tracing from item to batch through parent chain.
Shows: Complete ancestry path, final batch_id, depth in tree.
Use for: COA resolution, label generation, compliance traceability.
Performance: Uses CTE with depth limit to prevent infinite loops.
Max depth: 10 levels (should be sufficient for any production workflow).';

GRANT SELECT ON v_lineage TO authenticated;

-- =====================================================
-- VIEW 5: Helper view for batch over-allocation detection
-- =====================================================

CREATE OR REPLACE VIEW v_batch_allocation_health AS
SELECT
  bsb.batch_id,
  bsb.batch_number,
  bsb.strain,
  bsb.stage,
  bsb.weight_grams AS on_hand_weight,
  bsb.available_weight_grams AS available_weight,
  COALESCE(alloc.total_allocated, 0) AS allocated_weight,
  -- Over-allocation indicator
  CASE
    WHEN COALESCE(alloc.total_allocated, 0) > bsb.weight_grams THEN 'over_allocated'
    WHEN COALESCE(alloc.total_allocated, 0) = bsb.weight_grams THEN 'fully_allocated'
    WHEN COALESCE(alloc.total_allocated, 0) > bsb.available_weight_grams THEN 'over_committed'
    ELSE 'healthy'
  END AS allocation_status,
  COALESCE(alloc.allocation_count, 0) AS allocation_count
FROM v_batch_stage_balances bsb
LEFT JOIN (
  SELECT
    batch_id,
    allocation_stage,
    SUM(allocated_weight_grams) AS total_allocated,
    COUNT(*) AS allocation_count
  FROM batch_allocations
  WHERE status IN ('pending', 'confirmed')
  GROUP BY batch_id, allocation_stage
) alloc ON alloc.batch_id = bsb.batch_id
WHERE bsb.weight_grams > 0
ORDER BY
  CASE
    WHEN COALESCE(alloc.total_allocated, 0) > bsb.weight_grams THEN 1
    WHEN COALESCE(alloc.total_allocated, 0) > bsb.available_weight_grams THEN 2
    ELSE 3
  END,
  bsb.batch_number,
  bsb.stage;

COMMENT ON VIEW v_batch_allocation_health IS
'Detects over-allocation and allocation health per batch × stage.
Status:
  - over_allocated: Allocated > on_hand (critical error)
  - over_committed: Allocated > available (needs attention)
  - fully_allocated: Allocated = on_hand (no ATP remaining)
  - healthy: Normal state with ATP available
Use for: Allocation warnings, batch management, production planning.';

GRANT SELECT ON v_batch_allocation_health TO authenticated;

-- =====================================================
-- VIEW 6: Inventory by strain and stage (summary)
-- =====================================================

CREATE OR REPLACE VIEW v_inventory_by_strain_stage AS
SELECT
  i.strain,
  ps.name AS stage,
  ps.display_order,
  -- Grams
  SUM(CASE WHEN i.unit = 'g' THEN COALESCE(i.on_hand_qty, 0) ELSE 0 END) AS total_grams,
  -- Units
  SUM(CASE WHEN i.unit = 'unit' THEN COALESCE(i.on_hand_qty, 0) ELSE 0 END) AS total_units,
  -- ATP for grams
  SUM(
    CASE WHEN i.unit = 'g' THEN
      COALESCE(i.on_hand_qty, 0) -
      COALESCE(
        (SELECT SUM(m.qty)
         FROM inventory_movements m
         WHERE m.source_item_id = i.id AND m.movement_kind = 'RESERVE'),
        0
      ) +
      COALESCE(
        (SELECT SUM(m.qty)
         FROM inventory_movements m
         WHERE m.dest_item_id = i.id AND m.movement_kind = 'RELEASE'),
        0
      )
    ELSE 0
    END
  ) AS atp_grams,
  -- Item count
  COUNT(DISTINCT i.id) AS item_count,
  -- Batch count
  COUNT(DISTINCT i.batch_id) AS batch_count
FROM inventory_items i
LEFT JOIN product_stages ps ON ps.id = i.product_stage_id
WHERE (i.status != 'deleted' OR i.status IS NULL)
  AND COALESCE(i.on_hand_qty, 0) > 0
GROUP BY i.strain, ps.name, ps.display_order
ORDER BY i.strain, ps.display_order;

COMMENT ON VIEW v_inventory_by_strain_stage IS
'Inventory summary aggregated by strain and production stage.
Shows: Total grams, units, ATP, item count, batch count.
Use for: High-level inventory dashboard, capacity planning, sales overview.';

GRANT SELECT ON v_inventory_by_strain_stage TO authenticated;

-- =====================================================
-- SECTION 7: Create index hints for view performance
-- =====================================================

-- Additional composite indexes for view performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_batch_stage
  ON inventory_items(batch_id, product_stage_id)
  WHERE batch_id IS NOT NULL AND product_stage_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_items_strain_stage
  ON inventory_items(strain, product_stage_id)
  WHERE strain IS NOT NULL AND product_stage_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_movements_reserve_release
  ON inventory_movements(source_item_id, dest_item_id, movement_kind, qty)
  WHERE movement_kind IN ('RESERVE', 'RELEASE');
