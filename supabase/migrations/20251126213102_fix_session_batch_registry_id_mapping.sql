/*
  # Auto-populate batch_registry_id from batch_id in session tables

  1. Problem
    - Session creation fails with error: record 'new' has no field 'batch_registry_id'
    - Lifecycle triggers expect batch_registry_id (UUID FK) to be populated
    - Application sends batch_id (text string) but not batch_registry_id (UUID)

  2. Root Cause
    - Phase 1 batch-centric migration added batch_registry_id FK to session tables
    - Triggers (fn_update_batch_lifecycle_on_*_complete) reference NEW.batch_registry_id
    - Forms still use batch_id (text) from legacy architecture
    - No automatic mapping between text batch_id and UUID batch_registry_id

  3. Solution
    - Create BEFORE INSERT/UPDATE trigger to auto-populate batch_registry_id
    - Looks up batch_registry.id from batch_registry.batch_number = batch_id
    - Applies to all session tables: trim_sessions, packaging_sessions, bucking_sessions

  4. Transition Strategy
    - Maintains both fields during transition period (documented in DOCS-INTEGRATION-PROGRESS)
    - Allows application to continue using batch_id (text)
    - Ensures batch_registry_id (UUID FK) is always set for triggers
    - Non-breaking: only populates if NULL, doesn't override explicit values

  5. Security
    - No RLS changes needed (session tables already have policies)
    - Function runs with invoker's privileges
*/

-- =====================================================
-- STEP 1: Create function to auto-populate batch_registry_id
-- =====================================================

CREATE OR REPLACE FUNCTION fn_populate_batch_registry_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch_uuid uuid;
BEGIN
  -- Skip if batch_registry_id is already set (allow explicit values)
  IF NEW.batch_registry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Look up batch UUID from batch_id text string
  IF NEW.batch_id IS NOT NULL THEN
    SELECT id INTO v_batch_uuid
    FROM batch_registry
    WHERE batch_number = NEW.batch_id;

    IF v_batch_uuid IS NOT NULL THEN
      NEW.batch_registry_id := v_batch_uuid;
      RAISE NOTICE 'Auto-populated batch_registry_id: % for batch_id: %',
        v_batch_uuid, NEW.batch_id;
    ELSE
      -- Log warning but don't fail (batch may not exist yet in development)
      RAISE NOTICE 'Batch % not found in batch_registry, batch_registry_id will remain NULL',
        NEW.batch_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_populate_batch_registry_id() IS
'Auto-populates batch_registry_id (UUID) from batch_id (text) to bridge legacy/modern architecture during transition period';

-- =====================================================
-- STEP 2: Apply trigger to trim_sessions
-- =====================================================

DROP TRIGGER IF EXISTS trg_populate_batch_registry_id_trim ON trim_sessions;

CREATE TRIGGER trg_populate_batch_registry_id_trim
  BEFORE INSERT OR UPDATE ON trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION fn_populate_batch_registry_id();

COMMENT ON TRIGGER trg_populate_batch_registry_id_trim ON trim_sessions IS
'Auto-populates batch_registry_id from batch_id to ensure lifecycle triggers work correctly';

-- =====================================================
-- STEP 3: Apply trigger to packaging_sessions
-- =====================================================

DROP TRIGGER IF EXISTS trg_populate_batch_registry_id_packaging ON packaging_sessions;

CREATE TRIGGER trg_populate_batch_registry_id_packaging
  BEFORE INSERT OR UPDATE ON packaging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION fn_populate_batch_registry_id();

COMMENT ON TRIGGER trg_populate_batch_registry_id_packaging ON packaging_sessions IS
'Auto-populates batch_registry_id from batch_id to ensure lifecycle triggers work correctly';

-- =====================================================
-- STEP 4: Apply trigger to bucking_sessions
-- =====================================================

DROP TRIGGER IF EXISTS trg_populate_batch_registry_id_bucking ON bucking_sessions;

CREATE TRIGGER trg_populate_batch_registry_id_bucking
  BEFORE INSERT OR UPDATE ON bucking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION fn_populate_batch_registry_id();

COMMENT ON TRIGGER trg_populate_batch_registry_id_bucking ON bucking_sessions IS
'Auto-populates batch_registry_id from batch_id to ensure lifecycle triggers work correctly';
