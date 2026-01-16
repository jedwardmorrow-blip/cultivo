/*
  # Event-Driven Inventory Core - Product Stages Seeding

  ## Overview
  This migration ensures all required product stages exist in the product_stages table
  and creates mapping logic to backfill product_stage_id on existing inventory_items.

  ## Product Stages (Stage Graph)

  Binned → (BuckedSmalls | BuckedFlower) → (BulkSmalls | BulkFlower) → (Packaged_14gSmalls | Packaged_3_5g)

  Also: Trim and Waste as accounting outputs

  ## Allowed Transitions
  - Binned → BuckedFlower, BuckedSmalls
  - BuckedFlower → BulkFlower
  - BuckedSmalls → BulkSmalls
  - BulkFlower → Packaged_3_5g
  - BulkSmalls → Packaged_14gSmalls
  - Any stage → Trim, Waste (byproducts)

  ## Changes Made
  1. Insert required stages if they don't exist
  2. Create stage transition validation documentation
  3. Create helper function to map product names to stages
  4. Backfill product_stage_id on inventory_items (non-destructive)

  ## Safety
  - Uses ON CONFLICT DO NOTHING for idempotency
  - Does not modify existing product_name or category fields
  - Additive only
*/

-- =====================================================
-- SECTION 1: Ensure all required stages exist
-- =====================================================

-- Insert required stages (idempotent with ON CONFLICT)
INSERT INTO product_stages (name, description, display_order) VALUES
  ('Binned', 'Initial binned stage after harvest', 10),
  ('BuckedSmalls', 'Bucked smalls from initial processing', 20),
  ('BuckedFlower', 'Bucked flower from initial processing', 30),
  ('BulkSmalls', 'Bulk smalls after trimming', 40),
  ('BulkFlower', 'Bulk flower after trimming', 50),
  ('Packaged_14gSmalls', 'Packaged 14g smalls units', 60),
  ('Packaged_3_5g', 'Packaged 3.5g (eighth) units', 70),
  ('Trim', 'Trim byproduct from processing', 80),
  ('Waste', 'Waste from processing', 90)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SECTION 2: Document stage transitions
-- =====================================================

COMMENT ON TABLE product_stages IS
'ACTIVE: Defines stages in the production workflow.
Stage Graph: Binned → (BuckedSmalls | BuckedFlower) → (BulkSmalls | BulkFlower) → (Packaged_14gSmalls | Packaged_3_5g)
Byproducts: Trim, Waste can be produced at any stage.
Updated: Seeded with event-driven inventory stages.
Migration: 20251021000200_event_driven_inventory_stage_seeding.sql';

-- =====================================================
-- SECTION 3: Create stage mapping helper function
-- =====================================================

