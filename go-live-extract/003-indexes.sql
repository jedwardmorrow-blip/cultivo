-- ============================================================
-- Indexes
-- Source: https://fonreynkfeqywshijqpi.supabase.co
-- Extracted: 2026-03-02
-- Count: 377
-- ============================================================
CREATE UNIQUE INDEX app_settings_pkey ON public.app_settings USING btree (id);

CREATE UNIQUE INDEX app_settings_setting_key_key ON public.app_settings USING btree (setting_key);

CREATE INDEX idx_app_settings_category ON public.app_settings USING btree (category);

CREATE INDEX idx_app_settings_key ON public.app_settings USING btree (setting_key);

CREATE UNIQUE INDEX batch_allocations_pkey ON public.batch_allocations USING btree (id);

CREATE INDEX idx_batch_allocations_batch_id ON public.batch_allocations USING btree (batch_id);

CREATE INDEX idx_batch_allocations_created_at ON public.batch_allocations USING btree (created_at DESC);

CREATE INDEX idx_batch_allocations_order_item_id ON public.batch_allocations USING btree (order_item_id);

CREATE INDEX idx_batch_allocations_status ON public.batch_allocations USING btree (status);

CREATE UNIQUE INDEX batch_id_backfill_log_pkey ON public.batch_id_backfill_log USING btree (id);

CREATE UNIQUE INDEX batch_lifecycle_events_pkey ON public.batch_lifecycle_events USING btree (id);

CREATE INDEX idx_batch_lifecycle_events_batch ON public.batch_lifecycle_events USING btree (batch_id, event_timestamp DESC);

CREATE UNIQUE INDEX batch_package_lineage_pkey ON public.batch_package_lineage USING btree (id);

CREATE INDEX idx_batch_package_lineage_batch ON public.batch_package_lineage USING btree (batch_id) WHERE (is_current = true);

CREATE INDEX idx_batch_package_lineage_package ON public.batch_package_lineage USING btree (package_id);

CREATE UNIQUE INDEX idx_batch_package_unique ON public.batch_package_lineage USING btree (batch_id, package_id);

CREATE UNIQUE INDEX batch_production_history_pkey ON public.batch_production_history USING btree (id);

CREATE INDEX idx_batch_production_history_batch ON public.batch_production_history USING btree (batch_id, event_timestamp DESC);

CREATE INDEX idx_batch_production_history_session ON public.batch_production_history USING btree (session_id) WHERE (session_id IS NOT NULL);

CREATE UNIQUE INDEX batch_projections_pkey ON public.batch_projections USING btree (id);

CREATE UNIQUE INDEX batch_registry_batch_number_key ON public.batch_registry USING btree (batch_number);

CREATE UNIQUE INDEX batch_registry_pkey ON public.batch_registry USING btree (id);

CREATE INDEX idx_batch_registry_batch_number ON public.batch_registry USING btree (batch_number);

CREATE INDEX idx_batch_registry_coa_id ON public.batch_registry USING btree (coa_id) WHERE (coa_id IS NOT NULL);

CREATE INDEX idx_batch_registry_created_at ON public.batch_registry USING btree (created_at DESC);

CREATE INDEX idx_batch_registry_harvest_date ON public.batch_registry USING btree (harvest_date DESC);

CREATE INDEX idx_batch_registry_quality_grade ON public.batch_registry USING btree (quality_grade_id);

CREATE INDEX idx_batch_registry_status ON public.batch_registry USING btree (status);

CREATE INDEX idx_batch_registry_strain ON public.batch_registry USING btree (strain);

CREATE INDEX idx_batch_registry_strain_active ON public.batch_registry USING btree (strain, status) WHERE (status = 'active'::text);

CREATE INDEX idx_batch_registry_strain_id ON public.batch_registry USING btree (strain_id);

CREATE INDEX idx_batch_registry_strain_status_harvest ON public.batch_registry USING btree (strain_id, status, harvest_date DESC) WHERE (status = 'active'::text);

CREATE UNIQUE INDEX batch_stage_tracking_batch_id_stage_key ON public.batch_stage_tracking USING btree (batch_id, stage);

CREATE UNIQUE INDEX batch_stage_tracking_pkey ON public.batch_stage_tracking USING btree (id);

CREATE INDEX idx_batch_stage_tracking_batch_id ON public.batch_stage_tracking USING btree (batch_id);

CREATE INDEX idx_batch_stage_tracking_stage ON public.batch_stage_tracking USING btree (stage);

CREATE UNIQUE INDEX binning_sessions_one_per_harvest ON public.binning_sessions USING btree (harvest_session_id);

CREATE UNIQUE INDEX binning_sessions_pkey ON public.binning_sessions USING btree (id);

CREATE INDEX idx_binning_sessions_batch_registry_id ON public.binning_sessions USING btree (batch_registry_id);

CREATE INDEX idx_binning_sessions_harvest_session_id ON public.binning_sessions USING btree (harvest_session_id);

CREATE UNIQUE INDEX bucked_inventory_pkey ON public.bucked_inventory USING btree (id);

CREATE INDEX idx_bucked_inventory_status ON public.bucked_inventory USING btree (status);

CREATE UNIQUE INDEX bucking_sessions_pkey ON public.bucking_sessions USING btree (id);

CREATE INDEX idx_bucking_sessions_active ON public.bucking_sessions USING btree (session_status, started_at DESC) WHERE (session_status = 'active'::text);

CREATE INDEX idx_bucking_sessions_batch_registry_id ON public.bucking_sessions USING btree (batch_registry_id) WHERE (batch_registry_id IS NOT NULL);

