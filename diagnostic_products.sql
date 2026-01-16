-- Diagnostic query to understand current product state

-- 1. Count products with and without foreign keys
SELECT 
  'Products with all FK set' AS status,
  COUNT(*) AS count
FROM products
WHERE stage_id IS NOT NULL AND type_id IS NOT NULL AND strain_id IS NOT NULL
UNION ALL
SELECT 
  'Products missing stage_id' AS status,
  COUNT(*) AS count
FROM products
WHERE stage_id IS NULL
UNION ALL
SELECT 
  'Products missing type_id' AS status,
  COUNT(*) AS count
FROM products
WHERE type_id IS NULL
UNION ALL
SELECT 
  'Products missing strain_id' AS status,
  COUNT(*) AS count
FROM products
WHERE strain_id IS NULL;

-- 2. Sample products to see naming patterns
SELECT 
  name,
  stage_id IS NOT NULL AS has_stage,
  type_id IS NOT NULL AS has_type,
  strain_id IS NOT NULL AS has_strain,
  product_category,
  is_active
FROM products
WHERE name LIKE '%Cherry Paloma%'
ORDER BY name
LIMIT 10;

-- 3. Check if strains table has Cherry Paloma
SELECT id, name, abbreviation, is_active
FROM strains
WHERE name ILIKE '%Cherry Paloma%';

-- 4. Check product types related to bulk/packaged
SELECT id, name, applicable_stages, is_active
FROM product_types
WHERE name ILIKE '%flower%' OR name ILIKE '%lb%'
ORDER BY sort_order;

-- 5. Check product stages
SELECT id, name, sort_order, is_active
FROM product_stages
ORDER BY sort_order;
