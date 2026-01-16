/*
  # Add Bucked Smalls Tracking to Trim Sessions

  ## Overview
  When pulling weight from bucked flower inventory for hand trimming, there are often
  small buds in the batch. Depending on workflow, these smalls can be either:
  1. Hand trimmed and included in the small_buds_grams output
  2. Set aside untrimmed to be machine trimmed later (sent to bucked smalls inventory)

  ## Changes
  1. Add `bucked_smalls_grams` field to trim_sessions table
     - Tracks weight of smalls that were set aside untrimmed
     - These smalls go back to bucked inventory for machine trimming later
  
  2. Add `bucked_smalls_inventory_id` field
     - References the inventory package where untrimmed smalls are stored
  
  3. Update variance calculation
     - Variance should account for bucked smalls that are set aside
     - Formula: pulled_weight - (big_buds + small_buds + trim + waste + bucked_smalls)
  
  4. Update inventory triggers
     - When bucked smalls are recorded, add them to bucked smalls inventory

  ## Workflow Example
  - Trimmer pulls 1000g from bucked flower
  - After hand trimming: 500g big buds, 150g hand-trimmed smalls, 200g trim, 50g waste
  - Plus 100g of smalls set aside untrimmed for machine trimming later
  - Total: 500 + 150 + 200 + 50 + 100 = 1000g (0g variance)
*/

-- Add bucked smalls tracking fields
ALTER TABLE trim_sessions
ADD COLUMN IF NOT EXISTS bucked_smalls_grams numeric(10, 1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bucked_smalls_inventory_id uuid REFERENCES inventory_items(id);

-- Update the trim metrics calculation to include bucked smalls
CREATE OR REPLACE FUNCTION calculate_trim_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate metrics for completed sessions
  IF NEW.session_status = 'completed' THEN
    -- Set completion timestamp if not already set
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;

    -- Calculate minutes from started_at to completed_at
    IF NEW.started_at IS NOT NULL AND NEW.completed_at IS NOT NULL THEN
      NEW.minutes_trimmed := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 60;
    END IF;

    -- Calculate grams per hour if we have the data
    IF NEW.minutes_trimmed > 0 AND NEW.big_buds_grams IS NOT NULL THEN
      NEW.grams_per_hour := (NEW.big_buds_grams * 60.0) / NEW.minutes_trimmed;
    END IF;

    -- Calculate variance including bucked smalls
    IF NEW.pulled_weight IS NOT NULL THEN
      NEW.variance_grams := NEW.pulled_weight -
        (COALESCE(NEW.big_buds_grams, 0) +
         COALESCE(NEW.small_buds_grams, 0) +
         COALESCE(NEW.trim_grams, 0) +
         COALESCE(NEW.waste_grams, 0) +
         COALESCE(NEW.bucked_smalls_grams, 0));
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to add bucked smalls to inventory when session completes
CREATE OR REPLACE FUNCTION add_bucked_smalls_to_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- When session is completed and has bucked smalls
  IF NEW.session_status = 'completed' AND 
     OLD.session_status = 'active' AND
     NEW.bucked_smalls_grams > 0 AND 
     NEW.bucked_smalls_inventory_id IS NOT NULL THEN
    
    -- Add the bucked smalls weight to the target inventory item
    UPDATE inventory_items
    SET 
      quantity_grams = quantity_grams + NEW.bucked_smalls_grams,
      updated_at = now()
    WHERE id = NEW.bucked_smalls_inventory_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER add_bucked_smalls_to_inventory_trigger
  AFTER UPDATE ON trim_sessions
  FOR EACH ROW
  WHEN (NEW.session_status = 'completed' AND OLD.session_status != 'completed')
  EXECUTE FUNCTION add_bucked_smalls_to_inventory();