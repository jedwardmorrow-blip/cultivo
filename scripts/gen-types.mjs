import { readFileSync, writeFileSync } from 'fs';

const TABLES_FILE = '/tmp/cc-agent/58363781/project/scripts/tables-data.json';
const VIEWS_FILE = '/tmp/cc-agent/58363781/project/scripts/views-data.json';
const OUTPUT = '/tmp/cc-agent/58363781/project/src/lib/database/database.types.ts';

function extractJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

const UDT_MAP = {
  uuid: 'string', text: 'text', varchar: 'string', bpchar: 'string', name: 'string',
  int2: 'number', int4: 'number', int8: 'number', float4: 'number', float8: 'number',
  numeric: 'number', bool: 'boolean', json: 'Json', jsonb: 'Json',
  timestamp: 'string', timestamptz: 'string', date: 'string', time: 'string', timetz: 'string',
  bytea: 'string', _text: 'string[]', _int4: 'number[]', _uuid: 'string[]',
  _jsonb: 'Json[]', _json: 'Json[]', _bool: 'boolean[]', _float8: 'number[]', _numeric: 'number[]',
  interval: 'string', oid: 'number', regclass: 'string', inet: 'string', cidr: 'string',
};

const ENUMS = {
  allocation_workflow_stage: "'allocated' | 'in_trimming' | 'trimmed' | 'in_packaging' | 'packaged' | 'labeled' | 'coa_attached' | 'ready_for_delivery'",
  audit_status: "'initiated' | 'in_progress' | 'completed' | 'cancelled'",
  finalization_status: "'pending' | 'finalized' | 'voided'",
  order_item_status: "'trimming' | 'packaging' | 'labeling' | 'pending_coa' | 'ready_for_delivery'",
  variance_reason: "'moisture_loss' | 'spillage' | 'measurement_error' | 'waste' | 'theft_loss' | 'other'",
  variance_source: "'audit_reconciliation' | 'session_conversion' | 'manual_adjustment'",
};

