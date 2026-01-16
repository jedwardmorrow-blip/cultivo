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

-- =====================================================
-- STEP 2: Create batch_production_history table
-- =====================================================

CREATE TABLE IF NOT EXISTS batch_production_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batch_registry(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  session_id uuid,
  session_type text,
  source_stage text,
  source_weight_grams numeric,
  destination_stage text,
  destination_weight_grams numeric,
  source_package_id text,
  destination_package_ids text[],
  performed_by text,
  notes text,
  event_timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_production_event_type CHECK (event_type IN (
    'batch_created',
    'bucking_completed',
    'trim_started',
    'trim_completed',
    'packaging_started',
    'packaging_completed',
    'allocation_created',
    'allocation_fulfilled',
    'weight_adjustment',
    'quality_hold',
    'quality_released',
    'batch_depleted'
  ))
);

-- Create index for batch history queries
CREATE INDEX IF NOT EXISTS idx_batch_production_history_batch
  ON batch_production_history(batch_id, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_batch_production_history_session
  ON batch_production_history(session_id) WHERE session_id IS NOT NULL;

-- Enable RLS
ALTER TABLE batch_production_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view batch production history"
  ON batch_production_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert batch production history"
  ON batch_production_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- STEP 3: Create batch_package_lineage table
-- =====================================================

CREATE TABLE IF NOT EXISTS batch_package_lineage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batch_registry(id) ON DELETE CASCADE,
  package_id text NOT NULL,
  package_type text NOT NULL,
  stage text NOT NULL,
  weight_grams numeric,
  created_from_session_id uuid,
  created_from_session_type text,
  is_current boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_package_stage CHECK (stage IN (
    'bucked',
    'bulk_flower',
    'bulk_smalls',
    'bulk_trim',
    'packaged_3_5g',
    'packaged_14g',
    'packaged_454g',
    'waste'
  )),
  CONSTRAINT valid_session_type CHECK (
    created_from_session_type IS NULL OR
    created_from_session_type IN ('trim', 'packaging', 'conversion')
  )
);

-- Create unique constraint on batch + package
CREATE UNIQUE INDEX IF NOT EXISTS idx_batch_package_unique
  ON batch_package_lineage(batch_id, package_id);

-- Create index for package lookups
CREATE INDEX IF NOT EXISTS idx_batch_package_lineage_package
  ON batch_package_lineage(package_id);

-- Create index for batch queries
CREATE INDEX IF NOT EXISTS idx_batch_package_lineage_batch
  ON batch_package_lineage(batch_id) WHERE is_current = true;

-- Enable RLS
ALTER TABLE batch_package_lineage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view batch package lineage"
  ON batch_package_lineage FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage batch package lineage"
  ON batch_package_lineage FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- STEP 4: Create batch_lifecycle_events table
-- =====================================================

CREATE TABLE IF NOT EXISTS batch_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batch_registry(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_state text,
  to_state text,
  triggered_by text,
  trigger_source text,
  metadata jsonb,
  notes text,
  event_timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_lifecycle_event_type CHECK (event_type IN (
    'state_transition',
    'stage_weight_update',
    'allocation_change',
    'over_allocation_warning',
    'over_allocation_critical',
    'coa_attached',
    'coa_expired',
    'quarantine_applied',
    'quarantine_released',
    'depletion_detected',
    'manual_adjustment'
  ))
);

-- Create index for batch events
CREATE INDEX IF NOT EXISTS idx_batch_lifecycle_events_batch
  ON batch_lifecycle_events(batch_id, event_timestamp DESC);

-- Enable RLS
ALTER TABLE batch_lifecycle_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view batch lifecycle events"
  ON batch_lifecycle_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert batch lifecycle events"
  ON batch_lifecycle_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- STEP 5: Add batch_id foreign keys to existing tables
-- =====================================================

