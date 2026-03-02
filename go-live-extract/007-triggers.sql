-- ============================================================
-- Triggers
-- Source: https://fonreynkfeqywshijqpi.supabase.co
-- Extracted: 2026-03-02
-- Count: 114
-- ============================================================
-- Trigger: auto_sync_products_on_strain_change ON strains
CREATE TRIGGER auto_sync_products_on_strain_change AFTER INSERT OR UPDATE OF is_active ON strains FOR EACH ROW EXECUTE FUNCTION trigger_sync_products_on_strain_change();

-- Trigger: batch_allocations_updated_at ON batch_allocations
CREATE TRIGGER batch_allocations_updated_at BEFORE UPDATE ON batch_allocations FOR EACH ROW EXECUTE FUNCTION update_batch_registry_updated_at();

-- Trigger: batch_registry_updated_at ON batch_registry
CREATE TRIGGER batch_registry_updated_at BEFORE UPDATE ON batch_registry FOR EACH ROW EXECUTE FUNCTION update_batch_registry_updated_at();

-- Trigger: batch_stage_tracking_updated_at ON batch_stage_tracking
CREATE TRIGGER batch_stage_tracking_updated_at BEFORE UPDATE ON batch_stage_tracking FOR EACH ROW EXECUTE FUNCTION update_batch_registry_updated_at();

-- Trigger: bucking_sessions_updated_at ON bucking_sessions
CREATE TRIGGER bucking_sessions_updated_at BEFORE UPDATE ON bucking_sessions FOR EACH ROW EXECUTE FUNCTION update_bucking_sessions_updated_at();

-- Trigger: calculate_bucking_metrics ON bucking_sessions
CREATE TRIGGER calculate_bucking_metrics BEFORE UPDATE ON bucking_sessions FOR EACH ROW EXECUTE FUNCTION calculate_bucking_session_metrics();

-- Trigger: calculate_packaging_metrics_trigger ON packaging_sessions
CREATE TRIGGER calculate_packaging_metrics_trigger BEFORE INSERT OR UPDATE ON packaging_sessions FOR EACH ROW EXECUTE FUNCTION calculate_packaging_metrics();

-- Trigger: calculate_trim_metrics_trigger ON trim_sessions
CREATE TRIGGER calculate_trim_metrics_trigger BEFORE INSERT OR UPDATE ON trim_sessions FOR EACH ROW EXECUTE FUNCTION calculate_trim_metrics();

-- Trigger: certificates_of_analysis_updated_at ON certificates_of_analysis
CREATE TRIGGER certificates_of_analysis_updated_at BEFORE UPDATE ON certificates_of_analysis FOR EACH ROW EXECUTE FUNCTION update_certificates_of_analysis_updated_at();

-- Trigger: consume_bucking_source ON bucking_sessions
CREATE TRIGGER consume_bucking_source AFTER UPDATE ON bucking_sessions FOR EACH ROW WHEN (old.session_status IS DISTINCT FROM new.session_status AND new.session_status = 'completed'::text) EXECUTE FUNCTION consume_source_on_session_complete();

-- Trigger: consume_packaging_source ON packaging_sessions
CREATE TRIGGER consume_packaging_source AFTER UPDATE ON packaging_sessions FOR EACH ROW WHEN (old.session_status IS DISTINCT FROM new.session_status AND new.session_status = 'completed'::text) EXECUTE FUNCTION consume_source_on_session_complete();

-- Trigger: consume_trim_source ON trim_sessions
CREATE TRIGGER consume_trim_source AFTER UPDATE ON trim_sessions FOR EACH ROW WHEN (old.session_status IS DISTINCT FROM new.session_status AND new.session_status = 'completed'::text) EXECUTE FUNCTION consume_source_on_session_complete();

-- Trigger: generate_order_number_trigger ON orders
CREATE TRIGGER generate_order_number_trigger BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- Trigger: order_item_fulfillment_checklist_trigger ON order_items
CREATE TRIGGER order_item_fulfillment_checklist_trigger AFTER INSERT ON order_items FOR EACH ROW EXECUTE FUNCTION create_order_item_fulfillment_checklist();

-- Trigger: release_bucking_inventory ON bucking_sessions
CREATE TRIGGER release_bucking_inventory AFTER UPDATE ON bucking_sessions FOR EACH ROW WHEN (old.session_status IS DISTINCT FROM new.session_status) EXECUTE FUNCTION release_inventory_on_session_cancel();

