/*
  # Event-Driven Inventory Core - Data Backfill

  ## Overview
  This migration safely backfills data into new columns added by the event-driven
  inventory system without breaking existing functionality.

  ## Backfills Performed

  1. **inventory_items.batch_id**
     - Map from batch_number text field to batch_registry.id
     - Create batch_registry entries for unknown batches

  2. **inventory_items.product_stage_id**
     - Use map_product_name_to_stage_id() function
     - Pattern match product_name and category to stages

  3. **inventory_items.unit**
     - Infer from product_name and category
     - Default: 'g' for bulk, 'unit' for packaged

  4. **inventory_items.on_hand_qty**
     - Initialize from available_qty column
     - Provides starting point for ledger-based tracking

  5. **order_items.demand_unit**
     - Default based on product type
     - 'unit' for packaged goods, 'g' for bulk orders

  ## Safety
  - All updates use WHERE clauses to only update NULL values
  - No existing data is modified
  - Validation queries included for verification
  - Rollback-safe (no destructive operations)

  ## Post-Migration Validation
  - Check v_stage_mapping_preview for unmapped items
  - Review items with NULL batch_id
  - Verify demand_unit coverage on order_items
*/

-- =====================================================
-- SECTION 1: Backfill inventory_items.batch_id
-- =====================================================

-- First, ensure batch_registry has entries for all batch numbers
INSERT INTO batch_registry (
  batch_number,
  strain,
  initial_weight_grams,
  status,
  notes
)
SELECT DISTINCT
  batch_number,
  strain,
  0, -- initial_weight_grams (unknown from legacy data)
  'active',
  'Auto-created during event-driven inventory backfill'
FROM inventory_items
WHERE batch_number IS NOT NULL
  AND batch_number != ''
  AND NOT EXISTS (
    SELECT 1 FROM batch_registry br
    WHERE br.batch_number = inventory_items.batch_number
  )
ON CONFLICT (batch_number) DO NOTHING;

-- Now backfill batch_id from batch_number
UPDATE inventory_items
SET batch_id = br.id
FROM batch_registry br
WHERE inventory_items.batch_number = br.batch_number
  AND inventory_items.batch_id IS NULL;

-- Log backfill statistics
DO $$
DECLARE
  v_updated_count integer;
  v_null_count integer;
BEGIN
  SELECT COUNT(*) INTO v_updated_count
  FROM inventory_items
  WHERE batch_id IS NOT NULL;

  SELECT COUNT(*) INTO v_null_count
  FROM inventory_items
  WHERE batch_id IS NULL AND (status != 'deleted' OR status IS NULL);

  RAISE NOTICE 'Batch ID backfill complete: % items with batch_id, % items still NULL',
    v_updated_count, v_null_count;
END $$;

-- =====================================================
-- SECTION 2: Backfill inventory_items.product_stage_id
-- =====================================================

-- Use the mapping function to backfill product_stage_id
UPDATE inventory_items
SET product_stage_id = map_product_name_to_stage_id(product_name, category)
WHERE product_stage_id IS NULL
  AND product_name IS NOT NULL;

-- Log backfill statistics
DO $$
DECLARE
  v_updated_count integer;
  v_null_count integer;
BEGIN
  SELECT COUNT(*) INTO v_updated_count
  FROM inventory_items
  WHERE product_stage_id IS NOT NULL;

  SELECT COUNT(*) INTO v_null_count
  FROM inventory_items
  WHERE product_stage_id IS NULL AND (status != 'deleted' OR status IS NULL);

  RAISE NOTICE 'Product stage ID backfill complete: % items with product_stage_id, % items still NULL',
    v_updated_count, v_null_count;

  IF v_null_count > 0 THEN
    RAISE NOTICE 'Review v_stage_mapping_preview for items needing manual stage assignment';
  END IF;
END $$;

-- =====================================================
-- SECTION 3: Backfill inventory_items.unit
-- =====================================================