const FKS = [
  {s:"binning_sessions",sc:"harvest_session_id",t:"harvest_sessions",tc:"id",n:"binning_sessions_harvest_session_id_fkey"},
  {s:"binning_sessions",sc:"dry_room_id",t:"dry_rooms",tc:"id",n:"binning_sessions_dry_room_id_fkey"},
  {s:"binning_sessions",sc:"batch_registry_id",t:"batch_registry",tc:"id",n:"binning_sessions_batch_registry_id_fkey"},
  {s:"batch_allocations",sc:"batch_id",t:"batch_registry",tc:"id",n:"batch_allocations_batch_id_fkey"},
  {s:"batch_allocations",sc:"order_item_id",t:"order_items",tc:"id",n:"batch_allocations_order_item_id_fkey"},
  {s:"batch_lifecycle_events",sc:"batch_id",t:"batch_registry",tc:"id",n:"batch_lifecycle_events_batch_id_fkey"},
  {s:"batch_package_lineage",sc:"batch_id",t:"batch_registry",tc:"id",n:"batch_package_lineage_batch_id_fkey"},
  {s:"batch_production_history",sc:"batch_id",t:"batch_registry",tc:"id",n:"batch_production_history_batch_id_fkey"},
  {s:"batch_projections",sc:"batch_id",t:"batch_registry",tc:"id",n:"batch_projections_batch_id_fkey"},
  {s:"batch_registry",sc:"coa_id",t:"certificates_of_analysis",tc:"id",n:"batch_registry_coa_id_fkey"},
  {s:"batch_registry",sc:"strain_id",t:"strains",tc:"id",n:"batch_registry_strain_id_fkey"},
  {s:"batch_stage_tracking",sc:"batch_id",t:"batch_registry",tc:"id",n:"batch_stage_tracking_batch_id_fkey"},
  {s:"bucking_sessions",sc:"batch_registry_id",t:"batch_registry",tc:"id",n:"bucking_sessions_batch_registry_id_fkey"},
  {s:"certificates_of_analysis",sc:"batch_id",t:"batch_registry",tc:"id",n:"certificates_of_analysis_batch_id_fkey"},
  {s:"consolidated_package_sources",sc:"consolidated_package_id",t:"consolidated_packages",tc:"id",n:"consolidated_package_sources_consolidated_package_id_fkey"},
  {s:"conversion_packages",sc:"batch_id",t:"batch_registry",tc:"id",n:"conversion_packages_batch_id_fkey"},
  {s:"conversion_packages",sc:"inventory_stage_id",t:"product_stages",tc:"id",n:"conversion_packages_inventory_stage_id_fkey"},
  {s:"conversion_packages",sc:"product_id",t:"products",tc:"id",n:"conversion_packages_product_id_fkey"},
  {s:"conversion_variance_log",sc:"batch_id",t:"batch_registry",tc:"id",n:"conversion_variance_log_batch_id_fkey"},
  {s:"conversion_variance_log",sc:"product_id",t:"products",tc:"id",n:"conversion_variance_log_product_id_fkey"},
  {s:"coversheets",sc:"order_id",t:"orders",tc:"id",n:"coversheets_order_id_fkey"},
  {s:"delivery_routes",sc:"destination_customer_id",t:"customers",tc:"id",n:"delivery_routes_destination_customer_id_fkey"},
  {s:"delivery_routes",sc:"origin_customer_id",t:"customers",tc:"id",n:"delivery_routes_origin_customer_id_fkey"},
  {s:"delivery_schedule",sc:"order_id",t:"orders",tc:"id",n:"delivery_schedule_order_id_fkey"},
  {s:"draft_orders",sc:"customer_id",t:"customers",tc:"id",n:"draft_orders_customer_id_fkey"},
  {s:"internal_bucked_inventory",sc:"strain_id",t:"strains",tc:"id",n:"internal_bucked_inventory_strain_id_fkey"},
  {s:"internal_bucked_inventory",sc:"synced_from_snapshot_id",t:"inventory_snapshots",tc:"id",n:"internal_bucked_inventory_synced_from_snapshot_id_fkey"},
  {s:"internal_bulk_inventory",sc:"strain_id",t:"strains",tc:"id",n:"internal_bulk_inventory_strain_id_fkey"},
  {s:"internal_packaged_inventory",sc:"packaging_session_id",t:"packaging_sessions",tc:"id",n:"internal_packaged_inventory_packaging_session_id_fkey"},
  {s:"inventory_audit_lines",sc:"audit_id",t:"inventory_audits",tc:"id",n:"inventory_audit_lines_audit_id_fkey"},
  {s:"inventory_audit_lines",sc:"inventory_item_id",t:"inventory_items",tc:"id",n:"inventory_audit_lines_inventory_item_id_fkey"},
  {s:"inventory_changes",sc:"snapshot_id",t:"inventory_snapshots",tc:"id",n:"inventory_changes_snapshot_id_fkey"},
  {s:"inventory_conversions",sc:"trim_session_id",t:"trim_sessions",tc:"id",n:"inventory_conversions_trim_session_id_fkey"},
  {s:"inventory_items",sc:"batch_id",t:"batch_registry",tc:"id",n:"inventory_items_batch_id_fkey"},
  {s:"inventory_items",sc:"parent_item_id",t:"inventory_items",tc:"id",n:"inventory_items_parent_item_id_fkey"},
  {s:"inventory_items",sc:"product_stage_id",t:"product_stages",tc:"id",n:"inventory_items_product_stage_id_fkey"},
  {s:"inventory_items",sc:"snapshot_id",t:"inventory_snapshots",tc:"id",n:"inventory_items_snapshot_id_fkey"},
  {s:"inventory_items",sc:"strain_id",t:"strains",tc:"id",n:"inventory_items_strain_id_fkey"},
  {s:"inventory_movements",sc:"dest_item_id",t:"inventory_items",tc:"id",n:"inventory_movements_dest_item_id_fkey"},
  {s:"inventory_movements",sc:"source_item_id",t:"inventory_items",tc:"id",n:"inventory_movements_source_item_id_fkey"},
  {s:"inventory_reconciliation",sc:"current_snapshot_id",t:"inventory_snapshots",tc:"id",n:"inventory_reconciliation_current_snapshot_id_fkey"},
  {s:"inventory_reconciliation",sc:"previous_snapshot_id",t:"inventory_snapshots",tc:"id",n:"inventory_reconciliation_previous_snapshot_id_fkey"},
  {s:"inventory_transactions",sc:"allocation_id",t:"order_item_allocations",tc:"id",n:"inventory_transactions_allocation_id_fkey"},
  {s:"inventory_transactions",sc:"order_id",t:"orders",tc:"id",n:"inventory_transactions_order_id_fkey"},
  {s:"inventory_transactions",sc:"order_item_id",t:"order_items",tc:"id",n:"inventory_transactions_order_item_id_fkey"},
  {s:"inventory_variances",sc:"reconciliation_id",t:"inventory_reconciliation",tc:"id",n:"inventory_variances_reconciliation_id_fkey"},
  {s:"invoices",sc:"customer_id",t:"customers",tc:"id",n:"invoices_customer_id_fkey"},
  {s:"invoices",sc:"order_id",t:"orders",tc:"id",n:"invoices_order_id_fkey"},
  {s:"labels",sc:"label_type_id",t:"label_types",tc:"id",n:"labels_label_type_id_fkey"},
  {s:"labels",sc:"product_id",t:"products",tc:"id",n:"labels_product_id_fkey"},
  {s:"labels",sc:"strain_id",t:"strains",tc:"id",n:"labels_strain_id_fkey"},
  {s:"order_fulfillment_checklist",sc:"order_id",t:"orders",tc:"id",n:"order_fulfillment_checklist_order_id_fkey"},
  {s:"order_fulfillment_checklist",sc:"order_item_id",t:"order_items",tc:"id",n:"order_fulfillment_checklist_order_item_id_fkey"},
  {s:"order_fulfillment_items",sc:"order_id",t:"orders",tc:"id",n:"order_fulfillment_items_order_id_fkey"},
  {s:"order_fulfillment_items",sc:"order_item_id",t:"order_items",tc:"id",n:"order_fulfillment_items_order_item_id_fkey"},
  {s:"order_fulfillment_items",sc:"packaged_inventory_id",t:"internal_packaged_inventory",tc:"id",n:"order_fulfillment_items_packaged_inventory_id_fkey"},
  {s:"order_fulfillment_items",sc:"packaging_session_id",t:"packaging_sessions",tc:"id",n:"order_fulfillment_items_packaging_session_id_fkey"},
  {s:"order_item_allocations",sc:"active_packaging_session_id",t:"packaging_sessions",tc:"id",n:"order_item_allocations_active_packaging_session_id_fkey"},
  {s:"order_item_allocations",sc:"active_trim_session_id",t:"trim_sessions",tc:"id",n:"order_item_allocations_active_trim_session_id_fkey"},
  {s:"order_item_allocations",sc:"order_id",t:"orders",tc:"id",n:"order_item_allocations_order_id_fkey"},
  {s:"order_item_allocations",sc:"order_item_id",t:"order_items",tc:"id",n:"order_item_allocations_order_item_id_fkey"},
  {s:"order_items",sc:"batch_id",t:"batch_registry",tc:"id",n:"order_items_batch_id_fkey"},
  {s:"order_items",sc:"order_id",t:"orders",tc:"id",n:"order_items_order_id_fkey"},
  {s:"order_items",sc:"product_id",t:"products",tc:"id",n:"order_items_product_id_fkey"},
  {s:"order_items",sc:"strain_id",t:"strains",tc:"id",n:"order_items_strain_id_fkey"},
  {s:"orders",sc:"customer_id",t:"customers",tc:"id",n:"orders_customer_id_fkey"},
  {s:"package_assignments",sc:"label_id",t:"labels",tc:"id",n:"package_assignments_label_id_fkey"},
  {s:"package_assignments",sc:"order_id",t:"orders",tc:"id",n:"package_assignments_order_id_fkey"},
  {s:"package_assignments",sc:"order_item_id",t:"order_items",tc:"id",n:"package_assignments_order_item_id_fkey"},
  {s:"packaging_schedule",sc:"order_id",t:"orders",tc:"id",n:"packaging_schedule_order_id_fkey"},
  {s:"packaging_sessions",sc:"batch_registry_id",t:"batch_registry",tc:"id",n:"packaging_sessions_batch_registry_id_fkey"},
  {s:"packaging_sessions",sc:"strain_id",t:"strains",tc:"id",n:"packaging_sessions_strain_id_fkey"},
  {s:"packaging_yields",sc:"packaging_session_id",t:"packaging_sessions",tc:"id",n:"packaging_yields_packaging_session_id_fkey"},
  {s:"product_labels",sc:"package_assignment_id",t:"package_assignments",tc:"id",n:"product_labels_package_assignment_id_fkey"},
  {s:"products",sc:"replaced_by_product_id",t:"products",tc:"id",n:"products_replaced_by_product_id_fkey"},
  {s:"products",sc:"stage_id",t:"product_stages",tc:"id",n:"products_stage_id_fkey"},
  {s:"products",sc:"strain_id",t:"strains",tc:"id",n:"products_strain_id_fkey"},
  {s:"products",sc:"type_id",t:"product_types",tc:"id",n:"products_type_id_fkey"},
  {s:"quarantine_violation_log",sc:"batch_id",t:"batch_registry",tc:"id",n:"quarantine_violation_log_batch_id_fkey"},
  {s:"route_waypoints",sc:"route_id",t:"delivery_routes",tc:"id",n:"route_waypoints_route_id_fkey"},
  {s:"slack_notifications",sc:"order_id",t:"orders",tc:"id",n:"slack_notifications_order_id_fkey"},
  {s:"harvest_sessions",sc:"plant_group_id",t:"plant_groups",tc:"id",n:"harvest_sessions_plant_group_id_fkey"},
  {s:"harvest_sessions",sc:"batch_registry_id",t:"batch_registry",tc:"id",n:"harvest_sessions_batch_registry_id_fkey"},
  {s:"plant_group_room_history",sc:"plant_group_id",t:"plant_groups",tc:"id",n:"plant_group_room_history_plant_group_id_fkey"},
  {s:"plant_group_room_history",sc:"from_room_id",t:"grow_rooms",tc:"id",n:"plant_group_room_history_from_room_id_fkey"},
  {s:"plant_group_room_history",sc:"to_room_id",t:"grow_rooms",tc:"id",n:"plant_group_room_history_to_room_id_fkey"},
  {s:"plant_group_stage_history",sc:"plant_group_id",t:"plant_groups",tc:"id",n:"plant_group_stage_history_plant_group_id_fkey"},
  {s:"plant_groups",sc:"strain_id",t:"strains",tc:"id",n:"plant_groups_strain_id_fkey"},
  {s:"plant_groups",sc:"grow_room_id",t:"grow_rooms",tc:"id",n:"plant_groups_grow_room_id_fkey"},
  {s:"plant_groups",sc:"mother_plant_group_id",t:"plant_groups",tc:"id",n:"plant_groups_mother_plant_group_id_fkey"},
  {s:"plant_groups",sc:"room_table_id",t:"room_tables",tc:"id",n:"plant_groups_room_table_id_fkey"},
  {s:"plant_groups",sc:"room_section_id",t:"room_sections",tc:"id",n:"plant_groups_room_section_id_fkey"},
  {s:"room_sections",sc:"room_table_id",t:"room_tables",tc:"id",n:"room_sections_room_table_id_fkey"},
  {s:"room_tables",sc:"grow_room_id",t:"grow_rooms",tc:"id",n:"room_tables_grow_room_id_fkey"},
  {s:"strain_aliases",sc:"strain_id",t:"strains",tc:"id",n:"strain_aliases_strain_id_fkey"},
  {s:"trim_schedule",sc:"order_id",t:"orders",tc:"id",n:"trim_schedule_order_id_fkey"},
  {s:"trim_sessions",sc:"batch_registry_id",t:"batch_registry",tc:"id",n:"trim_sessions_batch_registry_id_fkey"},
  {s:"trim_sessions",sc:"bucked_inventory_id",t:"bucked_inventory",tc:"id",n:"trim_sessions_bucked_inventory_id_fkey"},
  {s:"trim_sessions",sc:"bucked_smalls_inventory_id",t:"inventory_items",tc:"id",n:"trim_sessions_bucked_smalls_inventory_id_fkey"},
  {s:"trim_sessions",sc:"strain_id",t:"strains",tc:"id",n:"trim_sessions_strain_id_fkey"},
  {s:"variance_log",sc:"inventory_item_id",t:"inventory_items",tc:"id",n:"variance_log_inventory_item_id_fkey"},
  {s:"variance_log",sc:"movement_id",t:"inventory_movements",tc:"id",n:"variance_log_movement_id_fkey"},
];

