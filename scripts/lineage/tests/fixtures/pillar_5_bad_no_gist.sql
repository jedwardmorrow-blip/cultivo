-- Pillar 5 violation: period columns without EXCLUDE USING GIST.
-- Expected severity: "ask" pre-btree_gist install, "deny" post-install.
CREATE TABLE cultivation.plant_group_room_stay (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_group_id uuid NOT NULL REFERENCES plant_groups(id),
    room_id uuid NOT NULL REFERENCES grow_rooms(id),
    period_start timestamptz NOT NULL,
    period_end timestamptz NOT NULL
);
ALTER TABLE cultivation.plant_group_room_stay ENABLE ROW LEVEL SECURITY;
