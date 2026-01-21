/*
  # Add Trim Product Name Column to Trim Sessions

  ## Problem
  Trim sessions record trim_grams but there's no product name column for trim outputs.
  This causes trim to be invisible in the conversions workflow, even though the data exists.

  ## Solution
  Add output_product_trim_name column to trim_sessions table to track trim byproduct
  product names, mirroring the pattern used for flower and smalls outputs.

  ## Changes
  1. Add output_product_trim_name TEXT column to trim_sessions
  2. Column stores product name like "Bulk Trim (Trimmed)" when trim_grams > 0
  3. Will be populated by trigger on session completion
  4. Enables trim to appear in pending_conversion_sessions view

  ## Impact
  - Completes the session output tracking (flower + smalls + trim)
  - Enables trim finalization workflow
  - No breaking changes (additive only)
*/

-- =====================================================
-- Add trim product name column
-- =====================================================

ALTER TABLE trim_sessions
  ADD COLUMN IF NOT EXISTS output_product_trim_name TEXT;

COMMENT ON COLUMN trim_sessions.output_product_trim_name IS
'Product name for trim byproduct output (e.g., "Bulk Trim (Trimmed)").
Captured at session completion time for immutable traceability. NULL if
session produced no trim (trim_grams = 0 or NULL).';

-- =====================================================
-- Add index for conversion queries
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_trim_sessions_trim_product_name
  ON trim_sessions(output_product_trim_name)
  WHERE output_product_trim_name IS NOT NULL
    AND session_status = 'completed'
    AND finalization_status = 'pending';

COMMENT ON INDEX idx_trim_sessions_trim_product_name IS
'Speeds up pending_conversion_sessions view queries for trim products.
Partial index only covers rows that appear in conversions view.';