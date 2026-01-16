/*
  # Phase 1: Batch Lifecycle Automation Triggers

  ## Overview
  This migration creates database triggers that automatically manage batch lifecycle
  states and track all production events in real-time.

  ## Triggers Created

  1. **Trim Session Triggers**
     - On trim session start: Log event, update batch state to 'in_trim'
     - On trim session complete: Log production, add packages to lineage, update stage weights

  2. **Packaging Session Triggers**
     - On packaging session start: Log event, update batch state to 'in_packaging'
     - On packaging session complete: Log production, add packages to lineage, update stage weights

  3. **Consolidated Package Triggers**
     - On package creation: Inherit batch from source session, add to lineage

  4. **Batch Stage Tracking Triggers**
     - On weight update: Check for depletion, update batch lifecycle state

  5. **Batch Allocation Triggers**
     - On allocation created: Update allocated weights in stage tracking
     - On allocation fulfilled: Log event

  ## Lifecycle State Transitions

  created → bucked → in_trim → bulk_available → in_packaging → packaged → partially_depleted → depleted → archived
*/

-- =====================================================
-- TRIGGER 1: Trim Session Started
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_trim_session_started()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch_id uuid;
BEGIN
  -- Get batch_registry_id from the session
  IF NEW.batch_registry_id IS NOT NULL THEN
    v_batch_id := NEW.batch_registry_id;

    -- Log lifecycle event
    PERFORM log_batch_lifecycle_event(
      v_batch_id,
      'state_transition',
      'bucked',
      'in_trim',
      NEW.trimmer_name,
      'Trim session started: ' || NEW.id::text
    );

    -- Log production history
    PERFORM log_batch_production(
      v_batch_id,
      'trim_started',
      NEW.id,
      'trim',
      'bucked',
      NEW.pulled_weight,
      'bulk',
      NULL,
      NEW.trimmer_name,
      'Started trim session for ' || NEW.strain
    );

    -- Update batch lifecycle state if not already in trim
    UPDATE batch_registry
    SET
      lifecycle_state = CASE
        WHEN lifecycle_state = 'bucked' THEN 'in_trim'
        ELSE lifecycle_state
      END,
      trimming_started_at = CASE
        WHEN trimming_started_at IS NULL THEN NEW.started_at
        ELSE trimming_started_at
      END,
      updated_at = now()
    WHERE id = v_batch_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for trim session started
DROP TRIGGER IF EXISTS on_trim_session_started ON trim_sessions;
CREATE TRIGGER on_trim_session_started
  AFTER INSERT ON trim_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'active')
  EXECUTE FUNCTION trigger_trim_session_started();

-- =====================================================
-- TRIGGER 2: Trim Session Completed
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_trim_session_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch_id uuid;
  v_batch_number text;
  v_consolidated_packages jsonb;
BEGIN
  -- Only process if session is being marked as completed
  IF NEW.session_status = 'completed' AND OLD.session_status = 'active' THEN
    v_batch_id := NEW.batch_registry_id;

    IF v_batch_id IS NOT NULL THEN
      -- Get batch number
      SELECT batch_number INTO v_batch_number
      FROM batch_registry
      WHERE id = v_batch_id;

      -- Log production history with all outputs
      PERFORM log_batch_production(
        v_batch_id,
        'trim_completed',
        NEW.id,
        'trim',
        'bucked',
        NEW.pulled_weight,
        'bulk',
        (NEW.big_buds_grams + NEW.small_buds_grams + NEW.trim_grams),
        NEW.trimmer_name,
        format('Trim completed: %sg flower, %sg smalls, %sg trim, %sg waste',
          NEW.big_buds_grams, NEW.small_buds_grams, NEW.trim_grams, NEW.waste_grams)
      );

      -- Update batch lifecycle state to bulk_available
      UPDATE batch_registry
      SET
        lifecycle_state = 'bulk_available',
        updated_at = now()
      WHERE id = v_batch_id;

      -- Log state transition
      PERFORM log_batch_lifecycle_event(
        v_batch_id,
        'state_transition',
        'in_trim',
        'bulk_available',
        NEW.trimmer_name,
        'Trim session completed: ' || NEW.id::text,
        jsonb_build_object(
          'flower_grams', NEW.big_buds_grams,
          'smalls_grams', NEW.small_buds_grams,
          'trim_grams', NEW.trim_grams,
          'waste_grams', NEW.waste_grams,
          'bucked_smalls_grams', NEW.bucked_smalls_grams
        )
      );

      -- Note: Package lineage will be added by consolidated_packages trigger
      -- when packages are actually created by the consolidation system
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for trim session completed
DROP TRIGGER IF EXISTS on_trim_session_completed ON trim_sessions;
CREATE TRIGGER on_trim_session_completed
  AFTER UPDATE ON trim_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'completed' AND OLD.session_status = 'active')
  EXECUTE FUNCTION trigger_trim_session_completed();

