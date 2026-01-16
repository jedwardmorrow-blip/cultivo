/*
  # Add Product Name Columns to Session Tables

  ## Purpose
  Capture product names at session completion time for immutable traceability.
  This eliminates fragile product lookups in VIEWs and RPC functions.

  ## Changes
  1. Add product_name columns to all three session types:
     - bucking_sessions: output_product_flower_name, output_product_smalls_name
     - trim_sessions: output_product_bigs_name, output_product_smalls_name
     - packaging_sessions: output_product_name

  2. These columns store the final product name (e.g., "Bulk Flower (Bucked)")
     at the moment the session is completed, creating an immutable audit trail.

  ## Benefits
  - Eliminates 15+ complex product lookups from VIEWs
  - Prevents NULL product_id issues
  - Prevents duplicate aggregation_id issues
  - Simplifies VIEW from 270 lines to ~80 lines
  - Improves query performance (no subqueries needed)
  - Maintains full traceability (captured at source)

  ## Related Sessions
  - Part 1-5 (2026-01-15): Multiple attempts to fix product lookup bugs
  - This session: Root cause elimination by capturing names at source
*/

-- Add product name columns to bucking_sessions
ALTER TABLE bucking_sessions
  ADD COLUMN IF NOT EXISTS output_product_flower_name TEXT,
  ADD COLUMN IF NOT EXISTS output_product_smalls_name TEXT;

COMMENT ON COLUMN bucking_sessions.output_product_flower_name IS
'Product name for bucked flower output (e.g., "Bulk Flower (Bucked)").
Captured at session completion time for immutable traceability. Eliminates
need for complex product lookups in VIEWs and RPC functions.';

COMMENT ON COLUMN bucking_sessions.output_product_smalls_name IS
'Product name for bucked smalls output (e.g., "Bulk Smalls (Bucked)").
Captured at session completion time for immutable traceability. NULL if
session produced no smalls.';

-- Add product name columns to trim_sessions
ALTER TABLE trim_sessions
  ADD COLUMN IF NOT EXISTS output_product_bigs_name TEXT,
  ADD COLUMN IF NOT EXISTS output_product_smalls_name TEXT;

COMMENT ON COLUMN trim_sessions.output_product_bigs_name IS
'Product name for trimmed big buds output (e.g., "Bulk Flower (Trimmed)").
Captured at session completion time for immutable traceability.';

COMMENT ON COLUMN trim_sessions.output_product_smalls_name IS
'Product name for trimmed small buds output (e.g., "Bulk Smalls (Trimmed)").
Captured at session completion time for immutable traceability. NULL if
session produced no smalls.';

-- Add product name column to packaging_sessions
ALTER TABLE packaging_sessions
  ADD COLUMN IF NOT EXISTS output_product_name TEXT;

COMMENT ON COLUMN packaging_sessions.output_product_name IS
'Product name for packaged output. Captured at session completion time for
immutable traceability. Typically set to the specific product being packaged.';
