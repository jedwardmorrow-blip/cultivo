-- ============================================================
-- RLS Policies
-- Source: https://fonreynkfeqywshijqpi.supabase.co
-- Extracted: 2026-03-02
-- Count: 263
-- ============================================================
-- Policy: Anonymous users can read company settings for coversheets ON app_settings
CREATE POLICY "Anonymous users can read company settings for coversheets"
  ON app_settings
  AS PERMISSIVE
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Authenticated users can delete app_settings ON app_settings
CREATE POLICY "Authenticated users can delete app_settings"
  ON app_settings
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert app_settings ON app_settings
CREATE POLICY "Authenticated users can insert app_settings"
  ON app_settings
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read app_settings ON app_settings
CREATE POLICY "Authenticated users can read app_settings"
  ON app_settings
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update app_settings ON app_settings
CREATE POLICY "Authenticated users can update app_settings"
  ON app_settings
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete batch_allocations ON batch_allocations
CREATE POLICY "Authenticated users can delete batch_allocations"
  ON batch_allocations
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert batch_allocations ON batch_allocations
CREATE POLICY "Authenticated users can insert batch_allocations"
  ON batch_allocations
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update batch_allocations ON batch_allocations
CREATE POLICY "Authenticated users can update batch_allocations"
  ON batch_allocations
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view batch_allocations ON batch_allocations
CREATE POLICY "Authenticated users can view batch_allocations"
  ON batch_allocations
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert batch lifecycle events ON batch_lifecycle_events
CREATE POLICY "Authenticated users can insert batch lifecycle events"
  ON batch_lifecycle_events
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can view batch lifecycle events ON batch_lifecycle_events
CREATE POLICY "Authenticated users can view batch lifecycle events"
  ON batch_lifecycle_events
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can manage batch package lineage ON batch_package_lineage
CREATE POLICY "Authenticated users can manage batch package lineage"
  ON batch_package_lineage
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view batch package lineage ON batch_package_lineage
CREATE POLICY "Authenticated users can view batch package lineage"
  ON batch_package_lineage
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert batch production history ON batch_production_history
CREATE POLICY "Authenticated users can insert batch production history"
  ON batch_production_history
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can view batch production history ON batch_production_history
CREATE POLICY "Authenticated users can view batch production history"
  ON batch_production_history
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can delete batch_projections ON batch_projections
CREATE POLICY "Authenticated users can delete batch_projections"
  ON batch_projections
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert batch_projections ON batch_projections
CREATE POLICY "Authenticated users can insert batch_projections"
  ON batch_projections
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update batch_projections ON batch_projections
CREATE POLICY "Authenticated users can update batch_projections"
  ON batch_projections
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view batch_projections ON batch_projections
CREATE POLICY "Authenticated users can view batch_projections"
  ON batch_projections
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Anonymous users can read batch traceability ON batch_registry
CREATE POLICY "Anonymous users can read batch traceability"
  ON batch_registry
  AS PERMISSIVE
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Authenticated users can delete batch_registry ON batch_registry
CREATE POLICY "Authenticated users can delete batch_registry"
  ON batch_registry
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert batch_registry ON batch_registry
CREATE POLICY "Authenticated users can insert batch_registry"
  ON batch_registry
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update batch_registry ON batch_registry
CREATE POLICY "Authenticated users can update batch_registry"
  ON batch_registry
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view batch_registry ON batch_registry
CREATE POLICY "Authenticated users can view batch_registry"
  ON batch_registry
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can delete batch_stage_tracking ON batch_stage_tracking
CREATE POLICY "Authenticated users can delete batch_stage_tracking"
  ON batch_stage_tracking
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert batch_stage_tracking ON batch_stage_tracking
CREATE POLICY "Authenticated users can insert batch_stage_tracking"
  ON batch_stage_tracking
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update batch_stage_tracking ON batch_stage_tracking
CREATE POLICY "Authenticated users can update batch_stage_tracking"
  ON batch_stage_tracking
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view batch_stage_tracking ON batch_stage_tracking
CREATE POLICY "Authenticated users can view batch_stage_tracking"
  ON batch_stage_tracking
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert binning sessions ON binning_sessions
CREATE POLICY "Authenticated users can insert binning sessions"
  ON binning_sessions
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can update binning sessions ON binning_sessions
CREATE POLICY "Authenticated users can update binning sessions"
  ON binning_sessions
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can view binning sessions ON binning_sessions
CREATE POLICY "Authenticated users can view binning sessions"
  ON binning_sessions
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can delete bucking sessions ON bucking_sessions
CREATE POLICY "Authenticated users can delete bucking sessions"
  ON bucking_sessions
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert bucking sessions ON bucking_sessions
CREATE POLICY "Authenticated users can insert bucking sessions"
  ON bucking_sessions
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update bucking sessions ON bucking_sessions
CREATE POLICY "Authenticated users can update bucking sessions"
  ON bucking_sessions
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view bucking sessions ON bucking_sessions
CREATE POLICY "Authenticated users can view bucking sessions"
  ON bucking_sessions
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Enable delete for authenticated users ON bucking_sessions
CREATE POLICY "Enable delete for authenticated users"
  ON bucking_sessions
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Enable insert for authenticated users ON bucking_sessions
CREATE POLICY "Enable insert for authenticated users"
  ON bucking_sessions
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Enable read access for authenticated users ON bucking_sessions
CREATE POLICY "Enable read access for authenticated users"
  ON bucking_sessions
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Enable update for authenticated users ON bucking_sessions
CREATE POLICY "Enable update for authenticated users"
  ON bucking_sessions
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can delete COAs ON certificates_of_analysis
CREATE POLICY "Authenticated users can delete COAs"
  ON certificates_of_analysis
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert COAs ON certificates_of_analysis
CREATE POLICY "Authenticated users can insert COAs"
  ON certificates_of_analysis
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update COAs ON certificates_of_analysis
CREATE POLICY "Authenticated users can update COAs"
  ON certificates_of_analysis
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view all COAs ON certificates_of_analysis
CREATE POLICY "Authenticated users can view all COAs"
  ON certificates_of_analysis
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated insert coa_documents ON coa_documents
CREATE POLICY "Allow authenticated insert coa_documents"
  ON coa_documents
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated update coa_documents ON coa_documents
CREATE POLICY "Allow authenticated update coa_documents"
  ON coa_documents
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Allow public read coa_documents ON coa_documents
CREATE POLICY "Allow public read coa_documents"
  ON coa_documents
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING ((is_public = true));

