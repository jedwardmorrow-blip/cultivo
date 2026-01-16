/*
  # Remove Duplicate Conversion Lot Aggregation Trigger

  ## Problem
  There are two triggers on pending_conversions attempting to aggregate into
  conversion_lots:
  1. trigger_auto_update_conversion_lots → auto_update_conversion_lots()
  2. trg_aggregate_pending_to_lots_insert → upsert_conversion_lot_from_pending()

  Both fire on INSERT, causing duplicate work and conflicts. The older
  auto_update_conversion_lots() function also has a bug where it can set
  both weight and units to NULL, violating the constraint.

  ## Solution
  Drop the older trigger_auto_update_conversion_lots and its function.
  Keep the newer, better trg_aggregate_pending_to_lots_* triggers.

  ## Changes
  - Drops trigger: trigger_auto_update_conversion_lots
  - Drops function: auto_update_conversion_lots()
*/

-- Drop the old trigger
DROP TRIGGER IF EXISTS trigger_auto_update_conversion_lots ON pending_conversions;

-- Drop the old function
DROP FUNCTION IF EXISTS auto_update_conversion_lots();

-- Verify remaining triggers are correct
COMMENT ON TRIGGER trg_aggregate_pending_to_lots_insert ON pending_conversions IS
'Primary aggregation trigger - creates/updates conversion_lots from pending_conversions';

COMMENT ON TRIGGER trg_aggregate_pending_to_lots_update ON pending_conversions IS
'Updates conversion_lots when pending_conversion quantities or status change';