CREATE INDEX idx_bucking_sessions_completed_at ON public.bucking_sessions USING btree (completed_at DESC) WHERE (completed_at IS NOT NULL);

CREATE INDEX idx_bucking_sessions_created_at ON public.bucking_sessions USING btree (created_at DESC);

CREATE INDEX idx_bucking_sessions_finalization_bucked ON public.bucking_sessions USING btree (finalization_status_bucked, session_date) WHERE (session_status <> 'cancelled'::text);

CREATE INDEX idx_bucking_sessions_finalization_smalls ON public.bucking_sessions USING btree (finalization_status_smalls, session_date) WHERE (session_status <> 'cancelled'::text);

CREATE INDEX idx_bucking_sessions_status ON public.bucking_sessions USING btree (session_status);

CREATE UNIQUE INDEX bulk_inventory_pkey ON public.bulk_inventory USING btree (id);

CREATE UNIQUE INDEX certificates_of_analysis_pkey ON public.certificates_of_analysis USING btree (id);

CREATE UNIQUE INDEX certificates_of_analysis_unique_active_per_batch ON public.certificates_of_analysis USING btree (batch_id) WHERE ((is_active = true) AND (batch_id IS NOT NULL));

CREATE INDEX idx_coa_batch_id ON public.certificates_of_analysis USING btree (batch_id) WHERE (batch_id IS NOT NULL);

CREATE INDEX idx_coa_batch_number ON public.certificates_of_analysis USING btree (batch_number);

CREATE INDEX idx_coa_harvest_date ON public.certificates_of_analysis USING btree (harvest_date DESC);

CREATE UNIQUE INDEX coa_documents_coa_number_key ON public.coa_documents USING btree (coa_number);

CREATE UNIQUE INDEX coa_documents_pkey ON public.coa_documents USING btree (id);

CREATE UNIQUE INDEX consolidated_package_sources_pkey ON public.consolidated_package_sources USING btree (id);

CREATE INDEX idx_consolidated_sources_package ON public.consolidated_package_sources USING btree (consolidated_package_id);

CREATE UNIQUE INDEX consolidated_packages_package_id_key ON public.consolidated_packages USING btree (package_id);

CREATE UNIQUE INDEX consolidated_packages_pkey ON public.consolidated_packages USING btree (id);

CREATE INDEX idx_consolidated_packages_date ON public.consolidated_packages USING btree (package_date DESC);

CREATE UNIQUE INDEX conversion_analytics_analysis_date_strain_from_stage_to_sta_key ON public.conversion_analytics USING btree (analysis_date, strain, from_stage, to_stage);

CREATE UNIQUE INDEX conversion_analytics_pkey ON public.conversion_analytics USING btree (id);

CREATE UNIQUE INDEX conversion_packages_package_id_key ON public.conversion_packages USING btree (package_id);

CREATE UNIQUE INDEX conversion_packages_pkey ON public.conversion_packages USING btree (id);

CREATE INDEX idx_conversion_packages_aggregation_id ON public.conversion_packages USING btree (aggregation_id);

CREATE INDEX idx_conversion_packages_batch_id ON public.conversion_packages USING btree (batch_id) WHERE (batch_id IS NOT NULL);

CREATE INDEX idx_conversion_packages_batch_status ON public.conversion_packages USING btree (batch_id, finalization_status) WHERE (batch_id IS NOT NULL);

CREATE INDEX idx_conversion_packages_created_at ON public.conversion_packages USING btree (created_at DESC);

CREATE INDEX idx_conversion_packages_created_by ON public.conversion_packages USING btree (created_by);

CREATE INDEX idx_conversion_packages_finalization_status ON public.conversion_packages USING btree (finalization_status) WHERE (finalization_status <> 'voided'::finalization_status);

CREATE INDEX idx_conversion_packages_inventory_stage_id ON public.conversion_packages USING btree (inventory_stage_id);

CREATE INDEX idx_conversion_packages_product_id ON public.conversion_packages USING btree (product_id);

CREATE UNIQUE INDEX conversion_rates_pkey ON public.conversion_rates USING btree (id);

CREATE UNIQUE INDEX conversion_variance_log_pkey ON public.conversion_variance_log USING btree (id);

CREATE INDEX idx_conversion_variance_log_acknowledged_by ON public.conversion_variance_log USING btree (acknowledged_by);

CREATE UNIQUE INDEX coversheets_access_token_key ON public.coversheets USING btree (access_token);

CREATE UNIQUE INDEX coversheets_coversheet_number_key ON public.coversheets USING btree (coversheet_number);

CREATE UNIQUE INDEX coversheets_pkey ON public.coversheets USING btree (id);

CREATE INDEX idx_coversheets_access_token ON public.coversheets USING btree (access_token);

CREATE INDEX idx_coversheets_order_id ON public.coversheets USING btree (order_id);

CREATE UNIQUE INDEX crm_tasks_pkey ON public.crm_tasks USING btree (id);

CREATE INDEX idx_crm_tasks_assigned_user_id ON public.crm_tasks USING btree (assigned_user_id);

CREATE INDEX idx_crm_tasks_customer_id ON public.crm_tasks USING btree (customer_id);

CREATE INDEX idx_crm_tasks_due_date ON public.crm_tasks USING btree (due_date);

CREATE INDEX idx_crm_tasks_status ON public.crm_tasks USING btree (status);

CREATE INDEX idx_crm_tasks_status_due_date ON public.crm_tasks USING btree (status, due_date);

CREATE UNIQUE INDEX crm_visit_schedule_pkey ON public.crm_visit_schedule USING btree (id);

CREATE INDEX idx_crm_visit_schedule_customer_id ON public.crm_visit_schedule USING btree (customer_id);