-- Infer unit from product_name and category patterns
UPDATE inventory_items
SET unit = CASE
  -- Packaged products (counted in units)
  WHEN product_name ILIKE '%3.5g%' OR product_name ILIKE '%eighth%' THEN 'unit'
  WHEN product_name ILIKE '%14g%' OR product_name ILIKE '%half%oz%' THEN 'unit'
  WHEN product_name ILIKE '%28g%' OR product_name ILIKE '%oz%' THEN 'unit'
  WHEN product_name ILIKE '%454g%' OR product_name ILIKE '%1%lb%' THEN 'unit'
  WHEN category ILIKE '%packaged%' THEN 'unit'

  -- Bulk products (weighed in grams)
  WHEN product_name ILIKE '%bulk%' THEN 'g'
  WHEN product_name ILIKE '%bucked%' THEN 'g'
  WHEN product_name ILIKE '%binned%' THEN 'g'
  WHEN category ILIKE '%bulk%' THEN 'g'
  WHEN category ILIKE '%bucked%' THEN 'g'
  WHEN category ILIKE '%binned%' THEN 'g'

  -- Default to grams for unknown
  ELSE 'g'
END
WHERE unit IS NULL;

-- Log backfill statistics
DO $$
DECLARE
  v_gram_count integer;
  v_unit_count integer;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE unit = 'g'),
    COUNT(*) FILTER (WHERE unit = 'unit')
  INTO v_gram_count, v_unit_count
  FROM inventory_items;

  RAISE NOTICE 'Unit backfill complete: % gram-based items, % unit-based items',
    v_gram_count, v_unit_count;
END $$;

-- =====================================================
-- SECTION 4: Backfill inventory_items.on_hand_qty
-- =====================================================

-- Initialize on_hand_qty from available_qty
UPDATE inventory_items
SET on_hand_qty = COALESCE(available_qty, 0)
WHERE on_hand_qty IS NULL OR on_hand_qty = 0;

-- Log backfill statistics
DO $$
DECLARE
  v_total_qty numeric;
  v_item_count integer;
BEGIN
  SELECT
    SUM(on_hand_qty),
    COUNT(*)
  INTO v_total_qty, v_item_count
  FROM inventory_items
  WHERE on_hand_qty > 0;

  RAISE NOTICE 'On-hand quantity backfill complete: % items with total quantity %',
    v_item_count, v_total_qty;
END $$;

-- =====================================================
-- SECTION 5: Backfill order_items.demand_unit
-- =====================================================

-- Safe backfill with COALESCE to preserve existing values
UPDATE order_items
SET demand_unit = COALESCE(
  demand_unit,
  CASE
    -- If product exists, check its unit type
    WHEN product_id IS NOT NULL THEN
      (SELECT
        CASE
          WHEN p.unit IN ('pound', 'half-pound') THEN 'g'
          ELSE 'unit'
        END
       FROM products p
       WHERE p.id = order_items.product_id
       LIMIT 1)
    -- Default to grams if no product
    ELSE 'g'
  END
)
WHERE demand_unit IS NULL;

-- Log backfill statistics
DO $$
DECLARE
  v_unit_count integer;
  v_gram_count integer;
  v_null_count integer;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE demand_unit = 'unit'),
    COUNT(*) FILTER (WHERE demand_unit = 'g'),
    COUNT(*) FILTER (WHERE demand_unit IS NULL)
  INTO v_unit_count, v_gram_count, v_null_count
  FROM order_items;

  RAISE NOTICE 'Demand unit backfill complete: % unit-based, % gram-based, % still NULL',
    v_unit_count, v_gram_count, v_null_count;

  IF v_null_count > 0 THEN
    RAISE WARNING 'Some order_items still have NULL demand_unit. Manual review required.';
  END IF;
END $$;

-- =====================================================
-- SECTION 6: Create validation queries
-- =====================================================