-- Policy: Authenticated users can delete consolidated_package_sources ON consolidated_package_sources
CREATE POLICY "Authenticated users can delete consolidated_package_sources"
  ON consolidated_package_sources
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert consolidated_package_sources ON consolidated_package_sources
CREATE POLICY "Authenticated users can insert consolidated_package_sources"
  ON consolidated_package_sources
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can view consolidated_package_sources ON consolidated_package_sources
CREATE POLICY "Authenticated users can view consolidated_package_sources"
  ON consolidated_package_sources
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can modify consolidated_packages ON consolidated_packages
CREATE POLICY "Authenticated users can modify consolidated_packages"
  ON consolidated_packages
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated read conversion_analytics ON conversion_analytics
CREATE POLICY "Allow authenticated read conversion_analytics"
  ON conversion_analytics
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Conversion packages are immutable (no deletes) ON conversion_packages
CREATE POLICY "Conversion packages are immutable (no deletes)"
  ON conversion_packages
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (false);

-- Policy: Conversion packages are immutable (no updates) ON conversion_packages
CREATE POLICY "Conversion packages are immutable (no updates)"
  ON conversion_packages
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (false);

-- Policy: Managers and admins can insert conversion packages ON conversion_packages
CREATE POLICY "Managers and admins can insert conversion packages"
  ON conversion_packages
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['manager'::text, 'admin'::text]))))));

-- Policy: Managers and admins can view conversion packages ON conversion_packages
CREATE POLICY "Managers and admins can view conversion packages"
  ON conversion_packages
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['manager'::text, 'admin'::text]))))));

-- Policy: Managers and admins can insert variance logs ON conversion_variance_log
CREATE POLICY "Managers and admins can insert variance logs"
  ON conversion_variance_log
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['manager'::text, 'admin'::text]))))));

-- Policy: Managers and admins can view variance logs ON conversion_variance_log
CREATE POLICY "Managers and admins can view variance logs"
  ON conversion_variance_log
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['manager'::text, 'admin'::text]))))));

-- Policy: Variance logs are immutable (no deletes) ON conversion_variance_log
CREATE POLICY "Variance logs are immutable (no deletes)"
  ON conversion_variance_log
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (false);

-- Policy: Variance logs are immutable (no updates) ON conversion_variance_log
CREATE POLICY "Variance logs are immutable (no updates)"
  ON conversion_variance_log
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (false);

-- Policy: Allow authenticated full access coversheets ON coversheets
CREATE POLICY "Allow authenticated full access coversheets"
  ON coversheets
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true);

-- Policy: Allow public access count update on coversheets ON coversheets
CREATE POLICY "Allow public access count update on coversheets"
  ON coversheets
  AS PERMISSIVE
  FOR UPDATE
  TO anon
  USING ((is_active = true))
  WITH CHECK ((is_active = true));

