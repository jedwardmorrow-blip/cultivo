/*
  # Add Consolidation Triggers to Trim and Packaging Sessions

  ## Overview
  This migration adds triggers to automatically consolidate trim and packaging session outputs
  when sessions are marked as completed. The triggers call the consolidation functions to
  create or update consolidated packages with auto-generated package IDs.

  ## Triggers

  - `trigger_consolidate_trim_session` - Fires after trim session completion
  - `trigger_consolidate_packaging_session` - Fires after packaging session completion

  ## Functions

  - `trigger_consolidate_trim_session_output()` - Wrapper function for trim consolidation
  - `trigger_consolidate_packaging_session_output()` - Wrapper function for packaging consolidation
*/

-- Function to handle trim session consolidation trigger
CREATE OR REPLACE FUNCTION trigger_consolidate_trim_session_output()
RETURNS TRIGGER AS $$
DECLARE
  v_strain_abbr text;
BEGIN
  -- Only consolidate when session is newly completed
  IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN
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

-- Function to handle packaging session consolidation trigger
CREATE OR REPLACE FUNCTION trigger_consolidate_packaging_session_output()
RETURNS TRIGGER AS $$
DECLARE
  v_strain_abbr text;
BEGIN
  -- Only consolidate when session is newly completed
  IF NEW.session_status = 'completed' AND (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN
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

-- Create trigger for trim sessions
DROP TRIGGER IF EXISTS trigger_consolidate_trim_session ON trim_sessions;
CREATE TRIGGER trigger_consolidate_trim_session
  AFTER INSERT OR UPDATE ON trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_consolidate_trim_session_output();

-- Create trigger for packaging sessions
DROP TRIGGER IF EXISTS trigger_consolidate_packaging_session ON packaging_sessions;
CREATE TRIGGER trigger_consolidate_packaging_session
  AFTER INSERT OR UPDATE ON packaging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_consolidate_packaging_session_output();
