-- Production Queue Views (v3)
-- Rebuilt v_production_queue_by_strain with inventory pipeline breakdown
-- v_production_queue_strain_summary and v_production_queue_by_order unchanged
--
-- Changes from v2 → v3 on v_production_queue_by_strain:
--   - Removed: strain_available_g, strain_available_lbs
--   - Added:   ready_flower_g, ready_smalls_g, ready_trim_g, ready_lbs,
--              pipeline_bucked_g, pipeline_binned_g, pipeline_lbs,
--              already_packaged_units, already_packaged_g
--   - stock_status values changed: 'available' → 'ready', 'partial' → 'needs_processing'

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. v_production_queue_by_strain (v3)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_production_queue_by_strain AS
WITH format_info AS (
  SELECT
    oi.id AS order_item_id,
    oi.order_id,
    oi.product_id,
    oi.quantity,
    oi.strain_id,
    oi.strain AS strain_name_legacy,
    oi.demand_unit,
    oi.status AS item_status,
    COALESCE(
      pt.name,
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
      WHEN p.type = 'fresh_frozen' THEN 1
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
),

pipeline_by_strain AS (
  SELECT
    strain_id,
    SUM(CASE WHEN category = 'flower_bulk' THEN available_qty ELSE 0 END) AS bulk_flower_g,
    SUM(CASE WHEN category = 'smalls_bulk' THEN available_qty ELSE 0 END) AS bulk_smalls_g,
    SUM(CASE WHEN category = 'trim_bulk' THEN available_qty ELSE 0 END) AS trim_g,
    SUM(CASE WHEN category IN ('flower_bucked', 'smalls_bucked') THEN available_qty ELSE 0 END) AS bucked_g,
    SUM(CASE WHEN category = 'flower_binned' THEN available_qty ELSE 0 END) AS binned_g
  FROM inventory_items
  WHERE status = 'available'
    AND available_qty > 0
    AND strain_id IS NOT NULL
    AND unit = 'g'
    AND category IN ('flower_bulk', 'smalls_bulk', 'trim_bulk', 'flower_bucked', 'smalls_bucked', 'flower_binned')
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
  SUM(fi.quantity) AS total_units_needed,
  SUM(fi.quantity * fi.weight_per_unit_g) AS total_demand_g,
  ROUND(SUM(fi.quantity * fi.weight_per_unit_g) / 454.0, 2) AS total_demand_lbs,
  COUNT(DISTINCT fi.order_id) AS order_count,

  -- Ready inventory (bulk, available for packaging)
  COALESCE(pip.bulk_flower_g, 0) AS ready_flower_g,
  COALESCE(pip.bulk_smalls_g, 0) AS ready_smalls_g,
  COALESCE(pip.trim_g, 0) AS ready_trim_g,
  ROUND(COALESCE(pip.bulk_flower_g + pip.bulk_smalls_g, 0) / 454.0, 2) AS ready_lbs,

  -- Pipeline inventory (needs processing before packaging)
  COALESCE(pip.bucked_g, 0) AS pipeline_bucked_g,
  COALESCE(pip.binned_g, 0) AS pipeline_binned_g,
  ROUND(COALESCE(pip.bucked_g + pip.binned_g, 0) / 454.0, 2) AS pipeline_lbs,

  -- Already packaged
  COALESCE(pkg.packaged_units, 0) AS already_packaged_units,
  COALESCE(pkg.packaged_g, 0) AS already_packaged_g,

  -- Stock status (v3 values: no_stock, needs_processing, ready)
  CASE
    WHEN (COALESCE(pip.bulk_flower_g, 0) + COALESCE(pip.bulk_smalls_g, 0) + COALESCE(pip.trim_g, 0)) = 0
     AND (COALESCE(pip.bucked_g, 0) + COALESCE(pip.binned_g, 0)) = 0
    THEN 'no_stock'
    WHEN (COALESCE(pip.bulk_flower_g, 0) + COALESCE(pip.bulk_smalls_g, 0) + COALESCE(pip.trim_g, 0))
         < SUM(fi.quantity * fi.weight_per_unit_g)
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
WHERE o.status NOT IN ('completed', 'cancelled', 'ready_for_delivery')
  AND o.archived = false
  AND o.test_mode = false
GROUP BY
  fi.strain_id, s.name, fi.format_label, fi.demand_unit, fi.weight_per_unit_g,
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
  SUM(fi.quantity * fi.weight_per_unit_g) DESC;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. v_production_queue_strain_summary (unchanged — still v2)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_production_queue_strain_summary AS
WITH demand AS (
  SELECT
    oi.strain_id,
    COALESCE(s.name, MAX(oi.strain), 'Unknown') AS strain_name,
    SUM(oi.quantity * COALESCE(NULLIF(p.net_weight, 0), pt.base_weight, 0)) AS total_demand_g,
    COUNT(DISTINCT oi.order_id) AS order_count,
    COUNT(oi.id) AS line_item_count,
    MIN(o.requested_delivery_date) AS earliest_delivery
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN products p ON p.id = oi.product_id
  LEFT JOIN product_types pt ON pt.id = p.type_id
  LEFT JOIN strains s ON s.id = oi.strain_id
  WHERE o.status NOT IN ('completed', 'cancelled', 'ready_for_delivery')
    AND o.archived = false
    AND o.test_mode = false
  GROUP BY oi.strain_id, s.name
),

inventory AS (
  SELECT
    strain_id,
    SUM(available_qty) AS available_g
  FROM inventory_items
  WHERE status = 'available'
    AND available_qty > 0
    AND strain_id IS NOT NULL
  GROUP BY strain_id
)

SELECT
  d.strain_id,
  d.strain_name,
  d.total_demand_g,
  ROUND(d.total_demand_g / 454.0, 2) AS total_demand_lbs,
  COALESCE(i.available_g, 0) AS available_g,
  ROUND(COALESCE(i.available_g, 0) / 454.0, 2) AS available_lbs,
  CASE
    WHEN COALESCE(i.available_g, 0) = 0 THEN 0
    ELSE ROUND(LEAST(COALESCE(i.available_g, 0) / NULLIF(d.total_demand_g, 0) * 100, 100), 1)
  END AS fill_rate_pct,
  d.order_count,
  d.line_item_count,
  d.earliest_delivery,
  CASE
    WHEN d.earliest_delivery <= CURRENT_DATE THEN 'overdue'
    WHEN d.earliest_delivery <= CURRENT_DATE + INTERVAL '2 days' THEN 'urgent'
    WHEN d.earliest_delivery <= CURRENT_DATE + INTERVAL '7 days' THEN 'soon'
    WHEN d.earliest_delivery IS NULL THEN 'no_date'
    ELSE 'normal'
  END AS urgency,
  CASE
    WHEN COALESCE(i.available_g, 0) = 0 THEN 'no_stock'
    WHEN COALESCE(i.available_g, 0) < d.total_demand_g THEN 'partial'
    ELSE 'can_fill'
  END AS stock_status
FROM demand d
LEFT JOIN inventory i ON i.strain_id = d.strain_id
ORDER BY
  CASE
    WHEN d.earliest_delivery <= CURRENT_DATE THEN 1
    WHEN d.earliest_delivery <= CURRENT_DATE + INTERVAL '2 days' THEN 2
    WHEN d.earliest_delivery <= CURRENT_DATE + INTERVAL '7 days' THEN 3
    WHEN d.earliest_delivery IS NULL THEN 5
    ELSE 4
  END,
  d.total_demand_g DESC;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. v_production_queue_by_order (unchanged)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_production_queue_by_order AS
SELECT
  o.id AS order_id,
  o.order_number,
  o.status AS order_status,
  o.requested_delivery_date,
  o.scheduled_delivery_date,
  o.is_sample,
  c.name AS customer_name,
  c.id AS customer_id,
  oi.id AS order_item_id,
  oi.quantity,
  oi.unit_price,
  oi.subtotal,
  oi.demand_unit,
  oi.status AS item_status,
  oi.strain_id,
  COALESCE(s.name, oi.strain, 'Unknown Strain') AS strain_name,
  COALESCE(
    pt.name,
    CASE
      WHEN p.net_weight = 3.5 THEN '3.5g Flower'
      WHEN p.net_weight = 14 AND p.type ~~* '%small%' THEN '14g Smalls'
      WHEN p.net_weight = 14 THEN '14g Flower'
      WHEN p.net_weight = 454 THEN '1lb Bag'
      WHEN p.net_weight = 1 AND p.type ~~* '%pre%roll%' THEN '1g Preroll'
      ELSE COALESCE(p.net_weight::text || 'g ' || COALESCE(p.type, ''), 'Unknown')
    END
  ) AS format_label,
  COALESCE(NULLIF(p.net_weight, 0), pt.base_weight, 0) AS weight_per_unit_g,
  oi.quantity * COALESCE(NULLIF(p.net_weight, 0), pt.base_weight, 0) AS line_demand_g,
  p.id AS product_id,
  p.name AS product_name,
  CASE
    WHEN p.type = 'fresh_frozen' THEN 'Fresh Frozen'
    WHEN p.type ~~* '%pre%roll%' THEN 'Preroll'
    WHEN p.type = 'trim' THEN 'Trim'
    WHEN p.type ~~* '%small%' THEN 'Smalls'
    ELSE 'Flower'
  END AS product_category,
  CASE
    WHEN o.requested_delivery_date <= CURRENT_DATE THEN 'overdue'
    WHEN o.requested_delivery_date <= CURRENT_DATE + INTERVAL '2 days' THEN 'urgent'
    WHEN o.requested_delivery_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'soon'
    WHEN o.requested_delivery_date IS NULL THEN 'no_date'
    ELSE 'normal'
  END AS urgency,
  o.delivery_notes,
  br.batch_number,
  br.lifecycle_state AS batch_lifecycle_state,
  br.status AS batch_status,
  br.is_quarantined AS batch_quarantined,
  br.harvest_date AS batch_harvest_date,
  qg.label AS batch_quality_grade,
  qg.code AS batch_grade_code,
  qg.color_class AS batch_grade_color,
  CASE
    WHEN br.id IS NULL THEN NULL
    WHEN br.lifecycle_state = 'packaged' THEN 'Packaged'
    WHEN br.packaging_started_at IS NOT NULL THEN 'Packaging'
    WHEN br.trimming_started_at IS NOT NULL THEN 'Trimming'
    WHEN br.bucking_started_at IS NOT NULL THEN 'Bucking'
    WHEN br.lifecycle_state = 'bulk_available' THEN 'Bulk Available'
    WHEN br.lifecycle_state = 'bucked' THEN 'Bucked'
    WHEN br.lifecycle_state = 'pre_harvest' THEN 'Pre-Harvest'
    WHEN br.lifecycle_state = 'created' THEN 'Created'
    ELSE br.lifecycle_state
  END AS batch_stage_label
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN products p ON p.id = oi.product_id
LEFT JOIN product_types pt ON pt.id = p.type_id
LEFT JOIN strains s ON s.id = oi.strain_id
LEFT JOIN customers c ON c.id = o.customer_id
LEFT JOIN batch_registry br ON br.id = oi.batch_id
LEFT JOIN quality_grades qg ON qg.id = br.quality_grade_id
WHERE o.status NOT IN ('completed', 'cancelled', 'ready_for_delivery')
  AND o.archived = false
  AND o.test_mode = false
ORDER BY
  CASE
    WHEN o.requested_delivery_date <= CURRENT_DATE THEN 1
    WHEN o.requested_delivery_date <= CURRENT_DATE + INTERVAL '2 days' THEN 2
    WHEN o.requested_delivery_date <= CURRENT_DATE + INTERVAL '7 days' THEN 3
    WHEN o.requested_delivery_date IS NULL THEN 5
    ELSE 4
  END,
  o.requested_delivery_date,
  s.name,
  oi.quantity DESC;
