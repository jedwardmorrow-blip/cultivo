/*
  # Session Inventory Reservation System

  ## Overview
  This migration creates a comprehensive inventory reservation system that immediately
  reserves/deducts inventory when production sessions start and releases inventory
  when sessions are cancelled. This prevents over-allocation and enables concurrent
  sessions on the same package as long as inventory is available.

  ## Key Features

  1. **Immediate Reservation**: When any session starts, pull_weight is immediately
     deducted from inventory_items.available_qty

  2. **Concurrent Session Support**: Multiple sessions can pull from the same package
     as long as available_qty >= pull_weight for each session

  3. **Automatic Release**: When sessions are cancelled, pull_weight is returned to
     available_qty automatically

  4. **Complete Audit Trail**: All reservations and releases are tracked in
     inventory_movements with detailed notes

  ## Applies To
  - packaging_sessions
  - trim_sessions (bucking phase)
  - bucking_sessions

  ## Trigger Functions Created

  ### 1. reserve_inventory_on_session_start()
  Triggered on INSERT of any session type with status 'active':
  - Validates sufficient available_qty exists for pull_weight
  - Deducts pull_weight from available_qty immediately
  - Creates inventory_movements record with movement_type 'session_reservation'
  - Raises exception if insufficient inventory (preventing session creation)

  ### 2. release_inventory_on_session_cancel()
  Triggered on UPDATE when session_status changes to 'cancelled':
  - Returns pull_weight back to available_qty
  - Creates inventory_movements record with movement_type 'session_cancellation'
  - Handles edge cases where inventory_item may have been deleted

  ## Important Notes
  - Session start will FAIL if insufficient inventory exists (by design)
  - Cancellation always succeeds even if inventory_item is missing
  - Session completion does NOT modify inventory (handled by conversion system)
  - All operations are atomic within trigger transactions
  - Audit trail captures complete lifecycle: reservation → (completion OR cancellation)

  ## Rollback Procedure
  To remove this system:
  ```sql
  DROP TRIGGER IF EXISTS reserve_packaging_inventory ON packaging_sessions;
  DROP TRIGGER IF EXISTS reserve_trim_inventory ON trim_sessions;
  DROP TRIGGER IF EXISTS reserve_bucking_inventory ON bucking_sessions;
  DROP TRIGGER IF EXISTS release_packaging_inventory ON packaging_sessions;
  DROP TRIGGER IF EXISTS release_trim_inventory ON trim_sessions;
  DROP TRIGGER IF EXISTS release_bucking_inventory ON bucking_sessions;
  DROP FUNCTION IF EXISTS reserve_inventory_on_session_start();
  DROP FUNCTION IF EXISTS release_inventory_on_session_cancel();
  ```

  ## Security
  - Functions use SECURITY DEFINER to ensure proper permissions
  - RLS policies unchanged (existing policies remain in effect)
  - Audit trail provides complete traceability
*/

-- =====================================================
-- FUNCTION: Reserve inventory when session starts
-- =====================================================

CREATE OR REPLACE FUNCTION reserve_inventory_on_session_start()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inventory_item inventory_items%ROWTYPE;
  v_session_type text;
  v_package_id text;
  v_pull_weight numeric;
  v_batch_id text;
  v_strain text;