-- Policy: Allow public read coversheets by token ON coversheets
CREATE POLICY "Allow public read coversheets by token"
  ON coversheets
  AS PERMISSIVE
  FOR SELECT
  TO anon
  USING ((is_active = true));

-- Policy: Authenticated users can create tasks ON crm_tasks
CREATE POLICY "Authenticated users can create tasks"
  ON crm_tasks
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can delete tasks ON crm_tasks
CREATE POLICY "Authenticated users can delete tasks"
  ON crm_tasks
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can update tasks ON crm_tasks
CREATE POLICY "Authenticated users can update tasks"
  ON crm_tasks
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can view tasks ON crm_tasks
CREATE POLICY "Authenticated users can view tasks"
  ON crm_tasks
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can create visits ON crm_visit_schedule
CREATE POLICY "Authenticated users can create visits"
  ON crm_visit_schedule
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can delete visits ON crm_visit_schedule
CREATE POLICY "Authenticated users can delete visits"
  ON crm_visit_schedule
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can update visits ON crm_visit_schedule
CREATE POLICY "Authenticated users can update visits"
  ON crm_visit_schedule
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can view visits ON crm_visit_schedule
CREATE POLICY "Authenticated users can view visits"
  ON crm_visit_schedule
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can delete customer activity log ON customer_activity_log
CREATE POLICY "Authenticated users can delete customer activity log"
  ON customer_activity_log
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert customer activity log ON customer_activity_log
CREATE POLICY "Authenticated users can insert customer activity log"
  ON customer_activity_log
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read customer activity log ON customer_activity_log
CREATE POLICY "Authenticated users can read customer activity log"
  ON customer_activity_log
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update customer activity log ON customer_activity_log
CREATE POLICY "Authenticated users can update customer activity log"
  ON customer_activity_log
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete customer contacts ON customer_contacts
CREATE POLICY "Authenticated users can delete customer contacts"
  ON customer_contacts
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert customer contacts ON customer_contacts
CREATE POLICY "Authenticated users can insert customer contacts"
  ON customer_contacts
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read customer contacts ON customer_contacts
CREATE POLICY "Authenticated users can read customer contacts"
  ON customer_contacts
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update customer contacts ON customer_contacts
CREATE POLICY "Authenticated users can update customer contacts"
  ON customer_contacts
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete customer price lists ON customer_price_lists
CREATE POLICY "Authenticated users can delete customer price lists"
  ON customer_price_lists
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert customer price lists ON customer_price_lists
CREATE POLICY "Authenticated users can insert customer price lists"
  ON customer_price_lists
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read customer price lists ON customer_price_lists
CREATE POLICY "Authenticated users can read customer price lists"
  ON customer_price_lists
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update customer price lists ON customer_price_lists
CREATE POLICY "Authenticated users can update customer price lists"
  ON customer_price_lists
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete customers ON customers
CREATE POLICY "Authenticated users can delete customers"
  ON customers
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert customers ON customers
CREATE POLICY "Authenticated users can insert customers"
  ON customers
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read customers ON customers
CREATE POLICY "Authenticated users can read customers"
  ON customers
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update customers ON customers
CREATE POLICY "Authenticated users can update customers"
  ON customers
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete drivers ON delivery_drivers
CREATE POLICY "Authenticated users can delete drivers"
  ON delivery_drivers
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert drivers ON delivery_drivers
CREATE POLICY "Authenticated users can insert drivers"
  ON delivery_drivers
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read drivers ON delivery_drivers
CREATE POLICY "Authenticated users can read drivers"
  ON delivery_drivers
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update drivers ON delivery_drivers
CREATE POLICY "Authenticated users can update drivers"
  ON delivery_drivers
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete routes ON delivery_routes
CREATE POLICY "Authenticated users can delete routes"
  ON delivery_routes
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert routes ON delivery_routes
CREATE POLICY "Authenticated users can insert routes"
  ON delivery_routes
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read routes ON delivery_routes
CREATE POLICY "Authenticated users can read routes"
  ON delivery_routes
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update routes ON delivery_routes
CREATE POLICY "Authenticated users can update routes"
  ON delivery_routes
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can manage delivery_schedule ON delivery_schedule
CREATE POLICY "Authenticated users can manage delivery_schedule"
  ON delivery_schedule
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete vehicles ON delivery_vehicles
CREATE POLICY "Authenticated users can delete vehicles"
  ON delivery_vehicles
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert vehicles ON delivery_vehicles
CREATE POLICY "Authenticated users can insert vehicles"
  ON delivery_vehicles
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read vehicles ON delivery_vehicles
CREATE POLICY "Authenticated users can read vehicles"
  ON delivery_vehicles
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update vehicles ON delivery_vehicles
CREATE POLICY "Authenticated users can update vehicles"
  ON delivery_vehicles
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Anonymous users can delete drafts by session ON draft_orders
CREATE POLICY "Anonymous users can delete drafts by session"
  ON draft_orders
  AS PERMISSIVE
  FOR DELETE
  TO anon
  USING ((session_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'session_id'::text))));