-- Trigger: release_bucking_inventory_on_cancel ON bucking_sessions
CREATE TRIGGER release_bucking_inventory_on_cancel AFTER UPDATE ON bucking_sessions FOR EACH ROW WHEN (new.cancelled_at IS NOT NULL AND old.cancelled_at IS NULL) EXECUTE FUNCTION release_inventory_on_session_cancel();

-- Trigger: release_packaging_inventory ON packaging_sessions
CREATE TRIGGER release_packaging_inventory AFTER UPDATE ON packaging_sessions FOR EACH ROW WHEN (old.session_status IS DISTINCT FROM new.session_status) EXECUTE FUNCTION release_inventory_on_session_cancel();

-- Trigger: release_packaging_inventory_on_cancel ON packaging_sessions
CREATE TRIGGER release_packaging_inventory_on_cancel AFTER UPDATE ON packaging_sessions FOR EACH ROW WHEN (new.cancelled_at IS NOT NULL AND old.cancelled_at IS NULL) EXECUTE FUNCTION release_inventory_on_session_cancel();

-- Trigger: release_trim_inventory ON trim_sessions
CREATE TRIGGER release_trim_inventory AFTER UPDATE ON trim_sessions FOR EACH ROW WHEN (old.session_status IS DISTINCT FROM new.session_status) EXECUTE FUNCTION release_inventory_on_session_cancel();

-- Trigger: release_trim_inventory_on_cancel ON trim_sessions
CREATE TRIGGER release_trim_inventory_on_cancel AFTER UPDATE ON trim_sessions FOR EACH ROW WHEN (new.cancelled_at IS NOT NULL AND old.cancelled_at IS NULL) EXECUTE FUNCTION release_inventory_on_session_cancel();

-- Trigger: reserve_bucking_inventory ON bucking_sessions
CREATE TRIGGER reserve_bucking_inventory AFTER INSERT ON bucking_sessions FOR EACH ROW EXECUTE FUNCTION reserve_inventory_on_session_start();

-- Trigger: reserve_packaging_inventory ON packaging_sessions
CREATE TRIGGER reserve_packaging_inventory AFTER INSERT ON packaging_sessions FOR EACH ROW EXECUTE FUNCTION reserve_inventory_on_session_start();

-- Trigger: reserve_trim_inventory ON trim_sessions
CREATE TRIGGER reserve_trim_inventory AFTER INSERT ON trim_sessions FOR EACH ROW EXECUTE FUNCTION reserve_inventory_on_session_start();

-- Trigger: set_inventory_audit_lines_updated_at ON inventory_audit_lines
CREATE TRIGGER set_inventory_audit_lines_updated_at BEFORE UPDATE ON inventory_audit_lines FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Trigger: set_inventory_audits_updated_at ON inventory_audits
CREATE TRIGGER set_inventory_audits_updated_at BEFORE UPDATE ON inventory_audits FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Trigger: set_inventory_batch_number ON inventory_items
CREATE TRIGGER set_inventory_batch_number BEFORE INSERT OR UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION populate_batch_number();

-- Trigger: track_label_print_trigger ON labels
CREATE TRIGGER track_label_print_trigger BEFORE UPDATE ON labels FOR EACH ROW EXECUTE FUNCTION track_label_print();

-- Trigger: trg_auto_generate_individual_plants ON plant_groups
CREATE TRIGGER trg_auto_generate_individual_plants AFTER UPDATE ON plant_groups FOR EACH ROW EXECUTE FUNCTION fn_auto_generate_individual_plants();

-- Trigger: trg_auto_set_inventory_category ON inventory_items
CREATE TRIGGER trg_auto_set_inventory_category BEFORE INSERT OR UPDATE OF product_stage_id ON inventory_items FOR EACH ROW EXECUTE FUNCTION fn_auto_set_inventory_category();

-- Trigger: trg_block_direct_quantity_updates ON inventory_items
CREATE TRIGGER trg_block_direct_quantity_updates BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION fn_block_direct_quantity_updates();

-- Trigger: trg_check_assignment_quantity_limit ON package_assignments
CREATE TRIGGER trg_check_assignment_quantity_limit BEFORE INSERT ON package_assignments FOR EACH ROW EXECUTE FUNCTION fn_check_assignment_quantity_limit();

