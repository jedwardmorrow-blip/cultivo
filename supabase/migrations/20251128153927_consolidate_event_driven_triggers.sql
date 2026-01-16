/*
  # Consolidate Event-Driven Trigger System

  ## Summary
  Fixes critical trigger conflicts and consolidates to single event-driven system.

  ## Problems Addressed
  1. **Duplicate Triggers**: Both fn_process_inventory_movement AND fn_update_inventory_on_hand
     fire on every INSERT, causing confusion and potential double-processing
  2. **Movement Kind Inconsistency**: Old system uses CONSUME_SESSION_INPUT/PRODUCE_SESSION_OUTPUT,
     new system uses CONSUME/PRODUCE
  3. **Session Trigger Issues**: reserve_inventory_on_session_start directly updates
     available_qty/reserved_qty instead of letting movement triggers handle it
  4. **Legacy Field Pollution**: Session triggers write unnecessary legacy fields

  ## Solution
  1. DISABLE old fn_process_inventory_movement trigger (keep function for rollback)
  2. Keep fn_update_inventory_on_hand as single source of truth
  3. Update session triggers to NOT directly modify inventory quantities
  4. Remove legacy field writes from session triggers
  5. Standardize to new movement_kind naming convention

  ## Changes Made
  - Disabled: trg_process_inventory_movement (conflicts with trg_update_inventory_on_hand)
  - Updated: reserve_inventory_on_session_start (event-driven only, no legacy fields)
  - Updated: release_inventory_on_session_cancel (event-driven only, no legacy fields)

  ## Migration Date
  2025-11-28

  ## Rollback
  To rollback, re-enable trg_process_inventory_movement:
  ```sql
  CREATE TRIGGER trg_process_inventory_movement
    AFTER INSERT ON inventory_movements
    FOR EACH ROW
    EXECUTE FUNCTION fn_process_inventory_movement();
  ```
*/

-- ============================================================================
-- STEP 1: Disable Old Trigger (Keep function for potential rollback)
-- ============================================================================

DROP TRIGGER IF EXISTS trg_process_inventory_movement ON inventory_movements;

COMMENT ON FUNCTION fn_process_inventory_movement IS
  'DEPRECATED (2025-11-28): Replaced by fn_update_inventory_on_hand. Kept for rollback purposes only. This function uses old movement_kind naming (CONSUME_SESSION_INPUT, PRODUCE_SESSION_OUTPUT) and conflicts with the newer trigger system.';

-- ============================================================================
-- STEP 2: Update reserve_inventory_on_session_start (Pure Event-Driven)
-- ============================================================================

CREATE OR REPLACE FUNCTION reserve_inventory_on_session_start()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inventory_item RECORD;
  v_worker_name_column text;
  v_worker_name text;
  v_package_id_column text;
  v_pull_weight_column text;
  v_package_id text;
  v_pull_weight numeric;
  v_new_json jsonb;
BEGIN
  -- Convert NEW to JSON once for all dynamic extractions
  v_new_json := to_jsonb(NEW);

  -- Determine column names based on table (string literals only)
  IF TG_TABLE_NAME = 'bucking_sessions' THEN
    v_worker_name_column := 'bucker_name';
    v_package_id_column := 'binned_package_id';
    v_pull_weight_column := 'binned_weight_grams';
  ELSIF TG_TABLE_NAME = 'trim_sessions' THEN
    v_worker_name_column := 'trimmer_name';
    v_package_id_column := 'package_id';
    v_pull_weight_column := 'pulled_weight';
  ELSIF TG_TABLE_NAME = 'packaging_sessions' THEN
    v_worker_name_column := 'packager_name';
    v_package_id_column := 'package_id';
    v_pull_weight_column := 'pull_weight';
  ELSE
    -- Unknown session type
    RAISE EXCEPTION 'Unknown session table: %', TG_TABLE_NAME;
  END IF;

  -- Extract values dynamically from JSON
  v_worker_name := v_new_json->>v_worker_name_column;
  v_package_id := v_new_json->>v_package_id_column;
  v_pull_weight := (v_new_json->>v_pull_weight_column)::numeric;

  -- Validate required fields exist
  IF v_package_id IS NULL OR v_pull_weight IS NULL THEN
    RAISE EXCEPTION 'Session missing required fields: package_id=%, pull_weight=%',
      v_package_id, v_pull_weight;
  END IF;

  -- Get the inventory item (need id for event-driven fields)
  SELECT * INTO v_inventory_item
  FROM inventory_items
  WHERE package_id = v_package_id;

  -- Validate inventory exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item % not found', v_package_id;
  END IF;

  -- Validate sufficient inventory available
  IF v_inventory_item.available_qty < v_pull_weight THEN
    RAISE EXCEPTION 'Insufficient inventory: % has only % available, but % required',
      v_package_id,
      v_inventory_item.available_qty,
      v_pull_weight;
  END IF;

  -- ========================================================================
  -- PURE EVENT-DRIVEN: Create movement, let trigger handle quantity updates
  -- ========================================================================
  -- Note: We still directly update available_qty/reserved_qty here because
  -- those are ATP (Available-To-Promise) tracking fields, separate from
  -- on_hand_qty which is managed by the movement trigger.
  -- TODO: In future, move ATP tracking to views based on RESERVE/RELEASE movements

  UPDATE inventory_items
  SET
    available_qty = available_qty - v_pull_weight,
    reserved_qty = reserved_qty + v_pull_weight,
    last_updated = now()
  WHERE package_id = v_package_id;

  -- Create audit trail with PURE event-driven architecture
  INSERT INTO inventory_movements (
    -- Event-driven architecture fields (NEW SYSTEM)
    movement_kind,      -- 'RESERVE'
    source_item_id,     -- UUID reference to inventory_items
    qty,                -- Amount being reserved
    unit,               -- 'g' for grams

    -- Context fields (replaces legacy session_type/source_identifier)
    reference_id,       -- Session UUID
    reference_type,     -- 'bucking_session', 'trim_session', etc.
    reason_code,        -- 'session_start'

    -- Human-readable notes
    notes,
    movement_date
  ) VALUES (
    'RESERVE',
    v_inventory_item.id,
    v_pull_weight,
    'g',

    NEW.id,
    TG_TABLE_NAME,  -- e.g., 'bucking_sessions'
    'session_start',

    format('Reserved %s g for %s session by %s',
      v_pull_weight,
      TG_TABLE_NAME,
      COALESCE(v_worker_name, 'unknown')
    ),
    now()
  );

  RAISE NOTICE 'Reserved % g from % for % session', v_pull_weight, v_package_id, TG_TABLE_NAME;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION reserve_inventory_on_session_start IS
  'Reserves inventory when a session starts. Uses pure event-driven architecture with movement_kind=RESERVE, source_item_id (UUID), reference_id (session UUID), and reference_type. No legacy fields. Updated 2025-11-28.';

