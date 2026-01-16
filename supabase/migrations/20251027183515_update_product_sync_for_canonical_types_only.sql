/*
  # Update Product Sync System to Generate Only Canonical Types

  ## Overview
  This migration updates the automatic product sync system to only generate
  the 5 canonical product types for the Packaged stage, preventing creation
  of non-canonical product types going forward.

  ## Changes
  
  1. **sync_products_for_strain function**
     - Filter product_types to only include canonical types
     - Only process types: 1lb Flower (454g), 1lb Smalls (454g), 14g Smalls, 3.5g Flower, 1g Preroll
     - Skip creation of non-canonical types
     - Maintain all existing logic for naming, categorization, and conflict handling
  
  2. **Validation**
     - Ensures only active, canonical product types are used
     - Prevents future creation of deprecated product types
     - Maintains backward compatibility with existing data

  ## Benefits
  
  - Prevents accumulation of non-canonical products
  - Maintains clean 5-product catalog per strain
  - Reduces catalog bloat and confusion
  - Supports accurate sell-through tracking
  - Enforces standardization at the database level
*/

-- ============================================================================
-- UPDATE PRODUCT SYNC FUNCTION TO USE ONLY CANONICAL TYPES
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
  v_canonical_types text[] := ARRAY[
    '1lb Flower (454g)',
    '1lb Smalls (454g)',
    '14g Smalls',
    '3.5g Flower',
    '1g Preroll'
  ];
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
    -- Loop through ONLY canonical product types that apply to this stage
    FOR v_type IN
      SELECT id, name, applicable_stages
      FROM product_types
      WHERE is_active = true
        AND name = ANY(v_canonical_types)
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
        is_archived,
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
        false, -- Ensure new products are not archived
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
'Generates ONLY the 5 canonical product types for a specific strain based on active product types and stages.
Canonical types: 1lb Flower (454g), 1lb Smalls (454g), 14g Smalls, 3.5g Flower, 1g Preroll.
Uses ON CONFLICT to prevent duplicates. Only processes active strains.';

-- ============================================================================
-- UPDATE CATALOG-WIDE SYNC FUNCTION (USES UPDATED SINGLE-STRAIN FUNCTION)
-- ============================================================================

-- The sync_products_for_all_strains function doesn't need changes as it calls
-- sync_products_for_strain, which now handles canonical type filtering

-- ============================================================================
-- CREATE VALIDATION FUNCTION TO VERIFY CANONICAL PRODUCTS
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_canonical_product_catalog()
RETURNS TABLE (
  strain_name text,
  canonical_type text,
  product_exists boolean,
  product_id uuid,
  is_archived boolean
) AS $$
BEGIN
  RETURN QUERY
  WITH canonical_types AS (
    SELECT unnest(ARRAY[
      '1lb Flower (454g)',
      '1lb Smalls (454g)',
      '14g Smalls',
      '3.5g Flower',
      '1g Preroll'
    ]) as type_name
  ),
  active_strains AS (
    SELECT id, name FROM strains WHERE is_active = true
  )
  SELECT
    s.name as strain_name,
    ct.type_name as canonical_type,
    (p.id IS NOT NULL) as product_exists,
    p.id as product_id,
    COALESCE(p.is_archived, false) as is_archived
  FROM active_strains s
  CROSS JOIN canonical_types ct
  LEFT JOIN product_types pt ON pt.name = ct.type_name
  LEFT JOIN product_stages ps ON ps.name = 'Packaged'
  LEFT JOIN products p ON (
    p.strain_id = s.id 
    AND p.type_id = pt.id 
    AND p.stage_id = ps.id
  )
  ORDER BY s.name, 
    CASE ct.type_name
      WHEN '1lb Flower (454g)' THEN 1
      WHEN '1lb Smalls (454g)' THEN 2
      WHEN '14g Smalls' THEN 3
      WHEN '3.5g Flower' THEN 4
      WHEN '1g Preroll' THEN 5
    END;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION validate_canonical_product_catalog IS
'Validates that each active strain has all 5 canonical product types.
Returns a matrix showing which products exist and which are missing.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION validate_canonical_product_catalog TO authenticated;

-- ============================================================================
-- RUN VALIDATION AND REPORT
-- ============================================================================

DO $$
DECLARE
  v_total_expected integer;
  v_total_existing integer;
  v_total_missing integer;
  v_total_archived integer;
  v_strain_count integer;
BEGIN
  -- Count active strains
  SELECT COUNT(*) INTO v_strain_count FROM strains WHERE is_active = true;
  
  v_total_expected := v_strain_count * 5; -- 5 canonical types per strain

  -- Count existing canonical products
  SELECT COUNT(*) INTO v_total_existing
  FROM validate_canonical_product_catalog()
  WHERE product_exists = true AND is_archived = false;

  -- Count missing products
  SELECT COUNT(*) INTO v_total_missing
  FROM validate_canonical_product_catalog()
  WHERE product_exists = false OR is_archived = true;

  -- Count archived canonical products
  SELECT COUNT(*) INTO v_total_archived
  FROM validate_canonical_product_catalog()
  WHERE product_exists = true AND is_archived = true;

  RAISE NOTICE 'Product sync system updated for canonical types only:';
  RAISE NOTICE '  - Active strains: %', v_strain_count;
  RAISE NOTICE '  - Expected canonical products: %', v_total_expected;
  RAISE NOTICE '  - Existing active products: %', v_total_existing;
  RAISE NOTICE '  - Missing products: %', v_total_missing;
  RAISE NOTICE '  - Archived canonical products: %', v_total_archived;
  
  IF v_total_missing > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Run sync_products_for_all_strains() to generate missing products.';
  END IF;
END $$;
