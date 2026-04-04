-- CUL-352: batch_registry coa_status state machine + enforcement migration
-- Subsumes CUL-293

-- 1. New enum
CREATE TYPE batch_coa_status AS ENUM (
  'curing',
  'pending_sampling',
  'testing_in_progress',
  'coa_received',
  'coa_failed',
  'available'
);

-- 2. New columns on batch_registry
ALTER TABLE batch_registry
  ADD COLUMN coa_status batch_coa_status NOT NULL DEFAULT 'curing',
  ADD COLUMN cure_start_date timestamptz,
  ADD COLUMN cure_expected_complete_date timestamptz,
  ADD COLUMN testing_submitted_at timestamptz,
  ADD COLUMN testing_facility_id text;

-- 3. Backfill: batches with active COA are already cleared
UPDATE batch_registry br
SET coa_status = 'available'
WHERE EXISTS (
  SELECT 1 FROM certificates_of_analysis coa
  WHERE coa.batch_id = br.id AND coa.is_active = true
);

-- 4. Extend fn_check_quarantine_before_movement with COA gate
CREATE OR REPLACE FUNCTION fn_check_quarantine_before_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch_id uuid;
  v_is_quarantined boolean;
  v_quarantine_reason text;
  v_batch_number text;
  v_coa_status batch_coa_status;
BEGIN
  IF NEW.movement_kind NOT IN ('RESERVE', 'FULFILLMENT') THEN
    RETURN NEW;
  END IF;

  IF NEW.source_item_id IS NOT NULL THEN
    SELECT batch_id INTO v_batch_id
    FROM inventory_items
    WHERE id = NEW.source_item_id;
  END IF;

  IF v_batch_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    is_quarantined,
    quarantine_reason,
    batch_number,
    coa_status
  INTO
    v_is_quarantined,
    v_quarantine_reason,
    v_batch_number,
    v_coa_status
  FROM batch_registry
  WHERE id = v_batch_id;

  IF v_is_quarantined = true THEN
    INSERT INTO quarantine_violation_log (
      batch_id, attempted_operation, movement_kind, order_id, item_id,
      blocked_by, quarantine_reason, violation_details
    ) VALUES (
      v_batch_id, NEW.movement_kind, NEW.movement_kind, NEW.order_id, NEW.source_item_id,
      NEW.created_by, v_quarantine_reason,
      jsonb_build_object('movement_id', NEW.id, 'qty', NEW.qty, 'unit', NEW.unit, 'blocked_at', now())
    );

    RAISE EXCEPTION 'QUARANTINE GATE: Cannot perform % operation on batch %. Batch is quarantined. Reason: %. Contact QC to release quarantine.',
      NEW.movement_kind, v_batch_number, COALESCE(v_quarantine_reason, 'No reason provided')
    USING ERRCODE = 'check_violation',
    HINT = 'Release batch quarantine before attempting fulfillment or reservation operations.',
    DETAIL = format('Batch ID: %s, Movement Kind: %s, Item ID: %s', v_batch_id, NEW.movement_kind, NEW.source_item_id);
  END IF;

  IF v_coa_status IS NOT NULL AND v_coa_status != 'available' THEN
    INSERT INTO quarantine_violation_log (
      batch_id, attempted_operation, movement_kind, order_id, item_id,
      blocked_by, quarantine_reason, violation_details
    ) VALUES (
      v_batch_id, NEW.movement_kind, NEW.movement_kind, NEW.order_id, NEW.source_item_id,
      NEW.created_by, 'COA not cleared: ' || v_coa_status::text,
      jsonb_build_object('movement_id', NEW.id, 'coa_status', v_coa_status, 'blocked_at', now())
    );

    RAISE EXCEPTION 'COA GATE: Cannot perform % on batch %. COA status is %. Batch must reach available status before fulfillment or reservation.',
      NEW.movement_kind, v_batch_number, v_coa_status
    USING ERRCODE = 'check_violation',
    HINT = 'Update batch coa_status to available after receiving passing COA results.',
    DETAIL = format('Batch ID: %s, COA Status: %s', v_batch_id, v_coa_status);
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Rebuild batch_with_coa_status view
-- coa_status now = authoritative compliance state from batch_registry
-- coa_document_status = derived from certificates_of_analysis join (renamed from coa_status)
DROP VIEW IF EXISTS batch_with_coa_status;

CREATE VIEW batch_with_coa_status AS
SELECT
  br.id AS batch_id,
  br.batch_number,
  br.strain,
  br.harvest_date,
  br.room,
  br.initial_weight_grams,
  br.status AS batch_status,
  br.lifecycle_state,
  br.quality_grade_id,
  br.notes AS batch_notes,
  br.coa_status,
  br.cure_start_date,
  br.cure_expected_complete_date,
  br.testing_submitted_at,
  br.testing_facility_id,
  coa.id AS coa_id,
  coa.thc_percentage,
  coa.cbd_percentage,
  coa.total_cannabinoids_percentage,
  coa.total_terpenes_mg_g,
  coa.sample_date,
  coa.manufacture_date,
  coa.terpene_1_name,
  coa.terpene_1_value,
  coa.terpene_1_percentage,
  coa.terpene_2_name,
  coa.terpene_2_value,
  coa.terpene_2_percentage,
  coa.terpene_3_name,
  coa.terpene_3_value,
  coa.terpene_3_percentage,
  coa.pdf_file_path,
  coa.is_active AS coa_is_active,
  CASE
    WHEN coa.id IS NOT NULL AND coa.is_active THEN 'active'
    WHEN coa.id IS NOT NULL AND NOT coa.is_active THEN 'inactive'
    ELSE 'missing'
  END AS coa_document_status,
  br.created_at,
  br.updated_at
FROM batch_registry br
LEFT JOIN certificates_of_analysis coa
  ON coa.batch_id = br.id AND coa.is_active = true;
