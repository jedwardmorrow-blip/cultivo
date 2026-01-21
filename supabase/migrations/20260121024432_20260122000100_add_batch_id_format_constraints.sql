/*
  # Add Batch ID Format Constraints

  1. Problem
    - batch_id field accepts any text, including UUIDs
    - When UUID is stored in batch_id, trigger lookup fails silently
    - Results in sessions with NULL batch_registry_id, invisible in conversions

  2. Solution
    - Add CHECK constraint to prevent UUID format in batch_id
    - Ensures batch_id only contains batch_number text format (e.g., "251105-SSM")
    - Provides clear error message if UUID is attempted

  3. UUID Pattern
    - Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    - Regex: ^[0-9a-f]{8}-[0-9a-f]{4}
    - First 13 chars uniquely identify UUID format
    - Constraint blocks any string starting with this pattern

  4. Valid Formats
    - Batch numbers: "251105-SSM", "240820-GG", "250115-BB"
    - These do NOT start with UUID pattern (dates start with 2, not 0-9a-f hex)
    - Constraint allows all valid batch_number formats

  5. Error Handling
    - If form sends UUID, INSERT/UPDATE will fail with clear message
    - Frontend should never send UUID (already fixed)
    - This is defense-in-depth safety net
*/

-- =====================================================
-- STEP 1: Add CHECK constraint to bucking_sessions
-- =====================================================

ALTER TABLE bucking_sessions
  ADD CONSTRAINT chk_bucking_batch_id_not_uuid
  CHECK (
    batch_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}'
  );

COMMENT ON CONSTRAINT chk_bucking_batch_id_not_uuid ON bucking_sessions IS
'Prevents UUID format in batch_id field. batch_id must be batch_number text (e.g., 251105-SSM), not UUID.';

-- =====================================================
-- STEP 2: Add CHECK constraint to trim_sessions
-- =====================================================

ALTER TABLE trim_sessions
  ADD CONSTRAINT chk_trim_batch_id_not_uuid
  CHECK (
    batch_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}'
  );

COMMENT ON CONSTRAINT chk_trim_batch_id_not_uuid ON trim_sessions IS
'Prevents UUID format in batch_id field. batch_id must be batch_number text (e.g., 251105-SSM), not UUID.';

-- =====================================================
-- STEP 3: Add CHECK constraint to packaging_sessions
-- =====================================================

ALTER TABLE packaging_sessions
  ADD CONSTRAINT chk_packaging_batch_id_not_uuid
  CHECK (
    batch_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}'
  );

COMMENT ON CONSTRAINT chk_packaging_batch_id_not_uuid ON packaging_sessions IS
'Prevents UUID format in batch_id field. batch_id must be batch_number text (e.g., 251105-SSM), not UUID.';

-- =====================================================
-- STEP 4: Verify constraints are active
-- =====================================================

DO $$
DECLARE
  v_bucking_constraint boolean;
  v_trim_constraint boolean;
  v_packaging_constraint boolean;
BEGIN
  -- Check if constraints exist
  SELECT EXISTS(
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_bucking_batch_id_not_uuid'
  ) INTO v_bucking_constraint;

  SELECT EXISTS(
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_trim_batch_id_not_uuid'
  ) INTO v_trim_constraint;

  SELECT EXISTS(
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_packaging_batch_id_not_uuid'
  ) INTO v_packaging_constraint;

  IF v_bucking_constraint AND v_trim_constraint AND v_packaging_constraint THEN
    RAISE NOTICE 'All batch_id format constraints are active and enforced';
  ELSE
    RAISE WARNING 'Some constraints missing: bucking=%, trim=%, packaging=%',
      v_bucking_constraint, v_trim_constraint, v_packaging_constraint;
  END IF;
END $$;
