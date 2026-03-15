-- v4: Production Queue View - Assignment-Aware Demand
-- Subtracts package_assignments from demand so the queue shows
-- remaining unfulfilled need. Fully assigned line items drop off entirely.
-- New columns: total_units_ordered, total_units_assigned
-- total_units_needed now reflects remaining (ordered - assigned)

DROP VIEW IF EXISTS v_production_queue_by_strain;

CREATE VIEW v_production_queue_by_strain AS
WITH assigned_totals AS (
  SELECT pa.order_item_id,
         SUM(pa.quantity_assigned) AS total_assigned
  FROM package_assignments pa
  WHERE pa.status IN ('active', 'fulfilled')
  GROUP BY pa.order_item_id
),
format_info AS (
  SELECT
    oi.id AS order_item_id,
    oi.order_id,
    oi.product_id,
    oi.quantity,
    COALESCE(at.total_assigned, 0) AS assigned_qty,
    GREATEST(oi.quantity - COALESCE(at.total_assigned, 0), 0) AS remaining_qty,
    oi.strain_id,
    oi.strain AS strain_name_legacy,
    oi.demand_unit,
    oi.status AS item_status,
    COALESCE(pt.name,
      CASE
        WHEN p.net_weight = 3.5 THEN '3.5g Flower'
        WHEN p.net_weight = 14 AND p.type ~~* '%small%' THEN '14g Smalls'
        WHEN p.net_weight = 14 THEN '14g Flower'
        WHEN p.net_weight = 454 AND p.type <> 'fresh_frozen' THEN '1lb Bag'
        WHEN p.net_weight = 1 AND p.type ~~* '%pre%roll%' THEN '1g Preroll'
        WHEN p.type = 'fresh_frozen' THEN 'Fresh Frozen (bulk g)'
        ELSE COALESCE(p.net_weight::text || 'g ' || COALESCE(p.type, ''), 'Unknown')
      END
    ) AS format_label,
    CASE
      WHEN p.type = 'fresh_frozen' THEN 1::numeric
      ELSE COALESCE(NULLIF(p.net_weight, 0), pt.base_weight, 0)
    END AS weight_per_unit_g,
    CASE
      WHEN p.type = 'fresh_frozen' THEN 'Fresh Frozen'
      WHEN p.type ~~* '%pre%roll%' THEN 'Preroll'
      WHEN p.type = 'trim' THEN 'Trim'
      WHEN p.type ~~* '%small%' THEN 'Smalls'
      ELSE 'Flower'
    END AS product_category
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
  LEFT JOIN product_types pt ON pt.id = p.type_id
  LEFT JOIN assigned_totals at ON at.order_item_id = oi.id
),
pipeline_by_strain AS (
  SELECT
    inventory_items.strain_id,
    SUM(CASE WHEN category = 'flower_bulk' THEN available_qty ELSE 0 END) AS bulk_flower_g,
    SUM(CASE WHEN category = 'smalls_bulk' THEN available_qty ELSE 0 END) AS bulk_smalls_g,
    SUM(CASE WHEN category = 'trim_bulk' THEN available_qty ELSE 0 END) AS trim_g,
    SUM(CASE WHEN category IN ('flower_bucked','smalls_bucked') THEN available_qty ELSE 0 END) AS bucked_g,
    SUM(CASE WHEN category = 'flower_binned' THEN available_qty ELSE 0 END) AS binned_g
  FROM inventory_items
  WHERE status = 'available'
    AND available_qty > 0
    AND strain_id IS NOT NULL
    AND unit = 'g'
    AND category IN ('flower_bulk','smalls_bulk','trim_bulk','flower_bucked','smalls_bucked','flower_binned')
  GROUP BY strain_id
),
packaged_by_strain AS (
  SELECT
    strain_id,
    SUM(available_qty) AS packaged_units,
    SUM(net_weight) AS packaged_g
  FROM inventory_items
  WHERE status = 'available'
    AND available_qty > 0
    AND strain_id IS NOT NULL
    AND unit = 'unit'
    AND category = 'flower_packaged'
  GROUP BY strain_id
)
SELECT
  fi.strain_id,
  COALESCE(s.name, MAX(fi.strain_name_legacy), 'Unknown Strain') AS strain_name,
  fi.format_label,
  fi.demand_unit,
  fi.weight_per_unit_g,
  fi.product_category,
  SUM(fi.quantity) AS total_units_ordered,
  SUM(fi.assigned_qty) AS total_units_assigned,
  SUM(fi.remaining_qty) AS total_units_needed,
  SUM(fi.remaining_qty * fi.weight_per_unit_g) AS total_demand_g,
  ROUND(SUM(fi.remaining_qty * fi.weight_per_unit_g) / 454.0, 2) AS total_demand_lbs,
  COUNT(DISTINCT fi.order_id) AS order_count,
  COALESCE(pip.bulk_flower_g, 0) AS ready_flower_g,
  COALESCE(pip.bulk_smalls_g, 0) AS ready_smalls_g,
  COALESCE(pip.trim_g, 0) AS ready_trim_g,
  ROUND(COALESCE(pip.bulk_flower_g + pip.bulk_smalls_g, 0) / 454.0, 2) AS ready_lbs,
  COALESCE(pip.bucked_g, 0) AS pipeline_bucked_g,
  COALESCE(pip.binned_g, 0) AS pipeline_binned_g,
  ROUND(COALESCE(pip.bucked_g + pip.binned_g, 0) / 454.0, 2) AS pipeline_lbs,
  COALESCE(pkg.packaged_units, 0) AS already_packaged_units,
  COALESCE(pkg.packaged_g, 0) AS already_packaged_g,
  CASE
    WHEN (COALESCE(pip.bulk_flower_g,0) + COALESCE(pip.bulk_smalls_g,0) + COALESCE(pip.trim_g,0)) = 0
     AND (COALESCE(pip.bucked_g,0) + COALESCE(pip.binned_g,0)) = 0
    THEN 'no_stock'
    WHEN (COALESCE(pip.bulk_flower_g,0) + COALESCE(pip.bulk_smalls_g,0) + COALESCE(pip.trim_g,0))
         < SUM(fi.remaining_qty * fi.weight_per_unit_g)
    THEN 'needs_processing'
    ELSE 'ready'
  END AS stock_status,
  MIN(o.requested_delivery_date) AS earliest_delivery_date,
  CASE
    WHEN MIN(o.requested_delivery_date) <= CURRENT_DATE THEN 'overdue'
    WHEN MIN(o.requested_delivery_date) <= CURRENT_DATE + INTERVAL '2 days' THEN 'urgent'
    WHEN MIN(o.requested_delivery_date) <= CURRENT_DATE + INTERVAL '7 days' THEN 'soon'
    WHEN MIN(o.requested_delivery_date) IS NULL THEN 'no_date'
    ELSE 'normal'
  END AS urgency