-- Trigger: trg_check_quarantine_before_movement ON inventory_movements
CREATE TRIGGER trg_check_quarantine_before_movement BEFORE INSERT ON inventory_movements FOR EACH ROW WHEN (new.movement_kind = ANY (ARRAY['RESERVE'::text, 'FULFILLMENT'::text])) EXECUTE FUNCTION fn_check_quarantine_before_movement();

-- Trigger: trg_check_quarantine_on_packaging_start ON packaging_sessions
CREATE TRIGGER trg_check_quarantine_on_packaging_start BEFORE INSERT OR UPDATE ON packaging_sessions FOR EACH ROW WHEN (new.session_status = 'active'::text) EXECUTE FUNCTION fn_check_quarantine_on_session_start();

-- Trigger: trg_check_quarantine_on_trim_start ON trim_sessions
CREATE TRIGGER trg_check_quarantine_on_trim_start BEFORE INSERT OR UPDATE ON trim_sessions FOR EACH ROW WHEN (new.session_status = 'active'::text) EXECUTE FUNCTION fn_check_quarantine_on_session_start();

-- Trigger: trg_clear_placement_on_room_transfer ON plant_groups
CREATE TRIGGER trg_clear_placement_on_room_transfer BEFORE UPDATE ON plant_groups FOR EACH ROW WHEN (old.grow_room_id IS DISTINCT FROM new.grow_room_id) EXECUTE FUNCTION fn_clear_placement_on_room_transfer();

-- Trigger: trg_complete_harvest_session ON harvest_sessions
CREATE TRIGGER trg_complete_harvest_session BEFORE UPDATE ON harvest_sessions FOR EACH ROW WHEN (new.session_status = 'completed'::text AND old.session_status = 'active'::text) EXECUTE FUNCTION fn_complete_harvest_session();

-- Trigger: trg_crm_tasks_updated_at ON crm_tasks
CREATE TRIGGER trg_crm_tasks_updated_at BEFORE UPDATE ON crm_tasks FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at_column();

-- Trigger: trg_crm_visit_schedule_updated_at ON crm_visit_schedule
CREATE TRIGGER trg_crm_visit_schedule_updated_at BEFORE UPDATE ON crm_visit_schedule FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at_column();

-- Trigger: trg_fulfill_inventory_on_order_complete ON orders
CREATE TRIGGER trg_fulfill_inventory_on_order_complete AFTER UPDATE ON orders FOR EACH ROW WHEN (new.status = 'completed'::text AND old.status IS DISTINCT FROM 'completed'::text) EXECUTE FUNCTION fn_fulfill_inventory_on_order_complete();

-- Trigger: trg_generate_plant_group_number ON plant_groups
CREATE TRIGGER trg_generate_plant_group_number BEFORE INSERT ON plant_groups FOR EACH ROW EXECUTE FUNCTION fn_generate_plant_group_number();

-- Trigger: trg_handle_bucking_session_cancellation ON bucking_sessions
CREATE TRIGGER trg_handle_bucking_session_cancellation AFTER UPDATE ON bucking_sessions FOR EACH ROW WHEN (new.session_status = 'cancelled'::text AND old.session_status IS DISTINCT FROM 'cancelled'::text) EXECUTE FUNCTION fn_handle_bucking_session_cancellation();

-- Trigger: trg_handle_packaging_session_cancellation ON packaging_sessions
CREATE TRIGGER trg_handle_packaging_session_cancellation AFTER UPDATE ON packaging_sessions FOR EACH ROW WHEN (new.session_status = 'cancelled'::text AND old.session_status IS DISTINCT FROM 'cancelled'::text) EXECUTE FUNCTION fn_handle_packaging_session_cancellation();

-- Trigger: trg_handle_trim_session_cancellation ON trim_sessions
CREATE TRIGGER trg_handle_trim_session_cancellation AFTER UPDATE ON trim_sessions FOR EACH ROW WHEN (new.session_status = 'cancelled'::text AND old.session_status IS DISTINCT FROM 'cancelled'::text) EXECUTE FUNCTION fn_handle_trim_session_cancellation();

-- Trigger: trg_inventory_item_inherit_strain ON inventory_items
CREATE TRIGGER trg_inventory_item_inherit_strain BEFORE INSERT OR UPDATE OF batch_id ON inventory_items FOR EACH ROW EXECUTE FUNCTION ensure_inventory_item_strain_from_batch();

