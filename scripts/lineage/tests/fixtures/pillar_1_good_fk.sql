-- Pillar 1 good path: new table with a NOT NULL FK to a root.
CREATE TABLE cultivation.plant_observation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_group_id uuid NOT NULL REFERENCES plant_groups(id),
    note text NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cultivation.plant_observation ENABLE ROW LEVEL SECURITY;
