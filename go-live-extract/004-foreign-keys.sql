-- ============================================================
-- Foreign Key Constraints
-- Source: https://fonreynkfeqywshijqpi.supabase.co
-- Extracted: 2026-03-02
-- Count: 122
-- ============================================================
-- FK: plant_groups_room_table_id_fkey
ALTER TABLE plant_groups ADD CONSTRAINT plant_groups_room_table_id_fkey FOREIGN KEY (room_table_id) REFERENCES room_tables(id);

-- FK: plant_groups_room_section_id_fkey
ALTER TABLE plant_groups ADD CONSTRAINT plant_groups_room_section_id_fkey FOREIGN KEY (room_section_id) REFERENCES room_sections(id);

-- FK: customer_activity_log_customer_id_fkey
ALTER TABLE customer_activity_log ADD CONSTRAINT customer_activity_log_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- FK: orders_customer_id_fkey
ALTER TABLE orders ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;

-- FK: order_items_order_id_fkey
ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- FK: order_items_product_id_fkey
ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

-- FK: trim_schedule_order_id_fkey
ALTER TABLE trim_schedule ADD CONSTRAINT trim_schedule_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- FK: packaging_schedule_order_id_fkey
ALTER TABLE packaging_schedule ADD CONSTRAINT packaging_schedule_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- FK: delivery_schedule_order_id_fkey
ALTER TABLE delivery_schedule ADD CONSTRAINT delivery_schedule_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- FK: slack_notifications_order_id_fkey
ALTER TABLE slack_notifications ADD CONSTRAINT slack_notifications_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

-- FK: trim_sessions_bucked_inventory_id_fkey
ALTER TABLE trim_sessions ADD CONSTRAINT trim_sessions_bucked_inventory_id_fkey FOREIGN KEY (bucked_inventory_id) REFERENCES bucked_inventory(id) ON DELETE SET NULL;

-- FK: inventory_variances_reconciliation_id_fkey
ALTER TABLE inventory_variances ADD CONSTRAINT inventory_variances_reconciliation_id_fkey FOREIGN KEY (reconciliation_id) REFERENCES inventory_reconciliation(id);

-- FK: inventory_conversions_trim_session_id_fkey
ALTER TABLE inventory_conversions ADD CONSTRAINT inventory_conversions_trim_session_id_fkey FOREIGN KEY (trim_session_id) REFERENCES trim_sessions(id) ON DELETE CASCADE;

-- FK: inventory_reconciliation_previous_snapshot_id_fkey
ALTER TABLE inventory_reconciliation ADD CONSTRAINT inventory_reconciliation_previous_snapshot_id_fkey FOREIGN KEY (previous_snapshot_id) REFERENCES inventory_snapshots(id);

-- FK: inventory_reconciliation_current_snapshot_id_fkey
ALTER TABLE inventory_reconciliation ADD CONSTRAINT inventory_reconciliation_current_snapshot_id_fkey FOREIGN KEY (current_snapshot_id) REFERENCES inventory_snapshots(id);

-- FK: harvest_sessions_grow_room_id_fkey
ALTER TABLE harvest_sessions ADD CONSTRAINT harvest_sessions_grow_room_id_fkey FOREIGN KEY (grow_room_id) REFERENCES grow_rooms(id);

-- FK: harvest_sessions_dry_room_id_fkey
ALTER TABLE harvest_sessions ADD CONSTRAINT harvest_sessions_dry_room_id_fkey FOREIGN KEY (dry_room_id) REFERENCES dry_rooms(id);

-- FK: inventory_items_snapshot_id_fkey
ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES inventory_snapshots(id);

-- FK: inventory_changes_snapshot_id_fkey
ALTER TABLE inventory_changes ADD CONSTRAINT inventory_changes_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES inventory_snapshots(id);

-- FK: products_stage_id_fkey
ALTER TABLE products ADD CONSTRAINT products_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES product_stages(id);

-- FK: products_type_id_fkey
ALTER TABLE products ADD CONSTRAINT products_type_id_fkey FOREIGN KEY (type_id) REFERENCES product_types(id);

-- FK: products_strain_id_fkey
ALTER TABLE products ADD CONSTRAINT products_strain_id_fkey FOREIGN KEY (strain_id) REFERENCES strains(id);

