-- ============================================================
-- Table DDL
-- Source: https://fonreynkfeqywshijqpi.supabase.co
-- Extracted: 2026-03-02
-- Count: 94
-- ============================================================
-- Table: app_settings
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  setting_value text NOT NULL,
  setting_type text NOT NULL DEFAULT 'text'::text,
  description text,
  category text DEFAULT 'general'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: batch_allocations
CREATE TABLE IF NOT EXISTS batch_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  order_item_id uuid NOT NULL,
  allocation_stage text NOT NULL,
  allocated_weight_grams numeric NOT NULL,
  projected_final_weight_grams numeric,
  status text DEFAULT 'pending'::text,
  allocated_at timestamp with time zone DEFAULT now(),
  fulfilled_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: batch_id_backfill_log
CREATE TABLE IF NOT EXISTS batch_id_backfill_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL,
  old_batch_id uuid,
  new_batch_id uuid,
  backfill_method text,
  batch_text text,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: batch_lifecycle_events
CREATE TABLE IF NOT EXISTS batch_lifecycle_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  event_type text NOT NULL,
  from_state text,
  to_state text,
  triggered_by text,
  trigger_source text,
  metadata jsonb,
  notes text,
  event_timestamp timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Table: batch_package_lineage
CREATE TABLE IF NOT EXISTS batch_package_lineage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  package_id text NOT NULL,
  package_type text NOT NULL,
  stage text NOT NULL,
  weight_grams numeric,
  created_from_session_id uuid,
  created_from_session_type text,
  is_current boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: batch_production_history
CREATE TABLE IF NOT EXISTS batch_production_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  event_type text NOT NULL,
  session_id uuid,
  session_type text,
  source_stage text,
  source_weight_grams numeric,
  destination_stage text,
  destination_weight_grams numeric,
  source_package_id text,
  destination_package_ids _text,
  performed_by text,
  notes text,
  event_timestamp timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Table: batch_projections
CREATE TABLE IF NOT EXISTS batch_projections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  source_stage text NOT NULL,
  source_weight_grams numeric NOT NULL,
  target_stage text NOT NULL,
  projected_weight_grams numeric NOT NULL,
  projection_date timestamp with time zone DEFAULT now(),
  actual_weight_grams numeric,
  variance_percentage numeric,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: batch_registry
CREATE TABLE IF NOT EXISTS batch_registry (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  batch_number text NOT NULL,
  strain text NOT NULL,
  harvest_date date,
  room text,
  initial_weight_grams numeric,
  coa_id uuid,
  status text DEFAULT 'active'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  lifecycle_state text DEFAULT 'created'::text,
  bucking_started_at timestamp with time zone,
  trimming_started_at timestamp with time zone,
  packaging_started_at timestamp with time zone,
  completed_at timestamp with time zone,
  depleted_at timestamp with time zone,
  is_quarantined boolean DEFAULT false,
  quarantine_reason text,
  quarantined_at timestamp with time zone,
  strain_id uuid,
  created_by uuid,
  clone_date date,
  mother_plant_group_ids _uuid,
  quality_grade_id uuid
);

-- Table: batch_stage_tracking
CREATE TABLE IF NOT EXISTS batch_stage_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  stage text NOT NULL,
  weight_grams numeric NOT NULL DEFAULT 0,
  allocated_weight_grams numeric NOT NULL DEFAULT 0,
  available_weight_grams numeric,
  location text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: binning_sessions
CREATE TABLE IF NOT EXISTS binning_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  harvest_session_id uuid NOT NULL,
  dry_room_id uuid NOT NULL,
  batch_registry_id uuid NOT NULL,
  dry_weight_grams numeric NOT NULL,
  bin_date date NOT NULL,
  session_status text NOT NULL DEFAULT 'active'::text,
  completed_at timestamp with time zone,
  completed_by uuid,
  cancelled_at timestamp with time zone,
  cancelled_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Table: bucked_inventory
CREATE TABLE IF NOT EXISTS bucked_inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  strain text NOT NULL,
  batch_id text NOT NULL,
  package_id text NOT NULL,
  room text,
  harvest_date date,
  initial_weight_grams numeric NOT NULL,
  current_weight_grams numeric NOT NULL,
  location text,
  status text NOT NULL DEFAULT 'available'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  batch_number text
);

-- Table: bucking_sessions
CREATE TABLE IF NOT EXISTS bucking_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  bucker_name text NOT NULL,
  session_status text NOT NULL DEFAULT 'active'::text,
  binned_package_id text NOT NULL,
  binned_weight_grams numeric NOT NULL,
  strain text NOT NULL,
  batch_id text NOT NULL,
  bucked_flower_grams numeric DEFAULT 0,
  bucked_smalls_grams numeric DEFAULT 0,
  waste_grams numeric DEFAULT 0,
  variance_grams numeric DEFAULT 0,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  minutes_bucked integer,
  kg_per_hour numeric,
  notes text,
  recorded_in_dutchie boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  cancelled_at timestamp with time zone,
  batch_registry_id uuid,
  finalization_status finalization_status NOT NULL DEFAULT 'pending'::finalization_status,
  finalized_at timestamp with time zone,
  finalized_by uuid,
  void_reason text,
  output_product_flower_name text,
  output_product_smalls_name text,
  finalization_status_bucked finalization_status NOT NULL DEFAULT 'pending'::finalization_status,
  finalized_at_bucked timestamp with time zone,
  finalized_by_bucked uuid,
  void_reason_bucked text,
  finalization_status_smalls finalization_status NOT NULL DEFAULT 'pending'::finalization_status,
  finalized_at_smalls timestamp with time zone,
  finalized_by_smalls uuid,
  void_reason_smalls text
);

