/*
  # Add order status workflow and archive functionality

  1. Changes
    - Add archived boolean column to orders table
    - Update existing orders from 'pending' to 'submitted'
    - Update order status enum to include proper workflow statuses
    - Add index on archived column for filtering

  2. Status Workflow
    - submitted: Order has been submitted
    - accepted: Order has been accepted for processing
    - processing: Order is being processed
    - ready_for_delivery: Order is ready for delivery
    - completed: Order has been completed (can be archived)

  3. Archive Feature
    - archived column defaults to false
    - Completed orders can be archived to clear from main order view
    - Archived orders remain in database for reporting
*/

-- Add archived column to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'archived'
  ) THEN
    ALTER TABLE orders ADD COLUMN archived boolean DEFAULT false;
  END IF;
END $$;

-- Create index on archived for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_archived ON orders(archived);

-- Update existing 'pending' orders to 'submitted'
UPDATE orders SET status = 'submitted' WHERE status = 'pending';

-- Update the status check constraint if it exists
DO $$
BEGIN
  -- Drop the old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_status_check' 
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_status_check;
  END IF;
  
  -- Add new constraint with updated statuses
  ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('submitted', 'accepted', 'processing', 'ready_for_delivery', 'completed', 'cancelled'));
END $$;