-- FK: internal_bucked_inventory_synced_from_snapshot_id_fkey
ALTER TABLE internal_bucked_inventory ADD CONSTRAINT internal_bucked_inventory_synced_from_snapshot_id_fkey FOREIGN KEY (synced_from_snapshot_id) REFERENCES inventory_snapshots(id);

-- FK: internal_packaged_inventory_packaging_session_id_fkey
ALTER TABLE internal_packaged_inventory ADD CONSTRAINT internal_packaged_inventory_packaging_session_id_fkey FOREIGN KEY (packaging_session_id) REFERENCES packaging_sessions(id);

-- FK: order_fulfillment_items_order_id_fkey
ALTER TABLE order_fulfillment_items ADD CONSTRAINT order_fulfillment_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id);

-- FK: order_fulfillment_items_order_item_id_fkey
ALTER TABLE order_fulfillment_items ADD CONSTRAINT order_fulfillment_items_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items(id);

-- FK: order_fulfillment_items_packaging_session_id_fkey
ALTER TABLE order_fulfillment_items ADD CONSTRAINT order_fulfillment_items_packaging_session_id_fkey FOREIGN KEY (packaging_session_id) REFERENCES packaging_sessions(id);

-- FK: order_fulfillment_items_packaged_inventory_id_fkey
ALTER TABLE order_fulfillment_items ADD CONSTRAINT order_fulfillment_items_packaged_inventory_id_fkey FOREIGN KEY (packaged_inventory_id) REFERENCES internal_packaged_inventory(id);

-- FK: order_fulfillment_checklist_order_id_fkey
ALTER TABLE order_fulfillment_checklist ADD CONSTRAINT order_fulfillment_checklist_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- FK: order_fulfillment_checklist_order_item_id_fkey
ALTER TABLE order_fulfillment_checklist ADD CONSTRAINT order_fulfillment_checklist_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE;

-- FK: harvest_weight_entries_harvest_session_id_fkey
ALTER TABLE harvest_weight_entries ADD CONSTRAINT harvest_weight_entries_harvest_session_id_fkey FOREIGN KEY (harvest_session_id) REFERENCES harvest_sessions(id) ON DELETE CASCADE;

-- FK: packaging_yields_packaging_session_id_fkey
ALTER TABLE packaging_yields ADD CONSTRAINT packaging_yields_packaging_session_id_fkey FOREIGN KEY (packaging_session_id) REFERENCES packaging_sessions(id);

-- FK: plant_groups_strain_id_fkey
ALTER TABLE plant_groups ADD CONSTRAINT plant_groups_strain_id_fkey FOREIGN KEY (strain_id) REFERENCES strains(id);

-- FK: plant_groups_grow_room_id_fkey
ALTER TABLE plant_groups ADD CONSTRAINT plant_groups_grow_room_id_fkey FOREIGN KEY (grow_room_id) REFERENCES grow_rooms(id);

-- FK: invoices_order_id_fkey
ALTER TABLE invoices ADD CONSTRAINT invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- FK: invoices_customer_id_fkey
ALTER TABLE invoices ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id);

-- FK: labels_product_id_fkey
ALTER TABLE labels ADD CONSTRAINT labels_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);

-- FK: coversheets_order_id_fkey
ALTER TABLE coversheets ADD CONSTRAINT coversheets_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- FK: trim_sessions_bucked_smalls_inventory_id_fkey
ALTER TABLE trim_sessions ADD CONSTRAINT trim_sessions_bucked_smalls_inventory_id_fkey FOREIGN KEY (bucked_smalls_inventory_id) REFERENCES inventory_items(id);

-- FK: draft_orders_customer_id_fkey
ALTER TABLE draft_orders ADD CONSTRAINT draft_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- FK: consolidated_package_sources_consolidated_package_id_fkey
ALTER TABLE consolidated_package_sources ADD CONSTRAINT consolidated_package_sources_consolidated_package_id_fkey FOREIGN KEY (consolidated_package_id) REFERENCES consolidated_packages(id) ON DELETE CASCADE;

-- FK: plant_groups_mother_plant_group_id_fkey
ALTER TABLE plant_groups ADD CONSTRAINT plant_groups_mother_plant_group_id_fkey FOREIGN KEY (mother_plant_group_id) REFERENCES plant_groups(id);

