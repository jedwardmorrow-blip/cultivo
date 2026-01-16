/*
  # Inventory Conversion Management System - Phase 1 Foundation

  ## Overview
  This migration creates the foundational infrastructure for managing inventory conversions
  from completed production sessions to final packaged inventory items. This replaces the
  automatic consolidation system with a manager-approved conversion workflow.

  ## Problem Being Solved
  Previously, trim and packaging sessions automatically created consolidated packages.
  The new system requires managers to manually review, split, and confirm weights before
  packages are finalized, allowing for variance tracking and proper inventory control.

  ## New Tables

  ### 1. pending_conversions
  Stores raw session outputs awaiting manager conversion approval.
  - Links to completed trim/packaging sessions
  - Tracks batch, product type, and weight/units
  - Status: pending, converting, completed, depleted
  - Remains visible for entire day even after conversion

  ### 2. conversion_lots
  Aggregates pending conversions by batch and product type for manager view.
  - Groups all same-batch, same-product conversions together
  - Tracks total weight/units and contributing session count
  - Supports partial conversions (manager can convert portion at a time)
  - Status: active, completed_today, depleted

  ### 3. conversion_packages
  Tracks packages created during conversion process.
  - Links to parent conversion lot
  - Stores package ID, weight/units
  - Maintains traceability to source sessions
  - Immutable once created (adjustments come later as separate feature)

  ### 4. conversion_variance_log
  Comprehensive variance tracking with required reasons.
  - Tracks weight differences between expected and actual
  - Unit variances for packaged products
  - Required variance reason classification
  - Links to both conversion lot and creating user
  - Timestamp for trend analysis

  ### 5. conversion_locks
  Prevents concurrent conversion of same lot by multiple managers.
  - Optimistic locking with heartbeat mechanism
  - 30-minute auto-expiration for abandoned conversions
  - Tracks which user has lock for UI display

  ## Database Functions

  ### generate_next_package_id
  Generates sequential package IDs in format: YYMMDD-STRAIN-01
  - Date-based prefix resets daily
  - Strain code from batch lookup
  - Sequential 2-digit number per day
  - Thread-safe with row locking

  ### get_conversion_lot_summary
  Aggregates pending conversions into actionable conversion lots.
  - Groups by batch_id and product_id
  - Sums weights/units across all pending sessions
  - Counts contributing sessions
  - Returns manager-friendly view

  ## Data Flow
  1. Session completes → pending_conversion created (via trigger in Phase 2)
  2. Manager views aggregated conversion_lots
  3. Manager starts conversion → lock acquired
  4. Manager creates packages → conversion_packages records + variance log
  5. Conversion completes → packages moved to inventory_items
  6. Lot marked completed_today, visible until midnight

  ## Security
  - RLS enabled on all tables
  - Manager and Admin roles only
  - Authenticated users can view (read-only for non-managers)
  - Variance logs immutable after creation

  ## Notes
  - Phase 2 will add triggers for automation
  - Phase 6 will remove old auto-consolidation logic
  - No UI changes in this phase - database only
*/

-- =====================================================
-- ENUMS
-- =====================================================

-- Conversion status types
CREATE TYPE conversion_status AS ENUM (
  'pending',           -- Awaiting conversion
  'converting',        -- Currently being converted by a manager
  'completed',         -- Conversion finished, packages created
  'depleted'          -- Fully converted, 0g remaining
);

-- Conversion lot status (for aggregated view)
CREATE TYPE conversion_lot_status AS ENUM (
  'active',           -- Has pending weight/units to convert
  'completed_today',  -- Fully converted today, visible until midnight
  'depleted'         -- Historical, no longer shown
);

-- Variance reason classifications (required for all variances)
CREATE TYPE variance_reason AS ENUM (
  'moisture_loss',      -- Natural moisture evaporation
  'spillage',           -- Accidental spillage during handling
  'measurement_error',  -- Scale calibration or reading error
  'waste',             -- Unusable material (stems, seeds, etc.)
  'theft_loss',        -- Suspected theft or unexplained loss
  'other'              -- Other reason (requires note)
);

-- =====================================================
-- TABLE: pending_conversions
-- =====================================================

