/*
  # Add Admin Session Management and Enhanced Consolidation System

  ## Overview
  This migration adds comprehensive admin controls for editing and deleting completed sessions,
  with automatic inventory recalculation and consolidated package updates. It also removes the
  deprecated "recorded_in_dutchie" field and ensures automatic consolidation on session completion.

  ## Changes

  ### 1. Remove Dutchie Integration Fields
  - Drop recorded_in_dutchie from trim_sessions
  - Drop recorded_in_dutchie from packaging_sessions

  ### 2. Add Admin-Only Edit/Delete Functions
  - `admin_edit_trim_session()` - Validates and edits completed trim sessions
  - `admin_delete_trim_session()` - Deletes trim session and recalculates inventory
  - `admin_edit_packaging_session()` - Validates and edits completed packaging sessions
  - `admin_delete_packaging_session()` - Deletes packaging session and recalculates inventory

  ### 3. Add Inventory Recalculation Functions
  - `recalculate_consolidated_package_for_session()` - Updates consolidated packages
  - `remove_session_from_consolidated_packages()` - Removes session contributions
  - `validate_consolidated_package_edit()` - Validates edits won't create negative inventory

  ### 4. Update Consolidation Triggers
  - Enhanced triggers to handle session updates properly
  - Add validation for strain abbreviations

  ## Security
  - Admin role checks enforced in all admin functions
  - RLS policies remain unchanged (authenticated users)
  - Validation prevents negative inventory states
*/

-- Step 1: Drop recorded_in_dutchie columns (deprecated)
ALTER TABLE trim_sessions DROP COLUMN IF EXISTS recorded_in_dutchie;
ALTER TABLE packaging_sessions DROP COLUMN IF EXISTS recorded_in_dutchie;

-- Step 2: Add function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS boolean AS $$
DECLARE
  v_user_role text;
