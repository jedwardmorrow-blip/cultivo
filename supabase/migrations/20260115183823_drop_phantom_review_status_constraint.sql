/*
  # Drop Phantom review_status Constraint

  1. Changes
    - Drop CHECK constraint inventory_items_review_status_check if it exists
    - This constraint blocks INSERT operations but was never added through migrations

  2. Context
    - Decision #2 claimed to implement review_status workflow but never actually did
    - Decision #4 superseded it with finalization_status in conversion_packages
    - Phantom constraint exists in live database but not in migration history
    - Blocking conversions → inventory flow implemented in Part 2

  3. Impact
    - Enables finalizeConversion() to create inventory_items successfully
    - No functional changes - removes blocker only
    - Aligns database state with migration history
*/

-- Drop the phantom constraint if it exists
-- Use IF EXISTS to make this migration idempotent
ALTER TABLE inventory_items
DROP CONSTRAINT IF EXISTS inventory_items_review_status_check;

COMMENT ON TABLE inventory_items IS
'Inventory tracking table. Uses conversion_packages.finalization_status for workflow state.
No review_status column - that architecture was never implemented (Decision #2 superseded by Decision #4).';