CREATE TABLE IF NOT EXISTS pending_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session linkage
  session_id uuid NOT NULL,
  session_type text NOT NULL CHECK (session_type IN ('trim', 'packaging')),

  -- Product information
  batch_id uuid NOT NULL REFERENCES batch_registry(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

  -- Weight/unit tracking
  original_weight numeric(10,2), -- For bulk products (Flower, Smalls, Trim, Bulk)
  original_units integer,         -- For packaged products (3.5g, 14g, 454g)
  remaining_weight numeric(10,2), -- Updated as partial conversions happen
  remaining_units integer,         -- Updated as partial conversions happen

  -- Status tracking
  status conversion_status NOT NULL DEFAULT 'pending',

  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT valid_weight_or_units CHECK (
    (original_weight IS NOT NULL AND original_units IS NULL) OR
    (original_weight IS NULL AND original_units IS NOT NULL)
  ),
  CONSTRAINT remaining_not_negative CHECK (
    (remaining_weight IS NULL OR remaining_weight >= 0) AND
    (remaining_units IS NULL OR remaining_units >= 0)
  )
);

-- Indexes for performance
CREATE INDEX idx_pending_conversions_batch ON pending_conversions(batch_id);
CREATE INDEX idx_pending_conversions_product ON pending_conversions(product_id);
CREATE INDEX idx_pending_conversions_status ON pending_conversions(status);
CREATE INDEX idx_pending_conversions_session ON pending_conversions(session_id);
CREATE INDEX idx_pending_conversions_created_at ON pending_conversions(created_at DESC);

-- =====================================================
-- TABLE: conversion_lots
-- =====================================================