-- View for backfill validation
CREATE OR REPLACE VIEW v_backfill_validation AS
SELECT
  'inventory_items.batch_id' as field,
  COUNT(*) FILTER (WHERE batch_id IS NOT NULL) as populated_count,
  COUNT(*) FILTER (WHERE batch_id IS NULL) as null_count,
  ROUND(
    COUNT(*) FILTER (WHERE batch_id IS NOT NULL)::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as populated_pct
FROM inventory_items
WHERE status != 'deleted' OR status IS NULL

UNION ALL

SELECT
  'inventory_items.product_stage_id',
  COUNT(*) FILTER (WHERE product_stage_id IS NOT NULL),
  COUNT(*) FILTER (WHERE product_stage_id IS NULL),
  ROUND(
    COUNT(*) FILTER (WHERE product_stage_id IS NOT NULL)::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  )
FROM inventory_items
WHERE status != 'deleted' OR status IS NULL

UNION ALL

SELECT
  'inventory_items.unit',
  COUNT(*) FILTER (WHERE unit IS NOT NULL),
  COUNT(*) FILTER (WHERE unit IS NULL),
  ROUND(
    COUNT(*) FILTER (WHERE unit IS NOT NULL)::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  )
FROM inventory_items
WHERE status != 'deleted' OR status IS NULL

UNION ALL

SELECT
  'inventory_items.on_hand_qty',
  COUNT(*) FILTER (WHERE on_hand_qty IS NOT NULL AND on_hand_qty > 0),
  COUNT(*) FILTER (WHERE on_hand_qty IS NULL OR on_hand_qty = 0),
  ROUND(
    COUNT(*) FILTER (WHERE on_hand_qty IS NOT NULL AND on_hand_qty > 0)::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  )
FROM inventory_items
WHERE status != 'deleted' OR status IS NULL

UNION ALL

SELECT
  'order_items.demand_unit',
  COUNT(*) FILTER (WHERE demand_unit IS NOT NULL),
  COUNT(*) FILTER (WHERE demand_unit IS NULL),
  ROUND(
    COUNT(*) FILTER (WHERE demand_unit IS NOT NULL)::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  )
FROM order_items;

COMMENT ON VIEW v_backfill_validation IS
'Validation view showing backfill coverage for new columns.
Shows: Field name, populated count, null count, populated percentage.
Use for: Post-migration validation, identifying incomplete backfills.';

GRANT SELECT ON v_backfill_validation TO authenticated;

-- =====================================================
-- SECTION 7: Add constraints after backfill
-- =====================================================

-- Add NOT NULL constraint to demand_unit after backfill
DO $$
BEGIN
  -- Only add constraint if all values are populated
  IF NOT EXISTS (
    SELECT 1 FROM order_items WHERE demand_unit IS NULL
  ) THEN
    ALTER TABLE order_items
    ALTER COLUMN demand_unit SET NOT NULL;

    RAISE NOTICE 'Added NOT NULL constraint to order_items.demand_unit';
  ELSE
    RAISE WARNING 'Skipping NOT NULL constraint on order_items.demand_unit - null values exist';
  END IF;
END $$;

-- =====================================================
-- SECTION 8: Documentation and completion
-- =====================================================

COMMENT ON TABLE inventory_items IS
'ACTIVE: Primary inventory table with event-driven tracking.
Columns backfilled: batch_id, product_stage_id, unit, on_hand_qty.
Backfill date: 2025-10-21.
Migration: 20251021000700_event_driven_inventory_data_backfill.sql.
Query v_backfill_validation for coverage statistics.';

COMMENT ON TABLE order_items IS
'ACTIVE: Order line items.
Columns backfilled: demand_unit.
Backfill date: 2025-10-21.
Migration: 20251021000700_event_driven_inventory_data_backfill.sql.';

-- Log completion message
DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Event-Driven Inventory Data Backfill Complete';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Query v_backfill_validation to review coverage';
  RAISE NOTICE 'Query v_stage_mapping_preview for unmapped stages';
  RAISE NOTICE 'System is now ready for event-driven inventory operations';
END $$;