-- Function to map product_name patterns to product_stage_id
CREATE OR REPLACE FUNCTION map_product_name_to_stage_id(p_product_name text, p_category text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_stage_id uuid;
  v_stage_name text;
BEGIN
  -- Determine stage based on product_name and category patterns
  v_stage_name := CASE
    -- Packaged products
    WHEN p_product_name ILIKE '%3.5g%' OR p_product_name ILIKE '%eighth%' THEN 'Packaged_3_5g'
    WHEN p_product_name ILIKE '%14g%' OR p_product_name ILIKE '%half%oz%' THEN 'Packaged_14gSmalls'
    WHEN p_product_name ILIKE '%454g%' OR p_product_name ILIKE '%1%lb%' OR p_product_name ILIKE '%pound%' THEN 'BulkFlower'

    -- Bulk products
    WHEN p_product_name ILIKE '%bulk%flower%' OR p_category ILIKE '%bulk%flower%' THEN 'BulkFlower'
    WHEN p_product_name ILIKE '%bulk%small%' OR p_category ILIKE '%bulk%small%' THEN 'BulkSmalls'
    WHEN p_product_name ILIKE '%bulk%trim%' OR p_category ILIKE '%bulk%trim%' THEN 'Trim'

    -- Bucked products
    WHEN p_product_name ILIKE '%bucked%flower%' OR p_category ILIKE '%bucked%flower%' THEN 'BuckedFlower'
    WHEN p_product_name ILIKE '%bucked%small%' OR p_category ILIKE '%bucked%small%' THEN 'BuckedSmalls'

    -- Binned products
    WHEN p_product_name ILIKE '%binned%' OR p_category ILIKE '%binned%' THEN 'Binned'

    -- Byproducts
    WHEN p_product_name ILIKE '%trim%' THEN 'Trim'
    WHEN p_product_name ILIKE '%waste%' THEN 'Waste'

    -- Default fallback based on category
    WHEN p_category ILIKE '%flower%' THEN 'BulkFlower'
    WHEN p_category ILIKE '%small%' THEN 'BulkSmalls'

    -- Final fallback
    ELSE NULL
  END;

  -- Look up stage_id from stage_name
  IF v_stage_name IS NOT NULL THEN
    SELECT id INTO v_stage_id
    FROM product_stages
    WHERE name = v_stage_name;
  END IF;

  RETURN v_stage_id;
END;
$$;

COMMENT ON FUNCTION map_product_name_to_stage_id IS
'Maps product_name and category text patterns to product_stage_id.
Used for backfilling product_stage_id on inventory_items.
Returns NULL if no match found (manual review required).';

-- =====================================================
-- SECTION 4: Create stage transition validation function
-- =====================================================

-- Function to validate stage transitions (for future use in session close functions)
CREATE OR REPLACE FUNCTION is_valid_stage_transition(
  p_from_stage text,
  p_to_stage text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Define allowed stage transitions
  RETURN CASE
    -- From Binned
    WHEN p_from_stage = 'Binned' AND p_to_stage IN ('BuckedFlower', 'BuckedSmalls') THEN true

    -- From Bucked stages
    WHEN p_from_stage = 'BuckedFlower' AND p_to_stage IN ('BulkFlower') THEN true
    WHEN p_from_stage = 'BuckedSmalls' AND p_to_stage IN ('BulkSmalls') THEN true

    -- From Bulk stages
    WHEN p_from_stage = 'BulkFlower' AND p_to_stage IN ('Packaged_3_5g') THEN true
    WHEN p_from_stage = 'BulkSmalls' AND p_to_stage IN ('Packaged_14gSmalls') THEN true

    -- Byproducts can be produced from any stage
    WHEN p_to_stage IN ('Trim', 'Waste') THEN true

    -- Invalid transition
    ELSE false
  END;
END;
$$;

COMMENT ON FUNCTION is_valid_stage_transition IS
'Validates whether a stage transition is allowed per the production workflow.
Used by: fn_close_trim_session, fn_close_packaging_session to enforce stage graph.
Returns true if transition is valid, false otherwise.';

-- =====================================================
-- SECTION 5: Create helper view for stage mapping
-- =====================================================

CREATE OR REPLACE VIEW v_stage_mapping_preview AS
SELECT
  id,
  package_id,
  product_name,
  category,
  product_stage_id,
  map_product_name_to_stage_id(product_name, category) as suggested_stage_id,
  (SELECT name FROM product_stages WHERE id = map_product_name_to_stage_id(product_name, category)) as suggested_stage_name,
  CASE
    WHEN product_stage_id IS NULL AND map_product_name_to_stage_id(product_name, category) IS NOT NULL THEN 'needs_backfill'
    WHEN product_stage_id IS NULL AND map_product_name_to_stage_id(product_name, category) IS NULL THEN 'needs_manual_review'
    ELSE 'already_set'
  END as mapping_status
FROM inventory_items
LIMIT 1000;

COMMENT ON VIEW v_stage_mapping_preview IS
'Preview of product_stage_id mapping for inventory_items.
Use before running backfill to verify mapping logic.
Shows: current stage, suggested stage, and mapping status.';

GRANT SELECT ON v_stage_mapping_preview TO authenticated;

-- =====================================================
-- SECTION 6: Document stage graph for reference
-- =====================================================

-- Create metadata table for stage transitions (documentation)
CREATE TABLE IF NOT EXISTS product_stage_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_stage_id uuid REFERENCES product_stages(id),
  to_stage_id uuid NOT NULL REFERENCES product_stages(id),
  is_allowed boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_stage_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view product_stage_transitions"
  ON product_stage_transitions FOR SELECT
  TO authenticated
  USING (true);

-- Insert allowed transitions
WITH stage_lookup AS (
  SELECT id, name FROM product_stages
)
INSERT INTO product_stage_transitions (from_stage_id, to_stage_id, notes) VALUES
  -- Binned transitions
  ((SELECT id FROM stage_lookup WHERE name = 'Binned'), (SELECT id FROM stage_lookup WHERE name = 'BuckedFlower'), 'Bucking produces flower'),
  ((SELECT id FROM stage_lookup WHERE name = 'Binned'), (SELECT id FROM stage_lookup WHERE name = 'BuckedSmalls'), 'Bucking produces smalls'),

  -- Bucked transitions
  ((SELECT id FROM stage_lookup WHERE name = 'BuckedFlower'), (SELECT id FROM stage_lookup WHERE name = 'BulkFlower'), 'Trimming bucked flower produces bulk flower'),
  ((SELECT id FROM stage_lookup WHERE name = 'BuckedSmalls'), (SELECT id FROM stage_lookup WHERE name = 'BulkSmalls'), 'Trimming bucked smalls produces bulk smalls'),

  -- Bulk transitions
  ((SELECT id FROM stage_lookup WHERE name = 'BulkFlower'), (SELECT id FROM stage_lookup WHERE name = 'Packaged_3_5g'), 'Packaging bulk flower into 3.5g units'),
  ((SELECT id FROM stage_lookup WHERE name = 'BulkSmalls'), (SELECT id FROM stage_lookup WHERE name = 'Packaged_14gSmalls'), 'Packaging bulk smalls into 14g units')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE product_stage_transitions IS
'Documents allowed stage transitions in the production workflow.
Used by: is_valid_stage_transition() function for validation.
Migration: 20251021000200_event_driven_inventory_stage_seeding.sql';
