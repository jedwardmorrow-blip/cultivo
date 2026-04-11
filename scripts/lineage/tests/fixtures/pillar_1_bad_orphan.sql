-- Pillar 1 violation: new table with no FK to any root.
CREATE TABLE cultivation.observation_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    note text NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cultivation.observation_log ENABLE ROW LEVEL SECURITY;
