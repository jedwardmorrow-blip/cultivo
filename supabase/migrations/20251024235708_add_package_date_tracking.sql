/*
  # Add Package Date Tracking for Packaged Inventory

  ## Overview
  This migration adds package date tracking to inventory items, capturing when
  packaged products (3.5g, 14g, 454g, prerolls) were created during packaging sessions.
  The package date flows from packaging session completion through the conversion
  system to final inventory items.

  ## Changes Made

  1. **inventory_items table**
     - Add `package_date` column (date, nullable)
     - Stores the date when the packaging session was completed
     - Used for label generation and inventory tracking
     - Only applicable to packaged product types

  2. **conversion_packages table**
     - Add `packaged_at` column (date, nullable)
     - Captures packaging session completion date during conversion
     - Transferred to inventory_items when conversion is finalized
     - Maintains traceability through conversion workflow

  3. **Indexes**
     - Add index on inventory_items.package_date for efficient filtering
     - Partial index (only non-null values) for optimal performance

  4. **Backfill**
     - Update existing packaged inventory items with current date
     - Only updates items where product_stage_id indicates packaged product
     - Safe operation with WHERE clause to prevent overwrites

  ## Data Flow
  packaging_sessions.completed_at → pending_conversions →
  conversion_packages.packaged_at → inventory_items.package_date

  ## Usage Notes
  - Package date is required for label generation on packaged products
  - Historical items backfilled with current date (no historical data available)
  - Future items will capture actual packaging session completion date
  - Null package_date indicates bulk (non-packaged) inventory
*/

-- =====================================================
-- SECTION 1: Add package_date to inventory_items
-- =====================================================

-- Add package_date column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'package_date'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN package_date date;
    COMMENT ON COLUMN inventory_items.package_date IS
      'Date when the packaging session was completed. Only applicable to packaged products (3.5g, 14g, 454g, prerolls). Used for label generation and inventory tracking.';
  END IF;
END $$;

-- Create index on package_date for efficient querying (partial index for non-null values)
CREATE INDEX IF NOT EXISTS idx_inventory_items_package_date
  ON inventory_items(package_date)
  WHERE package_date IS NOT NULL;

-- =====================================================
-- SECTION 2: Add packaged_at to conversion_packages
-- =====================================================

-- Add packaged_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversion_packages' AND column_name = 'packaged_at'
  ) THEN
    ALTER TABLE conversion_packages ADD COLUMN packaged_at date;
    COMMENT ON COLUMN conversion_packages.packaged_at IS
      'Date when the packaging session was completed. Captured during conversion and transferred to inventory_items.package_date when finalized.';
  END IF;
END $$;

-- Create index on packaged_at
CREATE INDEX IF NOT EXISTS idx_conversion_packages_packaged_at
  ON conversion_packages(packaged_at)
  WHERE packaged_at IS NOT NULL;

-- =====================================================
-- SECTION 3: Add packaging completion date to pending_conversions
-- =====================================================

-- Add session_completed_at to track when the source session completed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_conversions' AND column_name = 'session_completed_at'
  ) THEN
    ALTER TABLE pending_conversions ADD COLUMN session_completed_at timestamptz;
    COMMENT ON COLUMN pending_conversions.session_completed_at IS
      'Timestamp when the source packaging/trim session was completed. Used to derive package_date for final inventory.';
  END IF;
END $$;

-- =====================================================
-- SECTION 4: Update trigger to capture packaging completion date
-- =====================================================

-- Update the trigger function to capture session completion timestamp
CREATE OR REPLACE FUNCTION auto_create_pending_conversions_from_packaging()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_id uuid;
  v_total_units integer;
BEGIN
  -- Only process if status changed to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Get product ID for the packaged product
    v_product_id := NEW.product_id;

    -- Calculate total units packaged
    v_total_units := COALESCE(NEW.units_packaged, 0);

    -- Create pending conversion for packaged units (if units > 0)
    IF v_total_units > 0 AND v_product_id IS NOT NULL THEN
      INSERT INTO pending_conversions (
        session_id,
        session_type,
        batch_id,
        product_id,
        original_units,
        remaining_units,
        status,
        created_by,
        session_completed_at
      ) VALUES (
        NEW.id,
        'packaging',
        NEW.batch_id,
        v_product_id,
        v_total_units,
        v_total_units,
        'pending',
        NEW.completed_by,
        NEW.completed_at  -- Capture the packaging session completion timestamp
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_pending_conversions_from_packaging IS
  'Automatically creates pending conversions when packaging sessions complete. Captures session completion timestamp for package date tracking.';

-- =====================================================
-- SECTION 5: Backfill package_date for existing packaged inventory
-- =====================================================

-- Backfill package_date for existing packaged products
-- Uses CURRENT_DATE as specified (no historical data available)
DO $$
DECLARE
  v_updated_count integer;
  v_packaged_stage_id uuid;
BEGIN
  -- Get the Packaged stage ID
  SELECT id INTO v_packaged_stage_id
  FROM product_stages
  WHERE name = 'Packaged';

  -- Update inventory items that are packaged products and don't have a package_date yet
  UPDATE inventory_items
  SET package_date = CURRENT_DATE
  WHERE package_date IS NULL
    AND product_stage_id = v_packaged_stage_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RAISE NOTICE 'Backfilled package_date for % existing packaged inventory items', v_updated_count;
END $$;

-- =====================================================
-- SECTION 6: Add helper function to get package date from session
-- =====================================================

-- Helper function to extract package date from pending conversion
CREATE OR REPLACE FUNCTION get_package_date_from_conversion(
  p_pending_conversion_id uuid
)
RETURNS date
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_package_date date;
BEGIN
  -- Get the date portion of session_completed_at
  SELECT DATE(session_completed_at) INTO v_package_date
  FROM pending_conversions
  WHERE id = p_pending_conversion_id;

  RETURN COALESCE(v_package_date, CURRENT_DATE);
END;
$$;

COMMENT ON FUNCTION get_package_date_from_conversion IS
  'Extracts package date from pending conversion session completion timestamp. Returns current date if not found.';

-- =====================================================
-- SECTION 7: Documentation and Summary
-- =====================================================

COMMENT ON COLUMN inventory_items.package_date IS
  'Date when packaging session completed. Only set for packaged products (3.5g, 14g, 454g, prerolls).
  Used for label generation and inventory age tracking.
  NULL indicates bulk (non-packaged) inventory.
  Migration: 20251024220000_add_package_date_tracking.sql';

-- Add table comment update
COMMENT ON TABLE inventory_items IS
  'ACTIVE: Primary inventory table. Each row represents a distinct inventory item (package or unit).
  Updated: Added package_date for packaged product tracking.
  Migration: 20251024220000_add_package_date_tracking.sql';

COMMENT ON TABLE conversion_packages IS
  'Tracks packages created during conversion process with full traceability.
  Updated: Added packaged_at to capture packaging session completion date.
  Migration: 20251024220000_add_package_date_tracking.sql';

COMMENT ON TABLE pending_conversions IS
  'Stores raw session outputs awaiting manager conversion approval.
  Updated: Added session_completed_at to track when source session completed.
  Migration: 20251024220000_add_package_date_tracking.sql';