-- =====================================================
-- TRIGGER 3: Trim Session Cancelled
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_trim_session_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch_id uuid;
BEGIN
  IF NEW.session_status = 'cancelled' AND OLD.session_status = 'active' THEN
    v_batch_id := NEW.batch_registry_id;

    IF v_batch_id IS NOT NULL THEN
      -- Log cancellation event
      PERFORM log_batch_production(
        v_batch_id,
        'trim_started', -- Using existing event type
        NEW.id,
        'trim',
        NULL,
        NULL,
        NULL,
        NULL,
        NEW.trimmer_name,
        'Trim session cancelled: ' || COALESCE(NEW.notes, 'No reason provided')
      );

      -- Revert batch state if needed
      UPDATE batch_registry
      SET
        lifecycle_state = CASE
          WHEN lifecycle_state = 'in_trim' THEN 'bucked'
          ELSE lifecycle_state
        END,
        updated_at = now()
      WHERE id = v_batch_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for trim session cancelled
DROP TRIGGER IF EXISTS on_trim_session_cancelled ON trim_sessions;
CREATE TRIGGER on_trim_session_cancelled
  AFTER UPDATE ON trim_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'cancelled' AND OLD.session_status = 'active')
  EXECUTE FUNCTION trigger_trim_session_cancelled();

-- =====================================================
-- TRIGGER 4: Packaging Session Started
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_packaging_session_started()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch_id uuid;
BEGIN
  IF NEW.batch_registry_id IS NOT NULL THEN
    v_batch_id := NEW.batch_registry_id;

    -- Log lifecycle event
    PERFORM log_batch_lifecycle_event(
      v_batch_id,
      'state_transition',
      'bulk_available',
      'in_packaging',
      NEW.packager_name,
      'Packaging session started: ' || NEW.id::text
    );

    -- Log production history
    PERFORM log_batch_production(
      v_batch_id,
      'packaging_started',
      NEW.id,
      'packaging',
      'bulk',
      NEW.pull_weight,
      'packaged',
      NULL,
      NEW.packager_name,
      'Started packaging session for ' || NEW.strain
    );

    -- Update batch lifecycle state
    UPDATE batch_registry
    SET
      lifecycle_state = CASE
        WHEN lifecycle_state IN ('bulk_available', 'packaged') THEN 'in_packaging'
        ELSE lifecycle_state
      END,
      packaging_started_at = CASE
        WHEN packaging_started_at IS NULL THEN NEW.started_at
        ELSE packaging_started_at
      END,
      updated_at = now()
    WHERE id = v_batch_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for packaging session started
DROP TRIGGER IF EXISTS on_packaging_session_started ON packaging_sessions;
CREATE TRIGGER on_packaging_session_started
  AFTER INSERT ON packaging_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'active')
  EXECUTE FUNCTION trigger_packaging_session_started();