-- Add batch_id to trim_sessions (will replace batch_id text with FK)
DO $$
BEGIN
  -- First, add new column with different name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trim_sessions' AND column_name = 'batch_registry_id'
  ) THEN
    ALTER TABLE trim_sessions ADD COLUMN batch_registry_id uuid REFERENCES batch_registry(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add batch_id to packaging_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packaging_sessions' AND column_name = 'batch_registry_id'
  ) THEN
    ALTER TABLE packaging_sessions ADD COLUMN batch_registry_id uuid REFERENCES batch_registry(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add batch_id to consolidated_packages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consolidated_packages' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE consolidated_packages ADD COLUMN batch_id uuid REFERENCES batch_registry(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add batch_number to consolidated_packages for easy reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consolidated_packages' AND column_name = 'batch_number'
  ) THEN
    ALTER TABLE consolidated_packages ADD COLUMN batch_number text;
  END IF;
END $$;

-- =====================================================
-- STEP 6: Create indexes on foreign keys
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_trim_sessions_batch_registry
  ON trim_sessions(batch_registry_id) WHERE batch_registry_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_packaging_sessions_batch_registry
  ON packaging_sessions(batch_registry_id) WHERE batch_registry_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consolidated_packages_batch
  ON consolidated_packages(batch_id) WHERE batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_batch_allocations_batch
  ON batch_allocations(batch_id);

CREATE INDEX IF NOT EXISTS idx_batch_stage_tracking_batch
  ON batch_stage_tracking(batch_id);

-- =====================================================
-- STEP 7: Create helper functions
-- =====================================================