BEGIN
  -- Determine session type and extract relevant fields
  IF TG_TABLE_NAME = 'packaging_sessions' THEN
    v_session_type := 'packaging';
    v_package_id := NEW.package_id;
    v_pull_weight := NEW.pull_weight;
    v_batch_id := NEW.batch_id;
    v_strain := NEW.strain;
  ELSIF TG_TABLE_NAME = 'trim_sessions' THEN
    v_session_type := 'trim';
    v_package_id := NEW.package_id;
    v_pull_weight := NEW.pull_weight;
    v_batch_id := NEW.batch_id;
    v_strain := NEW.strain;
  ELSIF TG_TABLE_NAME = 'bucking_sessions' THEN
    v_session_type := 'bucking';
    v_package_id := NEW.package_id;
    v_pull_weight := NEW.pull_weight;
    v_batch_id := NEW.batch_id;
    v_strain := NEW.strain;
  ELSE
    -- Unknown session type, skip reservation
    RETURN NEW;
  END IF;

  -- Only process if status is 'active' and pull_weight > 0
  IF NEW.session_status = 'active' AND v_pull_weight > 0 AND v_package_id IS NOT NULL THEN

    -- Find the inventory item by package_id
    SELECT * INTO v_inventory_item
    FROM inventory_items
    WHERE package_id = v_package_id
    LIMIT 1;

    -- Validate inventory exists
    IF v_inventory_item.id IS NULL THEN
      RAISE EXCEPTION 'Inventory package % not found. Cannot start % session.',
        v_package_id, v_session_type
        USING HINT = 'Verify package_id exists in inventory_items table';
    END IF;

    -- Validate sufficient inventory available
    IF COALESCE(v_inventory_item.available_qty, 0) < v_pull_weight THEN
      RAISE EXCEPTION 'Insufficient inventory for package %. Available: %g, Requested: %g',
        v_package_id,
        COALESCE(v_inventory_item.available_qty, 0),
        v_pull_weight
        USING HINT = 'Select a different package or reduce pull_weight';
    END IF;

    -- Reserve inventory by deducting pull_weight from available_qty
    UPDATE inventory_items
    SET
      available_qty = available_qty - v_pull_weight,
      updated_at = now()
    WHERE id = v_inventory_item.id;

    -- Create audit trail record
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
    ) VALUES (
      now(),
      'session_reservation',
      NEW.id,
      v_session_type,
      'inventory_items',
      v_inventory_item.id::text,
      -v_pull_weight,
      v_strain,
      v_batch_id,
      format('Reserved %sg from package %s for %s session',
        v_pull_weight,
        v_package_id,
        v_session_type)
    );

    RAISE NOTICE 'Reserved %g from package % for % session %',
      v_pull_weight, v_package_id, v_session_type, NEW.id;

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION reserve_inventory_on_session_start IS
'Immediately reserves inventory when production sessions start. Validates sufficient inventory exists and deducts pull_weight from available_qty. Raises exception if insufficient inventory.';

-- =====================================================
-- FUNCTION: Release inventory when session is cancelled
-- =====================================================

CREATE OR REPLACE FUNCTION release_inventory_on_session_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inventory_item inventory_items%ROWTYPE;
  v_session_type text;
  v_package_id text;
  v_pull_weight numeric;
  v_batch_id text;
  v_strain text;
BEGIN
  -- Only process if status changed from 'active' to 'cancelled'
  IF OLD.session_status = 'active' AND NEW.session_status = 'cancelled' THEN

    -- Determine session type and extract relevant fields
    IF TG_TABLE_NAME = 'packaging_sessions' THEN
      v_session_type := 'packaging';
      v_package_id := NEW.package_id;
      v_pull_weight := NEW.pull_weight;
      v_batch_id := NEW.batch_id;
      v_strain := NEW.strain;
    ELSIF TG_TABLE_NAME = 'trim_sessions' THEN
      v_session_type := 'trim';
      v_package_id := NEW.package_id;
      v_pull_weight := NEW.pull_weight;
      v_batch_id := NEW.batch_id;
      v_strain := NEW.strain;
    ELSIF TG_TABLE_NAME = 'bucking_sessions' THEN
      v_session_type := 'bucking';
      v_package_id := NEW.package_id;
      v_pull_weight := NEW.pull_weight;
      v_batch_id := NEW.batch_id;
      v_strain := NEW.strain;
    ELSE
      -- Unknown session type, skip release
      RETURN NEW;
    END IF;

    -- Only process if pull_weight > 0 and package_id exists
    IF v_pull_weight > 0 AND v_package_id IS NOT NULL THEN

      -- Find the inventory item by package_id
      SELECT * INTO v_inventory_item
      FROM inventory_items
      WHERE package_id = v_package_id
      LIMIT 1;

      -- If inventory item exists, return the pull_weight
      IF v_inventory_item.id IS NOT NULL THEN
        UPDATE inventory_items
        SET
          available_qty = available_qty + v_pull_weight,
          updated_at = now()
        WHERE id = v_inventory_item.id;

        -- Create audit trail record
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
        ) VALUES (
          now(),
          'session_cancellation',
          NEW.id,
          v_session_type,
          'inventory_items',
          v_inventory_item.id::text,
          v_pull_weight,
          v_strain,
          v_batch_id,
          format('Released %sg back to package %s from cancelled %s session',
            v_pull_weight,
            v_package_id,
            v_session_type)
        );

        RAISE NOTICE 'Released %g back to package % from cancelled % session %',
          v_pull_weight, v_package_id, v_session_type, NEW.id;
      ELSE
        -- Inventory item doesn't exist (may have been deleted), log warning
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
        ) VALUES (
          now(),
          'session_cancellation',
          NEW.id,
          v_session_type,
          'inventory_items',
          'NOT_FOUND',
          v_pull_weight,
          v_strain,
          v_batch_id,
          format('WARNING: Could not release %sg - package %s not found (may have been deleted)',
            v_pull_weight,
            v_package_id)
        );

        RAISE WARNING 'Package % not found when cancelling % session %. Inventory may have been deleted.',
          v_package_id, v_session_type, NEW.id;
      END IF;

    END IF;

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION release_inventory_on_session_cancel IS
'Releases reserved inventory when production sessions are cancelled. Returns pull_weight to available_qty. Handles cases where inventory_item may have been deleted.';

