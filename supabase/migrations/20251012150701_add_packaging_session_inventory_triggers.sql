/*
  # Add Packaging Session Inventory Triggers
  
  ## Overview
  This migration creates database triggers and functions to automatically update internal inventory
  tracking when packaging sessions start and complete. This ensures real-time bulk inventory deduction
  and creates packaged inventory records with full audit trail.
  
  ## Functions Created
  
  ### 1. handle_packaging_session_start()
  Triggered when a packaging session is inserted with status 'active':
  - Allocates pull_weight from internal_bulk_inventory for the appropriate product type
  - Creates inventory_movements record for audit trail
  
  ### 2. handle_packaging_session_complete()
  Triggered when a packaging session status changes to 'completed':
  - Deallocates weight from internal_bulk_inventory
  - Deducts pull_weight from weight_grams in internal_bulk_inventory
  - Creates internal_packaged_inventory records for each unit size (3.5g, 14g, 454g)
  - Creates inventory_movements records for all transformations
  - Links packaged inventory to packaging session for traceability
  
  ## Important Notes
  - Handles product_type mapping: '8ths' -> 'flower', 'smalls' -> 'smalls'
  - Finds available bulk inventory matching strain and product type
  - Creates separate packaged inventory records for each unit size
  - All operations are atomic within trigger transaction
  - Audit trail captures complete lineage from bulk to packaged
*/

-- Function to handle packaging session start
CREATE OR REPLACE FUNCTION handle_packaging_session_start()
RETURNS TRIGGER AS $$
DECLARE
  bulk_product_type text;
  bulk_inventory_id uuid;
BEGIN
  -- Only process if status is 'active' and it's a new insert
  IF NEW.session_status = 'active' AND NEW.pull_weight > 0 THEN
    
    -- Map product_type to bulk product type
    bulk_product_type := CASE
      WHEN NEW.product_type = '8ths' THEN 'flower'
      WHEN NEW.product_type = 'smalls' THEN 'smalls'
      ELSE NULL
    END;
    
    IF bulk_product_type IS NOT NULL THEN
      -- Find matching bulk inventory and allocate weight
      -- Try to find exact match first
      SELECT id INTO bulk_inventory_id
      FROM internal_bulk_inventory
      WHERE strain = NEW.strain
        AND product_type = bulk_product_type
        AND available_weight_grams >= NEW.pull_weight
      ORDER BY trim_date DESC
      LIMIT 1;
      
      -- If found, allocate the weight
      IF bulk_inventory_id IS NOT NULL THEN
        UPDATE internal_bulk_inventory
        SET
          allocated_weight_grams = allocated_weight_grams + NEW.pull_weight,
          updated_at = now()
        WHERE id = bulk_inventory_id;
        
        -- Create inventory movement record
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
          NEW.started_at,
          'packaging_start',
          NEW.id,
          'packaging',
          'bulk',
          bulk_inventory_id::text,
          -NEW.pull_weight,
          NEW.strain,
          NEW.batch_id,
          'Allocated ' || NEW.pull_weight || 'g for packaging session by ' || NEW.packager_name
        );
      ELSE
        -- If no bulk inventory found, still create movement record for tracking
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
          NEW.started_at,
          'packaging_start',
          NEW.id,
          'packaging',
          'bulk',
          'NOT_FOUND',
          -NEW.pull_weight,
          NEW.strain,
          NEW.batch_id,
          'WARNING: No matching bulk inventory found for allocation - ' || NEW.packager_name
        );
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle packaging session completion
CREATE OR REPLACE FUNCTION handle_packaging_session_complete()
RETURNS TRIGGER AS $$
DECLARE
  bulk_product_type text;
  bulk_inventory_id uuid;
  packaged_3_5g_id uuid;
  packaged_14g_id uuid;
  packaged_454g_id uuid;