-- Policy: Anonymous users can insert drafts ON draft_orders
CREATE POLICY "Anonymous users can insert drafts"
  ON draft_orders
  AS PERMISSIVE
  FOR INSERT
  TO anon
  WITH CHECK ((session_id IS NOT NULL));

-- Policy: Anonymous users can update drafts by session ON draft_orders
CREATE POLICY "Anonymous users can update drafts by session"
  ON draft_orders
  AS PERMISSIVE
  FOR UPDATE
  TO anon
  USING ((session_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'session_id'::text))));

-- Policy: Anonymous users can view drafts by session ON draft_orders
CREATE POLICY "Anonymous users can view drafts by session"
  ON draft_orders
  AS PERMISSIVE
  FOR SELECT
  TO anon
  USING ((session_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'session_id'::text))));

-- Policy: Authenticated users can delete own drafts ON draft_orders
CREATE POLICY "Authenticated users can delete own drafts"
  ON draft_orders
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert drafts ON draft_orders
CREATE POLICY "Authenticated users can insert drafts"
  ON draft_orders
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update own drafts ON draft_orders
CREATE POLICY "Authenticated users can update own drafts"
  ON draft_orders
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view own drafts ON draft_orders
CREATE POLICY "Authenticated users can view own drafts"
  ON draft_orders
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert dry rooms ON dry_rooms
CREATE POLICY "Authenticated users can insert dry rooms"
  ON dry_rooms
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can update dry rooms ON dry_rooms
CREATE POLICY "Authenticated users can update dry rooms"
  ON dry_rooms
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can view dry rooms ON dry_rooms
CREATE POLICY "Authenticated users can view dry rooms"
  ON dry_rooms
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can insert grow rooms ON grow_rooms
CREATE POLICY "Authenticated users can insert grow rooms"
  ON grow_rooms
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can update grow rooms ON grow_rooms
CREATE POLICY "Authenticated users can update grow rooms"
  ON grow_rooms
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can view grow rooms ON grow_rooms
CREATE POLICY "Authenticated users can view grow rooms"
  ON grow_rooms
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can insert harvest sessions ON harvest_sessions
CREATE POLICY "Authenticated users can insert harvest sessions"
  ON harvest_sessions
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can update harvest sessions ON harvest_sessions
CREATE POLICY "Authenticated users can update harvest sessions"
  ON harvest_sessions
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can view harvest sessions ON harvest_sessions
CREATE POLICY "Authenticated users can view harvest sessions"
  ON harvest_sessions
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can delete weight entries for active sessio ON harvest_weight_entries
CREATE POLICY "Authenticated users can delete weight entries for active sessio"
  ON harvest_weight_entries
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM harvest_sessions
  WHERE ((harvest_sessions.id = harvest_weight_entries.harvest_session_id) AND (harvest_sessions.session_status = 'active'::text)))));

-- Policy: Authenticated users can insert harvest weight entries ON harvest_weight_entries
CREATE POLICY "Authenticated users can insert harvest weight entries"
  ON harvest_weight_entries
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can view harvest weight entries ON harvest_weight_entries
CREATE POLICY "Authenticated users can view harvest weight entries"
  ON harvest_weight_entries
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert individual plants ON individual_plants
CREATE POLICY "Authenticated users can insert individual plants"
  ON individual_plants
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can update individual plants ON individual_plants
CREATE POLICY "Authenticated users can update individual plants"
  ON individual_plants
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can view individual plants ON individual_plants
CREATE POLICY "Authenticated users can view individual plants"
  ON individual_plants
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can modify internal_bucked_inventory ON internal_bucked_inventory
CREATE POLICY "Authenticated users can modify internal_bucked_inventory"
  ON internal_bucked_inventory
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can modify internal_bulk_inventory ON internal_bulk_inventory
CREATE POLICY "Authenticated users can modify internal_bulk_inventory"
  ON internal_bulk_inventory
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can modify internal_packaged_inventory ON internal_packaged_inventory
CREATE POLICY "Authenticated users can modify internal_packaged_inventory"
  ON internal_packaged_inventory
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Audit lines follow audit access - DELETE ON inventory_audit_lines
CREATE POLICY "Audit lines follow audit access - DELETE"
  ON inventory_audit_lines
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (inventory_audits ia
     JOIN user_profiles up ON ((up.id = ( SELECT auth.uid() AS uid))))
  WHERE ((ia.id = inventory_audit_lines.audit_id) AND (up.role = 'admin'::text)))));

