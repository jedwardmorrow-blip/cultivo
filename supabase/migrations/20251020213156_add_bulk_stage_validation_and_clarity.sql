/*
  # Add Bulk Stage Validation and Clarity Improvements

  ## Overview
  This migration improves clarity and validation between:
  - **Bulk Stage**: Backend processing stage with variable gram amounts (no customer pricing)
  - **Packaged Bulk Product (454g/1lb)**: Discrete packaged product with unit pricing

  ## 1. Schema Changes

  ### Add 1lb product types for packaged stage
  - Create "1lb Flower (454g)" product type
  - Create "1lb Smalls (454g)" product type
  - Set base_weight to 454g, applicable to Packaged stage only

  ### Add validation function
  - Prevent Bulk stage products from having packaged product types
  - Prevent Packaged stage products from having bulk product types
  - Ensure product_category aligns with stage

  ### Add inventory separation view
  - Create view showing backend bulk inventory (for processing)
  - Create view showing packaged inventory (for customer orders)
  - Clear distinction between the two concepts

  ## 2. Security
  - Add RLS policies for new views
  - Maintain existing security model

  ## Important Notes
  - "Bulk" stage = backend processing, variable grams, no pricing
  - "454g" or "1lb" packaged product = customer-orderable, unit pricing
  - No breaking changes to existing data
*/

-- ============================================================================
-- 1. ADD 1LB PRODUCT TYPES FOR PACKAGED STAGE
-- ============================================================================

-- Add 1lb Flower product type
INSERT INTO product_types (name, base_weight, base_unit, sort_order, applicable_stages, description)
VALUES (
  '1lb Flower (454g)',
  454,
  'g',
  14,
  ARRAY['Packaged'],
  'Packaged 1 pound (454g) flower - customer orderable product'
)
ON CONFLICT (name) DO UPDATE SET
  base_weight = 454,
  base_unit = 'g',
  applicable_stages = ARRAY['Packaged'],
  description = 'Packaged 1 pound (454g) flower - customer orderable product';

-- Add 1lb Smalls product type
INSERT INTO product_types (name, base_weight, base_unit, sort_order, applicable_stages, description)
VALUES (
  '1lb Smalls (454g)',
  454,
  'g',
  15,
  ARRAY['Packaged'],
  'Packaged 1 pound (454g) smalls - customer orderable product'
)
ON CONFLICT (name) DO UPDATE SET
  base_weight = 454,
  base_unit = 'g',
  applicable_stages = ARRAY['Packaged'],
  description = 'Packaged 1 pound (454g) smalls - customer orderable product';

-- ============================================================================
-- 2. CREATE VALIDATION FUNCTION
-- ============================================================================

-- Function to validate product stage and type alignment
CREATE OR REPLACE FUNCTION validate_product_stage_type_alignment()
RETURNS TRIGGER AS $$
DECLARE
  v_stage_name text;
  v_type_name text;
  v_type_applicable_stages text[];
BEGIN
  -- Get stage name
  IF NEW.stage_id IS NOT NULL THEN
    SELECT name INTO v_stage_name
    FROM product_stages
    WHERE id = NEW.stage_id;
  END IF;

  -- Get product type info
  IF NEW.type_id IS NOT NULL THEN
    SELECT name, applicable_stages INTO v_type_name, v_type_applicable_stages
    FROM product_types
    WHERE id = NEW.type_id;
  END IF;

  -- Validation 1: Check if stage is in type's applicable_stages
  IF v_stage_name IS NOT NULL AND v_type_name IS NOT NULL THEN
    IF NOT (v_stage_name = ANY(v_type_applicable_stages)) THEN
      RAISE EXCEPTION 'Product type "%" is not applicable to stage "%". Valid stages for this type: %',
        v_type_name, v_stage_name, array_to_string(v_type_applicable_stages, ', ');
    END IF;
  END IF;

  -- Validation 2: Bulk stage products should not have packaged product categories
  IF v_stage_name IN ('Bulk', 'Binned', 'Bucked') AND NEW.product_category = 'packaged' THEN
    RAISE EXCEPTION 'Products in stage "%" cannot have product_category "packaged". Bulk stage is for backend processing only.',
      v_stage_name;
  END IF;

  -- Validation 3: Packaged stage products must have packaged category or preroll
  IF v_stage_name = 'Packaged' AND NEW.product_category NOT IN ('packaged', 'preroll') THEN
    RAISE EXCEPTION 'Products in Packaged stage must have product_category "packaged" or "preroll", not "%"',
      NEW.product_category;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate product stage/type alignment
DROP TRIGGER IF EXISTS validate_product_stage_type ON products;
CREATE TRIGGER validate_product_stage_type
  BEFORE INSERT OR UPDATE OF stage_id, type_id, product_category
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION validate_product_stage_type_alignment();

-- ============================================================================
-- 3. CREATE INVENTORY SEPARATION VIEWS
-- ============================================================================

-- View for backend bulk inventory (processing stages only)
CREATE OR REPLACE VIEW backend_bulk_inventory AS
SELECT
  br.id AS batch_id,
  br.batch_number,
  br.strain,
  br.harvest_date,
  br.room,
  br.status AS batch_status,
  bst.stage,
  bst.weight_grams,
  bst.allocated_weight_grams,
  bst.available_weight_grams,
  bst.location,
  bst.created_at,
  bst.updated_at
