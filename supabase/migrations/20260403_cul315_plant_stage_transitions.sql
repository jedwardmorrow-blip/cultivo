-- CUL-315 / CUL-304: Plant stage transition audit log
-- Captures every growth_stage change on plant_groups: who, when, from→to.
-- Covers both CUL-315 (high) and CUL-304 (medium) — same schema, one migration.

CREATE TABLE plant_stage_transitions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_group_id   uuid        NOT NULL REFERENCES plant_groups(id) ON DELETE CASCADE,
  from_stage       text,                       -- NULL for initial INSERT
  to_stage         text        NOT NULL,
  transitioned_at  timestamptz NOT NULL DEFAULT now(),
  transitioned_by  uuid,                       -- auth.uid() at time of change
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pst_plant_group ON plant_stage_transitions(plant_group_id);
CREATE INDEX idx_pst_transitioned_at ON plant_stage_transitions(transitioned_at DESC);

ALTER TABLE plant_stage_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can view plant stage transitions"
  ON plant_stage_transitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can insert plant stage transitions"
  ON plant_stage_transitions FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger function: fires on INSERT (initial stage) and UPDATE OF growth_stage (transitions)
CREATE OR REPLACE FUNCTION fn_record_plant_stage_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO plant_stage_transitions (
      plant_group_id, from_stage, to_stage, transitioned_at, transitioned_by
    ) VALUES (
      NEW.id, NULL, NEW.growth_stage, COALESCE(NEW.created_at, now()), NEW.created_by
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.growth_stage IS DISTINCT FROM OLD.growth_stage THEN
    INSERT INTO plant_stage_transitions (
      plant_group_id, from_stage, to_stage, transitioned_at, transitioned_by
    ) VALUES (
      NEW.id, OLD.growth_stage, NEW.growth_stage, now(), auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_plant_stage_transition_insert
  AFTER INSERT ON plant_groups
  FOR EACH ROW EXECUTE FUNCTION fn_record_plant_stage_transition();

CREATE TRIGGER trg_plant_stage_transition_update
  AFTER UPDATE OF growth_stage ON plant_groups
  FOR EACH ROW EXECUTE FUNCTION fn_record_plant_stage_transition();

-- Backfill: snapshot current stage for all existing plant groups
INSERT INTO plant_stage_transitions (plant_group_id, from_stage, to_stage, transitioned_at, transitioned_by, notes)
SELECT
  id, NULL, growth_stage,
  COALESCE(stage_entered_at, created_at, now()),
  created_by,
  'Backfill: initial stage at migration time'
FROM plant_groups;

GRANT SELECT ON plant_stage_transitions TO authenticated;