-- Table: bulk_inventory
CREATE TABLE IF NOT EXISTS bulk_inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  strain text NOT NULL,
  batch_id text NOT NULL,
  product_type text NOT NULL,
  weight_grams numeric NOT NULL DEFAULT 0,
  location text,
  status text NOT NULL DEFAULT 'available'::text,
  quality_grade text,
  trim_date date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  batch_number text
);

-- Table: certificates_of_analysis
CREATE TABLE IF NOT EXISTS certificates_of_analysis (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  strain_name text NOT NULL,
  batch_number text NOT NULL,
  harvest_date date,
  manufacture_date date,
  sample_date date,
  thc_percentage numeric,
  cbd_percentage numeric,
  total_cannabinoids_percentage numeric,
  total_terpenes_mg_g numeric,
  terpene_1_name text,
  terpene_1_value numeric,
  terpene_1_percentage numeric,
  terpene_2_name text,
  terpene_2_value numeric,
  terpene_2_percentage numeric,
  terpene_3_name text,
  terpene_3_value numeric,
  terpene_3_percentage numeric,
  pdf_file_path text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  batch_id uuid
);

-- Table: coa_documents
CREATE TABLE IF NOT EXISTS coa_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coa_number text NOT NULL,
  batch_id text NOT NULL,
  strain text NOT NULL,
  test_date date NOT NULL,
  lab_name text NOT NULL,
  lab_license text,
  file_url text NOT NULL,
  file_type text DEFAULT 'pdf'::text,
  file_size_kb integer,
  thc_percentage numeric,
  thca_percentage numeric,
  cbd_percentage numeric,
  cbda_percentage numeric,
  total_cannabinoids numeric,
  terpene_profile jsonb,
  microbial_status text,
  heavy_metals_status text,
  pesticides_status text,
  pass_fail text,
  is_public boolean DEFAULT true,
  tags _text,
  notes text,
  uploaded_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: consolidated_package_sources
CREATE TABLE IF NOT EXISTS consolidated_package_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  consolidated_package_id uuid NOT NULL,
  session_id uuid NOT NULL,
  session_type text NOT NULL,
  session_date date NOT NULL,
  contribution_weight_grams numeric DEFAULT 0,
  contribution_units integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: consolidated_packages
CREATE TABLE IF NOT EXISTS consolidated_packages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  package_id text NOT NULL,
  package_date date NOT NULL DEFAULT CURRENT_DATE,
  strain text NOT NULL,
  strain_abbreviation text NOT NULL,
  product_stage text NOT NULL,
  product_type text NOT NULL,
  total_weight_grams numeric DEFAULT 0,
  total_units integer DEFAULT 0,
  room text DEFAULT 'Holding'::text,
  session_type text NOT NULL,
  session_count integer DEFAULT 0,
  source_session_ids _uuid DEFAULT '{}'::uuid[],
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: conversion_analytics
CREATE TABLE IF NOT EXISTS conversion_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  analysis_date date NOT NULL DEFAULT CURRENT_DATE,
  strain text NOT NULL,
  from_stage text NOT NULL,
  to_stage text NOT NULL,
  sample_size integer NOT NULL DEFAULT 0,
  actual_percentage numeric NOT NULL,
  expected_percentage numeric,
  variance_percentage numeric,
  total_input_grams numeric,
  total_output_grams numeric,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: conversion_packages
CREATE TABLE IF NOT EXISTS conversion_packages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversion_lot_id uuid,
  batch_id uuid NOT NULL,
  product_id uuid,
  package_id text NOT NULL,
  weight numeric,
  units integer,
  inventory_stage_id uuid,
  source_session_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  packaged_at date,
  finalization_status finalization_status NOT NULL DEFAULT 'pending'::finalization_status,
  finalized_at timestamp with time zone,
  finalized_by uuid,
  aggregation_id uuid
);

-- Table: conversion_rates
CREATE TABLE IF NOT EXISTS conversion_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_stage text NOT NULL,
  to_stage text NOT NULL,
  strain text,
  rate_percentage numeric DEFAULT 100,
  split_percentage numeric,
  effective_date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: conversion_variance_log
CREATE TABLE IF NOT EXISTS conversion_variance_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversion_lot_id uuid,
  batch_id uuid NOT NULL,
  product_id uuid,
  expected_weight numeric,
  actual_weight numeric,
  weight_variance numeric,
  expected_units integer,
  actual_units integer,
  unit_variance integer,
  variance_reason variance_reason NOT NULL,
  variance_note text,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid NOT NULL,
  acknowledged_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: coversheets
