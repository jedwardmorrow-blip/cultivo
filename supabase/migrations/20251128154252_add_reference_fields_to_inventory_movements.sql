/*
  # Add Reference Fields to Inventory Movements

  ## Problem
  Session triggers updated to use reference_id and reference_type fields, but these
  columns don't exist in the inventory_movements table yet!

  ## Solution
  Add the missing event-driven reference fields:
  - reference_id: UUID pointing to the entity that caused this movement (session, order, audit, etc.)
  - reference_type: Text describing what type of entity (e.g., 'bucking_sessions', 'orders', 'inventory_audits')

  These replace the legacy session_id and session_type fields with a more generic,
  extensible pattern.

  ## Migration Date
  2025-11-28
*/

-- Add reference fields for event-driven architecture
ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS reference_id uuid,
  ADD COLUMN IF NOT EXISTS reference_type text;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference_id
  ON inventory_movements(reference_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference_type
  ON inventory_movements(reference_type);

-- Add comments
COMMENT ON COLUMN inventory_movements.reference_id IS
  'UUID of the entity that caused this movement (e.g., session.id, order.id, audit.id). Generic foreign key for extensibility.';

COMMENT ON COLUMN inventory_movements.reference_type IS
  'Type of entity referenced by reference_id (e.g., ''bucking_sessions'', ''orders'', ''inventory_audits''). Indicates which table reference_id points to.';

-- Verify
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_movements' AND column_name = 'reference_id'
  ) THEN
    RAISE NOTICE 'SUCCESS: reference_id column added';
  ELSE
    RAISE EXCEPTION 'FAILED: reference_id column not added';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_movements' AND column_name = 'reference_type'
  ) THEN
    RAISE NOTICE 'SUCCESS: reference_type column added';
  ELSE
    RAISE EXCEPTION 'FAILED: reference_type column not added';
  END IF;
END $$;