-- =====================================================
-- CREATE TRIGGERS: Packaging Sessions
-- =====================================================

-- Reserve inventory when packaging session starts
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
-- CREATE TRIGGERS: Trim Sessions
-- =====================================================

-- Reserve inventory when trim session starts
DROP TRIGGER IF EXISTS reserve_trim_inventory ON trim_sessions;
CREATE TRIGGER reserve_trim_inventory
  AFTER INSERT ON trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION reserve_inventory_on_session_start();

-- Release inventory when trim session is cancelled
DROP TRIGGER IF EXISTS release_trim_inventory ON trim_sessions;
CREATE TRIGGER release_trim_inventory
  AFTER UPDATE ON trim_sessions
  FOR EACH ROW
  WHEN (OLD.session_status IS DISTINCT FROM NEW.session_status)
  EXECUTE FUNCTION release_inventory_on_session_cancel();

-- =====================================================
-- CREATE TRIGGERS: Bucking Sessions
-- =====================================================

-- Reserve inventory when bucking session starts
DROP TRIGGER IF EXISTS reserve_bucking_inventory ON bucking_sessions;
CREATE TRIGGER reserve_bucking_inventory
  AFTER INSERT ON bucking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION reserve_inventory_on_session_start();

-- Release inventory when bucking session is cancelled
DROP TRIGGER IF EXISTS release_bucking_inventory ON bucking_sessions;
CREATE TRIGGER release_bucking_inventory
  AFTER UPDATE ON bucking_sessions
  FOR EACH ROW
  WHEN (OLD.session_status IS DISTINCT FROM NEW.session_status)
  EXECUTE FUNCTION release_inventory_on_session_cancel();

-- =====================================================
-- VALIDATION QUERIES
-- =====================================================

/*
  ## Testing the Reservation System

  ### Test 1: Check available inventory before session start
  ```sql
  SELECT package_id, strain, batch, available_qty, total_qty
  FROM inventory_items
  WHERE stage = 'Bulk Flower'
  ORDER BY strain, batch;
  ```

  ### Test 2: Start a packaging session (should succeed if inventory available)
  ```sql
  INSERT INTO packaging_sessions (
    packager_name, strain, batch_id, package_id, pull_weight, session_status
  ) VALUES (
    'Test User', 'Strain Name', 'B001', 'PKG001', 500, 'active'
  );
  ```

  ### Test 3: Verify inventory was reserved
  ```sql
  SELECT package_id, available_qty, total_qty
  FROM inventory_items
  WHERE package_id = 'PKG001';

  SELECT * FROM inventory_movements
  WHERE movement_type = 'session_reservation'
  ORDER BY movement_date DESC
  LIMIT 5;
  ```

  ### Test 4: Cancel the session and verify inventory is released
  ```sql
  UPDATE packaging_sessions
  SET session_status = 'cancelled'
  WHERE package_id = 'PKG001' AND session_status = 'active';

  -- Verify inventory returned
  SELECT package_id, available_qty, total_qty
  FROM inventory_items
  WHERE package_id = 'PKG001';

  SELECT * FROM inventory_movements
  WHERE movement_type = 'session_cancellation'
  ORDER BY movement_date DESC
  LIMIT 5;
  ```

  ### Test 5: Try to start session with insufficient inventory (should fail)
  ```sql
  -- This should raise an exception
  INSERT INTO packaging_sessions (
    packager_name, strain, batch_id, package_id, pull_weight, session_status
  ) VALUES (
    'Test User', 'Strain Name', 'B001', 'PKG001', 999999, 'active'
  );
  ```

  ### Test 6: Concurrent sessions on same package
  ```sql
  -- If PKG001 has 1000g available, these should both succeed
  INSERT INTO packaging_sessions (
    packager_name, strain, batch_id, package_id, pull_weight, session_status
  ) VALUES
    ('User 1', 'Strain Name', 'B001', 'PKG001', 400, 'active'),
    ('User 2', 'Strain Name', 'B001', 'PKG001', 400, 'active');

  -- Verify both reservations
  SELECT package_id, available_qty, total_qty
  FROM inventory_items
  WHERE package_id = 'PKG001';
  ```
*/
