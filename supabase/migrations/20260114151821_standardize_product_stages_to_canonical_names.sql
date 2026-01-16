/*
  # Standardize Product Stages to Canonical Names

  ## Problem
  Product stages have inconsistent naming across migrations:
  - "Bulk" is confusing (sounds like measurement type, not processing stage)
  - Granular stages like "BulkFlower", "BulkSmalls", "BuckedFlower", "BuckedSmalls"
    mix product type with processing stage

  ## Solution
  Standardize to 4 canonical processing stages:
  - Binned (raw harvest, wet weight)
  - Bucked (stems removed, ready for trimming)
  - Trimmed (trimmed flower, ready for packaging or bulk sale)
  - Packaged (consumer-ready packages)

  Product types (bulk_flower, bulk_smalls, etc.) handle the flower/smalls distinction.

  ## Changes
  1. Rename "Bulk" stage to "Trimmed"
  2. Merge granular stages (BulkFlower, BulkSmalls) → "Trimmed"
  3. Merge granular stages (BuckedFlower, BuckedSmalls) → "Bucked"
  4. Update product_stages table to have only canonical 4 stages
  5. Update any products referencing old stages
  6. Update applicable_stages arrays in product_types

  ## Product Flow
  Binned → Bucked → Trimmed → Packaged
  (Bucking)  (Trimming)  (Packaging)
*/

-- =====================================================
-- STEP 1: Temporarily disable validation trigger
-- =====================================================

DROP TRIGGER IF EXISTS validate_product_stage_type ON products;

-- =====================================================
-- STEP 2: Get stage IDs for mapping
-- =====================================================

DO $$
DECLARE
  v_binned_id uuid;
  v_bucked_id uuid;
  v_trimmed_id uuid;
  v_packaged_id uuid;
  v_bulk_id uuid;
  v_bulk_flower_id uuid;
  v_bulk_smalls_id uuid;
  v_bucked_flower_id uuid;
  v_bucked_smalls_id uuid;