CREATE TABLE IF NOT EXISTS coversheets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coversheet_number text NOT NULL,
  order_id uuid,
  access_token text NOT NULL,
  qr_code_data text NOT NULL,
  qr_code_url text,
  customer_name text NOT NULL,
  delivery_date date,
  total_packages integer DEFAULT 0,
  total_weight_grams numeric DEFAULT 0,
  items_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  accessed_count integer DEFAULT 0,
  last_accessed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  compliance_header jsonb,
  manufacture_date date,
  is_outdated boolean DEFAULT false,
  last_order_update timestamp with time zone,
  batch_compliance_data jsonb DEFAULT '[]'::jsonb,
  distributed_to_data jsonb,
  package_manifest_data jsonb DEFAULT '[]'::jsonb
);

-- Table: crm_tasks
CREATE TABLE IF NOT EXISTS crm_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  assigned_user_id uuid,
  task_type text NOT NULL DEFAULT 'general'::text,
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  priority text NOT NULL DEFAULT 'medium'::text,
  status text NOT NULL DEFAULT 'open'::text,
  completed_at timestamp with time zone,
  related_activity_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: crm_visit_schedule
CREATE TABLE IF NOT EXISTS crm_visit_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  user_id uuid,
  visit_date date NOT NULL,
  visit_time_window text,
  visit_type text NOT NULL DEFAULT 'check_in'::text,
  location_notes text,
  status text NOT NULL DEFAULT 'scheduled'::text,
  outcome_notes text,
  linked_activity_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: customer_activity_log
CREATE TABLE IF NOT EXISTS customer_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  user_id uuid,
  activity_type text NOT NULL DEFAULT 'note'::text,
  subject text NOT NULL,
  body text,
  follow_up_date date,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  linked_task_id uuid,
  visit_id uuid,
  pinned boolean NOT NULL DEFAULT false,
  linked_order_id uuid
);

-- Table: customer_contacts
CREATE TABLE IF NOT EXISTS customer_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  name text NOT NULL,
  title text,
  email text,
  phone text,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: customer_price_lists
CREATE TABLE IF NOT EXISTS customer_price_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  product_id uuid NOT NULL,
  custom_price numeric NOT NULL,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  expires_at date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: customers
CREATE TABLE IF NOT EXISTS customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  ato_number text,
  city text,
  state text,
  postal_code text,
  dispensary_code text NOT NULL,
  license_number text,
  delivery_address text,
  delivery_city text,
  delivery_state text,
  delivery_postal_code text,
  license_name text,
  account_credit_balance numeric DEFAULT 0,
  latitude numeric,
  longitude numeric,
  geocoded_at timestamp with time zone,
  geocoding_error text,
  formatted_address text,
  parent_customer_id uuid,
  account_type text NOT NULL DEFAULT 'direct'::text,
  account_status text NOT NULL DEFAULT 'active'::text,
  default_payment_terms text DEFAULT 'Net 30'::text,
  preferred_delivery_day text,
  credit_limit numeric,
  last_order_date timestamp with time zone,
  lifetime_revenue numeric NOT NULL DEFAULT 0,
  tags _text NOT NULL DEFAULT '{}'::text[],
  delivery_model text NOT NULL DEFAULT 'direct_to_each'::text
);

-- Table: delivery_drivers
CREATE TABLE IF NOT EXISTS delivery_drivers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  fa_number text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: delivery_routes
CREATE TABLE IF NOT EXISTS delivery_routes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  origin_customer_id uuid,
  destination_customer_id uuid NOT NULL,
  route_geometry jsonb,
  summary jsonb,
  distance_meters numeric NOT NULL,
  duration_seconds numeric NOT NULL,
  last_calculated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  origin_location_id text
);

-- Table: delivery_schedule
CREATE TABLE IF NOT EXISTS delivery_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time_window text,
  driver_name text,
  route_number text,
  status text NOT NULL DEFAULT 'scheduled'::text,
  actual_delivery_time timestamp with time zone,
  signature text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: delivery_vehicles
CREATE TABLE IF NOT EXISTS delivery_vehicles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  license_plate text NOT NULL,
  vin text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: draft_orders
CREATE TABLE IF NOT EXISTS draft_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  priority text DEFAULT 'normal'::text,
  requested_delivery_date date,
  delivery_notes text,
  internal_notes text,
  order_items jsonb DEFAULT '[]'::jsonb,
  session_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval)
);

-- Table: dry_rooms
CREATE TABLE IF NOT EXISTS dry_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  room_code text NOT NULL,
  capacity_lbs numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Table: grow_rooms
CREATE TABLE IF NOT EXISTS grow_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  room_code text NOT NULL,
  room_type text NOT NULL DEFAULT 'flower'::text,
  capacity_plants integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Table: harvest_sessions