-- Policy: Audit lines follow audit access - INSERT ON inventory_audit_lines
CREATE POLICY "Audit lines follow audit access - INSERT"
  ON inventory_audit_lines
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (inventory_audits ia
     JOIN user_profiles up ON ((up.id = ( SELECT auth.uid() AS uid))))
  WHERE ((ia.id = inventory_audit_lines.audit_id) AND (up.role = ANY (ARRAY['manager'::text, 'admin'::text]))))));

-- Policy: Audit lines follow audit access - SELECT ON inventory_audit_lines
CREATE POLICY "Audit lines follow audit access - SELECT"
  ON inventory_audit_lines
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (inventory_audits ia
     JOIN user_profiles up ON ((up.id = ( SELECT auth.uid() AS uid))))
  WHERE ((ia.id = inventory_audit_lines.audit_id) AND (up.role = ANY (ARRAY['manager'::text, 'admin'::text]))))));

-- Policy: Audit lines follow audit access - UPDATE ON inventory_audit_lines
CREATE POLICY "Audit lines follow audit access - UPDATE"
  ON inventory_audit_lines
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (inventory_audits ia
     JOIN user_profiles up ON ((up.id = ( SELECT auth.uid() AS uid))))
  WHERE ((ia.id = inventory_audit_lines.audit_id) AND ((up.role = 'admin'::text) OR ((up.role = 'manager'::text) AND (ia.initiated_by = up.id)))))));

-- Policy: Managers and admins can create audits ON inventory_audits
CREATE POLICY "Managers and admins can create audits"
  ON inventory_audits
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['manager'::text, 'admin'::text]))))));

-- Policy: Managers and admins can view audits ON inventory_audits
CREATE POLICY "Managers and admins can view audits"
  ON inventory_audits
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['manager'::text, 'admin'::text]))))));

-- Policy: Managers can update own audits, admins all ON inventory_audits
CREATE POLICY "Managers can update own audits, admins all"
  ON inventory_audits
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND ((up.role = 'admin'::text) OR ((up.role = 'manager'::text) AND (inventory_audits.initiated_by = up.id)))))));

-- Policy: Only admins can delete audits ON inventory_audits
CREATE POLICY "Only admins can delete audits"
  ON inventory_audits
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'admin'::text)))));

-- Policy: Authenticated users can create internal labels ON inventory_internal_labels
CREATE POLICY "Authenticated users can create internal labels"
  ON inventory_internal_labels
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read internal labels ON inventory_internal_labels
CREATE POLICY "Authenticated users can read internal labels"
  ON inventory_internal_labels
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Anonymous users can read inventory package dates ON inventory_items
CREATE POLICY "Anonymous users can read inventory package dates"
  ON inventory_items
  AS PERMISSIVE
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Authenticated users can delete inventory_items ON inventory_items
CREATE POLICY "Authenticated users can delete inventory_items"
  ON inventory_items
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert inventory_items ON inventory_items
CREATE POLICY "Authenticated users can insert inventory_items"
  ON inventory_items
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read inventory_items ON inventory_items
CREATE POLICY "Authenticated users can read inventory_items"
  ON inventory_items
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update inventory_items ON inventory_items
CREATE POLICY "Authenticated users can update inventory_items"
  ON inventory_items
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Admins can view movement errors ON inventory_movement_errors
CREATE POLICY "Admins can view movement errors"
  ON inventory_movement_errors
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

-- Policy: System can insert movement errors ON inventory_movement_errors
CREATE POLICY "System can insert movement errors"
  ON inventory_movement_errors
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can insert inventory_movements ON inventory_movements
CREATE POLICY "Authenticated users can insert inventory_movements"
  ON inventory_movements
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can view inventory_movements ON inventory_movements
CREATE POLICY "Authenticated users can view inventory_movements"
  ON inventory_movements
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Block DELETE on inventory_movements ON inventory_movements
CREATE POLICY "Block DELETE on inventory_movements"
  ON inventory_movements
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (false);

-- Policy: Block UPDATE on immutable movement fields ON inventory_movements
CREATE POLICY "Block UPDATE on immutable movement fields"
  ON inventory_movements
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (false);

-- Policy: Movements are immutable ON inventory_movements
CREATE POLICY "Movements are immutable"
  ON inventory_movements
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

-- Policy: Movements cannot be deleted ON inventory_movements
CREATE POLICY "Movements cannot be deleted"
  ON inventory_movements
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