-- Trigger: trg_inventory_items_update_batch_stage ON inventory_items
CREATE TRIGGER trg_inventory_items_update_batch_stage AFTER INSERT OR DELETE OR UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_batch_stage_on_inventory_change();

-- Trigger: trg_log_plant_group_room_history ON plant_groups
CREATE TRIGGER trg_log_plant_group_room_history AFTER UPDATE ON plant_groups FOR EACH ROW WHEN (old.grow_room_id IS DISTINCT FROM new.grow_room_id) EXECUTE FUNCTION fn_log_plant_group_room_history();

-- Trigger: trg_log_plant_group_stage_history ON plant_groups
CREATE TRIGGER trg_log_plant_group_stage_history AFTER UPDATE ON plant_groups FOR EACH ROW WHEN (old.growth_stage IS DISTINCT FROM new.growth_stage) EXECUTE FUNCTION fn_log_plant_group_stage_history();

-- Trigger: trg_packaging_session_strain_validation ON packaging_sessions
CREATE TRIGGER trg_packaging_session_strain_validation BEFORE INSERT OR UPDATE ON packaging_sessions FOR EACH ROW EXECUTE FUNCTION ensure_packaging_session_strain_from_batch();

-- Trigger: trg_populate_batch_registry_id_bucking ON bucking_sessions
CREATE TRIGGER trg_populate_batch_registry_id_bucking BEFORE INSERT OR UPDATE ON bucking_sessions FOR EACH ROW EXECUTE FUNCTION fn_populate_batch_registry_id();

-- Trigger: trg_populate_batch_registry_id_packaging ON packaging_sessions
CREATE TRIGGER trg_populate_batch_registry_id_packaging BEFORE INSERT OR UPDATE ON packaging_sessions FOR EACH ROW EXECUTE FUNCTION fn_populate_batch_registry_id();

-- Trigger: trg_populate_batch_registry_id_trim ON trim_sessions
CREATE TRIGGER trg_populate_batch_registry_id_trim BEFORE INSERT OR UPDATE ON trim_sessions FOR EACH ROW EXECUTE FUNCTION fn_populate_batch_registry_id();

-- Trigger: trg_prevent_batch_id_update ON inventory_items
CREATE TRIGGER trg_prevent_batch_id_update BEFORE INSERT OR UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION fn_prevent_batch_id_update();

-- Trigger: trg_protect_dry_room_code ON dry_rooms
CREATE TRIGGER trg_protect_dry_room_code BEFORE UPDATE ON dry_rooms FOR EACH ROW WHEN (old.room_code IS DISTINCT FROM new.room_code) EXECUTE FUNCTION fn_protect_dry_room_code();

-- Trigger: trg_protect_plant_group_strain ON plant_groups
CREATE TRIGGER trg_protect_plant_group_strain BEFORE UPDATE ON plant_groups FOR EACH ROW WHEN (old.strain_id IS DISTINCT FROM new.strain_id) EXECUTE FUNCTION fn_protect_plant_group_strain();

-- Trigger: trg_protect_room_code ON grow_rooms
CREATE TRIGGER trg_protect_room_code BEFORE UPDATE ON grow_rooms FOR EACH ROW WHEN (old.room_code IS DISTINCT FROM new.room_code) EXECUTE FUNCTION fn_protect_room_code();

-- Trigger: trg_release_inventory_on_order_cancel ON orders
CREATE TRIGGER trg_release_inventory_on_order_cancel AFTER UPDATE ON orders FOR EACH ROW WHEN (new.status = 'cancelled'::text AND old.status IS DISTINCT FROM 'cancelled'::text) EXECUTE FUNCTION fn_release_inventory_on_order_cancel();

-- Trigger: trg_release_inventory_on_unassignment ON package_assignments
CREATE TRIGGER trg_release_inventory_on_unassignment BEFORE DELETE ON package_assignments FOR EACH ROW EXECUTE FUNCTION fn_release_inventory_on_unassignment();

-- Trigger: trg_reserve_inventory_on_assignment ON package_assignments
CREATE TRIGGER trg_reserve_inventory_on_assignment AFTER INSERT ON package_assignments FOR EACH ROW EXECUTE FUNCTION fn_reserve_inventory_on_assignment();

