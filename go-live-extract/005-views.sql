-- ============================================================
-- Views
-- Source: https://fonreynkfeqywshijqpi.supabase.co
-- Extracted: 2026-03-02
-- Count: 70
-- ============================================================
-- View: active_packaging_sessions
CREATE OR REPLACE VIEW active_packaging_sessions AS\n SELECT id,
    session_date,
    packager_name,
    package_id,
    strain,
    batch_id,
    package_weight,
    pull_weight,
    ending_weight,
    units_3_5g,
    units_14g,
    units_454g,
    trim_grams,
    waste_grams,
    recorded_in_dutchie,
    notes,
    session_status,
    started_at,
    completed_at,
    minutes_packaged,
    units_per_hour,
    variance_grams,
    created_at,
    updated_at,
    (EXTRACT(epoch FROM (now() - started_at)) / (60)::numeric) AS minutes_elapsed
   FROM packaging_sessions ps
  WHERE (session_status = 'active'::text)
  ORDER BY started_at;

-- View: active_trim_sessions
CREATE OR REPLACE VIEW active_trim_sessions AS\n SELECT ts.id,
    ts.session_date,
    ts.trimmer_name,
    ts.package_id,
    ts.strain,
    ts.batch_id,
    ts.bucked_inventory_id,
    ts.package_total_weight,
    ts.pulled_weight,
    ts.time_started,
    ts.time_ended,
    ts.minutes_trimmed,
    ts.grams_per_hour,
    ts.big_buds_grams,
    ts.small_buds_grams,
    ts.trim_grams,
    ts.waste_grams,
    ts.variance_grams,
    ts.trim_method,
    ts.recorded_in_dutchie,
    ts.notes,
    ts.created_at,
    ts.updated_at,
    ts.session_status,
    ts.started_at,
    ts.completed_at,
    (EXTRACT(epoch FROM (now() - ts.started_at)) / (60)::numeric) AS minutes_elapsed,
    bi.current_weight_grams AS bucked_remaining
   FROM (trim_sessions ts
     LEFT JOIN bucked_inventory bi ON ((ts.bucked_inventory_id = bi.id)))
  WHERE (ts.session_status = 'active'::text)
  ORDER BY ts.started_at;

-- View: archived_products_report
CREATE OR REPLACE VIEW archived_products_report AS\n SELECT p.id,
    p.name,
    p.archived_at,
    p.archive_reason,
    pt.name AS product_type,
    ps.name AS stage,
    s.name AS strain,
    replacement.name AS replaced_by_product_name,
    replacement.id AS replaced_by_product_id
   FROM ((((products p
     LEFT JOIN product_types pt ON ((p.type_id = pt.id)))
     LEFT JOIN product_stages ps ON ((p.stage_id = ps.id)))
     LEFT JOIN strains s ON ((p.strain_id = s.id)))
     LEFT JOIN products replacement ON ((p.replaced_by_product_id = replacement.id)))
  WHERE (p.is_archived = true)
  ORDER BY p.archived_at DESC;

-- View: backend_bulk_inventory
CREATE OR REPLACE VIEW backend_bulk_inventory AS\n SELECT br.id AS batch_id,
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
   FROM (batch_registry br
     JOIN batch_stage_tracking bst ON ((br.id = bst.batch_id)))
  WHERE ((bst.stage = ANY (ARRAY['bucked'::text, 'bulk_flower'::text, 'bulk_smalls'::text, 'bulk_trim'::text])) AND (br.status = 'active'::text))
  ORDER BY br.strain, bst.stage, br.harvest_date DESC;

