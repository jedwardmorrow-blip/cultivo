/*
  # Session Inventory Reservation System

  ## Overview
  Creates a comprehensive inventory reservation system for production sessions.
  When a trim, bucking, or packaging session starts, the system automatically:
  - Reserves the required inventory (prevents double-allocation)
  - Creates an audit trail in inventory_movements
  - Updates available_qty and reserved_qty on inventory_items

  When a session is cancelled, the system automatically:
  - Releases the reserved inventory back to available
  - Creates a cancellation audit trail

  ## Why This Is Critical
  Without this system:
  - Multiple users can pull the same inventory simultaneously
  - No way to track what inventory is actively being worked on
  - Risk of over-allocation and production errors
  - No audit trail of reservations

  ## Tables Modified
  - inventory_items: Uses existing available_qty and reserved_qty columns
  - inventory_movements: Creates audit records for all reservations/releases

  ## Functions Created
  - reserve_inventory_on_session_start(): Reserves inventory when session starts
  - release_inventory_on_session_cancel(): Releases inventory when session cancelled

  ## Triggers Created
  - reserve_packaging_inventory: Fires on packaging_sessions INSERT
  - release_packaging_inventory: Fires on packaging_sessions UPDATE (to cancelled)
  - reserve_trim_inventory: Fires on trim_sessions INSERT  
  - release_trim_inventory: Fires on trim_sessions UPDATE (to cancelled)
  - reserve_bucking_inventory: Fires on bucking_sessions INSERT
  - release_bucking_inventory: Fires on bucking_sessions UPDATE (to cancelled)

  ## Security
  - Uses SECURITY DEFINER for proper permissions
  - Validates inventory exists and has sufficient quantity
  - Creates complete audit trail
  - Transaction-safe (all-or-nothing updates)
*/

-- =====================================================
-- FUNCTION: Reserve Inventory on Session Start
-- =====================================================

CREATE OR REPLACE FUNCTION reserve_inventory_on_session_start()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_inventory_item RECORD;
  v_movement_type text;
BEGIN
  -- Determine movement type based on session table
  v_movement_type := CASE TG_TABLE_NAME
    WHEN 'packaging_sessions' THEN 'packaging_reservation'
    WHEN 'trim_sessions' THEN 'trim_reservation'
    WHEN 'bucking_sessions' THEN 'bucking_reservation'
    ELSE 'session_reservation'
  END;

  -- Get the inventory item
  SELECT * INTO v_inventory_item
  FROM inventory_items
  WHERE package_id = NEW.package_id;

  -- Validate inventory exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item % not found', NEW.package_id;
  END IF;

  -- Validate sufficient inventory available
  IF v_inventory_item.available_qty < NEW.pull_weight THEN
    RAISE EXCEPTION 'Insufficient inventory: % has only % available, but % required',
      NEW.package_id,
      v_inventory_item.available_qty,
      NEW.pull_weight;
  END IF;

  -- Reserve the inventory
  UPDATE inventory_items
  SET
    available_qty = available_qty - NEW.pull_weight,
    reserved_qty = reserved_qty + NEW.pull_weight,
    last_updated = now()
  WHERE package_id = NEW.package_id;

  -- Create audit trail
  INSERT INTO inventory_movements (
    session_id,
    session_type,
    movement_type,
    source_identifier,
    source_weight_change,
    notes,
    movement_date
  ) VALUES (
    NEW.id,
    TG_TABLE_NAME,
    v_movement_type,
    NEW.package_id,
    -NEW.pull_weight, -- Negative because it's being removed from available
    format('Reserved %s g for %s session by %s',
      NEW.pull_weight,
      TG_TABLE_NAME,
      COALESCE(NEW.packager_name, NEW.trimmer_name, NEW.bucker_name, 'unknown')
    ),
    now()
  );

  RETURN NEW;
END;
$$;

-- =====================================================
-- FUNCTION: Release Inventory on Session Cancel
-- =====================================================

