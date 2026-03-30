-- ═══════════════════════════════════════════════════════════════════
-- Task Type Settings — database-backed task type configuration
-- Sprint 11: Ticket #103 — Task Admin Panel
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS task_type_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key    text UNIQUE NOT NULL,          -- e.g. 'ipm_spray', 'custom_mytype'
  label       text NOT NULL,
  description text NOT NULL DEFAULT '',
  color       text NOT NULL DEFAULT '#A6A6A6',
  icon        text NOT NULL DEFAULT 'Wrench',
  fields      text[] NOT NULL DEFAULT '{}',  -- completion form field labels
  is_enabled  boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 100,
  is_builtin  boolean NOT NULL DEFAULT false, -- true = shipped with app, can't delete
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE task_type_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "task_type_settings_select" ON task_type_settings
  FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to insert/update/delete (app-level role checks)
CREATE POLICY "task_type_settings_modify" ON task_type_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed with current hardcoded defaults
INSERT INTO task_type_settings (task_key, label, description, color, icon, fields, sort_order, is_builtin) VALUES
  ('ipm_spray',       'IPM Spray',        'Apply integrated pest management sprays and treatments to prevent or control pests and diseases.', '#0EA5E9', 'SprayCan',       ARRAY['Product', 'Method', 'Target Pest', 'Re-entry Hours'],       10,  true),
  ('defoliation',     'Defoliation',      'Remove excess fan leaves to improve light penetration and airflow through the canopy.',            '#10B981', 'Scissors',       ARRAY['Type', 'Sections', 'Progress'],                              20,  true),
  ('transplant',      'Transplant',       'Move plants from smaller containers to larger ones as they outgrow their current pots.',           '#8B5CF6', 'ArrowRightLeft', ARRAY['From Size', 'To Size', 'Count'],                             30,  true),
  ('cleaning',        'Cleaning',         'Sanitize surfaces, floors, and equipment. Remove debris and dead plant material.',                 '#6B7280', 'Sparkles',       ARRAY['Type', 'Notes'],                                             40,  true),
  ('harvest',         'Harvest',          'Cut, hang, and process mature plants at peak trichome development.',                               '#F43F5E', 'Wheat',          ARRAY['Wet Weight', 'Plant Count', 'Waste'],                        50,  true),
  ('batch_tank_mix',  'Batch Tank Mix',   'Mix nutrient solution in batch tanks. Record EC/PPM, pH, volume, and products used.',              '#3B82F6', 'Beaker',         ARRAY['EC/PPM', 'pH', 'Volume (gal)', 'Products'],                  60,  true),
  ('saturation_check','Saturation Check', 'Check runoff EC/pH and substrate moisture levels to verify nutrient uptake.',                      '#F59E0B', 'Droplets',       ARRAY['Runoff EC', 'Runoff pH', 'Moisture %', 'Sections'],          70,  true),
  ('irrigation_audit','Irrigation Audit', 'Confirm and adjust automated watering timers, emitter flow rates, and schedules.',                 '#06B6D4', 'Timer',          ARRAY['Timer Settings', 'Flow Rate', 'Adjustments'],                80,  true),
  ('scouting',        'Scouting',         'Inspect plants for pests, disease, nutrient deficiencies, and overall plant health.',              '#EC4899', 'Search',         ARRAY['Pests', 'Disease', 'Nutrient Issues', 'Health Rating'],      90,  true),
  ('training',        'Training',         'Apply low-stress or high-stress training techniques to shape plant structure.',                    '#14B8A6', 'GitBranch',      ARRAY['Type', 'Plant Count', 'Sections'],                           100, true),
  ('clone_cutting',   'Clone Cutting',    'Take cuttings from mother plants for propagation. Dip, place in trays, label.',                   '#0EA5E9', 'Sprout',         ARRAY['Mother ID', 'Cut Count', 'Tray'],                            110, true),
  ('maintenance',     'Maintenance',      'Routine equipment maintenance, HVAC checks, and infrastructure repairs.',                          '#78716C', 'Wrench',         ARRAY['Equipment', 'Issue', 'Resolution'],                          120, true),
  ('concentrate_mix', 'Concentrate Mix',  'Mix concentrated nutrient stock solutions for automated dosing systems.',                           '#6366F1', 'FlaskConical',   ARRAY['Product', 'Concentration', 'Volume'],                        130, true),
  ('custom',          'Custom',           'General-purpose task for activities that do not fit standard categories.',                          '#A6A6A6', 'Settings',       ARRAY['Task Name', 'Description'],                                  999, true)
ON CONFLICT (task_key) DO NOTHING;