-- View: batch_allocation_overview
CREATE OR REPLACE VIEW batch_allocation_overview AS\n WITH batch_demand AS (
         SELECT batch_order_demand.batch_id,
            count(DISTINCT batch_order_demand.order_numbers) AS total_orders,
            sum(batch_order_demand.total_quantity_needed) FILTER (WHERE ((batch_order_demand.product_category = 'packaged'::text) AND (batch_order_demand.product_type = '8ths'::text))) AS eighths_needed,
            sum(batch_order_demand.total_quantity_needed) FILTER (WHERE ((batch_order_demand.product_category = 'packaged'::text) AND (batch_order_demand.product_type = 'halves'::text))) AS halves_needed,
            sum(batch_order_demand.total_quantity_needed) FILTER (WHERE (batch_order_demand.product_category = 'bulk'::text)) AS pounds_needed
           FROM batch_order_demand
          GROUP BY batch_order_demand.batch_id
        ), batch_capacity AS (
         SELECT batch_capacity_estimates.batch_id,
            batch_capacity_estimates.strain,
            batch_capacity_estimates.current_stage,
            batch_capacity_estimates.current_weight_grams,
            batch_capacity_estimates.estimated_final_weight_grams,
            COALESCE(max(batch_capacity_estimates.estimated_eighths_capacity), (0)::numeric) AS eighths_capacity,
            COALESCE(max(batch_capacity_estimates.estimated_halves_capacity), (0)::numeric) AS halves_capacity,
            COALESCE(max(batch_capacity_estimates.estimated_pounds_capacity), (0)::numeric) AS pounds_capacity
           FROM batch_capacity_estimates
          GROUP BY batch_capacity_estimates.batch_id, batch_capacity_estimates.strain, batch_capacity_estimates.current_stage, batch_capacity_estimates.current_weight_grams, batch_capacity_estimates.estimated_final_weight_grams
        )
 SELECT COALESCE(bc.batch_id, bd.batch_id) AS batch_id,
    bc.strain,
    bc.current_stage,
    bc.current_weight_grams,
    bc.estimated_final_weight_grams,
    COALESCE(bd.total_orders, (0)::bigint) AS orders_assigned,
    COALESCE(bd.eighths_needed, (0)::numeric) AS eighths_demand,
    COALESCE(bc.eighths_capacity, (0)::numeric) AS eighths_capacity,
    (COALESCE(bc.eighths_capacity, (0)::numeric) - COALESCE(bd.eighths_needed, (0)::numeric)) AS eighths_remaining,
        CASE
            WHEN (COALESCE(bc.eighths_capacity, (0)::numeric) > (0)::numeric) THEN round(((COALESCE(bd.eighths_needed, (0)::numeric) / bc.eighths_capacity) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS eighths_utilization_pct,
    COALESCE(bd.halves_needed, (0)::numeric) AS halves_demand,
    COALESCE(bc.halves_capacity, (0)::numeric) AS halves_capacity,
    (COALESCE(bc.halves_capacity, (0)::numeric) - COALESCE(bd.halves_needed, (0)::numeric)) AS halves_remaining,
        CASE
            WHEN (COALESCE(bc.halves_capacity, (0)::numeric) > (0)::numeric) THEN round(((COALESCE(bd.halves_needed, (0)::numeric) / bc.halves_capacity) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS halves_utilization_pct,
    COALESCE(bd.pounds_needed, (0)::numeric) AS pounds_demand,
    COALESCE(bc.pounds_capacity, (0)::numeric) AS pounds_capacity,
    (COALESCE(bc.pounds_capacity, (0)::numeric) - COALESCE(bd.pounds_needed, (0)::numeric)) AS pounds_remaining,
        CASE
            WHEN (COALESCE(bc.pounds_capacity, (0)::numeric) > (0)::numeric) THEN round(((COALESCE(bd.pounds_needed, (0)::numeric) / bc.pounds_capacity) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS pounds_utilization_pct,
        CASE
            WHEN ((COALESCE(bd.eighths_needed, (0)::numeric) > COALESCE(bc.eighths_capacity, (0)::numeric)) OR (COALESCE(bd.halves_needed, (0)::numeric) > COALESCE(bc.halves_capacity, (0)::numeric)) OR (COALESCE(bd.pounds_needed, (0)::numeric) > COALESCE(bc.pounds_capacity, (0)::numeric))) THEN 'over_allocated'::text
            WHEN (COALESCE(bd.total_orders, (0)::bigint) > 0) THEN 'allocated'::text
            ELSE 'available'::text
        END AS allocation_status
   FROM (batch_capacity bc
     FULL JOIN batch_demand bd ON ((bc.batch_id = bd.batch_id)))
  WHERE (COALESCE(bc.batch_id, bd.batch_id) IS NOT NULL);

-- View: batch_allocation_summary
CREATE OR REPLACE VIEW batch_allocation_summary AS\n SELECT br.id AS batch_id,
    br.batch_number,
    br.strain,
    br.harvest_date,
    br.status AS batch_status,
    br.coa_id,
        CASE
            WHEN (br.coa_id IS NOT NULL) THEN 'active'::text
            ELSE 'missing'::text
        END AS coa_status,
    bst_bucked.weight_grams AS bucked_weight,
    bst_bucked.allocated_weight_grams AS bucked_allocated,
    bst_bucked.available_weight_grams AS bucked_available,
    bst_flower.weight_grams AS flower_weight,
    bst_flower.allocated_weight_grams AS flower_allocated,
    bst_flower.available_weight_grams AS flower_available,
    bst_smalls.weight_grams AS smalls_weight,
    bst_smalls.allocated_weight_grams AS smalls_allocated,
    bst_smalls.available_weight_grams AS smalls_available,
    bst_packaged.weight_grams AS packaged_weight,
    bst_packaged.allocated_weight_grams AS packaged_allocated,
    bst_packaged.available_weight_grams AS packaged_available,
    (((COALESCE(bst_bucked.weight_grams, (0)::numeric) + COALESCE(bst_flower.weight_grams, (0)::numeric)) + COALESCE(bst_smalls.weight_grams, (0)::numeric)) + COALESCE(bst_packaged.weight_grams, (0)::numeric)) AS total_weight,
    (((COALESCE(bst_bucked.allocated_weight_grams, (0)::numeric) + COALESCE(bst_flower.allocated_weight_grams, (0)::numeric)) + COALESCE(bst_smalls.allocated_weight_grams, (0)::numeric)) + COALESCE(bst_packaged.allocated_weight_grams, (0)::numeric)) AS total_allocated,
        CASE
            WHEN ((((COALESCE(bst_bucked.weight_grams, (0)::numeric) + COALESCE(bst_flower.weight_grams, (0)::numeric)) + COALESCE(bst_smalls.weight_grams, (0)::numeric)) + COALESCE(bst_packaged.weight_grams, (0)::numeric)) > (0)::numeric) THEN round((((((COALESCE(bst_bucked.allocated_weight_grams, (0)::numeric) + COALESCE(bst_flower.allocated_weight_grams, (0)::numeric)) + COALESCE(bst_smalls.allocated_weight_grams, (0)::numeric)) + COALESCE(bst_packaged.allocated_weight_grams, (0)::numeric)) / (((COALESCE(bst_bucked.weight_grams, (0)::numeric) + COALESCE(bst_flower.weight_grams, (0)::numeric)) + COALESCE(bst_smalls.weight_grams, (0)::numeric)) + COALESCE(bst_packaged.weight_grams, (0)::numeric))) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS allocation_percentage,
    sm.over_allocation_warning_threshold,
    sm.over_allocation_critical_threshold,
    br.created_at,
    br.updated_at
   FROM (((((batch_registry br
     LEFT JOIN batch_stage_tracking bst_bucked ON (((br.id = bst_bucked.batch_id) AND (bst_bucked.stage = 'bucked'::text))))
     LEFT JOIN batch_stage_tracking bst_flower ON (((br.id = bst_flower.batch_id) AND (bst_flower.stage = 'bulk_flower'::text))))
     LEFT JOIN batch_stage_tracking bst_smalls ON (((br.id = bst_smalls.batch_id) AND (bst_smalls.stage = 'bulk_smalls'::text))))
     LEFT JOIN batch_stage_tracking bst_packaged ON (((br.id = bst_packaged.batch_id) AND (bst_packaged.stage = 'packaged'::text))))
     LEFT JOIN strain_metadata sm ON ((br.strain = sm.name)));

-- View: batch_capacity_estimates
CREATE OR REPLACE VIEW batch_capacity_estimates AS\n WITH batch_inventory AS (
         SELECT ii.batch_id,
            ii.strain,
            ii.product_name,
            sum(ii.available_qty) AS current_weight_grams
           FROM inventory_items ii
          WHERE (ii.batch_id IS NOT NULL)
          GROUP BY ii.batch_id, ii.strain, ii.product_name
        ), strain_conversions AS (
         SELECT strain_metadata.name AS strain,
            COALESCE(strain_metadata.avg_bucked_to_flower_ratio, 0.65) AS flower_ratio
           FROM strain_metadata
        )
 SELECT bi.batch_id,
    bi.strain,
    bi.product_name AS current_stage,
    bi.current_weight_grams,
        CASE
            WHEN ((bi.product_name ~~* '%8th%'::text) OR (bi.product_name ~~* '%3.5%'::text)) THEN bi.current_weight_grams
            WHEN ((bi.product_name ~~* '%half%'::text) OR (bi.product_name ~~* '%14%'::text)) THEN bi.current_weight_grams
            WHEN ((bi.product_name ~~* '%pound%'::text) OR (bi.product_name ~~* '%454%'::text)) THEN bi.current_weight_grams
            WHEN (bi.product_name ~~* '%bulk%flower%'::text) THEN bi.current_weight_grams
            WHEN (bi.product_name ~~* '%bulk%small%'::text) THEN bi.current_weight_grams
            WHEN (bi.product_name ~~* '%bucked%'::text) THEN (bi.current_weight_grams * COALESCE(sc.flower_ratio, 0.65))
            ELSE bi.current_weight_grams
        END AS estimated_final_weight_grams,
        CASE
            WHEN (bi.product_name ~~* '%bucked%'::text) THEN floor(((bi.current_weight_grams * COALESCE(sc.flower_ratio, 0.65)) / 3.5))
            WHEN (bi.product_name ~~* '%bulk%flower%'::text) THEN floor((bi.current_weight_grams / 3.5))
            ELSE NULL::numeric
        END AS estimated_eighths_capacity,
        CASE
            WHEN (bi.product_name ~~* '%bucked%'::text) THEN floor(((bi.current_weight_grams * COALESCE(sc.flower_ratio, 0.65)) / (14)::numeric))
            WHEN (bi.product_name ~~* '%bulk%flower%'::text) THEN floor((bi.current_weight_grams / (14)::numeric))
            ELSE NULL::numeric
        END AS estimated_halves_capacity,
        CASE
            WHEN (bi.product_name ~~* '%bucked%'::text) THEN floor(((bi.current_weight_grams * COALESCE(sc.flower_ratio, 0.65)) / (454)::numeric))
            WHEN (bi.product_name ~~* '%bulk%flower%'::text) THEN floor((bi.current_weight_grams / (454)::numeric))
            ELSE NULL::numeric
        END AS estimated_pounds_capacity
   FROM (batch_inventory bi
     LEFT JOIN strain_conversions sc ON ((bi.strain = sc.strain)));

-- View: batch_inventory_health
CREATE OR REPLACE VIEW batch_inventory_health AS\n SELECT 'orphaned_inventory'::text AS issue_type,
    ii.batch AS batch_number,
    ii.strain,
    count(*) AS package_count,
    sum(ii.available_qty) AS total_weight_grams,
    NULL::uuid AS batch_registry_id
   FROM (inventory_items ii
     LEFT JOIN batch_registry br ON ((br.batch_number = ii.batch)))
  WHERE ((ii.batch IS NOT NULL) AND (TRIM(BOTH FROM ii.batch) <> ''::text) AND (br.id IS NULL))
  GROUP BY ii.batch, ii.strain
UNION ALL
 SELECT 'depleted_batch'::text AS issue_type,
    br.batch_number,
    br.strain,
    0 AS package_count,
    0 AS total_weight_grams,
    br.id AS batch_registry_id
   FROM (batch_registry br
     LEFT JOIN inventory_items ii ON ((ii.batch = br.batch_number)))
  WHERE ((ii.id IS NULL) AND (br.status = 'active'::text));

-- View: batch_order_demand
CREATE OR REPLACE VIEW batch_order_demand AS\n SELECT oi.batch_id,
    p.name AS product_name,
    p.sku,
    p.strain,
    p.type AS product_type,
    p.product_category,
    count(DISTINCT oi.order_id) AS order_count,
    sum(oi.quantity) AS total_quantity_needed,
    array_agg(DISTINCT o.order_number ORDER BY o.order_number) AS order_numbers
   FROM ((order_items oi
     JOIN products p ON ((oi.product_id = p.id)))
     JOIN orders o ON ((oi.order_id = o.id)))
  WHERE ((oi.batch_id IS NOT NULL) AND (o.archived = false))
  GROUP BY oi.batch_id, p.name, p.sku, p.strain, p.type, p.product_category;

-- View: batch_selection_options
CREATE OR REPLACE VIEW batch_selection_options AS\n SELECT br.id AS batch_id,
    br.batch_number,
    br.strain,
    'available'::text AS current_stage,
    COALESCE(sum(bst.available_weight_grams), (0)::numeric) AS total_available_weight_grams,
    br.status,
    br.created_at,
    br.updated_at
   FROM (batch_registry br
     LEFT JOIN batch_stage_tracking bst ON ((bst.batch_id = br.id)))
  WHERE ((br.status = 'active'::text) AND ((br.is_quarantined IS NULL) OR (br.is_quarantined = false)))
  GROUP BY br.id, br.batch_number, br.strain, br.status, br.created_at, br.updated_at
 HAVING (COALESCE(sum(bst.available_weight_grams), (0)::numeric) > (0)::numeric)
  ORDER BY br.batch_number DESC;

-- View: batch_stage_allocation_status
CREATE OR REPLACE VIEW batch_stage_allocation_status AS\n SELECT bst.id,
    bst.batch_id,
    br.batch_number,
    br.strain,
    bst.stage,
    bst.weight_grams,
    bst.allocated_weight_grams,
    bst.available_weight_grams,
    bst.location,
        CASE
            WHEN (bst.weight_grams > (0)::numeric) THEN round(((bst.allocated_weight_grams / bst.weight_grams) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS stage_allocation_percentage,
        CASE
            WHEN (bst.allocated_weight_grams > bst.weight_grams) THEN true
            ELSE false
        END AS is_over_allocated,
        CASE
            WHEN (bst.allocated_weight_grams > bst.weight_grams) THEN (bst.allocated_weight_grams - bst.weight_grams)
            ELSE (0)::numeric
        END AS over_allocation_grams,
        CASE
            WHEN (bst.weight_grams > (0)::numeric) THEN
            CASE
                WHEN (((bst.allocated_weight_grams / bst.weight_grams) * (100)::numeric) >= sm.over_allocation_critical_threshold) THEN 'critical'::text
                WHEN (((bst.allocated_weight_grams / bst.weight_grams) * (100)::numeric) >= sm.over_allocation_warning_threshold) THEN 'warning'::text
                ELSE 'normal'::text
            END
            ELSE 'normal'::text
        END AS allocation_warning_level,
    sm.over_allocation_warning_threshold,
    sm.over_allocation_critical_threshold,
    bst.created_at,
    bst.updated_at
   FROM ((batch_stage_tracking bst
     JOIN batch_registry br ON ((bst.batch_id = br.id)))
     LEFT JOIN strain_metadata sm ON ((br.strain = sm.name)));

-- View: batch_stage_availability
CREATE OR REPLACE VIEW batch_stage_availability AS\n SELECT br.batch_number,
    br.strain,
    bst.stage,
    bst.weight_grams,
    bst.allocated_weight_grams,
    bst.available_weight_grams,
        CASE
            WHEN (bst.available_weight_grams > (0)::numeric) THEN 'available'::text
            WHEN (bst.weight_grams > (0)::numeric) THEN 'fully_allocated'::text
            ELSE 'empty'::text
        END AS availability_status,
    bst.location,
    bst.updated_at
   FROM (batch_registry br
     JOIN batch_stage_tracking bst ON ((bst.batch_id = br.id)))
  WHERE (br.status = 'active'::text)
  ORDER BY br.batch_number DESC, bst.stage;

-- View: batch_with_coa_status
CREATE OR REPLACE VIEW batch_with_coa_status AS\n SELECT br.id AS batch_id,
    br.batch_number,
    br.strain,
    br.harvest_date,
    br.room,
    br.initial_weight_grams,
    br.status AS batch_status,
    br.notes AS batch_notes,
    coa.id AS coa_id,
    coa.thc_percentage,
    coa.cbd_percentage,
    coa.total_cannabinoids_percentage,
    coa.total_terpenes_mg_g,
    coa.sample_date,
    coa.manufacture_date,
    coa.terpene_1_name,
    coa.terpene_1_value,
    coa.terpene_1_percentage,
    coa.terpene_2_name,
    coa.terpene_2_value,
    coa.terpene_2_percentage,
    coa.terpene_3_name,
    coa.terpene_3_value,
    coa.terpene_3_percentage,
    coa.pdf_file_path,
    coa.is_active AS coa_is_active,
        CASE
            WHEN ((coa.id IS NOT NULL) AND coa.is_active) THEN 'active'::text
            WHEN ((coa.id IS NOT NULL) AND (NOT coa.is_active)) THEN 'inactive'::text
            ELSE 'missing'::text
        END AS coa_status,
    br.created_at,
    br.updated_at
   FROM (batch_registry br
     LEFT JOIN certificates_of_analysis coa ON (((coa.batch_id = br.id) AND (coa.is_active = true))));

-- View: conversion_history_view
CREATE OR REPLACE VIEW conversion_history_view AS\n SELECT cp.id,
    cp.package_id,
    cp.batch_id,
    br.batch_number AS batch_name,
    br.strain_id,
    s.name AS strain_name,
    cp.product_id,
    p.name AS product_name,
    p.type AS product_type,
    ps.name AS stage_name,
    cp.weight,
    cp.units,
    cp.source_session_ids,
    cp.finalization_status,
    cp.created_at,
    cp.created_by,
    up_created.full_name AS created_by_name,
    cp.finalized_at,
    cp.finalized_by,
    up_finalized.full_name AS finalized_by_name,
    cp.packaged_at,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM inventory_items ii
              WHERE (ii.package_id = cp.package_id))) THEN true
            ELSE false
        END AS in_inventory
   FROM ((((((conversion_packages cp
     JOIN batch_registry br ON ((cp.batch_id = br.id)))
     LEFT JOIN strains s ON ((br.strain_id = s.id)))
     LEFT JOIN products p ON ((cp.product_id = p.id)))
     LEFT JOIN product_stages ps ON ((cp.inventory_stage_id = ps.id)))
     LEFT JOIN user_profiles up_created ON ((cp.created_by = up_created.id)))
     LEFT JOIN user_profiles up_finalized ON ((cp.finalized_by = up_finalized.id)))
  ORDER BY cp.created_at DESC;

-- View: conversion_packages_detail_view
CREATE OR REPLACE VIEW conversion_packages_detail_view AS\n SELECT cp.id AS package_record_id,
    cp.package_id,
    cp.conversion_lot_id,
    cp.weight,
    cp.units,
    cp.packaged_at,
    cp.created_at,
    cp.created_by,
    cp.batch_id,
    br.batch_number,
    s.name AS strain_name,
    s.abbreviation AS strain_code,
    cp.product_id,
    p.name AS product_name,
    p.product_category,
    ps.name AS stage_name,
    ii.id AS inventory_item_id,
    ii.on_hand_qty AS current_quantity,
    ii.status AS inventory_status,
    ii.last_updated AS last_movement_at,
    cp.source_session_ids,
    up.full_name AS created_by_name,
    up.email AS created_by_email
   FROM ((((((conversion_packages cp
     JOIN batch_registry br ON ((cp.batch_id = br.id)))
     JOIN strains s ON ((br.strain_id = s.id)))
     JOIN products p ON ((cp.product_id = p.id)))
     LEFT JOIN product_stages ps ON ((cp.inventory_stage_id = ps.id)))
     LEFT JOIN inventory_items ii ON ((ii.package_id = cp.package_id)))
     LEFT JOIN user_profiles up ON ((cp.created_by = up.id)))
  ORDER BY cp.created_at DESC;

-- View: conversion_summary_view
CREATE OR REPLACE VIEW conversion_summary_view AS\n WITH completed_sessions AS (
         SELECT ts.id AS session_id,
            'trim'::text AS session_type,
            ts.batch_registry_id AS batch_id,
            ts.strain_id,
            (COALESCE(ts.big_buds_grams, (0)::numeric) + COALESCE(ts.small_buds_grams, (0)::numeric)) AS output_weight,
            NULL::integer AS output_units,
            (ts.completed_at)::date AS session_date,
            ts.completed_at
           FROM trim_sessions ts
          WHERE ((ts.session_status = 'completed'::text) AND (ts.completed_at IS NOT NULL) AND (ts.batch_registry_id IS NOT NULL))
        UNION ALL
         SELECT ps.id AS session_id,
            'packaging'::text AS session_type,
            ps.batch_registry_id AS batch_id,
            ps.strain_id,
            NULL::numeric AS output_weight,
            ((COALESCE(ps.units_3_5g, 0) + COALESCE(ps.units_14g, 0)) + COALESCE(ps.units_454g, 0)) AS output_units,
            (ps.completed_at)::date AS session_date,
            ps.completed_at
           FROM packaging_sessions ps
          WHERE ((ps.session_status = 'completed'::text) AND (ps.completed_at IS NOT NULL) AND (ps.batch_registry_id IS NOT NULL))
        UNION ALL
         SELECT bs.id AS session_id,
            'bucking'::text AS session_type,
            bs.batch_registry_id AS batch_id,
            br_1.strain_id,
            (COALESCE(bs.bucked_flower_grams, (0)::numeric) + COALESCE(bs.bucked_smalls_grams, (0)::numeric)) AS output_weight,
            NULL::integer AS output_units,
            (bs.completed_at)::date AS session_date,
            bs.completed_at
           FROM (bucking_sessions bs
             JOIN batch_registry br_1 ON ((bs.batch_registry_id = br_1.id)))
          WHERE ((bs.session_status = 'completed'::text) AND (bs.completed_at IS NOT NULL) AND (bs.batch_registry_id IS NOT NULL))
        )
 SELECT cs.batch_id,
    br.batch_number AS batch_name,
    cs.strain_id,
    s.name AS strain_name,
    s.abbreviation AS strain_code,
    cs.session_type,
    cs.session_id,
    cs.session_date,
    cs.output_weight AS total_weight,
    cs.output_units AS total_units,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM conversion_packages cp
              WHERE (cp.source_session_ids @> jsonb_build_array((cs.session_id)::text)))) THEN true
            ELSE false
        END AS has_packages,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM conversion_packages cp
              WHERE ((cp.source_session_ids @> jsonb_build_array((cs.session_id)::text)) AND (cp.finalization_status = 'finalized'::finalization_status)))) THEN true
            ELSE false
        END AS is_finalized,
    COALESCE(( SELECT count(*) AS count
           FROM conversion_packages cp
          WHERE (cp.source_session_ids @> jsonb_build_array((cs.session_id)::text))), (0)::bigint) AS package_count,
    COALESCE(( SELECT count(*) AS count
           FROM conversion_packages cp
          WHERE ((cp.source_session_ids @> jsonb_build_array((cs.session_id)::text)) AND (cp.finalization_status = 'pending'::finalization_status))), (0)::bigint) AS pending_package_count,
    cs.completed_at
   FROM ((completed_sessions cs
     JOIN batch_registry br ON ((cs.batch_id = br.id)))
     LEFT JOIN strains s ON ((cs.strain_id = s.id)))
  WHERE (cs.strain_id IS NOT NULL)
  ORDER BY cs.completed_at DESC, s.name;

-- View: crm_account_scores
CREATE OR REPLACE VIEW crm_account_scores AS\n WITH order_stats AS (
         SELECT c.id AS customer_id,
            c.name AS customer_name,
            c.dispensary_code,
            count(o.id) FILTER (WHERE (o.order_date >= (CURRENT_DATE - '30 days'::interval))) AS orders_30d,
            count(o.id) FILTER (WHERE (o.order_date >= (CURRENT_DATE - '90 days'::interval))) AS orders_90d,
            max(o.order_date) AS last_order_date,
            COALESCE(sum(o.total_amount) FILTER (WHERE (o.order_date >= (CURRENT_DATE - '60 days'::interval))), (0)::numeric) AS revenue_recent_60d,
            COALESCE(sum(o.total_amount) FILTER (WHERE ((o.order_date >= (CURRENT_DATE - '120 days'::interval)) AND (o.order_date < (CURRENT_DATE - '60 days'::interval)))), (0)::numeric) AS revenue_prior_60d
           FROM (customers c
             LEFT JOIN orders o ON (((o.customer_id = c.id) AND (o.test_mode = false) AND (o.archived = false))))
          WHERE (c.account_status = ANY (ARRAY['active'::text, 'prospect'::text]))
          GROUP BY c.id, c.name, c.dispensary_code
        ), task_stats AS (
         SELECT crm_tasks.customer_id,
            count(*) FILTER (WHERE (crm_tasks.status = ANY (ARRAY['open'::text, 'in_progress'::text]))) AS open_task_count
           FROM crm_tasks
          GROUP BY crm_tasks.customer_id
        ), visit_stats AS (
         SELECT crm_visit_schedule.customer_id,
            max(crm_visit_schedule.visit_date) FILTER (WHERE (crm_visit_schedule.status = 'completed'::text)) AS last_visit_date
           FROM crm_visit_schedule
          GROUP BY crm_visit_schedule.customer_id
        ), engagement_stats AS (
         SELECT t.customer_id,
            count(*) FILTER (WHERE ((t.status = 'completed'::text) AND (t.completed_at >= (CURRENT_DATE - '30 days'::interval)))) AS tasks_completed_30d,
            COALESCE(v.visits_30d, (0)::bigint) AS visits_completed_30d
           FROM (crm_tasks t
             LEFT JOIN ( SELECT crm_visit_schedule.customer_id,
                    count(*) AS visits_30d
                   FROM crm_visit_schedule
                  WHERE ((crm_visit_schedule.status = 'completed'::text) AND (crm_visit_schedule.visit_date >= (CURRENT_DATE - '30 days'::interval)))
                  GROUP BY crm_visit_schedule.customer_id) v ON ((v.customer_id = t.customer_id)))
          GROUP BY t.customer_id, v.visits_30d
        ), scored AS (
         SELECT os.customer_id,
            os.customer_name,
            os.dispensary_code,
            (EXTRACT(day FROM ((CURRENT_DATE)::timestamp with time zone - os.last_order_date)))::integer AS days_since_last_order,
            (os.orders_30d)::integer AS order_frequency_30d,
            (os.orders_90d)::integer AS order_frequency_90d,
                CASE
                    WHEN (os.revenue_recent_60d > (os.revenue_prior_60d * 1.1)) THEN 'growing'::text
                    WHEN (os.revenue_recent_60d >= (os.revenue_prior_60d * 0.9)) THEN 'stable'::text
                    WHEN (os.revenue_recent_60d > (0)::numeric) THEN 'declining'::text
                    ELSE 'inactive'::text
                END AS revenue_trend,
            (COALESCE(ts.open_task_count, (0)::bigint))::integer AS open_task_count,
            vs.last_visit_date,
            LEAST((40)::numeric, GREATEST((0)::numeric,
                CASE
                    WHEN (os.last_order_date IS NULL) THEN (0)::numeric
                    ELSE (40.0 - ((EXTRACT(day FROM ((CURRENT_DATE)::timestamp with time zone - os.last_order_date)) * 40.0) / 60.0))
                END)) AS recency_score,
            LEAST((25)::numeric, GREATEST((0)::numeric, (((os.orders_90d)::numeric * 25.0) / 6.0))) AS frequency_score,
                CASE
                    WHEN (os.revenue_recent_60d > (os.revenue_prior_60d * 1.1)) THEN 20
                    WHEN (os.revenue_recent_60d >= (os.revenue_prior_60d * 0.9)) THEN 15
                    WHEN (os.revenue_recent_60d > (0)::numeric) THEN 5
                    ELSE 0
                END AS trend_score,
                CASE
                    WHEN ((COALESCE(es.tasks_completed_30d, (0)::bigint) + COALESCE(es.visits_completed_30d, (0)::bigint)) >= 2) THEN 15
                    WHEN ((COALESCE(es.tasks_completed_30d, (0)::bigint) + COALESCE(es.visits_completed_30d, (0)::bigint)) >= 1) THEN 10
                    WHEN ((EXISTS ( SELECT 1
                       FROM crm_tasks
                      WHERE (crm_tasks.customer_id = os.customer_id))) OR (EXISTS ( SELECT 1
                       FROM crm_visit_schedule
                      WHERE (crm_visit_schedule.customer_id = os.customer_id)))) THEN 5
                    ELSE 0
                END AS engagement_score
           FROM (((order_stats os
             LEFT JOIN task_stats ts ON ((ts.customer_id = os.customer_id)))
             LEFT JOIN visit_stats vs ON ((vs.customer_id = os.customer_id)))
             LEFT JOIN engagement_stats es ON ((es.customer_id = os.customer_id)))
        )
 SELECT customer_id,
    customer_name,
    dispensary_code,
    round((((recency_score + frequency_score) + (trend_score)::numeric) + (engagement_score)::numeric)) AS health_score,
        CASE
            WHEN (round((((recency_score + frequency_score) + (trend_score)::numeric) + (engagement_score)::numeric)) >= (75)::numeric) THEN 'healthy'::text
            WHEN (round((((recency_score + frequency_score) + (trend_score)::numeric) + (engagement_score)::numeric)) >= (50)::numeric) THEN 'cooling'::text
            WHEN (round((((recency_score + frequency_score) + (trend_score)::numeric) + (engagement_score)::numeric)) >= (25)::numeric) THEN 'at_risk'::text
            ELSE 'dormant'::text
        END AS health_label,
    days_since_last_order,
    order_frequency_30d,
    order_frequency_90d,
    revenue_trend,
    open_task_count,
    last_visit_date
   FROM scored;

-- View: crm_chain_location_performance
CREATE OR REPLACE VIEW crm_chain_location_performance AS\n WITH child_stats AS (
         SELECT ch.id AS child_id,
            ch.name AS child_name,
            ch.dispensary_code AS child_code,
            ch.parent_customer_id,
            ch.city,
            ch.state,
            ch.account_status,
            (count(o.id))::integer AS order_count,
            COALESCE(sum(o.total_amount), (0)::numeric) AS revenue,
            COALESCE(avg(o.total_amount), (0)::numeric) AS avg_order_value,
            max(o.order_date) AS last_order_date,
                CASE
                    WHEN (max(o.order_date) IS NOT NULL) THEN (EXTRACT(day FROM (now() - max(o.order_date))))::integer
                    ELSE NULL::integer
                END AS days_since_last_order
           FROM (customers ch
             LEFT JOIN orders o ON (((o.customer_id = ch.id) AND (o.test_mode = false) AND (o.archived = false))))
          WHERE ((ch.account_type = 'hub_child'::text) AND (ch.parent_customer_id IS NOT NULL))
          GROUP BY ch.id, ch.name, ch.dispensary_code, ch.parent_customer_id, ch.city, ch.state, ch.account_status
        ), parent_totals AS (
         SELECT child_stats.parent_customer_id,
            sum(child_stats.revenue) AS chain_total_revenue
           FROM child_stats
          GROUP BY child_stats.parent_customer_id
        )
 SELECT cs.child_id,
    cs.child_name,
    cs.child_code,
    cs.parent_customer_id,
    p.name AS parent_name,
    p.dispensary_code AS parent_code,
    p.delivery_model,
    cs.city,
    cs.state,
    cs.account_status,
    cs.order_count,
    cs.revenue,
    cs.avg_order_value,
    cs.last_order_date,
    cs.days_since_last_order,
        CASE
            WHEN (pt.chain_total_revenue > (0)::numeric) THEN round(((cs.revenue / pt.chain_total_revenue) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS revenue_share_pct,
        CASE
            WHEN (cs.days_since_last_order IS NULL) THEN 'no_orders'::text
            WHEN (cs.days_since_last_order <= 14) THEN 'healthy'::text
            WHEN (cs.days_since_last_order <= 30) THEN 'cooling'::text
            WHEN (cs.days_since_last_order <= 60) THEN 'at_risk'::text
            ELSE 'dormant'::text
        END AS health_label,
    row_number() OVER (PARTITION BY cs.parent_customer_id ORDER BY cs.revenue DESC) AS revenue_rank
   FROM ((child_stats cs
     JOIN customers p ON ((p.id = cs.parent_customer_id)))
     LEFT JOIN parent_totals pt ON ((pt.parent_customer_id = cs.parent_customer_id)))
  ORDER BY cs.parent_customer_id, cs.revenue DESC;

-- View: crm_customer_summary
CREATE OR REPLACE VIEW crm_customer_summary AS\n SELECT c.id,
    c.name,
    c.dispensary_code,
    c.account_type,
    c.account_status,
    c.parent_customer_id,
    c.delivery_model,
    c.city,
    c.state,
    c.tags,
    c.default_payment_terms,
    c.preferred_delivery_day,
    c.contact_name,
    c.email,
    c.phone,
    c.license_number,
    c.license_name,
    c.address,
    c.postal_code,
    c.delivery_address,
    c.delivery_city,
    c.delivery_state,
    c.delivery_postal_code,
    c.ato_number,
    c.credit_limit,
    c.account_credit_balance,
    c.notes,
    COALESCE(os.order_count, 0) AS order_count,
    COALESCE(os.total_revenue, (0)::numeric) AS total_revenue,
    COALESCE(os.avg_order_value, (0)::numeric) AS avg_order_value,
    os.first_order_date,
    os.last_order_date,
        CASE
            WHEN (os.last_order_date IS NOT NULL) THEN (EXTRACT(day FROM (now() - os.last_order_date)))::integer
            ELSE NULL::integer
        END AS days_since_last_order,
    COALESCE(os.completed_orders, 0) AS completed_orders,
    COALESCE(os.open_orders, 0) AS open_orders,
    COALESCE(os.open_order_value, (0)::numeric) AS open_order_value,
    COALESCE(cc.contact_count, 0) AS contact_count,
    ( SELECT count(*) AS count
           FROM customers ch
          WHERE (ch.parent_customer_id = c.id)) AS child_account_count,
    COALESCE(cs.child_total_revenue, (0)::numeric) AS child_total_revenue,
    COALESCE(cs.child_total_orders, 0) AS child_total_orders
   FROM (((customers c
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS order_count,
            sum(o.total_amount) AS total_revenue,
            avg(o.total_amount) AS avg_order_value,
            min(o.order_date) AS first_order_date,
            max(o.order_date) AS last_order_date,
            (count(*) FILTER (WHERE (o.status = 'completed'::text)))::integer AS completed_orders,
            (count(*) FILTER (WHERE ((o.status <> ALL (ARRAY['completed'::text, 'cancelled'::text])) AND (o.archived = false))))::integer AS open_orders,
            sum(o.total_amount) FILTER (WHERE ((o.status <> ALL (ARRAY['completed'::text, 'cancelled'::text])) AND (o.archived = false))) AS open_order_value
           FROM orders o
          WHERE ((o.customer_id = c.id) AND (o.test_mode = false))) os ON (true))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS contact_count
           FROM customer_contacts ct
          WHERE (ct.customer_id = c.id)) cc ON (true))
     LEFT JOIN LATERAL ( SELECT COALESCE(sum(child_o.total_amount), (0)::numeric) AS child_total_revenue,
            (count(child_o.id))::integer AS child_total_orders
           FROM (customers child
             JOIN orders child_o ON (((child_o.customer_id = child.id) AND (child_o.test_mode = false) AND (child_o.archived = false))))
          WHERE (child.parent_customer_id = c.id)) cs ON (true));

-- View: crm_monthly_revenue_by_customer
CREATE OR REPLACE VIEW crm_monthly_revenue_by_customer AS\n SELECT c.id AS customer_id,
    c.name AS customer_name,
    c.dispensary_code,
    (date_trunc('month'::text, o.order_date))::date AS month,
    (count(DISTINCT o.id))::integer AS order_count,
    sum(o.total_amount) AS monthly_revenue,
    sum(sum(o.total_amount)) OVER (PARTITION BY c.id ORDER BY (date_trunc('month'::text, o.order_date))) AS cumulative_revenue
   FROM (customers c
     JOIN orders o ON (((o.customer_id = c.id) AND (o.test_mode = false) AND (o.archived = false))))
  GROUP BY c.id, c.name, c.dispensary_code, (date_trunc('month'::text, o.order_date))
  ORDER BY c.name, ((date_trunc('month'::text, o.order_date))::date);

-- View: crm_product_mix_by_customer
CREATE OR REPLACE VIEW crm_product_mix_by_customer AS\n SELECT c.id AS customer_id,
    c.name AS customer_name,
    p.id AS product_id,
    p.name AS product_name,
    p.type AS product_type,
    p.product_category,
    oi.strain,
    (sum(oi.quantity))::integer AS total_units,
    sum(oi.subtotal) AS total_revenue,
    round(avg(oi.unit_price), 2) AS avg_unit_price,
    (min(o.order_date))::date AS first_order_date,
    (max(o.order_date))::date AS last_order_date,
    (count(DISTINCT o.id))::integer AS order_count
   FROM (((order_items oi
     JOIN orders o ON (((o.id = oi.order_id) AND (o.test_mode = false) AND (o.archived = false))))
     JOIN customers c ON ((c.id = o.customer_id)))
     JOIN products p ON ((p.id = oi.product_id)))
  WHERE (oi.is_sample = false)
  GROUP BY c.id, c.name, p.id, p.name, p.type, p.product_category, oi.strain;

-- View: crm_revenue_pipeline
CREATE OR REPLACE VIEW crm_revenue_pipeline AS\n SELECT c.id AS customer_id,
    c.name AS customer_name,
    c.dispensary_code,
    o.id AS order_id,
    o.order_number,
    o.status,
    o.total_amount,
    o.order_date,
    o.requested_delivery_date,
    o.scheduled_delivery_date
   FROM (orders o
     JOIN customers c ON ((o.customer_id = c.id)))
  WHERE ((o.test_mode = false) AND (o.archived = false) AND (o.status <> ALL (ARRAY['completed'::text, 'cancelled'::text])))
  ORDER BY o.requested_delivery_date, o.order_date;

-- View: crm_sku_performance
CREATE OR REPLACE VIEW crm_sku_performance AS\n SELECT p.id AS product_id,
    p.name AS product_name,
    p.sku,
    p.type AS product_type,
    p.product_category,
    p.strain,
    (count(DISTINCT oi.order_id))::integer AS order_count,
    sum(oi.quantity) AS total_units_sold,
    sum(oi.subtotal) AS total_revenue,
    avg(oi.unit_price) AS avg_unit_price,
    (count(DISTINCT o.customer_id))::integer AS unique_customers,
    min(o.order_date) AS first_sold_date,
    max(o.order_date) AS last_sold_date
   FROM ((order_items oi
     JOIN products p ON ((oi.product_id = p.id)))
     JOIN orders o ON (((oi.order_id = o.id) AND (o.test_mode = false))))
  WHERE (oi.is_sample = false)
  GROUP BY p.id, p.name, p.sku, p.type, p.product_category, p.strain
  ORDER BY (sum(oi.subtotal)) DESC;

-- View: current_inventory_status
CREATE OR REPLACE VIEW current_inventory_status AS\n SELECT bi.strain,
    count(DISTINCT bi.id) AS bucked_totes,
    sum(bi.current_weight_grams) AS total_bucked_grams,
    sum(
        CASE
            WHEN (bulk.product_type = 'flower'::text) THEN bulk.weight_grams
            ELSE (0)::numeric
        END) AS flower_grams,
    sum(
        CASE
            WHEN (bulk.product_type = 'smalls'::text) THEN bulk.weight_grams
            ELSE (0)::numeric
        END) AS smalls_grams,
    sum(
        CASE
            WHEN (bulk.product_type = 'trim'::text) THEN bulk.weight_grams
            ELSE (0)::numeric
        END) AS trim_grams
   FROM (bucked_inventory bi
     LEFT JOIN bulk_inventory bulk ON (((bi.strain = bulk.strain) AND (bulk.status = 'available'::text))))
  WHERE (bi.status = 'available'::text)
  GROUP BY bi.strain
  ORDER BY bi.strain;

-- View: daily_throughput_summary
CREATE OR REPLACE VIEW daily_throughput_summary AS\n SELECT metric_date,
    worker_type,
    count(DISTINCT worker_name) AS total_workers,
    sum(total_weight_processed) AS total_weight_grams,
    sum(total_units_produced) AS total_units,
    sum(total_minutes_worked) AS total_minutes,
    avg(avg_grams_per_hour) AS avg_grams_per_hour,
    avg(avg_units_per_hour) AS avg_units_per_hour,
    sum(sessions_completed) AS total_sessions
   FROM throughput_metrics
  GROUP BY metric_date, worker_type
  ORDER BY metric_date DESC;

-- View: daily_workload
CREATE OR REPLACE VIEW daily_workload AS\n SELECT COALESCE(t.scheduled_date, p.scheduled_date, d.scheduled_date) AS work_date,
    count(DISTINCT t.order_id) AS trim_orders,
    sum(t.estimated_duration_minutes) AS trim_minutes,
    count(DISTINCT p.order_id) AS packaging_orders,
    sum(p.estimated_duration_minutes) AS packaging_minutes,
    count(DISTINCT d.order_id) AS delivery_orders
   FROM ((trim_schedule t
     FULL JOIN packaging_schedule p ON ((t.scheduled_date = p.scheduled_date)))
     FULL JOIN delivery_schedule d ON ((COALESCE(t.scheduled_date, p.scheduled_date) = d.scheduled_date)))
  WHERE (COALESCE(t.status, p.status, d.status) <> ALL (ARRAY['completed'::text, 'cancelled'::text]))
  GROUP BY COALESCE(t.scheduled_date, p.scheduled_date, d.scheduled_date)
  ORDER BY COALESCE(t.scheduled_date, p.scheduled_date, d.scheduled_date);

-- View: deprecated_table_status
CREATE OR REPLACE VIEW deprecated_table_status AS\n SELECT 'internal_bucked_inventory'::text AS table_name,
    ( SELECT count(*) AS count
           FROM internal_bucked_inventory) AS row_count,
    'DEPRECATED - Use inventory_items'::text AS status
UNION ALL
 SELECT 'internal_bulk_inventory'::text AS table_name,
    ( SELECT count(*) AS count
           FROM internal_bulk_inventory) AS row_count,
    'DEPRECATED - Use inventory_items'::text AS status
UNION ALL
 SELECT 'internal_packaged_inventory'::text AS table_name,
    ( SELECT count(*) AS count
           FROM internal_packaged_inventory) AS row_count,
    'DEPRECATED - Use inventory_items'::text AS status
UNION ALL
 SELECT 'inventory_movements'::text AS table_name,
    ( SELECT count(*) AS count
           FROM inventory_movements) AS row_count,
    'DEPRECATED - Use inventory_changes'::text AS status
UNION ALL
 SELECT 'inventory_reconciliation'::text AS table_name,
    ( SELECT count(*) AS count
           FROM inventory_reconciliation) AS row_count,
    'DEPRECATED'::text AS status
UNION ALL
 SELECT 'inventory_variances'::text AS table_name,
    ( SELECT count(*) AS count
           FROM inventory_variances) AS row_count,
    'DEPRECATED'::text AS status
UNION ALL
 SELECT 'order_fulfillment_items'::text AS table_name,
    ( SELECT count(*) AS count
           FROM order_fulfillment_items) AS row_count,
    'DEPRECATED - Use order_fulfillment_checklist'::text AS status;

-- View: finalization_status_summary
CREATE OR REPLACE VIEW finalization_status_summary AS\n SELECT 'trim'::text AS session_type,
    count(*) FILTER (WHERE (trim_sessions.finalization_status = 'pending'::finalization_status)) AS pending_count,
    count(*) FILTER (WHERE (trim_sessions.finalization_status = 'finalized'::finalization_status)) AS finalized_count,
    count(*) FILTER (WHERE (trim_sessions.finalization_status = 'voided'::finalization_status)) AS voided_count,
    sum((COALESCE(trim_sessions.big_buds_grams, (0)::numeric) + COALESCE(trim_sessions.small_buds_grams, (0)::numeric))) FILTER (WHERE (trim_sessions.finalization_status = 'pending'::finalization_status)) AS pending_weight
   FROM trim_sessions
  WHERE (trim_sessions.session_status = 'completed'::text)
UNION ALL
 SELECT 'packaging'::text AS session_type,
    count(*) FILTER (WHERE (packaging_sessions.finalization_status = 'pending'::finalization_status)) AS pending_count,
    count(*) FILTER (WHERE (packaging_sessions.finalization_status = 'finalized'::finalization_status)) AS finalized_count,
    count(*) FILTER (WHERE (packaging_sessions.finalization_status = 'voided'::finalization_status)) AS voided_count,
    sum(((COALESCE(packaging_sessions.units_3_5g, 0) + COALESCE(packaging_sessions.units_14g, 0)) + COALESCE(packaging_sessions.units_454g, 0))) FILTER (WHERE (packaging_sessions.finalization_status = 'pending'::finalization_status)) AS pending_weight
   FROM packaging_sessions
  WHERE (packaging_sessions.session_status = 'completed'::text)
UNION ALL
 SELECT 'bucking'::text AS session_type,
    count(*) FILTER (WHERE (bucking_sessions.finalization_status = 'pending'::finalization_status)) AS pending_count,
    count(*) FILTER (WHERE (bucking_sessions.finalization_status = 'finalized'::finalization_status)) AS finalized_count,
    count(*) FILTER (WHERE (bucking_sessions.finalization_status = 'voided'::finalization_status)) AS voided_count,
    sum((COALESCE(bucking_sessions.bucked_flower_grams, (0)::numeric) + COALESCE(bucking_sessions.bucked_smalls_grams, (0)::numeric))) FILTER (WHERE (bucking_sessions.finalization_status = 'pending'::finalization_status)) AS pending_weight
   FROM bucking_sessions
  WHERE (bucking_sessions.session_status = 'completed'::text);

-- View: ghost_finalized_sessions
CREATE OR REPLACE VIEW ghost_finalized_sessions AS\n SELECT ps.id AS session_id,
    ps.batch_registry_id,
    br.batch_number,
    s.name AS strain_name,
    ps.output_product_name,
    ps.finalization_status_packaged,
    ps.finalized_at_packaged,
    ps.completed_at,
    ((COALESCE(ps.units_3_5g, 0) + COALESCE(ps.units_14g, 0)) + COALESCE(ps.units_454g, 0)) AS total_units,
    'No inventory_items record exists for this finalized session'::text AS issue
   FROM ((packaging_sessions ps
     LEFT JOIN batch_registry br ON ((br.id = ps.batch_registry_id)))
     LEFT JOIN strains s ON ((s.id = ps.strain_id)))
  WHERE ((ps.finalization_status_packaged = 'finalized'::finalization_status) AND (NOT (EXISTS ( SELECT 1
           FROM inventory_items ii
          WHERE ((ii.batch_id = ps.batch_registry_id) AND (ii.product_name = ps.output_product_name) AND (ii.product_stage_id = '323ee0fe-1342-4b26-9379-c373f3cabbb9'::uuid) AND (ii.package_date >= ((ps.completed_at)::date - '1 day'::interval)))))));

-- View: inventory_discrepancies
CREATE OR REPLACE VIEW inventory_discrepancies AS\n SELECT id,
    package_id,
    batch_id,
    product_name,
    strain,
    on_hand_qty AS current_qty,
    calculate_ledger_quantity(id) AS ledger_qty,
    (on_hand_qty - calculate_ledger_quantity(id)) AS discrepancy,
    abs((on_hand_qty - calculate_ledger_quantity(id))) AS abs_discrepancy,
    product_stage_id,
    created_at,
    last_updated
   FROM inventory_items ii
  WHERE (abs((on_hand_qty - calculate_ledger_quantity(id))) > 0.01)
  ORDER BY (abs((on_hand_qty - calculate_ledger_quantity(id)))) DESC;

-- View: inventory_qty_health
CREATE OR REPLACE VIEW inventory_qty_health AS\n SELECT package_id,
    product_name,
    batch_number,
    on_hand_qty,
    available_qty,
    COALESCE(reserved_qty, (0)::numeric) AS reserved_qty,
    (on_hand_qty - COALESCE(reserved_qty, (0)::numeric)) AS expected_available_qty,
        CASE
            WHEN (available_qty <> (on_hand_qty - COALESCE(reserved_qty, (0)::numeric))) THEN 'MISMATCH'::text
            ELSE 'OK'::text
        END AS health_status,
    last_updated
   FROM inventory_items
  WHERE (on_hand_qty > (0)::numeric)
  ORDER BY
        CASE
            WHEN (available_qty <> (on_hand_qty - COALESCE(reserved_qty, (0)::numeric))) THEN 0
            ELSE 1
        END, last_updated DESC;

-- View: inventory_reservation_summary
CREATE OR REPLACE VIEW inventory_reservation_summary AS\n SELECT ii.id AS inventory_item_id,
    ii.package_id,
    ii.product_name,
    ii.strain,
    ii.batch AS batch_number,
    ii.unit,
    ii.on_hand_qty AS total_qty,
    ii.available_qty,
    ii.reserved_qty,
    ii.status AS inventory_status,
    COALESCE(agg.active_assignments, (0)::bigint) AS active_assignments,
    COALESCE(agg.assigned_order_ids, ARRAY[]::uuid[]) AS assigned_order_ids
   FROM (inventory_items ii
     LEFT JOIN ( SELECT pa_inner.package_id,
            count(*) AS active_assignments,
            array_agg(DISTINCT pa_inner.order_id) AS assigned_order_ids
           FROM package_assignments pa_inner
          WHERE (pa_inner.status = 'reserved'::text)
          GROUP BY pa_inner.package_id) agg ON ((agg.package_id = ii.package_id)));

-- View: label_print_analytics
CREATE OR REPLACE VIEW label_print_analytics AS\n SELECT date(last_printed_at) AS print_date,
    count(*) AS labels_printed,
    sum(print_count) AS total_prints,
    count(
        CASE
            WHEN (print_count > 1) THEN 1
            ELSE NULL::integer
        END) AS reprinted_labels,
    avg(print_count) AS avg_prints_per_label,
    max(print_count) AS max_prints_for_single_label
   FROM labels
  WHERE (last_printed_at IS NOT NULL)
  GROUP BY (date(last_printed_at))
  ORDER BY (date(last_printed_at)) DESC;

-- View: monthly_sku_deliveries
CREATE OR REPLACE VIEW monthly_sku_deliveries AS\n SELECT (date_trunc('month'::text, o.updated_at))::date AS month,
    p.name AS product_name,
    p.type AS product_type,
    p.strain,
    sum(oi.quantity) AS total_units_delivered,
    count(DISTINCT o.id) AS orders_count
   FROM ((orders o
     JOIN order_items oi ON ((oi.order_id = o.id)))
     JOIN products p ON ((p.id = oi.product_id)))
  WHERE ((o.status = 'completed'::text) AND (o.updated_at IS NOT NULL))
  GROUP BY (date_trunc('month'::text, o.updated_at)), p.name, p.type, p.strain;

-- View: order_age_metrics
CREATE OR REPLACE VIEW order_age_metrics AS\n SELECT id AS order_id,
    order_number,
    customer_id,
    status,
    created_at,
    requested_delivery_date,
    (EXTRACT(day FROM (now() - created_at)))::integer AS days_since_created,
    calculate_order_age_color(created_at) AS age_color_code,
        CASE
            WHEN (status = 'ready_for_delivery'::text) THEN EXTRACT(day FROM (updated_at - created_at))
            ELSE NULL::numeric
        END AS fulfillment_days
   FROM orders o
  WHERE (archived = false);

-- View: order_demand_by_sku
CREATE OR REPLACE VIEW order_demand_by_sku AS\n SELECT p.sku,
    p.strain,
    p.name AS product_name,
    p.type AS product_type,
    p.product_category,
    count(DISTINCT oi.order_id) AS order_count,
    sum(oi.quantity) AS total_units_needed,
    sum(oi.subtotal) AS total_value,
    string_agg(DISTINCT o.order_number, ', '::text ORDER BY o.order_number) AS order_numbers,
    min(o.scheduled_delivery_date) AS earliest_delivery_date,
    max(o.scheduled_delivery_date) AS latest_delivery_date
   FROM ((order_items oi
     JOIN orders o ON ((o.id = oi.order_id)))
     JOIN products p ON ((p.id = oi.product_id)))
  WHERE (o.status <> ALL (ARRAY['delivered'::text, 'cancelled'::text, 'archived'::text]))
  GROUP BY p.sku, p.strain, p.name, p.type, p.product_category;

-- View: order_items_with_testing_data
CREATE OR REPLACE VIEW order_items_with_testing_data AS\n SELECT oi.id AS order_item_id,
    oi.order_id,
    oi.product_id,
    oi.quantity,
    oi.unit_price,
    oi.subtotal,
    oi.batch_id,
    br.batch_number,
    br.strain AS batch_strain,
    br.harvest_date,
    coa.id AS coa_id,
    coa.strain_name AS coa_strain,
    coa.thc_percentage,
    coa.cbd_percentage,
    coa.total_cannabinoids_percentage,
    coa.total_terpenes_mg_g,
    coa.terpene_1_name,
    coa.terpene_1_value,
    coa.terpene_1_percentage,
    coa.terpene_2_name,
    coa.terpene_2_value,
    coa.terpene_2_percentage,
    coa.terpene_3_name,
    coa.terpene_3_value,
    coa.terpene_3_percentage,
    coa.sample_date,
    coa.pdf_file_path AS coa_pdf_path
   FROM ((order_items oi
     LEFT JOIN batch_registry br ON ((oi.batch_id = br.id)))
     LEFT JOIN certificates_of_analysis coa ON ((br.coa_id = coa.id)));

-- View: order_material_requirements
CREATE OR REPLACE VIEW order_material_requirements AS\n SELECT o.id AS order_id,
    o.order_number,
    o.requested_delivery_date,
    o.status AS order_status,
    p.strain,
    p.type AS product_type,
    oi.quantity,
        CASE
            WHEN (p.unit = 'eighth'::text) THEN (oi.quantity * 3.75)
            WHEN (p.unit = 'half-oz'::text) THEN (oi.quantity * 15.0)
            WHEN (p.unit = 'unit'::text) THEN (oi.quantity * 1.07)
            WHEN (p.unit = 'pound'::text) THEN (oi.quantity * (454)::numeric)
            ELSE oi.quantity
        END AS grams_needed_with_overage,
        CASE
            WHEN (p.type = 'flower'::text) THEN 'flower'::text
            WHEN (p.type = 'smalls'::text) THEN 'smalls'::text
            WHEN (p.type = 'pre-roll'::text) THEN 'flower'::text
            ELSE 'trim'::text
        END AS bulk_product_type
   FROM ((orders o
     JOIN order_items oi ON ((o.id = oi.order_id)))
     JOIN products p ON ((oi.product_id = p.id)))
  WHERE ((o.status <> ALL (ARRAY['delivered'::text, 'cancelled'::text])) AND (o.archived = false))
  ORDER BY o.requested_delivery_date, o.priority DESC;

-- View: order_pipeline
CREATE OR REPLACE VIEW order_pipeline AS\n SELECT o.id,
    o.order_number,
    o.status,
    o.priority,
    o.requested_delivery_date,
    o.scheduled_delivery_date,
    o.delivery_notes,
    o.internal_notes,
    o.created_at,
    o.updated_at,
    o.archived,
    o.order_source,
    o.is_sample,
    c.name AS customer_name,
    o.total_amount,
    ( SELECT count(*) AS count
           FROM order_items oi
          WHERE (oi.order_id = o.id)) AS item_count
   FROM (orders o
     LEFT JOIN customers c ON ((o.customer_id = c.id)))
  ORDER BY o.created_at DESC;

-- View: orderable_packaged_inventory
CREATE OR REPLACE VIEW orderable_packaged_inventory AS\n SELECT p.id AS product_id,
    p.name AS product_name,
    p.sku,
    pt.name AS product_type,
    pt.base_weight AS unit_weight_grams,
    s.name AS strain,
    s.abbreviation AS strain_code,
    p.price_per_unit,
    p.pricing_unit,
    p.available_quantity AS units_available,
    (p.available_quantity * COALESCE(pt.base_weight, (0)::numeric)) AS total_grams_available,
    p.is_active,
    p.created_at
   FROM (((products p
     JOIN product_stages ps ON ((p.stage_id = ps.id)))
     LEFT JOIN product_types pt ON ((p.type_id = pt.id)))
     LEFT JOIN strains s ON ((p.strain_id = s.id)))
  WHERE ((ps.name = 'Packaged'::text) AND (p.product_category = ANY (ARRAY['packaged'::text, 'preroll'::text])) AND (p.is_active = true))
  ORDER BY p.product_category, pt.base_weight DESC, s.name, pt.name;

-- View: orders_by_delivery_month
CREATE OR REPLACE VIEW orders_by_delivery_month AS\n SELECT COALESCE(to_char(o.scheduled_delivery_date, 'YYYY-MM'::text), to_char((o.requested_delivery_date)::timestamp with time zone, 'YYYY-MM'::text), to_char((CURRENT_DATE)::timestamp with time zone, 'YYYY-MM'::text)) AS delivery_month,
    COALESCE(to_char(o.scheduled_delivery_date, 'Month YYYY'::text), to_char((o.requested_delivery_date)::timestamp with time zone, 'Month YYYY'::text), to_char((CURRENT_DATE)::timestamp with time zone, 'Month YYYY'::text)) AS delivery_month_name,
    o.id,
    o.order_number,
    o.customer_id,
    c.name AS customer_name,
    c.dispensary_code,
    o.order_date,
    o.created_at AS entry_date,
    o.requested_delivery_date,
    o.scheduled_delivery_date,
    o.status,
    o.priority,
    o.total_amount,
    o.delivery_notes,
    o.internal_notes,
    o.archived,
    EXTRACT(year FROM COALESCE(o.scheduled_delivery_date, (o.requested_delivery_date)::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone)) AS delivery_year,
    EXTRACT(month FROM COALESCE(o.scheduled_delivery_date, (o.requested_delivery_date)::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone)) AS delivery_month_num,
    ( SELECT count(*) AS count
           FROM order_items oi
          WHERE (oi.order_id = o.id)) AS item_count
   FROM (orders o
     LEFT JOIN customers c ON ((o.customer_id = c.id)))
  WHERE ((o.archived = false) OR (o.archived IS NULL))
  ORDER BY (EXTRACT(year FROM COALESCE(o.scheduled_delivery_date, (o.requested_delivery_date)::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone))) DESC, (EXTRACT(month FROM COALESCE(o.scheduled_delivery_date, (o.requested_delivery_date)::timestamp with time zone, (CURRENT_DATE)::timestamp with time zone))) DESC, o.created_at DESC;

-- View: package_assignments_details
CREATE OR REPLACE VIEW package_assignments_details AS\n SELECT pa.id,
    pa.order_id,
    pa.order_item_id,
    pa.package_id,
    pa.quantity_assigned,
    pa.label_id,
    pa.notes,
    pa.assigned_by,
    pa.assigned_at,
    pa.created_at,
    pa.updated_at,
    pa.status AS assignment_status,
    o.order_number,
    o.customer_id,
    o.scheduled_delivery_date,
    o.status AS order_status,
    oi.quantity AS order_item_quantity,
    oi.unit_price,
    oi.strain AS order_item_strain,
    p.name AS product_name,
    p.type AS product_type,
    ii.id AS inventory_item_id,
    ii.product_name AS inventory_product_name,
    ii.strain,
    ii.batch_number,
    ii.batch_number AS batch,
    ii.status,
    ii.available_qty,
    ii.unit,
    ii.room,
    ii.package_date,
    l.label_number,
    l.qr_code_data AS barcode_data,
    l.printed_at,
    l.voided_at
   FROM (((((package_assignments pa
     JOIN orders o ON ((o.id = pa.order_id)))
     JOIN order_items oi ON ((oi.id = pa.order_item_id)))
     LEFT JOIN products p ON ((p.id = oi.product_id)))
     LEFT JOIN inventory_items ii ON ((ii.package_id = pa.package_id)))
     LEFT JOIN labels l ON ((l.id = pa.label_id)));

-- View: package_assignments_with_reservations
CREATE OR REPLACE VIEW package_assignments_with_reservations AS\n SELECT pad.id,
    pad.order_id,
    pad.order_item_id,
    pad.package_id,
    pad.quantity_assigned,
    pad.label_id,
    pad.notes,
    pad.assigned_by,
    pad.assigned_at,
    pad.created_at,
    pad.updated_at,
    pad.assignment_status,
    pad.order_number,
    pad.customer_id,
    pad.scheduled_delivery_date,
    pad.order_status,
    pad.order_item_quantity,
    pad.unit_price,
    pad.order_item_strain,
    pad.product_name,
    pad.product_type,
    pad.inventory_item_id,
    pad.inventory_product_name,
    pad.strain,
    pad.batch_number,
    pad.batch,
    pad.status,
    pad.available_qty,
    pad.unit,
    pad.room,
    pad.package_date,
    pad.label_number,
    pad.barcode_data,
    pad.printed_at,
    pad.voided_at,
    ii.on_hand_qty AS total_qty,
    ii.reserved_qty,
    c.name AS customer_name
   FROM ((package_assignments_details pad
     LEFT JOIN inventory_items ii ON ((ii.package_id = pad.package_id)))
     LEFT JOIN customers c ON ((c.id = pad.customer_id)));

-- View: packaging_yield_statistics
CREATE OR REPLACE VIEW packaging_yield_statistics AS\n SELECT strain,
    source_type,
    target_type,
    count(*) AS total_conversions,
    avg(yield_percentage) AS avg_yield_percentage,
    stddev(yield_percentage) AS std_dev_yield,
    min(yield_percentage) AS min_yield,
    max(yield_percentage) AS max_yield,
    avg(yield_rate_units_per_gram) AS avg_units_per_gram,
    min(packaging_date) AS first_conversion_date,
    max(packaging_date) AS last_conversion_date
   FROM packaging_yields
  GROUP BY strain, source_type, target_type;

-- View: pending_conversion_sessions
CREATE OR REPLACE VIEW pending_conversion_sessions AS\n SELECT (md5(((((br.id)::text || '-'::text) || ts.output_product_bigs_name) || '-trim'::text)))::uuid AS aggregation_id,
    'trim'::text AS session_type,
    br.id AS batch_id,
    br.batch_number AS batch_name,
    ts.strain_id,
    s.name AS strain_name,
    NULL::uuid AS product_id,
    ts.output_product_bigs_name AS product_name,
    (sum(ts.big_buds_grams) - COALESCE(( SELECT sum(cp.weight) AS sum
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || ts.output_product_bigs_name) || '-trim'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((ts2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM trim_sessions ts2
                  WHERE ((ts2.batch_registry_id = br.id) AND (ts2.output_product_bigs_name = ts.output_product_bigs_name) AND (ts2.finalization_status_bigs = 'pending'::finalization_status) AND (ts2.session_status = 'completed'::text) AND (ts2.completed_at IS NOT NULL) AND (COALESCE(ts2.big_buds_grams, (0)::numeric) > (0)::numeric)))))), (0)::numeric)) AS output_weight,
    NULL::integer AS output_units,
    min(ts.completed_at) AS first_completed_at,
    max(ts.completed_at) AS last_completed_at,
    count(DISTINCT ts.id) AS session_count,
    array_agg(DISTINCT ts.id ORDER BY ts.id) AS session_ids,
    'pending'::finalization_status AS finalization_status,
    (EXISTS ( SELECT 1
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || ts.output_product_bigs_name) || '-trim'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((ts2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM trim_sessions ts2
                  WHERE ((ts2.batch_registry_id = br.id) AND (ts2.output_product_bigs_name = ts.output_product_bigs_name) AND (ts2.finalization_status_bigs = 'pending'::finalization_status) AND (ts2.session_status = 'completed'::text) AND (ts2.completed_at IS NOT NULL) AND (COALESCE(ts2.big_buds_grams, (0)::numeric) > (0)::numeric))))))) AS has_partial_packages
   FROM ((trim_sessions ts
     JOIN batch_registry br ON ((ts.batch_registry_id = br.id)))
     LEFT JOIN strains s ON ((ts.strain_id = s.id)))
  WHERE ((ts.session_status = 'completed'::text) AND (ts.completed_at IS NOT NULL) AND (ts.finalization_status_bigs = 'pending'::finalization_status) AND (ts.batch_registry_id IS NOT NULL) AND (COALESCE(ts.big_buds_grams, (0)::numeric) > (0)::numeric) AND (ts.output_product_bigs_name IS NOT NULL))
  GROUP BY br.id, br.batch_number, ts.strain_id, s.name, ts.output_product_bigs_name
 HAVING ((sum(ts.big_buds_grams) - COALESCE(( SELECT sum(cp.weight) AS sum
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || ts.output_product_bigs_name) || '-trim'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((ts2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM trim_sessions ts2
                  WHERE ((ts2.batch_registry_id = br.id) AND (ts2.output_product_bigs_name = ts.output_product_bigs_name) AND (ts2.finalization_status_bigs = 'pending'::finalization_status) AND (ts2.session_status = 'completed'::text) AND (ts2.completed_at IS NOT NULL) AND (COALESCE(ts2.big_buds_grams, (0)::numeric) > (0)::numeric)))))), (0)::numeric)) > (0)::numeric)
