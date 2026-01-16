/*
  # Add aggregation_id to conversion_packages

  1. Changes
    - Add aggregation_id column to conversion_packages table
    - Create index for efficient lookups
    - Allows stable matching between UI aggregations and database packages

  2. Reason
    - pending_conversion_sessions view uses aggregation_id for grouping
    - conversion_packages needs same ID to reliably link packages to aggregations
    - Enables UI to track which packages came from which aggregation

  3. Impact
    - No breaking changes - column is nullable
    - Backward compatible with existing packages (NULL aggregation_id)
    - New packages will include aggregation_id for better tracking
*/

-- Add aggregation_id column
ALTER TABLE conversion_packages
ADD COLUMN IF NOT EXISTS aggregation_id UUID;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_conversion_packages_aggregation_id
ON conversion_packages(aggregation_id);

-- Add comment explaining the field
COMMENT ON COLUMN conversion_packages.aggregation_id IS
'Stable UUID matching pending_conversion_sessions.aggregation_id for reliable linking.
Allows UI to track which packages came from which session aggregation.
Enables better traceability between session outputs and finalized packages.';
