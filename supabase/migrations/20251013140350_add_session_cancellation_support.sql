/*
  # Add Session Cancellation Support

  ## Overview
  This migration adds comprehensive support for cancelling trim and packaging sessions.
  When a session is cancelled, the system automatically:
  - Unlinks order allocations from the cancelled session
  - Reverts allocations back to their previous workflow stage
  - Reverses inventory movements to restore inventory availability
  - Creates audit trail entries for the cancellation event

  ## Functions Created

  ### 1. handle_trim_session_cancellation()
  Triggered when a trim session status changes to 'cancelled':
  - Resets order_item_allocations back to 'allocated' stage
  - Clears active_trim_session_id reference
  - Deallocates weight from internal_bucked_inventory
  - Updates internal_bucked_inventory status back to 'available'
  - Creates inventory_movements record documenting cancellation
  - Resets timestamps for trimming process

  ### 2. handle_packaging_session_cancellation()
  Triggered when a packaging session status changes to 'cancelled':
  - Resets order_item_allocations back to previous stage (trimmed or allocated)
  - Clears active_packaging_session_id reference
  - Deallocates weight from internal_bulk_inventory
  - Creates inventory_movements record documenting cancellation
  - Resets timestamps for packaging process

  ## Important Notes
  - Cancellation can only happen from 'active' status
  - All reversals are atomic within trigger transaction
  - Audit trail is preserved - cancellation events are logged
  - Inventory is restored to available state automatically
  - Order workflow stages are automatically recalculated via views
  - Cancelled sessions are preserved for historical tracking

  ## Security
  - Uses existing RLS policies on trim_sessions and packaging_sessions
  - All inventory updates happen via secure triggers
  - Audit trail cannot be bypassed

  ## Testing Checklist
  - [ ] Cancel an active trim session - verify allocations revert to 'allocated'
  - [ ] Cancel an active packaging session - verify allocations revert correctly
  - [ ] Verify inventory is deallocated and status updated
  - [ ] Verify inventory_movements shows cancellation events
  - [ ] Verify order workflow views recalculate correctly
  - [ ] Verify cannot cancel a completed session
*/

-- Function to handle trim session cancellation
CREATE OR REPLACE FUNCTION handle_trim_session_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if status changed to 'cancelled' from 'active'
  IF NEW.session_status = 'cancelled' AND OLD.session_status = 'active' THEN

    -- Revert all order allocations linked to this session
    UPDATE order_item_allocations
    SET
      workflow_stage = 'allocated',
      active_trim_session_id = NULL,
      trimming_started_at = NULL,
      stage_entered_at = now(),
      updated_at = now()
    WHERE active_trim_session_id = NEW.id
      AND workflow_stage = 'in_trimming';

    -- Deallocate weight from internal_bucked_inventory and restore availability
    UPDATE internal_bucked_inventory
    SET
      allocated_weight_grams = GREATEST(0, allocated_weight_grams - NEW.pulled_weight),
      status = CASE
        WHEN status = 'in_use' AND (allocated_weight_grams - NEW.pulled_weight) <= 0 THEN 'available'
        ELSE status
      END,
      updated_at = now()
    WHERE package_id = NEW.package_id;

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
      'trim_cancelled',
      NEW.id,
      'trim',
      'bucked',
      NEW.package_id,
      NEW.pulled_weight,
      NEW.strain,
      NEW.batch_id,
      'Trim session cancelled - ' || NEW.pulled_weight || 'g deallocated and returned to available inventory. Trimmer: ' || NEW.trimmer_name
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle packaging session cancellation
CREATE OR REPLACE FUNCTION handle_packaging_session_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  bulk_product_type text;
  bulk_inventory_id uuid;
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

    -- Map product_type to bulk product type
    bulk_product_type := CASE
      WHEN NEW.product_type = '8ths' THEN 'flower'
      WHEN NEW.product_type = 'smalls' THEN 'smalls'
      ELSE NULL
    END;

    -- Deallocate weight from internal_bulk_inventory if applicable
    IF bulk_product_type IS NOT NULL AND NEW.pull_weight > 0 THEN

      -- Find the bulk inventory that was allocated
      SELECT id INTO bulk_inventory_id
      FROM internal_bulk_inventory
      WHERE strain = NEW.strain
        AND product_type = bulk_product_type
        AND allocated_weight_grams > 0
      ORDER BY trim_date DESC
      LIMIT 1;

      -- If found, deallocate the weight
      IF bulk_inventory_id IS NOT NULL THEN
        UPDATE internal_bulk_inventory
        SET
          allocated_weight_grams = GREATEST(0, allocated_weight_grams - NEW.pull_weight),
          updated_at = now()
        WHERE id = bulk_inventory_id;

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
          bulk_inventory_id::text,
          NEW.pull_weight,
          NEW.strain,
          NEW.batch_id,
          'Packaging session cancelled - ' || NEW.pull_weight || 'g deallocated and returned to available inventory. Packager: ' || NEW.packager_name
        );
      ELSE
        -- Log cancellation even if bulk inventory not found
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
          'NOT_FOUND',
          NEW.pull_weight,
          NEW.strain,
          NEW.batch_id,
          'Packaging session cancelled (bulk inventory not found) - Packager: ' || NEW.packager_name
        );
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for trim session cancellation
DROP TRIGGER IF EXISTS trim_session_cancellation_trigger ON trim_sessions;
CREATE TRIGGER trim_session_cancellation_trigger
  AFTER UPDATE ON trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION handle_trim_session_cancellation();

