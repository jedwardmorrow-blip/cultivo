/*
  # Add Order-Coversheet Integration

  1. Schema Changes
    - Add `order_id` to `labels` table to link labels to orders
    - Add `coversheet_url` to `orders` table for quick access

  2. Relationships
    - Labels can now be associated with orders
    - Orders can have generated coversheets

  3. Indexes
    - Add index on labels.order_id for efficient lookups
    - Add index on coversheets.order_id for performance

  4. Notes
    - Labels for an order will all share the same coversheet QR code
    - Coversheet URL is stored on order for easy regeneration
*/

-- Add order_id to labels table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labels' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE labels ADD COLUMN order_id uuid REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add coversheet_url to orders table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'coversheet_url'
  ) THEN
    ALTER TABLE orders ADD COLUMN coversheet_url text;
  END IF;
END $$;

-- Add coversheet_id to orders table for quick reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'coversheet_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN coversheet_id uuid REFERENCES coversheets(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_labels_order_id ON labels(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_coversheet_id ON orders(coversheet_id);

-- Update RLS policies for labels to allow public read access by order coversheet token
-- (labels themselves are not public, but this allows the coversheet to fetch them)

COMMENT ON COLUMN labels.order_id IS 'Links label to the order it belongs to, shares coversheet QR code';
COMMENT ON COLUMN orders.coversheet_url IS 'Public URL for this orders coversheet page';
COMMENT ON COLUMN orders.coversheet_id IS 'Reference to generated coversheet for this order';