UNION ALL
 SELECT (md5(((((br.id)::text || '-'::text) || ts.output_product_smalls_name) || '-trim'::text)))::uuid AS aggregation_id,
    'trim'::text AS session_type,
    br.id AS batch_id,
    br.batch_number AS batch_name,
    ts.strain_id,
    s.name AS strain_name,
    NULL::uuid AS product_id,
    ts.output_product_smalls_name AS product_name,
    (sum(ts.small_buds_grams) - COALESCE(( SELECT sum(cp.weight) AS sum
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || ts.output_product_smalls_name) || '-trim'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((ts2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM trim_sessions ts2
                  WHERE ((ts2.batch_registry_id = br.id) AND (ts2.output_product_smalls_name = ts.output_product_smalls_name) AND (ts2.finalization_status_smalls = 'pending'::finalization_status) AND (ts2.session_status = 'completed'::text) AND (ts2.completed_at IS NOT NULL) AND (COALESCE(ts2.small_buds_grams, (0)::numeric) > (0)::numeric)))))), (0)::numeric)) AS output_weight,
    NULL::integer AS output_units,
    min(ts.completed_at) AS first_completed_at,
    max(ts.completed_at) AS last_completed_at,
    count(DISTINCT ts.id) AS session_count,
    array_agg(DISTINCT ts.id ORDER BY ts.id) AS session_ids,
    'pending'::finalization_status AS finalization_status,
    (EXISTS ( SELECT 1
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || ts.output_product_smalls_name) || '-trim'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((ts2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM trim_sessions ts2
                  WHERE ((ts2.batch_registry_id = br.id) AND (ts2.output_product_smalls_name = ts.output_product_smalls_name) AND (ts2.finalization_status_smalls = 'pending'::finalization_status) AND (ts2.session_status = 'completed'::text) AND (ts2.completed_at IS NOT NULL) AND (COALESCE(ts2.small_buds_grams, (0)::numeric) > (0)::numeric))))))) AS has_partial_packages
   FROM ((trim_sessions ts
     JOIN batch_registry br ON ((ts.batch_registry_id = br.id)))
     LEFT JOIN strains s ON ((ts.strain_id = s.id)))
  WHERE ((ts.session_status = 'completed'::text) AND (ts.completed_at IS NOT NULL) AND (ts.finalization_status_smalls = 'pending'::finalization_status) AND (ts.batch_registry_id IS NOT NULL) AND (COALESCE(ts.small_buds_grams, (0)::numeric) > (0)::numeric) AND (ts.output_product_smalls_name IS NOT NULL))
  GROUP BY br.id, br.batch_number, ts.strain_id, s.name, ts.output_product_smalls_name
 HAVING ((sum(ts.small_buds_grams) - COALESCE(( SELECT sum(cp.weight) AS sum
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || ts.output_product_smalls_name) || '-trim'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((ts2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM trim_sessions ts2
                  WHERE ((ts2.batch_registry_id = br.id) AND (ts2.output_product_smalls_name = ts.output_product_smalls_name) AND (ts2.finalization_status_smalls = 'pending'::finalization_status) AND (ts2.session_status = 'completed'::text) AND (ts2.completed_at IS NOT NULL) AND (COALESCE(ts2.small_buds_grams, (0)::numeric) > (0)::numeric)))))), (0)::numeric)) > (0)::numeric)
