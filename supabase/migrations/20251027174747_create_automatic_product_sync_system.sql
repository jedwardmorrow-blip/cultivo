-- Add unique constraint on strain_id, type_id, stage_id combination
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

-- Create product sync function for single strain
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
  IF NOT p_is_active THEN
    RETURN;
  END IF;

  SELECT name INTO v_strain_name FROM strains WHERE id = p_strain_id;

  FOR v_stage IN
    SELECT id, name, default_pricing_unit, allows_fractional_quantity
    FROM product_stages
    WHERE is_active = true
    ORDER BY sort_order
  LOOP
    FOR v_type IN
      SELECT id, name, applicable_stages
      FROM product_types
      WHERE is_active = true
        AND v_stage.name = ANY(applicable_stages)
      ORDER BY sort_order
    LOOP
      IF v_stage.name IN ('Bulk', 'Binned', 'Bucked') THEN
        v_product_category := 'bulk';
      ELSIF LOWER(v_type.name) LIKE '%preroll%' OR LOWER(v_type.name) LIKE '%pre-roll%' THEN
        v_product_category := 'preroll';
      ELSE
        v_product_category := 'packaged';
      END IF;

      v_pricing_unit := v_stage.default_pricing_unit;
      v_allows_fractional := v_stage.allows_fractional_quantity;
      v_product_name := v_stage.name || ' - ' || v_strain_name || ' - ' || v_type.name;

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
        0,
        true,
        now(),
        now()
      )
      ON CONFLICT (strain_id, type_id, stage_id) DO NOTHING;

      IF FOUND THEN
        v_products_created := v_products_created + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT v_products_created, v_strain_name;
END;
$$ LANGUAGE plpgsql;

-- Create catalog-wide sync function
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
  FOR v_strain IN
    SELECT id, name, is_active
    FROM strains
    WHERE is_active = true
    ORDER BY name
  LOOP
    SELECT * INTO v_result
    FROM sync_products_for_strain(v_strain.id, v_strain.is_active);

    v_total_strains := v_total_strains + 1;
    v_total_products := v_total_products + COALESCE(v_result.products_created, 0);
    v_strain_names := array_append(v_strain_names, v_strain.name);
  END LOOP;

  RETURN QUERY SELECT v_total_strains, v_total_products, v_strain_names;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_sync_products_on_strain_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.is_active = true) OR
     (TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false) THEN
    PERFORM sync_products_for_strain(NEW.id, NEW.is_active);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS auto_sync_products_on_strain_change ON strains;
CREATE TRIGGER auto_sync_products_on_strain_change
  AFTER INSERT OR UPDATE OF is_active
  ON strains
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_products_on_strain_change();

-- Create helper function
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION sync_products_for_strain TO authenticated;
GRANT EXECUTE ON FUNCTION sync_products_for_all_strains TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_coverage_report TO authenticated;

-- Initial population
DO $$
DECLARE
  v_result record;
BEGIN
  SELECT * INTO v_result FROM sync_products_for_all_strains();
  RAISE NOTICE 'Product sync completed: % strains processed, % products created',
    v_result.total_strains_processed,
    v_result.total_products_created;
END $$;