-- Policy: Authenticated users can modify inventory_reconciliation ON inventory_reconciliation
CREATE POLICY "Authenticated users can modify inventory_reconciliation"
  ON inventory_reconciliation
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete inventory_snapshots ON inventory_snapshots
CREATE POLICY "Authenticated users can delete inventory_snapshots"
  ON inventory_snapshots
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert inventory_snapshots ON inventory_snapshots
CREATE POLICY "Authenticated users can insert inventory_snapshots"
  ON inventory_snapshots
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read inventory_snapshots ON inventory_snapshots
CREATE POLICY "Authenticated users can read inventory_snapshots"
  ON inventory_snapshots
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update inventory_snapshots ON inventory_snapshots
CREATE POLICY "Authenticated users can update inventory_snapshots"
  ON inventory_snapshots
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can modify inventory_variances ON inventory_variances
CREATE POLICY "Authenticated users can modify inventory_variances"
  ON inventory_variances
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated insert invoices ON invoices
CREATE POLICY "Allow authenticated insert invoices"
  ON invoices
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated read invoices ON invoices
CREATE POLICY "Allow authenticated read invoices"
  ON invoices
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated update invoices ON invoices
CREATE POLICY "Allow authenticated update invoices"
  ON invoices
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can delete label_types ON label_types
CREATE POLICY "Authenticated users can delete label_types"
  ON label_types
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert label_types ON label_types
CREATE POLICY "Authenticated users can insert label_types"
  ON label_types
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update label_types ON label_types
CREATE POLICY "Authenticated users can update label_types"
  ON label_types
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view label_types ON label_types
CREATE POLICY "Authenticated users can view label_types"
  ON label_types
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated insert labels ON labels
CREATE POLICY "Allow authenticated insert labels"
  ON labels
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated read labels ON labels
CREATE POLICY "Allow authenticated read labels"
  ON labels
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated update labels ON labels
CREATE POLICY "Allow authenticated update labels"
  ON labels
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Allow authenticated insert manifests ON manifests
CREATE POLICY "Allow authenticated insert manifests"
  ON manifests
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated read manifests ON manifests
CREATE POLICY "Allow authenticated read manifests"
  ON manifests
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated update manifests ON manifests
CREATE POLICY "Allow authenticated update manifests"
  ON manifests
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Auth users can modify monthly_performance_metrics ON monthly_performance_metrics
CREATE POLICY "Auth users can modify monthly_performance_metrics"
  ON monthly_performance_metrics
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can manage notification_preferences ON notification_preferences
CREATE POLICY "Authenticated users can manage notification_preferences"
  ON notification_preferences
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can modify order_fulfillment_checklist ON order_fulfillment_checklist
CREATE POLICY "Authenticated users can modify order_fulfillment_checklist"
  ON order_fulfillment_checklist
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can modify order_fulfillment_items ON order_fulfillment_items
CREATE POLICY "Authenticated users can modify order_fulfillment_items"
  ON order_fulfillment_items
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete order_items ON order_items
CREATE POLICY "Authenticated users can delete order_items"
  ON order_items
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert order_items ON order_items
CREATE POLICY "Authenticated users can insert order_items"
  ON order_items
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read order_items ON order_items
CREATE POLICY "Authenticated users can read order_items"
  ON order_items
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update order_items ON order_items
CREATE POLICY "Authenticated users can update order_items"
  ON order_items
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete orders ON orders
CREATE POLICY "Authenticated users can delete orders"
  ON orders
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert orders ON orders
CREATE POLICY "Authenticated users can insert orders"
  ON orders
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read orders ON orders
CREATE POLICY "Authenticated users can read orders"
  ON orders
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update orders ON orders
CREATE POLICY "Authenticated users can update orders"
  ON orders
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Anonymous users can read package assignments for coversheets ON package_assignments
CREATE POLICY "Anonymous users can read package assignments for coversheets"
  ON package_assignments
  AS PERMISSIVE
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Authenticated users can delete package assignments ON package_assignments
CREATE POLICY "Authenticated users can delete package assignments"
  ON package_assignments
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert package assignments ON package_assignments
CREATE POLICY "Authenticated users can insert package assignments"
  ON package_assignments
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read package assignments ON package_assignments
CREATE POLICY "Authenticated users can read package assignments"
  ON package_assignments
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update package assignments ON package_assignments
CREATE POLICY "Authenticated users can update package assignments"
  ON package_assignments
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can manage packaging_schedule ON packaging_schedule
CREATE POLICY "Authenticated users can manage packaging_schedule"
  ON packaging_schedule
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can manage packaging sessions ON packaging_sessions
CREATE POLICY "Authenticated users can manage packaging sessions"
  ON packaging_sessions
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Auth users can modify packaging_yield_history ON packaging_yield_history
CREATE POLICY "Auth users can modify packaging_yield_history"
  ON packaging_yield_history
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Auth users can modify packaging_yields ON packaging_yields
CREATE POLICY "Auth users can modify packaging_yields"
  ON packaging_yields
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete cut sessions ON plant_group_cut_sessions
CREATE POLICY "Authenticated users can delete cut sessions"
  ON plant_group_cut_sessions
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can insert cut sessions ON plant_group_cut_sessions
CREATE POLICY "Authenticated users can insert cut sessions"
  ON plant_group_cut_sessions
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can update cut sessions ON plant_group_cut_sessions
CREATE POLICY "Authenticated users can update cut sessions"
  ON plant_group_cut_sessions
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can view cut sessions ON plant_group_cut_sessions
CREATE POLICY "Authenticated users can view cut sessions"
  ON plant_group_cut_sessions
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can insert room history ON plant_group_room_history
CREATE POLICY "Authenticated users can insert room history"
  ON plant_group_room_history
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can view room history ON plant_group_room_history
CREATE POLICY "Authenticated users can view room history"
  ON plant_group_room_history
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can insert stage history ON plant_group_stage_history
CREATE POLICY "Authenticated users can insert stage history"
  ON plant_group_stage_history
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can view stage history ON plant_group_stage_history
CREATE POLICY "Authenticated users can view stage history"
  ON plant_group_stage_history
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can insert plant groups ON plant_groups
CREATE POLICY "Authenticated users can insert plant groups"
  ON plant_groups
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can update plant groups ON plant_groups
CREATE POLICY "Authenticated users can update plant groups"
  ON plant_groups
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() IS NOT NULL))
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can view plant groups ON plant_groups
CREATE POLICY "Authenticated users can view plant groups"
  ON plant_groups
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can delete product labels ON product_labels
CREATE POLICY "Authenticated users can delete product labels"
  ON product_labels
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert product labels ON product_labels
CREATE POLICY "Authenticated users can insert product labels"
  ON product_labels
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read product labels ON product_labels
CREATE POLICY "Authenticated users can read product labels"
  ON product_labels
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update product labels ON product_labels
CREATE POLICY "Authenticated users can update product labels"
  ON product_labels
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete product stages ON product_stages
CREATE POLICY "Authenticated users can delete product stages"
  ON product_stages
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert product stages ON product_stages
CREATE POLICY "Authenticated users can insert product stages"
  ON product_stages
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read product stages ON product_stages
CREATE POLICY "Authenticated users can read product stages"
  ON product_stages
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update product stages ON product_stages
CREATE POLICY "Authenticated users can update product stages"
  ON product_stages
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete product types ON product_types
CREATE POLICY "Authenticated users can delete product types"
  ON product_types
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert product types ON product_types
CREATE POLICY "Authenticated users can insert product types"
  ON product_types
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read product types ON product_types
CREATE POLICY "Authenticated users can read product types"
  ON product_types
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update product types ON product_types
CREATE POLICY "Authenticated users can update product types"
  ON product_types
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete products ON products
CREATE POLICY "Authenticated users can delete products"
  ON products
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert products ON products
CREATE POLICY "Authenticated users can insert products"
  ON products
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read products ON products
CREATE POLICY "Authenticated users can read products"
  ON products
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update products ON products
CREATE POLICY "Authenticated users can update products"
  ON products
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can insert grade history ON quality_grade_history
CREATE POLICY "Authenticated users can insert grade history"
  ON quality_grade_history
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can read grade history ON quality_grade_history
CREATE POLICY "Authenticated users can read grade history"
  ON quality_grade_history
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((auth.uid() IS NOT NULL));