function mapType(udt) {
  if (ENUMS[udt]) return `Database["public"]["Enums"]["${udt}"]`;
  if (UDT_MAP[udt]) return UDT_MAP[udt] === 'text' ? 'string' : UDT_MAP[udt];
  if (udt.startsWith('_')) {
    const inner = udt.slice(1);
    if (ENUMS[inner]) return `Database["public"]["Enums"]["${inner}"][]`;
    const mapped = UDT_MAP[inner];
    if (mapped) return (mapped === 'text' ? 'string' : mapped) + '[]';
  }
  return 'string';
}

function groupBy(arr, key) {
  const m = {};
  for (const item of arr) {
    const k = item[key];
    if (!m[k]) m[k] = [];
    m[k].push(item);
  }
  return m;
}

const tablesCols = extractJson(TABLES_FILE);
const viewsCols = extractJson(VIEWS_FILE);

const tableGroups = groupBy(tablesCols, 'table_name');
const viewGroups = groupBy(viewsCols, 'table_name');

const fksByTable = {};
for (const fk of FKS) {
  if (!fksByTable[fk.s]) fksByTable[fk.s] = [];
  fksByTable[fk.s].push(fk);
}

let out = `export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {\n`;

for (const tableName of Object.keys(tableGroups).sort()) {
  const cols = tableGroups[tableName];
  const fks = fksByTable[tableName] || [];

  out += `      ${tableName}: {\n`;

  // Row
  out += `        Row: {\n`;
  for (const col of cols) {
    const tsType = mapType(col.udt_name);
    const nullSuffix = col.is_nullable ? ' | null' : '';
    out += `          ${col.column_name}: ${tsType}${nullSuffix}\n`;
  }
  out += `        }\n`;

  // Insert
  out += `        Insert: {\n`;
  for (const col of cols) {
    const tsType = mapType(col.udt_name);
    const optional = col.has_default || col.is_nullable ? '?' : '';
    const nullSuffix = col.is_nullable ? ' | null' : '';
    out += `          ${col.column_name}${optional}: ${tsType}${nullSuffix}\n`;
  }
  out += `        }\n`;

  // Update
  out += `        Update: {\n`;
  for (const col of cols) {
    const tsType = mapType(col.udt_name);
    const nullSuffix = col.is_nullable ? ' | null' : '';
    out += `          ${col.column_name}?: ${tsType}${nullSuffix}\n`;
  }
  out += `        }\n`;

  // Relationships
  if (fks.length > 0) {
    out += `        Relationships: [\n`;
    for (const fk of fks) {
      out += `          {\n`;
      out += `            foreignKeyName: "${fk.n}"\n`;
      out += `            columns: ["${fk.sc}"]\n`;
      out += `            isOneToOne: false\n`;
      out += `            referencedRelation: "${fk.t}"\n`;
      out += `            referencedColumns: ["${fk.tc}"]\n`;
      out += `          },\n`;
    }
    out += `        ]\n`;
  } else {
    out += `        Relationships: []\n`;
  }

  out += `      }\n`;
}

