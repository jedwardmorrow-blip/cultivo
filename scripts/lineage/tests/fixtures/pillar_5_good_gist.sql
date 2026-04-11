-- Pillar 5 good path: EXCLUDE USING GIST prevents overlapping room stays.
CREATE TABLE cultivation.plant_group_room_stay (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_group_id uuid NOT NULL REFERENCES plant_groups(id),
    room_id uuid NOT NULL REFERENCES grow_rooms(id),
    period_start timestamptz NOT NULL,
    period_end timestamptz NOT NULL,
    EXCLUDE USING GIST (
        plant_group_id WITH =,
        tstzrange(period_start, period_end) WITH &&
    )
);
ALTER TABLE cultivation.plant_group_room_stay ENABLE ROW LEVEL SECURITY;
