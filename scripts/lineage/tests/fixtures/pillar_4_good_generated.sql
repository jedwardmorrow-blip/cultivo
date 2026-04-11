-- Pillar 4 good path: variance is GENERATED ALWAYS from inputs.
CREATE TABLE cultivation.plant_count_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_group_id uuid NOT NULL REFERENCES plant_groups(id),
    expected_count integer NOT NULL,
    counted_count integer NOT NULL,
    variance integer GENERATED ALWAYS AS (counted_count - expected_count) STORED
);
ALTER TABLE cultivation.plant_count_audit ENABLE ROW LEVEL SECURITY;