UNION ALL
 SELECT (md5(((((br.id)::text || '-'::text) || ts.output_product_trim_name) || '-trim'::text)))::uuid AS aggregation_id,
    'trim'::text AS session_type,
    br.id AS batch_id,
    br.batch_number AS batch_name,
    ts.strain_id,
    s.name AS strain_name,
    NULL::uuid AS product_id,
    ts.output_product_trim_name AS product_name,
    (sum(ts.trim_grams) - COALESCE(( SELECT sum(cp.weight) AS sum
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || ts.output_product_trim_name) || '-trim'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((ts2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM trim_sessions ts2
                  WHERE ((ts2.batch_registry_id = br.id) AND (ts2.output_product_trim_name = ts.output_product_trim_name) AND (ts2.finalization_status_trim = 'pending'::finalization_status) AND (ts2.session_status = 'completed'::text) AND (ts2.completed_at IS NOT NULL) AND (COALESCE(ts2.trim_grams, (0)::numeric) > (0)::numeric)))))), (0)::numeric)) AS output_weight,
    NULL::integer AS output_units,
    min(ts.completed_at) AS first_completed_at,
    max(ts.completed_at) AS last_completed_at,
    count(DISTINCT ts.id) AS session_count,
    array_agg(DISTINCT ts.id ORDER BY ts.id) AS session_ids,
    'pending'::finalization_status AS finalization_status,
    (EXISTS ( SELECT 1
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || ts.output_product_trim_name) || '-trim'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((ts2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM trim_sessions ts2
                  WHERE ((ts2.batch_registry_id = br.id) AND (ts2.output_product_trim_name = ts.output_product_trim_name) AND (ts2.finalization_status_trim = 'pending'::finalization_status) AND (ts2.session_status = 'completed'::text) AND (ts2.completed_at IS NOT NULL) AND (COALESCE(ts2.trim_grams, (0)::numeric) > (0)::numeric))))))) AS has_partial_packages
   FROM ((trim_sessions ts
     JOIN batch_registry br ON ((ts.batch_registry_id = br.id)))
     LEFT JOIN strains s ON ((ts.strain_id = s.id)))
  WHERE ((ts.session_status = 'completed'::text) AND (ts.completed_at IS NOT NULL) AND (ts.finalization_status_trim = 'pending'::finalization_status) AND (ts.batch_registry_id IS NOT NULL) AND (COALESCE(ts.trim_grams, (0)::numeric) > (0)::numeric) AND (ts.output_product_trim_name IS NOT NULL))
  GROUP BY br.id, br.batch_number, ts.strain_id, s.name, ts.output_product_trim_name
 HAVING ((sum(ts.trim_grams) - COALESCE(( SELECT sum(cp.weight) AS sum
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || ts.output_product_trim_name) || '-trim'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((ts2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM trim_sessions ts2
                  WHERE ((ts2.batch_registry_id = br.id) AND (ts2.output_product_trim_name = ts.output_product_trim_name) AND (ts2.finalization_status_trim = 'pending'::finalization_status) AND (ts2.session_status = 'completed'::text) AND (ts2.completed_at IS NOT NULL) AND (COALESCE(ts2.trim_grams, (0)::numeric) > (0)::numeric)))))), (0)::numeric)) > (0)::numeric)
