/*
  # Make sales_inventory_summary view case-insensitive for status

  ## Problem
  The sales_inventory_summary view uses an exact match `status = 'available'`.
  If any code path writes 'Available' (or another casing variant), those items
  become invisible in all sales/pipeline reporting.

  ## Changes
  - Recreate the view with `LOWER(status) = 'available'` as a defensive safety net
  - All other logic remains identical

  ## Security
  - No changes to RLS policies (view inherits from underlying tables)
*/

CREATE OR REPLACE VIEW sales_inventory_summary AS
SELECT
  ii.strain,
  ii.category,
  COALESCE(qg.code, 'UNDEFINED') AS grade_code,
  COALESCE(qg.color_class, 'gray') AS grade_color,
  ps.name AS stage_name,
  ps.sort_order AS stage_sort,
  CASE
    WHEN ii.category IN ('flower_bulk', 'smalls_bulk', 'flower_packaged') THEN 'sellable'
    WHEN ii.category = 'trim_bulk' THEN 'byproduct'
    ELSE 'pipeline'
  END AS display_group,
  CASE
    WHEN ii.category = 'flower_bulk' THEN 'Trimmed Flower'
    WHEN ii.category = 'smalls_bulk' THEN 'Trimmed Smalls'
    WHEN ii.category = 'flower_packaged' THEN 'Packaged Flower'
    WHEN ii.category = 'trim_bulk' THEN 'Trim (Byproduct)'
    WHEN ii.category = 'flower_binned' THEN 'Binned Flower'
    WHEN ii.category = 'binned' THEN 'Binned (Other)'
    WHEN ii.category = 'flower_bucked' THEN 'Bucked Flower'
    WHEN ii.category = 'smalls_bucked' THEN 'Bucked Smalls'
    ELSE ii.category
  END AS display_label,
  CASE
    WHEN ii.category IN ('flower_bulk', 'smalls_bulk', 'flower_packaged') THEN 1
    WHEN ii.category = 'trim_bulk' THEN 3
    ELSE 2
  END AS display_group_sort,
  count(*) AS item_count,
  sum(ii.available_qty) AS available_qty,
  sum(ii.on_hand_qty) AS on_hand_qty,
  sum(ii.reserved_qty) AS reserved_qty
FROM inventory_items ii
  LEFT JOIN quality_grades qg ON ii.quality_grade_id = qg.id
  LEFT JOIN product_stages ps ON ii.product_stage_id = ps.id
WHERE ii.test_mode = false AND LOWER(ii.status) = 'available'
GROUP BY ii.strain, ii.category, qg.code, qg.color_class, ps.name, ps.sort_order;
