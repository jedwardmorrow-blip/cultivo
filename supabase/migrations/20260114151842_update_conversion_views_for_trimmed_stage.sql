/*
  # Update Conversion Views and RPCs for Trimmed Stage

  ## Problem
  The pending_conversion_sessions view and related RPC functions still reference
  the old "Trimmed" stage name which was already created in previous migrations.
  No changes needed - "Trimmed" is the correct canonical name.

  ## Verification
  This migration just adds a comment to confirm the stage names are correct.
*/

COMMENT ON VIEW pending_conversion_sessions IS
'Aggregated pending conversions grouped by batch + product.
Uses canonical stage names: Binned, Bucked, Trimmed, Packaged
Multiple sessions with same batch+product are combined into single row.
session_ids array tracks all source sessions.
session_count shows how many sessions were aggregated.';
