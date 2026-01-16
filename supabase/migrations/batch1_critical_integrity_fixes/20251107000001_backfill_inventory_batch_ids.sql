/*
  # Batch 1.1: Backfill inventory_items.batch_id
  
  ## Purpose
  Ensures all inventory_items have a valid batch_id before adding NOT NULL constraint.
  Uses lineage chain (parent_item_id) to inherit batch_id where missing.
  
  ## Strategy
  1. Find items with explicit batch_registry_id FK relationships
  2. Inherit from parent_item_id chain
  3. Match via package_id patterns (YYMMDD-STRAIN-NN)
  4. Flag orphans for manual review
  
  ## Safety
  - Idempotent: Only updates NULL batch_ids
  - Transaction-wrapped: Full ROLLBACK on error
  - Logs all changes to temp table for audit
*/

-- =====================================================
-- STEP 1: Create audit log table for backfill
-- =====================================================

CREATE TABLE IF NOT EXISTS batch_id_backfill_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL,
  old_batch_id uuid,
  new_batch_id uuid,
  backfill_method text, -- 'explicit_fk', 'parent_chain', 'package_id_pattern', 'manual_required'
  package_id text,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE batch_id_backfill_log IS 
'Audit log for batch_id backfill operation. Tracks how each NULL batch_id was resolved.';

-- =====================================================
-- STEP 2: Backfill from explicit relationships
-- =====================================================

DO $$
DECLARE
  v_updated_count integer := 0;
  v_error_message text;
BEGIN
  RAISE NOTICE 'Starting batch_id backfill from explicit FK relationships...';
  
  -- Method 1: From trim_sessions.batch_registry_id
  WITH trim_session_batches AS (
    SELECT DISTINCT
      ii.id as item_id,
      ts.batch_registry_id as batch_id,
      ii.package_id
    FROM inventory_items ii
    JOIN trim_sessions ts ON ts.input_package_id = ii.package_id
      OR ts.session_number = ii.product_name -- Some items use session_number
    WHERE ii.batch_id IS NULL
      AND ts.batch_registry_id IS NOT NULL
  )
  UPDATE inventory_items ii
  SET batch_id = tsb.batch_id
  FROM trim_session_batches tsb
  WHERE ii.id = tsb.item_id
    AND ii.batch_id IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Log updates
  INSERT INTO batch_id_backfill_log (inventory_item_id, old_batch_id, new_batch_id, backfill_method, package_id)
  SELECT 
    ii.id,
    NULL,
    ii.batch_id,
    'explicit_fk_trim_session',
    ii.package_id
  FROM inventory_items ii
  WHERE ii.batch_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM batch_id_backfill_log WHERE inventory_item_id = ii.id
    );
  
  RAISE NOTICE 'Updated % items from trim_sessions FK', v_updated_count;
  
  -- Method 2: From packaging_sessions.batch_registry_id
  v_updated_count := 0;
  
  WITH packaging_session_batches AS (
    SELECT DISTINCT
      ii.id as item_id,
      ps.batch_registry_id as batch_id,
      ii.package_id
    FROM inventory_items ii
    JOIN packaging_sessions ps ON ps.session_number = ii.product_name
    WHERE ii.batch_id IS NULL
      AND ps.batch_registry_id IS NOT NULL
  )
  UPDATE inventory_items ii
  SET batch_id = psb.batch_id
  FROM packaging_session_batches psb
  WHERE ii.id = psb.item_id
    AND ii.batch_id IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  INSERT INTO batch_id_backfill_log (inventory_item_id, old_batch_id, new_batch_id, backfill_method, package_id)
  SELECT 
    ii.id,
    NULL,
    ii.batch_id,
    'explicit_fk_packaging_session',
    ii.package_id
  FROM inventory_items ii
  WHERE ii.batch_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM batch_id_backfill_log WHERE inventory_item_id = ii.id
    );
  
  RAISE NOTICE 'Updated % items from packaging_sessions FK', v_updated_count;

EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
    RAISE EXCEPTION 'Backfill from explicit FKs failed: %', v_error_message;
    ROLLBACK;
END $$;

-- =====================================================
-- STEP 3: Backfill from parent_item_id chain
-- =====================================================

DO $$
DECLARE
  v_updated_count integer := 0;
  v_iterations integer := 0;
  v_error_message text;
BEGIN
  RAISE NOTICE 'Starting batch_id backfill from parent_item_id lineage...';
  
  -- Recursive update: children inherit batch_id from parents
  -- Max 10 iterations to prevent infinite loops
  LOOP
    v_iterations := v_iterations + 1;
    EXIT WHEN v_iterations > 10;
    
    UPDATE inventory_items child
    SET batch_id = parent.batch_id
    FROM inventory_items parent
    WHERE child.parent_item_id = parent.id
      AND child.batch_id IS NULL
      AND parent.batch_id IS NOT NULL;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    EXIT WHEN v_updated_count = 0;
    
    RAISE NOTICE 'Iteration %: Updated % items from parent lineage', v_iterations, v_updated_count;
  END LOOP;
  
  -- Log all updates from parent chain
  INSERT INTO batch_id_backfill_log (inventory_item_id, old_batch_id, new_batch_id, backfill_method, package_id)
  SELECT 
    ii.id,
    NULL,
    ii.batch_id,
    'parent_item_lineage',
    ii.package_id
  FROM inventory_items ii
  WHERE ii.batch_id IS NOT NULL
    AND ii.parent_item_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM batch_id_backfill_log WHERE inventory_item_id = ii.id
    );
  
  RAISE NOTICE 'Completed parent lineage backfill after % iterations', v_iterations;

EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
    RAISE EXCEPTION 'Backfill from parent lineage failed: %', v_error_message;
    ROLLBACK;
END $$;

-- =====================================================
-- STEP 4: Backfill from package_id pattern matching
-- =====================================================

DO $$
DECLARE
  v_updated_count integer := 0;
  v_error_message text;
BEGIN
  RAISE NOTICE 'Starting batch_id backfill from package_id pattern matching...';
  
  -- Match package_id format: YYMMDD-STRAIN-NN
  -- Link to batch_registry.batch_number with same format
  WITH package_batch_matches AS (
    SELECT DISTINCT
      ii.id as item_id,
      br.id as batch_id,
      ii.package_id,
      br.batch_number
    FROM inventory_items ii
    CROSS JOIN batch_registry br
    WHERE ii.batch_id IS NULL
      AND ii.package_id IS NOT NULL
      AND ii.package_id ~ '^\d{6}-[A-Z]{2,5}-\d{2}$' -- Valid package ID format
      AND br.batch_number ~ '^\d{6}-[A-Z]{2,5}-\d{2}$' -- Valid batch number format
      AND SUBSTRING(ii.package_id FROM 1 FOR 12) = SUBSTRING(br.batch_number FROM 1 FOR 12) -- Match date + strain prefix
  )
  UPDATE inventory_items ii
  SET batch_id = pbm.batch_id
  FROM package_batch_matches pbm
  WHERE ii.id = pbm.item_id
    AND ii.batch_id IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Log updates
  INSERT INTO batch_id_backfill_log (inventory_item_id, old_batch_id, new_batch_id, backfill_method, package_id)
  SELECT 
    ii.id,
    NULL,
    ii.batch_id,
    'package_id_pattern_match',
    ii.package_id
  FROM inventory_items ii
  WHERE ii.batch_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM batch_id_backfill_log WHERE inventory_item_id = ii.id
    );
  
  RAISE NOTICE 'Updated % items from package_id pattern matching', v_updated_count;

EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
    RAISE EXCEPTION 'Backfill from package_id patterns failed: %', v_error_message;
    ROLLBACK;
END $$;

-- =====================================================
-- STEP 5: Flag orphans for manual review
-- =====================================================

DO $$
DECLARE
  v_orphan_count integer := 0;