BEGIN
  -- Only process if status changed to 'completed'
  IF NEW.session_status = 'completed' AND OLD.session_status = 'active' THEN
    
    -- Map product_type to bulk product type
    bulk_product_type := CASE
      WHEN NEW.product_type = '8ths' THEN 'flower'
      WHEN NEW.product_type = 'smalls' THEN 'smalls'
      ELSE NULL
    END;
    
    IF bulk_product_type IS NOT NULL AND NEW.pull_weight > 0 THEN
      -- Find the bulk inventory that was allocated
      SELECT id INTO bulk_inventory_id
      FROM internal_bulk_inventory
      WHERE strain = NEW.strain
        AND product_type = bulk_product_type
        AND allocated_weight_grams >= NEW.pull_weight
      ORDER BY trim_date DESC
      LIMIT 1;
      
      -- Deallocate and deduct weight from bulk inventory
      IF bulk_inventory_id IS NOT NULL THEN
        UPDATE internal_bulk_inventory
        SET
          allocated_weight_grams = GREATEST(0, allocated_weight_grams - NEW.pull_weight),
          weight_grams = GREATEST(0, weight_grams - NEW.pull_weight),
          updated_at = now()
        WHERE id = bulk_inventory_id;
        
        -- Create inventory movement record for bulk deduction
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
          NEW.completed_at,
          'packaging_complete',
          NEW.id,
          'packaging',
          'bulk',
          bulk_inventory_id::text,
          -NEW.pull_weight,
          NEW.strain,
          NEW.batch_id,
          'Packaging session completed by ' || NEW.packager_name || ' - pull weight consumed'
        );
      END IF;
    END IF;
    
    -- Create packaged inventory records for each unit size
    -- 3.5g units
    IF NEW.units_3_5g > 0 THEN
      INSERT INTO internal_packaged_inventory (
        strain,
        batch_id,
        product_type,
        unit_size,
        units_count,
        packaging_session_id,
        package_date
      )
      VALUES (
        NEW.strain,
        NEW.batch_id,
        NEW.product_type,
        '3.5g',
        NEW.units_3_5g,
        NEW.id,
        NEW.session_date
      )
      RETURNING id INTO packaged_3_5g_id;
      
      -- Create movement record
      INSERT INTO inventory_movements (
        movement_date,
        movement_type,
        session_id,
        session_type,
        source_inventory_type,
        source_identifier,
        destination_inventory_type,
        destination_identifier,
        destination_weight_change,
        strain,
        batch_id,
        notes
      )
      VALUES (
        NEW.completed_at,
        'packaging_complete',
        NEW.id,
        'packaging',
        'bulk',
        COALESCE(bulk_inventory_id::text, 'UNKNOWN'),
        'packaged',
        packaged_3_5g_id::text,
        NEW.units_3_5g * 3.5,
        NEW.strain,
        NEW.batch_id,
        NEW.units_3_5g || ' units of 3.5g packaged'
      );
    END IF;
    
    -- 14g units
    IF NEW.units_14g > 0 THEN
      INSERT INTO internal_packaged_inventory (
        strain,
        batch_id,
        product_type,
        unit_size,
        units_count,
        packaging_session_id,
        package_date
      )
      VALUES (
        NEW.strain,
        NEW.batch_id,
        NEW.product_type,
        '14g',
        NEW.units_14g,
        NEW.id,
        NEW.session_date
      )
      RETURNING id INTO packaged_14g_id;
      
      -- Create movement record
      INSERT INTO inventory_movements (
        movement_date,
        movement_type,
        session_id,
        session_type,
        source_inventory_type,
        source_identifier,
        destination_inventory_type,
        destination_identifier,
        destination_weight_change,
        strain,
        batch_id,
        notes
      )
      VALUES (
        NEW.completed_at,
        'packaging_complete',
        NEW.id,
        'packaging',
        'bulk',
        COALESCE(bulk_inventory_id::text, 'UNKNOWN'),
        'packaged',
        packaged_14g_id::text,
        NEW.units_14g * 14,
        NEW.strain,
        NEW.batch_id,
        NEW.units_14g || ' units of 14g packaged'
      );
    END IF;
    
    -- 454g units
    IF NEW.units_454g > 0 THEN
      INSERT INTO internal_packaged_inventory (
        strain,
        batch_id,
        product_type,
        unit_size,
        units_count,
        packaging_session_id,
        package_date
      )
      VALUES (
        NEW.strain,
        NEW.batch_id,
        NEW.product_type,
        '454g',
        NEW.units_454g,
        NEW.id,
        NEW.session_date
      )
      RETURNING id INTO packaged_454g_id;
      
      -- Create movement record
      INSERT INTO inventory_movements (
        movement_date,
        movement_type,
        session_id,
        session_type,
        source_inventory_type,
        source_identifier,
        destination_inventory_type,
        destination_identifier,
        destination_weight_change,
        strain,
        batch_id,
        notes
      )
      VALUES (
        NEW.completed_at,
        'packaging_complete',
        NEW.id,
        'packaging',
        'bulk',
        COALESCE(bulk_inventory_id::text, 'UNKNOWN'),
        'packaged',
        packaged_454g_id::text,
        NEW.units_454g * 454,
        NEW.strain,
        NEW.batch_id,
        NEW.units_454g || ' units of 454g packaged'
      );
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for packaging sessions
DROP TRIGGER IF EXISTS packaging_session_start_trigger ON packaging_sessions;
CREATE TRIGGER packaging_session_start_trigger
  AFTER INSERT ON packaging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION handle_packaging_session_start();

DROP TRIGGER IF EXISTS packaging_session_complete_trigger ON packaging_sessions;
CREATE TRIGGER packaging_session_complete_trigger
  AFTER UPDATE ON packaging_sessions
  FOR EACH ROW
  WHEN (OLD.session_status IS DISTINCT FROM NEW.session_status)
  EXECUTE FUNCTION handle_packaging_session_complete();