out += `    }\n`;

// Views
out += `    Views: {\n`;
for (const viewName of Object.keys(viewGroups).sort()) {
  const cols = viewGroups[viewName];
  out += `      ${viewName}: {\n`;
  out += `        Row: {\n`;
  for (const col of cols) {
    const tsType = mapType(col.udt_name);
    out += `          ${col.column_name}: ${tsType} | null\n`;
  }
  out += `        }\n`;
  out += `        Relationships: []\n`;
  out += `      }\n`;
}
out += `    }\n`;

// Functions (only non-trigger functions that are useful for RPC)
out += `    Functions: {\n`;

const FUNCTIONS = [
  {name:"archive_product",args:"p_product_id: string, p_reason: string, p_replaced_by_product_id?: string",ret:"undefined"},
  {name:"calculate_batch_projection",args:"p_strain: string, p_source_stage: string, p_source_weight: number, p_target_stage: string",ret:"number"},
  {name:"calculate_ledger_quantity",args:"p_item_id: string",ret:"number"},
  {name:"calculate_order_age_color",args:"order_date: string",ret:"string"},
  {name:"calculate_packaging_yield_statistics",args:"p_strain: string, p_source_type: string, p_target_type: string, p_days_back?: number",ret:"Record<string, unknown>[]"},
  {name:"can_close_conversion",args:"p_session_type: string, p_session_id: string",ret:"boolean"},
  {name:"check_batch_has_valid_coa",args:"batch_uuid: string",ret:"boolean"},
  {name:"check_batch_over_allocation",args:"p_batch_id: string, p_stage?: string",ret:"Record<string, unknown>[]"},
  {name:"check_trigger_health",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"cleanup_old_test_mode_logs",args:"Record<string, never>",ret:"number"},
  {name:"consolidate_packaging_session_output",args:"p_session_id: string, p_strain: string, p_strain_abbreviation: string, p_session_date: string, p_units_3_5g: number, p_units_14g: number, p_units_454g: number",ret:"undefined"},
  {name:"consolidate_trim_session_output",args:"p_session_id: string, p_strain: string, p_strain_abbreviation: string, p_session_date: string, p_flower_grams: number, p_smalls_grams: number, p_trim_grams: number",ret:"undefined"},
  {name:"create_reconciliation_movement",args:"p_item_id: string, p_counted_qty: number, p_reason_code?: string, p_notes?: string",ret:"string"},
  {name:"deduct_inventory_for_order",args:"order_id_param: string",ret:"undefined"},
  {name:"disable_movement_trigger",args:"Record<string, never>",ret:"string"},
  {name:"drop_deprecated_inventory_tables",args:"confirm_text?: string",ret:"string"},
  {name:"enable_movement_trigger",args:"Record<string, never>",ret:"string"},
  {name:"finalize_session_aggregated",args:"p_batch_id: string, p_product_name?: string, p_session_type?: string",ret:"Json"},
  {name:"find_strain_by_name",args:"p_strain_name: string",ret:"Record<string, unknown>"},
  {name:"fix_strain_data_quality_issues",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"fn_apply_audit_adjustments",args:"p_audit_id: string, p_user_id: string",ret:"Record<string, unknown>[]"},
  {name:"fn_check_stage_locked",args:"stages: string[]",ret:"Record<string, unknown>[]"},
  {name:"fn_generate_audit_number",args:"Record<string, never>",ret:"string"},
  {name:"fn_lock_inventory_stages",args:"p_audit_id: string, p_stages: string[]",ret:"boolean"},
  {name:"fn_unlock_inventory_stages",args:"p_audit_id: string",ret:"boolean"},
  {name:"fn_validate_batch_lifecycle_transition",args:"p_batch_id: string, p_from_state: string, p_to_state: string",ret:"boolean"},
  {name:"fn_validate_batch_not_quarantined",args:"p_batch_id: string, p_operation?: string",ret:"boolean"},
  {name:"generate_consolidated_package_id",args:"p_package_date: string, p_strain_abbreviation: string",ret:"string"},
  {name:"generate_coversheet_token",args:"Record<string, never>",ret:"string"},
  {name:"generate_invoice_number",args:"Record<string, never>",ret:"string"},
  {name:"generate_manifest_number",args:"Record<string, never>",ret:"string"},
  {name:"generate_next_package_id",args:"p_batch_id: string",ret:"string"},
  {name:"generate_order_public_token",args:"Record<string, never>",ret:"string"},
  {name:"get_active_bucking_sessions",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"get_active_products",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"get_aggregation_details",args:"p_batch_id: string, p_product_name?: string, p_session_type?: string",ret:"Json"},
  {name:"get_all_user_profiles",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"get_batch_available_stages",args:"p_batch_id: string",ret:"string[]"},
  {name:"get_batch_coa_data",args:"p_batch_number: string",ret:"Record<string, unknown>[]"},
  {name:"get_batch_strain_summary",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"get_batches_for_strain",args:"p_strain: string",ret:"Record<string, unknown>[]"},
  {name:"get_bucking_remaining_weight",args:"session_id: string",ret:"number"},
  {name:"get_bucking_session_stats",args:"p_date?: string",ret:"Record<string, unknown>[]"},
  {name:"get_canonical_products_for_strain",args:"p_strain_id: string",ret:"Record<string, unknown>[]"},
  {name:"get_conversion_lot_summary",args:"p_date?: string",ret:"Record<string, unknown>[]"},
  {name:"get_coversheet_customer_info",args:"p_order_id: string",ret:"Record<string, unknown>[]"},
  {name:"get_inventory_discrepancies",args:"p_min_discrepancy?: number, p_limit?: number",ret:"Record<string, unknown>[]"},
  {name:"get_item_movement_history",args:"p_item_id: string, p_limit?: number",ret:"Record<string, unknown>[]"},
  {name:"get_movement_metrics",args:"p_hours?: number",ret:"Record<string, unknown>[]"},
  {name:"get_next_package_sequence",args:"p_package_date: string, p_strain_abbreviation: string",ret:"number"},
  {name:"get_or_create_batch_from_inventory",args:"p_batch_number: string, p_strain_name: string, p_room?: string",ret:"string"},
  {name:"get_or_create_strain",args:"p_strain_name: string, p_category?: string",ret:"string"},
  {name:"get_order_data_health",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"get_package_date_from_conversion",args:"p_pending_conversion_id: string",ret:"string"},
  {name:"get_packaging_remaining_weight",args:"session_id: string",ret:"number"},
  {name:"get_pending_conversions",args:"p_date?: string",ret:"Record<string, unknown>[]"},
  {name:"get_product_coverage_report",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"get_product_id_by_strain_stage_and_type",args:"p_batch_id: string, p_stage_name: string, p_is_smalls?: boolean",ret:"string"},
  {name:"get_recent_movement_errors",args:"p_limit?: number",ret:"Record<string, unknown>[]"},
  {name:"get_strain_abbreviation",args:"p_strain_name: string",ret:"string"},
  {name:"get_trigger_performance_summary",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"get_trim_remaining_weight",args:"session_id: string",ret:"number"},
  {name:"is_admin",args:"Record<string, never>",ret:"boolean"},
  {name:"is_product_orderable",args:"p_product_id: string",ret:"boolean"},
  {name:"is_test_mode_enabled",args:"Record<string, never>",ret:"boolean"},
  {name:"log_test_mode_bypass",args:"p_action: string, p_validation_bypassed: string, p_context?: Json",ret:"string"},
  {name:"normalize_strain_name",args:"p_strain_name: string",ret:"string"},
  {name:"record_session_loss_weight",args:"p_session_type: string, p_session_id: string, p_loss_grams: number",ret:"Json"},
  {name:"repair_order_totals",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"resolve_movement_error",args:"p_error_id: string",ret:"undefined"},
  {name:"restore_inventory_for_order",args:"order_id_param: string",ret:"undefined"},
  {name:"rollback_to_direct_updates",args:"Record<string, never>",ret:"string"},
  {name:"simulate_movement_scenario",args:"scenario_name: string",ret:"Record<string, unknown>[]"},
  {name:"sync_batch_stage_tracking",args:"Record<string, never>",ret:"undefined"},
  {name:"sync_batches_from_inventory",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"sync_order_item_strains",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"sync_product_strain_ids",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"sync_products_for_all_strains",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"sync_products_for_strain",args:"p_strain_id: string, p_is_active?: boolean",ret:"Record<string, unknown>[]"},
  {name:"test_movement_trigger",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"update_allocation_workflow_stage",args:"allocation_id: string, new_stage: Database[\"public\"][\"Enums\"][\"allocation_workflow_stage\"]",ret:"undefined"},
  {name:"update_batch_tracking_from_inventory",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"update_user_profile",args:"target_user_id: string, new_full_name?: string, new_role?: string, new_is_active?: boolean",ret:"undefined"},
  {name:"validate_batch_strain_match",args:"p_batch_id: string, p_strain: string",ret:"boolean"},
  {name:"validate_canonical_product_catalog",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"validate_label_coa_requirement",args:"p_batch_number: string, p_label_type_code: string",ret:"Record<string, unknown>[]"},
  {name:"validate_order_totals",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"validate_ready_for_delivery",args:"order_id_param: string",ret:"boolean"},
  {name:"validate_strain_names",args:"p_strain_names: string[]",ret:"Record<string, unknown>[]"},
  {name:"verify_all_inventory",args:"Record<string, never>",ret:"Record<string, unknown>[]"},
  {name:"void_session_aggregated",args:"p_batch_id: string, p_product_name?: string, p_session_type?: string, p_reason?: string",ret:"Json"},
];

for (const fn of FUNCTIONS) {
  out += `      ${fn.name}: {\n`;
  if (fn.args.startsWith('Record<')) {
    out += `        Args: ${fn.args}\n`;
  } else {
    out += `        Args: {\n`;
    for (const arg of fn.args.split(', ')) {
      out += `          ${arg}\n`;
    }
    out += `        }\n`;
  }
  out += `        Returns: ${fn.ret}\n`;
  out += `      }\n`;
}

out += `    }\n`;

// Enums
out += `    Enums: {\n`;
for (const [name, values] of Object.entries(ENUMS).sort()) {
  out += `      ${name}: ${values}\n`;
}
out += `    }\n`;

// CompositeTypes
out += `    CompositeTypes: {\n`;
out += `      [_ in never]: never\n`;
out += `    }\n`;

out += `  }\n`;
out += `}\n\n`;

// Helper types
out += `type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
`;

writeFileSync(OUTPUT, out);
console.log(`Generated ${OUTPUT} (${out.split('\n').length} lines)`);
