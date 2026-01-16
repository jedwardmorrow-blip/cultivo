/*
  # Add batch_id column to certificates_of_analysis

  1. Changes
    - Add `batch_id` column to `certificates_of_analysis` table as UUID foreign key
    - This column links COAs directly to batches in the batch_registry
    - Column is nullable to support existing records and gradual migration
    
  2. Reasoning
    - The application expects a `batch_id` column but it was missing
    - This was causing 400 errors when trying to insert/query COAs
    - The column is required for the batch-COA relationship to work properly
*/

-- Add batch_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'certificates_of_analysis' 
    AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE certificates_of_analysis 
    ADD COLUMN batch_id uuid REFERENCES batch_registry(id) ON DELETE SET NULL;
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_certificates_of_analysis_batch_id 
    ON certificates_of_analysis(batch_id);
  END IF;
END $$;