/*
  # Add Product Archive Infrastructure and Standardize Product Catalog

  ## Overview
  This migration establishes archive infrastructure for products and standardizes
  the product catalog to 5 canonical product types for the Packaged stage.

  ## 1. Archive Infrastructure
  
  ### New Columns Added to products table:
  - `is_archived` (boolean) - Flags products as archived (not deleted)
  - `archived_at` (timestamptz) - When the product was archived
  - `replaced_by_product_id` (uuid) - Points to the canonical product that replaces this one
  - `archive_reason` (text) - Documents why the product was archived

  ## 2. Canonical Product Types (Packaged Stage)
  
  The system will standardize to exactly 5 product types for customer orders:
  - 1lb Flower (454g)
  - 1lb Smalls (454g)
  - 14g Smalls
  - 3.5g Flower
  - 1g Preroll

  ## 3. Non-Canonical Types to Archive
  
  These product types will be marked as inactive:
  - 28g Flower (not in canonical list)
  - 14g Flower (not in canonical list)
  - 3-pack Preroll (not in canonical list)

  ## 4. Benefits
  
  - Preserves all historical data for audit trail
  - Enables clean product catalog for sell-through tracking
  - Maintains referential integrity
  - Allows gradual migration without breaking existing features
  - Provides clear mapping from legacy to canonical products

  ## 5. Important Notes
  
  - No data is deleted - only flagged
  - All existing orders and references remain intact
  - Products are archived at the product level, not type level
  - Product types are marked inactive but not deleted
  - Service layer handles filtering of archived products
*/

-- ============================================================================
-- 1. ADD ARCHIVE INFRASTRUCTURE TO PRODUCTS TABLE
-- ============================================================================

-- Add is_archived column (defaults to false for all existing products)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE products ADD COLUMN is_archived boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add archived_at timestamp column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE products ADD COLUMN archived_at timestamptz;
  END IF;
END $$;

-- Add replaced_by_product_id to track canonical replacement
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'replaced_by_product_id'
  ) THEN
    ALTER TABLE products ADD COLUMN replaced_by_product_id uuid REFERENCES products(id);
  END IF;
END $$;

-- Add archive_reason for documentation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'archive_reason'
  ) THEN
    ALTER TABLE products ADD COLUMN archive_reason text;
  END IF;
END $$;

-- Add index on is_archived for query performance
CREATE INDEX IF NOT EXISTS idx_products_is_archived ON products(is_archived) WHERE is_archived = false;

-- Add index on replaced_by_product_id
CREATE INDEX IF NOT EXISTS idx_products_replaced_by ON products(replaced_by_product_id) WHERE replaced_by_product_id IS NOT NULL;

COMMENT ON COLUMN products.is_archived IS 
'Flags whether this product is archived. Archived products are hidden from normal queries but preserved for audit trail.';

COMMENT ON COLUMN products.archived_at IS 
'Timestamp when this product was archived. NULL for active products.';

COMMENT ON COLUMN products.replaced_by_product_id IS 
'Points to the canonical product that replaces this archived product. Used for reference migration and reporting.';

COMMENT ON COLUMN products.archive_reason IS 
'Human-readable explanation for why this product was archived (e.g., "Consolidated to canonical product type").';

-- ============================================================================
-- 2. MARK NON-CANONICAL PRODUCT TYPES AS INACTIVE
-- ============================================================================

-- Mark non-canonical product types as inactive (not deleted, for audit trail)
UPDATE product_types
SET is_active = false,
    updated_at = now()
WHERE name IN ('28g Flower', '14g Flower', '3-pack Preroll')
  AND is_active = true;

-- Add comment explaining the canonical product types
COMMENT ON TABLE product_types IS 
'Product types define the standard product configurations. 
Canonical Packaged types: 1lb Flower (454g), 1lb Smalls (454g), 14g Smalls, 3.5g Flower, 1g Preroll.
Non-canonical types are marked is_active=false but preserved for historical reference.';

-- ============================================================================
-- 3. ARCHIVE PRODUCTS WITH NON-CANONICAL TYPES
-- ============================================================================

-- Archive all products that use non-canonical product types
UPDATE products p
SET 
  is_archived = true,
  archived_at = now(),
  archive_reason = 'Product type not in canonical list (28g Flower, 14g Flower, 3-pack Preroll)',
  is_active = false
FROM product_types pt
WHERE p.type_id = pt.id
  AND pt.name IN ('28g Flower', '14g Flower', '3-pack Preroll')
  AND p.is_archived = false;

