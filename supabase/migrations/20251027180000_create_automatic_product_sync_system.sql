/*
  # Automatic Product Catalog Synchronization System

  ## Overview
  This migration creates an automated system that ensures every active strain has
  a complete set of products for all applicable product types. This eliminates
  the need for manual product generation and prevents gaps in the product catalog.

  ## 1. Schema Changes

  ### Add UNIQUE constraint to prevent duplicates
  - Adds constraint on products table: UNIQUE(strain_id, type_id, stage_id)
  - Prevents duplicate products for the same strain-type-stage combination
  - Database-level enforcement for data integrity

  ## 2. Core Functions

  ### sync_products_for_strain(strain_id, is_active)
  - Generates all applicable products for a specific strain
  - Uses INSERT ... ON CONFLICT to prevent duplicates
  - Automatically sets product_category, pricing_unit, and other fields based on stage/type
  - Only creates products for active strains
  - Called automatically by triggers when strains are added or activated

  ### sync_products_for_all_strains()
  - Ensures all active strains have complete product coverage
  - Generates missing products across entire catalog
  - Idempotent - safe to run multiple times
  - Used for initial population and manual maintenance

  ## 3. Triggers

  ### trigger_sync_products_on_strain_change
  - Fires when strains are inserted or updated
  - Automatically generates products when a strain is added
  - Regenerates products when a strain is activated
  - No manual intervention required

  ## 4. Product Assignment Logic

  Products are automatically configured based on their type and stage:
  - **product_category**:
    - 'bulk' for Bulk/Binned/Bucked stages
    - 'packaged' for Packaged stage (non-preroll types)
    - 'preroll' for Packaged stage (preroll types)
  - **pricing_unit**: Inherited from stage's default_pricing_unit
  - **allows_fractional_quantity**: Inherited from stage settings
  - **price_per_unit**: Set to 0 (to be configured manually)
  - **is_active**: Set to true by default
  - **name**: Format: "{Stage} - {Strain} - {Type}"

  ## 5. Benefits

  - Automatic product generation when strains are added
  - No duplicate products (enforced at database level)
  - Complete product coverage for all strains
  - Zero manual maintenance required
  - Consistent product naming and categorization

  ## 6. Important Notes

  - Does not affect existing products
  - Only generates products for active strains
  - Respects product_type applicable_stages restrictions
  - Maintains audit trail via created_at timestamps
*/

-- ============================================================================
-- 1. ADD UNIQUE CONSTRAINT TO PREVENT DUPLICATES
-- ============================================================================

-- Add unique constraint on strain_id, type_id, stage_id combination
-- This prevents duplicate products at the database level
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_strain_type_stage_unique'
  ) THEN
    ALTER TABLE products
    ADD CONSTRAINT products_strain_type_stage_unique
    UNIQUE (strain_id, type_id, stage_id);
  END IF;
END $$;

-- ============================================================================
-- 2. CREATE PRODUCT SYNC FUNCTION FOR SINGLE STRAIN
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_products_for_strain(
  p_strain_id uuid,
  p_is_active boolean DEFAULT true
)
RETURNS TABLE (
  products_created integer,
  strain_name text
) AS $$
DECLARE
  v_strain_name text;
  v_products_created integer := 0;
  v_stage record;
  v_type record;
  v_product_category text;
  v_pricing_unit text;
  v_allows_fractional boolean;
  v_product_name text;
BEGIN
  -- Only process active strains
  IF NOT p_is_active THEN
    RETURN;
  END IF;

  -- Get strain name for logging
  SELECT name INTO v_strain_name FROM strains WHERE id = p_strain_id;

  -- Loop through all active product stages
  FOR v_stage IN
    SELECT id, name, default_pricing_unit, allows_fractional_quantity
    FROM product_stages
    WHERE is_active = true
    ORDER BY sort_order
  LOOP
    -- Loop through all active product types that apply to this stage
    FOR v_type IN
      SELECT id, name, applicable_stages
      FROM product_types
      WHERE is_active = true
        AND v_stage.name = ANY(applicable_stages)
      ORDER BY sort_order
    LOOP
      -- Determine product_category based on stage and type
      IF v_stage.name IN ('Bulk', 'Binned', 'Bucked') THEN
        v_product_category := 'bulk';
      ELSIF LOWER(v_type.name) LIKE '%preroll%' OR LOWER(v_type.name) LIKE '%pre-roll%' THEN
        v_product_category := 'preroll';
      ELSE
        v_product_category := 'packaged';
      END IF;

      -- Get pricing unit and fractional quantity setting from stage
      v_pricing_unit := v_stage.default_pricing_unit;
      v_allows_fractional := v_stage.allows_fractional_quantity;

      -- Generate product name: "{Stage} - {Strain} - {Type}"
      v_product_name := v_stage.name || ' - ' || v_strain_name || ' - ' || v_type.name;

      -- Insert product if it doesn't exist (ON CONFLICT DO NOTHING prevents duplicates)
      INSERT INTO products (
        name,
        stage_id,
        type_id,
        strain_id,
        product_category,
        pricing_unit,
        allows_fractional_quantity,
        price_per_unit,
        is_active,
        generated_at,
        created_at
      )
      VALUES (
        v_product_name,
        v_stage.id,
        v_type.id,
        p_strain_id,
        v_product_category,
        v_pricing_unit,
        v_allows_fractional,
        0, -- Price to be set manually
        true,
        now(),
        now()
      )
      ON CONFLICT (strain_id, type_id, stage_id) DO NOTHING;

      -- Check if product was inserted
      IF FOUND THEN
        v_products_created := v_products_created + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT v_products_created, v_strain_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_products_for_strain IS
