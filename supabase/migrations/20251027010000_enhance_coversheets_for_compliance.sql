/*
  # Enhance Coversheets for Arizona Compliance

  ## Overview
  This migration adds compliance-related fields to the coversheets table and implements
  an auto-update mechanism to mark coversheets as outdated when their related orders change.

  ## Changes

  ### 1. New Columns Added to `coversheets`
    - `compliance_header` (jsonb): Stores structured compliance data including:
      - company_name: Legal entity name
      - license_number: State license identifier
      - pregnancy_warning: Required Arizona warning text
    - `manufacture_date` (date): Latest manufacture date from assigned packages
    - `is_outdated` (boolean): Flag indicating if order changed after coversheet generation
    - `last_order_update` (timestamptz): Tracks when related order was last modified

  ### 2. Auto-Update Triggers
    - Creates triggers on `orders` and `order_items` tables
    - When order data changes, automatically marks related coversheet as outdated
    - Lightweight operation (only sets boolean flag, no regeneration)
    - Enables UI to show "outdated" warnings and prompt for refresh

  ### 3. Helper Function
    - `mark_coversheet_outdated()`: Function to set is_outdated flag
    - Called by triggers when order changes detected
    - Updates last_order_update timestamp for audit trail

  ## Notes
  - No breaking changes to existing coversheet functionality
  - Existing coversheets will have NULL compliance_header (gracefully handled in UI)
  - Future enhancement: Multi-location customer distribution support
    (Currently supports single customer per order as per requirements)

  ## Compliance Requirements
  This migration supports Arizona cannabis compliance requirements including:
  - Distributor license display
  - Batch traceability (harvest and manufacture dates)
  - Required health warnings
  - Customer license verification
*/

-- Add compliance-related fields to coversheets table
DO $$
BEGIN
  -- Add compliance_header jsonb field for structured compliance data
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coversheets' AND column_name = 'compliance_header'
  ) THEN
    ALTER TABLE coversheets ADD COLUMN compliance_header jsonb DEFAULT NULL;
  END IF;

  -- Add manufacture_date for compliance reporting
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coversheets' AND column_name = 'manufacture_date'
  ) THEN
    ALTER TABLE coversheets ADD COLUMN manufacture_date date DEFAULT NULL;
  END IF;

  -- Add is_outdated flag for tracking when order changes after coversheet generation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coversheets' AND column_name = 'is_outdated'
  ) THEN
    ALTER TABLE coversheets ADD COLUMN is_outdated boolean DEFAULT false;
  END IF;

  -- Add last_order_update timestamp for audit trail
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coversheets' AND column_name = 'last_order_update'
  ) THEN
    ALTER TABLE coversheets ADD COLUMN last_order_update timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Create index on is_outdated for efficient filtering
CREATE INDEX IF NOT EXISTS idx_coversheets_is_outdated ON coversheets(is_outdated) WHERE is_outdated = true;

-- Create index on order_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_coversheets_order_id ON coversheets(order_id);

/*
  Helper Function: Mark Coversheet as Outdated

  Purpose: Sets the is_outdated flag when order data changes
  Usage: Called automatically by triggers, or manually when needed

  Parameters:
    - p_order_id: UUID of the order that was modified

  Returns: void

  Side Effects:
    - Sets is_outdated = true for matching coversheet
    - Updates last_order_update timestamp
    - Does NOT regenerate coversheet (manual action required)
*/
CREATE OR REPLACE FUNCTION mark_coversheet_outdated()
RETURNS TRIGGER AS $$
BEGIN
  -- When an order or its items are updated, mark the coversheet as outdated
  -- This allows the UI to show a warning and prompt for regeneration
  UPDATE coversheets
  SET
    is_outdated = true,
    last_order_update = now()
  WHERE
    order_id = COALESCE(NEW.order_id, NEW.id)
    AND is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/*
  Trigger: Auto-mark coversheet outdated when orders table changes

  Fires when: UPDATE on orders table
  Action: Calls mark_coversheet_outdated() to set flag

  Note: Only fires on UPDATE, not INSERT (no coversheet exists yet)
        or DELETE (CASCADE handles deletion)
*/
DROP TRIGGER IF EXISTS trigger_mark_coversheet_outdated_on_order_update ON orders;
CREATE TRIGGER trigger_mark_coversheet_outdated_on_order_update
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (
    -- Only fire if meaningful fields changed (not just updated_at)
    OLD.customer_id IS DISTINCT FROM NEW.customer_id OR
    OLD.order_date IS DISTINCT FROM NEW.order_date OR
    OLD.scheduled_delivery_date IS DISTINCT FROM NEW.scheduled_delivery_date OR
    OLD.status IS DISTINCT FROM NEW.status
  )
  EXECUTE FUNCTION mark_coversheet_outdated();

/*
  Trigger: Auto-mark coversheet outdated when order_items change

  Fires when: INSERT, UPDATE, or DELETE on order_items table
  Action: Calls mark_coversheet_outdated() to set flag

  Rationale: Any change to order items means coversheet needs regeneration
             to reflect accurate product, batch, and package information
*/
DROP TRIGGER IF EXISTS trigger_mark_coversheet_outdated_on_items_change ON order_items;
CREATE TRIGGER trigger_mark_coversheet_outdated_on_items_change
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION mark_coversheet_outdated();

/*
  Add comment to coversheets table for documentation
*/
COMMENT ON COLUMN coversheets.compliance_header IS 'Structured compliance data: company_name, license_number, pregnancy_warning';
COMMENT ON COLUMN coversheets.manufacture_date IS 'Latest manufacture date from assigned packages, used for compliance reporting';
COMMENT ON COLUMN coversheets.is_outdated IS 'Flag indicating order changed after coversheet generation, prompts user to regenerate';
COMMENT ON COLUMN coversheets.last_order_update IS 'Timestamp of last order modification, used for audit trail';

/*
  TODO: Future Enhancement - Multi-Location Customer Distribution

  Current Implementation:
    - Each order is for ONE customer with ONE location
    - "Distributed To" section shows single customer with license number

  Future Requirements:
    - Some customers have multiple locations that handle their own distribution
    - Will need to add distributed_to jsonb[] array to track multiple locations
    - Example structure:
      [
        {"customer_name": "Store Name", "license": "ABC123", "location": "North Phoenix"},
        {"customer_name": "Store Name", "license": "ABC124", "location": "South Phoenix"}
      ]

  Implementation Notes:
    - Add distributed_to jsonb[] column when needed
    - Update getDistributedToInfo() service function to handle arrays
    - Update DistributedToSection component to render multiple locations
    - Add customer_locations table for proper relational structure
*/