CREATE TABLE IF NOT EXISTS harvest_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plant_group_id uuid NOT NULL,
  harvest_date date NOT NULL,
  wet_weight_grams numeric NOT NULL,
  adjusted_weight_grams numeric,
  adjustment_reason text,
  plant_count_harvested integer NOT NULL,
  batch_registry_id uuid,
  session_status text NOT NULL DEFAULT 'active'::text,
  completed_at timestamp with time zone,
  completed_by uuid,
  cancelled_at timestamp with time zone,
  cancelled_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  waste_grams numeric,
  grow_room_id uuid,
  dry_room_id uuid
);

-- Table: harvest_weight_entries
CREATE TABLE IF NOT EXISTS harvest_weight_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  harvest_session_id uuid NOT NULL,
  weight_grams numeric NOT NULL,
  plant_count integer NOT NULL,
  entry_order integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

-- Table: individual_plants
CREATE TABLE IF NOT EXISTS individual_plants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plant_group_id uuid NOT NULL,
  state_plant_id text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Table: internal_bucked_inventory
CREATE TABLE IF NOT EXISTS internal_bucked_inventory (
  package_id text NOT NULL,
  strain text NOT NULL,
  batch_id text,
  initial_weight_grams numeric NOT NULL DEFAULT 0,
  current_weight_grams numeric NOT NULL DEFAULT 0,
  allocated_weight_grams numeric NOT NULL DEFAULT 0,
  available_weight_grams numeric,
  last_session_date date,
  status text DEFAULT 'available'::text,
  room text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  synced_from_snapshot_id uuid,
  strain_id uuid
);

-- Table: internal_bulk_inventory
CREATE TABLE IF NOT EXISTS internal_bulk_inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  strain text NOT NULL,
  batch_id text,
  product_type text NOT NULL,
  weight_grams numeric NOT NULL DEFAULT 0,
  allocated_weight_grams numeric NOT NULL DEFAULT 0,
  available_weight_grams numeric,
  quality_grade text,
  trim_date date,
  source_package_id text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  strain_id uuid
);

-- Table: internal_packaged_inventory
CREATE TABLE IF NOT EXISTS internal_packaged_inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  strain text NOT NULL,
  batch_id text,
  product_type text NOT NULL,
  unit_size text NOT NULL,
  units_count integer NOT NULL DEFAULT 0,
  units_allocated integer NOT NULL DEFAULT 0,
  units_available integer,
  packaging_session_id uuid,
  package_date date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: inventory_audit_lines
CREATE TABLE IF NOT EXISTS inventory_audit_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL,
  inventory_item_id uuid,
  package_id text NOT NULL,
  product_name text NOT NULL,
  strain text,
  batch text,
  room text,
  stage text NOT NULL,
  expected_qty numeric NOT NULL,
  unit text NOT NULL,
  actual_qty numeric,
  variance_qty numeric,
  variance_percentage numeric,
  variance_reason variance_reason,
  variance_notes text,
  confirmed boolean DEFAULT false,
  confirmed_at timestamp with time zone,
  line_order integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: inventory_audits
CREATE TABLE IF NOT EXISTS inventory_audits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  audit_number text NOT NULL,
  status audit_status NOT NULL DEFAULT 'initiated'::audit_status,
  selected_stages _text NOT NULL,
  notes text,
  total_packages integer,
  packages_with_variance integer,
  total_variance_amount numeric,
  is_locked boolean DEFAULT false,
  initiated_by uuid,
  initiated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  completed_by uuid,
  cancelled_at timestamp with time zone,
  cancelled_by uuid,
  cancellation_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: inventory_changes
CREATE TABLE IF NOT EXISTS inventory_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  package_id text NOT NULL,
  change_date timestamp with time zone DEFAULT now(),
  change_type text NOT NULL,
  previous_value text,
  new_value text,
  previous_qty numeric,
  new_qty numeric,
  snapshot_id uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: inventory_conversions
CREATE TABLE IF NOT EXISTS inventory_conversions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trim_session_id uuid,
  source_type text NOT NULL,
  source_id uuid,
  source_weight_grams numeric NOT NULL,
  destination_type text NOT NULL,
  destination_id uuid,
  destination_weight_grams numeric NOT NULL,
  conversion_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Table: inventory_internal_labels
CREATE TABLE IF NOT EXISTS inventory_internal_labels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  package_id text NOT NULL,
  label_data jsonb NOT NULL,
  printed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Table: inventory_items
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  package_id text NOT NULL,
  sku text,
  product_name text,
  batch text,
  strain text,
  status text,
  category text,
  tags text,
  vendor text,
  room text,
  available_qty numeric,
  net_weight numeric,
  unit text,
  quantity_with_allocated numeric,
  snapshot_id uuid,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  thc_percentage numeric,
  cbd_percentage numeric,
  batch_number text,
  batch_id uuid NOT NULL,
  product_stage_id uuid,
  parent_item_id uuid,
  on_hand_qty numeric DEFAULT 0,
  package_date date,
  reserved_qty numeric NOT NULL DEFAULT 0,
  test_mode boolean NOT NULL DEFAULT false,
  strain_id uuid,
  review_status text DEFAULT 'approved'::text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  quality_grade_id uuid
);

-- Table: inventory_movement_errors
CREATE TABLE IF NOT EXISTS inventory_movement_errors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  movement_data jsonb,
  error_message text NOT NULL,
  error_code text,
  error_context jsonb,
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by uuid
);

