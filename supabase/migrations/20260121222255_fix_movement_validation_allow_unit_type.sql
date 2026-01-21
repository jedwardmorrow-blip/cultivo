/*
  # Fix Movement Validation to Allow 'unit' Type

  ## Problem
  The validation trigger `fn_validate_movement()` only allows unit='g', but packaged products
  are counted as units, not weighed in grams. This blocks finalization of packaging sessions.

  Error: "unit must be 'g' (grams), got: unit"

  ## Root Cause
  Line 86-88 in migration 20251124212728_add_trigger_validation.sql:
  ```sql
  IF NEW.unit != 'g' THEN
    RAISE EXCEPTION 'unit must be ''g'' (grams), got: %', NEW.unit;
  END IF;
  ```

  This validation is too restrictive. The inventory_items and inventory_movements tables
  both have CHECK constraints allowing EITHER 'g' OR 'unit':
  ```sql
  CHECK (unit IN ('g', 'unit'))
  ```

  ## Use Cases for Each Unit Type

  **unit='g' (grams):**
  - Bulk Flower (Bucked) - weight-based
  - Bulk Flower (Trimmed) - weight-based
  - Bulk Smalls (Bucked) - weight-based
  - Bulk Smalls (Trimmed) - weight-based
  - Bulk Trim (Trimmed) - weight-based

  **unit='unit' (count-based):**
  - Packaged - Strain X - 3.5g - counts individual packages
  - Packaged - Strain X - 14g - counts individual packages
  - Packaged - Strain X - 1lb - counts individual packages

  ## Solution
  Update validation trigger to allow both 'g' and 'unit', matching the CHECK constraint.

  ## Related
  - SESSION-2026-01-21-UUID-AGGREGATION-HOTFIX - Where this error was discovered
  - 20251124212728_add_trigger_validation.sql - Original trigger
  - 20260121220602_fix_finalize_session_aggregated_group_by.sql - Where inventory creation was added
*/

-- Update validation function to allow both 'g' and 'unit'
CREATE OR REPLACE FUNCTION fn_validate_movement()
RETURNS TRIGGER AS $$
DECLARE
  item_exists boolean;
BEGIN
  -- Validate required fields
  IF NEW.movement_kind IS NULL THEN
    RAISE EXCEPTION 'movement_kind is required';
  END IF;

  IF NEW.qty IS NULL OR NEW.qty <= 0 THEN
    RAISE EXCEPTION 'qty must be a positive number, got: %', NEW.qty;
  END IF;

  IF NEW.unit IS NULL THEN
    RAISE EXCEPTION 'unit is required';
  END IF;

  -- Validate unit is 'g' (grams) OR 'unit' (count-based)
  -- Updated to match CHECK constraint on inventory_movements table
  IF NEW.unit NOT IN ('g', 'unit') THEN
    RAISE EXCEPTION 'unit must be ''g'' (grams) or ''unit'' (count), got: %', NEW.unit;
  END IF;

  -- Validate source_item_id or dest_item_id is provided
  IF NEW.source_item_id IS NULL AND NEW.dest_item_id IS NULL THEN
    RAISE EXCEPTION 'Either source_item_id or dest_item_id must be provided';
  END IF;

  -- Validate movement_kind is valid
  IF NEW.movement_kind NOT IN (
    'RECEIPT', 'CONSUME', 'PRODUCE', 'FULFILLMENT', 
    'RETURN', 'RESERVE', 'RELEASE', 'ADJUSTMENT', 'RECONCILIATION'
  ) THEN
    RAISE EXCEPTION 'Invalid movement_kind: %', NEW.movement_kind;
  END IF;

  -- Validate target item exists
  IF NEW.dest_item_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM inventory_items WHERE id = NEW.dest_item_id) INTO item_exists;
    IF NOT item_exists THEN
      RAISE EXCEPTION 'dest_item_id does not exist: %', NEW.dest_item_id;
    END IF;
  END IF;

  IF NEW.source_item_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM inventory_items WHERE id = NEW.source_item_id) INTO item_exists;
    IF NOT item_exists THEN
      RAISE EXCEPTION 'source_item_id does not exist: %', NEW.source_item_id;
    END IF;
  END IF;

  -- Set created_by to current user if not provided
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  -- Set created_at if not provided
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log validation error
    INSERT INTO inventory_movement_errors (movement_data, error_message, error_code, error_context)
    VALUES (
      row_to_json(NEW)::jsonb,
      SQLERRM,
      SQLSTATE,
      jsonb_build_object(
        'trigger', 'fn_validate_movement',
        'movement_kind', NEW.movement_kind,
        'qty', NEW.qty,
        'unit', NEW.unit
      )
    );
    
    -- Re-raise to block the insert
    RAISE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_validate_movement IS
  'Validates movement data before insert. Allows unit to be either ''g'' (grams) or ''unit'' (count). Logs errors to inventory_movement_errors table.';
