/*
  # Add batch_registry_id columns to session tables

  This migration adds the missing batch_registry_id foreign key columns
  to all session tables that were supposed to be added by Phase 1 but weren't.

  ## Changes
  - Add batch_registry_id uuid column to trim_sessions
  - Add batch_registry_id uuid column to packaging_sessions
  - Add batch_registry_id uuid column to bucking_sessions
  - All columns are nullable and reference batch_registry(id)
*/

-- Add batch_registry_id to trim_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trim_sessions' AND column_name = 'batch_registry_id'
  ) THEN
    ALTER TABLE trim_sessions ADD COLUMN batch_registry_id uuid REFERENCES batch_registry(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added batch_registry_id to trim_sessions';
  ELSE
    RAISE NOTICE 'batch_registry_id already exists in trim_sessions';
  END IF;
END $$;

-- Add batch_registry_id to packaging_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packaging_sessions' AND column_name = 'batch_registry_id'
  ) THEN
    ALTER TABLE packaging_sessions ADD COLUMN batch_registry_id uuid REFERENCES batch_registry(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added batch_registry_id to packaging_sessions';
  ELSE
    RAISE NOTICE 'batch_registry_id already exists in packaging_sessions';
  END IF;
END $$;

-- Add batch_registry_id to bucking_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bucking_sessions' AND column_name = 'batch_registry_id'
  ) THEN
    ALTER TABLE bucking_sessions ADD COLUMN batch_registry_id uuid REFERENCES batch_registry(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added batch_registry_id to bucking_sessions';
  ELSE
    RAISE NOTICE 'batch_registry_id already exists in bucking_sessions';
  END IF;
END $$;

-- Backfill existing sessions with batch_registry_id from batch_id
-- This ensures existing sessions work with the new system
DO $$
DECLARE
  v_updated_trim int := 0;
  v_updated_packaging int := 0;
  v_updated_bucking int := 0;
BEGIN
  -- Update trim_sessions
  WITH updates AS (
    UPDATE trim_sessions t
    SET batch_registry_id = b.id
    FROM batch_registry b
    WHERE t.batch_id = b.batch_number
      AND t.batch_registry_id IS NULL
    RETURNING t.id
  )
  SELECT COUNT(*) INTO v_updated_trim FROM updates;
  
  -- Update packaging_sessions
  WITH updates AS (
    UPDATE packaging_sessions p
    SET batch_registry_id = b.id
    FROM batch_registry b
    WHERE p.batch_id = b.batch_number
      AND p.batch_registry_id IS NULL
    RETURNING p.id
  )
  SELECT COUNT(*) INTO v_updated_packaging FROM updates;
  
  -- Update bucking_sessions
  WITH updates AS (
    UPDATE bucking_sessions bs
    SET batch_registry_id = b.id
    FROM batch_registry b
    WHERE bs.batch_id = b.batch_number
      AND bs.batch_registry_id IS NULL
    RETURNING bs.id
  )
  SELECT COUNT(*) INTO v_updated_bucking FROM updates;
  
  RAISE NOTICE 'Backfilled batch_registry_id: % trim, % packaging, % bucking sessions',
    v_updated_trim, v_updated_packaging, v_updated_bucking;
END $$;
