-- ============================================================
-- Custom ENUM Types
-- Source: https://fonreynkfeqywshijqpi.supabase.co
-- Extracted: 2026-03-02
-- Count: 6
-- ============================================================
CREATE TYPE allocation_workflow_stage AS ENUM (
  'allocated',
  'in_trimming',
  'trimmed',
  'in_packaging',
  'packaged',
  'labeled',
  'coa_attached',
  'ready_for_delivery'
);

CREATE TYPE audit_status AS ENUM (
  'initiated',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE finalization_status AS ENUM (
  'pending',
  'finalized',
  'voided'
);

CREATE TYPE order_item_status AS ENUM (
  'trimming',
  'packaging',
  'labeling',
  'pending_coa',
  'ready_for_delivery'
);

CREATE TYPE variance_reason AS ENUM (
  'moisture_loss',
  'spillage',
  'measurement_error',
  'waste',
  'theft_loss',
  'other'
);

CREATE TYPE variance_source AS ENUM (
  'audit_reconciliation',
  'session_conversion',
  'manual_adjustment',
  'combine_packages',
  'weight_rebalance'
);
