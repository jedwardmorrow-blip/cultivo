/*
  # Add Triggers to Populate Product Names on Session Completion

  ## Purpose
  Automatically populate product_name columns when sessions are completed.
  This ensures data integrity and eliminates need for manual updates.

  ## Triggers Created
  1. trigger_set_bucking_product_names - Populates bucking_sessions product names
  2. trigger_set_trim_product_names - Populates trim_sessions product names
  3. trigger_set_packaging_product_names - Populates packaging_sessions product name

  ## Behavior
  - Triggers fire BEFORE UPDATE on session tables
  - Only populate when session_status changes to 'completed'
  - Set product names based on output quantities
  - NULL if no output for that product type
*/

-- Trigger function for bucking_sessions
CREATE OR REPLACE FUNCTION set_bucking_product_names()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set product names when session completes
  IF NEW.session_status = 'completed' AND 
     (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN
    
    -- Set flower product name if we produced flower
    IF COALESCE(NEW.bucked_flower_grams, 0) > 0 THEN
      NEW.output_product_flower_name := 'Bulk Flower (Bucked)';
    ELSE
      NEW.output_product_flower_name := NULL;
    END IF;
    
    -- Set smalls product name if we produced smalls
    IF COALESCE(NEW.bucked_smalls_grams, 0) > 0 THEN
      NEW.output_product_smalls_name := 'Bulk Smalls (Bucked)';
    ELSE
      NEW.output_product_smalls_name := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_bucking_product_names
  BEFORE UPDATE ON bucking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_bucking_product_names();

-- Trigger function for trim_sessions
CREATE OR REPLACE FUNCTION set_trim_product_names()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set product names when session completes
  IF NEW.session_status = 'completed' AND 
     (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN
    
    -- Set bigs product name if we produced bigs
    IF COALESCE(NEW.big_buds_grams, 0) > 0 THEN
      NEW.output_product_bigs_name := 'Bulk Flower (Trimmed)';
    ELSE
      NEW.output_product_bigs_name := NULL;
    END IF;
    
    -- Set smalls product name if we produced smalls
    IF COALESCE(NEW.small_buds_grams, 0) > 0 THEN
      NEW.output_product_smalls_name := 'Bulk Smalls (Trimmed)';
    ELSE
      NEW.output_product_smalls_name := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_trim_product_names
  BEFORE UPDATE ON trim_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_trim_product_names();

-- Trigger function for packaging_sessions
CREATE OR REPLACE FUNCTION set_packaging_product_names()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set product name when session completes
  IF NEW.session_status = 'completed' AND 
     (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN
    
    -- For now, use generic name. Could be enhanced to use specific product
    -- from the session if needed in future
    NEW.output_product_name := 'Packaged Products';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_packaging_product_names
  BEFORE UPDATE ON packaging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_packaging_product_names();

COMMENT ON FUNCTION set_bucking_product_names() IS
'Automatically populates product name columns when bucking session completes.
Ensures immutable traceability and eliminates need for complex lookups.';

COMMENT ON FUNCTION set_trim_product_names() IS
'Automatically populates product name columns when trim session completes.
Ensures immutable traceability and eliminates need for complex lookups.';

COMMENT ON FUNCTION set_packaging_product_names() IS
'Automatically populates product name column when packaging session completes.
Ensures immutable traceability and eliminates need for complex lookups.';