UNION ALL
 SELECT (md5(((((br.id)::text || '-'::text) || ps.output_product_3_5g_name) || '-packaging'::text)))::uuid AS aggregation_id,
    'packaging'::text AS session_type,
    br.id AS batch_id,
    br.batch_number AS batch_name,
    ps.strain_id,
    s.name AS strain_name,
    NULL::uuid AS product_id,
    ps.output_product_3_5g_name AS product_name,
    NULL::numeric AS output_weight,
    ((sum(COALESCE(ps.units_3_5g, 0)) - COALESCE(( SELECT sum(cp.units) AS sum
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || ps.output_product_3_5g_name) || '-packaging'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((ps2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM packaging_sessions ps2
                  WHERE ((ps2.batch_registry_id = br.id) AND (ps2.output_product_3_5g_name = ps.output_product_3_5g_name) AND (ps2.finalization_status_3_5g = 'pending'::text) AND (ps2.session_status = 'completed'::text) AND (ps2.completed_at IS NOT NULL) AND (COALESCE(ps2.units_3_5g, 0) > 0)))))), (0)::bigint)))::integer AS output_units,
    min(ps.completed_at) AS first_completed_at,
    max(ps.completed_at) AS last_completed_at,
    count(DISTINCT ps.id) AS session_count,
    array_agg(DISTINCT ps.id ORDER BY ps.id) AS session_ids,
    'pending'::finalization_status AS finalization_status,
    (EXISTS ( SELECT 1
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || ps.output_product_3_5g_name) || '-packaging'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((ps2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM packaging_sessions ps2
                  WHERE ((ps2.batch_registry_id = br.id) AND (ps2.output_product_3_5g_name = ps.output_product_3_5g_name) AND (ps2.finalization_status_3_5g = 'pending'::text) AND (ps2.session_status = 'completed'::text) AND (ps2.completed_at IS NOT NULL) AND (COALESCE(ps2.units_3_5g, 0) > 0))))))) AS has_partial_packages
   FROM ((packaging_sessions ps
     JOIN batch_registry br ON ((ps.batch_registry_id = br.id)))
     LEFT JOIN strains s ON ((ps.strain_id = s.id)))
  WHERE ((ps.session_status = 'completed'::text) AND (ps.completed_at IS NOT NULL) AND (ps.finalization_status_3_5g = 'pending'::text) AND (ps.batch_registry_id IS NOT NULL) AND (COALESCE(ps.units_3_5g, 0) > 0) AND (ps.output_product_3_5g_name IS NOT NULL))
  GROUP BY br.id, br.batch_number, ps.strain_id, s.name, ps.output_product_3_5g_name
 HAVING ((sum(COALESCE(ps.units_3_5g, 0)) - COALESCE(( SELECT sum(cp.units) AS sum
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || ps.output_product_3_5g_name) || '-packaging'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((ps2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM packaging_sessions ps2
                  WHERE ((ps2.batch_registry_id = br.id) AND (ps2.output_product_3_5g_name = ps.output_product_3_5g_name) AND (ps2.finalization_status_3_5g = 'pending'::text) AND (ps2.session_status = 'completed'::text) AND (ps2.completed_at IS NOT NULL) AND (COALESCE(ps2.units_3_5g, 0) > 0)))))), (0)::bigint)) > 0)