-- Trigger: trg_reverse_fulfillment_on_order_revert ON orders
CREATE TRIGGER trg_reverse_fulfillment_on_order_revert AFTER UPDATE ON orders FOR EACH ROW WHEN (old.status = 'completed'::text AND new.status IS DISTINCT FROM 'completed'::text) EXECUTE FUNCTION fn_reverse_fulfillment_on_order_revert();

-- Trigger: trg_set_trim_session_product_names ON trim_sessions
CREATE TRIGGER trg_set_trim_session_product_names BEFORE UPDATE ON trim_sessions FOR EACH ROW EXECUTE FUNCTION set_trim_session_product_names();

-- Trigger: trg_sync_harvest_weight_adjustment ON harvest_sessions
CREATE TRIGGER trg_sync_harvest_weight_adjustment AFTER UPDATE ON harvest_sessions FOR EACH ROW WHEN (new.adjusted_weight_grams IS DISTINCT FROM old.adjusted_weight_grams AND new.adjusted_weight_grams IS NOT NULL) EXECUTE FUNCTION fn_sync_harvest_weight_adjustment();

-- Trigger: trg_trim_session_strain_validation ON trim_sessions
CREATE TRIGGER trg_trim_session_strain_validation BEFORE INSERT OR UPDATE ON trim_sessions FOR EACH ROW EXECUTE FUNCTION ensure_trim_session_strain_from_batch();

-- Trigger: trg_update_batch_lifecycle_on_bucking_complete ON bucking_sessions
CREATE TRIGGER trg_update_batch_lifecycle_on_bucking_complete AFTER UPDATE ON bucking_sessions FOR EACH ROW WHEN (new.session_status = 'completed'::text) EXECUTE FUNCTION fn_update_batch_lifecycle_on_bucking_complete();

-- Trigger: trg_update_batch_lifecycle_on_packaging_complete ON packaging_sessions
CREATE TRIGGER trg_update_batch_lifecycle_on_packaging_complete AFTER UPDATE ON packaging_sessions FOR EACH ROW WHEN (new.session_status = 'completed'::text) EXECUTE FUNCTION fn_update_batch_lifecycle_on_packaging_complete();

-- Trigger: trg_update_batch_lifecycle_on_trim_complete ON trim_sessions
CREATE TRIGGER trg_update_batch_lifecycle_on_trim_complete AFTER UPDATE ON trim_sessions FOR EACH ROW WHEN (new.session_status = 'completed'::text) EXECUTE FUNCTION fn_update_batch_lifecycle_on_trim_complete();

-- Trigger: trg_update_inventory_on_hand ON inventory_movements
CREATE TRIGGER trg_update_inventory_on_hand AFTER INSERT ON inventory_movements FOR EACH ROW EXECUTE FUNCTION fn_update_inventory_on_hand();

-- Trigger: trg_validate_binning_session ON binning_sessions
CREATE TRIGGER trg_validate_binning_session BEFORE INSERT ON binning_sessions FOR EACH ROW EXECUTE FUNCTION fn_validate_binning_session();

-- Trigger: trg_validate_coa_before_packaging_session ON packaging_sessions
CREATE TRIGGER trg_validate_coa_before_packaging_session BEFORE INSERT ON packaging_sessions FOR EACH ROW EXECUTE FUNCTION validate_coa_before_packaging();

-- Trigger: trg_validate_harvest_cancellation ON harvest_sessions
CREATE TRIGGER trg_validate_harvest_cancellation BEFORE UPDATE ON harvest_sessions FOR EACH ROW WHEN (new.session_status = 'cancelled'::text AND old.session_status = 'active'::text) EXECUTE FUNCTION fn_validate_harvest_cancellation();

-- Trigger: trg_validate_movement ON inventory_movements
CREATE TRIGGER trg_validate_movement BEFORE INSERT ON inventory_movements FOR EACH ROW EXECUTE FUNCTION fn_validate_movement();

-- Trigger: trg_validate_movement_item_ids ON inventory_movements
CREATE TRIGGER trg_validate_movement_item_ids BEFORE INSERT ON inventory_movements FOR EACH ROW EXECUTE FUNCTION fn_validate_movement_item_ids();

-- Trigger: trg_validate_order_status_transition ON orders
CREATE TRIGGER trg_validate_order_status_transition BEFORE UPDATE ON orders FOR EACH ROW WHEN (old.status IS DISTINCT FROM new.status) EXECUTE FUNCTION fn_validate_order_status_transition();

