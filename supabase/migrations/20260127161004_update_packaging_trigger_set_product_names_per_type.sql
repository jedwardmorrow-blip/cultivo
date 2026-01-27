/*
  # Update Packaging Session Trigger to Set Product-Specific Names

  ## Purpose
  Update the `set_packaging_product_names()` trigger to populate specific product names
  for each product type (3.5g, 14g, 1lb) instead of using a generic "Packaged Products" name.

  ## Problem
  Current trigger sets:
  - `output_product_name = 'Packaged Products'` (generic, not useful)
  - Does not populate product-specific name columns (output_product_3_5g_name, etc.)

  ## Solution
  Update trigger to:
  - Query strain name from strains table using strain_id
  - Set specific product names in format: "Packaged - [Strain] - [Size] Flower"
  - Only set names for products that were actually packaged (units > 0)
  - NULL out names for products that weren't packaged (units = 0)

  ## Product Name Format
  - 3.5g: "Packaged - [Strain] - 3.5g Flower"
  - 14g: "Packaged - [Strain] - 14g Flower"
  - 1lb: "Packaged - [Strain] - 1lb Flower (454g)"

  Note: Currently assumes all packaging is flower. If smalls packaging is added later,
  this trigger should be enhanced to differentiate based on source material.

  ## Changes
  1. Replace generic name assignment with product-specific logic
  2. Add strain name lookup using strain_id
  3. Set output_product_3_5g_name if units_3_5g > 0
  4. Set output_product_14g_name if units_14g > 0
  5. Set output_product_1lb_name if units_454g > 0
  6. Keep output_product_name for backward compatibility (set to first non-null product name)
*/

CREATE OR REPLACE FUNCTION set_packaging_product_names()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_strain_name text;
BEGIN
  -- Only set product names when session completes
  IF NEW.session_status = 'completed' AND 
     (OLD.session_status IS NULL OR OLD.session_status != 'completed') THEN
    
    -- Get strain name for building product names
    SELECT name INTO v_strain_name
    FROM strains
    WHERE id = NEW.strain_id;
    
    -- Handle case where strain not found (shouldn't happen, but be safe)
    IF v_strain_name IS NULL THEN
      v_strain_name := 'Unknown Strain';
    END IF;
    
    -- Set 3.5g product name if we produced 3.5g units
    IF COALESCE(NEW.units_3_5g, 0) > 0 THEN
      NEW.output_product_3_5g_name := 'Packaged - ' || v_strain_name || ' - 3.5g Flower';
    ELSE
      NEW.output_product_3_5g_name := NULL;
    END IF;
    
    -- Set 14g product name if we produced 14g units
    IF COALESCE(NEW.units_14g, 0) > 0 THEN
      NEW.output_product_14g_name := 'Packaged - ' || v_strain_name || ' - 14g Flower';
    ELSE
      NEW.output_product_14g_name := NULL;
    END IF;
    
    -- Set 1lb product name if we produced 1lb units
    IF COALESCE(NEW.units_454g, 0) > 0 THEN
      NEW.output_product_1lb_name := 'Packaged - ' || v_strain_name || ' - 1lb Flower (454g)';
    ELSE
      NEW.output_product_1lb_name := NULL;
    END IF;
    
    -- Set generic output_product_name for backward compatibility
    -- Use the first non-null specific product name, or generic fallback
    NEW.output_product_name := COALESCE(
      NEW.output_product_3_5g_name,
      NEW.output_product_14g_name,
      NEW.output_product_1lb_name,
      'Packaged Products'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_packaging_product_names() IS
'Automatically populates product-specific name columns when packaging session completes.
Creates specific names like "Packaged - [Strain] - 3.5g Flower" for each product type.
Ensures immutable traceability and eliminates need for complex lookups.';

-- Backfill existing completed sessions that don't have specific product names
UPDATE packaging_sessions ps
SET 
  output_product_3_5g_name = CASE 
    WHEN COALESCE(units_3_5g, 0) > 0 THEN 'Packaged - ' || s.name || ' - 3.5g Flower'
    ELSE NULL 
  END,
  output_product_14g_name = CASE 
    WHEN COALESCE(units_14g, 0) > 0 THEN 'Packaged - ' || s.name || ' - 14g Flower'
    ELSE NULL 
  END,
  output_product_1lb_name = CASE 
    WHEN COALESCE(units_454g, 0) > 0 THEN 'Packaged - ' || s.name || ' - 1lb Flower (454g)'
    ELSE NULL 
  END
FROM strains s
WHERE ps.strain_id = s.id
  AND ps.session_status = 'completed'
  AND (
    ps.output_product_3_5g_name IS NULL OR
    ps.output_product_14g_name IS NULL OR
    ps.output_product_1lb_name IS NULL
  );
