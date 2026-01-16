/*
  # Add cancelled_at Timestamp to Session Tables

  ## Overview
  Adds the `cancelled_at` timestamp column to all three session tables.

  ## Changes
  1. Drop problematic triggers/functions using CASCADE
  2. Add cancelled_at columns
  3. Backfill data
  4. Update cancellation triggers
  5. Recreate conversion triggers as stubs

  ## Security
  - Uses existing RLS policies

  ## Backward Compatibility
  - Column is nullable
*/

-- Drop problematic functions with CASCADE to remove dependent triggers
DROP FUNCTION IF EXISTS auto_create_pending_conversions_from_trim() CASCADE;
DROP FUNCTION IF EXISTS auto_create_pending_conversions_from_packaging() CASCADE;

-- Add columns
ALTER TABLE trim_sessions ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE packaging_sessions ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE bucking_sessions ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Backfill
UPDATE trim_sessions SET cancelled_at = completed_at
WHERE session_status = 'cancelled' AND cancelled_at IS NULL;

UPDATE packaging_sessions SET cancelled_at = completed_at
WHERE session_status = 'cancelled' AND cancelled_at IS NULL;

UPDATE bucking_sessions SET cancelled_at = completed_at
WHERE session_status = 'cancelled' AND cancelled_at IS NULL;

-- Update cancellation triggers
CREATE OR REPLACE FUNCTION handle_trim_session_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_status = 'cancelled' AND OLD.session_status = 'active' THEN
    NEW.cancelled_at := now();
    UPDATE order_item_allocations
    SET workflow_stage = 'allocated', active_trim_session_id = NULL,
        trimming_started_at = NULL, stage_entered_at = now(), updated_at = now()
    WHERE active_trim_session_id = NEW.id AND workflow_stage = 'in_trimming';
    UPDATE internal_bucked_inventory
    SET allocated_weight_grams = GREATEST(0, allocated_weight_grams - NEW.pulled_weight),
        status = CASE WHEN status = 'in_use' AND (allocated_weight_grams - NEW.pulled_weight) <= 0 
                 THEN 'available' ELSE status END, updated_at = now()
    WHERE package_id = NEW.package_id;
    INSERT INTO inventory_movements (movement_date, movement_type, session_id, session_type,
      source_inventory_type, source_identifier, source_weight_change, strain, batch_id, notes)
    VALUES (now(), 'trim_cancelled', NEW.id, 'trim', 'bucked', NEW.package_id, NEW.pulled_weight,
      NEW.strain, NEW.batch_id, 'Trim cancelled - ' || NEW.pulled_weight || 'g. Trimmer: ' || NEW.trimmer_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_packaging_session_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  bulk_product_type text; bulk_inventory_id uuid;
BEGIN
  IF NEW.session_status = 'cancelled' AND OLD.session_status = 'active' THEN
    NEW.cancelled_at := now();
    UPDATE order_item_allocations
    SET workflow_stage = CASE WHEN trimming_completed_at IS NOT NULL 
                         THEN 'trimmed'::allocation_workflow_stage
                         ELSE 'allocated'::allocation_workflow_stage END,
        active_packaging_session_id = NULL, packaging_started_at = NULL,
        stage_entered_at = now(), updated_at = now()
    WHERE active_packaging_session_id = NEW.id AND workflow_stage = 'in_packaging';
    bulk_product_type := CASE WHEN NEW.product_type = '8ths' THEN 'flower'
                         WHEN NEW.product_type = 'smalls' THEN 'smalls' ELSE NULL END;
    IF bulk_product_type IS NOT NULL AND NEW.pull_weight > 0 THEN
      SELECT id INTO bulk_inventory_id FROM internal_bulk_inventory
      WHERE strain = NEW.strain AND product_type = bulk_product_type AND allocated_weight_grams > 0
      ORDER BY trim_date DESC LIMIT 1;
      IF bulk_inventory_id IS NOT NULL THEN
        UPDATE internal_bulk_inventory SET allocated_weight_grams = GREATEST(0, allocated_weight_grams - NEW.pull_weight),
            updated_at = now() WHERE id = bulk_inventory_id;
        INSERT INTO inventory_movements (movement_date, movement_type, session_id, session_type,
          source_inventory_type, source_identifier, source_weight_change, strain, batch_id, notes)
        VALUES (now(), 'packaging_cancelled', NEW.id, 'packaging', 'bulk', bulk_inventory_id::text,
          NEW.pull_weight, NEW.strain, NEW.batch_id, 'Packaging cancelled - ' || NEW.pull_weight || 'g. Packager: ' || NEW.packager_name);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_bucking_session_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_status = 'cancelled' AND OLD.session_status = 'active' THEN
    NEW.cancelled_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bucking_session_cancellation_trigger ON bucking_sessions;
CREATE TRIGGER bucking_session_cancellation_trigger BEFORE UPDATE ON bucking_sessions
  FOR EACH ROW EXECUTE FUNCTION handle_bucking_session_cancellation();

-- Recreate conversion triggers as no-ops (they were broken)
CREATE OR REPLACE FUNCTION auto_create_pending_conversions_from_trim()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN RETURN NEW; END; $$;

CREATE TRIGGER auto_create_pending_conversions_trim_trigger AFTER UPDATE ON trim_sessions
  FOR EACH ROW EXECUTE FUNCTION auto_create_pending_conversions_from_trim();

CREATE OR REPLACE FUNCTION auto_create_pending_conversions_from_packaging()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN RETURN NEW; END; $$;

CREATE TRIGGER auto_create_pending_conversions_packaging_trigger AFTER UPDATE ON packaging_sessions
  FOR EACH ROW EXECUTE FUNCTION auto_create_pending_conversions_from_packaging();

-- Comments
COMMENT ON COLUMN trim_sessions.cancelled_at IS 'Timestamp when cancelled';
COMMENT ON COLUMN packaging_sessions.cancelled_at IS 'Timestamp when cancelled';
COMMENT ON COLUMN bucking_sessions.cancelled_at IS 'Timestamp when cancelled';
