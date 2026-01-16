/*
  # Consolidate Strain Tables into Single Source of Truth

  ## Overview
  This migration consolidates the `strain_metadata` table into the `strains` table,
  creating a single authoritative source for all strain information including
  abbreviations and conversion ratios.

  ## Changes

  1. **Add conversion ratio columns to strains table**
     - avg_bucked_to_flower_ratio
     - avg_bucked_to_smalls_ratio
     - avg_bucked_to_trim_ratio
     - avg_waste_percentage
     - avg_trim_grams_per_hour
     - notes field for additional information

  2. **Migrate data from strain_metadata to strains**
     - Copy all strain data preserving ratios and metadata
     - Handle name matching and conflicts
     - Preserve existing abbreviations in strains table

  3. **Update references**
     - Create views for backward compatibility
     - Update foreign key references if any

  4. **Clean up**
     - Mark strain_metadata as deprecated (not dropping for safety)
     - Add comment explaining to use strains table

  ## Safety
  - Does NOT drop strain_metadata table (manual cleanup after verification)
  - Uses IF NOT EXISTS for all new columns
  - Preserves all existing data
  - Creates backup view for rollback capability
*/

-- =====================================================
-- STEP 1: Add conversion ratio columns to strains table
-- =====================================================

-- Add conversion ratio columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strains' AND column_name = 'avg_bucked_to_flower_ratio'
  ) THEN
    ALTER TABLE strains ADD COLUMN avg_bucked_to_flower_ratio numeric DEFAULT 0.50;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strains' AND column_name = 'avg_bucked_to_smalls_ratio'
  ) THEN
    ALTER TABLE strains ADD COLUMN avg_bucked_to_smalls_ratio numeric DEFAULT 0.25;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strains' AND column_name = 'avg_bucked_to_trim_ratio'
  ) THEN
    ALTER TABLE strains ADD COLUMN avg_bucked_to_trim_ratio numeric DEFAULT 0.20;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strains' AND column_name = 'avg_waste_percentage'
  ) THEN
    ALTER TABLE strains ADD COLUMN avg_waste_percentage numeric DEFAULT 0.05;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strains' AND column_name = 'avg_trim_grams_per_hour'
  ) THEN
    ALTER TABLE strains ADD COLUMN avg_trim_grams_per_hour numeric DEFAULT 150;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strains' AND column_name = 'notes'
  ) THEN
    ALTER TABLE strains ADD COLUMN notes text;
  END IF;
END $$;

-- =====================================================
-- STEP 2: Migrate data from strain_metadata to strains
-- =====================================================

-- Update existing strains with data from strain_metadata (matching by name)
UPDATE strains s
SET
  avg_bucked_to_flower_ratio = COALESCE(sm.avg_bucked_to_flower_ratio, s.avg_bucked_to_flower_ratio),
  avg_bucked_to_smalls_ratio = COALESCE(sm.avg_bucked_to_smalls_ratio, s.avg_bucked_to_smalls_ratio),
  avg_bucked_to_trim_ratio = COALESCE(sm.avg_bucked_to_trim_ratio, s.avg_bucked_to_trim_ratio),
  avg_waste_percentage = COALESCE(sm.avg_waste_percentage, s.avg_waste_percentage),
  avg_trim_grams_per_hour = COALESCE(sm.avg_trim_grams_per_hour, s.avg_trim_grams_per_hour),
  notes = COALESCE(
    CASE
      WHEN sm.notes IS NOT NULL AND s.notes IS NOT NULL
      THEN s.notes || E'\n--- From strain_metadata ---\n' || sm.notes
      ELSE COALESCE(sm.notes, s.notes)
    END,
    s.notes
  ),
  genetics_description = COALESCE(s.genetics_description, sm.genetics),
  dominance_type = COALESCE(s.dominance_type, sm.type),
  -- Only update abbreviation if strains table doesn't have one
  abbreviation = COALESCE(s.abbreviation, sm.abbreviation)
