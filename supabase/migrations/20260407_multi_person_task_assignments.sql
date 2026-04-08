-- ============================================
-- Multi-Person Task Assignment System
-- ============================================

-- 1. NEW TABLE: task_assignments
CREATE TABLE task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES daily_task_instances(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id),
  role text NOT NULL DEFAULT 'crew' CHECK (role IN ('lead', 'crew')),
  is_active boolean NOT NULL DEFAULT false,
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, staff_id)
);

CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_staff_id ON task_assignments(staff_id);

-- RLS
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON task_assignments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. SCHEMA ADDITIONS to task_type_settings
ALTER TABLE task_type_settings
  ADD COLUMN default_crew_size integer NOT NULL DEFAULT 1,
  ADD COLUMN typical_duration text,
  ADD COLUMN allow_multi_day boolean NOT NULL DEFAULT false,
  ADD COLUMN completion_mode text NOT NULL DEFAULT 'manual' CHECK (completion_mode IN ('manual', 'event_driven'));

-- Set harvest to event_driven by default
UPDATE task_type_settings
  SET completion_mode = 'event_driven', default_crew_size = 4, typical_duration = 'full_day', allow_multi_day = true
  WHERE task_key = 'harvest';

-- Set sensible defaults for known team tasks
UPDATE task_type_settings SET default_crew_size = 3, typical_duration = '4h' WHERE task_key = 'defoliation';
UPDATE task_type_settings SET default_crew_size = 2, typical_duration = '2h' WHERE task_key = 'training';
UPDATE task_type_settings SET default_crew_size = 2, typical_duration = '2h' WHERE task_key = 'transplant';

-- 3. TRIGGER: sync assigned_to on daily_task_instances from task_assignments lead
CREATE OR REPLACE FUNCTION sync_task_assigned_to()
RETURNS trigger AS $$
BEGIN
  UPDATE daily_task_instances
  SET assigned_to = (
    SELECT staff_id FROM task_assignments
    WHERE task_id = COALESCE(NEW.task_id, OLD.task_id) AND role = 'lead'
    LIMIT 1
  )
  WHERE id = COALESCE(NEW.task_id, OLD.task_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_task_assigned_to
  AFTER INSERT OR UPDATE OR DELETE ON task_assignments
  FOR EACH ROW EXECUTE FUNCTION sync_task_assigned_to();

-- 4. Enable realtime on task_assignments
ALTER PUBLICATION supabase_realtime ADD TABLE task_assignments;