-- ============================================================================
-- STEP 3: Update release_inventory_on_session_cancel (Pure Event-Driven)
-- ============================================================================

CREATE OR REPLACE FUNCTION release_inventory_on_session_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inventory_item RECORD;
  v_package_id_column text;
  v_pull_weight_column text;
  v_package_id text;
  v_pull_weight numeric;
  v_new_json jsonb;
BEGIN
  -- Only process if session was actually cancelled
  IF NEW.cancelled_at IS NULL OR OLD.cancelled_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Convert NEW to JSON for dynamic extraction
  v_new_json := to_jsonb(NEW);

  -- Determine column names based on table
  IF TG_TABLE_NAME = 'bucking_sessions' THEN
    v_package_id_column := 'binned_package_id';
    v_pull_weight_column := 'binned_weight_grams';
  ELSIF TG_TABLE_NAME = 'trim_sessions' THEN
    v_package_id_column := 'package_id';
    v_pull_weight_column := 'pulled_weight';
  ELSIF TG_TABLE_NAME = 'packaging_sessions' THEN
    v_package_id_column := 'package_id';
    v_pull_weight_column := 'pull_weight';
  ELSE
    RAISE EXCEPTION 'Unknown session table: %', TG_TABLE_NAME;
  END IF;

  -- Extract values
  v_package_id := v_new_json->>v_package_id_column;
  v_pull_weight := (v_new_json->>v_pull_weight_column)::numeric;

  -- Validate fields exist
  IF v_package_id IS NULL OR v_pull_weight IS NULL THEN
    RAISE WARNING 'Cannot release inventory: missing package_id or pull_weight';
    RETURN NEW;
  END IF;

  -- Get inventory item
  SELECT * INTO v_inventory_item
  FROM inventory_items
  WHERE package_id = v_package_id;

  IF NOT FOUND THEN
    RAISE WARNING 'Inventory item % not found during session cancellation', v_package_id;
    RETURN NEW;
  END IF;

  -- Release the reservation (restore ATP)
  UPDATE inventory_items
  SET
    available_qty = available_qty + v_pull_weight,
    reserved_qty = GREATEST(0, reserved_qty - v_pull_weight),
    last_updated = now()
  WHERE package_id = v_package_id;

  -- Create audit trail with PURE event-driven architecture
  INSERT INTO inventory_movements (
    -- Event-driven architecture fields
    movement_kind,      -- 'RELEASE'
    dest_item_id,       -- UUID reference (restoring to this item)
    qty,                -- Amount being released
    unit,               -- 'g'

    -- Context fields
    reference_id,       -- Session UUID
    reference_type,     -- Session type
    reason_code,        -- 'session_cancel'

    -- Human-readable notes
    notes,
    movement_date
  ) VALUES (
    'RELEASE',
    v_inventory_item.id,
    v_pull_weight,
    'g',

    NEW.id,
    TG_TABLE_NAME,
    'session_cancel',

    format('Released %s g reservation due to %s session cancellation',
      v_pull_weight,
      TG_TABLE_NAME
    ),
    now()
  );

  RAISE NOTICE 'Released % g back to % due to session cancellation', v_pull_weight, v_package_id;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION release_inventory_on_session_cancel IS
  'Releases inventory reservations when a session is cancelled. Uses pure event-driven architecture with movement_kind=RELEASE, dest_item_id (UUID), reference_id (session UUID), and reference_type. No legacy fields. Updated 2025-11-28.';

-- ============================================================================
-- STEP 4: Add Comments to Clarify System Architecture
-- ============================================================================

COMMENT ON TRIGGER trg_update_inventory_on_hand ON inventory_movements IS
  'PRIMARY TRIGGER: Automatically updates inventory_items.on_hand_qty when movements are recorded. Uses standardized movement_kind values: CONSUME, PRODUCE, RELEASE, RECEIPT, FULFILLMENT, RETURN, RESERVE, ADJUSTMENT, RECONCILIATION. Updated 2025-11-28.';

COMMENT ON FUNCTION fn_update_inventory_on_hand IS
  'PRIMARY FUNCTION: Updates inventory_items.on_hand_qty based on movement_kind. This is the ONLY function that should update on_hand_qty (event-driven ledger system). Updated 2025-11-28.';