BEGIN
  -- Get canonical stage IDs (create if don't exist)
  INSERT INTO product_stages (name, description, sort_order)
  VALUES ('Binned', 'Raw harvest, wet weight', 10)
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order
  RETURNING id INTO v_binned_id;

  INSERT INTO product_stages (name, description, sort_order)
  VALUES ('Bucked', 'Stems removed, ready for trimming', 20)
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order
  RETURNING id INTO v_bucked_id;

  INSERT INTO product_stages (name, description, sort_order)
  VALUES ('Trimmed', 'Trimmed flower, ready for packaging or bulk sale', 30)
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order
  RETURNING id INTO v_trimmed_id;

  INSERT INTO product_stages (name, description, sort_order)
  VALUES ('Packaged', 'Consumer-ready packaged products', 40)
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, sort_order = EXCLUDED.sort_order
  RETURNING id INTO v_packaged_id;

  -- =====================================================
  -- STEP 3: Update product_types applicable_stages FIRST
  -- =====================================================

  -- Add "Trimmed" to applicable stages for Flower, Smalls, Trim
  UPDATE product_types
  SET applicable_stages = ARRAY['Binned', 'Bucked', 'Trimmed']
  WHERE name IN ('Flower', 'Smalls', 'Trim')
    AND applicable_stages IS NOT NULL;

  -- Ensure packaged types only have Packaged stage
  UPDATE product_types
  SET applicable_stages = ARRAY['Packaged']
  WHERE (name LIKE '%g %' OR name LIKE '%pack %')
    AND applicable_stages IS NOT NULL;

  RAISE NOTICE 'Updated product_types applicable_stages to include Trimmed';

  -- =====================================================
  -- STEP 4: Get old stage IDs for migration
  -- =====================================================

  SELECT id INTO v_bulk_id FROM product_stages WHERE name = 'Bulk' LIMIT 1;
  SELECT id INTO v_bulk_flower_id FROM product_stages WHERE name = 'BulkFlower' LIMIT 1;
  SELECT id INTO v_bulk_smalls_id FROM product_stages WHERE name = 'BulkSmalls' LIMIT 1;
  SELECT id INTO v_bucked_flower_id FROM product_stages WHERE name = 'BuckedFlower' LIMIT 1;
  SELECT id INTO v_bucked_smalls_id FROM product_stages WHERE name = 'BuckedSmalls' LIMIT 1;

  -- =====================================================
  -- STEP 5: Migrate products using old stages to canonical stages
  -- =====================================================

  -- Migrate "Bulk" → "Trimmed"
  IF v_bulk_id IS NOT NULL THEN
    UPDATE products
    SET stage_id = v_trimmed_id
    WHERE stage_id = v_bulk_id;

    RAISE NOTICE 'Migrated Bulk stage to Trimmed';
  END IF;

  -- Migrate "BulkFlower" → "Trimmed"
  IF v_bulk_flower_id IS NOT NULL THEN
    UPDATE products
    SET stage_id = v_trimmed_id
    WHERE stage_id = v_bulk_flower_id;

    RAISE NOTICE 'Migrated BulkFlower stage to Trimmed';
  END IF;

  -- Migrate "BulkSmalls" → "Trimmed"
  IF v_bulk_smalls_id IS NOT NULL THEN
    UPDATE products
    SET stage_id = v_trimmed_id
    WHERE stage_id = v_bulk_smalls_id;

    RAISE NOTICE 'Migrated BulkSmalls stage to Trimmed';
  END IF;

  -- Migrate "BuckedFlower" → "Bucked"
  IF v_bucked_flower_id IS NOT NULL THEN
    UPDATE products
    SET stage_id = v_bucked_id
    WHERE stage_id = v_bucked_flower_id;

    RAISE NOTICE 'Migrated BuckedFlower stage to Bucked';
  END IF;

  -- Migrate "BuckedSmalls" → "Bucked"
  IF v_bucked_smalls_id IS NOT NULL THEN
    UPDATE products
    SET stage_id = v_bucked_id
    WHERE stage_id = v_bucked_smalls_id;

    RAISE NOTICE 'Migrated BuckedSmalls stage to Bucked';
  END IF;

  -- =====================================================
  -- STEP 6: Update inventory_items using old stage IDs
  -- =====================================================

  IF v_bulk_id IS NOT NULL THEN
    UPDATE inventory_items
    SET product_stage_id = v_trimmed_id
    WHERE product_stage_id = v_bulk_id;
  END IF;

  IF v_bulk_flower_id IS NOT NULL THEN
    UPDATE inventory_items
    SET product_stage_id = v_trimmed_id
    WHERE product_stage_id = v_bulk_flower_id;
  END IF;

  IF v_bulk_smalls_id IS NOT NULL THEN
    UPDATE inventory_items
    SET product_stage_id = v_trimmed_id
    WHERE product_stage_id = v_bulk_smalls_id;
  END IF;

  IF v_bucked_flower_id IS NOT NULL THEN
    UPDATE inventory_items
    SET product_stage_id = v_bucked_id
    WHERE product_stage_id = v_bucked_flower_id;
  END IF;

  IF v_bucked_smalls_id IS NOT NULL THEN
    UPDATE inventory_items
    SET product_stage_id = v_bucked_id
    WHERE product_stage_id = v_bucked_smalls_id;
  END IF;

  -- =====================================================
  -- STEP 7: Delete old granular stages
  -- =====================================================

  DELETE FROM product_stages WHERE name IN (
    'Bulk',
    'BulkFlower',
    'BulkSmalls',
    'BuckedFlower',
    'BuckedSmalls',
    'Packaged_14gSmalls',
    'Packaged_3_5g',
    'Trim',
    'Waste'
  );

  RAISE NOTICE 'Deleted old granular stages';

END $$;

-- =====================================================
-- STEP 8: Re-enable validation trigger
-- =====================================================

CREATE TRIGGER validate_product_stage_type
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION validate_product_stage_type_alignment();

COMMENT ON TABLE product_stages IS
'Canonical processing stages: Binned → Bucked → Trimmed → Packaged
Product types (bulk_flower, bulk_smalls, etc.) handle material classification.
Stage represents WHERE in the processing flow, Type represents WHAT is being processed.';
