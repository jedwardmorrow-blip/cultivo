/*
  # Package Tracking Enhancements

  ## Overview
  Adds fields and tables to support detailed package ID tracking, room locations,
  and Dutchie reconciliation workflow.

  ## Changes

  ### 1. Add package_id tracking to internal_bulk_inventory
  - Allows linking bulk inventory to specific Dutchie package IDs
  - Supports splitting trim output into multiple packages

  ### 2. Add package_id and room to internal_packaged_inventory
  - Track which Dutchie package contains packaged units
  - Store room location for fulfillment

  ### 3. Enhance trim_sessions table
  - Add fields for destination package IDs (flower, smalls, trim)
  - Add room field for completion
  - Track reconciliation status

  ### 4. Enhance packaging_sessions table
  - Add destination package ID field
  - Add room field
  - Track reconciliation status

  ### 5. Add reconciliation tracking fields
  - Mark when sessions have been entered into Dutchie
  - Track variance resolution
*/

-- Add package_id to internal_bulk_inventory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'internal_bulk_inventory' AND column_name = 'package_id'
  ) THEN
    ALTER TABLE internal_bulk_inventory ADD COLUMN package_id text;
  END IF;
END $$;

-- Add room to internal_bulk_inventory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'internal_bulk_inventory' AND column_name = 'room'
  ) THEN
    ALTER TABLE internal_bulk_inventory ADD COLUMN room text;
  END IF;
END $$;

-- Add package_id to internal_packaged_inventory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'internal_packaged_inventory' AND column_name = 'package_id'
  ) THEN
    ALTER TABLE internal_packaged_inventory ADD COLUMN package_id text;
  END IF;
END $$;

-- Add room to internal_packaged_inventory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'internal_packaged_inventory' AND column_name = 'room'
  ) THEN
    ALTER TABLE internal_packaged_inventory ADD COLUMN room text;
  END IF;
END $$;

-- Add destination package ID fields to trim_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trim_sessions' AND column_name = 'flower_package_id'
  ) THEN
    ALTER TABLE trim_sessions ADD COLUMN flower_package_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trim_sessions' AND column_name = 'smalls_package_id'
  ) THEN
    ALTER TABLE trim_sessions ADD COLUMN smalls_package_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trim_sessions' AND column_name = 'trim_package_id'
  ) THEN
    ALTER TABLE trim_sessions ADD COLUMN trim_package_id text;
  END IF;
END $$;

-- Add room to trim_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trim_sessions' AND column_name = 'completion_room'
  ) THEN
    ALTER TABLE trim_sessions ADD COLUMN completion_room text;
  END IF;
END $$;

-- Add Dutchie reconciliation tracking to trim_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trim_sessions' AND column_name = 'dutchie_entry_status'
  ) THEN
    ALTER TABLE trim_sessions ADD COLUMN dutchie_entry_status text DEFAULT 'pending';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trim_sessions' AND column_name = 'reconciled_at'
  ) THEN
    ALTER TABLE trim_sessions ADD COLUMN reconciled_at timestamptz;
  END IF;
END $$;

-- Add destination package ID to packaging_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packaging_sessions' AND column_name = 'destination_package_id'
  ) THEN
    ALTER TABLE packaging_sessions ADD COLUMN destination_package_id text;
  END IF;
END $$;

-- Add room to packaging_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packaging_sessions' AND column_name = 'completion_room'
  ) THEN
    ALTER TABLE packaging_sessions ADD COLUMN completion_room text;
  END IF;
END $$;

-- Add Dutchie reconciliation tracking to packaging_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packaging_sessions' AND column_name = 'dutchie_entry_status'
  ) THEN
    ALTER TABLE packaging_sessions ADD COLUMN dutchie_entry_status text DEFAULT 'pending';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packaging_sessions' AND column_name = 'reconciled_at'
  ) THEN
    ALTER TABLE packaging_sessions ADD COLUMN reconciled_at timestamptz;
  END IF;
END $$;

-- Add check constraint for dutchie_entry_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_trim_dutchie_status'
  ) THEN
    ALTER TABLE trim_sessions
    ADD CONSTRAINT valid_trim_dutchie_status
    CHECK (dutchie_entry_status IN ('pending', 'entered', 'reconciled', 'variance_detected'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_packaging_dutchie_status'
  ) THEN
    ALTER TABLE packaging_sessions
    ADD CONSTRAINT valid_packaging_dutchie_status
    CHECK (dutchie_entry_status IN ('pending', 'entered', 'reconciled', 'variance_detected'));
  END IF;
END $$;

-- Create indexes for package_id lookups
CREATE INDEX IF NOT EXISTS idx_internal_bulk_package_id ON internal_bulk_inventory(package_id);
CREATE INDEX IF NOT EXISTS idx_internal_packaged_package_id ON internal_packaged_inventory(package_id);
CREATE INDEX IF NOT EXISTS idx_trim_sessions_flower_package ON trim_sessions(flower_package_id);
CREATE INDEX IF NOT EXISTS idx_trim_sessions_smalls_package ON trim_sessions(smalls_package_id);
CREATE INDEX IF NOT EXISTS idx_trim_sessions_trim_package ON trim_sessions(trim_package_id);
CREATE INDEX IF NOT EXISTS idx_packaging_sessions_dest_package ON packaging_sessions(destination_package_id);
CREATE INDEX IF NOT EXISTS idx_trim_sessions_dutchie_status ON trim_sessions(dutchie_entry_status);
CREATE INDEX IF NOT EXISTS idx_packaging_sessions_dutchie_status ON packaging_sessions(dutchie_entry_status);
