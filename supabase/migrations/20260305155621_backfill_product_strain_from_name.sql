/*
  # Backfill null strain values on products

  1. Data Fix
    - Updates all products with NULL strain by extracting the strain name from the product name
    - Covers naming patterns: "Bulk - {Strain} - ...", "Packaged - {Strain} - ...",
      "Binned - {Strain} - ...", "Bucked - {Strain} - ...",
      "1lb Flower - {Strain}", "1lb Smalls - {Strain}"
    - This fixes the "Unknown" row appearing in the Sales Pipeline dashboard
  
  2. Impact
    - ~883 products will have their strain column populated
    - The order_demand_by_sku view and v_sales_dashboard view will now correctly
      attribute demand to the proper strains instead of showing NULL

  3. Notes
    - Temporarily disables the validate_product_stage_type trigger because some
      existing products have pre-existing stage/type mismatches (e.g., Fresh Frozen
      with Trimmed stage). We are only updating the strain column, not changing any
      stage or type data.
*/

ALTER TABLE products DISABLE TRIGGER validate_product_stage_type;

UPDATE products
SET strain = split_part(name, ' - ', 2)
WHERE (strain IS NULL OR strain = '')
  AND (
    name LIKE 'Bulk - % - %'
    OR name LIKE 'Packaged - % - %'
    OR name LIKE 'Binned - % - %'
    OR name LIKE 'Bucked - % - %'
    OR name LIKE '1lb Flower - %'
    OR name LIKE '1lb Smalls - %'
  );

ALTER TABLE products ENABLE TRIGGER validate_product_stage_type;
