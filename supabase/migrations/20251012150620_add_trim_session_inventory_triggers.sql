/*
  # Add Trim Session Inventory Triggers
  
  ## Overview
  This migration creates database triggers and functions to automatically update internal inventory
  tracking when trim sessions start and complete. This ensures real-time inventory deduction and
  creates an audit trail of all inventory movements.
  
  ## Functions Created
  
  ### 1. handle_trim_session_start()
  Triggered when a trim session is inserted with status 'active':
  - Allocates pulled_weight from internal_bucked_inventory
  - Updates internal_bucked_inventory status to 'in_use'
  - Creates inventory_movements record for audit trail
  
  ### 2. handle_trim_session_complete()
  Triggered when a trim session status changes to 'completed':
  - Deallocates weight from internal_bucked_inventory
  - Deducts pulled_weight from current_weight_grams in internal_bucked_inventory
  - Creates internal_bulk_inventory records for flower, smalls, and trim outputs
  - Creates inventory_movements records for all transformations
  - Updates internal_bucked_inventory status to 'depleted' if current weight is zero
  
  ## Important Notes
  - Triggers handle edge cases where package doesn't exist in internal tracking yet
  - All operations are atomic within trigger transaction
  - Audit trail captures complete lineage from bucked to bulk
  - Timestamps are automatically recorded for all movements
*/

-- Function to handle trim session start
CREATE OR REPLACE FUNCTION handle_trim_session_start()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if status is 'active' and it's a new insert
  IF NEW.session_status = 'active' THEN
    
    -- Check if package exists in internal_bucked_inventory
    -- If not, create it from the trim session data
    INSERT INTO internal_bucked_inventory (
      package_id,
      strain,
      batch_id,
      initial_weight_grams,
      current_weight_grams,
      allocated_weight_grams,
      status,
      last_session_date
    )
    VALUES (
      NEW.package_id,
      NEW.strain,
      NEW.batch_id,
      NEW.pulled_weight,
      NEW.pulled_weight,
      NEW.pulled_weight,
      'in_use',
      NEW.session_date
    )
    ON CONFLICT (package_id) DO UPDATE
    SET
      allocated_weight_grams = internal_bucked_inventory.allocated_weight_grams + NEW.pulled_weight,
      status = 'in_use',
      last_session_date = NEW.session_date,
      updated_at = now();
    
    -- Create inventory movement record for trim session start
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
      'trim_start',
      NEW.id,
      'trim',
      'bucked',
      NEW.package_id,
      -NEW.pulled_weight,
      NEW.strain,
      NEW.batch_id,
      'Allocated ' || NEW.pulled_weight || 'g for trim session by ' || NEW.trimmer_name
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle trim session completion
CREATE OR REPLACE FUNCTION handle_trim_session_complete()
RETURNS TRIGGER AS $$
DECLARE
  bulk_flower_id uuid;
  bulk_smalls_id uuid;
  bulk_trim_id uuid;
BEGIN
  -- Only process if status changed to 'completed'
  IF NEW.session_status = 'completed' AND OLD.session_status = 'active' THEN
    
    -- Deallocate weight and deduct from current weight in internal_bucked_inventory
    UPDATE internal_bucked_inventory
    SET
      allocated_weight_grams = GREATEST(0, allocated_weight_grams - NEW.pulled_weight),
      current_weight_grams = GREATEST(0, current_weight_grams - NEW.pulled_weight),
      status = CASE
        WHEN (current_weight_grams - NEW.pulled_weight) <= 0 THEN 'depleted'
        ELSE status
      END,
      last_session_date = NEW.session_date,
      updated_at = now()
    WHERE package_id = NEW.package_id;
    
    -- Create inventory movement record for bucked deduction
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
      'trim_complete',
      NEW.id,
      'trim',
      'bucked',
      NEW.package_id,
      -NEW.pulled_weight,
      NEW.strain,
      NEW.batch_id,
      'Trim session completed by ' || NEW.trimmer_name || ' - pulled weight consumed'
    );
    
    -- Create or update internal_bulk_inventory for flower output
    IF NEW.big_buds_grams > 0 THEN
      INSERT INTO internal_bulk_inventory (
        strain,
        batch_id,
        product_type,
        weight_grams,
        quality_grade,
        trim_date,
        source_package_id
      )
      VALUES (
        NEW.strain,
        NEW.batch_id,
        'flower',
        NEW.big_buds_grams,
        NULL,
        NEW.session_date,
        NEW.package_id
      )
      RETURNING id INTO bulk_flower_id;
      
      -- Create movement record for flower creation
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
        'trim_complete',
        NEW.id,
        'trim',
        'bucked',
        NEW.package_id,
        'bulk',
        bulk_flower_id::text,
        NEW.big_buds_grams,
        NEW.strain,
        NEW.batch_id,
        'Flower output from trim session'
      );
    END IF;
    
    -- Create or update internal_bulk_inventory for smalls output
    IF NEW.small_buds_grams > 0 THEN
      INSERT INTO internal_bulk_inventory (
        strain,
        batch_id,
        product_type,
        weight_grams,
        quality_grade,
        trim_date,
        source_package_id
      )
      VALUES (
        NEW.strain,
        NEW.batch_id,
        'smalls',
        NEW.small_buds_grams,
        NULL,
        NEW.session_date,
        NEW.package_id
      )
      RETURNING id INTO bulk_smalls_id;
      
      -- Create movement record for smalls creation
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
        'trim_complete',
        NEW.id,
        'trim',
        'bucked',
        NEW.package_id,
        'bulk',
        bulk_smalls_id::text,
        NEW.small_buds_grams,
        NEW.strain,
        NEW.batch_id,
        'Smalls output from trim session'
      );
    END IF;
    
    -- Create or update internal_bulk_inventory for trim output
    IF NEW.trim_grams > 0 THEN
      INSERT INTO internal_bulk_inventory (
        strain,
        batch_id,
        product_type,
        weight_grams,
        quality_grade,
        trim_date,
        source_package_id
      )
      VALUES (
        NEW.strain,
        NEW.batch_id,
        'trim',
        NEW.trim_grams,
        NULL,
        NEW.session_date,
        NEW.package_id
      )
      RETURNING id INTO bulk_trim_id;
      
      -- Create movement record for trim creation
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
        'trim_complete',
        NEW.id,
        'trim',
        'bucked',
        NEW.package_id,
        'bulk',
        bulk_trim_id::text,
        NEW.trim_grams,
        NEW.strain,
        NEW.batch_id,
        'Trim output from trim session'
      );
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for trim sessions
DROP TRIGGER IF EXISTS trim_session_start_trigger ON trim_sessions;
CREATE TRIGGER trim_session_start_trigger
  AFTER INSERT ON trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION handle_trim_session_start();

DROP TRIGGER IF EXISTS trim_session_complete_trigger ON trim_sessions;
CREATE TRIGGER trim_session_complete_trigger
  AFTER UPDATE ON trim_sessions
  FOR EACH ROW
  WHEN (OLD.session_status IS DISTINCT FROM NEW.session_status)
  EXECUTE FUNCTION handle_trim_session_complete();
