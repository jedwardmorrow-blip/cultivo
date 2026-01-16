/*
  # Add batch_id NOT NULL and Immutability Constraints
*/

-- Verify all batch_ids are populated
DO $$
DECLARE
  v_null_count integer;
BEGIN
  SELECT COUNT(*) INTO v_null_count FROM inventory_items WHERE batch_id IS NULL;
  
  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'Cannot add NOT NULL: % items have NULL batch_id', v_null_count;
  END IF;
  
  RAISE NOTICE 'Verified: All items have batch_id';
END $$;

-- Add NOT NULL constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' 
      AND column_name = 'batch_id' 
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE inventory_items ALTER COLUMN batch_id SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint on batch_id';
  END IF;
END $$;

-- Add FK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_items_batch_id_fkey'
  ) THEN
    ALTER TABLE inventory_items
    ADD CONSTRAINT inventory_items_batch_id_fkey
    FOREIGN KEY (batch_id) REFERENCES batch_registry(id)
    ON DELETE RESTRICT;
    
    RAISE NOTICE 'Added FK constraint on batch_id';
  END IF;
END $$;

-- Immutability trigger
CREATE OR REPLACE FUNCTION fn_prevent_batch_id_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.batch_id IS DISTINCT FROM NEW.batch_id THEN
    RAISE EXCEPTION 'batch_id is immutable'
    USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_batch_id_update ON inventory_items;

CREATE TRIGGER trg_prevent_batch_id_update
  BEFORE INSERT OR UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_prevent_batch_id_update();

CREATE INDEX IF NOT EXISTS idx_inventory_items_batch_id ON inventory_items(batch_id);