-- =====================================================
-- TRIGGER 5: Packaging Session Completed
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_packaging_session_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch_id uuid;
  v_batch_number text;
  v_total_packaged_weight numeric;
BEGIN
  IF NEW.session_status = 'completed' AND OLD.session_status = 'active' THEN
    v_batch_id := NEW.batch_registry_id;

    IF v_batch_id IS NOT NULL THEN
      -- Get batch number
      SELECT batch_number INTO v_batch_number
      FROM batch_registry
      WHERE id = v_batch_id;

      -- Calculate total packaged weight
      v_total_packaged_weight := (NEW.units_3_5g * 3.5) + (NEW.units_14g * 14) + (NEW.units_454g * 454);

      -- Log production history
      PERFORM log_batch_production(
        v_batch_id,
        'packaging_completed',
        NEW.id,
        'packaging',
        'bulk',
        NEW.pull_weight,
        'packaged',
        v_total_packaged_weight,
        NEW.packager_name,
        format('Packaging completed: %s units 3.5g, %s units 14g, %s units 454g, %sg trim, %sg waste',
          NEW.units_3_5g, NEW.units_14g, NEW.units_454g, NEW.trim_grams, NEW.waste_grams)
      );

      -- Update batch lifecycle state to packaged
      UPDATE batch_registry
      SET
        lifecycle_state = 'packaged',
        updated_at = now()
      WHERE id = v_batch_id;

      -- Log state transition
      PERFORM log_batch_lifecycle_event(
        v_batch_id,
        'state_transition',
        'in_packaging',
        'packaged',
        NEW.packager_name,
        'Packaging session completed: ' || NEW.id::text,
        jsonb_build_object(
          'units_3_5g', NEW.units_3_5g,
          'units_14g', NEW.units_14g,
          'units_454g', NEW.units_454g,
          'total_packaged_grams', v_total_packaged_weight,
          'trim_grams', NEW.trim_grams,
          'waste_grams', NEW.waste_grams
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for packaging session completed
DROP TRIGGER IF EXISTS on_packaging_session_completed ON packaging_sessions;
CREATE TRIGGER on_packaging_session_completed
  AFTER UPDATE ON packaging_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'completed' AND OLD.session_status = 'active')
  EXECUTE FUNCTION trigger_packaging_session_completed();

-- =====================================================
-- TRIGGER 6: Packaging Session Cancelled
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_packaging_session_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch_id uuid;
BEGIN
  IF NEW.session_status = 'cancelled' AND OLD.session_status = 'active' THEN
    v_batch_id := NEW.batch_registry_id;

    IF v_batch_id IS NOT NULL THEN
      -- Log cancellation event
      PERFORM log_batch_production(
        v_batch_id,
        'packaging_started', -- Using existing event type
        NEW.id,
        'packaging',
        NULL,
        NULL,
        NULL,
        NULL,
        NEW.packager_name,
        'Packaging session cancelled: ' || COALESCE(NEW.notes, 'No reason provided')
      );

      -- Revert batch state if needed
      UPDATE batch_registry
      SET
        lifecycle_state = CASE
          WHEN lifecycle_state = 'in_packaging' THEN 'bulk_available'
          ELSE lifecycle_state
        END,
        updated_at = now()
      WHERE id = v_batch_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for packaging session cancelled
DROP TRIGGER IF EXISTS on_packaging_session_cancelled ON packaging_sessions;
CREATE TRIGGER on_packaging_session_cancelled
  AFTER UPDATE ON packaging_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'cancelled' AND OLD.session_status = 'active')
  EXECUTE FUNCTION trigger_packaging_session_cancelled();

-- =====================================================
-- TRIGGER 7: Consolidated Package Created
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_consolidated_package_created()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch_id uuid;
  v_session_type text;
  v_stage text;