-- Trigger: trg_validate_placement_room ON plant_groups
CREATE TRIGGER trg_validate_placement_room BEFORE INSERT OR UPDATE ON plant_groups FOR EACH ROW WHEN (new.room_table_id IS NOT NULL) EXECUTE FUNCTION fn_validate_placement_room();

-- Trigger: trg_validate_plant_group_stage ON plant_groups
CREATE TRIGGER trg_validate_plant_group_stage BEFORE UPDATE ON plant_groups FOR EACH ROW WHEN (old.growth_stage IS DISTINCT FROM new.growth_stage) EXECUTE FUNCTION fn_validate_plant_group_stage_transition();

-- Trigger: trigger_consolidate_packaging_session ON packaging_sessions
CREATE TRIGGER trigger_consolidate_packaging_session AFTER INSERT OR UPDATE ON packaging_sessions FOR EACH ROW EXECUTE FUNCTION trigger_consolidate_packaging_session_output();

-- Trigger: trigger_consolidate_trim_session ON trim_sessions
CREATE TRIGGER trigger_consolidate_trim_session AFTER INSERT OR UPDATE ON trim_sessions FOR EACH ROW EXECUTE FUNCTION trigger_consolidate_trim_session_output();

-- Trigger: trigger_inventory_auto_register_batch ON inventory_items
CREATE TRIGGER trigger_inventory_auto_register_batch AFTER INSERT OR UPDATE OF batch, strain ON inventory_items FOR EACH ROW EXECUTE FUNCTION trigger_auto_register_batch_from_inventory();

-- Trigger: trigger_mark_coversheet_outdated_on_items_change ON order_items
CREATE TRIGGER trigger_mark_coversheet_outdated_on_items_change AFTER INSERT OR DELETE OR UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION mark_coversheet_outdated();

-- Trigger: trigger_mark_coversheet_outdated_on_order_update ON orders
CREATE TRIGGER trigger_mark_coversheet_outdated_on_order_update AFTER UPDATE ON orders FOR EACH ROW WHEN (old.customer_id IS DISTINCT FROM new.customer_id OR old.order_date IS DISTINCT FROM new.order_date OR old.scheduled_delivery_date IS DISTINCT FROM new.scheduled_delivery_date OR old.status IS DISTINCT FROM new.status) EXECUTE FUNCTION mark_coversheet_outdated();

-- Trigger: trigger_order_item_strain_populate ON order_items
CREATE TRIGGER trigger_order_item_strain_populate BEFORE INSERT OR UPDATE OF product_id ON order_items FOR EACH ROW EXECUTE FUNCTION trigger_populate_order_item_strain();

-- Trigger: trigger_product_strain_id_sync ON products
CREATE TRIGGER trigger_product_strain_id_sync BEFORE INSERT OR UPDATE OF strain ON products FOR EACH ROW EXECUTE FUNCTION trigger_update_product_strain_id();

-- Trigger: trigger_set_bucking_product_names ON bucking_sessions
CREATE TRIGGER trigger_set_bucking_product_names BEFORE UPDATE ON bucking_sessions FOR EACH ROW EXECUTE FUNCTION set_bucking_product_names();

-- Trigger: trigger_set_packaging_product_names ON packaging_sessions
CREATE TRIGGER trigger_set_packaging_product_names BEFORE UPDATE ON packaging_sessions FOR EACH ROW EXECUTE FUNCTION set_packaging_product_names();

-- Trigger: trigger_set_trim_product_names ON trim_sessions
CREATE TRIGGER trigger_set_trim_product_names BEFORE UPDATE ON trim_sessions FOR EACH ROW EXECUTE FUNCTION set_trim_product_names();

-- Trigger: trigger_update_strains_timestamp ON strains
CREATE TRIGGER trigger_update_strains_timestamp BEFORE UPDATE ON strains FOR EACH ROW EXECUTE FUNCTION update_strains_updated_at();

-- Trigger: update_bucked_inventory_updated_at ON bucked_inventory
CREATE TRIGGER update_bucked_inventory_updated_at BEFORE UPDATE ON bucked_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_bulk_inventory_updated_at ON bulk_inventory
CREATE TRIGGER update_bulk_inventory_updated_at BEFORE UPDATE ON bulk_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_coa_documents_timestamp ON coa_documents
CREATE TRIGGER update_coa_documents_timestamp BEFORE UPDATE ON coa_documents FOR EACH ROW EXECUTE FUNCTION update_invoice_timestamp();

