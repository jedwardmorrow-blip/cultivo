/*
  # Trigger Validation and Error Handling

  1. Purpose
    - Validate movements before trigger execution
    - Log trigger errors for debugging
    - Provide error recovery mechanisms
    - Monitor trigger health

  2. Components
    - Validation function (BEFORE INSERT trigger)
    - Error logging table
    - Error recovery procedures

  3. Validations
    - Required fields based on movement_kind
    - Item exists in inventory_items
    - Quantity is positive
    - Unit is valid

  4. Notes
    - Part of Phase 6: Database Triggers
    - Helps prevent invalid movements
    - Provides debugging information
*/

-- Create error log table
CREATE TABLE IF NOT EXISTS inventory_movement_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_data jsonb,
  error_message text NOT NULL,
  error_code text,
  error_context jsonb,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_movement_errors_created ON inventory_movement_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movement_errors_unresolved ON inventory_movement_errors(resolved_at) WHERE resolved_at IS NULL;

COMMENT ON TABLE inventory_movement_errors IS
  'Logs errors that occur during movement processing for debugging and monitoring';

-- Grant access
ALTER TABLE inventory_movement_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view movement errors"
  ON inventory_movement_errors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert movement errors"
  ON inventory_movement_errors
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Validation function
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

  -- Validate unit is 'g' (grams)
  IF NEW.unit != 'g' THEN
    RAISE EXCEPTION 'unit must be ''g'' (grams), got: %', NEW.unit;
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
  'Validates movement data before insert. Logs errors to inventory_movement_errors table.';

-- Create validation trigger (runs BEFORE INSERT)
DROP TRIGGER IF EXISTS trg_validate_movement ON inventory_movements;

CREATE TRIGGER trg_validate_movement
  BEFORE INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION fn_validate_movement();

COMMENT ON TRIGGER trg_validate_movement ON inventory_movements IS
  'Validates movement data before insert to prevent invalid movements';

-- Function to get recent errors
CREATE OR REPLACE FUNCTION get_recent_movement_errors(p_limit integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  movement_data jsonb,
  error_message text,
  error_code text,
  error_context jsonb,
  created_at timestamptz,
  resolved_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ime.id,
    ime.movement_data,
    ime.error_message,
    ime.error_code,
    ime.error_context,
    ime.created_at,
    ime.resolved_at
  FROM inventory_movement_errors ime
  ORDER BY ime.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_recent_movement_errors IS
  'Returns recent movement errors for monitoring and debugging';

GRANT EXECUTE ON FUNCTION get_recent_movement_errors TO authenticated;

-- Function to mark error as resolved
CREATE OR REPLACE FUNCTION resolve_movement_error(p_error_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE inventory_movement_errors
  SET resolved_at = now(),
      resolved_by = auth.uid()
  WHERE id = p_error_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION resolve_movement_error IS
  'Marks a movement error as resolved';

GRANT EXECUTE ON FUNCTION resolve_movement_error TO authenticated;