-- Table: inventory_movements
CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  movement_date timestamp with time zone DEFAULT now(),
  session_id uuid,
  notes text,
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  movement_kind text,
  source_item_id uuid,
  dest_item_id uuid,
  qty numeric,
  unit text,
  reason_code text,
  reference_id uuid,
  reference_type text
);

-- Table: inventory_reconciliation
CREATE TABLE IF NOT EXISTS inventory_reconciliation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reconciliation_date timestamp with time zone DEFAULT now(),
  previous_snapshot_id uuid,
  current_snapshot_id uuid,
  packages_compared integer DEFAULT 0,
  packages_matched integer DEFAULT 0,
  packages_with_variance integer DEFAULT 0,
  total_variance_grams numeric DEFAULT 0,
  status text DEFAULT 'pending_review'::text,
  reviewed_by text,
  reviewed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: inventory_snapshots
CREATE TABLE IF NOT EXISTS inventory_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  import_date timestamp with time zone DEFAULT now(),
  file_name text NOT NULL,
  imported_by text DEFAULT 'system'::text,
  row_count integer DEFAULT 0,
  status text DEFAULT 'completed'::text,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: inventory_variances
CREATE TABLE IF NOT EXISTS inventory_variances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reconciliation_id uuid,
  package_id text,
  inventory_type text,
  strain text,
  expected_quantity numeric,
  actual_quantity numeric,
  variance_quantity numeric,
  variance_category text,
  resolution_status text DEFAULT 'pending'::text,
  resolution_notes text,
  resolved_by text,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  order_id uuid,
  customer_id uuid,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  payment_terms text DEFAULT 'Net 30'::text,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: label_types
CREATE TABLE IF NOT EXISTS label_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  description text,
  requires_coa boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: labels
CREATE TABLE IF NOT EXISTS labels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  label_number text NOT NULL,
  product_id uuid,
  package_id text NOT NULL,
  batch_id text NOT NULL,
  strain text NOT NULL,
  product_name text NOT NULL,
  product_type text NOT NULL,
  net_weight_grams numeric NOT NULL,
  unit_count integer,
  qr_code_data text NOT NULL,
  qr_code_url text,
  thc_percentage numeric,
  cbd_percentage numeric,
  total_cannabinoids numeric,
  terpene_profile jsonb,
  test_date date,
  lab_name text,
  harvest_date date,
  package_date date,
  expiration_date date,
  compliance_uid text,
  warnings _text,
  printed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  lineage text,
  upc_code text,
  barcode_url text,
  barcode_format text DEFAULT 'CODE128'::text,
  label_type_id uuid,
  batch_number text,
  voided_at timestamp with time zone,
  print_count integer DEFAULT 0,
  last_printed_at timestamp with time zone,
  print_history jsonb DEFAULT '[]'::jsonb,
  voided_by uuid,
  void_reason text,
  strain_id uuid,
  dominance_type text
);

-- Table: manifests
CREATE TABLE IF NOT EXISTS manifests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  manifest_number text NOT NULL,
  manifest_date date NOT NULL DEFAULT CURRENT_DATE,
  driver_name text,
  vehicle_info text,
  route_number text,
  order_ids _uuid NOT NULL DEFAULT '{}'::uuid[],
  total_packages integer DEFAULT 0,
  total_weight_grams numeric DEFAULT 0,
  total_units integer DEFAULT 0,
  departure_time timestamp with time zone,
  estimated_delivery_time timestamp with time zone,
  actual_delivery_time timestamp with time zone,
  status text NOT NULL DEFAULT 'pending'::text,
  compliance_notes text,
  signature_data text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: monthly_performance_metrics
CREATE TABLE IF NOT EXISTS monthly_performance_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  month date NOT NULL,
  orders_fulfilled integer DEFAULT 0,
  average_fulfillment_days numeric DEFAULT 0,
  total_weight_trimmed_grams numeric DEFAULT 0,
  total_units_packaged integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: notification_preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  channel text NOT NULL,
  enabled boolean DEFAULT true,
  message_template text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: order_forecasts
CREATE TABLE IF NOT EXISTS order_forecasts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  forecast_date date NOT NULL DEFAULT CURRENT_DATE,
  strain text NOT NULL,
  product_type text NOT NULL,
  total_grams_needed numeric DEFAULT 0,
  total_units_needed numeric DEFAULT 0,
  grams_available numeric DEFAULT 0,
  grams_shortfall numeric,
  priority_score integer DEFAULT 0,
  earliest_due_date date,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: order_fulfillment_checklist
CREATE TABLE IF NOT EXISTS order_fulfillment_checklist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  order_item_id uuid,
  inventory_allocated boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  label_applied_at timestamp with time zone,
  coa_attached_at timestamp with time zone
);