-- Policy: Authenticated users can read quality grades ON quality_grades
CREATE POLICY "Authenticated users can read quality grades"
  ON quality_grades
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can view quarantine violations ON quarantine_violation_log
CREATE POLICY "Authenticated users can view quarantine violations"
  ON quarantine_violation_log
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: System can log quarantine violations ON quarantine_violation_log
CREATE POLICY "System can log quarantine violations"
  ON quarantine_violation_log
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can insert room sections ON room_sections
CREATE POLICY "Authenticated users can insert room sections"
  ON room_sections
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = created_by));

-- Policy: Authenticated users can update room sections ON room_sections
CREATE POLICY "Authenticated users can update room sections"
  ON room_sections
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view room sections ON room_sections
CREATE POLICY "Authenticated users can view room sections"
  ON room_sections
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert room tables ON room_tables
CREATE POLICY "Authenticated users can insert room tables"
  ON room_tables
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = created_by));

-- Policy: Authenticated users can update room tables ON room_tables
CREATE POLICY "Authenticated users can update room tables"
  ON room_tables
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view room tables ON room_tables
CREATE POLICY "Authenticated users can view room tables"
  ON room_tables
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can delete waypoints ON route_waypoints
CREATE POLICY "Authenticated users can delete waypoints"
  ON route_waypoints
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert waypoints ON route_waypoints
CREATE POLICY "Authenticated users can insert waypoints"
  ON route_waypoints
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read waypoints ON route_waypoints
CREATE POLICY "Authenticated users can read waypoints"
  ON route_waypoints
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update waypoints ON route_waypoints
CREATE POLICY "Authenticated users can update waypoints"
  ON route_waypoints
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete sales rep assignments ON sales_rep_assignments
CREATE POLICY "Authenticated users can delete sales rep assignments"
  ON sales_rep_assignments
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert sales rep assignments ON sales_rep_assignments
CREATE POLICY "Authenticated users can insert sales rep assignments"
  ON sales_rep_assignments
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read sales rep assignments ON sales_rep_assignments
CREATE POLICY "Authenticated users can read sales rep assignments"
  ON sales_rep_assignments
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update sales rep assignments ON sales_rep_assignments
CREATE POLICY "Authenticated users can update sales rep assignments"
  ON sales_rep_assignments
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can manage slack_notifications ON slack_notifications
CREATE POLICY "Authenticated users can manage slack_notifications"
  ON slack_notifications
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete strain_aliases ON strain_aliases
CREATE POLICY "Authenticated users can delete strain_aliases"
  ON strain_aliases
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert strain_aliases ON strain_aliases
CREATE POLICY "Authenticated users can insert strain_aliases"
  ON strain_aliases
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update strain_aliases ON strain_aliases
CREATE POLICY "Authenticated users can update strain_aliases"
  ON strain_aliases
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view strain_aliases ON strain_aliases
CREATE POLICY "Authenticated users can view strain_aliases"
  ON strain_aliases
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can manage strain_metadata ON strain_metadata
CREATE POLICY "Authenticated users can manage strain_metadata"
  ON strain_metadata
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete strains ON strains
CREATE POLICY "Authenticated users can delete strains"
  ON strains
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert strains ON strains
CREATE POLICY "Authenticated users can insert strains"
  ON strains
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update strains ON strains
CREATE POLICY "Authenticated users can update strains"
  ON strains
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view strains ON strains
CREATE POLICY "Authenticated users can view strains"
  ON strains
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can read system metadata ON system_metadata
CREATE POLICY "Authenticated users can read system metadata"
  ON system_metadata
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admins and managers can view audit log ON test_mode_audit_log
CREATE POLICY "Admins and managers can view audit log"
  ON test_mode_audit_log
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));

