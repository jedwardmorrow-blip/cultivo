/*
  # Add Cancellation Movement Types

  1. Updates
    - Adds 'trim_cancelled' and 'packaging_cancelled' to valid_movement_type constraint
    - Allows inventory_movements table to track cancellation events

  2. Security
    - No changes to RLS policies
*/

-- Drop the existing constraint
ALTER TABLE inventory_movements 
DROP CONSTRAINT IF EXISTS valid_movement_type;

-- Add the updated constraint with cancellation types
ALTER TABLE inventory_movements 
ADD CONSTRAINT valid_movement_type CHECK (
  movement_type IN (
    'trim_start',
    'trim_complete',
    'trim_cancelled',
    'packaging_start',
    'packaging_complete',
    'packaging_cancelled',
    'manual_adjustment',
    'csv_sync'
  )
);