-- Table: order_fulfillment_items
CREATE TABLE IF NOT EXISTS order_fulfillment_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid,
  order_item_id uuid,
  packaging_session_id uuid,
  packaged_inventory_id uuid,
  strain text NOT NULL,
  product_type text NOT NULL,
  unit_size text NOT NULL,
  units_assigned integer NOT NULL DEFAULT 0,
  assignment_date timestamp with time zone DEFAULT now(),
  status text DEFAULT 'assigned'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: order_items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  subtotal numeric,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  status order_item_status DEFAULT 'trimming'::order_item_status,
  updated_at timestamp with time zone DEFAULT now(),
  discount_amount numeric DEFAULT 0,
  strain text,
  strain_id uuid,
  demand_unit text,
  batch_id uuid,
  test_mode boolean NOT NULL DEFAULT false,
  is_sample boolean NOT NULL DEFAULT false
);

-- Table: orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  customer_id uuid,
  status text NOT NULL DEFAULT 'submitted'::text,
  priority text NOT NULL DEFAULT 'normal'::text,
  order_date timestamp with time zone DEFAULT now(),
  requested_delivery_date date,
  scheduled_delivery_date timestamp with time zone,
  delivery_notes text,
  internal_notes text,
  total_amount numeric DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  archived boolean DEFAULT false,
  coversheet_enabled boolean DEFAULT false,
  public_token text,
  order_source text DEFAULT 'manual'::text,
  test_mode boolean NOT NULL DEFAULT false,
  is_sample boolean NOT NULL DEFAULT false
);

-- Table: package_assignments
CREATE TABLE IF NOT EXISTS package_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_item_id uuid NOT NULL,
  package_id text NOT NULL,
  quantity_assigned numeric NOT NULL,
  assigned_by uuid,
  assigned_at timestamp with time zone DEFAULT now(),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  label_id uuid,
  status text NOT NULL DEFAULT 'reserved'::text
);

-- Table: packaging_schedule
CREATE TABLE IF NOT EXISTS packaging_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_start_time time without time zone,
  estimated_duration_minutes integer DEFAULT 0,
  assigned_to text,
  status text NOT NULL DEFAULT 'scheduled'::text,
  actual_start_time timestamp with time zone,
  actual_end_time timestamp with time zone,
  quality_check_passed boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: packaging_sessions
CREATE TABLE IF NOT EXISTS packaging_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  packager_name text NOT NULL,
  package_id text NOT NULL,
  strain text NOT NULL,
  batch_id text NOT NULL,
  package_weight numeric,
  pull_weight numeric,
  ending_weight numeric,
  units_3_5g integer DEFAULT 0,
  units_14g integer DEFAULT 0,
  units_454g integer DEFAULT 0,
  trim_grams numeric DEFAULT 0,
  waste_grams numeric DEFAULT 0,
  recorded_in_dutchie boolean DEFAULT false,
  notes text,
  session_status text DEFAULT 'active'::text,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  minutes_packaged numeric,
  units_per_hour numeric,
  variance_grams numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  conversion_metadata jsonb,
  test_mode boolean NOT NULL DEFAULT false,
  cancelled_at timestamp with time zone,
  batch_registry_id uuid,
  strain_id uuid,
  finalization_status finalization_status NOT NULL DEFAULT 'pending'::finalization_status,
  finalized_at timestamp with time zone,
  finalized_by uuid,
  void_reason text,
  output_product_name text,
  finalization_status_packaged finalization_status NOT NULL DEFAULT 'pending'::finalization_status,
  finalized_at_packaged timestamp with time zone,
  finalized_by_packaged uuid,
  void_reason_packaged text,
  finalization_status_3_5g text NOT NULL DEFAULT 'pending'::text,
  finalization_status_14g text NOT NULL DEFAULT 'pending'::text,
  finalization_status_1lb text NOT NULL DEFAULT 'pending'::text,
  finalized_at_3_5g timestamp with time zone,
  finalized_at_14g timestamp with time zone,
  finalized_at_1lb timestamp with time zone,
  finalized_by_3_5g uuid,
  finalized_by_14g uuid,
  finalized_by_1lb uuid,
  output_product_3_5g_name text,
  output_product_14g_name text,
  output_product_1lb_name text,
  void_reason_3_5g text,
  void_reason_14g text,
  void_reason_1lb text
);

-- Table: packaging_yield_history
CREATE TABLE IF NOT EXISTS packaging_yield_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  strain text NOT NULL,
  source_type text NOT NULL,
  target_type text NOT NULL,
  average_yield_percentage numeric NOT NULL,
  standard_deviation numeric,
  confidence_interval_lower numeric,
  confidence_interval_upper numeric,
  sample_size integer NOT NULL DEFAULT 1,
  date_range_start date,
  date_range_end date,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: packaging_yields
CREATE TABLE IF NOT EXISTS packaging_yields (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  strain text NOT NULL,
  source_type text NOT NULL,
  target_type text NOT NULL,
  input_weight_grams numeric NOT NULL,
  output_quantity_units integer NOT NULL,
  yield_percentage numeric,
  yield_rate_units_per_gram numeric,
  packaging_date date DEFAULT CURRENT_DATE,
  batch_id text,
  packaging_session_id uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: plant_group_cut_sessions
CREATE TABLE IF NOT EXISTS plant_group_cut_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plant_group_id uuid NOT NULL,
  mother_plant_group_id uuid NOT NULL,
  cut_count integer NOT NULL,
  cut_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Table: plant_group_room_history
CREATE TABLE IF NOT EXISTS plant_group_room_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plant_group_id uuid NOT NULL,
  from_room_id uuid NOT NULL,
  to_room_id uuid NOT NULL,
  moved_at timestamp with time zone NOT NULL DEFAULT now(),
  moved_by uuid,
  notes text
);