CREATE INDEX idx_crm_visit_schedule_status ON public.crm_visit_schedule USING btree (status);

CREATE INDEX idx_crm_visit_schedule_user_id ON public.crm_visit_schedule USING btree (user_id);

CREATE INDEX idx_crm_visit_schedule_visit_date ON public.crm_visit_schedule USING btree (visit_date);

CREATE UNIQUE INDEX customer_activity_log_pkey ON public.customer_activity_log USING btree (id);

CREATE INDEX idx_customer_activity_log_customer_id ON public.customer_activity_log USING btree (customer_id);

CREATE INDEX idx_customer_activity_log_follow_up ON public.customer_activity_log USING btree (follow_up_date) WHERE ((follow_up_date IS NOT NULL) AND (completed = false));

CREATE INDEX idx_customer_activity_log_pinned ON public.customer_activity_log USING btree (customer_id, pinned) WHERE (pinned = true);

CREATE INDEX idx_customer_activity_log_user_id ON public.customer_activity_log USING btree (user_id);

CREATE UNIQUE INDEX customer_contacts_pkey ON public.customer_contacts USING btree (id);

CREATE INDEX idx_customer_contacts_customer_id ON public.customer_contacts USING btree (customer_id);

CREATE UNIQUE INDEX customer_price_lists_customer_id_product_id_effective_date_key ON public.customer_price_lists USING btree (customer_id, product_id, effective_date);

CREATE UNIQUE INDEX customer_price_lists_pkey ON public.customer_price_lists USING btree (id);

CREATE INDEX idx_customer_price_lists_customer_id ON public.customer_price_lists USING btree (customer_id);

CREATE INDEX idx_customer_price_lists_product_id ON public.customer_price_lists USING btree (product_id);

CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id);

CREATE UNIQUE INDEX dispensary_code_unique ON public.customers USING btree (dispensary_code);

CREATE INDEX idx_customers_account_status ON public.customers USING btree (account_status);

CREATE INDEX idx_customers_account_type ON public.customers USING btree (account_type);

CREATE INDEX idx_customers_delivery_model ON public.customers USING btree (delivery_model);

CREATE INDEX idx_customers_parent_customer_id ON public.customers USING btree (parent_customer_id) WHERE (parent_customer_id IS NOT NULL);

CREATE UNIQUE INDEX delivery_drivers_fa_number_key ON public.delivery_drivers USING btree (fa_number);

CREATE UNIQUE INDEX delivery_drivers_pkey ON public.delivery_drivers USING btree (id);

CREATE UNIQUE INDEX delivery_routes_pkey ON public.delivery_routes USING btree (id);

CREATE INDEX idx_delivery_routes_customers ON public.delivery_routes USING btree (origin_customer_id, destination_customer_id);

CREATE UNIQUE INDEX delivery_schedule_pkey ON public.delivery_schedule USING btree (id);

CREATE INDEX idx_delivery_schedule_order_id ON public.delivery_schedule USING btree (order_id);

CREATE UNIQUE INDEX delivery_vehicles_pkey ON public.delivery_vehicles USING btree (id);

CREATE UNIQUE INDEX delivery_vehicles_vin_key ON public.delivery_vehicles USING btree (vin);

CREATE UNIQUE INDEX draft_orders_pkey ON public.draft_orders USING btree (id);

CREATE INDEX idx_draft_orders_customer_id ON public.draft_orders USING btree (customer_id);

CREATE UNIQUE INDEX dry_rooms_pkey ON public.dry_rooms USING btree (id);

CREATE UNIQUE INDEX dry_rooms_room_code_unique ON public.dry_rooms USING btree (room_code);

CREATE UNIQUE INDEX grow_rooms_pkey ON public.grow_rooms USING btree (id);

CREATE UNIQUE INDEX grow_rooms_room_code_unique ON public.grow_rooms USING btree (room_code);

CREATE INDEX idx_grow_rooms_active_code ON public.grow_rooms USING btree (room_code) WHERE (is_active = true);

CREATE UNIQUE INDEX harvest_sessions_pkey ON public.harvest_sessions USING btree (id);

CREATE INDEX idx_harvest_sessions_batch ON public.harvest_sessions USING btree (batch_registry_id) WHERE (batch_registry_id IS NOT NULL);

CREATE INDEX idx_harvest_sessions_dry_room ON public.harvest_sessions USING btree (dry_room_id);

CREATE INDEX idx_harvest_sessions_grow_room ON public.harvest_sessions USING btree (grow_room_id);

CREATE INDEX idx_harvest_sessions_plant_group ON public.harvest_sessions USING btree (plant_group_id);

CREATE INDEX idx_harvest_sessions_status ON public.harvest_sessions USING btree (session_status);

CREATE UNIQUE INDEX harvest_weight_entries_pkey ON public.harvest_weight_entries USING btree (id);

CREATE INDEX idx_harvest_weight_entries_session ON public.harvest_weight_entries USING btree (harvest_session_id);

CREATE INDEX idx_individual_plants_plant_group_id ON public.individual_plants USING btree (plant_group_id);

CREATE UNIQUE INDEX individual_plants_pkey ON public.individual_plants USING btree (id);

CREATE UNIQUE INDEX individual_plants_state_plant_id_unique ON public.individual_plants USING btree (state_plant_id);

CREATE INDEX idx_internal_bucked_inventory_synced_from_snapshot_id ON public.internal_bucked_inventory USING btree (synced_from_snapshot_id);

CREATE UNIQUE INDEX internal_bucked_inventory_pkey ON public.internal_bucked_inventory USING btree (package_id);

CREATE INDEX idx_internal_bulk_inventory_strain_id ON public.internal_bulk_inventory USING btree (strain_id);

