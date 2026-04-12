-- Fix fn_apply_audit_adjustments:
-- 1. Accept 'review' status (not just 'in_progress') since moveToReview sets status='review'
-- 2. Remove confirmed=false check since UI flow doesn't use per-line confirmation
-- 3. Set status to 'applied' (matching the UI convention) instead of 'completed'

CREATE OR REPLACE FUNCTION fn_apply_audit_adjustments(
  p_audit_id uuid,
  p_user_id uuid
)
RETURNS TABLE (
  adjustments_applied integer,
  variance_logs_created integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  line_record record;
  movement_id uuid;
  adjustments_count integer := 0;
  variance_count integer := 0;
BEGIN
  -- Validate audit is in review (or in_progress for backwards compat)
  IF NOT EXISTS (
    SELECT 1 FROM inventory_audits
    WHERE id = p_audit_id
      AND status IN ('in_progress', 'review')
  ) THEN
    RAISE EXCEPTION 'Audit is not in a state that can be applied (must be in_progress or review)';
  END IF;

  -- Process each audit line that has been counted
  FOR line_record IN
    SELECT *
    FROM inventory_audit_lines
    WHERE audit_id = p_audit_id
      AND actual_qty IS NOT NULL
      AND inventory_item_id IS NOT NULL
  LOOP
    -- Create RECONCILIATION movement
    INSERT INTO inventory_movements (
      source_item_id,
      movement_kind,
      qty,
      unit,
      reason_code,
      notes,
      occurred_at
    )
    VALUES (
      line_record.inventory_item_id,
      'RECONCILIATION',
      line_record.actual_qty,
      line_record.unit,
      line_record.variance_reason::text,
      'Audit reconciliation: ' || COALESCE(line_record.variance_notes, 'No notes provided'),
      now()
    )
    RETURNING id INTO movement_id;

    adjustments_count := adjustments_count + 1;

    -- Create variance log entry if variance exists
    IF line_record.variance_qty != 0 THEN
      INSERT INTO variance_log (
        source_type,
        source_id,
        inventory_item_id,
        package_id,
        expected_qty,
        actual_qty,
        variance_qty,
        variance_percentage,
        unit,
        variance_reason,
        notes,
        inventory_stage,
        strain,
        batch,
        product_name,
        user_id,
        movement_id
      )
      VALUES (
        'audit_reconciliation',
        p_audit_id,
        line_record.inventory_item_id,
        line_record.package_id,
        line_record.expected_qty,
        line_record.actual_qty,
        line_record.variance_qty,
        line_record.variance_percentage,
        line_record.unit,
        line_record.variance_reason,
        line_record.variance_notes,
        line_record.stage,
        line_record.strain,
        line_record.batch,
        line_record.product_name,
        p_user_id,
        movement_id
      );

      variance_count := variance_count + 1;
    END IF;
  END LOOP;

  -- Update audit status to applied
  UPDATE inventory_audits
  SET status = 'applied',
      applied_at = now(),
      applied_by = p_user_id,
      completed_at = now(),
      completed_by = p_user_id,
      packages_with_variance = variance_count,
      is_locked = false,
      updated_at = now()
  WHERE id = p_audit_id;

  RETURN QUERY SELECT adjustments_count, variance_count;
END;
$$;

COMMENT ON FUNCTION fn_apply_audit_adjustments(uuid, uuid) IS
  'Applies audit adjustments: creates reconciliation movements, logs variances, marks audit as applied.';