UNION ALL
 SELECT (md5(((((br.id)::text || '-'::text) || ps.output_product_14g_name) || '-packaging'::text)))::uuid AS aggregation_id,
    'packaging'::text AS session_type,
    br.id AS batch_id,
    br.batch_number AS batch_name,
    ps.strain_id,
    s.name AS strain_name,
    NULL::uuid AS product_id,
    ps.output_product_14g_name AS product_name,
    NULL::numeric AS output_weight,
    ((sum(COALESCE(ps.units_14g, 0)) - COALESCE(( SELECT sum(cp.units) AS sum
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || ps.output_product_14g_name) || '-packaging'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((ps2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM packaging_sessions ps2
                  WHERE ((ps2.batch_registry_id = br.id) AND (ps2.output_product_14g_name = ps.output_product_14g_name) AND (ps2.finalization_status_14g = 'pending'::text) AND (ps2.session_status = 'completed'::text) AND (ps2.completed_at IS NOT NULL) AND (COALESCE(ps2.units_14g, 0) > 0)))))), (0)::bigint)))::integer AS output_units,
    min(ps.completed_at) AS first_completed_at,
    max(ps.completed_at) AS last_completed_at,
    count(DISTINCT ps.id) AS session_count,
    array_agg(DISTINCT ps.id ORDER BY ps.id) AS session_ids,
    'pending'::finalization_status AS finalization_status,
    (EXISTS ( SELECT 1
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || ps.output_product_14g_name) || '-packaging'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((ps2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM packaging_sessions ps2
                  WHERE ((ps2.batch_registry_id = br.id) AND (ps2.output_product_14g_name = ps.output_product_14g_name) AND (ps2.finalization_status_14g = 'pending'::text) AND (ps2.session_status = 'completed'::text) AND (ps2.completed_at IS NOT NULL) AND (COALESCE(ps2.units_14g, 0) > 0))))))) AS has_partial_packages
   FROM ((packaging_sessions ps
     JOIN batch_registry br ON ((ps.batch_registry_id = br.id)))
     LEFT JOIN strains s ON ((ps.strain_id = s.id)))
  WHERE ((ps.session_status = 'completed'::text) AND (ps.completed_at IS NOT NULL) AND (ps.finalization_status_14g = 'pending'::text) AND (ps.batch_registry_id IS NOT NULL) AND (COALESCE(ps.units_14g, 0) > 0) AND (ps.output_product_14g_name IS NOT NULL))
  GROUP BY br.id, br.batch_number, ps.strain_id, s.name, ps.output_product_14g_name
 HAVING ((sum(COALESCE(ps.units_14g, 0)) - COALESCE(( SELECT sum(cp.units) AS sum
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || ps.output_product_14g_name) || '-packaging'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((ps2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM packaging_sessions ps2
                  WHERE ((ps2.batch_registry_id = br.id) AND (ps2.output_product_14g_name = ps.output_product_14g_name) AND (ps2.finalization_status_14g = 'pending'::text) AND (ps2.session_status = 'completed'::text) AND (ps2.completed_at IS NOT NULL) AND (COALESCE(ps2.units_14g, 0) > 0)))))), (0)::bigint)) > 0)
UNION ALL
 SELECT (md5(((((br.id)::text || '-'::text) || ps.output_product_1lb_name) || '-packaging'::text)))::uuid AS aggregation_id,
    'packaging'::text AS session_type,
    br.id AS batch_id,
    br.batch_number AS batch_name,
    ps.strain_id,
    s.name AS strain_name,
    NULL::uuid AS product_id,
    ps.output_product_1lb_name AS product_name,
    NULL::numeric AS output_weight,
    ((sum(COALESCE(ps.units_454g, 0)) - COALESCE(( SELECT sum(cp.units) AS sum
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || ps.output_product_1lb_name) || '-packaging'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((ps2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM packaging_sessions ps2
                  WHERE ((ps2.batch_registry_id = br.id) AND (ps2.output_product_1lb_name = ps.output_product_1lb_name) AND (ps2.finalization_status_1lb = 'pending'::text) AND (ps2.session_status = 'completed'::text) AND (ps2.completed_at IS NOT NULL) AND (COALESCE(ps2.units_454g, 0) > 0)))))), (0)::bigint)))::integer AS output_units,
    min(ps.completed_at) AS first_completed_at,
    max(ps.completed_at) AS last_completed_at,
    count(DISTINCT ps.id) AS session_count,
    array_agg(DISTINCT ps.id ORDER BY ps.id) AS session_ids,
    'pending'::finalization_status AS finalization_status,
    (EXISTS ( SELECT 1
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || ps.output_product_1lb_name) || '-packaging'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((ps2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM packaging_sessions ps2
                  WHERE ((ps2.batch_registry_id = br.id) AND (ps2.output_product_1lb_name = ps.output_product_1lb_name) AND (ps2.finalization_status_1lb = 'pending'::text) AND (ps2.session_status = 'completed'::text) AND (ps2.completed_at IS NOT NULL) AND (COALESCE(ps2.units_454g, 0) > 0))))))) AS has_partial_packages
   FROM ((packaging_sessions ps
     JOIN batch_registry br ON ((ps.batch_registry_id = br.id)))
     LEFT JOIN strains s ON ((ps.strain_id = s.id)))
  WHERE ((ps.session_status = 'completed'::text) AND (ps.completed_at IS NOT NULL) AND (ps.finalization_status_1lb = 'pending'::text) AND (ps.batch_registry_id IS NOT NULL) AND (COALESCE(ps.units_454g, 0) > 0) AND (ps.output_product_1lb_name IS NOT NULL))
  GROUP BY br.id, br.batch_number, ps.strain_id, s.name, ps.output_product_1lb_name
 HAVING ((sum(COALESCE(ps.units_454g, 0)) - COALESCE(( SELECT sum(cp.units) AS sum
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || ps.output_product_1lb_name) || '-packaging'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((ps2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM packaging_sessions ps2
                  WHERE ((ps2.batch_registry_id = br.id) AND (ps2.output_product_1lb_name = ps.output_product_1lb_name) AND (ps2.finalization_status_1lb = 'pending'::text) AND (ps2.session_status = 'completed'::text) AND (ps2.completed_at IS NOT NULL) AND (COALESCE(ps2.units_454g, 0) > 0)))))), (0)::bigint)) > 0)
UNION ALL
 SELECT (md5(((((br.id)::text || '-'::text) || bs.output_product_flower_name) || '-bucking'::text)))::uuid AS aggregation_id,
    'bucking'::text AS session_type,
    br.id AS batch_id,
    br.batch_number AS batch_name,
    br.strain_id,
    s.name AS strain_name,
    NULL::uuid AS product_id,
    bs.output_product_flower_name AS product_name,
    (sum(bs.bucked_flower_grams) - COALESCE(( SELECT sum(cp.weight) AS sum
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || bs.output_product_flower_name) || '-bucking'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((bs2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM bucking_sessions bs2
                  WHERE ((bs2.batch_registry_id = br.id) AND (bs2.output_product_flower_name = bs.output_product_flower_name) AND (bs2.finalization_status_bucked = 'pending'::finalization_status) AND (bs2.session_status = 'completed'::text) AND (bs2.completed_at IS NOT NULL) AND (COALESCE(bs2.bucked_flower_grams, (0)::numeric) > (0)::numeric)))))), (0)::numeric)) AS output_weight,
    NULL::integer AS output_units,
    min(bs.completed_at) AS first_completed_at,
    max(bs.completed_at) AS last_completed_at,
    count(DISTINCT bs.id) AS session_count,
    array_agg(DISTINCT bs.id ORDER BY bs.id) AS session_ids,
    'pending'::finalization_status AS finalization_status,
    (EXISTS ( SELECT 1
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || bs.output_product_flower_name) || '-bucking'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((bs2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM bucking_sessions bs2
                  WHERE ((bs2.batch_registry_id = br.id) AND (bs2.output_product_flower_name = bs.output_product_flower_name) AND (bs2.finalization_status_bucked = 'pending'::finalization_status) AND (bs2.session_status = 'completed'::text) AND (bs2.completed_at IS NOT NULL) AND (COALESCE(bs2.bucked_flower_grams, (0)::numeric) > (0)::numeric))))))) AS has_partial_packages
   FROM ((bucking_sessions bs
     JOIN batch_registry br ON ((bs.batch_registry_id = br.id)))
     LEFT JOIN strains s ON ((br.strain_id = s.id)))
  WHERE ((bs.session_status = 'completed'::text) AND (bs.completed_at IS NOT NULL) AND (bs.finalization_status_bucked = 'pending'::finalization_status) AND (bs.batch_registry_id IS NOT NULL) AND (COALESCE(bs.bucked_flower_grams, (0)::numeric) > (0)::numeric) AND (bs.output_product_flower_name IS NOT NULL))
  GROUP BY br.id, br.batch_number, br.strain_id, s.name, bs.output_product_flower_name
 HAVING ((sum(bs.bucked_flower_grams) - COALESCE(( SELECT sum(cp.weight) AS sum
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || bs.output_product_flower_name) || '-bucking'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((bs2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM bucking_sessions bs2
                  WHERE ((bs2.batch_registry_id = br.id) AND (bs2.output_product_flower_name = bs.output_product_flower_name) AND (bs2.finalization_status_bucked = 'pending'::finalization_status) AND (bs2.session_status = 'completed'::text) AND (bs2.completed_at IS NOT NULL) AND (COALESCE(bs2.bucked_flower_grams, (0)::numeric) > (0)::numeric)))))), (0)::numeric)) > (0)::numeric)
UNION ALL
 SELECT (md5(((((br.id)::text || '-'::text) || bs.output_product_smalls_name) || '-bucking'::text)))::uuid AS aggregation_id,
    'bucking'::text AS session_type,
    br.id AS batch_id,
    br.batch_number AS batch_name,
    br.strain_id,
    s.name AS strain_name,
    NULL::uuid AS product_id,
    bs.output_product_smalls_name AS product_name,
    (sum(bs.bucked_smalls_grams) - COALESCE(( SELECT sum(cp.weight) AS sum
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || bs.output_product_smalls_name) || '-bucking'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((bs2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM bucking_sessions bs2
                  WHERE ((bs2.batch_registry_id = br.id) AND (bs2.output_product_smalls_name = bs.output_product_smalls_name) AND (bs2.finalization_status_smalls = 'pending'::finalization_status) AND (bs2.session_status = 'completed'::text) AND (bs2.completed_at IS NOT NULL) AND (COALESCE(bs2.bucked_smalls_grams, (0)::numeric) > (0)::numeric)))))), (0)::numeric)) AS output_weight,
    NULL::integer AS output_units,
    min(bs.completed_at) AS first_completed_at,
    max(bs.completed_at) AS last_completed_at,
    count(DISTINCT bs.id) AS session_count,
    array_agg(DISTINCT bs.id ORDER BY bs.id) AS session_ids,
    'pending'::finalization_status AS finalization_status,
    (EXISTS ( SELECT 1
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || bs.output_product_smalls_name) || '-bucking'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((bs2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM bucking_sessions bs2
                  WHERE ((bs2.batch_registry_id = br.id) AND (bs2.output_product_smalls_name = bs.output_product_smalls_name) AND (bs2.finalization_status_smalls = 'pending'::finalization_status) AND (bs2.session_status = 'completed'::text) AND (bs2.completed_at IS NOT NULL) AND (COALESCE(bs2.bucked_smalls_grams, (0)::numeric) > (0)::numeric))))))) AS has_partial_packages
   FROM ((bucking_sessions bs
     JOIN batch_registry br ON ((bs.batch_registry_id = br.id)))
     LEFT JOIN strains s ON ((br.strain_id = s.id)))
  WHERE ((bs.session_status = 'completed'::text) AND (bs.completed_at IS NOT NULL) AND (bs.finalization_status_smalls = 'pending'::finalization_status) AND (bs.batch_registry_id IS NOT NULL) AND (COALESCE(bs.bucked_smalls_grams, (0)::numeric) > (0)::numeric) AND (bs.output_product_smalls_name IS NOT NULL))
  GROUP BY br.id, br.batch_number, br.strain_id, s.name, bs.output_product_smalls_name
 HAVING ((sum(bs.bucked_smalls_grams) - COALESCE(( SELECT sum(cp.weight) AS sum
           FROM conversion_packages cp
          WHERE ((cp.aggregation_id = (md5(((((br.id)::text || '-'::text) || bs.output_product_smalls_name) || '-bucking'::text)))::uuid) AND (cp.finalization_status = ANY (ARRAY['pending'::finalization_status, 'finalized'::finalization_status])) AND (cp.source_session_ids ?| ( SELECT COALESCE(array_agg((bs2.id)::text), ARRAY[]::text[]) AS "coalesce"
                   FROM bucking_sessions bs2
                  WHERE ((bs2.batch_registry_id = br.id) AND (bs2.output_product_smalls_name = bs.output_product_smalls_name) AND (bs2.finalization_status_smalls = 'pending'::finalization_status) AND (bs2.session_status = 'completed'::text) AND (bs2.completed_at IS NOT NULL) AND (COALESCE(bs2.bucked_smalls_grams, (0)::numeric) > (0)::numeric)))))), (0)::numeric)) > (0)::numeric)
  ORDER BY 12 DESC;

-- View: pending_conversions
CREATE OR REPLACE VIEW pending_conversions AS\n SELECT bs.id AS session_id,
    'bucking'::text AS session_type,
    bs.batch_registry_id,
    br.batch_number AS batch_id,
    br.strain_id,
    bs.binned_weight_grams AS input_weight,
    (COALESCE(bs.bucked_flower_grams, (0)::numeric) + COALESCE(bs.bucked_smalls_grams, (0)::numeric)) AS output_weight,
    COALESCE(bs.waste_grams, (0)::numeric) AS loss_weight,
    (((COALESCE(bs.binned_weight_grams, (0)::numeric) - COALESCE(bs.bucked_flower_grams, (0)::numeric)) - COALESCE(bs.bucked_smalls_grams, (0)::numeric)) - COALESCE(bs.waste_grams, (0)::numeric)) AS remaining_weight,
    bs.output_product_flower_name AS product_name,
    'Bucked'::text AS output_stage,
    bs.session_status,
    bs.finalization_status,
    bs.started_at,
    bs.completed_at,
    bs.created_at
   FROM (bucking_sessions bs
     JOIN batch_registry br ON ((bs.batch_registry_id = br.id)))
  WHERE ((bs.session_status = 'completed'::text) AND (bs.finalization_status = 'pending'::finalization_status))
UNION ALL
 SELECT ts.id AS session_id,
    'trim'::text AS session_type,
    ts.batch_registry_id,
    br.batch_number AS batch_id,
    br.strain_id,
    ts.pulled_weight AS input_weight,
    ((COALESCE(ts.big_buds_grams, (0)::numeric) + COALESCE(ts.small_buds_grams, (0)::numeric)) + COALESCE(ts.bucked_smalls_grams, (0)::numeric)) AS output_weight,
    COALESCE(ts.waste_grams, (0)::numeric) AS loss_weight,
    ((((COALESCE(ts.pulled_weight, (0)::numeric) - COALESCE(ts.big_buds_grams, (0)::numeric)) - COALESCE(ts.small_buds_grams, (0)::numeric)) - COALESCE(ts.bucked_smalls_grams, (0)::numeric)) - COALESCE(ts.waste_grams, (0)::numeric)) AS remaining_weight,
    ts.output_product_bigs_name AS product_name,
    'Trimmed'::text AS output_stage,
    ts.session_status,
    ts.finalization_status,
    ts.started_at,
    ts.completed_at,
    ts.created_at
   FROM (trim_sessions ts
     JOIN batch_registry br ON ((ts.batch_registry_id = br.id)))
  WHERE ((ts.session_status = 'completed'::text) AND (ts.finalization_status = 'pending'::finalization_status))