CREATE INDEX idx_internal_bulk_strain_type ON public.internal_bulk_inventory USING btree (strain, product_type);

CREATE UNIQUE INDEX internal_bulk_inventory_pkey ON public.internal_bulk_inventory USING btree (id);

CREATE INDEX idx_internal_packaged_inventory_packaging_session_id ON public.internal_packaged_inventory USING btree (packaging_session_id);

CREATE INDEX idx_internal_packaged_strain_type ON public.internal_packaged_inventory USING btree (strain, product_type);

CREATE UNIQUE INDEX internal_packaged_inventory_pkey ON public.internal_packaged_inventory USING btree (id);

CREATE INDEX idx_inventory_audit_lines_inventory_item_id ON public.inventory_audit_lines USING btree (inventory_item_id);

CREATE UNIQUE INDEX inventory_audit_lines_pkey ON public.inventory_audit_lines USING btree (id);

CREATE INDEX idx_inventory_audits_cancelled_by ON public.inventory_audits USING btree (cancelled_by);

CREATE INDEX idx_inventory_audits_completed_by ON public.inventory_audits USING btree (completed_by);

CREATE INDEX idx_inventory_audits_initiated_at ON public.inventory_audits USING btree (initiated_at DESC);

CREATE INDEX idx_inventory_audits_status ON public.inventory_audits USING btree (status);

CREATE UNIQUE INDEX inventory_audits_audit_number_key ON public.inventory_audits USING btree (audit_number);

CREATE UNIQUE INDEX inventory_audits_pkey ON public.inventory_audits USING btree (id);

CREATE INDEX idx_inventory_changes_change_date ON public.inventory_changes USING btree (change_date DESC);

CREATE INDEX idx_inventory_changes_change_type ON public.inventory_changes USING btree (change_type);

CREATE INDEX idx_inventory_changes_package_id ON public.inventory_changes USING btree (package_id);

CREATE INDEX idx_inventory_changes_snapshot_id ON public.inventory_changes USING btree (snapshot_id);

CREATE UNIQUE INDEX inventory_changes_pkey ON public.inventory_changes USING btree (id);

CREATE INDEX idx_inventory_conversions_trim_session_id ON public.inventory_conversions USING btree (trim_session_id);

CREATE UNIQUE INDEX inventory_conversions_pkey ON public.inventory_conversions USING btree (id);

CREATE UNIQUE INDEX inventory_internal_labels_pkey ON public.inventory_internal_labels USING btree (id);

CREATE INDEX idx_inventory_items_batch ON public.inventory_items USING btree (batch);

CREATE INDEX idx_inventory_items_batch_id ON public.inventory_items USING btree (batch_id) WHERE (batch_id IS NOT NULL);

CREATE INDEX idx_inventory_items_batch_number ON public.inventory_items USING btree (batch_number) WHERE (batch_number IS NOT NULL);

CREATE INDEX idx_inventory_items_category ON public.inventory_items USING btree (category);

CREATE INDEX idx_inventory_items_package_id ON public.inventory_items USING btree (package_id);

CREATE INDEX idx_inventory_items_parent_item_id ON public.inventory_items USING btree (parent_item_id) WHERE (parent_item_id IS NOT NULL);

CREATE INDEX idx_inventory_items_pending_created ON public.inventory_items USING btree (review_status, created_at DESC) WHERE (review_status = 'pending_review'::text);

CREATE INDEX idx_inventory_items_product_stage_id ON public.inventory_items USING btree (product_stage_id) WHERE (product_stage_id IS NOT NULL);

CREATE INDEX idx_inventory_items_quality_grade ON public.inventory_items USING btree (quality_grade_id);

CREATE INDEX idx_inventory_items_review_status ON public.inventory_items USING btree (review_status) WHERE (review_status IS NOT NULL);

CREATE INDEX idx_inventory_items_reviewed_at ON public.inventory_items USING btree (reviewed_at DESC) WHERE (reviewed_at IS NOT NULL);

CREATE INDEX idx_inventory_items_reviewed_by ON public.inventory_items USING btree (reviewed_by) WHERE (reviewed_by IS NOT NULL);

CREATE INDEX idx_inventory_items_snapshot_id ON public.inventory_items USING btree (snapshot_id);

CREATE INDEX idx_inventory_items_status ON public.inventory_items USING btree (status);

CREATE INDEX idx_inventory_items_strain ON public.inventory_items USING btree (strain);

CREATE INDEX idx_inventory_items_strain_id ON public.inventory_items USING btree (strain_id) WHERE (strain_id IS NOT NULL);

CREATE INDEX idx_inventory_items_test_mode ON public.inventory_items USING btree (test_mode);

CREATE UNIQUE INDEX inventory_items_package_id_key ON public.inventory_items USING btree (package_id);

CREATE UNIQUE INDEX inventory_items_pkey ON public.inventory_items USING btree (id);

CREATE INDEX idx_movement_errors_created ON public.inventory_movement_errors USING btree (created_at DESC);

CREATE INDEX idx_movement_errors_unresolved ON public.inventory_movement_errors USING btree (resolved_at) WHERE (resolved_at IS NULL);

CREATE UNIQUE INDEX inventory_movement_errors_pkey ON public.inventory_movement_errors USING btree (id);

CREATE INDEX idx_inventory_movements_date ON public.inventory_movements USING btree (movement_date DESC);

CREATE INDEX idx_inventory_movements_dest_item_id ON public.inventory_movements USING btree (dest_item_id) WHERE (dest_item_id IS NOT NULL);

CREATE INDEX idx_inventory_movements_kind ON public.inventory_movements USING btree (movement_kind);

