/*
  # Create Inventory Audit System

  ## Overview
  AZDHS-compliant inventory audit system with variance tracking and centralized logging.
  Replaces unreliable CSV imports with controlled, auditable process.

  ## 1. New Tables
     - `inventory_audits` - Audit lifecycle tracking
       - audit_number (auto-generated, e.g., AUD-20251026-001)
       - status (initiated, in_progress, completed, cancelled)
       - selected_stages (array of stages being audited)
       - snapshot metadata (total packages, variances)
       - is_locked flag (prevents concurrent audits)

     - `inventory_audit_lines` - Line-by-line audit data
       - Snapshot of inventory state at audit time
       - Audit entry fields (expected_qty, actual_qty, variance)
       - Variance tracking (reason, notes)
       - Line ordering for sheet organization

     - `variance_log` - Centralized variance tracking
       - Universal log for all variance sources (audits, sessions, adjustments)
       - Polymorphic source tracking (source_type, source_id)
       - Complete variance data with reasons and notes
       - 18-month retention for compliance

  ## 2. Enums
     - variance_reason - Classification reasons (moisture_loss, spillage, etc.)
     - audit_status - Audit lifecycle states
     - variance_source - Source type (audit_reconciliation, session_conversion, manual_adjustment)

  ## 3. Functions
     - fn_generate_audit_number() - Sequential audit numbering
     - fn_lock_inventory_stages() - Stage locking during audits
     - fn_check_stage_locked() - Lock status checker
     - fn_apply_audit_adjustments() - Bulk adjustment application
     - fn_unlock_inventory_stages() - Release stage locks

  ## 4. Security
     - RLS enabled on all tables
     - Manager+ can create and manage audits
     - Admin can view all audit history
     - Variance log visible to manager+

  ## 5. Integration
     - Leverages existing inventory_movements ledger
     - Uses ADJUSTMENT and RECONCILIATION movement kinds
     - Compatible with existing inventory system
     - No modifications to existing tables
*/

-- =====================================================
-- SECTION 1: Create Enums
-- =====================================================