-- Create trigger for packaging session cancellation
DROP TRIGGER IF EXISTS packaging_session_cancellation_trigger ON packaging_sessions;
CREATE TRIGGER packaging_session_cancellation_trigger
  AFTER UPDATE ON packaging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION handle_packaging_session_cancellation();

-- Update session_order_links view to exclude cancelled sessions by default
-- (cancelled sessions can still be queried directly from tables if needed)
CREATE OR REPLACE VIEW session_order_links AS
SELECT DISTINCT
  ts.id as session_id,
  'trim' as session_type,
  ts.session_status,
  ts.trimmer_name as worker_name,
  ts.strain,
  oia.order_id,
  o.order_number,
  COUNT(DISTINCT oia.order_item_id) as affected_items,
  ts.started_at as session_started_at,
  ts.completed_at as session_completed_at
FROM trim_sessions ts
INNER JOIN order_item_allocations oia ON oia.active_trim_session_id = ts.id
INNER JOIN orders o ON o.id = oia.order_id
WHERE ts.session_status != 'cancelled'
GROUP BY ts.id, ts.session_status, ts.trimmer_name, ts.strain, oia.order_id, o.order_number, ts.started_at, ts.completed_at

UNION ALL

SELECT DISTINCT
  ps.id as session_id,
  'packaging' as session_type,
  ps.session_status,
  ps.packager_name as worker_name,
  ps.strain,
  oia.order_id,
  o.order_number,
  COUNT(DISTINCT oia.order_item_id) as affected_items,
  ps.started_at as session_started_at,
  ps.completed_at as session_completed_at
FROM packaging_sessions ps
INNER JOIN order_item_allocations oia ON oia.active_packaging_session_id = ps.id
INNER JOIN orders o ON o.id = oia.order_id
WHERE ps.session_status != 'cancelled'
GROUP BY ps.id, ps.session_status, ps.packager_name, ps.strain, oia.order_id, o.order_number, ps.started_at, ps.completed_at;

-- Add comments for documentation
COMMENT ON FUNCTION handle_trim_session_cancellation() IS 'Automatically reverts allocations and inventory when a trim session is cancelled';
COMMENT ON FUNCTION handle_packaging_session_cancellation() IS 'Automatically reverts allocations and inventory when a packaging session is cancelled';