BEGIN
  -- Inherit batch from source session
  IF NEW.source_type = 'trim_session' THEN
    SELECT batch_registry_id INTO v_batch_id
    FROM trim_sessions
    WHERE id = NEW.source_id;

    v_session_type := 'trim';

    -- Determine stage based on product type
    v_stage := CASE
      WHEN NEW.product_type = 'Flower' THEN 'bulk_flower'
      WHEN NEW.product_type = 'Smalls' THEN 'bulk_smalls'
      WHEN NEW.product_type = 'Trim' THEN 'bulk_trim'
      ELSE 'bulk_flower'
    END;

  ELSIF NEW.source_type = 'packaging_session' THEN
    SELECT batch_registry_id INTO v_batch_id
    FROM packaging_sessions
    WHERE id = NEW.source_id;

    v_session_type := 'packaging';

    -- Determine stage based on product type
    v_stage := CASE
      WHEN NEW.product_type LIKE '%3.5g%' THEN 'packaged_3_5g'
      WHEN NEW.product_type LIKE '%14g%' THEN 'packaged_14g'
      WHEN NEW.product_type LIKE '%454g%' OR NEW.product_type LIKE '%lb%' THEN 'packaged_454g'
      WHEN NEW.product_type = 'Trim' THEN 'bulk_trim'
      ELSE 'packaged_3_5g'
    END;
  END IF;

  -- Update consolidated package with batch info
  IF v_batch_id IS NOT NULL THEN
    UPDATE consolidated_packages
    SET
      batch_id = v_batch_id,
      batch_number = (SELECT batch_number FROM batch_registry WHERE id = v_batch_id)
    WHERE id = NEW.id;

    -- Add package to batch lineage
    PERFORM add_package_to_batch(
      v_batch_id,
      NEW.package_id,
      NEW.product_type,
      v_stage,
      NEW.weight_grams,
      NEW.source_id,
      v_session_type
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for consolidated package created
DROP TRIGGER IF EXISTS on_consolidated_package_created ON consolidated_packages;
CREATE TRIGGER on_consolidated_package_created
  AFTER INSERT ON consolidated_packages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_consolidated_package_created();

-- =====================================================
-- TRIGGER 8: Batch Stage Weight Changed - Check Depletion
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_batch_stage_weight_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_available numeric;
  v_batch_lifecycle text;
BEGIN
  -- Calculate total available weight across all stages for this batch
  SELECT COALESCE(SUM(available_weight_grams), 0) INTO v_total_available
  FROM batch_stage_tracking
  WHERE batch_id = NEW.batch_id;

  -- Get current lifecycle state
  SELECT lifecycle_state INTO v_batch_lifecycle
  FROM batch_registry
  WHERE id = NEW.batch_id;

  -- Check for depletion
  IF v_total_available <= 0 AND v_batch_lifecycle != 'depleted' THEN
    -- Mark batch as depleted
    UPDATE batch_registry
    SET
      lifecycle_state = 'depleted',
      depleted_at = now(),
      updated_at = now()
    WHERE id = NEW.batch_id;

    -- Log depletion event
    PERFORM log_batch_lifecycle_event(
      NEW.batch_id,
      'depletion_detected',
      v_batch_lifecycle,
      'depleted',
      'system',
      'All batch material has been consumed or allocated'
    );

    PERFORM log_batch_production(
      NEW.batch_id,
      'batch_depleted',
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      'system',
      'Batch fully depleted - no available weight remaining'
    );

  -- Check for partial depletion (some stages empty, others not)
  ELSIF v_total_available > 0 AND EXISTS (
    SELECT 1 FROM batch_stage_tracking
    WHERE batch_id = NEW.batch_id AND available_weight_grams <= 0
  ) AND v_batch_lifecycle NOT IN ('depleted', 'partially_depleted') THEN
    UPDATE batch_registry
    SET
      lifecycle_state = 'partially_depleted',
      updated_at = now()
    WHERE id = NEW.batch_id;

    PERFORM log_batch_lifecycle_event(
      NEW.batch_id,
      'state_transition',
      v_batch_lifecycle,
      'partially_depleted',
      'system',
      'Some stages depleted, others still available'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for batch stage weight changes
DROP TRIGGER IF EXISTS on_batch_stage_weight_changed ON batch_stage_tracking;
CREATE TRIGGER on_batch_stage_weight_changed
  AFTER UPDATE ON batch_stage_tracking
  FOR EACH ROW
  WHEN (OLD.available_weight_grams IS DISTINCT FROM NEW.available_weight_grams)
  EXECUTE FUNCTION trigger_batch_stage_weight_changed();

-- =====================================================
-- TRIGGER 9: Batch Allocation Created
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_batch_allocation_created()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Log allocation event
  PERFORM log_batch_lifecycle_event(
    NEW.batch_id,
    'allocation_change',
    NULL,
    NULL,
    'system',
    format('Allocation created for order item: %sg at %s stage',
      NEW.allocated_weight_grams, NEW.allocation_stage),
    jsonb_build_object(
      'order_item_id', NEW.order_item_id,
      'allocated_weight', NEW.allocated_weight_grams,
      'stage', NEW.allocation_stage
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for allocation created
DROP TRIGGER IF EXISTS on_batch_allocation_created ON batch_allocations;
CREATE TRIGGER on_batch_allocation_created
  AFTER INSERT ON batch_allocations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_batch_allocation_created();

-- =====================================================
-- TRIGGER 10: Batch Allocation Fulfilled
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_batch_allocation_fulfilled()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'fulfilled' AND OLD.status != 'fulfilled' THEN
    -- Log fulfillment event
    PERFORM log_batch_lifecycle_event(
      NEW.batch_id,
      'allocation_change',
      NULL,
      NULL,
      'system',
      format('Allocation fulfilled for order item: %sg',
        NEW.allocated_weight_grams),
      jsonb_build_object(
        'order_item_id', NEW.order_item_id,
        'allocated_weight', NEW.allocated_weight_grams,
        'fulfilled_at', NEW.fulfilled_at
      )
    );

    PERFORM log_batch_production(
      NEW.batch_id,
      'allocation_fulfilled',
      NULL,
      NULL,
      NEW.allocation_stage,
      NEW.allocated_weight_grams,
      NULL,
      NULL,
      'system',
      'Order allocation fulfilled'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for allocation fulfilled
DROP TRIGGER IF EXISTS on_batch_allocation_fulfilled ON batch_allocations;
CREATE TRIGGER on_batch_allocation_fulfilled
  AFTER UPDATE ON batch_allocations
  FOR EACH ROW
  WHEN (NEW.status = 'fulfilled' AND OLD.status != 'fulfilled')
  EXECUTE FUNCTION trigger_batch_allocation_fulfilled();

-- =====================================================
-- Add comments
-- =====================================================

COMMENT ON FUNCTION trigger_trim_session_started IS 'Auto-update batch lifecycle when trim session starts';
COMMENT ON FUNCTION trigger_trim_session_completed IS 'Auto-update batch lifecycle and log production when trim completes';
COMMENT ON FUNCTION trigger_packaging_session_started IS 'Auto-update batch lifecycle when packaging session starts';
COMMENT ON FUNCTION trigger_packaging_session_completed IS 'Auto-update batch lifecycle and log production when packaging completes';
COMMENT ON FUNCTION trigger_consolidated_package_created IS 'Auto-inherit batch from source session and add to lineage';
COMMENT ON FUNCTION trigger_batch_stage_weight_changed IS 'Detect batch depletion when stage weights reach zero';
COMMENT ON FUNCTION trigger_batch_allocation_created IS 'Log when allocations are created against batch';
COMMENT ON FUNCTION trigger_batch_allocation_fulfilled IS 'Log when allocations are fulfilled';