CREATE INDEX idx_inventory_movements_reference_id ON public.inventory_movements USING btree (reference_id);

CREATE INDEX idx_inventory_movements_reference_type ON public.inventory_movements USING btree (reference_type);

CREATE INDEX idx_inventory_movements_source_date ON public.inventory_movements USING btree (source_item_id, movement_date DESC) WHERE (source_item_id IS NOT NULL);

CREATE INDEX idx_inventory_movements_source_item_id ON public.inventory_movements USING btree (source_item_id) WHERE (source_item_id IS NOT NULL);

CREATE UNIQUE INDEX inventory_movements_pkey ON public.inventory_movements USING btree (id);

CREATE INDEX idx_inventory_reconciliation_previous_snapshot_id ON public.inventory_reconciliation USING btree (previous_snapshot_id);

CREATE UNIQUE INDEX inventory_reconciliation_pkey ON public.inventory_reconciliation USING btree (id);

CREATE UNIQUE INDEX inventory_snapshots_pkey ON public.inventory_snapshots USING btree (id);

CREATE UNIQUE INDEX inventory_variances_pkey ON public.inventory_variances USING btree (id);

CREATE INDEX idx_invoices_created_at ON public.invoices USING btree (created_at DESC);

CREATE INDEX idx_invoices_customer_id ON public.invoices USING btree (customer_id);

CREATE INDEX idx_invoices_order_id ON public.invoices USING btree (order_id);

CREATE UNIQUE INDEX invoices_invoice_number_key ON public.invoices USING btree (invoice_number);

CREATE UNIQUE INDEX invoices_pkey ON public.invoices USING btree (id);

CREATE UNIQUE INDEX label_types_code_key ON public.label_types USING btree (code);

CREATE UNIQUE INDEX label_types_name_key ON public.label_types USING btree (name);

CREATE UNIQUE INDEX label_types_pkey ON public.label_types USING btree (id);

CREATE INDEX idx_labels_batch_id ON public.labels USING btree (batch_id) WHERE (batch_id IS NOT NULL);

CREATE INDEX idx_labels_created_at ON public.labels USING btree (created_at DESC);

CREATE INDEX idx_labels_label_type_id ON public.labels USING btree (label_type_id);

CREATE INDEX idx_labels_last_printed_at ON public.labels USING btree (last_printed_at) WHERE (last_printed_at IS NOT NULL);

CREATE INDEX idx_labels_package_id ON public.labels USING btree (package_id);

CREATE INDEX idx_labels_print_count ON public.labels USING btree (print_count) WHERE (print_count > 0);

CREATE INDEX idx_labels_product_id ON public.labels USING btree (product_id);

CREATE INDEX idx_labels_strain_id ON public.labels USING btree (strain_id);

CREATE INDEX idx_labels_voided_by ON public.labels USING btree (voided_by);

CREATE UNIQUE INDEX labels_label_number_key ON public.labels USING btree (label_number);

CREATE UNIQUE INDEX labels_pkey ON public.labels USING btree (id);

CREATE UNIQUE INDEX manifests_manifest_number_key ON public.manifests USING btree (manifest_number);

CREATE UNIQUE INDEX manifests_pkey ON public.manifests USING btree (id);

CREATE UNIQUE INDEX monthly_performance_metrics_month_key ON public.monthly_performance_metrics USING btree (month);

CREATE UNIQUE INDEX monthly_performance_metrics_pkey ON public.monthly_performance_metrics USING btree (id);

CREATE UNIQUE INDEX notification_preferences_event_type_key ON public.notification_preferences USING btree (event_type);

CREATE UNIQUE INDEX notification_preferences_pkey ON public.notification_preferences USING btree (id);

CREATE UNIQUE INDEX order_forecasts_pkey ON public.order_forecasts USING btree (id);

CREATE INDEX idx_fulfillment_order_item ON public.order_fulfillment_checklist USING btree (order_item_id);

CREATE INDEX idx_order_fulfillment_checklist_order_id ON public.order_fulfillment_checklist USING btree (order_id);

CREATE UNIQUE INDEX order_fulfillment_checklist_order_item_id_key ON public.order_fulfillment_checklist USING btree (order_item_id);

CREATE UNIQUE INDEX order_fulfillment_checklist_pkey ON public.order_fulfillment_checklist USING btree (id);

CREATE INDEX idx_fulfillment_order ON public.order_fulfillment_items USING btree (order_id);

CREATE INDEX idx_fulfillment_packaging_session ON public.order_fulfillment_items USING btree (packaging_session_id);

CREATE INDEX idx_order_fulfillment_items_order_item_id ON public.order_fulfillment_items USING btree (order_item_id);

CREATE INDEX idx_order_fulfillment_items_packaged_inventory_id ON public.order_fulfillment_items USING btree (packaged_inventory_id);

CREATE UNIQUE INDEX order_fulfillment_items_pkey ON public.order_fulfillment_items USING btree (id);

CREATE INDEX idx_order_items_batch_id ON public.order_items USING btree (batch_id) WHERE (batch_id IS NOT NULL);

CREATE INDEX idx_order_items_batch_strain ON public.order_items USING btree (batch_id, strain_id) WHERE (batch_id IS NOT NULL);

CREATE INDEX idx_order_items_is_sample ON public.order_items USING btree (order_id) WHERE (is_sample = true);

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);

CREATE INDEX idx_order_items_status ON public.order_items USING btree (status);

CREATE INDEX idx_order_items_strain_id ON public.order_items USING btree (strain_id);

CREATE INDEX idx_order_items_test_mode ON public.order_items USING btree (test_mode);

CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id);

CREATE INDEX idx_orders_archived ON public.orders USING btree (archived) WHERE (archived = false);

