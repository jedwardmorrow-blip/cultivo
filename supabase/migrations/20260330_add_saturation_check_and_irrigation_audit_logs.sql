-- =====================================================
-- Add saturation_check_log and irrigation_audit_log tables
-- Part of Sprint 11: Replace feeding task type with
-- batch_tank_mix, saturation_check, irrigation_audit
-- =====================================================

-- =====================================================
-- 1. saturation_check_log — Substrate moisture & runoff readings
-- =====================================================
CREATE TABLE IF NOT EXISTS saturation_check_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES grow_rooms(id) ON DELETE CASCADE,
  task_instance_id uuid REFERENCES daily_task_instances(id),
  checked_by text,
  -- Runoff readings
  runoff_ec numeric,
  runoff_ppm numeric,
  runoff_ph numeric,
  -- Substrate readings
  moisture_pct numeric,
  -- Sections checked
  sections_checked text[],
  -- Status
  status text NOT NULL DEFAULT 'completed',
  notes text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saturation_check_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saturation_check_log_read" ON saturation_check_log FOR SELECT USING (true);
CREATE POLICY "saturation_check_log_write" ON saturation_check_log FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_saturation_check_log_room ON saturation_check_log(room_id);
CREATE INDEX IF NOT EXISTS idx_saturation_check_log_created ON saturation_check_log(created_at DESC);

-- =====================================================
-- 2. irrigation_audit_log — Timer / schedule audit records
-- =====================================================
CREATE TABLE IF NOT EXISTS irrigation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES grow_rooms(id) ON DELETE CASCADE,
  task_instance_id uuid REFERENCES daily_task_instances(id),
  audited_by text,
  -- Timer settings
  current_frequency text,        -- e.g. "every 4 hours"
  current_duration text,         -- e.g. "3 minutes"
  adjusted_frequency text,       -- null if no change
  adjusted_duration text,        -- null if no change
  emitter_flow_rate text,        -- e.g. "2 GPH"
  -- Assessment
  adjustments_made boolean NOT NULL DEFAULT false,
  adjustment_details text,
  -- Status
  status text NOT NULL DEFAULT 'completed',
  notes text,
  audited_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE irrigation_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "irrigation_audit_log_read" ON irrigation_audit_log FOR SELECT USING (true);
CREATE POLICY "irrigation_audit_log_write" ON irrigation_audit_log FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_irrigation_audit_log_room ON irrigation_audit_log(room_id);
CREATE INDEX IF NOT EXISTS idx_irrigation_audit_log_created ON irrigation_audit_log(created_at DESC);

-- =====================================================
-- 3. Migrate existing feeding schedules to batch_tank_mix
-- (any room_task_schedules with task_type = 'feeding')
-- =====================================================
UPDATE room_task_schedules
SET task_type = 'batch_tank_mix',
    updated_at = now()
WHERE task_type = 'feeding';

-- =====================================================
-- 4. Migrate existing feeding task instances to batch_tank_mix
-- (only pending/open instances — completed ones keep history)
-- =====================================================
UPDATE daily_task_instances
SET task_type = 'batch_tank_mix',
    updated_at = now()
WHERE task_type = 'feeding'
  AND status IN ('pending', 'assigned');
