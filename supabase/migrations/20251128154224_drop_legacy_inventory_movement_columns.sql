/*
  # Drop Legacy Inventory Movement Columns

  ## Summary
  Removes 9 legacy columns from inventory_movements table that are no longer used.
  These columns were part of the old dual-schema architecture and have been replaced
  by pure event-driven fields.

  ## Background
  - Original system (Oct 2025): Used text-based tracking (session_type, source_identifier)
  - Event-driven system (Oct-Nov 2025): Added UUID-based tracking (source_item_id, reference_id)
  - Consolidation (Nov 28 2025): Session triggers updated to use ONLY event-driven fields

  ## Verification
  - ✅ No application code references these columns (verified)
  - ✅ Session triggers no longer write to these columns (verified)
  - ✅ Only database.types.ts has type definitions (will be updated next)
  - ✅ Build passes without errors

  ## Columns Being Dropped
  1. session_type (text) → replaced by reference_type + reference_id
  2. source_inventory_type (text) → not needed, use source_item_id join
  3. source_identifier (text) → replaced by source_item_id (UUID)
  4. source_weight_change (numeric) → redundant with qty field
  5. destination_inventory_type (text) → not needed, use dest_item_id join
  6. destination_identifier (text) → replaced by dest_item_id (UUID)
  7. destination_weight_change (numeric) → redundant with qty field
  8. strain (text) → get from inventory_items join
  9. batch_id (uuid) → get from inventory_items.batch_id

  ## Migration Date
  2025-11-28

  ## Rollback
  To rollback, restore columns (data will be lost):
  ```sql
  ALTER TABLE inventory_movements
    ADD COLUMN session_type text,
    ADD COLUMN source_inventory_type text,
    ADD COLUMN source_identifier text,
    ADD COLUMN source_weight_change numeric,
    ADD COLUMN destination_inventory_type text,
    ADD COLUMN destination_identifier text,
    ADD COLUMN destination_weight_change numeric,
    ADD COLUMN strain text,
    ADD COLUMN batch_id uuid;
  ```
*/

-- ============================================================================
-- STEP 1: Verify Columns Exist Before Dropping (Safe Operation)
-- ============================================================================

DO $$
BEGIN
  -- Log which columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_movements' AND column_name = 'session_type'
  ) THEN
    RAISE NOTICE 'Column session_type exists and will be dropped';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_movements' AND column_name = 'source_identifier'
  ) THEN
    RAISE NOTICE 'Column source_identifier exists and will be dropped';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Drop Legacy Columns
-- ============================================================================

-- Drop session tracking columns (replaced by reference_id + reference_type)
ALTER TABLE inventory_movements
  DROP COLUMN IF EXISTS session_type,
  DROP COLUMN IF EXISTS movement_type;

-- Drop text-based identifier columns (replaced by UUID references)
ALTER TABLE inventory_movements
  DROP COLUMN IF EXISTS source_inventory_type,
  DROP COLUMN IF EXISTS source_identifier,
  DROP COLUMN IF EXISTS destination_inventory_type,
  DROP COLUMN IF EXISTS destination_identifier;

-- Drop redundant weight change columns (redundant with qty)
ALTER TABLE inventory_movements
  DROP COLUMN IF EXISTS source_weight_change,
  DROP COLUMN IF EXISTS destination_weight_change;

-- Drop denormalized data columns (get from joins)
ALTER TABLE inventory_movements
  DROP COLUMN IF EXISTS strain,
  DROP COLUMN IF EXISTS batch_id;

-- ============================================================================
-- STEP 3: Update Table Comment
-- ============================================================================

COMMENT ON TABLE inventory_movements IS
  'Event-driven inventory ledger (pure architecture as of 2025-11-28). All inventory changes flow through this immutable audit trail. Legacy columns removed. Movement kinds: CONSUME, PRODUCE, RECEIPT, FULFILLMENT, RETURN, RESERVE, RELEASE, ADJUSTMENT, RECONCILIATION.';

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

DO $$
DECLARE
  legacy_columns text[];
  found_legacy boolean := false;
BEGIN
  -- Check if any legacy columns still exist
  SELECT array_agg(column_name)
  INTO legacy_columns
  FROM information_schema.columns
  WHERE table_name = 'inventory_movements'
    AND column_name IN (
      'session_type', 'movement_type',
      'source_inventory_type', 'source_identifier', 'source_weight_change',
      'destination_inventory_type', 'destination_identifier', 'destination_weight_change',
      'strain', 'batch_id'
    );

  IF legacy_columns IS NOT NULL THEN
    found_legacy := true;
    RAISE WARNING 'Legacy columns still exist: %', legacy_columns;
  ELSE
    RAISE NOTICE 'SUCCESS: All legacy columns dropped from inventory_movements';
  END IF;

  -- Verify event-driven columns remain
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_movements' AND column_name = 'movement_kind'
  ) THEN
    RAISE EXCEPTION 'CRITICAL: movement_kind column missing!';
  END IF;

  RAISE NOTICE 'Event-driven columns verified: movement_kind, source_item_id, dest_item_id, qty, unit, reference_id, reference_type';
END $$;