CREATE OR REPLACE FUNCTION release_inventory_on_session_cancel()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_movement_type text;
BEGIN
  -- Only process if status changed to 'cancelled'
  IF OLD.session_status != 'cancelled' AND NEW.session_status = 'cancelled' THEN
    
    -- Determine movement type
    v_movement_type := CASE TG_TABLE_NAME
      WHEN 'packaging_sessions' THEN 'packaging_cancellation'
      WHEN 'trim_sessions' THEN 'trim_cancellation'
      WHEN 'bucking_sessions' THEN 'bucking_cancellation'
      ELSE 'session_cancellation'
    END;

    -- Release the reserved inventory back to available
    UPDATE inventory_items
    SET
      available_qty = available_qty + OLD.pull_weight,
      reserved_qty = reserved_qty - OLD.pull_weight,
      last_updated = now()
    WHERE package_id = OLD.package_id;

    -- Create audit trail
    INSERT INTO inventory_movements (
      session_id,
      session_type,
      movement_type,
      source_identifier,
      source_weight_change,
      notes,
      movement_date
    ) VALUES (
      OLD.id,
      TG_TABLE_NAME,
      v_movement_type,
      OLD.package_id,
      OLD.pull_weight, -- Positive because it's being returned to available
      format('Released %s g from cancelled %s session by %s',
        OLD.pull_weight,
        TG_TABLE_NAME,
        COALESCE(OLD.packager_name, OLD.trimmer_name, OLD.bucker_name, 'unknown')
      ),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGERS: Packaging Sessions
-- =====================================================

DROP TRIGGER IF EXISTS reserve_packaging_inventory ON packaging_sessions;
CREATE TRIGGER reserve_packaging_inventory
  AFTER INSERT ON packaging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION reserve_inventory_on_session_start();

-- Release inventory when packaging session is cancelled
DROP TRIGGER IF EXISTS release_packaging_inventory ON packaging_sessions;
CREATE TRIGGER release_packaging_inventory
  AFTER UPDATE ON packaging_sessions
  FOR EACH ROW
  WHEN (OLD.session_status IS DISTINCT FROM NEW.session_status)
  EXECUTE FUNCTION release_inventory_on_session_cancel();

-- =====================================================
-- TRIGGERS: Trim Sessions
-- =====================================================

DROP TRIGGER IF EXISTS reserve_trim_inventory ON trim_sessions;
CREATE TRIGGER reserve_trim_inventory
  AFTER INSERT ON trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION reserve_inventory_on_session_start();

DROP TRIGGER IF EXISTS release_trim_inventory ON trim_sessions;
CREATE TRIGGER release_trim_inventory
  AFTER UPDATE ON trim_sessions
  FOR EACH ROW
  WHEN (OLD.session_status IS DISTINCT FROM NEW.session_status)
  EXECUTE FUNCTION release_inventory_on_session_cancel();

-- =====================================================
-- TRIGGERS: Bucking Sessions
-- =====================================================

DROP TRIGGER IF EXISTS reserve_bucking_inventory ON bucking_sessions;
CREATE TRIGGER reserve_bucking_inventory
  AFTER INSERT ON bucking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION reserve_inventory_on_session_start();

DROP TRIGGER IF EXISTS release_bucking_inventory ON bucking_sessions;
CREATE TRIGGER release_bucking_inventory
  AFTER UPDATE ON bucking_sessions
  FOR EACH ROW
  WHEN (OLD.session_status IS DISTINCT FROM NEW.session_status)
  EXECUTE FUNCTION release_inventory_on_session_cancel();

-- Add helpful comments
COMMENT ON FUNCTION reserve_inventory_on_session_start() IS
  'Automatically reserves inventory when a production session starts. Deducts from available_qty, adds to reserved_qty, and creates audit trail.';

COMMENT ON FUNCTION release_inventory_on_session_cancel() IS
  'Automatically releases reserved inventory when a production session is cancelled. Returns reserved_qty back to available_qty and creates audit trail.';