-- Trigger: update_consolidated_packages_updated_at ON consolidated_packages
CREATE TRIGGER update_consolidated_packages_updated_at BEFORE UPDATE ON consolidated_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_customers_updated_at ON customers
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_delivery_schedule_updated_at ON delivery_schedule
CREATE TRIGGER update_delivery_schedule_updated_at BEFORE UPDATE ON delivery_schedule FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_draft_orders_updated_at ON draft_orders
CREATE TRIGGER update_draft_orders_updated_at BEFORE UPDATE ON draft_orders FOR EACH ROW EXECUTE FUNCTION update_draft_order_timestamp();

-- Trigger: update_fulfillment_checklist_updated_at ON order_fulfillment_checklist
CREATE TRIGGER update_fulfillment_checklist_updated_at BEFORE UPDATE ON order_fulfillment_checklist FOR EACH ROW EXECUTE FUNCTION update_allocation_updated_at();

-- Trigger: update_internal_bucked_inventory_updated_at ON internal_bucked_inventory
CREATE TRIGGER update_internal_bucked_inventory_updated_at BEFORE UPDATE ON internal_bucked_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_internal_bulk_inventory_updated_at ON internal_bulk_inventory
CREATE TRIGGER update_internal_bulk_inventory_updated_at BEFORE UPDATE ON internal_bulk_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_internal_packaged_inventory_updated_at ON internal_packaged_inventory
CREATE TRIGGER update_internal_packaged_inventory_updated_at BEFORE UPDATE ON internal_packaged_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_invoices_timestamp ON invoices
CREATE TRIGGER update_invoices_timestamp BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_invoice_timestamp();

-- Trigger: update_manifests_timestamp ON manifests
CREATE TRIGGER update_manifests_timestamp BEFORE UPDATE ON manifests FOR EACH ROW EXECUTE FUNCTION update_invoice_timestamp();

-- Trigger: update_monthly_metrics_updated_at ON monthly_performance_metrics
CREATE TRIGGER update_monthly_metrics_updated_at BEFORE UPDATE ON monthly_performance_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_notification_preferences_updated_at ON notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_order_fulfillment_items_updated_at ON order_fulfillment_items
CREATE TRIGGER update_order_fulfillment_items_updated_at BEFORE UPDATE ON order_fulfillment_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_order_item_updated_at ON order_items
CREATE TRIGGER update_order_item_updated_at BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION update_order_item_timestamp();

-- Trigger: update_order_total_on_item_change ON order_items
CREATE TRIGGER update_order_total_on_item_change AFTER INSERT OR DELETE OR UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION update_order_total();

-- Trigger: update_orders_updated_at ON orders
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_package_assignments_updated_at ON package_assignments
CREATE TRIGGER update_package_assignments_updated_at BEFORE UPDATE ON package_assignments FOR EACH ROW EXECUTE FUNCTION update_package_assignments_updated_at();

-- Trigger: update_packaging_schedule_updated_at ON packaging_schedule
CREATE TRIGGER update_packaging_schedule_updated_at BEFORE UPDATE ON packaging_schedule FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_packaging_sessions_updated_at_trigger ON packaging_sessions
CREATE TRIGGER update_packaging_sessions_updated_at_trigger BEFORE UPDATE ON packaging_sessions FOR EACH ROW EXECUTE FUNCTION update_packaging_sessions_updated_at();

-- Trigger: update_product_labels_updated_at ON product_labels
CREATE TRIGGER update_product_labels_updated_at BEFORE UPDATE ON product_labels FOR EACH ROW EXECUTE FUNCTION update_product_labels_updated_at();

-- Trigger: update_products_updated_at ON products
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_strain_metadata_updated_at ON strain_metadata
CREATE TRIGGER update_strain_metadata_updated_at BEFORE UPDATE ON strain_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_trim_schedule_updated_at ON trim_schedule
CREATE TRIGGER update_trim_schedule_updated_at BEFORE UPDATE ON trim_schedule FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_trim_sessions_updated_at ON trim_sessions
CREATE TRIGGER update_trim_sessions_updated_at BEFORE UPDATE ON trim_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: update_user_profiles_updated_at ON user_profiles
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: validate_product_stage_type ON products
CREATE TRIGGER validate_product_stage_type BEFORE INSERT OR UPDATE ON products FOR EACH ROW EXECUTE FUNCTION validate_product_stage_type_alignment();
