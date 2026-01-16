/*
  # Backfill inventory_items.batch_id from batch_registry
  
  Maps inventory_items.batch (text) to batch_registry.batch_number
  to populate the batch_id (uuid) foreign key.
*/

-- Create audit log
CREATE TABLE IF NOT EXISTS batch_id_backfill_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL,
  old_batch_id uuid,
  new_batch_id uuid,
  backfill_method text,
  batch_text text,
  created_at timestamptz DEFAULT now()
);

-- Backfill from inventory_items.batch -> batch_registry.batch_number
DO $$
DECLARE
  v_updated_count integer := 0;
BEGIN
  RAISE NOTICE 'Backfilling batch_id from batch text column...';
  
  UPDATE inventory_items ii
  SET batch_id = br.id
  FROM batch_registry br
  WHERE ii.batch = br.batch_number
    AND ii.batch_id IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Log updates
  INSERT INTO batch_id_backfill_log (inventory_item_id, new_batch_id, backfill_method, batch_text)
  SELECT id, batch_id, 'batch_text_match', batch
  FROM inventory_items
  WHERE batch_id IS NOT NULL;
  
  RAISE NOTICE 'Updated % items from batch text', v_updated_count;
END $$;

-- Check orphans
DO $$
DECLARE
  v_orphan_count integer;
  v_total integer;
BEGIN
  SELECT COUNT(*) INTO v_total FROM inventory_items;
  SELECT COUNT(*) INTO v_orphan_count FROM inventory_items WHERE batch_id IS NULL;
  
  RAISE NOTICE 'Total items: %, With batch_id: %, Orphans: %', 
    v_total, v_total - v_orphan_count, v_orphan_count;
  
  IF v_orphan_count > 0 THEN
    RAISE WARNING '% items still missing batch_id', v_orphan_count;
  END IF;
END $$;