-- Table: plant_group_stage_history
CREATE TABLE IF NOT EXISTS plant_group_stage_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plant_group_id uuid NOT NULL,
  from_stage text,
  to_stage text NOT NULL,
  transitioned_at timestamp with time zone NOT NULL DEFAULT now(),
  transitioned_by uuid,
  notes text
);

-- Table: plant_groups
CREATE TABLE IF NOT EXISTS plant_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  strain_id uuid NOT NULL,
  grow_room_id uuid NOT NULL,
  mother_plant_group_id uuid,
  is_mother boolean NOT NULL DEFAULT false,
  plant_count integer NOT NULL,
  growth_stage text NOT NULL DEFAULT 'clone'::text,
  stage_entered_at timestamp with time zone NOT NULL DEFAULT now(),
  planted_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  room_table_id uuid,
  room_section_id uuid,
  batch_registry_id uuid,
  source_type text NOT NULL DEFAULT 'clone'::text
);

-- Table: product_labels
CREATE TABLE IF NOT EXISTS product_labels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  package_assignment_id uuid NOT NULL,
  label_number text NOT NULL,
  label_data jsonb NOT NULL,
  generated_at timestamp with time zone DEFAULT now(),
  printed_at timestamp with time zone,
  printed_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: product_stages
CREATE TABLE IF NOT EXISTS product_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  default_pricing_unit text NOT NULL DEFAULT 'unit'::text,
  allows_fractional_quantity boolean NOT NULL DEFAULT false,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: product_types
CREATE TABLE IF NOT EXISTS product_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_weight numeric,
  base_unit text,
  sort_order integer NOT NULL DEFAULT 0,
  applicable_stages _text NOT NULL DEFAULT '{}'::text[],
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: products
CREATE TABLE IF NOT EXISTS products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'flower'::text,
  strain text,
  unit text NOT NULL DEFAULT 'gram'::text,
  available_quantity numeric DEFAULT 0,
  price_per_unit numeric DEFAULT 0,
  trim_time_minutes integer DEFAULT 30,
  packaging_time_minutes integer DEFAULT 15,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  sku text,
  pricing_unit text DEFAULT 'g'::text,
  product_category text DEFAULT 'packaged'::text,
  allows_fractional_quantity boolean DEFAULT false,
  stage_id uuid,
  type_id uuid,
  strain_id uuid,
  generated_at timestamp with time zone,
  generation_batch_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  gross_weight numeric DEFAULT 0,
  net_weight numeric DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamp with time zone,
  replaced_by_product_id uuid,
  archive_reason text
);

-- Table: quality_grade_history
CREATE TABLE IF NOT EXISTS quality_grade_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  previous_grade_id uuid,
  new_grade_id uuid,
  changed_by uuid,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: quality_grades
CREATE TABLE IF NOT EXISTS quality_grades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  color_class text NOT NULL DEFAULT 'gray'::text,
  description text NOT NULL DEFAULT ''::text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: quarantine_violation_log
CREATE TABLE IF NOT EXISTS quarantine_violation_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  batch_id uuid,
  attempted_operation text NOT NULL,
  movement_kind text,
  order_id uuid,
  item_id uuid,
  blocked_at timestamp with time zone DEFAULT now(),
  blocked_by uuid,
  quarantine_reason text,
  violation_details jsonb
);

-- Table: room_sections
CREATE TABLE IF NOT EXISTS room_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_table_id uuid NOT NULL,
  section_label text NOT NULL,
  section_sqft numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  flip_date date,
  projected_harvest_date date
);

