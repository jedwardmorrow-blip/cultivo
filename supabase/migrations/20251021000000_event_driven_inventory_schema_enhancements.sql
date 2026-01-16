/*
  # Event-Driven Inventory Core - Schema Enhancements

  ## Overview
  This migration adds foundational columns to existing tables to support an event-driven
  inventory system with batch lineage, soft allocations, and ledger-based quantity tracking.

  ## Changes Made

  1. **inventory_items enhancements**
     - Add batch_id (uuid FK → batch_registry.id) - immutable batch lineage
     - Add product_stage_id (uuid FK → product_stages.id) - current stage in production
     - Add parent_item_id (uuid FK → inventory_items.id) - transformation lineage
     - Add unit (text: 'g' or 'unit') - quantity unit of measure
     - Add on_hand_qty (numeric) - materialized balance from movements
     - Add indexes for fast lookups

  2. **inventory_movements enhancements**
     - Add movement_kind (text) - standardized movement type taxonomy
     - Add source_item_id (uuid FK → inventory_items.id) - movement source
     - Add dest_item_id (uuid FK → inventory_items.id) - movement destination
     - Add qty (numeric) - movement quantity
     - Add unit (text) - movement unit of measure
     - Add reason_code (text) - explanation for adjustments
     - Add indexes for movement queries

  3. **order_items enhancements**
     - Add demand_unit (text: 'unit' or 'g') - unit for order demand

  ## Business Rules
  - batch_id is immutable after creation (enforced by trigger)
  - Outputs inherit batch_id from parent_item_id
  - All quantity changes must flow through inventory_movements
  - movement_kind taxonomy: RECEIPT, CONSUME_SESSION_INPUT, PRODUCE_SESSION_OUTPUT,
    FULFILLMENT, RETURN, RESERVE, RELEASE, ADJUSTMENT, RECONCILIATION

  ## Safety
  - All alterations use IF NOT EXISTS patterns
  - Existing data preserved
  - No destructive operations
  - Additive only
*/

-- =====================================================
-- SECTION 1: Enhance inventory_items table
-- =====================================================

-- Add batch_id column with foreign key to batch_registry
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN batch_id uuid REFERENCES batch_registry(id) ON DELETE SET NULL;
    COMMENT ON COLUMN inventory_items.batch_id IS 'Immutable reference to batch registry. Every item must have a batch for lineage and COA resolution.';
  END IF;
END $$;

-- Add product_stage_id column with foreign key to product_stages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'product_stage_id'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN product_stage_id uuid REFERENCES product_stages(id) ON DELETE SET NULL;
    COMMENT ON COLUMN inventory_items.product_stage_id IS 'Current stage in production workflow (Binned, BuckedFlower, BulkFlower, Packaged_3_5g, etc).';
  END IF;
END $$;

-- Add parent_item_id column for lineage tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'parent_item_id'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN parent_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL;
    COMMENT ON COLUMN inventory_items.parent_item_id IS 'Parent item this was created from (e.g., bulk flower created from bucked inventory).';
  END IF;
END $$;

-- Add unit column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'unit'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN unit text CHECK (unit IN ('g', 'unit'));
    COMMENT ON COLUMN inventory_items.unit IS 'Unit of measure: ''g'' for bulk weight-based, ''unit'' for packaged count-based.';
  END IF;
END $$;

-- Add on_hand_qty column for materialized balance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'on_hand_qty'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN on_hand_qty numeric DEFAULT 0;
    COMMENT ON COLUMN inventory_items.on_hand_qty IS 'Materialized on-hand quantity. Updated by triggers from inventory_movements ledger.';
  END IF;
END $$;

-- Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_inventory_items_batch_id ON inventory_items(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_product_stage_id ON inventory_items(product_stage_id) WHERE product_stage_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_parent_item_id ON inventory_items(parent_item_id) WHERE parent_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_unit ON inventory_items(unit) WHERE unit IS NOT NULL;

-- =====================================================
-- SECTION 2: Enhance inventory_movements table
-- =====================================================

-- Add movement_kind column with taxonomy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_movements' AND column_name = 'movement_kind'
  ) THEN
    ALTER TABLE inventory_movements ADD COLUMN movement_kind text;
  END IF;
END $$;