CREATE TABLE IF NOT EXISTS conversion_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Grouping keys (unique per batch + product per day)
  batch_id uuid NOT NULL REFERENCES batch_registry(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  lot_date date NOT NULL DEFAULT CURRENT_DATE,

  -- Aggregated totals
  total_weight numeric(10,2),     -- Sum of all pending_conversions for this lot
  total_units integer,             -- Sum of all pending_conversions for this lot
  converted_weight numeric(10,2) DEFAULT 0, -- Weight already converted
  converted_units integer DEFAULT 0,         -- Units already converted
  remaining_weight numeric(10,2),  -- Weight still available for conversion
  remaining_units integer,          -- Units still available for conversion

  -- Session tracking
  contributing_session_count integer NOT NULL DEFAULT 0,

  -- Status
  status conversion_lot_status NOT NULL DEFAULT 'active',

  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint: one lot per batch+product per day
  CONSTRAINT unique_lot_per_batch_product_date UNIQUE (batch_id, product_id, lot_date),

  -- Validation
  CONSTRAINT valid_lot_weight_or_units CHECK (
    (total_weight IS NOT NULL AND total_units IS NULL) OR
    (total_weight IS NULL AND total_units IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_conversion_lots_batch ON conversion_lots(batch_id);
CREATE INDEX idx_conversion_lots_product ON conversion_lots(product_id);
CREATE INDEX idx_conversion_lots_status ON conversion_lots(status);
CREATE INDEX idx_conversion_lots_date ON conversion_lots(lot_date DESC);

-- =====================================================
-- TABLE: conversion_packages
-- =====================================================

CREATE TABLE IF NOT EXISTS conversion_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Linkage
  conversion_lot_id uuid NOT NULL REFERENCES conversion_lots(id) ON DELETE RESTRICT,
  batch_id uuid NOT NULL REFERENCES batch_registry(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

  -- Package details
  package_id text NOT NULL UNIQUE, -- Format: YYMMDD-STRAIN-01
  weight numeric(10,2),            -- For bulk products
  units integer,                    -- For packaged products (should match product unit size)

  -- Inventory stage after conversion
  inventory_stage_id uuid REFERENCES product_stages(id),

  -- Traceability (JSON array of session IDs that contributed)
  source_session_ids jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Audit fields
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),

  -- Validation
  CONSTRAINT valid_package_weight_or_units CHECK (
    (weight IS NOT NULL AND units IS NULL) OR
    (weight IS NULL AND units IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_conversion_packages_lot ON conversion_packages(conversion_lot_id);
CREATE INDEX idx_conversion_packages_batch ON conversion_packages(batch_id);
CREATE INDEX idx_conversion_packages_product ON conversion_packages(product_id);
CREATE INDEX idx_conversion_packages_package_id ON conversion_packages(package_id);
CREATE INDEX idx_conversion_packages_created_at ON conversion_packages(created_at DESC);

-- =====================================================
-- TABLE: conversion_variance_log
-- =====================================================

CREATE TABLE IF NOT EXISTS conversion_variance_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Linkage
  conversion_lot_id uuid NOT NULL REFERENCES conversion_lots(id) ON DELETE RESTRICT,
  batch_id uuid NOT NULL REFERENCES batch_registry(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

  -- Variance details
  expected_weight numeric(10,2),   -- What sessions reported
  actual_weight numeric(10,2),     -- What manager confirmed
  weight_variance numeric(10,2),   -- Difference (can be positive or negative)

  expected_units integer,          -- For packaged products
  actual_units integer,
  unit_variance integer,

  -- Classification (REQUIRED)
  variance_reason variance_reason NOT NULL,
  variance_note text,              -- Additional explanation

  -- Manager acknowledgment
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid NOT NULL REFERENCES auth.users(id),
  acknowledged_at timestamptz NOT NULL DEFAULT now(),

  -- Validation
  CONSTRAINT valid_variance_weight_or_units CHECK (
    (expected_weight IS NOT NULL AND expected_units IS NULL) OR
    (expected_weight IS NULL AND expected_units IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_variance_log_lot ON conversion_variance_log(conversion_lot_id);
CREATE INDEX idx_variance_log_batch ON conversion_variance_log(batch_id);
CREATE INDEX idx_variance_log_product ON conversion_variance_log(product_id);
CREATE INDEX idx_variance_log_reason ON conversion_variance_log(variance_reason);
CREATE INDEX idx_variance_log_date ON conversion_variance_log(acknowledged_at DESC);

-- =====================================================
-- TABLE: conversion_locks
-- =====================================================

CREATE TABLE IF NOT EXISTS conversion_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What's locked
  conversion_lot_id uuid NOT NULL UNIQUE REFERENCES conversion_lots(id) ON DELETE CASCADE,

  -- Who has the lock
  locked_by uuid NOT NULL REFERENCES auth.users(id),
  locked_at timestamptz NOT NULL DEFAULT now(),

  -- Heartbeat mechanism (updated every 60 seconds by UI)
  last_heartbeat timestamptz NOT NULL DEFAULT now(),

  -- Auto-expire after 30 minutes of no heartbeat
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes')
);

-- Indexes
CREATE INDEX idx_conversion_locks_lot ON conversion_locks(conversion_lot_id);
CREATE INDEX idx_conversion_locks_user ON conversion_locks(locked_by);
CREATE INDEX idx_conversion_locks_expires ON conversion_locks(expires_at);

-- =====================================================
-- FUNCTION: generate_next_package_id
-- =====================================================

CREATE OR REPLACE FUNCTION generate_next_package_id(
  p_batch_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_strain_code text;
  v_date_prefix text;
  v_next_seq integer;
  v_package_id text;
BEGIN
  -- Get strain abbreviation from batch
  SELECT s.abbreviation INTO v_strain_code
  FROM batch_registry b
  JOIN strains s ON b.strain_id = s.id
  WHERE b.id = p_batch_id;

  IF v_strain_code IS NULL THEN
    RAISE EXCEPTION 'Batch not found or has no strain code: %', p_batch_id;
  END IF;

  -- Generate date prefix (YYMMDD)
  v_date_prefix := to_char(CURRENT_DATE, 'YYMMDD');

  -- Find next sequence number for this date and strain (with row lock for thread safety)
  SELECT COALESCE(MAX(
    CAST(
      regexp_replace(package_id, '^[0-9]{6}-[A-Z]+-([0-9]+)$', '\1')
      AS integer
    )
  ), 0) + 1
  INTO v_next_seq
  FROM conversion_packages
  WHERE package_id LIKE v_date_prefix || '-' || v_strain_code || '-%'
  FOR UPDATE;

  -- Also check inventory_items table for existing package IDs (in case of direct adds)
  SELECT GREATEST(
    v_next_seq,
    COALESCE(MAX(
      CAST(
        regexp_replace(package_id, '^[0-9]{6}-[A-Z]+-([0-9]+)$', '\1')
        AS integer
      )
    ), 0) + 1
  )
  INTO v_next_seq
  FROM inventory_items
  WHERE package_id LIKE v_date_prefix || '-' || v_strain_code || '-%';

  -- Format as 2-digit sequence
  v_package_id := v_date_prefix || '-' || v_strain_code || '-' || lpad(v_next_seq::text, 2, '0');

  RETURN v_package_id;
END;
$$;

-- =====================================================
-- FUNCTION: get_conversion_lot_summary
-- =====================================================

CREATE OR REPLACE FUNCTION get_conversion_lot_summary(
  p_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  lot_id uuid,
  batch_id uuid,
  batch_name text,
  strain_name text,
  strain_code text,
  product_id uuid,
  product_name text,
  product_type text,
  total_weight numeric,
  total_units integer,
  remaining_weight numeric,
  remaining_units integer,
  contributing_session_count integer,
  status conversion_lot_status,
  is_locked boolean,
  locked_by_user uuid,
  locked_by_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cl.id as lot_id,
    cl.batch_id,
    b.batch_number as batch_name,
    s.name as strain_name,
    s.abbreviation as strain_code,
    cl.product_id,
    p.product_name,
    p.product_type,
    cl.total_weight,
    cl.total_units,
    cl.remaining_weight,
    cl.remaining_units,
    cl.contributing_session_count,
    cl.status,
    (CASE WHEN clk.id IS NOT NULL AND clk.expires_at > now() THEN true ELSE false END) as is_locked,
    clk.locked_by as locked_by_user,
    up.full_name as locked_by_name
  FROM conversion_lots cl
  JOIN batch_registry b ON cl.batch_id = b.id
  JOIN strains s ON b.strain_id = s.id
  JOIN products p ON cl.product_id = p.id
  LEFT JOIN conversion_locks clk ON cl.id = clk.conversion_lot_id
  LEFT JOIN user_profiles up ON clk.locked_by = up.id
  WHERE cl.lot_date = p_date
    AND cl.status IN ('active', 'completed_today')
  ORDER BY
    cl.status ASC,  -- Active first
    s.name ASC,
    p.product_name ASC;
END;
$$;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE pending_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_variance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_locks ENABLE ROW LEVEL SECURITY;

-- pending_conversions policies
CREATE POLICY "Managers and admins can view pending conversions"
  ON pending_conversions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can insert pending conversions"
  ON pending_conversions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can update pending conversions"
  ON pending_conversions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'admin')
    )
  );

-- conversion_lots policies
CREATE POLICY "Managers and admins can view conversion lots"
  ON conversion_lots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can insert conversion lots"
  ON conversion_lots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can update conversion lots"
  ON conversion_lots FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'admin')
    )
  );

-- conversion_packages policies
CREATE POLICY "Managers and admins can view conversion packages"
  ON conversion_packages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can insert conversion packages"
  ON conversion_packages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'admin')
    )
  );

-- conversion_variance_log policies (read-only after creation)
CREATE POLICY "Managers and admins can view variance logs"
  ON conversion_variance_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can insert variance logs"
  ON conversion_variance_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'admin')
    )
  );

-- conversion_locks policies
CREATE POLICY "Managers and admins can view conversion locks"
  ON conversion_locks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can insert conversion locks"
  ON conversion_locks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can delete their own locks"
  ON conversion_locks FOR DELETE
  TO authenticated
  USING (
    locked_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE pending_conversions IS 'Stores raw session outputs awaiting manager conversion approval';
COMMENT ON TABLE conversion_lots IS 'Aggregates pending conversions by batch and product type for manager view';
COMMENT ON TABLE conversion_packages IS 'Tracks packages created during conversion process with full traceability';
COMMENT ON TABLE conversion_variance_log IS 'Comprehensive variance tracking with required reasons and manager acknowledgment';
COMMENT ON TABLE conversion_locks IS 'Prevents concurrent conversion of same lot by multiple managers';

COMMENT ON FUNCTION generate_next_package_id IS 'Generates sequential package IDs in format: YYMMDD-STRAIN-01';
COMMENT ON FUNCTION get_conversion_lot_summary IS 'Returns manager-friendly view of conversion lots with all relevant details';