FROM format_info fi
JOIN orders o ON o.id = fi.order_id
LEFT JOIN strains s ON s.id = fi.strain_id
LEFT JOIN pipeline_by_strain pip ON pip.strain_id = fi.strain_id
LEFT JOIN packaged_by_strain pkg ON pkg.strain_id = fi.strain_id
WHERE o.status NOT IN ('completed','cancelled','ready_for_delivery')
  AND o.archived = false
  AND o.test_mode = false
  AND fi.remaining_qty > 0
GROUP BY fi.strain_id, s.name, fi.format_label, fi.demand_unit, fi.weight_per_unit_g,
         fi.product_category, pip.bulk_flower_g, pip.bulk_smalls_g, pip.trim_g,
         pip.bucked_g, pip.binned_g, pkg.packaged_units, pkg.packaged_g
ORDER BY
  CASE
    WHEN MIN(o.requested_delivery_date) <= CURRENT_DATE THEN 1
    WHEN MIN(o.requested_delivery_date) <= CURRENT_DATE + INTERVAL '2 days' THEN 2
    WHEN MIN(o.requested_delivery_date) <= CURRENT_DATE + INTERVAL '7 days' THEN 3
    WHEN MIN(o.requested_delivery_date) IS NULL THEN 5
    ELSE 4
  END,
  SUM(fi.remaining_qty * fi.weight_per_unit_g) DESC;