UNION ALL
 SELECT ps.id AS session_id,
    'packaging'::text AS session_type,
    ps.batch_registry_id,
    br.batch_number AS batch_id,
    br.strain_id,
    ps.pull_weight AS input_weight,
    ((((COALESCE(ps.units_3_5g, 0))::numeric * 3.5) + ((COALESCE(ps.units_14g, 0) * 14))::numeric) + ((COALESCE(ps.units_454g, 0) * 454))::numeric) AS output_weight,
    COALESCE(ps.waste_grams, (0)::numeric) AS loss_weight,
    ((COALESCE(ps.pull_weight, (0)::numeric) - ((((COALESCE(ps.units_3_5g, 0))::numeric * 3.5) + ((COALESCE(ps.units_14g, 0) * 14))::numeric) + ((COALESCE(ps.units_454g, 0) * 454))::numeric)) - COALESCE(ps.waste_grams, (0)::numeric)) AS remaining_weight,
    ps.output_product_name AS product_name,
    'Packaged'::text AS output_stage,
    ps.session_status,
    ps.finalization_status,
    ps.started_at,
    ps.completed_at,
    ps.created_at
   FROM (packaging_sessions ps
     JOIN batch_registry br ON ((ps.batch_registry_id = br.id)))
  WHERE ((ps.session_status = 'completed'::text) AND (ps.finalization_status = 'pending'::finalization_status));

-- View: pending_invoices
CREATE OR REPLACE VIEW pending_invoices AS\n SELECT o.id AS order_id,
    o.order_number,
    o.status AS order_status,
    c.name AS customer_name,
    c.id AS customer_id,
    o.total_amount,
    o.scheduled_delivery_date,
    COALESCE((i.id IS NOT NULL), false) AS has_invoice,
    i.invoice_number,
    i.status AS invoice_status
   FROM ((orders o
     LEFT JOIN customers c ON ((o.customer_id = c.id)))
     LEFT JOIN invoices i ON ((i.order_id = o.id)))
  WHERE ((o.status = ANY (ARRAY['ready_for_delivery'::text, 'completed'::text])) AND (o.archived = false))
  ORDER BY o.scheduled_delivery_date DESC;

-- View: projected_inventory_requirements
CREATE OR REPLACE VIEW projected_inventory_requirements AS\n WITH current_packaged AS (
         SELECT ii.strain,
                CASE
                    WHEN ((ii.sku ~~ '%-0003'::text) OR (ii.product_name ~~ '%3.5g%'::text)) THEN '3.5g'::text
                    WHEN ((ii.sku ~~ '%-0002'::text) OR (ii.product_name ~~ '%14g%'::text)) THEN '14g'::text
                    WHEN ((ii.sku ~~ '%-0001'::text) OR (ii.product_name ~~ '%454g%'::text)) THEN '454g'::text
                    ELSE 'other'::text
                END AS package_size,
            sum(ii.available_qty) AS available_units
           FROM inventory_items ii
          WHERE (ii.category = ANY (ARRAY['Flower - Prepack'::text, 'Trim - Prepack'::text]))
          GROUP BY ii.strain,
                CASE
                    WHEN ((ii.sku ~~ '%-0003'::text) OR (ii.product_name ~~ '%3.5g%'::text)) THEN '3.5g'::text
                    WHEN ((ii.sku ~~ '%-0002'::text) OR (ii.product_name ~~ '%14g%'::text)) THEN '14g'::text
                    WHEN ((ii.sku ~~ '%-0001'::text) OR (ii.product_name ~~ '%454g%'::text)) THEN '454g'::text
                    ELSE 'other'::text
                END
        ), current_bulk AS (
         SELECT ii.strain,
                CASE
                    WHEN ((ii.category = 'Flower - Bulk'::text) AND (ii.product_name ~~ '%Smalls%'::text)) THEN 'smalls'::text
                    WHEN (ii.category = 'Flower - Bulk'::text) THEN 'flower'::text
                    WHEN (ii.category = 'Trim - Bulk'::text) THEN 'trim'::text
                    ELSE 'flower'::text
                END AS product_type,
            sum(ii.available_qty) AS available_grams
           FROM inventory_items ii
          WHERE (ii.category = ANY (ARRAY['Flower - Bulk'::text, 'Trim - Bulk'::text]))
          GROUP BY ii.strain,
                CASE
                    WHEN ((ii.category = 'Flower - Bulk'::text) AND (ii.product_name ~~ '%Smalls%'::text)) THEN 'smalls'::text
                    WHEN (ii.category = 'Flower - Bulk'::text) THEN 'flower'::text
                    WHEN (ii.category = 'Trim - Bulk'::text) THEN 'trim'::text
                    ELSE 'flower'::text
                END
        )
 SELECT od.strain,
    od.product_type,
    od.product_category,
    od.product_name,
    od.total_units_needed,
    COALESCE(cp.available_units, (0)::numeric) AS packaged_units_available,
    GREATEST((od.total_units_needed - COALESCE(cp.available_units, (0)::numeric)), (0)::numeric) AS units_still_needed,
    COALESCE(cb.available_grams, (0)::numeric) AS bulk_grams_available,
    GREATEST((((od.total_units_needed - COALESCE(cp.available_units, (0)::numeric)) *
        CASE
            WHEN (od.product_name ~~ '%3.5g%'::text) THEN 3.5
            WHEN (od.product_name ~~ '%14g%'::text) THEN (14)::numeric
            WHEN (od.product_name ~~ '%454g%'::text) THEN (454)::numeric
            WHEN (od.product_type = '3.5g'::text) THEN 3.5
            WHEN (od.product_type = '14g'::text) THEN (14)::numeric
            WHEN (od.product_type = '454g'::text) THEN (454)::numeric
            ELSE (0)::numeric
        END) - COALESCE(cb.available_grams, (0)::numeric)), (0)::numeric) AS grams_needed_from_bulk,
    (GREATEST((((od.total_units_needed - COALESCE(cp.available_units, (0)::numeric)) *
        CASE
            WHEN (od.product_name ~~ '%3.5g%'::text) THEN 3.5
            WHEN (od.product_name ~~ '%14g%'::text) THEN (14)::numeric
            WHEN (od.product_name ~~ '%454g%'::text) THEN (454)::numeric
            WHEN (od.product_type = '3.5g'::text) THEN 3.5
            WHEN (od.product_type = '14g'::text) THEN (14)::numeric
            WHEN (od.product_type = '454g'::text) THEN (454)::numeric
            ELSE (0)::numeric
        END) - COALESCE(cb.available_grams, (0)::numeric)), (0)::numeric) / COALESCE(
        CASE
            WHEN ((od.product_category ~~ '%Flower%'::text) AND (od.product_name !~~ '%14g%'::text) AND (od.product_type !~~ '%14g%'::text)) THEN ( SELECT strain_metadata.avg_bucked_to_flower_ratio
               FROM strain_metadata
              WHERE (strain_metadata.name = od.strain))
            WHEN ((od.product_name ~~ '%14g%'::text) OR (od.product_type ~~ '%14g%'::text) OR (od.product_name ~~ '%Smalls%'::text)) THEN ( SELECT strain_metadata.avg_bucked_to_smalls_ratio
               FROM strain_metadata
              WHERE (strain_metadata.name = od.strain))
            ELSE 0.50
        END, 0.50)) AS bucked_grams_needed,
    od.order_count,
    od.earliest_delivery_date,
    od.order_numbers
   FROM ((order_demand_by_sku od
     LEFT JOIN current_packaged cp ON (((od.strain = cp.strain) AND (((od.product_name ~~ '%3.5g%'::text) AND (cp.package_size = '3.5g'::text)) OR ((od.product_name ~~ '%14g%'::text) AND (cp.package_size = '14g'::text)) OR ((od.product_name ~~ '%454g%'::text) AND (cp.package_size = '454g'::text)) OR (od.product_type = cp.package_size)))))
     LEFT JOIN current_bulk cb ON (((od.strain = cb.strain) AND (
        CASE
            WHEN ((od.product_name ~~ '%3.5g%'::text) OR (od.product_type = '3.5g'::text)) THEN 'flower'::text
            WHEN ((od.product_name ~~ '%14g%'::text) OR (od.product_type = '14g'::text)) THEN 'smalls'::text
            WHEN ((od.product_name ~~ '%454g%'::text) OR (od.product_type = '454g'::text)) THEN 'flower'::text
            ELSE 'flower'::text
        END = cb.product_type))));

-- View: route_statistics
CREATE OR REPLACE VIEW route_statistics AS\n SELECT count(*) AS total_cached_routes,
    count(*) FILTER (WHERE (last_calculated_at > (now() - '30 days'::interval))) AS fresh_routes,
    count(*) FILTER (WHERE (last_calculated_at <= (now() - '30 days'::interval))) AS stale_routes,
    sum(distance_meters) AS total_distance_cached,
    avg(distance_meters) AS avg_route_distance,
    avg(duration_seconds) AS avg_route_duration
   FROM delivery_routes;

-- View: strain_conversion_analysis
CREATE OR REPLACE VIEW strain_conversion_analysis AS\n SELECT strain,
    from_stage,
    to_stage,
    actual_percentage,
    expected_percentage,
    variance_percentage,
    sample_size,
    analysis_date,
        CASE
            WHEN (variance_percentage > (5)::numeric) THEN 'over_performing'::text
            WHEN (variance_percentage < ('-5'::integer)::numeric) THEN 'under_performing'::text
            ELSE 'on_target'::text
        END AS performance_status
   FROM conversion_analytics ca
  ORDER BY analysis_date DESC, strain, from_stage;

-- View: strain_data_quality
CREATE OR REPLACE VIEW strain_data_quality AS\n SELECT 'product_missing_strain'::text AS issue_type,
    (products.id)::text AS entity_id,
    products.name AS entity_name,
    'products'::text AS table_name
   FROM products
  WHERE ((products.strain IS NULL) OR (TRIM(BOTH FROM products.strain) = ''::text) OR (products.strain_id IS NULL))
UNION ALL
 SELECT 'order_item_missing_strain'::text AS issue_type,
    (oi.id)::text AS entity_id,
    p.name AS entity_name,
    'order_items'::text AS table_name
   FROM (order_items oi
     LEFT JOIN products p ON ((p.id = oi.product_id)))
  WHERE ((oi.strain IS NULL) OR (oi.strain_id IS NULL))
UNION ALL
 SELECT 'inventory_missing_batch'::text AS issue_type,
    (ii.id)::text AS entity_id,
    ii.batch AS entity_name,
    'inventory_items'::text AS table_name
   FROM (inventory_items ii
     LEFT JOIN batch_registry br ON ((br.batch_number = ii.batch)))
  WHERE ((ii.batch IS NOT NULL) AND (TRIM(BOTH FROM ii.batch) <> ''::text) AND (br.id IS NULL))
UNION ALL
 SELECT 'batch_missing_strain_id'::text AS issue_type,
    (br.id)::text AS entity_id,
    br.batch_number AS entity_name,
    'batch_registry'::text AS table_name
   FROM batch_registry br
  WHERE (br.strain_id IS NULL);

-- View: strain_metadata_compat
CREATE OR REPLACE VIEW strain_metadata_compat AS\n SELECT id,
    name,
    dominance_type AS type,
    genetics_description AS genetics,
    abbreviation,
    avg_bucked_to_flower_ratio,
    avg_bucked_to_smalls_ratio,
    avg_bucked_to_trim_ratio,
    avg_waste_percentage,
    avg_trim_grams_per_hour,
    notes,
    created_at,
    updated_at
   FROM strains
  WHERE (is_active = true);

-- View: test_mode_status
CREATE OR REPLACE VIEW test_mode_status AS\n SELECT COALESCE(( SELECT (app_settings.setting_value = 'true'::text)
           FROM app_settings
          WHERE (app_settings.setting_key = 'test_mode_enabled'::text)), false) AS enabled,
    COALESCE(( SELECT (app_settings.setting_value)::integer AS setting_value
           FROM app_settings
          WHERE (app_settings.setting_key = 'test_mode_audit_retention_days'::text)), 30) AS retention_days,
    ( SELECT count(*) AS count
           FROM test_mode_audit_log) AS total_audit_entries,
    ( SELECT count(*) AS count
           FROM test_mode_audit_log
          WHERE (test_mode_audit_log.created_at >= (now() - '24:00:00'::interval))) AS audit_entries_last_24h,
    ( SELECT count(DISTINCT test_mode_audit_log.validation_bypassed) AS count
           FROM test_mode_audit_log) AS unique_validations_bypassed;

-- View: trim_productivity_by_strain
CREATE OR REPLACE VIEW trim_productivity_by_strain AS\n SELECT strain,
    trimmer_name,
    count(*) AS session_count,
    avg(grams_per_hour) AS avg_grams_per_hour,
    avg(big_buds_grams) AS avg_flower_output,
    avg(small_buds_grams) AS avg_smalls_output,
    avg(trim_grams) AS avg_trim_output,
    avg(waste_grams) AS avg_waste,
    avg(
        CASE
            WHEN (pulled_weight > (0)::numeric) THEN ((big_buds_grams / pulled_weight) * (100)::numeric)
            ELSE (0)::numeric
        END) AS avg_flower_yield_percentage,
    avg(
        CASE
            WHEN (pulled_weight > (0)::numeric) THEN ((small_buds_grams / pulled_weight) * (100)::numeric)
            ELSE (0)::numeric
        END) AS avg_smalls_yield_percentage
   FROM trim_sessions
  WHERE (trim_method = 'hand'::text)
  GROUP BY strain, trimmer_name
  ORDER BY strain, (avg(grams_per_hour)) DESC;

-- View: v_atp
CREATE OR REPLACE VIEW v_atp AS\n SELECT i.id AS item_id,
    i.package_id,
    i.product_name,
    i.strain,
    i.batch_id,
    i.batch_number,
    i.product_stage_id,
    ps.name AS stage_name,
    i.unit,
    COALESCE(i.on_hand_qty, (0)::numeric) AS on_hand_qty,
    (COALESCE(( SELECT sum(inventory_movements.qty) AS sum
           FROM inventory_movements
          WHERE ((inventory_movements.source_item_id = i.id) AND (inventory_movements.movement_kind = 'RESERVE'::text))), (0)::numeric) - COALESCE(( SELECT sum(inventory_movements.qty) AS sum
           FROM inventory_movements
          WHERE ((inventory_movements.dest_item_id = i.id) AND (inventory_movements.movement_kind = 'RELEASE'::text))), (0)::numeric)) AS reserved_qty,
    (COALESCE(i.on_hand_qty, (0)::numeric) - (COALESCE(( SELECT sum(inventory_movements.qty) AS sum
           FROM inventory_movements
          WHERE ((inventory_movements.source_item_id = i.id) AND (inventory_movements.movement_kind = 'RESERVE'::text))), (0)::numeric) - COALESCE(( SELECT sum(inventory_movements.qty) AS sum
           FROM inventory_movements
          WHERE ((inventory_movements.dest_item_id = i.id) AND (inventory_movements.movement_kind = 'RELEASE'::text))), (0)::numeric))) AS atp_qty
   FROM (inventory_items i
     LEFT JOIN product_stages ps ON ((ps.id = i.product_stage_id)))
  WHERE (((i.status <> 'deleted'::text) OR (i.status IS NULL)) AND (COALESCE(i.on_hand_qty, (0)::numeric) > (0)::numeric));

