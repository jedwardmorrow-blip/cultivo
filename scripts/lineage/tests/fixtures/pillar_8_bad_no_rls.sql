-- Pillar 8 violation: new table created without ENABLE ROW LEVEL SECURITY.
CREATE TABLE cultivation.cultivar_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    strain_id uuid NOT NULL REFERENCES strains(id),
    notes text NOT NULL
);