BEGIN
  RAISE NOTICE 'Flagging orphaned inventory items for manual review...';
  
  -- Log orphans (items still missing batch_id)
  INSERT INTO batch_id_backfill_log (inventory_item_id, old_batch_id, new_batch_id, backfill_method, package_id)
  SELECT 
    ii.id,
    NULL,
    NULL,
    'manual_review_required',
    ii.package_id
  FROM inventory_items ii
  WHERE ii.batch_id IS NULL;
  
  GET DIAGNOSTICS v_orphan_count = ROW_COUNT;
  
  IF v_orphan_count > 0 THEN
    RAISE WARNING '% inventory items still have NULL batch_id and require manual review. Check batch_id_backfill_log WHERE backfill_method = ''manual_review_required''', v_orphan_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All inventory items have valid batch_id!';
  END IF;
END $$;

-- =====================================================
-- STEP 6: Create view for manual review
-- =====================================================

CREATE OR REPLACE VIEW v_batch_id_orphans AS
SELECT 
  ii.id,
  ii.package_id,
  ii.product_name,
  ii.category,
  ii.strain_id,
  ii.parent_item_id,
  ii.created_at,
  log.backfill_method
FROM inventory_items ii
LEFT JOIN batch_id_backfill_log log ON log.inventory_item_id = ii.id
WHERE ii.batch_id IS NULL
ORDER BY ii.created_at DESC;

COMMENT ON VIEW v_batch_id_orphans IS 
'Inventory items still missing batch_id after automated backfill. Requires manual investigation.';

-- Grant access to view
GRANT SELECT ON v_batch_id_orphans TO authenticated;

-- =====================================================
-- STEP 7: Generate backfill summary report
-- =====================================================

DO $$
DECLARE
  v_total_items integer;
  v_backfilled integer;
  v_orphans integer;
  v_summary text;
BEGIN
  SELECT COUNT(*) INTO v_total_items FROM inventory_items;
  SELECT COUNT(*) INTO v_backfilled FROM batch_id_backfill_log WHERE new_batch_id IS NOT NULL;
  SELECT COUNT(*) INTO v_orphans FROM inventory_items WHERE batch_id IS NULL;
  
  v_summary := format(
    E'\n' ||
    '========================================\n' ||
    'BATCH_ID BACKFILL SUMMARY\n' ||
    '========================================\n' ||
    'Total inventory items:        %s\n' ||
    'Successfully backfilled:      %s\n' ||
    'Still NULL (orphans):         %s\n' ||
    '========================================\n' ||
    'Backfill methods breakdown:\n',
    v_total_items, v_backfilled, v_orphans
  );
  
  RAISE NOTICE '%', v_summary;
  
  -- Show breakdown by method
  FOR v_summary IN 
    SELECT format('  %-30s: %s', backfill_method, COUNT(*))
    FROM batch_id_backfill_log
    WHERE new_batch_id IS NOT NULL
    GROUP BY backfill_method
    ORDER BY COUNT(*) DESC
  LOOP
    RAISE NOTICE '%', v_summary;
  END LOOP;
  
  IF v_orphans > 0 THEN
    RAISE NOTICE E'\n⚠️  WARNING: % orphaned items require manual review. Query v_batch_id_orphans for details.', v_orphans;
  ELSE
    RAISE NOTICE E'\n✅ SUCCESS: All items have valid batch_id!';
  END IF;
END $$;

-- =====================================================
-- MIGRATION METADATA
-- =====================================================

COMMENT ON TABLE batch_id_backfill_log IS 
'Migration: 20251107000001_backfill_inventory_batch_ids.sql
Status: Completed
Purpose: Backfill NULL batch_ids before adding NOT NULL constraint
Rollback: DELETE FROM batch_id_backfill_log; UPDATE inventory_items SET batch_id = NULL WHERE id IN (SELECT inventory_item_id FROM batch_id_backfill_log WHERE old_batch_id IS NULL);';