'Generates all applicable products for a specific strain based on active product types and stages.
Uses ON CONFLICT to prevent duplicates. Only processes active strains.';

-- ============================================================================
-- 3. CREATE CATALOG-WIDE SYNC FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_products_for_all_strains()
RETURNS TABLE (
  total_strains_processed integer,
  total_products_created integer,
  strains_processed text[]
) AS $$
DECLARE
  v_strain record;
  v_result record;
  v_total_strains integer := 0;
  v_total_products integer := 0;
  v_strain_names text[] := ARRAY[]::text[];
BEGIN
  -- Process all active strains
  FOR v_strain IN
    SELECT id, name, is_active
    FROM strains
    WHERE is_active = true
    ORDER BY name
  LOOP
    -- Sync products for this strain
    SELECT * INTO v_result
    FROM sync_products_for_strain(v_strain.id, v_strain.is_active);

    v_total_strains := v_total_strains + 1;
    v_total_products := v_total_products + COALESCE(v_result.products_created, 0);
    v_strain_names := array_append(v_strain_names, v_strain.name);
  END LOOP;

  RETURN QUERY SELECT v_total_strains, v_total_products, v_strain_names;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_products_for_all_strains IS
'Ensures all active strains have complete product coverage.
Generates missing products across entire catalog. Idempotent - safe to run multiple times.';

-- ============================================================================
-- 4. CREATE TRIGGER TO AUTO-SYNC ON STRAIN CHANGES
-- ============================================================================

-- Function that will be called by the trigger
CREATE OR REPLACE FUNCTION trigger_sync_products_on_strain_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if strain is being activated or newly created as active
  IF (TG_OP = 'INSERT' AND NEW.is_active = true) OR
     (TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false) THEN

    -- Sync products for this strain
    PERFORM sync_products_for_strain(NEW.id, NEW.is_active);

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS auto_sync_products_on_strain_change ON strains;
CREATE TRIGGER auto_sync_products_on_strain_change
  AFTER INSERT OR UPDATE OF is_active
  ON strains
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_products_on_strain_change();

COMMENT ON TRIGGER auto_sync_products_on_strain_change ON strains IS
'Automatically generates products when strains are added or activated.
Ensures complete product coverage without manual intervention.';

-- ============================================================================
-- 5. CREATE HELPER FUNCTION TO CHECK PRODUCT COVERAGE
-- ============================================================================

CREATE OR REPLACE FUNCTION get_product_coverage_report()
RETURNS TABLE (
  strain_name text,
  total_applicable_products integer,
  existing_products integer,
  missing_products integer,
  coverage_percentage numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH strain_expected_products AS (
    SELECT
      s.id AS strain_id,
      s.name AS strain_name,
      COUNT(DISTINCT (ps.id, pt.id)) AS expected_count
    FROM strains s
    CROSS JOIN product_stages ps
    CROSS JOIN product_types pt
    WHERE s.is_active = true
      AND ps.is_active = true
      AND pt.is_active = true
      AND ps.name = ANY(pt.applicable_stages)
    GROUP BY s.id, s.name
  ),
  strain_actual_products AS (
    SELECT
      s.id AS strain_id,
      COUNT(*) AS actual_count
    FROM strains s
    LEFT JOIN products p ON s.id = p.strain_id
    WHERE s.is_active = true
    GROUP BY s.id
  )
  SELECT
    sep.strain_name,
    sep.expected_count::integer AS total_applicable_products,
    COALESCE(sap.actual_count, 0)::integer AS existing_products,
    (sep.expected_count - COALESCE(sap.actual_count, 0))::integer AS missing_products,
    ROUND((COALESCE(sap.actual_count, 0)::numeric / sep.expected_count::numeric) * 100, 2) AS coverage_percentage
  FROM strain_expected_products sep
  LEFT JOIN strain_actual_products sap ON sep.strain_id = sap.strain_id
  ORDER BY coverage_percentage ASC, sep.strain_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_product_coverage_report IS
'Generates a report showing product coverage for each strain.
Useful for identifying gaps in the product catalog.';

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION sync_products_for_strain TO authenticated;
GRANT EXECUTE ON FUNCTION sync_products_for_all_strains TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_coverage_report TO authenticated;

-- ============================================================================
-- 7. INITIAL POPULATION - RUN SYNC FOR ALL EXISTING STRAINS
-- ============================================================================

-- Generate products for all active strains that don't have complete coverage
DO $$
DECLARE
  v_result record;
BEGIN
  SELECT * INTO v_result FROM sync_products_for_all_strains();

  RAISE NOTICE 'Product sync completed: % strains processed, % products created',
    v_result.total_strains_processed,
    v_result.total_products_created;
END $$;
