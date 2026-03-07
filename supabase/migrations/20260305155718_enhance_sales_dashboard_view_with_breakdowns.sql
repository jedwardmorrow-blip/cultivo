/*
  # Enhance v_sales_dashboard view with inventory breakdowns

  1. Changes
    - Drops and recreates v_sales_dashboard with additional breakdown columns:
      - `sellable_flower_grams`: trimmed flower (flower_bulk category)
      - `sellable_smalls_grams`: trimmed smalls (smalls_bulk category)
      - `pipeline_binned_grams`: binned inventory (flower_binned + binned categories)
      - `pipeline_bucked_grams`: bucked inventory (flower_bucked + smalls_bucked categories)
    - All existing columns retained with same semantics

  2. Purpose
    - The Sales Pipeline UI needs flower vs. smalls and binned vs. bucked breakdowns
    - Previously required 4 separate queries; now a single view provides everything
    - Health status and grade are still computed server-side in the view

  3. Security
    - No changes to RLS policies (view inherits from underlying tables)
*/

DROP VIEW IF EXISTS v_sales_dashboard;

CREATE VIEW v_sales_dashboard AS
WITH inventory_agg AS (
  SELECT
    strain,
    COALESCE(min(CASE WHEN grade_code <> 'UNDEFINED' THEN grade_code ELSE NULL END), 'UNDEFINED') AS grade_code,
    COALESCE(min(CASE WHEN grade_code <> 'UNDEFINED' THEN grade_color ELSE NULL END), 'gray') AS grade_color,
    COALESCE(sum(CASE WHEN display_group = 'sellable' AND stage_name <> 'Packaged' THEN available_qty ELSE 0 END), 0) AS sellable_grams,
    COALESCE(sum(CASE WHEN category = 'flower_bulk' THEN available_qty ELSE 0 END), 0) AS sellable_flower_grams,
    COALESCE(sum(CASE WHEN category = 'smalls_bulk' THEN available_qty ELSE 0 END), 0) AS sellable_smalls_grams,
    COALESCE(sum(CASE WHEN display_group = 'sellable' AND stage_name = 'Packaged' THEN item_count ELSE 0 END)::int, 0) AS packaged_units,
    COALESCE(sum(CASE WHEN display_group = 'pipeline' THEN available_qty ELSE 0 END), 0) AS pipeline_grams,
    COALESCE(sum(CASE WHEN category IN ('flower_binned', 'binned') THEN available_qty ELSE 0 END), 0) AS pipeline_binned_grams,
    COALESCE(sum(CASE WHEN category IN ('flower_bucked', 'smalls_bucked') THEN available_qty ELSE 0 END), 0) AS pipeline_bucked_grams,
    COALESCE(sum(CASE WHEN display_group = 'byproduct' THEN available_qty ELSE 0 END), 0) AS byproduct_grams,
    COALESCE(sum(CASE WHEN display_group = 'sellable' THEN available_qty ELSE 0 END), 0) AS total_sellable
  FROM sales_inventory_summary
  WHERE strain IS NOT NULL
  GROUP BY strain
),
demand_agg AS (
  SELECT
    strain,
    sum(order_count) AS total_orders,
    sum(total_units_needed) AS total_units_demanded,
    sum(total_value) AS total_demand_value
  FROM order_demand_by_sku
  WHERE strain IS NOT NULL
  GROUP BY strain
),
combined AS (
  SELECT
    COALESCE(i.strain, d.strain) AS strain,
    COALESCE(i.grade_code, 'UNDEFINED') AS grade_code,
    COALESCE(i.grade_color, 'gray') AS grade_color,
    COALESCE(i.sellable_grams, 0) AS sellable_grams,
    COALESCE(i.sellable_flower_grams, 0) AS sellable_flower_grams,
    COALESCE(i.sellable_smalls_grams, 0) AS sellable_smalls_grams,
    COALESCE(i.packaged_units, 0) AS packaged_units,
    COALESCE(i.pipeline_grams, 0) AS pipeline_grams,
    COALESCE(i.pipeline_binned_grams, 0) AS pipeline_binned_grams,
    COALESCE(i.pipeline_bucked_grams, 0) AS pipeline_bucked_grams,
    COALESCE(i.byproduct_grams, 0) AS byproduct_grams,
    COALESCE(i.total_sellable, 0) AS total_sellable,
    COALESCE(d.total_orders, 0) AS demand_orders,
    COALESCE(d.total_units_demanded, 0) AS demand_units,
    COALESCE(d.total_demand_value, 0) AS demand_value
  FROM inventory_agg i
  FULL JOIN demand_agg d ON i.strain = d.strain
)
SELECT
  strain,
  grade_code,
  grade_color,
  sellable_grams,
  sellable_flower_grams,
  sellable_smalls_grams,
  packaged_units,
  pipeline_grams,
  pipeline_binned_grams,
  pipeline_bucked_grams,
  byproduct_grams,
  total_sellable,
  demand_orders,
  demand_units,
  demand_value,
  CASE
    WHEN demand_value > 0 AND total_sellable = 0 AND pipeline_grams = 0 THEN 'critical'
    WHEN demand_value > 0 AND total_sellable < 500 THEN 'low'
    WHEN demand_value > 0 AND total_sellable < 2000 AND pipeline_grams < 2000 THEN 'warning'
    WHEN demand_value > 0 THEN 'healthy'
    WHEN total_sellable >= 500 THEN 'healthy'
    WHEN total_sellable >= 100 AND pipeline_grams >= 2000 THEN 'warning'
    ELSE 'low'
  END AS health_status,
  CASE
    WHEN demand_value > 0 AND total_sellable = 0 AND pipeline_grams = 0 THEN 1
    WHEN demand_value > 0 AND total_sellable < 500 THEN 2
    WHEN demand_value > 0 AND total_sellable < 2000 AND pipeline_grams < 2000 THEN 3
    WHEN demand_value > 0 THEN 4
    WHEN total_sellable >= 500 THEN 4
    WHEN total_sellable >= 100 AND pipeline_grams >= 2000 THEN 3
    ELSE 2
  END AS health_sort
FROM combined
WHERE total_sellable >= 50 OR demand_value > 0
ORDER BY
  CASE
    WHEN demand_value > 0 AND total_sellable = 0 AND pipeline_grams = 0 THEN 1
    WHEN demand_value > 0 AND total_sellable < 500 THEN 2
    WHEN demand_value > 0 AND total_sellable < 2000 AND pipeline_grams < 2000 THEN 3
    WHEN demand_value > 0 THEN 4
    WHEN total_sellable >= 500 THEN 4
    WHEN total_sellable >= 100 AND pipeline_grams >= 2000 THEN 3
    ELSE 2
  END,
  demand_value DESC,
  strain;