CREATE INDEX idx_orders_customer_id ON public.orders USING btree (customer_id);

CREATE INDEX idx_orders_customer_status ON public.orders USING btree (customer_id, status) WHERE (status <> ALL (ARRAY['completed'::text, 'cancelled'::text]));

CREATE INDEX idx_orders_order_date ON public.orders USING btree (order_date DESC);

CREATE INDEX idx_orders_scheduled_delivery_date ON public.orders USING btree (scheduled_delivery_date DESC);

CREATE INDEX idx_orders_status ON public.orders USING btree (status);

CREATE INDEX idx_orders_test_mode ON public.orders USING btree (test_mode);

CREATE UNIQUE INDEX orders_order_number_key ON public.orders USING btree (order_number);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

CREATE UNIQUE INDEX orders_public_token_key ON public.orders USING btree (public_token);

CREATE INDEX idx_package_assignments_assigned_at ON public.package_assignments USING btree (assigned_at DESC);

CREATE INDEX idx_package_assignments_assigned_by ON public.package_assignments USING btree (assigned_by);

CREATE INDEX idx_package_assignments_order ON public.package_assignments USING btree (order_id);

CREATE INDEX idx_package_assignments_order_id ON public.package_assignments USING btree (order_id);

CREATE INDEX idx_package_assignments_order_item ON public.package_assignments USING btree (order_item_id);

CREATE INDEX idx_package_assignments_order_item_id ON public.package_assignments USING btree (order_item_id);

CREATE INDEX idx_package_assignments_package_id ON public.package_assignments USING btree (package_id);

CREATE UNIQUE INDEX package_assignments_pkey ON public.package_assignments USING btree (id);

CREATE INDEX idx_packaging_schedule_order_id ON public.packaging_schedule USING btree (order_id);

CREATE UNIQUE INDEX packaging_schedule_pkey ON public.packaging_schedule USING btree (id);

CREATE INDEX idx_packaging_batch_analytics ON public.packaging_sessions USING btree (batch_registry_id, finalization_status_3_5g, finalization_status_14g, finalization_status_1lb) WHERE ((session_status <> 'cancelled'::text) AND (test_mode = false));

CREATE INDEX idx_packaging_pending_conversions ON public.packaging_sessions USING btree (batch_registry_id, strain_id, finalization_status_3_5g, finalization_status_14g, finalization_status_1lb) WHERE ((session_status = 'completed'::text) AND (test_mode = false));

CREATE INDEX idx_packaging_sessions_batch_registry_id ON public.packaging_sessions USING btree (batch_registry_id) WHERE (batch_registry_id IS NOT NULL);

CREATE INDEX idx_packaging_sessions_completed_at ON public.packaging_sessions USING btree (completed_at DESC) WHERE (completed_at IS NOT NULL);

CREATE INDEX idx_packaging_sessions_created_at ON public.packaging_sessions USING btree (created_at DESC);

CREATE INDEX idx_packaging_sessions_date ON public.packaging_sessions USING btree (session_date DESC);

CREATE INDEX idx_packaging_sessions_finalization_14g ON public.packaging_sessions USING btree (finalization_status_14g, session_date) WHERE ((session_status <> 'cancelled'::text) AND (test_mode = false) AND (COALESCE(units_14g, 0) > 0));

CREATE INDEX idx_packaging_sessions_finalization_1lb ON public.packaging_sessions USING btree (finalization_status_1lb, session_date) WHERE ((session_status <> 'cancelled'::text) AND (test_mode = false) AND (COALESCE(units_454g, 0) > 0));

CREATE INDEX idx_packaging_sessions_finalization_3_5g ON public.packaging_sessions USING btree (finalization_status_3_5g, session_date) WHERE ((session_status <> 'cancelled'::text) AND (test_mode = false) AND (COALESCE(units_3_5g, 0) > 0));

CREATE INDEX idx_packaging_sessions_finalization_packaged ON public.packaging_sessions USING btree (finalization_status_packaged, session_date) WHERE ((session_status <> 'cancelled'::text) AND (test_mode = false));

CREATE INDEX idx_packaging_sessions_finalization_status_14g ON public.packaging_sessions USING btree (finalization_status_14g) WHERE (finalization_status_14g IS NOT NULL);

CREATE INDEX idx_packaging_sessions_finalization_status_1lb ON public.packaging_sessions USING btree (finalization_status_1lb) WHERE (finalization_status_1lb IS NOT NULL);

CREATE INDEX idx_packaging_sessions_finalization_status_3_5g ON public.packaging_sessions USING btree (finalization_status_3_5g) WHERE (finalization_status_3_5g IS NOT NULL);

CREATE INDEX idx_packaging_sessions_status ON public.packaging_sessions USING btree (session_status);

CREATE INDEX idx_packaging_sessions_status_date ON public.packaging_sessions USING btree (session_status, session_date DESC);

CREATE INDEX idx_packaging_sessions_strain_id ON public.packaging_sessions USING btree (strain_id);

CREATE INDEX idx_packaging_sessions_test_mode ON public.packaging_sessions USING btree (test_mode);

CREATE UNIQUE INDEX packaging_sessions_pkey ON public.packaging_sessions USING btree (id);

CREATE UNIQUE INDEX packaging_yield_history_pkey ON public.packaging_yield_history USING btree (id);

CREATE INDEX idx_packaging_yields_packaging_session_id ON public.packaging_yields USING btree (packaging_session_id);

CREATE UNIQUE INDEX packaging_yields_pkey ON public.packaging_yields USING btree (id);

CREATE INDEX idx_cut_sessions_mother_id ON public.plant_group_cut_sessions USING btree (mother_plant_group_id);