BEGIN
  SELECT role INTO v_user_role
  FROM user_profiles
  WHERE id = auth.uid();

  RETURN (v_user_role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Function to validate consolidated package edits
CREATE OR REPLACE FUNCTION validate_consolidated_package_edit(
  p_session_id uuid,
  p_session_type text,
  p_new_flower_grams numeric DEFAULT 0,
  p_new_smalls_grams numeric DEFAULT 0,
  p_new_trim_grams numeric DEFAULT 0,
  p_new_units_3_5g integer DEFAULT 0,
  p_new_units_14g integer DEFAULT 0,
  p_new_units_454g integer DEFAULT 0
)
RETURNS boolean AS $$
DECLARE
  v_package record;
  v_old_contribution_flower numeric := 0;
  v_old_contribution_smalls numeric := 0;
  v_old_contribution_trim numeric := 0;
  v_old_contribution_3_5g integer := 0;
  v_old_contribution_14g integer := 0;
  v_old_contribution_454g integer := 0;
  v_new_total numeric;
BEGIN
  -- Get old contributions from consolidated_package_sources
  IF p_session_type = 'trim' THEN
    SELECT
      COALESCE(SUM(CASE WHEN cp.product_type = 'Flower' THEN cps.contribution_weight_grams ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN cp.product_type = 'Smalls' THEN cps.contribution_weight_grams ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN cp.product_type = 'Trim' THEN cps.contribution_weight_grams ELSE 0 END), 0)
    INTO v_old_contribution_flower, v_old_contribution_smalls, v_old_contribution_trim
    FROM consolidated_package_sources cps
    JOIN consolidated_packages cp ON cp.id = cps.consolidated_package_id
    WHERE cps.session_id = p_session_id AND cps.session_type = p_session_type;

    -- Check each product type won't go negative
    FOR v_package IN
      SELECT cp.id, cp.product_type, cp.total_weight_grams
      FROM consolidated_packages cp
      WHERE cp.id IN (
        SELECT consolidated_package_id
        FROM consolidated_package_sources
        WHERE session_id = p_session_id AND session_type = p_session_type
      )
    LOOP
      IF v_package.product_type = 'Flower' THEN
        v_new_total := v_package.total_weight_grams - v_old_contribution_flower + p_new_flower_grams;
      ELSIF v_package.product_type = 'Smalls' THEN
        v_new_total := v_package.total_weight_grams - v_old_contribution_smalls + p_new_smalls_grams;
      ELSIF v_package.product_type = 'Trim' THEN
        v_new_total := v_package.total_weight_grams - v_old_contribution_trim + p_new_trim_grams;
      END IF;

      IF v_new_total < 0 THEN
        RAISE EXCEPTION 'Edit would result in negative inventory for % (new total: %g)', v_package.product_type, v_new_total;
      END IF;
    END LOOP;

  ELSIF p_session_type = 'packaging' THEN
    SELECT
      COALESCE(SUM(CASE WHEN cp.product_type = '3.5g' THEN cps.contribution_units ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN cp.product_type = '14g' THEN cps.contribution_units ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN cp.product_type = '454g' THEN cps.contribution_units ELSE 0 END), 0)
    INTO v_old_contribution_3_5g, v_old_contribution_14g, v_old_contribution_454g
    FROM consolidated_package_sources cps
    JOIN consolidated_packages cp ON cp.id = cps.consolidated_package_id
    WHERE cps.session_id = p_session_id AND cps.session_type = p_session_type;

    -- Check each product type won't go negative
    FOR v_package IN
      SELECT cp.id, cp.product_type, cp.total_units
      FROM consolidated_packages cp
      WHERE cp.id IN (
        SELECT consolidated_package_id
        FROM consolidated_package_sources
        WHERE session_id = p_session_id AND session_type = p_session_type
      )
    LOOP
      IF v_package.product_type = '3.5g' THEN
        v_new_total := v_package.total_units - v_old_contribution_3_5g + p_new_units_3_5g;
      ELSIF v_package.product_type = '14g' THEN
        v_new_total := v_package.total_units - v_old_contribution_14g + p_new_units_14g;
      ELSIF v_package.product_type = '454g' THEN
        v_new_total := v_package.total_units - v_old_contribution_454g + p_new_units_454g;
      END IF;

      IF v_new_total < 0 THEN
        RAISE EXCEPTION 'Edit would result in negative inventory for % (new total: %)', v_package.product_type, v_new_total;
      END IF;
    END LOOP;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Function to remove session from consolidated packages
CREATE OR REPLACE FUNCTION remove_session_from_consolidated_packages(
  p_session_id uuid,
  p_session_type text
)
RETURNS void AS $$
DECLARE
  v_source record;
  v_package_id uuid;
  v_remaining_count integer;
BEGIN
  -- Loop through all consolidated package sources for this session
  FOR v_source IN
    SELECT * FROM consolidated_package_sources
    WHERE session_id = p_session_id AND session_type = p_session_type
  LOOP
    v_package_id := v_source.consolidated_package_id;

    -- Remove the contribution
    IF v_source.contribution_weight_grams > 0 THEN
      UPDATE consolidated_packages
      SET total_weight_grams = total_weight_grams - v_source.contribution_weight_grams,
          session_count = session_count - 1,
          source_session_ids = array_remove(source_session_ids, p_session_id),
          updated_at = now()
      WHERE id = v_package_id;
    END IF;

    IF v_source.contribution_units > 0 THEN
      UPDATE consolidated_packages
      SET total_units = total_units - v_source.contribution_units,
          session_count = session_count - 1,
          source_session_ids = array_remove(source_session_ids, p_session_id),
          updated_at = now()
      WHERE id = v_package_id;
    END IF;

    -- Delete the source record
    DELETE FROM consolidated_package_sources WHERE id = v_source.id;

    -- Check if package should be deleted (no more contributions)
    SELECT session_count INTO v_remaining_count
    FROM consolidated_packages
    WHERE id = v_package_id;

    IF v_remaining_count <= 0 THEN
      DELETE FROM consolidated_packages WHERE id = v_package_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Admin function to edit trim session
CREATE OR REPLACE FUNCTION admin_edit_trim_session(
  p_session_id uuid,
  p_big_buds_grams numeric,
  p_small_buds_grams numeric,
  p_trim_grams numeric,
  p_waste_grams numeric,
  p_bucked_smalls_grams numeric DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_strain text;
  v_strain_abbr text;
  v_session_date date;
  v_is_admin boolean;
BEGIN
  -- Check if user is admin
  v_is_admin := is_user_admin();
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admin users can edit completed sessions';
  END IF;

  -- Get session details
  SELECT strain, session_date INTO v_strain, v_session_date
  FROM trim_sessions
  WHERE id = p_session_id AND session_status = 'completed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or not completed';
  END IF;

  -- Validate the edit won't create negative inventory
  PERFORM validate_consolidated_package_edit(
    p_session_id, 'trim',
    p_big_buds_grams, p_small_buds_grams, p_trim_grams
  );

  -- Remove old consolidated package contributions
  PERFORM remove_session_from_consolidated_packages(p_session_id, 'trim');

  -- Update the session
  UPDATE trim_sessions
  SET big_buds_grams = p_big_buds_grams,
      small_buds_grams = p_small_buds_grams,
      trim_grams = p_trim_grams,
      waste_grams = p_waste_grams,
      bucked_smalls_grams = p_bucked_smalls_grams,
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_session_id;

  -- Get strain abbreviation
  SELECT abbreviation INTO v_strain_abbr
  FROM strains
  WHERE name = v_strain;

  IF v_strain_abbr IS NULL THEN
    v_strain_abbr := UPPER(SUBSTRING(v_strain, 1, 3));
  END IF;

  -- Re-consolidate with new values
  PERFORM consolidate_trim_session_output(
    p_session_id,
    v_strain,
    v_strain_abbr,
    v_session_date,
    p_big_buds_grams,
    p_small_buds_grams,
    p_trim_grams
  );
END;
$$ LANGUAGE plpgsql;

-- Step 6: Admin function to delete trim session
CREATE OR REPLACE FUNCTION admin_delete_trim_session(
  p_session_id uuid
)
RETURNS void AS $$
DECLARE
  v_is_admin boolean;
  v_pulled_weight numeric;
  v_bucked_inventory_id uuid;
BEGIN
  -- Check if user is admin
  v_is_admin := is_user_admin();
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admin users can delete completed sessions';
  END IF;

  -- Get session details
  SELECT pulled_weight, bucked_inventory_id
  INTO v_pulled_weight, v_bucked_inventory_id
  FROM trim_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Remove from consolidated packages
  PERFORM remove_session_from_consolidated_packages(p_session_id, 'trim');

  -- Reverse inventory movement (add weight back to bucked inventory)
  IF v_bucked_inventory_id IS NOT NULL THEN
    UPDATE inventory_items
    SET quantity_grams = quantity_grams + v_pulled_weight,
        updated_at = now()
    WHERE id = v_bucked_inventory_id;

    -- Delete the inventory movement record
    DELETE FROM inventory_movements
    WHERE source_id = p_session_id AND movement_type = 'trim_pull';
  END IF;

  -- Delete the session
  DELETE FROM trim_sessions WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Admin function to edit packaging session
CREATE OR REPLACE FUNCTION admin_edit_packaging_session(
  p_session_id uuid,
  p_units_3_5g integer,
  p_units_14g integer,
  p_units_454g integer,
  p_trim_grams numeric DEFAULT 0,
  p_waste_grams numeric DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_strain text;
  v_strain_abbr text;
  v_session_date date;
  v_is_admin boolean;
BEGIN
  -- Check if user is admin
  v_is_admin := is_user_admin();
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admin users can edit completed sessions';
  END IF;

  -- Get session details
  SELECT strain, session_date INTO v_strain, v_session_date
  FROM packaging_sessions
  WHERE id = p_session_id AND session_status = 'completed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or not completed';
  END IF;

  -- Validate the edit won't create negative inventory
  PERFORM validate_consolidated_package_edit(
    p_session_id, 'packaging',
    0, 0, 0,
    p_units_3_5g, p_units_14g, p_units_454g
  );

  -- Remove old consolidated package contributions
  PERFORM remove_session_from_consolidated_packages(p_session_id, 'packaging');

  -- Update the session
  UPDATE packaging_sessions
  SET units_3_5g = p_units_3_5g,
      units_14g = p_units_14g,
      units_454g = p_units_454g,
      trim_grams = p_trim_grams,
      waste_grams = p_waste_grams,
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_session_id;

  -- Get strain abbreviation
  SELECT abbreviation INTO v_strain_abbr
  FROM strains
  WHERE name = v_strain;

  IF v_strain_abbr IS NULL THEN
    v_strain_abbr := UPPER(SUBSTRING(v_strain, 1, 3));
  END IF;

  -- Re-consolidate with new values
  PERFORM consolidate_packaging_session_output(
    p_session_id,
    v_strain,
    v_strain_abbr,
    v_session_date,
    p_units_3_5g,
    p_units_14g,
    p_units_454g
  );
END;
$$ LANGUAGE plpgsql;

-- Step 8: Admin function to delete packaging session
CREATE OR REPLACE FUNCTION admin_delete_packaging_session(
  p_session_id uuid
)
RETURNS void AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Check if user is admin
  v_is_admin := is_user_admin();
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admin users can delete completed sessions';
  END IF;

  -- Check session exists
  IF NOT EXISTS (SELECT 1 FROM packaging_sessions WHERE id = p_session_id) THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Remove from consolidated packages
  PERFORM remove_session_from_consolidated_packages(p_session_id, 'packaging');

  -- Delete inventory movements related to this session
  DELETE FROM inventory_movements
  WHERE source_id = p_session_id AND movement_type LIKE 'packaging%';

  -- Delete the session
  DELETE FROM packaging_sessions WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Update consolidation trigger to prevent duplicate consolidation
CREATE OR REPLACE FUNCTION trigger_consolidate_trim_session_output()
RETURNS TRIGGER AS $$
DECLARE
  v_strain_abbr text;
  v_already_consolidated boolean;
BEGIN
  -- Only consolidate when session is newly completed
  IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN

    -- Check if already consolidated (prevent duplicates)
    SELECT EXISTS(
      SELECT 1 FROM consolidated_package_sources
      WHERE session_id = NEW.id AND session_type = 'trim'
    ) INTO v_already_consolidated;

    IF v_already_consolidated THEN
      RETURN NEW;
    END IF;

    -- Get strain abbreviation from strains table
    SELECT abbreviation INTO v_strain_abbr
    FROM strains
    WHERE name = NEW.strain;

    -- If no abbreviation found, use first 3 letters of strain name
    IF v_strain_abbr IS NULL THEN
      v_strain_abbr := UPPER(SUBSTRING(NEW.strain, 1, 3));
    END IF;

    -- Call consolidation function
    PERFORM consolidate_trim_session_output(
      NEW.id,
      NEW.strain,
      v_strain_abbr,
      NEW.session_date,
      COALESCE(NEW.big_buds_grams, 0),
      COALESCE(NEW.small_buds_grams, 0),
      COALESCE(NEW.trim_grams, 0)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Update packaging consolidation trigger
CREATE OR REPLACE FUNCTION trigger_consolidate_packaging_session_output()
RETURNS TRIGGER AS $$
DECLARE
  v_strain_abbr text;
  v_already_consolidated boolean;
BEGIN
  -- Only consolidate when session is newly completed
  IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN

    -- Check if already consolidated (prevent duplicates)
    SELECT EXISTS(
      SELECT 1 FROM consolidated_package_sources
      WHERE session_id = NEW.id AND session_type = 'packaging'
    ) INTO v_already_consolidated;

    IF v_already_consolidated THEN
      RETURN NEW;
    END IF;

    -- Get strain abbreviation from strains table
    SELECT abbreviation INTO v_strain_abbr
    FROM strains
    WHERE name = NEW.strain;

    -- If no abbreviation found, use first 3 letters of strain name
    IF v_strain_abbr IS NULL THEN
      v_strain_abbr := UPPER(SUBSTRING(NEW.strain, 1, 3));
    END IF;

    -- Call consolidation function
    PERFORM consolidate_packaging_session_output(
      NEW.id,
      NEW.strain,
      v_strain_abbr,
      NEW.session_date,
      COALESCE(NEW.units_3_5g, 0),
      COALESCE(NEW.units_14g, 0),
      COALESCE(NEW.units_454g, 0)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
DROP TRIGGER IF EXISTS trigger_consolidate_trim_session ON trim_sessions;
CREATE TRIGGER trigger_consolidate_trim_session
  AFTER INSERT OR UPDATE ON trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_consolidate_trim_session_output();

DROP TRIGGER IF EXISTS trigger_consolidate_packaging_session ON packaging_sessions;
CREATE TRIGGER trigger_consolidate_packaging_session
  AFTER INSERT OR UPDATE ON packaging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_consolidate_packaging_session_output();
