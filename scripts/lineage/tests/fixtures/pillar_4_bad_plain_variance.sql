-- Pillar 4 violation: variance column declared as a plain numeric, not
-- GENERATED ALWAYS.
CREATE TABLE cultivation.plant_count_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_group_id uuid NOT NULL REFERENCES plant_groups(id),
    expected_count integer NOT NULL,
    counted_count integer NOT NULL,
    variance integer NOT NULL
);
ALTER TABLE cultivation.plant_count_audit ENABLE ROW LEVEL SECURITY;