-- FK: plant_group_stage_history_plant_group_id_fkey
ALTER TABLE plant_group_stage_history ADD CONSTRAINT plant_group_stage_history_plant_group_id_fkey FOREIGN KEY (plant_group_id) REFERENCES plant_groups(id);

-- FK: delivery_routes_origin_customer_id_fkey
ALTER TABLE delivery_routes ADD CONSTRAINT delivery_routes_origin_customer_id_fkey FOREIGN KEY (origin_customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- FK: delivery_routes_destination_customer_id_fkey
ALTER TABLE delivery_routes ADD CONSTRAINT delivery_routes_destination_customer_id_fkey FOREIGN KEY (destination_customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- FK: plant_group_room_history_plant_group_id_fkey
ALTER TABLE plant_group_room_history ADD CONSTRAINT plant_group_room_history_plant_group_id_fkey FOREIGN KEY (plant_group_id) REFERENCES plant_groups(id);

-- FK: plant_group_room_history_from_room_id_fkey
ALTER TABLE plant_group_room_history ADD CONSTRAINT plant_group_room_history_from_room_id_fkey FOREIGN KEY (from_room_id) REFERENCES grow_rooms(id);

-- FK: plant_group_room_history_to_room_id_fkey
ALTER TABLE plant_group_room_history ADD CONSTRAINT plant_group_room_history_to_room_id_fkey FOREIGN KEY (to_room_id) REFERENCES grow_rooms(id);

-- FK: route_waypoints_route_id_fkey
ALTER TABLE route_waypoints ADD CONSTRAINT route_waypoints_route_id_fkey FOREIGN KEY (route_id) REFERENCES delivery_routes(id) ON DELETE CASCADE;

-- FK: batch_registry_coa_id_fkey
ALTER TABLE batch_registry ADD CONSTRAINT batch_registry_coa_id_fkey FOREIGN KEY (coa_id) REFERENCES certificates_of_analysis(id) ON DELETE SET NULL;

-- FK: batch_stage_tracking_batch_id_fkey
ALTER TABLE batch_stage_tracking ADD CONSTRAINT batch_stage_tracking_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batch_registry(id) ON DELETE CASCADE;

-- FK: batch_projections_batch_id_fkey
ALTER TABLE batch_projections ADD CONSTRAINT batch_projections_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batch_registry(id) ON DELETE CASCADE;

-- FK: batch_allocations_batch_id_fkey
ALTER TABLE batch_allocations ADD CONSTRAINT batch_allocations_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batch_registry(id) ON DELETE CASCADE;

-- FK: batch_allocations_order_item_id_fkey
ALTER TABLE batch_allocations ADD CONSTRAINT batch_allocations_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE;

-- FK: labels_label_type_id_fkey
ALTER TABLE labels ADD CONSTRAINT labels_label_type_id_fkey FOREIGN KEY (label_type_id) REFERENCES label_types(id);

-- FK: strain_aliases_strain_id_fkey
ALTER TABLE strain_aliases ADD CONSTRAINT strain_aliases_strain_id_fkey FOREIGN KEY (strain_id) REFERENCES strains(id) ON DELETE CASCADE;

-- FK: batch_registry_strain_id_fkey
ALTER TABLE batch_registry ADD CONSTRAINT batch_registry_strain_id_fkey FOREIGN KEY (strain_id) REFERENCES strains(id) ON DELETE RESTRICT;

-- FK: order_items_strain_id_fkey
ALTER TABLE order_items ADD CONSTRAINT order_items_strain_id_fkey FOREIGN KEY (strain_id) REFERENCES strains(id) ON DELETE RESTRICT;

-- FK: internal_bucked_inventory_strain_id_fkey
ALTER TABLE internal_bucked_inventory ADD CONSTRAINT internal_bucked_inventory_strain_id_fkey FOREIGN KEY (strain_id) REFERENCES strains(id) ON DELETE RESTRICT;

-- FK: internal_bulk_inventory_strain_id_fkey
ALTER TABLE internal_bulk_inventory ADD CONSTRAINT internal_bulk_inventory_strain_id_fkey FOREIGN KEY (strain_id) REFERENCES strains(id) ON DELETE RESTRICT;

-- FK: customers_parent_customer_id_fkey
ALTER TABLE customers ADD CONSTRAINT customers_parent_customer_id_fkey FOREIGN KEY (parent_customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- FK: customer_contacts_customer_id_fkey
ALTER TABLE customer_contacts ADD CONSTRAINT customer_contacts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- FK: customer_price_lists_customer_id_fkey
ALTER TABLE customer_price_lists ADD CONSTRAINT customer_price_lists_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- FK: customer_price_lists_product_id_fkey
ALTER TABLE customer_price_lists ADD CONSTRAINT customer_price_lists_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- FK: inventory_items_batch_id_fkey
ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batch_registry(id) ON DELETE SET NULL;

-- FK: inventory_items_product_stage_id_fkey
ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_product_stage_id_fkey FOREIGN KEY (product_stage_id) REFERENCES product_stages(id) ON DELETE SET NULL;

-- FK: inventory_items_parent_item_id_fkey
ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_parent_item_id_fkey FOREIGN KEY (parent_item_id) REFERENCES inventory_items(id) ON DELETE SET NULL;

-- FK: inventory_movements_source_item_id_fkey
ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_source_item_id_fkey FOREIGN KEY (source_item_id) REFERENCES inventory_items(id) ON DELETE SET NULL;

-- FK: inventory_movements_dest_item_id_fkey
ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_dest_item_id_fkey FOREIGN KEY (dest_item_id) REFERENCES inventory_items(id) ON DELETE SET NULL;

-- FK: order_items_batch_id_fkey
ALTER TABLE order_items ADD CONSTRAINT order_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batch_registry(id) ON DELETE SET NULL;

-- FK: certificates_of_analysis_batch_id_fkey
ALTER TABLE certificates_of_analysis ADD CONSTRAINT certificates_of_analysis_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batch_registry(id) ON DELETE SET NULL;

-- FK: harvest_sessions_plant_group_id_fkey
ALTER TABLE harvest_sessions ADD CONSTRAINT harvest_sessions_plant_group_id_fkey FOREIGN KEY (plant_group_id) REFERENCES plant_groups(id);

-- FK: harvest_sessions_batch_registry_id_fkey
ALTER TABLE harvest_sessions ADD CONSTRAINT harvest_sessions_batch_registry_id_fkey FOREIGN KEY (batch_registry_id) REFERENCES batch_registry(id);

-- FK: binning_sessions_harvest_session_id_fkey
ALTER TABLE binning_sessions ADD CONSTRAINT binning_sessions_harvest_session_id_fkey FOREIGN KEY (harvest_session_id) REFERENCES harvest_sessions(id);

-- FK: binning_sessions_dry_room_id_fkey
ALTER TABLE binning_sessions ADD CONSTRAINT binning_sessions_dry_room_id_fkey FOREIGN KEY (dry_room_id) REFERENCES dry_rooms(id);

-- FK: binning_sessions_batch_registry_id_fkey
ALTER TABLE binning_sessions ADD CONSTRAINT binning_sessions_batch_registry_id_fkey FOREIGN KEY (batch_registry_id) REFERENCES batch_registry(id);

-- FK: conversion_packages_batch_id_fkey
ALTER TABLE conversion_packages ADD CONSTRAINT conversion_packages_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batch_registry(id) ON DELETE RESTRICT;

-- FK: conversion_packages_product_id_fkey
ALTER TABLE conversion_packages ADD CONSTRAINT conversion_packages_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

-- FK: conversion_packages_inventory_stage_id_fkey
ALTER TABLE conversion_packages ADD CONSTRAINT conversion_packages_inventory_stage_id_fkey FOREIGN KEY (inventory_stage_id) REFERENCES product_stages(id);

-- FK: conversion_variance_log_batch_id_fkey
ALTER TABLE conversion_variance_log ADD CONSTRAINT conversion_variance_log_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batch_registry(id) ON DELETE RESTRICT;

-- FK: conversion_variance_log_product_id_fkey
ALTER TABLE conversion_variance_log ADD CONSTRAINT conversion_variance_log_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

-- FK: inventory_audit_lines_audit_id_fkey
ALTER TABLE inventory_audit_lines ADD CONSTRAINT inventory_audit_lines_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES inventory_audits(id) ON DELETE CASCADE;

-- FK: inventory_audit_lines_inventory_item_id_fkey
ALTER TABLE inventory_audit_lines ADD CONSTRAINT inventory_audit_lines_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE SET NULL;

-- FK: variance_log_inventory_item_id_fkey
ALTER TABLE variance_log ADD CONSTRAINT variance_log_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE SET NULL;

-- FK: variance_log_movement_id_fkey
ALTER TABLE variance_log ADD CONSTRAINT variance_log_movement_id_fkey FOREIGN KEY (movement_id) REFERENCES inventory_movements(id) ON DELETE SET NULL;

-- FK: package_assignments_order_id_fkey
ALTER TABLE package_assignments ADD CONSTRAINT package_assignments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- FK: package_assignments_order_item_id_fkey
ALTER TABLE package_assignments ADD CONSTRAINT package_assignments_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE;

-- FK: product_labels_package_assignment_id_fkey
ALTER TABLE product_labels ADD CONSTRAINT product_labels_package_assignment_id_fkey FOREIGN KEY (package_assignment_id) REFERENCES package_assignments(id) ON DELETE CASCADE;

-- FK: package_assignments_label_id_fkey
ALTER TABLE package_assignments ADD CONSTRAINT package_assignments_label_id_fkey FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE SET NULL;

-- FK: products_replaced_by_product_id_fkey
ALTER TABLE products ADD CONSTRAINT products_replaced_by_product_id_fkey FOREIGN KEY (replaced_by_product_id) REFERENCES products(id);

-- FK: batch_production_history_batch_id_fkey
ALTER TABLE batch_production_history ADD CONSTRAINT batch_production_history_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batch_registry(id) ON DELETE CASCADE;

-- FK: batch_package_lineage_batch_id_fkey
ALTER TABLE batch_package_lineage ADD CONSTRAINT batch_package_lineage_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batch_registry(id) ON DELETE CASCADE;

-- FK: batch_lifecycle_events_batch_id_fkey
ALTER TABLE batch_lifecycle_events ADD CONSTRAINT batch_lifecycle_events_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batch_registry(id) ON DELETE CASCADE;

-- FK: quarantine_violation_log_batch_id_fkey
ALTER TABLE quarantine_violation_log ADD CONSTRAINT quarantine_violation_log_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batch_registry(id) ON DELETE SET NULL;

-- FK: trim_sessions_batch_registry_id_fkey
ALTER TABLE trim_sessions ADD CONSTRAINT trim_sessions_batch_registry_id_fkey FOREIGN KEY (batch_registry_id) REFERENCES batch_registry(id) ON DELETE SET NULL;

-- FK: packaging_sessions_batch_registry_id_fkey
ALTER TABLE packaging_sessions ADD CONSTRAINT packaging_sessions_batch_registry_id_fkey FOREIGN KEY (batch_registry_id) REFERENCES batch_registry(id) ON DELETE SET NULL;

-- FK: bucking_sessions_batch_registry_id_fkey
ALTER TABLE bucking_sessions ADD CONSTRAINT bucking_sessions_batch_registry_id_fkey FOREIGN KEY (batch_registry_id) REFERENCES batch_registry(id) ON DELETE SET NULL;

-- FK: inventory_items_strain_id_fkey
ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_strain_id_fkey FOREIGN KEY (strain_id) REFERENCES strains(id) ON DELETE SET NULL;

-- FK: packaging_sessions_strain_id_fkey
ALTER TABLE packaging_sessions ADD CONSTRAINT packaging_sessions_strain_id_fkey FOREIGN KEY (strain_id) REFERENCES strains(id) ON DELETE SET NULL;

-- FK: trim_sessions_strain_id_fkey
ALTER TABLE trim_sessions ADD CONSTRAINT trim_sessions_strain_id_fkey FOREIGN KEY (strain_id) REFERENCES strains(id) ON DELETE SET NULL;

-- FK: labels_strain_id_fkey
ALTER TABLE labels ADD CONSTRAINT labels_strain_id_fkey FOREIGN KEY (strain_id) REFERENCES strains(id);

-- FK: room_tables_grow_room_id_fkey
ALTER TABLE room_tables ADD CONSTRAINT room_tables_grow_room_id_fkey FOREIGN KEY (grow_room_id) REFERENCES grow_rooms(id) ON DELETE CASCADE;

-- FK: room_sections_room_table_id_fkey
ALTER TABLE room_sections ADD CONSTRAINT room_sections_room_table_id_fkey FOREIGN KEY (room_table_id) REFERENCES room_tables(id) ON DELETE CASCADE;

-- FK: plant_groups_batch_registry_id_fkey
ALTER TABLE plant_groups ADD CONSTRAINT plant_groups_batch_registry_id_fkey FOREIGN KEY (batch_registry_id) REFERENCES batch_registry(id);

-- FK: individual_plants_plant_group_id_fkey
ALTER TABLE individual_plants ADD CONSTRAINT individual_plants_plant_group_id_fkey FOREIGN KEY (plant_group_id) REFERENCES plant_groups(id);

-- FK: plant_group_cut_sessions_plant_group_id_fkey
ALTER TABLE plant_group_cut_sessions ADD CONSTRAINT plant_group_cut_sessions_plant_group_id_fkey FOREIGN KEY (plant_group_id) REFERENCES plant_groups(id) ON DELETE CASCADE;

-- FK: plant_group_cut_sessions_mother_plant_group_id_fkey
ALTER TABLE plant_group_cut_sessions ADD CONSTRAINT plant_group_cut_sessions_mother_plant_group_id_fkey FOREIGN KEY (mother_plant_group_id) REFERENCES plant_groups(id);

-- FK: sales_rep_assignments_customer_id_fkey
ALTER TABLE sales_rep_assignments ADD CONSTRAINT sales_rep_assignments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- FK: crm_tasks_customer_id_fkey
ALTER TABLE crm_tasks ADD CONSTRAINT crm_tasks_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- FK: crm_tasks_assigned_user_id_fkey
ALTER TABLE crm_tasks ADD CONSTRAINT crm_tasks_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- FK: crm_tasks_related_activity_id_fkey
ALTER TABLE crm_tasks ADD CONSTRAINT crm_tasks_related_activity_id_fkey FOREIGN KEY (related_activity_id) REFERENCES customer_activity_log(id) ON DELETE SET NULL;

-- FK: crm_visit_schedule_customer_id_fkey
ALTER TABLE crm_visit_schedule ADD CONSTRAINT crm_visit_schedule_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- FK: crm_visit_schedule_user_id_fkey
ALTER TABLE crm_visit_schedule ADD CONSTRAINT crm_visit_schedule_user_id_fkey FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- FK: crm_visit_schedule_linked_activity_id_fkey
ALTER TABLE crm_visit_schedule ADD CONSTRAINT crm_visit_schedule_linked_activity_id_fkey FOREIGN KEY (linked_activity_id) REFERENCES customer_activity_log(id) ON DELETE SET NULL;

-- FK: customer_activity_log_linked_task_id_fkey
ALTER TABLE customer_activity_log ADD CONSTRAINT customer_activity_log_linked_task_id_fkey FOREIGN KEY (linked_task_id) REFERENCES crm_tasks(id) ON DELETE SET NULL;

-- FK: customer_activity_log_visit_id_fkey
ALTER TABLE customer_activity_log ADD CONSTRAINT customer_activity_log_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES crm_visit_schedule(id) ON DELETE SET NULL;

-- FK: customer_activity_log_user_id_fkey
ALTER TABLE customer_activity_log ADD CONSTRAINT customer_activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- FK: customer_activity_log_linked_order_id_fkey
ALTER TABLE customer_activity_log ADD CONSTRAINT customer_activity_log_linked_order_id_fkey FOREIGN KEY (linked_order_id) REFERENCES orders(id) ON DELETE SET NULL;

-- FK: quality_grade_history_previous_grade_id_fkey
ALTER TABLE quality_grade_history ADD CONSTRAINT quality_grade_history_previous_grade_id_fkey FOREIGN KEY (previous_grade_id) REFERENCES quality_grades(id);

-- FK: quality_grade_history_new_grade_id_fkey
ALTER TABLE quality_grade_history ADD CONSTRAINT quality_grade_history_new_grade_id_fkey FOREIGN KEY (new_grade_id) REFERENCES quality_grades(id);

-- FK: batch_registry_quality_grade_id_fkey
ALTER TABLE batch_registry ADD CONSTRAINT batch_registry_quality_grade_id_fkey FOREIGN KEY (quality_grade_id) REFERENCES quality_grades(id);

-- FK: inventory_items_quality_grade_id_fkey
ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_quality_grade_id_fkey FOREIGN KEY (quality_grade_id) REFERENCES quality_grades(id);