FROM strain_metadata sm
WHERE LOWER(TRIM(s.name)) = LOWER(TRIM(sm.name));

-- Insert strains that exist in strain_metadata but not in strains
INSERT INTO strains (
  name,
  abbreviation,
  dominance_type,
  genetics_description,
  avg_bucked_to_flower_ratio,
  avg_bucked_to_smalls_ratio,
  avg_bucked_to_trim_ratio,
  avg_waste_percentage,
  avg_trim_grams_per_hour,
  notes,
  is_active
)
SELECT
  sm.name,
  sm.abbreviation,
  sm.type,
  sm.genetics,
  sm.avg_bucked_to_flower_ratio,
  sm.avg_bucked_to_smalls_ratio,
  sm.avg_bucked_to_trim_ratio,
  sm.avg_waste_percentage,
  sm.avg_trim_grams_per_hour,
  sm.notes,
  true
FROM strain_metadata sm
WHERE NOT EXISTS (
  SELECT 1 FROM strains s
  WHERE LOWER(TRIM(s.name)) = LOWER(TRIM(sm.name))
)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- STEP 3: Create backward compatibility view
-- =====================================================

-- Create a view that mimics strain_metadata for backward compatibility
CREATE OR REPLACE VIEW strain_metadata_compat AS
SELECT
  id,
  name,
  dominance_type as type,
  genetics_description as genetics,
  abbreviation,
  avg_bucked_to_flower_ratio,
  avg_bucked_to_smalls_ratio,
  avg_bucked_to_trim_ratio,
  avg_waste_percentage,
  avg_trim_grams_per_hour,
  notes,
  created_at,
  updated_at
FROM strains
WHERE is_active = true;

-- Add comment to strain_metadata table warning about deprecation
COMMENT ON TABLE strain_metadata IS
'DEPRECATED: This table is being phased out. Use the strains table instead.
All data has been migrated to strains table. This table is kept for backup purposes only.
Use the strain_metadata_compat view if you need the old structure.';

-- =====================================================
-- STEP 4: Add indexes for performance
-- =====================================================

-- Add index for case-insensitive name lookups
CREATE INDEX IF NOT EXISTS idx_strains_name_lower ON strains(LOWER(name));

-- Add index for abbreviation lookups
CREATE INDEX IF NOT EXISTS idx_strains_abbreviation_lower ON strains(LOWER(abbreviation)) WHERE abbreviation IS NOT NULL;

-- =====================================================
-- STEP 5: Create helper function for strain lookup
-- =====================================================

-- Function to find strain by name with fuzzy matching
CREATE OR REPLACE FUNCTION find_strain_by_name(
  p_strain_name text,
  OUT strain_id uuid,
  OUT strain_name text,
  OUT strain_abbreviation text,
  OUT match_quality text
)
RETURNS RECORD AS $$
DECLARE
  v_normalized text;
BEGIN
  -- Normalize input
  v_normalized := LOWER(TRIM(p_strain_name));

  -- Try exact match first (case-insensitive)
  SELECT id, name, abbreviation, 'exact'
  INTO strain_id, strain_name, strain_abbreviation, match_quality
  FROM strains
  WHERE LOWER(TRIM(name)) = v_normalized
  AND is_active = true
  LIMIT 1;

  IF strain_id IS NOT NULL THEN
    RETURN;
  END IF;

  -- Try partial match (starts with)
  SELECT id, name, abbreviation, 'partial'
  INTO strain_id, strain_name, strain_abbreviation, match_quality
  FROM strains
  WHERE LOWER(TRIM(name)) LIKE v_normalized || '%'
  AND is_active = true
  ORDER BY LENGTH(name)
  LIMIT 1;

  IF strain_id IS NOT NULL THEN
    RETURN;
  END IF;

  -- Try contains match
  SELECT id, name, abbreviation, 'contains'
  INTO strain_id, strain_name, strain_abbreviation, match_quality
  FROM strains
  WHERE LOWER(TRIM(name)) LIKE '%' || v_normalized || '%'
  AND is_active = true
  ORDER BY LENGTH(name)
  LIMIT 1;

  -- If still nothing found, return null with 'not_found' quality
  IF strain_id IS NULL THEN
    match_quality := 'not_found';
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get strain abbreviation with fallback
CREATE OR REPLACE FUNCTION get_strain_abbreviation(p_strain_name text)
RETURNS text AS $$
DECLARE
  v_result RECORD;
  v_generated text;
  v_words text[];