FROM batch_registry br
JOIN batch_stage_tracking bst ON br.id = bst.batch_id
WHERE bst.stage IN ('bucked', 'bulk_flower', 'bulk_smalls', 'bulk_trim')
  AND br.status = 'active'
ORDER BY br.strain, bst.stage, br.harvest_date DESC;

COMMENT ON VIEW backend_bulk_inventory IS
'Backend bulk inventory in processing stages (Bucked, Bulk Flower, Bulk Smalls, Bulk Trim).
This is NOT customer-orderable. Variable gram amounts, no pricing. For production use only.';

-- View for customer-orderable packaged inventory
CREATE OR REPLACE VIEW orderable_packaged_inventory AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.sku,
  pt.name AS product_type,
  pt.base_weight AS unit_weight_grams,
  s.name AS strain,
  s.abbreviation AS strain_code,
  p.price_per_unit,
  p.pricing_unit,
  p.available_quantity AS units_available,
  (p.available_quantity * COALESCE(pt.base_weight, 0)) AS total_grams_available,
  p.is_active,
  p.created_at
FROM products p
JOIN product_stages ps ON p.stage_id = ps.id
LEFT JOIN product_types pt ON p.type_id = pt.id
LEFT JOIN strains s ON p.strain_id = s.id
WHERE ps.name = 'Packaged'
  AND p.product_category IN ('packaged', 'preroll')
  AND p.is_active = true
ORDER BY p.product_category, pt.base_weight DESC, s.name, pt.name;

COMMENT ON VIEW orderable_packaged_inventory IS
'Customer-orderable packaged products only. Includes 1lb (454g), 28g, 14g, 3.5g, and prerolls.
These are discrete units with pricing. NOT for backend processing.';

-- ============================================================================
-- 4. ADD HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a product is customer-orderable
CREATE OR REPLACE FUNCTION is_product_orderable(p_product_id uuid)
RETURNS boolean AS $$
DECLARE
  v_stage_name text;
  v_is_active boolean;
BEGIN
  SELECT ps.name, p.is_active
  INTO v_stage_name, v_is_active
  FROM products p
  JOIN product_stages ps ON p.stage_id = ps.id
  WHERE p.id = p_product_id;

  RETURN v_stage_name = 'Packaged' AND v_is_active = true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_product_orderable IS
'Returns true if a product is customer-orderable (Packaged stage and active).
Backend bulk products return false.';

-- ============================================================================
-- 5. ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for filtering orderable products
CREATE INDEX IF NOT EXISTS idx_products_orderable
  ON products(stage_id, product_category, is_active)
  WHERE is_active = true;

-- Index for batch stage tracking lookups
CREATE INDEX IF NOT EXISTS idx_batch_stage_tracking_stage
  ON batch_stage_tracking(stage, batch_id)
  WHERE stage IN ('bucked', 'bulk_flower', 'bulk_smalls', 'bulk_trim');

-- ============================================================================
-- 6. ENABLE RLS ON VIEWS (if needed)
-- ============================================================================

-- Views inherit RLS from underlying tables, but we can add explicit policies if needed
-- For now, authenticated users can read these views since they're informational

-- Grant access to authenticated users
GRANT SELECT ON backend_bulk_inventory TO authenticated;
GRANT SELECT ON orderable_packaged_inventory TO authenticated;

-- ============================================================================
-- 7. UPDATE EXISTING PRODUCT TYPES DESCRIPTIONS FOR CLARITY
-- ============================================================================

-- Update Flower type description to clarify it's for bulk stages
UPDATE product_types
SET description = 'Whole flower material - bulk stage only (backend processing, variable grams, no pricing)'
WHERE name = 'Flower' AND description = 'Whole flower material';

-- Update Smalls type description
UPDATE product_types
SET description = 'Small bud material - bulk stage only (backend processing, variable grams, no pricing)'
WHERE name = 'Smalls' AND description = 'Small bud material';

-- Update Trim type description
UPDATE product_types
SET description = 'Trim material - bulk stage only (backend processing, variable grams, no pricing)'
WHERE name = 'Trim' AND description = 'Trim material';

-- Update packaged product descriptions to clarify they're customer-orderable
UPDATE product_types
SET description = description || ' - customer orderable'
WHERE name IN ('3.5g Flower', '14g Flower', '28g Flower', '14g Smalls', '1g Preroll', '3-pack Preroll')
  AND description NOT LIKE '%customer orderable%';

-- ============================================================================
-- 8. ADD DOCUMENTATION COMMENTS
-- ============================================================================

COMMENT ON TABLE product_stages IS
'Product lifecycle stages: Bulk/Binned/Bucked = backend processing (variable grams, no pricing),
Packaged = customer-orderable products (discrete units with pricing)';

COMMENT ON COLUMN products.stage_id IS
'Stage in product lifecycle. Bulk/Binned/Bucked = backend only. Packaged = customer-orderable.';

COMMENT ON COLUMN products.product_category IS
'Product category: "bulk" for backend processing stages, "packaged" for customer-orderable units, "preroll" for prerolls';

COMMENT ON COLUMN batch_stage_tracking.stage IS
'Batch processing stage: bucked/bulk_flower/bulk_smalls/bulk_trim = backend processing (variable grams),
packaged = customer-orderable discrete units';