CREATE INDEX idx_cut_sessions_plant_group_id ON public.plant_group_cut_sessions USING btree (plant_group_id);

CREATE UNIQUE INDEX plant_group_cut_sessions_pkey ON public.plant_group_cut_sessions USING btree (id);

CREATE INDEX idx_plant_group_room_history_group ON public.plant_group_room_history USING btree (plant_group_id);

CREATE UNIQUE INDEX plant_group_room_history_pkey ON public.plant_group_room_history USING btree (id);

CREATE INDEX idx_plant_group_stage_history_group ON public.plant_group_stage_history USING btree (plant_group_id);

CREATE UNIQUE INDEX plant_group_stage_history_pkey ON public.plant_group_stage_history USING btree (id);

CREATE INDEX idx_plant_groups_batch_registry_id ON public.plant_groups USING btree (batch_registry_id);

CREATE INDEX idx_plant_groups_grow_room_id ON public.plant_groups USING btree (grow_room_id);

CREATE INDEX idx_plant_groups_growth_stage ON public.plant_groups USING btree (growth_stage);

CREATE INDEX idx_plant_groups_mother_id ON public.plant_groups USING btree (mother_plant_group_id) WHERE (mother_plant_group_id IS NOT NULL);

CREATE INDEX idx_plant_groups_room_section_id ON public.plant_groups USING btree (room_section_id) WHERE (room_section_id IS NOT NULL);

CREATE INDEX idx_plant_groups_room_stage ON public.plant_groups USING btree (grow_room_id, growth_stage);

CREATE INDEX idx_plant_groups_room_table_id ON public.plant_groups USING btree (room_table_id) WHERE (room_table_id IS NOT NULL);

CREATE INDEX idx_plant_groups_source_type ON public.plant_groups USING btree (source_type);

CREATE INDEX idx_plant_groups_strain_id ON public.plant_groups USING btree (strain_id);

CREATE UNIQUE INDEX plant_groups_pkey ON public.plant_groups USING btree (id);

CREATE INDEX idx_product_labels_printed_by ON public.product_labels USING btree (printed_by);

CREATE UNIQUE INDEX product_labels_label_number_key ON public.product_labels USING btree (label_number);

CREATE UNIQUE INDEX product_labels_pkey ON public.product_labels USING btree (id);

CREATE INDEX idx_product_stages_sort_order ON public.product_stages USING btree (sort_order);

CREATE UNIQUE INDEX product_stages_name_key ON public.product_stages USING btree (name);

CREATE UNIQUE INDEX product_stages_pkey ON public.product_stages USING btree (id);

CREATE INDEX idx_product_types_sort_order ON public.product_types USING btree (sort_order);

CREATE UNIQUE INDEX product_types_name_key ON public.product_types USING btree (name);

CREATE UNIQUE INDEX product_types_pkey ON public.product_types USING btree (id);

CREATE INDEX idx_products_category ON public.products USING btree (product_category);

CREATE INDEX idx_products_is_active ON public.products USING btree (is_active);

CREATE INDEX idx_products_is_archived ON public.products USING btree (is_archived) WHERE (is_archived = false);

CREATE INDEX idx_products_orderable ON public.products USING btree (stage_id, product_category, is_active) WHERE (is_active = true);

CREATE INDEX idx_products_stage_id ON public.products USING btree (stage_id);

CREATE INDEX idx_products_strain_id ON public.products USING btree (strain_id);

CREATE INDEX idx_products_type_id ON public.products USING btree (type_id);

CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id);

CREATE UNIQUE INDEX products_sku_key ON public.products USING btree (sku) WHERE (sku IS NOT NULL);

CREATE UNIQUE INDEX products_strain_type_stage_unique ON public.products USING btree (strain_id, type_id, stage_id);

CREATE INDEX idx_quality_grade_history_created ON public.quality_grade_history USING btree (created_at DESC);

CREATE INDEX idx_quality_grade_history_entity ON public.quality_grade_history USING btree (entity_type, entity_id);

CREATE UNIQUE INDEX quality_grade_history_pkey ON public.quality_grade_history USING btree (id);

CREATE UNIQUE INDEX quality_grades_code_key ON public.quality_grades USING btree (code);

CREATE UNIQUE INDEX quality_grades_pkey ON public.quality_grades USING btree (id);

CREATE INDEX idx_quarantine_violation_batch ON public.quarantine_violation_log USING btree (batch_id) WHERE (batch_id IS NOT NULL);

CREATE INDEX idx_quarantine_violation_blocked_at ON public.quarantine_violation_log USING btree (blocked_at DESC);

CREATE UNIQUE INDEX quarantine_violation_log_pkey ON public.quarantine_violation_log USING btree (id);

CREATE INDEX idx_room_sections_room_table_id ON public.room_sections USING btree (room_table_id);

CREATE UNIQUE INDEX room_sections_pkey ON public.room_sections USING btree (id);

CREATE UNIQUE INDEX room_sections_unique_label_per_table ON public.room_sections USING btree (room_table_id, section_label);

CREATE INDEX idx_room_tables_grow_room_id ON public.room_tables USING btree (grow_room_id);

CREATE UNIQUE INDEX room_tables_pkey ON public.room_tables USING btree (id);

CREATE UNIQUE INDEX room_tables_unique_number_per_room ON public.room_tables USING btree (grow_room_id, table_number);

CREATE INDEX idx_route_waypoints_route ON public.route_waypoints USING btree (route_id, step_number);

CREATE UNIQUE INDEX route_waypoints_pkey ON public.route_waypoints USING btree (id);

CREATE INDEX idx_sales_rep_assignments_customer_id ON public.sales_rep_assignments USING btree (customer_id);