-- Policy: Admins can delete audit logs ON test_mode_audit_log
CREATE POLICY "Admins can delete audit logs"
  ON test_mode_audit_log
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

-- Policy: Authenticated users can create audit entries ON test_mode_audit_log
CREATE POLICY "Authenticated users can create audit entries"
  ON test_mode_audit_log
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can insert audit logs ON test_mode_audit_log
CREATE POLICY "Authenticated users can insert audit logs"
  ON test_mode_audit_log
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read audit logs ON test_mode_audit_log
CREATE POLICY "Authenticated users can read audit logs"
  ON test_mode_audit_log
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can delete audit entries ON test_mode_audit_log
CREATE POLICY "Only admins can delete audit entries"
  ON test_mode_audit_log
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

-- Policy: Allow authenticated read throughput_metrics ON throughput_metrics
CREATE POLICY "Allow authenticated read throughput_metrics"
  ON throughput_metrics
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can manage trim_schedule ON trim_schedule
CREATE POLICY "Authenticated users can manage trim_schedule"
  ON trim_schedule
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete trim_sessions ON trim_sessions
CREATE POLICY "Authenticated users can delete trim_sessions"
  ON trim_sessions
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert trim_sessions ON trim_sessions
CREATE POLICY "Authenticated users can insert trim_sessions"
  ON trim_sessions
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read trim_sessions ON trim_sessions
CREATE POLICY "Authenticated users can read trim_sessions"
  ON trim_sessions
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update trim_sessions ON trim_sessions
CREATE POLICY "Authenticated users can update trim_sessions"
  ON trim_sessions
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Users can insert own profile ON user_profiles
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));

-- Policy: Users can read own profile ON user_profiles
CREATE POLICY "Users can read own profile"
  ON user_profiles
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = id));

-- Policy: Users can update own profile ON user_profiles
CREATE POLICY "Users can update own profile"
  ON user_profiles
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));

-- Policy: Managers and admins can view variance log ON variance_log
CREATE POLICY "Managers and admins can view variance log"
  ON variance_log
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['manager'::text, 'admin'::text]))))));

-- Policy: Only admins can delete variance logs ON variance_log
CREATE POLICY "Only admins can delete variance logs"
  ON variance_log
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'admin'::text)))));

-- Policy: System can insert variance log entries ON variance_log
CREATE POLICY "System can insert variance log entries"
  ON variance_log
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['manager'::text, 'admin'::text]))))));
