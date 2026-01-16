/*
  # Fix packaging session cancellation trigger for consolidated packages

  1. Changes
    - Updates handle_packaging_session_cancellation() to work with consolidated packages
    - Removes references to the old product_type field
    - Deallocates from both flower and smalls inventory when cancelling
    
  2. Notes
    - This fixes the error: record "new" has no field "product_type"
    - Now compatible with the consolidated packages system
*/

CREATE OR REPLACE FUNCTION handle_packaging_session_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  flower_inventory_id uuid;
  smalls_inventory_id uuid;
BEGIN
  -- Only process if status changed to 'cancelled' from 'active'
  IF NEW.session_status = 'cancelled' AND OLD.session_status = 'active' THEN

    -- Revert all order allocations linked to this session
    -- Note: We revert to 'trimmed' if they came from trimmed, or 'allocated' if they skipped trimming
    UPDATE order_item_allocations
    SET
      workflow_stage = CASE
        WHEN trimming_completed_at IS NOT NULL THEN 'trimmed'::allocation_workflow_stage
        ELSE 'allocated'::allocation_workflow_stage
      END,
      active_packaging_session_id = NULL,
      packaging_started_at = NULL,
      stage_entered_at = now(),
      updated_at = now()
    WHERE active_packaging_session_id = NEW.id
      AND workflow_stage = 'in_packaging';

    -- Deallocate weight from BOTH flower and smalls bulk inventory
    -- Since we use consolidated packages now, sessions can pull from both types
    IF NEW.pull_weight > 0 THEN
      
      -- Find flower inventory
      SELECT id INTO flower_inventory_id
      FROM internal_bulk_inventory
      WHERE strain = NEW.strain
        AND product_type = 'flower'
        AND allocated_weight_grams > 0
      ORDER BY trim_date DESC
      LIMIT 1;

      -- Deallocate from flower inventory if found
      IF flower_inventory_id IS NOT NULL THEN
        UPDATE internal_bulk_inventory
        SET
          allocated_weight_grams = GREATEST(0, allocated_weight_grams - (NEW.pull_weight / 2)),
          updated_at = now()
        WHERE id = flower_inventory_id;
      END IF;

      -- Find smalls inventory
      SELECT id INTO smalls_inventory_id
      FROM internal_bulk_inventory
      WHERE strain = NEW.strain
        AND product_type = 'smalls'
        AND allocated_weight_grams > 0
      ORDER BY trim_date DESC
      LIMIT 1;

      -- Deallocate from smalls inventory if found
      IF smalls_inventory_id IS NOT NULL THEN
        UPDATE internal_bulk_inventory
        SET
          allocated_weight_grams = GREATEST(0, allocated_weight_grams - (NEW.pull_weight / 2)),
          updated_at = now()
        WHERE id = smalls_inventory_id;
      END IF;

      -- Create inventory movement record for cancellation
      INSERT INTO inventory_movements (
        movement_date,
        movement_type,
        session_id,
        session_type,
        source_inventory_type,
        source_identifier,
        source_weight_change,
        strain,
        batch_id,
        notes
      )
      VALUES (
        now(),
        'packaging_cancelled',
        NEW.id,
        'packaging',
        'bulk',
        NEW.strain,
        NEW.pull_weight,
        NEW.strain,
        NEW.batch_id,
        'Packaging session cancelled - ' || NEW.pull_weight || 'g deallocated and returned to available inventory. Packager: ' || NEW.packager_name
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_packaging_session_cancellation() IS 'Automatically reverts allocations and inventory when a packaging session is cancelled. Updated for consolidated packages system.';