CREATE INDEX idx_sales_rep_assignments_user_id ON public.sales_rep_assignments USING btree (user_id);

CREATE UNIQUE INDEX sales_rep_assignments_customer_id_user_id_key ON public.sales_rep_assignments USING btree (customer_id, user_id);

CREATE UNIQUE INDEX sales_rep_assignments_pkey ON public.sales_rep_assignments USING btree (id);

CREATE INDEX idx_slack_notifications_order_id ON public.slack_notifications USING btree (order_id);

CREATE UNIQUE INDEX slack_notifications_pkey ON public.slack_notifications USING btree (id);

CREATE UNIQUE INDEX strain_aliases_alias_key ON public.strain_aliases USING btree (alias);

CREATE UNIQUE INDEX strain_aliases_pkey ON public.strain_aliases USING btree (id);

CREATE UNIQUE INDEX strain_metadata_name_key ON public.strain_metadata USING btree (name);

CREATE UNIQUE INDEX strain_metadata_pkey ON public.strain_metadata USING btree (id);

CREATE INDEX idx_strains_name ON public.strains USING btree (name);

CREATE UNIQUE INDEX strains_abbreviation_key ON public.strains USING btree (abbreviation);

CREATE UNIQUE INDEX strains_name_key ON public.strains USING btree (name);

CREATE UNIQUE INDEX strains_pkey ON public.strains USING btree (id);

CREATE UNIQUE INDEX system_metadata_pkey ON public.system_metadata USING btree (key);

CREATE INDEX idx_test_mode_audit_log_created_at ON public.test_mode_audit_log USING btree (created_at DESC);

CREATE INDEX idx_test_mode_audit_log_user_id ON public.test_mode_audit_log USING btree (user_id);

CREATE INDEX idx_test_mode_audit_log_validation ON public.test_mode_audit_log USING btree (validation_bypassed);

CREATE UNIQUE INDEX test_mode_audit_log_pkey ON public.test_mode_audit_log USING btree (id);

CREATE INDEX idx_throughput_metrics_date ON public.throughput_metrics USING btree (metric_date DESC);

CREATE UNIQUE INDEX throughput_metrics_metric_date_worker_name_worker_type_stra_key ON public.throughput_metrics USING btree (metric_date, worker_name, worker_type, strain);

CREATE UNIQUE INDEX throughput_metrics_pkey ON public.throughput_metrics USING btree (id);

CREATE INDEX idx_trim_schedule_order_id ON public.trim_schedule USING btree (order_id);

CREATE UNIQUE INDEX trim_schedule_pkey ON public.trim_schedule USING btree (id);

CREATE INDEX idx_trim_sessions_batch_analytics ON public.trim_sessions USING btree (batch_registry_id, finalization_status_bigs, finalization_status_smalls, finalization_status_trim) WHERE ((session_status <> 'cancelled'::text) AND (test_mode = false));

CREATE INDEX idx_trim_sessions_batch_registry_id ON public.trim_sessions USING btree (batch_registry_id) WHERE (batch_registry_id IS NOT NULL);

CREATE INDEX idx_trim_sessions_bucked_inventory_id ON public.trim_sessions USING btree (bucked_inventory_id);

CREATE INDEX idx_trim_sessions_bucked_smalls_inventory_id ON public.trim_sessions USING btree (bucked_smalls_inventory_id);

CREATE INDEX idx_trim_sessions_completed_at ON public.trim_sessions USING btree (completed_at DESC) WHERE (completed_at IS NOT NULL);

CREATE INDEX idx_trim_sessions_created_at ON public.trim_sessions USING btree (created_at DESC);

CREATE INDEX idx_trim_sessions_date ON public.trim_sessions USING btree (session_date);

CREATE INDEX idx_trim_sessions_finalization_bigs ON public.trim_sessions USING btree (finalization_status_bigs, session_date) WHERE ((session_status <> 'cancelled'::text) AND (test_mode = false));

CREATE INDEX idx_trim_sessions_finalization_smalls ON public.trim_sessions USING btree (finalization_status_smalls, session_date) WHERE ((session_status <> 'cancelled'::text) AND (test_mode = false));

CREATE INDEX idx_trim_sessions_finalization_trim ON public.trim_sessions USING btree (finalization_status_trim, session_date) WHERE ((session_status <> 'cancelled'::text) AND (test_mode = false));

CREATE INDEX idx_trim_sessions_staff_performance ON public.trim_sessions USING btree (trimmer_name, session_date, finalization_status_bigs) WHERE ((session_status <> 'cancelled'::text) AND (test_mode = false));

CREATE INDEX idx_trim_sessions_status ON public.trim_sessions USING btree (session_status);

CREATE INDEX idx_trim_sessions_status_date ON public.trim_sessions USING btree (session_status, session_date DESC);

CREATE INDEX idx_trim_sessions_strain_id ON public.trim_sessions USING btree (strain_id);

CREATE INDEX idx_trim_sessions_test_mode ON public.trim_sessions USING btree (test_mode);

CREATE INDEX idx_trim_sessions_trim_product_name ON public.trim_sessions USING btree (output_product_trim_name) WHERE ((output_product_trim_name IS NOT NULL) AND (session_status = 'completed'::text) AND (finalization_status = 'pending'::finalization_status));

CREATE UNIQUE INDEX trim_sessions_pkey ON public.trim_sessions USING btree (id);

CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id);

CREATE INDEX idx_variance_log_inventory_item_id ON public.variance_log USING btree (inventory_item_id);

CREATE INDEX idx_variance_log_movement_id ON public.variance_log USING btree (movement_id);

CREATE UNIQUE INDEX variance_log_pkey ON public.variance_log USING btree (id);