-- Table: room_tables
CREATE TABLE IF NOT EXISTS room_tables (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  grow_room_id uuid NOT NULL,
  table_number integer NOT NULL,
  table_name text,
  total_sqft numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Table: route_waypoints
CREATE TABLE IF NOT EXISTS route_waypoints (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL,
  step_number integer NOT NULL,
  instruction_text text NOT NULL,
  distance_meters numeric NOT NULL,
  duration_seconds numeric NOT NULL,
  street_name text,
  direction text,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: sales_rep_assignments
CREATE TABLE IF NOT EXISTS sales_rep_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'primary'::text,
  assigned_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: slack_notifications
CREATE TABLE IF NOT EXISTS slack_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  order_id uuid,
  channel text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  sent_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: strain_aliases
CREATE TABLE IF NOT EXISTS strain_aliases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  strain_id uuid NOT NULL,
  alias text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: strain_metadata
CREATE TABLE IF NOT EXISTS strain_metadata (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text DEFAULT 'hybrid'::text,
  genetics text,
  abbreviation text,
  avg_bucked_to_flower_ratio numeric DEFAULT 0.50,
  avg_bucked_to_smalls_ratio numeric DEFAULT 0.25,
  avg_bucked_to_trim_ratio numeric DEFAULT 0.20,
  avg_waste_percentage numeric DEFAULT 0.05,
  avg_trim_grams_per_hour numeric DEFAULT 150,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  over_allocation_warning_threshold numeric DEFAULT 100,
  over_allocation_critical_threshold numeric DEFAULT 120
);

-- Table: strains
CREATE TABLE IF NOT EXISTS strains (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  abbreviation text,
  dominance_type text,
  genetics_description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  display_name text NOT NULL,
  category text,
  thc_range text,
  cbd_range text,
  terpene_profile jsonb DEFAULT '{}'::jsonb,
  description text,
  cultivation_notes text,
  typical_yield_percentage numeric DEFAULT 75.0,
  bucked_to_bulk_ratio numeric DEFAULT 0.85,
  bulk_to_packaged_ratio numeric DEFAULT 0.95,
  avg_bucked_to_flower_ratio numeric DEFAULT 0.50,
  avg_bucked_to_smalls_ratio numeric DEFAULT 0.25,
  avg_bucked_to_trim_ratio numeric DEFAULT 0.20,
  avg_waste_percentage numeric DEFAULT 0.05,
  avg_trim_grams_per_hour numeric DEFAULT 150,
  notes text
);

-- Table: system_metadata
CREATE TABLE IF NOT EXISTS system_metadata (
  key text NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: test_mode_audit_log
CREATE TABLE IF NOT EXISTS test_mode_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  validation_bypassed text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: throughput_metrics
CREATE TABLE IF NOT EXISTS throughput_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  metric_date date NOT NULL,
  worker_name text NOT NULL,
  worker_type text NOT NULL,
  strain text,
  total_weight_processed numeric NOT NULL DEFAULT 0,
  total_units_produced integer NOT NULL DEFAULT 0,
  total_minutes_worked integer NOT NULL DEFAULT 0,
  avg_grams_per_hour numeric,
  avg_units_per_hour numeric,
  sessions_completed integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: trim_schedule
CREATE TABLE IF NOT EXISTS trim_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_start_time time without time zone,
  estimated_duration_minutes integer DEFAULT 0,
  assigned_to text,
  station_number text,
  status text NOT NULL DEFAULT 'scheduled'::text,
  actual_start_time timestamp with time zone,
  actual_end_time timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: trim_sessions
CREATE TABLE IF NOT EXISTS trim_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  trimmer_name text NOT NULL,
  package_id text NOT NULL,
  strain text NOT NULL,
  batch_id text NOT NULL,
  bucked_inventory_id uuid,
  package_total_weight numeric,
  pulled_weight numeric NOT NULL,
  time_started time without time zone,
  time_ended time without time zone,
  minutes_trimmed integer,
  grams_per_hour numeric,
  big_buds_grams numeric DEFAULT 0,
  small_buds_grams numeric DEFAULT 0,
  trim_grams numeric DEFAULT 0,
  waste_grams numeric DEFAULT 0,
  variance_grams numeric DEFAULT 0,
  trim_method text DEFAULT 'hand'::text,
  recorded_in_dutchie boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  session_status text DEFAULT 'active'::text,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  bucked_smalls_grams numeric DEFAULT 0,
  bucked_smalls_inventory_id uuid,
  test_mode boolean NOT NULL DEFAULT false,
  cancelled_at timestamp with time zone,
  batch_registry_id uuid,
  strain_id uuid,
  finalization_status finalization_status NOT NULL DEFAULT 'pending'::finalization_status,
  finalized_at timestamp with time zone,
  finalized_by uuid,
  void_reason text,
  output_product_bigs_name text,
  output_product_smalls_name text,
  output_product_trim_name text,
  finalization_status_bigs finalization_status NOT NULL DEFAULT 'pending'::finalization_status,
  finalized_at_bigs timestamp with time zone,
  finalized_by_bigs uuid,
  void_reason_bigs text,
  finalization_status_smalls finalization_status NOT NULL DEFAULT 'pending'::finalization_status,
  finalized_at_smalls timestamp with time zone,
  finalized_by_smalls uuid,
  void_reason_smalls text,
  finalization_status_trim finalization_status NOT NULL DEFAULT 'pending'::finalization_status,
  finalized_at_trim timestamp with time zone,
  finalized_by_trim uuid,
  void_reason_trim text
);

-- Table: user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'user'::text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: variance_log
CREATE TABLE IF NOT EXISTS variance_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_type variance_source NOT NULL,
  source_id uuid NOT NULL,
  inventory_item_id uuid,
  package_id text NOT NULL,
  expected_qty numeric NOT NULL,
  actual_qty numeric NOT NULL,
  variance_qty numeric NOT NULL,
  variance_percentage numeric NOT NULL,
  unit text NOT NULL,
  variance_reason variance_reason NOT NULL,
  notes text,
  inventory_stage text,
  strain text,
  batch text,
  product_name text,
  user_id uuid,
  timestamp timestamp with time zone DEFAULT now(),
  movement_id uuid,
  created_at timestamp with time zone DEFAULT now()
);
