/*
  # Add Pinned Column to Activity Log

  1. Modified Tables
    - `customer_activity_log`
      - `pinned` (boolean, default false) - marks activities as pinned for quick reference on account detail pages

  2. Security
    - No RLS changes needed - existing policies on customer_activity_log already cover all operations

  3. Performance
    - Add index on (customer_id, pinned) for efficient filtered queries
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_activity_log' AND column_name = 'pinned'
  ) THEN
    ALTER TABLE customer_activity_log ADD COLUMN pinned boolean NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customer_activity_log_pinned
  ON customer_activity_log (customer_id, pinned)
  WHERE pinned = true;