BEGIN
  -- Try to find strain
  SELECT * INTO v_result FROM find_strain_by_name(p_strain_name);

  -- If found and has abbreviation, return it
  IF v_result.strain_id IS NOT NULL AND v_result.strain_abbreviation IS NOT NULL THEN
    RETURN v_result.strain_abbreviation;
  END IF;

  -- Fallback: Generate abbreviation from name
  v_words := string_to_array(TRIM(p_strain_name), ' ');

  IF array_length(v_words, 1) >= 2 THEN
    -- Multi-word: take first letter of each word
    v_generated := '';
    FOR i IN 1..LEAST(array_length(v_words, 1), 3) LOOP
      v_generated := v_generated || UPPER(substring(v_words[i] from 1 for 1));
    END LOOP;
    RETURN v_generated;
  ELSE
    -- Single word: take first 3 characters
    RETURN UPPER(substring(TRIM(p_strain_name) from 1 for 3));
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- STEP 6: Update consolidated package ID generation
-- =====================================================

-- Add advisory lock to prevent race conditions in package ID generation
CREATE OR REPLACE FUNCTION generate_consolidated_package_id(
  p_package_date date,
  p_strain_abbreviation text
)
RETURNS text AS $$
DECLARE
  v_date_str text;
  v_sequence integer;
  v_package_id text;
  v_lock_key bigint;
BEGIN
  -- Create a lock key based on date and strain (hash to bigint)
  v_lock_key := ('x' || md5(p_package_date::text || '-' || p_strain_abbreviation))::bit(64)::bigint;

  -- Acquire advisory lock to prevent concurrent sequence number conflicts
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Format date as YYMMDD
  v_date_str := TO_CHAR(p_package_date, 'YYMMDD');

  -- Get next sequence number (now protected by lock)
  v_sequence := get_next_package_sequence(p_package_date, p_strain_abbreviation);

  -- Build package ID: YYMMDD-STRAIN_ABBR-SEQ
  v_package_id := v_date_str || '-' || p_strain_abbreviation || '-' || v_sequence::text;

  RETURN v_package_id;
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint to consolidated_packages if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'consolidated_packages_package_id_key'
  ) THEN
    ALTER TABLE consolidated_packages ADD CONSTRAINT consolidated_packages_package_id_key UNIQUE (package_id);
  END IF;
END $$;

-- =====================================================
-- STEP 7: Add validation function for CSV imports
-- =====================================================

-- Function to validate strain names from CSV import
CREATE OR REPLACE FUNCTION validate_strain_names(p_strain_names text[])
RETURNS TABLE (
  strain_name text,
  exists_in_db boolean,
  matched_name text,
  abbreviation text,
  match_quality text,
  needs_attention boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    unnest.strain_name,
    (fs.strain_id IS NOT NULL) as exists_in_db,
    fs.strain_name as matched_name,
    fs.strain_abbreviation as abbreviation,
    fs.match_quality,
    (fs.match_quality != 'exact' OR fs.strain_abbreviation IS NULL) as needs_attention
  FROM unnest(p_strain_names) AS unnest(strain_name)
  LEFT JOIN LATERAL find_strain_by_name(unnest.strain_name) fs ON true;
END;
$$ LANGUAGE plpgsql STABLE;