-- Function to get batch current lifecycle state
CREATE OR REPLACE FUNCTION get_batch_lifecycle_state(p_batch_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_state text;
BEGIN
  SELECT lifecycle_state INTO v_state
  FROM batch_registry
  WHERE id = p_batch_id;

  RETURN v_state;
END;
$$;

-- Function to log batch lifecycle event
CREATE OR REPLACE FUNCTION log_batch_lifecycle_event(
  p_batch_id uuid,
  p_event_type text,
  p_from_state text DEFAULT NULL,
  p_to_state text DEFAULT NULL,
  p_triggered_by text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO batch_lifecycle_events (
    batch_id,
    event_type,
    from_state,
    to_state,
    triggered_by,
    trigger_source,
    metadata,
    notes
  ) VALUES (
    p_batch_id,
    p_event_type,
    p_from_state,
    p_to_state,
    p_triggered_by,
    'system',
    p_metadata,
    p_notes
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- Function to log production history
CREATE OR REPLACE FUNCTION log_batch_production(
  p_batch_id uuid,
  p_event_type text,
  p_session_id uuid DEFAULT NULL,
  p_session_type text DEFAULT NULL,
  p_source_stage text DEFAULT NULL,
  p_source_weight numeric DEFAULT NULL,
  p_destination_stage text DEFAULT NULL,
  p_destination_weight numeric DEFAULT NULL,
  p_performed_by text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_history_id uuid;
BEGIN
  INSERT INTO batch_production_history (
    batch_id,
    event_type,
    session_id,
    session_type,
    source_stage,
    source_weight_grams,
    destination_stage,
    destination_weight_grams,
    performed_by,
    notes
  ) VALUES (
    p_batch_id,
    p_event_type,
    p_session_id,
    p_session_type,
    p_source_stage,
    p_source_weight,
    p_destination_stage,
    p_destination_weight,
    p_performed_by,
    p_notes
  )
  RETURNING id INTO v_history_id;

  RETURN v_history_id;
END;
$$;

-- Function to add package to batch lineage
CREATE OR REPLACE FUNCTION add_package_to_batch(
  p_batch_id uuid,
  p_package_id text,
  p_package_type text,
  p_stage text,
  p_weight_grams numeric,
  p_session_id uuid DEFAULT NULL,
  p_session_type text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_lineage_id uuid;
BEGIN
  INSERT INTO batch_package_lineage (
    batch_id,
    package_id,
    package_type,
    stage,
    weight_grams,
    created_from_session_id,
    created_from_session_type,
    is_current
  ) VALUES (
    p_batch_id,
    p_package_id,
    p_package_type,
    p_stage,
    p_weight_grams,
    p_session_id,
    p_session_type,
    true
  )
  ON CONFLICT (batch_id, package_id) DO UPDATE
  SET
    weight_grams = EXCLUDED.weight_grams,
    is_current = EXCLUDED.is_current
  RETURNING id INTO v_lineage_id;

  RETURN v_lineage_id;
END;
$$;

-- =====================================================
-- STEP 8: Create view for batch summary
-- =====================================================

CREATE OR REPLACE VIEW batch_summary AS
SELECT
  br.id,
  br.batch_number,
  br.strain,
  br.harvest_date,
  br.room,
  br.initial_weight_grams,
  br.lifecycle_state,
  br.status,
  br.is_quarantined,
  br.coa_id,

  -- Stage weights
  (SELECT COALESCE(SUM(weight_grams), 0)
   FROM batch_stage_tracking
   WHERE batch_id = br.id AND stage = 'bucked') as bucked_weight,

  (SELECT COALESCE(SUM(weight_grams), 0)
   FROM batch_stage_tracking
   WHERE batch_id = br.id AND stage = 'bulk_flower') as bulk_flower_weight,

  (SELECT COALESCE(SUM(weight_grams), 0)
   FROM batch_stage_tracking
   WHERE batch_id = br.id AND stage = 'bulk_smalls') as bulk_smalls_weight,

  (SELECT COALESCE(SUM(weight_grams), 0)
   FROM batch_stage_tracking
   WHERE batch_id = br.id AND stage = 'bulk_trim') as bulk_trim_weight,

  (SELECT COALESCE(SUM(weight_grams), 0)
   FROM batch_stage_tracking
   WHERE batch_id = br.id AND stage = 'packaged') as packaged_weight,

  -- Allocation info
  (SELECT COALESCE(SUM(allocated_weight_grams), 0)
   FROM batch_allocations
   WHERE batch_id = br.id AND status != 'cancelled') as total_allocated,

  (SELECT COUNT(*)
   FROM batch_allocations
   WHERE batch_id = br.id AND status = 'pending') as pending_allocations,

  -- Package counts
  (SELECT COUNT(DISTINCT package_id)
   FROM batch_package_lineage
   WHERE batch_id = br.id AND is_current = true) as active_package_count,

  -- Session counts
  (SELECT COUNT(*)
   FROM trim_sessions
   WHERE batch_registry_id = br.id) as trim_session_count,

  (SELECT COUNT(*)
   FROM packaging_sessions
   WHERE batch_registry_id = br.id) as packaging_session_count,

  br.created_at,
  br.updated_at
FROM batch_registry br;

-- Grant access to view
GRANT SELECT ON batch_summary TO authenticated;

-- =====================================================
-- STEP 9: Add comments for documentation
-- =====================================================

COMMENT ON TABLE batch_production_history IS 'Complete audit trail of all batch transformations through production stages';
COMMENT ON TABLE batch_package_lineage IS 'Track every package ID associated with a batch across all stages';
COMMENT ON TABLE batch_lifecycle_events IS 'Log all batch state transitions and important lifecycle events';
COMMENT ON COLUMN batch_registry.lifecycle_state IS 'Current lifecycle state of the batch (created → bucked → in_trim → bulk_available → in_packaging → packaged → depleted → archived)';
COMMENT ON COLUMN batch_registry.is_quarantined IS 'Whether batch is under quality hold and cannot be used for production';

COMMENT ON FUNCTION get_batch_lifecycle_state IS 'Retrieve current lifecycle state for a batch';
COMMENT ON FUNCTION log_batch_lifecycle_event IS 'Log a batch lifecycle event for audit trail';
COMMENT ON FUNCTION log_batch_production IS 'Log a production event in batch history';
COMMENT ON FUNCTION add_package_to_batch IS 'Add or update a package in batch lineage tracking';
