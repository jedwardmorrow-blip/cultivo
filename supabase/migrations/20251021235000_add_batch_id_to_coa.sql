/*
  # Add Batch Foreign Key to Certificates of Analysis

  ## Overview
  Links COAs to batches in the batch registry for proper tracking and relationships.

  ## Changes

  1. **Schema Modifications**
     - Add `batch_id` column to certificates_of_analysis
     - Add foreign key constraint to batch_registry
     - Add index for efficient batch lookups

  2. **Data Integrity**
     - Column allows NULL for backwards compatibility
     - Foreign key uses ON DELETE SET NULL to preserve COA data

  ## Security
  - No RLS changes needed - existing policies cover this column

  ## Migration Safety
  - Uses IF NOT EXISTS to prevent errors on re-run
  - Preserves all existing data
  - No breaking changes
*/

-- Add batch_id column to certificates_of_analysis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'certificates_of_analysis' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE certificates_of_analysis
    ADD COLUMN batch_id uuid REFERENCES batch_registry(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for efficient batch lookups
CREATE INDEX IF NOT EXISTS idx_coa_batch_id
ON certificates_of_analysis(batch_id)
WHERE batch_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN certificates_of_analysis.batch_id IS
'Foreign key to batch_registry. Links COA to a specific batch for traceability.';
