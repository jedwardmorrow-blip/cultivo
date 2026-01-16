/*
  # Phase 1: Batch-Centric Foundation

  ## Overview
  This migration transforms the system to make batches the core organizational principle.
  It adds foreign key constraints, lifecycle management, and traceability infrastructure.

  ## Changes

  1. **Batch Registry Enhancements**
     - Add lifecycle_state column for batch progression tracking
     - Add lifecycle timestamps for state transitions
     - Add batch quality and compliance fields

  2. **Foreign Key Constraints**
     - Link trim_sessions.batch_id → batch_registry.id
     - Link packaging_sessions.batch_id → batch_registry.id
     - Link consolidated_packages to batch_registry
     - Link inventory tables to batch_registry

  3. **New Tracking Tables**
     - batch_production_history: Complete audit trail of all batch transformations
     - batch_package_lineage: Track every package ID associated with a batch
     - batch_lifecycle_events: Log all state transitions and important events

  4. **Indexes for Performance**
     - Batch number lookups
     - Session batch queries
     - Package lineage searches

  5. **Data Validation**
     - Check constraints for lifecycle states
     - Validation rules for state transitions

  ## Security
  - RLS enabled on all new tables
  - Authenticated users can view and manage batch data

  ## Migration Safety
  - Uses IF NOT EXISTS for all new columns
  - Preserves existing data
  - No data loss risk
*/

-- =====================================================
-- STEP 1: Enhance batch_registry with lifecycle states
-- =====================================================

-- Add lifecycle_state column to track batch progression
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_registry' AND column_name = 'lifecycle_state'
  ) THEN
    ALTER TABLE batch_registry ADD COLUMN lifecycle_state text DEFAULT 'created';
  END IF;
END $$;

-- Add lifecycle timestamps
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_registry' AND column_name = 'bucking_started_at'
  ) THEN
    ALTER TABLE batch_registry ADD COLUMN bucking_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_registry' AND column_name = 'trimming_started_at'
  ) THEN
    ALTER TABLE batch_registry ADD COLUMN trimming_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_registry' AND column_name = 'packaging_started_at'
  ) THEN
    ALTER TABLE batch_registry ADD COLUMN packaging_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_registry' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE batch_registry ADD COLUMN completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_registry' AND column_name = 'depleted_at'
  ) THEN
    ALTER TABLE batch_registry ADD COLUMN depleted_at timestamptz;
  END IF;
END $$;

-- Add quality and compliance fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_registry' AND column_name = 'is_quarantined'
  ) THEN
    ALTER TABLE batch_registry ADD COLUMN is_quarantined boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_registry' AND column_name = 'quarantine_reason'
  ) THEN
    ALTER TABLE batch_registry ADD COLUMN quarantine_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_registry' AND column_name = 'quarantined_at'
  ) THEN
    ALTER TABLE batch_registry ADD COLUMN quarantined_at timestamptz;
  END IF;
END $$;

-- Add lifecycle state constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_batch_lifecycle_state'
  ) THEN
    ALTER TABLE batch_registry
    ADD CONSTRAINT valid_batch_lifecycle_state
    CHECK (lifecycle_state IN (
      'created',           -- Initial harvest/bucking
      'bucked',            -- Bucked and ready for trimming
      'in_trim',           -- Being trimmed
      'bulk_available',    -- Trimmed into bulk flower/smalls/trim
      'in_packaging',      -- Being packaged
      'packaged',          -- Packaged and ready for sale
      'partially_depleted',-- Some stages depleted, others available
      'depleted',          -- All material used
      'archived'           -- Completed and archived
    ));
  END IF;
END $$;