-- ============================================================================
-- 4. CREATE HELPER FUNCTIONS FOR ARCHIVE MANAGEMENT
-- ============================================================================

-- Function to get active (non-archived) products
CREATE OR REPLACE FUNCTION get_active_products()
RETURNS SETOF products AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM products
  WHERE is_archived = false
  ORDER BY product_category, name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_active_products IS
'Returns all non-archived products. Used as a centralized query for active products.';

-- Function to archive a product with reason
CREATE OR REPLACE FUNCTION archive_product(
  p_product_id uuid,
  p_reason text,
  p_replaced_by_product_id uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET 
    is_archived = true,
    archived_at = now(),
    archive_reason = p_reason,
    replaced_by_product_id = p_replaced_by_product_id,
    is_active = false
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive_product IS
'Archives a product with a reason and optional replacement product reference.';

-- Function to get canonical product for a strain
CREATE OR REPLACE FUNCTION get_canonical_products_for_strain(p_strain_id uuid)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  product_type text,
  is_available boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    pt.name as product_type,
    (p.is_active AND NOT p.is_archived) as is_available
  FROM products p
  JOIN product_types pt ON p.type_id = pt.id
  JOIN product_stages ps ON p.stage_id = ps.id
  WHERE p.strain_id = p_strain_id
    AND ps.name = 'Packaged'
    AND pt.name IN ('1lb Flower (454g)', '1lb Smalls (454g)', '14g Smalls', '3.5g Flower', '1g Preroll')
    AND p.is_archived = false
  ORDER BY pt.sort_order, p.name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_canonical_products_for_strain IS
'Returns only the 5 canonical product types for a given strain in the Packaged stage.';

-- ============================================================================
-- 5. CREATE VIEW FOR ARCHIVED PRODUCTS REPORT
-- ============================================================================

CREATE OR REPLACE VIEW archived_products_report AS
SELECT 
  p.id,
  p.name,
  p.archived_at,
  p.archive_reason,
  pt.name as product_type,
  ps.name as stage,
  s.name as strain,
  replacement.name as replaced_by_product_name,
  replacement.id as replaced_by_product_id
FROM products p
LEFT JOIN product_types pt ON p.type_id = pt.id
LEFT JOIN product_stages ps ON p.stage_id = ps.id
LEFT JOIN strains s ON p.strain_id = s.id
LEFT JOIN products replacement ON p.replaced_by_product_id = replacement.id
WHERE p.is_archived = true
ORDER BY p.archived_at DESC;

COMMENT ON VIEW archived_products_report IS
'Comprehensive view of all archived products with their replacement information for audit and reporting purposes.';

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_active_products TO authenticated;
GRANT EXECUTE ON FUNCTION archive_product TO authenticated;
GRANT EXECUTE ON FUNCTION get_canonical_products_for_strain TO authenticated;
GRANT SELECT ON archived_products_report TO authenticated;

-- ============================================================================
-- 7. VALIDATION AND REPORTING
-- ============================================================================

-- Log the results of this migration
DO $$
DECLARE
  v_archived_count integer;
  v_active_packaged_count integer;
  v_canonical_types_count integer;
BEGIN
  -- Count archived products
  SELECT COUNT(*) INTO v_archived_count
  FROM products
  WHERE is_archived = true;

  -- Count active packaged products
  SELECT COUNT(*) INTO v_active_packaged_count
  FROM products p
  JOIN product_stages ps ON p.stage_id = ps.id
  WHERE ps.name = 'Packaged'
    AND p.is_archived = false;

  -- Count products with canonical types
  SELECT COUNT(*) INTO v_canonical_types_count
  FROM products p
  JOIN product_types pt ON p.type_id = pt.id
  JOIN product_stages ps ON p.stage_id = ps.id
  WHERE ps.name = 'Packaged'
    AND pt.name IN ('1lb Flower (454g)', '1lb Smalls (454g)', '14g Smalls', '3.5g Flower', '1g Preroll')
    AND p.is_archived = false;

  RAISE NOTICE 'Product catalog standardization completed:';
  RAISE NOTICE '  - Products archived: %', v_archived_count;
  RAISE NOTICE '  - Active Packaged products: %', v_active_packaged_count;
  RAISE NOTICE '  - Products with canonical types: %', v_canonical_types_count;
  RAISE NOTICE '  - Expected canonical products: % (43 strains × 5 types)', 43 * 5;
END $$;