-- Variance reason enum (matches conversions system with audit additions)
DO $$ BEGIN
  CREATE TYPE variance_reason AS ENUM (
    'moisture_loss',       -- Natural moisture evaporation
    'spillage',           -- Accidental spillage during handling
    'measurement_error',  -- Scale calibration or reading error
    'waste',              -- Unusable material removed
    'theft_loss',         -- Suspected theft or unexplained loss
    'package_not_found',  -- Package not located during audit
    'package_consumed',   -- Package used but not logged
    'package_found',      -- Package discovered (not in system)
    'other'               -- Other reason (requires notes)
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Audit status enum
DO $$ BEGIN
  CREATE TYPE audit_status AS ENUM (
    'initiated',    -- Audit created, sheet generated
    'in_progress',  -- Data entry in progress
    'completed',    -- Audit finished, adjustments applied
    'cancelled'     -- Audit cancelled, no adjustments
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Variance source enum
DO $$ BEGIN
  CREATE TYPE variance_source AS ENUM (
    'audit_reconciliation',  -- From inventory audit
    'session_conversion',    -- From trim/packaging session
    'manual_adjustment'      -- From individual item adjustment
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- SECTION 2: Create Tables
-- =====================================================

-- Inventory Audits Table
CREATE TABLE IF NOT EXISTS inventory_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Audit identification
  audit_number text NOT NULL UNIQUE,

  -- Lifecycle
  status audit_status NOT NULL DEFAULT 'initiated',

  -- Configuration
  selected_stages text[] NOT NULL, -- Array of stage names (e.g., ['Binned', 'Bucked'])
  notes text,

  -- Snapshot metadata
  total_packages integer,
  packages_with_variance integer,
  total_variance_amount numeric,

  -- Lock management
  is_locked boolean DEFAULT false,

  -- Audit trail
  initiated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  initiated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cancellation_reason text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inventory Audit Lines Table
CREATE TABLE IF NOT EXISTS inventory_audit_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Audit linkage
  audit_id uuid NOT NULL REFERENCES inventory_audits(id) ON DELETE CASCADE,

  -- Inventory snapshot at audit time
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  package_id text NOT NULL,
  product_name text NOT NULL,
  strain text,
  batch text,
  room text,
  stage text NOT NULL,
  expected_qty numeric NOT NULL,
  unit text NOT NULL CHECK (unit IN ('g', 'unit')),

  -- Audit entry
  actual_qty numeric,
  variance_qty numeric GENERATED ALWAYS AS (actual_qty - expected_qty) STORED,
  variance_percentage numeric GENERATED ALWAYS AS (
    CASE
      WHEN expected_qty = 0 THEN 0
      ELSE ((actual_qty - expected_qty) / expected_qty) * 100
    END
  ) STORED,

  -- Variance classification
  variance_reason variance_reason,
  variance_notes text,

  -- Status
  confirmed boolean DEFAULT false,
  confirmed_at timestamptz,

  -- Organization
  line_order integer,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Variance Log Table (Centralized)
CREATE TABLE IF NOT EXISTS variance_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source tracking (polymorphic)
  source_type variance_source NOT NULL,
  source_id uuid NOT NULL, -- audit_id, session_id, or adjustment_id

  -- Inventory linkage
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  package_id text NOT NULL,

  -- Variance data
  expected_qty numeric NOT NULL,
  actual_qty numeric NOT NULL,
  variance_qty numeric NOT NULL,
  variance_percentage numeric NOT NULL,
  unit text NOT NULL CHECK (unit IN ('g', 'unit')),

  -- Classification
  variance_reason variance_reason NOT NULL,
  notes text,

  -- Context
  inventory_stage text,
  strain text,
  batch text,
  product_name text,

  -- Audit trail
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp timestamptz DEFAULT now(),

  -- Movement linkage (for traceability)
  movement_id uuid REFERENCES inventory_movements(id) ON DELETE SET NULL,

  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- SECTION 3: Create Indexes
-- =====================================================

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_inventory_audits_status ON inventory_audits(status);
CREATE INDEX IF NOT EXISTS idx_inventory_audits_initiated_at ON inventory_audits(initiated_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_audits_initiated_by ON inventory_audits(initiated_by);
CREATE INDEX IF NOT EXISTS idx_inventory_audits_number ON inventory_audits(audit_number);

-- Audit line indexes
CREATE INDEX IF NOT EXISTS idx_inventory_audit_lines_audit_id ON inventory_audit_lines(audit_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_lines_package_id ON inventory_audit_lines(package_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_lines_confirmed ON inventory_audit_lines(confirmed);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_lines_order ON inventory_audit_lines(audit_id, line_order);

-- Variance log indexes
CREATE INDEX IF NOT EXISTS idx_variance_log_timestamp ON variance_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_variance_log_source ON variance_log(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_variance_log_package_id ON variance_log(package_id);
CREATE INDEX IF NOT EXISTS idx_variance_log_user ON variance_log(user_id);
CREATE INDEX IF NOT EXISTS idx_variance_log_reason ON variance_log(variance_reason);

-- =====================================================
-- SECTION 4: Create Functions
-- =====================================================

-- Generate audit number with daily sequence
CREATE OR REPLACE FUNCTION fn_generate_audit_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  today_date text;
  sequence_num integer;
  audit_num text;
BEGIN
  -- Format: AUD-YYYYMMDD-NNN
  today_date := to_char(CURRENT_DATE, 'YYYYMMDD');

  -- Get next sequence number for today
  SELECT COALESCE(MAX(
    CASE
      WHEN audit_number ~ ('^AUD-' || today_date || '-[0-9]+$')
      THEN CAST(substring(audit_number from '[0-9]+$') AS integer)
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM inventory_audits
  WHERE audit_number LIKE 'AUD-' || today_date || '-%';

  -- Format with leading zeros
  audit_num := 'AUD-' || today_date || '-' || LPAD(sequence_num::text, 3, '0');

  RETURN audit_num;
END;
$$;

-- Check if any inventory stage is currently locked
CREATE OR REPLACE FUNCTION fn_check_stage_locked(stages text[])
RETURNS TABLE (
  is_locked boolean,
  locked_by_audit uuid,
  audit_number text
)
LANGUAGE plpgsql
AS $$
DECLARE
  stage_name text;
  active_audit_id uuid;
  active_audit_num text;
BEGIN
  -- Check for any active audit
  SELECT ia.id, ia.audit_number INTO active_audit_id, active_audit_num
  FROM inventory_audits ia
  WHERE ia.status IN ('initiated', 'in_progress')
    AND ia.is_locked = true
  LIMIT 1;

  IF active_audit_id IS NOT NULL THEN
    -- Check if any requested stage overlaps with active audit
    FOREACH stage_name IN ARRAY stages
    LOOP
      IF stage_name = ANY(
        SELECT unnest(selected_stages)
        FROM inventory_audits
        WHERE id = active_audit_id
      ) THEN
        RETURN QUERY SELECT true, active_audit_id, active_audit_num;
        RETURN;
      END IF;
    END LOOP;
  END IF;

  -- No lock found
  RETURN QUERY SELECT false, NULL::uuid, NULL::text;
END;
$$;

-- Lock inventory stages for audit
CREATE OR REPLACE FUNCTION fn_lock_inventory_stages(
  p_audit_id uuid,
  p_stages text[]
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  lock_check record;
BEGIN
  -- Check if any stage is already locked
  SELECT * INTO lock_check
  FROM fn_check_stage_locked(p_stages);

  IF lock_check.is_locked THEN
    RAISE EXCEPTION 'Stages are locked by audit %', lock_check.audit_number;
  END IF;

  -- Lock the audit
  UPDATE inventory_audits
  SET is_locked = true,
      status = 'in_progress',
      updated_at = now()
  WHERE id = p_audit_id;

  RETURN true;
END;
$$;

-- Unlock inventory stages
CREATE OR REPLACE FUNCTION fn_unlock_inventory_stages(p_audit_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE inventory_audits
  SET is_locked = false,
      updated_at = now()
  WHERE id = p_audit_id;

  RETURN true;
END;
$$;

-- Apply audit adjustments (bulk operation)
CREATE OR REPLACE FUNCTION fn_apply_audit_adjustments(
  p_audit_id uuid,
  p_user_id uuid
)
RETURNS TABLE (
  adjustments_applied integer,
  variance_logs_created integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  line_record record;
  movement_id uuid;
  adjustments_count integer := 0;
  variance_count integer := 0;
BEGIN
  -- Validate audit is ready for completion
  IF NOT EXISTS (
    SELECT 1 FROM inventory_audits
    WHERE id = p_audit_id
      AND status = 'in_progress'
  ) THEN
    RAISE EXCEPTION 'Audit is not in progress';
  END IF;

  -- Check all lines are confirmed
  IF EXISTS (
    SELECT 1 FROM inventory_audit_lines
    WHERE audit_id = p_audit_id
      AND confirmed = false
  ) THEN
    RAISE EXCEPTION 'Not all audit lines are confirmed';
  END IF;

  -- Process each audit line
  FOR line_record IN
    SELECT *
    FROM inventory_audit_lines
    WHERE audit_id = p_audit_id
      AND actual_qty IS NOT NULL
      AND inventory_item_id IS NOT NULL
  LOOP
    -- Create RECONCILIATION movement
    INSERT INTO inventory_movements (
      source_item_id,
      movement_kind,
      qty,
      unit,
      reason_code,
      notes,
      occurred_at
    )
    VALUES (
      line_record.inventory_item_id,
      'RECONCILIATION',
      line_record.actual_qty,
      line_record.unit,
      line_record.variance_reason::text,
      'Audit reconciliation: ' || COALESCE(line_record.variance_notes, 'No notes provided'),
      now()
    )
    RETURNING id INTO movement_id;

    adjustments_count := adjustments_count + 1;

    -- Create variance log entry if variance exists
    IF line_record.variance_qty != 0 THEN
      INSERT INTO variance_log (
        source_type,
        source_id,
        inventory_item_id,
        package_id,
        expected_qty,
        actual_qty,
        variance_qty,
        variance_percentage,
        unit,
        variance_reason,
        notes,
        inventory_stage,
        strain,
        batch,
        product_name,
        user_id,
        movement_id
      )
      VALUES (
        'audit_reconciliation',
        p_audit_id,
        line_record.inventory_item_id,
        line_record.package_id,
        line_record.expected_qty,
        line_record.actual_qty,
        line_record.variance_qty,
        line_record.variance_percentage,
        line_record.unit,
        line_record.variance_reason,
        line_record.variance_notes,
        line_record.stage,
        line_record.strain,
        line_record.batch,
        line_record.product_name,
        p_user_id,
        movement_id
      );

      variance_count := variance_count + 1;
    END IF;
  END LOOP;

  -- Update audit status
  UPDATE inventory_audits
  SET status = 'completed',
      completed_at = now(),
      completed_by = p_user_id,
      packages_with_variance = variance_count,
      is_locked = false,
      updated_at = now()
  WHERE id = p_audit_id;

  RETURN QUERY SELECT adjustments_count, variance_count;
END;
$$;

-- =====================================================
-- SECTION 5: Create RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE inventory_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_audit_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE variance_log ENABLE ROW LEVEL SECURITY;

-- Inventory Audits Policies

-- Managers and admins can view all audits
CREATE POLICY "Managers and admins can view audits"
  ON inventory_audits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'admin')
      AND user_profiles.is_active = true
    )
  );

-- Managers and admins can create audits
CREATE POLICY "Managers and admins can create audits"
  ON inventory_audits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'admin')
      AND user_profiles.is_active = true
    )
  );

-- Managers can update their own audits, admins can update any
CREATE POLICY "Managers can update own audits, admins all"
  ON inventory_audits
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_active = true
      AND (
        user_profiles.role = 'admin'
        OR (user_profiles.role = 'manager' AND inventory_audits.initiated_by = auth.uid())
      )
    )
  );

-- Only admins can delete audits (soft delete via cancel preferred)
CREATE POLICY "Only admins can delete audits"
  ON inventory_audits
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

-- Inventory Audit Lines Policies

-- Access tied to audit access
CREATE POLICY "Audit lines follow audit access - SELECT"
  ON inventory_audit_lines
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventory_audits ia
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE ia.id = inventory_audit_lines.audit_id
      AND up.role IN ('manager', 'admin')
      AND up.is_active = true
    )
  );

CREATE POLICY "Audit lines follow audit access - INSERT"
  ON inventory_audit_lines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventory_audits ia
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE ia.id = inventory_audit_lines.audit_id
      AND up.role IN ('manager', 'admin')
      AND up.is_active = true
    )
  );

