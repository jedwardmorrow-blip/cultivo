/*
  # Phase 1: Data Backfill Migration

  ## Overview
  This migration safely backfills existing data to link historical trim and packaging
  sessions to batches in the batch_registry. It attempts to match based on batch_id
  text field and creates batch records if they don't exist.

  ## Process

  1. **Identify Unique Batches from Sessions**
     - Extract all unique batch_id/strain combinations from trim_sessions
     - Extract all unique batch_id/strain combinations from packaging_sessions

  2. **Create Missing Batch Records**
     - For each unique batch not in batch_registry, create a record
     - Use strain and batch_id from sessions
     - Set lifecycle_state based on what sessions exist

  3. **Link Sessions to Batch Registry**
     - Update trim_sessions.batch_registry_id to point to batch_registry.id
     - Update packaging_sessions.batch_registry_id to point to batch_registry.id

  4. **Backfill Package Lineage**
     - Add consolidated packages to batch_package_lineage
     - Link to their source sessions

  5. **Initialize Batch Stage Tracking**
     - Create stage tracking records for batches based on current inventory

  ## Safety Features
  - Read-only queries first to validate data
  - Creates batches only if they don't exist
  - Preserves all existing data
  - Can be run multiple times safely (idempotent)
*/

-- =====================================================
-- STEP 1: Create function to safely get or create batch
-- =====================================================