-- Add or update movement_kind constraint
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_movement_kind_new'
  ) THEN
    ALTER TABLE inventory_movements DROP CONSTRAINT valid_movement_kind_new;
  END IF;

  -- Add new constraint with expanded taxonomy
  ALTER TABLE inventory_movements
  ADD CONSTRAINT valid_movement_kind_new
  CHECK (movement_kind IN (
    'RECEIPT',                  -- Initial inventory receipt
    'CONSUME_SESSION_INPUT',    -- Input consumed by trim/packaging session
    'PRODUCE_SESSION_OUTPUT',   -- Output produced by trim/packaging session
    'FULFILLMENT',              -- Item shipped to fulfill order
    'RETURN',                   -- Item returned from customer
    'RESERVE',                  -- Soft allocation (reduces ATP, not on_hand)
    'RELEASE',                  -- Release soft allocation (restores ATP)
    'ADJUSTMENT',               -- Manual adjustment (absolute set)
    'RECONCILIATION'            -- Reconciliation to counted value (absolute set)
  ));

  COMMENT ON COLUMN inventory_movements.movement_kind IS 'Movement type taxonomy for ledger-based inventory tracking.';
END $$;

-- Add source_item_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_movements' AND column_name = 'source_item_id'
  ) THEN
    ALTER TABLE inventory_movements ADD COLUMN source_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL;
    COMMENT ON COLUMN inventory_movements.source_item_id IS 'Source inventory item for this movement (for CONSUME, FULFILLMENT, RESERVE).';
  END IF;
END $$;

-- Add dest_item_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_movements' AND column_name = 'dest_item_id'
  ) THEN
    ALTER TABLE inventory_movements ADD COLUMN dest_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL;
    COMMENT ON COLUMN inventory_movements.dest_item_id IS 'Destination inventory item for this movement (for RECEIPT, PRODUCE, RETURN, RELEASE).';
  END IF;
END $$;

-- Add qty column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_movements' AND column_name = 'qty'
  ) THEN
    ALTER TABLE inventory_movements ADD COLUMN qty numeric;
    COMMENT ON COLUMN inventory_movements.qty IS 'Movement quantity. For delta movements, this is the change amount. For absolute movements (ADJUSTMENT, RECONCILIATION), this is the new total.';
  END IF;
END $$;

-- Add unit column to movements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_movements' AND column_name = 'unit'
  ) THEN
    ALTER TABLE inventory_movements ADD COLUMN unit text CHECK (unit IN ('g', 'unit'));
    COMMENT ON COLUMN inventory_movements.unit IS 'Unit of measure for this movement quantity.';
  END IF;
END $$;

-- Add reason_code column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_movements' AND column_name = 'reason_code'
  ) THEN
    ALTER TABLE inventory_movements ADD COLUMN reason_code text;
    COMMENT ON COLUMN inventory_movements.reason_code IS 'Explanation for manual adjustments and reconciliations.';
  END IF;
END $$;

-- Create indexes on new movement columns
CREATE INDEX IF NOT EXISTS idx_inventory_movements_source_item ON inventory_movements(source_item_id) WHERE source_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_dest_item ON inventory_movements(dest_item_id) WHERE dest_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_kind ON inventory_movements(movement_kind) WHERE movement_kind IS NOT NULL;

-- =====================================================
-- SECTION 3: Enhance order_items table
-- =====================================================

-- Add demand_unit column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'demand_unit'
  ) THEN
    ALTER TABLE order_items ADD COLUMN demand_unit text CHECK (demand_unit IN ('unit', 'g'));
    COMMENT ON COLUMN order_items.demand_unit IS 'Unit of measure for order demand: ''unit'' for packaged goods, ''g'' for bulk orders.';
  END IF;
END $$;

-- Create index on demand_unit
CREATE INDEX IF NOT EXISTS idx_order_items_demand_unit ON order_items(demand_unit) WHERE demand_unit IS NOT NULL;

-- =====================================================
-- SECTION 4: Add table and column documentation
-- =====================================================

COMMENT ON TABLE inventory_items IS
'ACTIVE: Primary inventory table. Each row represents a distinct inventory item (package or unit).
Updated: Enhanced with batch_id, product_stage_id, parent_item_id, unit, on_hand_qty for event-driven tracking.
Migration: 20251021000000_event_driven_inventory_schema_enhancements.sql';

COMMENT ON TABLE inventory_movements IS
'ACTIVE: Ledger of all inventory movements. Source of truth for quantity changes.
Updated: Enhanced with movement_kind, source_item_id, dest_item_id, qty, unit, reason_code.
Migration: 20251021000000_event_driven_inventory_schema_enhancements.sql';

COMMENT ON TABLE order_items IS
'ACTIVE: Order line items.
Updated: Enhanced with demand_unit for fulfillment unit specification.
Migration: 20251021000000_event_driven_inventory_schema_enhancements.sql';
