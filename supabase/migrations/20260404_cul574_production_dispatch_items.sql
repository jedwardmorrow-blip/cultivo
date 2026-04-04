-- CUL-574: Production Dispatch Layer — production_dispatch_items table
-- Creates the handoff boundary between Distribution (Laura) and Production.
-- Laura creates dispatch items; post-prod staff execute sessions against them.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Create production_dispatch_items
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE production_dispatch_items (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_registry_id       uuid        NOT NULL REFERENCES batch_registry(id),
  order_item_id           uuid        REFERENCES order_items(id),           -- non-null only for package_to_order
  delivery_route_id       uuid        REFERENCES delivery_routes(id),
  processing_stage        TEXT        NOT NULL CHECK (processing_stage IN ('buck', 'trim_to_stock', 'package_to_order')),
  treatment_type          TEXT        NOT NULL CHECK (treatment_type IN (
                                        'hand_trim_jars',
                                        'machine_trim_flower',
                                        'machine_trim_bulk',
                                        'hand_spin_solid_spinner',
                                        'machine_smalls_drum',
                                        'jar_pack',
                                        'mylar_pack',
                                        'bulk_wholesale'
                                      )),
  quantity_g              NUMERIC,
  quantity_units_target   INTEGER,
  quantity_units_completed INTEGER     DEFAULT 0,
  priority                INTEGER     NOT NULL DEFAULT 5,
  status                  TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  ready_by                TIMESTAMPTZ,
  assigned_staff_id       uuid        REFERENCES staff(id),
  created_by_user_id      TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),

  -- Enforce: order_item_id required iff processing_stage = 'package_to_order'
  CONSTRAINT chk_order_item_stage CHECK (
    (processing_stage = 'package_to_order' AND order_item_id IS NOT NULL)
    OR
    (processing_stage IN ('buck', 'trim_to_stock') AND order_item_id IS NULL)
  )
);

COMMENT ON TABLE production_dispatch_items IS
  'Dispatch items created by Distribution (Laura) that drive post-production work. '
  'Each row is a unit of work for bucking, trimming, or packaging against a batch.';

COMMENT ON COLUMN production_dispatch_items.processing_stage IS
  'buck = bucking session; trim_to_stock = trim session to inventory; package_to_order = packaging for a specific order item';
COMMENT ON COLUMN production_dispatch_items.order_item_id IS
  'Required when processing_stage = package_to_order; must be NULL otherwise (enforced by chk_order_item_stage).';

-- Indexes
CREATE INDEX idx_pdi_batch_registry_id   ON production_dispatch_items(batch_registry_id);
CREATE INDEX idx_pdi_status              ON production_dispatch_items(status);
CREATE INDEX idx_pdi_processing_stage    ON production_dispatch_items(processing_stage);
CREATE INDEX idx_pdi_order_item_id       ON production_dispatch_items(order_item_id) WHERE order_item_id IS NOT NULL;
CREATE INDEX idx_pdi_assigned_staff_id   ON production_dispatch_items(assigned_staff_id) WHERE assigned_staff_id IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_production_dispatch_items_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pdi_updated_at
  BEFORE UPDATE ON production_dispatch_items
  FOR EACH ROW EXECUTE FUNCTION update_production_dispatch_items_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add dispatch_item_id FK to all three post-production session tables
--    (bucking_sessions → buck stage)
--    (trim_sessions    → trim_to_stock stage)
--    (packaging_sessions → package_to_order stage)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE bucking_sessions
  ADD COLUMN dispatch_item_id uuid REFERENCES production_dispatch_items(id);

ALTER TABLE trim_sessions
  ADD COLUMN dispatch_item_id uuid REFERENCES production_dispatch_items(id);

ALTER TABLE packaging_sessions
  ADD COLUMN dispatch_item_id uuid REFERENCES production_dispatch_items(id);

COMMENT ON COLUMN bucking_sessions.dispatch_item_id   IS 'Links to production_dispatch_items (processing_stage=buck). Completion signals back to Laura''s demand panel.';
COMMENT ON COLUMN trim_sessions.dispatch_item_id      IS 'Links to production_dispatch_items (processing_stage=trim_to_stock). Completion signals back to Laura''s demand panel.';
COMMENT ON COLUMN packaging_sessions.dispatch_item_id IS 'Links to production_dispatch_items (processing_stage=package_to_order). Completion signals back to Laura''s demand panel.';

-- Indexes for FK lookups
CREATE INDEX idx_bucking_sessions_dispatch_item_id   ON bucking_sessions(dispatch_item_id)   WHERE dispatch_item_id IS NOT NULL;
CREATE INDEX idx_trim_sessions_dispatch_item_id      ON trim_sessions(dispatch_item_id)      WHERE dispatch_item_id IS NOT NULL;
CREATE INDEX idx_packaging_sessions_dispatch_item_id ON packaging_sessions(dispatch_item_id) WHERE dispatch_item_id IS NOT NULL;
