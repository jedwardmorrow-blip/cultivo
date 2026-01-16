/*
  # Add status tracking to order items

  1. Changes
    - Add status enum type for order item workflow stages
    - Add status column to order_items table with default 'trimming'
    - Add updated_at timestamp for tracking status changes

  2. Status Flow
    - trimming: Initial state, product needs to be trimmed
    - packaging: Trim complete, needs packaging
    - labeling: Packaged, needs labeling
    - pending_coa: Labeled, waiting for Certificate of Analysis
    - ready_for_delivery: COA received, ready to ship
*/

-- Create enum for order item status
DO $$ BEGIN
  CREATE TYPE order_item_status AS ENUM (
    'trimming',
    'packaging',
    'labeling',
    'pending_coa',
    'ready_for_delivery'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add status column to order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'status'
  ) THEN
    ALTER TABLE order_items ADD COLUMN status order_item_status DEFAULT 'trimming';
  END IF;
END $$;

-- Add updated_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE order_items ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create trigger to update updated_at on status change
CREATE OR REPLACE FUNCTION update_order_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_order_item_updated_at ON order_items;

CREATE TRIGGER update_order_item_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_item_timestamp();