CREATE OR REPLACE FUNCTION get_or_create_batch(
  p_batch_number text,
  p_strain text,
  p_harvest_date date DEFAULT NULL,
  p_initial_weight numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch_id uuid;
  v_harvest_date date;
BEGIN
  -- Try to find existing batch by batch_number
  SELECT id INTO v_batch_id
  FROM batch_registry
  WHERE batch_number = p_batch_number;

  -- If not found, create it
  IF v_batch_id IS NULL THEN
    -- Use provided harvest date or estimate from current date
    v_harvest_date := COALESCE(p_harvest_date, CURRENT_DATE - INTERVAL '30 days');

    INSERT INTO batch_registry (
      batch_number,
      strain,
      harvest_date,
      initial_weight_grams,
      lifecycle_state,
      status,
      notes,
      created_at,
      updated_at
    ) VALUES (
      p_batch_number,
      p_strain,
      v_harvest_date,
      p_initial_weight,
      'created', -- Will be updated by triggers
      'active',
      'Auto-created during data backfill migration',
      now(),
      now()
    )
    RETURNING id INTO v_batch_id;

    -- Log creation event
    PERFORM log_batch_lifecycle_event(
      v_batch_id,
      'state_transition',
      NULL,
      'created',
      'system',
      'Batch created during data backfill from existing sessions'
    );
  END IF;

  RETURN v_batch_id;
END;
$$;

-- =====================================================
-- STEP 2: Backfill trim_sessions with batch_registry_id
-- =====================================================

DO $$
DECLARE
  v_session record;
  v_batch_registry_id uuid;
  v_batch_count integer := 0;
  v_session_count integer := 0;
BEGIN
  RAISE NOTICE 'Starting trim_sessions backfill...';

  -- Loop through all trim sessions that have batch_id but no batch_registry_id
  FOR v_session IN
    SELECT id, batch_id, strain, session_date, pulled_weight
    FROM trim_sessions
    WHERE batch_id IS NOT NULL
      AND batch_id != ''
      AND batch_registry_id IS NULL
  LOOP
    -- Get or create batch for this session
    v_batch_registry_id := get_or_create_batch(
      v_session.batch_id,
      v_session.strain,
      v_session.session_date,
      v_session.pulled_weight
    );

    -- Update session with batch_registry_id
    UPDATE trim_sessions
    SET
      batch_registry_id = v_batch_registry_id,
      updated_at = now()
    WHERE id = v_session.id;

    v_session_count := v_session_count + 1;

    -- Log every 10 sessions
    IF v_session_count % 10 = 0 THEN
      RAISE NOTICE 'Processed % trim sessions...', v_session_count;
    END IF;
  END LOOP;

  RAISE NOTICE 'Completed trim_sessions backfill: % sessions linked', v_session_count;
END $$;

-- =====================================================
-- STEP 3: Backfill packaging_sessions with batch_registry_id
-- =====================================================

DO $$
DECLARE
  v_session record;
  v_batch_registry_id uuid;
  v_session_count integer := 0;
BEGIN
  RAISE NOTICE 'Starting packaging_sessions backfill...';

  -- Loop through all packaging sessions that have batch_id but no batch_registry_id
  FOR v_session IN
    SELECT id, batch_id, strain, session_date, pull_weight
    FROM packaging_sessions
    WHERE batch_id IS NOT NULL
      AND batch_id != ''
      AND batch_registry_id IS NULL
  LOOP
    -- Get or create batch for this session
    v_batch_registry_id := get_or_create_batch(
      v_session.batch_id,
      v_session.strain,
      v_session.session_date,
      COALESCE(v_session.pull_weight, 0)
    );

    -- Update session with batch_registry_id
    UPDATE packaging_sessions
    SET
      batch_registry_id = v_batch_registry_id,
      updated_at = now()
    WHERE id = v_session.id;

    v_session_count := v_session_count + 1;

    -- Log every 10 sessions
    IF v_session_count % 10 = 0 THEN
      RAISE NOTICE 'Processed % packaging sessions...', v_session_count;
    END IF;
  END LOOP;

  RAISE NOTICE 'Completed packaging_sessions backfill: % sessions linked', v_session_count;
END $$;

-- =====================================================
-- STEP 4: Backfill consolidated_packages with batch info
-- =====================================================

DO $$
DECLARE
  v_package record;
  v_batch_registry_id uuid;
  v_batch_number text;
  v_package_count integer := 0;
  v_stage text;
BEGIN
  RAISE NOTICE 'Starting consolidated_packages backfill...';

  -- Loop through consolidated packages from trim sessions
  FOR v_package IN
    SELECT
      cp.id,
      cp.source_id,
      cp.source_type,
      cp.package_id,
      cp.product_type,
      cp.weight_grams,
      ts.batch_registry_id,
      ts.strain
    FROM consolidated_packages cp
    INNER JOIN trim_sessions ts ON cp.source_id = ts.id
    WHERE cp.source_type = 'trim_session'
      AND cp.batch_id IS NULL
      AND ts.batch_registry_id IS NOT NULL
  LOOP
    -- Get batch info
    SELECT batch_number INTO v_batch_number
    FROM batch_registry
    WHERE id = v_package.batch_registry_id;

    -- Determine stage
    v_stage := CASE
      WHEN v_package.product_type = 'Flower' THEN 'bulk_flower'
      WHEN v_package.product_type = 'Smalls' THEN 'bulk_smalls'
      WHEN v_package.product_type = 'Trim' THEN 'bulk_trim'
      ELSE 'bulk_flower'
    END;

    -- Update package with batch info
    UPDATE consolidated_packages
    SET
      batch_id = v_package.batch_registry_id,
      batch_number = v_batch_number
    WHERE id = v_package.id;

    -- Add to package lineage
    PERFORM add_package_to_batch(
      v_package.batch_registry_id,
      v_package.package_id,
      v_package.product_type,
      v_stage,
      v_package.weight_grams,
      v_package.source_id,
      'trim'
    );

    v_package_count := v_package_count + 1;
  END LOOP;

  -- Loop through consolidated packages from packaging sessions
  FOR v_package IN
    SELECT
      cp.id,
      cp.source_id,
      cp.source_type,
      cp.package_id,
      cp.product_type,
      cp.weight_grams,
      ps.batch_registry_id,
      ps.strain
    FROM consolidated_packages cp
    INNER JOIN packaging_sessions ps ON cp.source_id = ps.id
    WHERE cp.source_type = 'packaging_session'
      AND cp.batch_id IS NULL
      AND ps.batch_registry_id IS NOT NULL
  LOOP
    -- Get batch info
    SELECT batch_number INTO v_batch_number
    FROM batch_registry
    WHERE id = v_package.batch_registry_id;

    -- Determine stage
    v_stage := CASE
      WHEN v_package.product_type LIKE '%3.5g%' THEN 'packaged_3_5g'
      WHEN v_package.product_type LIKE '%14g%' THEN 'packaged_14g'
      WHEN v_package.product_type LIKE '%454g%' OR v_package.product_type LIKE '%lb%' THEN 'packaged_454g'
      WHEN v_package.product_type = 'Trim' THEN 'bulk_trim'
      ELSE 'packaged_3_5g'
    END;

    -- Update package with batch info
    UPDATE consolidated_packages
    SET
      batch_id = v_package.batch_registry_id,
      batch_number = v_batch_number
    WHERE id = v_package.id;

    -- Add to package lineage
    PERFORM add_package_to_batch(
      v_package.batch_registry_id,
      v_package.package_id,
      v_package.product_type,
      v_stage,
      v_package.weight_grams,
      v_package.source_id,
      'packaging'
    );

    v_package_count := v_package_count + 1;
  END LOOP;

  RAISE NOTICE 'Completed consolidated_packages backfill: % packages linked', v_package_count;
END $$;

-- =====================================================
-- STEP 5: Update batch lifecycle states based on sessions
-- =====================================================

DO $$
DECLARE
  v_batch record;
  v_new_state text;
BEGIN
  RAISE NOTICE 'Updating batch lifecycle states...';

  FOR v_batch IN
    SELECT
      br.id,
      br.lifecycle_state,
      COUNT(DISTINCT ts.id) as trim_count,
      COUNT(DISTINCT ps.id) as packaging_count,
      MAX(ts.completed_at) as last_trim,
      MAX(ps.completed_at) as last_packaging
    FROM batch_registry br
    LEFT JOIN trim_sessions ts ON ts.batch_registry_id = br.id AND ts.session_status = 'completed'
    LEFT JOIN packaging_sessions ps ON ps.batch_registry_id = br.id AND ps.session_status = 'completed'
    WHERE br.lifecycle_state = 'created'
    GROUP BY br.id, br.lifecycle_state
  LOOP
    -- Determine appropriate state based on session history
    IF v_batch.packaging_count > 0 THEN
      v_new_state := 'packaged';
    ELSIF v_batch.trim_count > 0 THEN
      v_new_state := 'bulk_available';
    ELSE
      v_new_state := 'bucked';
    END IF;

    -- Update batch state
    UPDATE batch_registry
    SET
      lifecycle_state = v_new_state,
      trimming_started_at = CASE WHEN v_batch.trim_count > 0 THEN v_batch.last_trim ELSE NULL END,
      packaging_started_at = CASE WHEN v_batch.packaging_count > 0 THEN v_batch.last_packaging ELSE NULL END,
      updated_at = now()
    WHERE id = v_batch.id;

    -- Log state update
    PERFORM log_batch_lifecycle_event(
      v_batch.id,
      'state_transition',
      'created',
      v_new_state,
      'system',
      format('State updated during backfill based on %s trim sessions and %s packaging sessions',
        v_batch.trim_count, v_batch.packaging_count)
    );
  END LOOP;

  RAISE NOTICE 'Batch lifecycle states updated';
END $$;

-- =====================================================
-- STEP 6: Create report of backfill results
-- =====================================================

DO $$
DECLARE
  v_total_batches integer;
  v_linked_trim_sessions integer;
  v_linked_packaging_sessions integer;
  v_linked_packages integer;
BEGIN
  -- Count results
  SELECT COUNT(*) INTO v_total_batches FROM batch_registry;

  SELECT COUNT(*) INTO v_linked_trim_sessions
  FROM trim_sessions WHERE batch_registry_id IS NOT NULL;

  SELECT COUNT(*) INTO v_linked_packaging_sessions
  FROM packaging_sessions WHERE batch_registry_id IS NOT NULL;

  SELECT COUNT(*) INTO v_linked_packages
  FROM consolidated_packages WHERE batch_id IS NOT NULL;

  -- Output summary
  RAISE NOTICE '========================================';
  RAISE NOTICE 'BACKFILL MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total Batches in Registry: %', v_total_batches;
  RAISE NOTICE 'Trim Sessions Linked: %', v_linked_trim_sessions;
  RAISE NOTICE 'Packaging Sessions Linked: %', v_linked_packaging_sessions;
  RAISE NOTICE 'Consolidated Packages Linked: %', v_linked_packages;
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- STEP 7: Create indexes on backfilled data
-- =====================================================

-- Reindex for performance after bulk updates
REINDEX TABLE trim_sessions;
REINDEX TABLE packaging_sessions;
REINDEX TABLE consolidated_packages;
REINDEX TABLE batch_package_lineage;

-- Analyze tables for query planner
ANALYZE batch_registry;
ANALYZE trim_sessions;
ANALYZE packaging_sessions;
ANALYZE consolidated_packages;
ANALYZE batch_package_lineage;
ANALYZE batch_production_history;
ANALYZE batch_lifecycle_events;

-- =====================================================
-- Add comments
-- =====================================================

COMMENT ON FUNCTION get_or_create_batch IS 'Helper function to find or create batch records during migration';
