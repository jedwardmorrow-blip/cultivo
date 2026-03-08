/*
  # Fix orders.status default value

  1. Changes
    - Change `orders.status` column default from 'pending' to 'submitted'
    - The previous default 'pending' would fail the existing CHECK constraint
      which only allows: submitted, accepted, processing, ready_for_delivery, completed, cancelled

  2. Important Notes
    - Non-destructive change: only affects new rows
    - No existing data is modified
*/

ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'submitted';