-- View: v_batch_stage_balances
CREATE OR REPLACE VIEW v_batch_stage_balances AS\n SELECT i.batch_id,
    br.batch_number,
    br.strain,
    i.product_stage_id,
    ps.name AS stage,
    ps.sort_order,
    sum(
        CASE
            WHEN (i.unit = 'g'::text) THEN COALESCE(i.on_hand_qty, (0)::numeric)
            ELSE (0)::numeric
        END) AS weight_grams,
    sum(
        CASE
            WHEN (i.unit = 'unit'::text) THEN COALESCE(i.on_hand_qty, (0)::numeric)
            ELSE (0)::numeric
        END) AS unit_count,
    sum(
        CASE
            WHEN (i.unit = 'g'::text) THEN COALESCE(i.on_hand_qty, (0)::numeric)
            ELSE (0)::numeric
        END) AS available_weight_grams,
    count(DISTINCT i.id) AS item_count,
    max(i.last_updated) AS last_updated
   FROM ((inventory_items i
     LEFT JOIN batch_registry br ON ((br.id = i.batch_id)))
     LEFT JOIN product_stages ps ON ((ps.id = i.product_stage_id)))
  WHERE (((i.status <> 'deleted'::text) OR (i.status IS NULL)) AND (i.batch_id IS NOT NULL) AND (COALESCE(i.on_hand_qty, (0)::numeric) > (0)::numeric))
  GROUP BY i.batch_id, br.batch_number, br.strain, i.product_stage_id, ps.name, ps.sort_order
  ORDER BY br.batch_number, ps.sort_order;

-- View: v_daily_movement_volume
CREATE OR REPLACE VIEW v_daily_movement_volume AS\n SELECT date(created_at) AS movement_date,
    movement_kind,
    count(*) AS count,
    sum(qty) AS total_qty,
    avg(qty) AS avg_qty
   FROM inventory_movements
  WHERE (created_at >= (CURRENT_DATE - '30 days'::interval))
  GROUP BY (date(created_at)), movement_kind
  ORDER BY (date(created_at)) DESC, (count(*)) DESC;

-- View: v_inventory_atp
CREATE OR REPLACE VIEW v_inventory_atp AS\n SELECT id AS item_id,
    package_id,
    product_name,
    product_stage_id,
    batch_id,
    on_hand_qty,
    COALESCE(( SELECT sum(inventory_movements.qty) AS sum
           FROM inventory_movements
          WHERE ((inventory_movements.source_item_id = ii.id) AND (inventory_movements.movement_kind = 'RESERVE'::text))), (0)::numeric) AS reserved_qty,
    COALESCE(( SELECT sum(inventory_movements.qty) AS sum
           FROM inventory_movements
          WHERE ((inventory_movements.dest_item_id = ii.id) AND (inventory_movements.movement_kind = 'RELEASE'::text))), (0)::numeric) AS released_qty,
    (on_hand_qty - (COALESCE(( SELECT sum(inventory_movements.qty) AS sum
           FROM inventory_movements
          WHERE ((inventory_movements.source_item_id = ii.id) AND (inventory_movements.movement_kind = 'RESERVE'::text))), (0)::numeric) - COALESCE(( SELECT sum(inventory_movements.qty) AS sum
           FROM inventory_movements
          WHERE ((inventory_movements.dest_item_id = ii.id) AND (inventory_movements.movement_kind = 'RELEASE'::text))), (0)::numeric))) AS atp_qty,
    unit,
    created_at,
    last_updated AS updated_at
   FROM inventory_items ii
  WHERE (on_hand_qty > (0)::numeric);

-- View: v_inventory_balances
CREATE OR REPLACE VIEW v_inventory_balances AS\n SELECT i.id AS item_id,
    i.package_id,
    i.sku,
    i.product_name,
    i.batch,
    i.batch_id,
    i.batch_number,
    i.strain,
    i.product_stage_id,
    ps.name AS stage_name,
    i.parent_item_id,
    i.unit,
    COALESCE(i.on_hand_qty, (0)::numeric) AS on_hand_qty,
    i.status,
    i.category,
    i.room,
    i.created_at,
    i.last_updated
   FROM (inventory_items i
     LEFT JOIN product_stages ps ON ((ps.id = i.product_stage_id)))
  WHERE ((i.status <> 'deleted'::text) OR (i.status IS NULL));

-- View: v_lineage
CREATE OR REPLACE VIEW v_lineage AS\n WITH RECURSIVE lineage AS (
         SELECT inventory_items.id AS item_id,
            inventory_items.parent_item_id,
            inventory_items.batch_id,
            0 AS depth,
            ARRAY[inventory_items.id] AS path
           FROM inventory_items
        UNION ALL
         SELECT l.item_id,
            p.parent_item_id,
            p.batch_id,
            (l.depth + 1),
            (l.path || p.id)
           FROM (lineage l
             JOIN inventory_items p ON ((p.id = l.parent_item_id)))
          WHERE (l.depth < 10)
        )
 SELECT DISTINCT ON (item_id) item_id,
    parent_item_id,
    batch_id,
    depth,
    path
   FROM lineage
  ORDER BY item_id, depth DESC;

-- View: v_movement_error_rate
CREATE OR REPLACE VIEW v_movement_error_rate AS\n WITH error_counts AS (
         SELECT date(inventory_movement_errors.created_at) AS error_date,
            count(*) AS error_count
           FROM inventory_movement_errors
          WHERE (inventory_movement_errors.created_at >= (CURRENT_DATE - '30 days'::interval))
          GROUP BY (date(inventory_movement_errors.created_at))
        ), movement_counts AS (
         SELECT date(inventory_movements.created_at) AS movement_date,
            count(*) AS movement_count
           FROM inventory_movements
          WHERE (inventory_movements.created_at >= (CURRENT_DATE - '30 days'::interval))
          GROUP BY (date(inventory_movements.created_at))
        )
 SELECT COALESCE(mc.movement_date, ec.error_date) AS date,
    COALESCE(mc.movement_count, (0)::bigint) AS total_movements,
    COALESCE(ec.error_count, (0)::bigint) AS total_errors,
        CASE
            WHEN (COALESCE(mc.movement_count, (0)::bigint) > 0) THEN round((((COALESCE(ec.error_count, (0)::bigint))::numeric / (mc.movement_count)::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS error_percentage
   FROM (movement_counts mc
     FULL JOIN error_counts ec ON ((mc.movement_date = ec.error_date)))
  ORDER BY COALESCE(mc.movement_date, ec.error_date) DESC;

-- View: v_movement_stats
CREATE OR REPLACE VIEW v_movement_stats AS\n SELECT movement_kind,
    count(*) AS total_count,
    sum(qty) AS total_qty,
    avg(qty) AS avg_qty,
    min(qty) AS min_qty,
    max(qty) AS max_qty,
    count(DISTINCT COALESCE(source_item_id, dest_item_id)) AS unique_items,
    count(DISTINCT date(created_at)) AS active_days,
    min(created_at) AS first_movement,
    max(created_at) AS last_movement
   FROM inventory_movements
  GROUP BY movement_kind
  ORDER BY (count(*)) DESC;

-- View: v_quarantined_batches
CREATE OR REPLACE VIEW v_quarantined_batches AS\n SELECT br.id AS batch_id,
    br.batch_number,
    br.strain,
    br.lifecycle_state,
    br.is_quarantined,
    br.quarantine_reason,
    br.quarantined_at,
    count(DISTINCT ii.id) AS affected_item_count,
    sum(ii.on_hand_qty) AS total_on_hand_qty,
    ( SELECT count(*) AS count
           FROM quarantine_violation_log
          WHERE (quarantine_violation_log.batch_id = br.id)) AS blocked_operation_count,
    br.created_at,
    br.updated_at
   FROM (batch_registry br
     LEFT JOIN inventory_items ii ON ((ii.batch_id = br.id)))
  WHERE (br.is_quarantined = true)
  GROUP BY br.id, br.batch_number, br.strain, br.lifecycle_state, br.is_quarantined, br.quarantine_reason, br.quarantined_at, br.created_at, br.updated_at
  ORDER BY br.quarantined_at DESC;

-- View: vw_conversion_rates_by_session
CREATE OR REPLACE VIEW vw_conversion_rates_by_session AS\n SELECT date_trunc('day'::text, cp.created_at) AS conversion_date,
    (jsonb_array_elements_text(cp.source_session_ids))::uuid AS session_id,
    count(*) AS packages_created,
    sum(COALESCE(cp.weight, (0)::numeric)) AS total_weight_grams,
    sum(COALESCE(cp.units, 0)) AS total_units,
    b.batch_number,
    s.name AS strain_name
   FROM ((conversion_packages cp
     JOIN batch_registry b ON ((cp.batch_id = b.id)))
     LEFT JOIN strains s ON ((b.strain_id = s.id)))
  WHERE (cp.created_at >= (CURRENT_DATE - '90 days'::interval))
  GROUP BY (date_trunc('day'::text, cp.created_at)), (jsonb_array_elements_text(cp.source_session_ids)), b.batch_number, s.name
  ORDER BY (date_trunc('day'::text, cp.created_at)) DESC;

-- View: vw_inventory_strain_data_quality
CREATE OR REPLACE VIEW vw_inventory_strain_data_quality AS\n SELECT ii.id AS inventory_item_id,
    ii.package_id,
    ii.batch_id,
    ii.strain AS text_strain,
    ii.strain_id,
    s.name AS matched_strain_name,
    br.strain AS batch_text_strain,
    br.strain_id AS batch_strain_id,
    bs.name AS batch_strain_name,
        CASE
            WHEN ((ii.strain IS NOT NULL) AND (ii.strain_id IS NULL)) THEN 'unmatched_text_strain'::text
            WHEN ((ii.strain_id IS NOT NULL) AND (br.strain_id IS NOT NULL) AND (ii.strain_id <> br.strain_id)) THEN 'strain_batch_mismatch'::text
            WHEN ((ii.strain IS NULL) AND (ii.strain_id IS NULL)) THEN 'no_strain_data'::text
            WHEN (ii.strain_id IS NOT NULL) THEN 'valid'::text
            ELSE 'unknown'::text
        END AS data_quality_status
   FROM (((inventory_items ii
     LEFT JOIN strains s ON ((ii.strain_id = s.id)))
     LEFT JOIN batch_registry br ON ((ii.batch_id = br.id)))
     LEFT JOIN strains bs ON ((br.strain_id = bs.id)))
  ORDER BY
        CASE
            WHEN ((ii.strain IS NOT NULL) AND (ii.strain_id IS NULL)) THEN 1
            WHEN ((ii.strain_id IS NOT NULL) AND (br.strain_id IS NOT NULL) AND (ii.strain_id <> br.strain_id)) THEN 2
            WHEN ((ii.strain IS NULL) AND (ii.strain_id IS NULL)) THEN 3
            ELSE 4
        END, ii.created_at DESC;

-- View: vw_manager_review_performance
CREATE OR REPLACE VIEW vw_manager_review_performance AS\n SELECT up.id AS manager_id,
    up.full_name AS manager_name,
    count(*) AS packages_reviewed,
    avg((EXTRACT(epoch FROM (ii.reviewed_at - ii.created_at)) / (3600)::numeric)) AS avg_hours_to_review,
    min(ii.reviewed_at) AS first_review,
    max(ii.reviewed_at) AS latest_review,
    count(*) FILTER (WHERE ((ii.reviewed_at)::date = CURRENT_DATE)) AS reviewed_today
   FROM (inventory_items ii
     JOIN user_profiles up ON ((ii.reviewed_by = up.id)))
  WHERE (ii.reviewed_at IS NOT NULL)
  GROUP BY up.id, up.full_name
  ORDER BY (count(*)) DESC;

-- View: vw_packaging_sessions_strain_quality
CREATE OR REPLACE VIEW vw_packaging_sessions_strain_quality AS\n SELECT ps.id,
    ps.package_id,
    ps.strain AS text_strain,
    ps.strain_id,
    s.name AS matched_strain_name,
    br.strain_id AS batch_strain_id,
    bs.name AS batch_strain_name,
        CASE
            WHEN ((ps.strain IS NOT NULL) AND (ps.strain_id IS NULL)) THEN 'unmatched_text_strain'::text
            WHEN ((ps.strain_id IS NOT NULL) AND (br.strain_id IS NOT NULL) AND (ps.strain_id <> br.strain_id)) THEN 'strain_batch_mismatch'::text
            WHEN ((ps.strain IS NULL) AND (ps.strain_id IS NULL)) THEN 'no_strain_data'::text
            WHEN (ps.strain_id IS NOT NULL) THEN 'valid'::text
            ELSE 'unknown'::text
        END AS data_quality_status
   FROM (((packaging_sessions ps
     LEFT JOIN strains s ON ((ps.strain_id = s.id)))
     LEFT JOIN batch_registry br ON ((ps.batch_registry_id = br.id)))
     LEFT JOIN strains bs ON ((br.strain_id = bs.id)));

-- View: vw_pending_review_summary
CREATE OR REPLACE VIEW vw_pending_review_summary AS\n SELECT ii.batch_id,
    b.batch_number,
    s.name AS strain_name,
    s.abbreviation AS strain_code,
    ii.product_stage_id,
    ps.name AS stage_name,
    ii.product_name,
    count(*) AS package_count,
    sum(ii.on_hand_qty) AS total_qty,
    ii.unit,
    min(ii.created_at) AS oldest_package,
    max(ii.created_at) AS newest_package,
    array_agg(ii.id) AS item_ids
   FROM (((inventory_items ii
     JOIN batch_registry b ON ((ii.batch_id = b.id)))
     LEFT JOIN strains s ON ((ii.strain_id = s.id)))
     LEFT JOIN product_stages ps ON ((ii.product_stage_id = ps.id)))
  WHERE (ii.review_status = 'pending_review'::text)
  GROUP BY ii.batch_id, b.batch_number, s.name, s.abbreviation, ii.product_stage_id, ps.name, ii.product_name, ii.unit
  ORDER BY (min(ii.created_at));

-- View: vw_trim_sessions_strain_quality
CREATE OR REPLACE VIEW vw_trim_sessions_strain_quality AS\n SELECT ts.id,
    ts.package_id,
    ts.strain AS text_strain,
    ts.strain_id,
    s.name AS matched_strain_name,
    br.strain_id AS batch_strain_id,
    bs.name AS batch_strain_name,
        CASE
            WHEN ((ts.strain IS NOT NULL) AND (ts.strain_id IS NULL)) THEN 'unmatched_text_strain'::text
            WHEN ((ts.strain_id IS NOT NULL) AND (br.strain_id IS NOT NULL) AND (ts.strain_id <> br.strain_id)) THEN 'strain_batch_mismatch'::text
            WHEN ((ts.strain IS NULL) AND (ts.strain_id IS NULL)) THEN 'no_strain_data'::text
            WHEN (ts.strain_id IS NOT NULL) THEN 'valid'::text
            ELSE 'unknown'::text
        END AS data_quality_status
   FROM (((trim_sessions ts
     LEFT JOIN strains s ON ((ts.strain_id = s.id)))
     LEFT JOIN batch_registry br ON ((ts.batch_registry_id = br.id)))
     LEFT JOIN strains bs ON ((br.strain_id = bs.id)));

-- View: vw_variance_trends
CREATE OR REPLACE VIEW vw_variance_trends AS\n SELECT date_trunc('week'::text, cvl.acknowledged_at) AS week,
    cvl.variance_reason,
    count(*) AS occurrence_count,
    avg(COALESCE(cvl.weight_variance, (0)::numeric)) AS avg_weight_variance_grams,
    sum(abs(COALESCE(cvl.weight_variance, (0)::numeric))) AS total_abs_variance_grams,
    avg(COALESCE(cvl.unit_variance, 0)) AS avg_unit_variance,
    b.batch_number
   FROM (conversion_variance_log cvl
     JOIN batch_registry b ON ((cvl.batch_id = b.id)))
  WHERE (cvl.acknowledged_at >= (CURRENT_DATE - '90 days'::interval))
  GROUP BY (date_trunc('week'::text, cvl.acknowledged_at)), cvl.variance_reason, b.batch_number
  ORDER BY (date_trunc('week'::text, cvl.acknowledged_at)) DESC, (sum(abs(COALESCE(cvl.weight_variance, (0)::numeric)))) DESC;
