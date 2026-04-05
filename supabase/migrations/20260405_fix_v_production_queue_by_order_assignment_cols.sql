-- HOTFIX: v_production_queue_by_order missing assignment columns
--
-- The Distribution → Execution Queue page (useProductionDispatch.ts) selects
-- units_assigned, units_remaining, and assignment_pct from v_production_queue_by_order,
-- but the view defined in 20260315_production_queue_views_v3.sql never included them.
-- This caused a runtime error on the Execution Queue: "column units_assigned does not exist".
--
-- The assignment-aware pattern was already proven in v_production_queue_by_strain
-- (migration 20260315_production_queue_view_v4_assignment_aware.sql) using a
-- `assigned_totals` CTE over package_assignments. This migration mirrors that
-- pattern on v_production_queue_by_order so both views stay consistent.
--
-- Columns added:
--   units_assigned         - SUM(package_assignments.quantity_assigned) per order_item
--   units_remaining        - oi.quantity - units_assigned (floored at 0)
--   assignment_pct         - units_assigned / oi.quantity * 100 (0-100)
--   assigned_package_ids   - ARRAY_AGG of package_ids assigned to the line item (nullable)

CREATE OR REPLACE VIEW v_production_queue_by_order AS
WITH assigned_totals AS (
  SELECT
    pa.order_item_id,
    SUM(pa.quantity_assigned) AS total_assigned,
    ARRAY_AGG(pa.package_id ORDER BY pa.assigned_at) FILTER (WHERE pa.package_id IS NOT NULL) AS package_ids
  FROM package_assignments pa
  WHERE pa.status IN ('active', 'fulfilled')
  GROUP BY pa.order_item_id
)
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
  END AS batch_stage_label,
  -- ── Assignment progress (NEW — mirrors v_production_queue_by_strain pattern) ──
  COALESCE(at.total_assigned, 0)::numeric AS units_assigned,
  GREATEST(oi.quantity - COALESCE(at.total_assigned, 0), 0)::numeric AS units_remaining,
  CASE
    WHEN oi.quantity > 0 THEN ROUND(LEAST(COALESCE(at.total_assigned, 0) / oi.quantity::numeric * 100, 100), 2)
    ELSE 0
  END AS assignment_pct,
  at.package_ids AS assigned_package_ids
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN products p ON p.id = oi.product_id
LEFT JOIN product_types pt ON pt.id = p.type_id
LEFT JOIN strains s ON s.id = oi.strain_id
LEFT JOIN customers c ON c.id = o.customer_id
LEFT JOIN batch_registry br ON br.id = oi.batch_id
LEFT JOIN quality_grades qg ON qg.id = br.quality_grade_id
LEFT JOIN assigned_totals at ON at.order_item_id = oi.id
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