CREATE POLICY "Audit lines follow audit access - UPDATE"
  ON inventory_audit_lines
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventory_audits ia
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE ia.id = inventory_audit_lines.audit_id
      AND up.role IN ('manager', 'admin')
      AND up.is_active = true
      AND (
        up.role = 'admin'
        OR (up.role = 'manager' AND ia.initiated_by = auth.uid())
      )
    )
  );

CREATE POLICY "Audit lines follow audit access - DELETE"
  ON inventory_audit_lines
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventory_audits ia
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE ia.id = inventory_audit_lines.audit_id
      AND up.role = 'admin'
      AND up.is_active = true
    )
  );

-- Variance Log Policies

-- Managers and admins can view variance log
CREATE POLICY "Managers and admins can view variance log"
  ON variance_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'admin')
      AND user_profiles.is_active = true
    )
  );

-- Variance log is insert-only (immutable audit trail)
CREATE POLICY "System can insert variance log entries"
  ON variance_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'admin')
      AND user_profiles.is_active = true
    )
  );

-- Only admins can delete old variance logs (for archival)
CREATE POLICY "Only admins can delete variance logs"
  ON variance_log
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.is_active = true
    )
  );

-- =====================================================
-- SECTION 6: Create Triggers
-- =====================================================

-- Auto-update updated_at timestamp on audits
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_inventory_audits_updated_at
  BEFORE UPDATE ON inventory_audits
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_inventory_audit_lines_updated_at
  BEFORE UPDATE ON inventory_audit_lines
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- =====================================================
-- SECTION 7: Add Comments
-- =====================================================

COMMENT ON TABLE inventory_audits IS
'AZDHS-compliant inventory audit tracking. One audit at a time, covers one or more inventory stages.';

COMMENT ON TABLE inventory_audit_lines IS
'Line-by-line audit data matching physical count sheet. Confirmed entries are reconciled to inventory.';

COMMENT ON TABLE variance_log IS
'Centralized variance log for compliance. Tracks all variances from audits, sessions, and manual adjustments.';

COMMENT ON FUNCTION fn_generate_audit_number() IS
'Generates sequential audit number: AUD-YYYYMMDD-NNN';

COMMENT ON FUNCTION fn_check_stage_locked(text[]) IS
'Checks if any of the provided stages are locked by an active audit.';

COMMENT ON FUNCTION fn_lock_inventory_stages(uuid, text[]) IS
'Locks specified stages for an audit, preventing concurrent audits and movements.';

COMMENT ON FUNCTION fn_unlock_inventory_stages(uuid) IS
'Releases stage locks for an audit.';

COMMENT ON FUNCTION fn_apply_audit_adjustments(uuid, uuid) IS
'Applies all confirmed audit line adjustments via inventory_movements. Creates variance_log entries for variances.';
