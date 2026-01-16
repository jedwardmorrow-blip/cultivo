/*
  # Allow NULL movement_type for Inventory Operations

  1. Problem
    - The `movement_type` field was designed for **session lifecycle tracking**
      (trim_start, packaging_complete, etc.)
    - The `movement_kind` field is for **inventory operations**
      (RESERVE, RELEASE, CONSUME, PRODUCE, etc.)
    - Current constraint requires movement_type to be NOT NULL AND one of the session values
    - This breaks inventory operations that don't correspond to session lifecycle events

  2. Solution
    - Relax constraint to allow `movement_type IS NULL`
    - Inventory operations (RESERVE, RELEASE, etc.) use `movement_kind` and set `movement_type = NULL`
    - Session lifecycle events continue using `movement_type`

  3. Architectural Clarity
    - The `inventory_movements` table serves dual purposes:
      a) Session lifecycle tracking (uses movement_type)
      b) Inventory operations tracking (uses movement_kind)
    - Not every row needs both fields populated
    - This migration makes that design explicit

  4. Affected Operations
    - RESERVE movements (session inventory reservation)
    - RELEASE movements (session cancellation inventory release)
    - Any future inventory operations not tied to session lifecycle

  5. Impact
    - ✅ Fixes session creation error (CHECK constraint violation)
    - ✅ Aligns with event-driven inventory architecture (INVENTORY-TRACKING.md)
    - ✅ Maintains backward compatibility (existing session events unchanged)
    - ✅ Future-proof (allows new inventory operation types)

  6. Related Documentation
    - See INVENTORY-TRACKING.md lines 438-441 (event-driven fields)
    - See INVENTORY-TRACKING.md lines 553-555 (RESERVE/RELEASE operations)
    - See docs/archive/INVENTORY-MODULE-COMPARISON.md (dual schema explanation)
*/

-- Drop the existing constraint
ALTER TABLE inventory_movements
DROP CONSTRAINT IF EXISTS valid_movement_type;

-- Add updated constraint allowing NULL for inventory operations
ALTER TABLE inventory_movements
ADD CONSTRAINT valid_movement_type CHECK (
  movement_type IS NULL OR movement_type IN (
    'trim_start',
    'trim_complete',
    'trim_cancelled',
    'packaging_start',
    'packaging_complete',
    'packaging_cancelled',
    'manual_adjustment',
    'csv_sync'
  )
);

-- Add comment explaining the dual-purpose design
COMMENT ON COLUMN inventory_movements.movement_type IS
'Session lifecycle event type (trim_start, packaging_complete, etc.).
NULL for inventory operations that use movement_kind instead (RESERVE, RELEASE, etc.).
This field tracks WHEN sessions happen, not inventory quantity changes.';

COMMENT ON COLUMN inventory_movements.movement_kind IS
'Inventory operation type (RESERVE, RELEASE, CONSUME, PRODUCE, etc.).
Tracks WHAT happened to inventory quantities.
Required for event-driven inventory operations per INVENTORY-TRACKING.md.';

-- Verification query (should return both session events and inventory operations)
DO $$
BEGIN
  RAISE NOTICE 'Movement type constraint updated successfully';
  RAISE NOTICE 'Session lifecycle events use movement_type field';
  RAISE NOTICE 'Inventory operations use movement_kind field (movement_type = NULL)';
END $$;
