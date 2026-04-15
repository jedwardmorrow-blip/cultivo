-- Fix: orphan-ingested inventory rows are invisible to the order-assignment UI
--
-- Problem: fn_apply_audit_adjustments INSERTs new orphan inventory_items with
-- status = 'active'. Every other creation path uses status = 'available', and
-- the order-assignment service (packageAssignment.service.ts) filters on a
-- whitelist of 'available' / 'reserved' / 'packaged'. Rows written by audit
-- apply therefore never appear in PackageAssignmentModal — Laura can see them
-- in inventory views but cannot assign them to an order.
--
-- Scope: 46 rows across 7 categories, all written in one audit apply on
-- 2026-04-14 20:02:14. Three of those are flower_packaged — the ones Laura
-- flagged: 260412-ASU-001, 260412-CAP, 260412-CHL.
--
-- Fix:
--   1. Patch fn_apply_audit_adjustments to INSERT with status = 'available'
--      (matches every other creation path; consistent with whitelist).
--   2. Backfill the 46 existing rows: status = 'active' → 'available'.
--   3. Normalise product_name on the 3 packaged orphans to the canonical
--      "Packaged - [Strain] - [Size] [Type]" format (system_rule #45) so they
--      hit the exact-match path in the order-assignment service. Type inferred
--      from the physical labels (Product Type: Flower).

-- ── 1. Patch the RPC ──────────────────────────────────────────────────────
-- Single-line change inside the orphan INSERT block: 'active' → 'available'.
-- Full function redefined to avoid partial-replacement drift.

CREATE OR REPLACE FUNCTION public.fn_apply_audit_adjustments(p_audit_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_audit               inventory_audits%ROWTYPE;
  v_caller              uuid := auth.uid();
  v_line                inventory_audit_lines%ROWTYPE;
  v_live_qty            numeric;
  v_movement_id         uuid;
  v_new_item_id         uuid;
  v_batch_id            uuid;
  v_pending_lines       integer;

  v_total_lines         integer := 0;
  v_matches             integer := 0;
  v_variances           integer := 0;
  v_not_found           integer := 0;
  v_orphans             integer := 0;
  v_orphans_ingested    integer := 0;
  v_orphans_skipped     integer := 0;
  v_skipped             integer := 0;
  v_movements_written   integer := 0;
  v_variances_logged    integer := 0;
  v_not_found_cleared   integer := 0;
  v_net_variance_qty    numeric := 0;
  v_summary             jsonb;
BEGIN
  SELECT * INTO v_audit FROM inventory_audits WHERE id = p_audit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fn_apply_audit_adjustments: audit % not found', p_audit_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_audit.status = 'applied' THEN
    RAISE EXCEPTION 'fn_apply_audit_adjustments: audit % already applied at %',
      p_audit_id, v_audit.applied_at USING ERRCODE = 'P0001';
  END IF;
  IF v_audit.status IN ('cancelled','abandoned') THEN
    RAISE EXCEPTION 'fn_apply_audit_adjustments: audit % is %',
      p_audit_id, v_audit.status USING ERRCODE = 'P0001';
  END IF;
  IF v_audit.status NOT IN ('initiated','in_progress','review') THEN
    RAISE EXCEPTION 'fn_apply_audit_adjustments: audit % has unexpected status %',
      p_audit_id, v_audit.status USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*) INTO v_pending_lines
  FROM inventory_audit_lines
  WHERE audit_id = p_audit_id AND line_status = 'pending';
  IF v_pending_lines > 0 THEN
    RAISE EXCEPTION 'fn_apply_audit_adjustments: % lines still pending', v_pending_lines
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_line IN
    SELECT * FROM inventory_audit_lines
    WHERE audit_id = p_audit_id
    ORDER BY line_order NULLS LAST, id
  LOOP
    v_total_lines := v_total_lines + 1;

    IF v_line.line_status = 'match' THEN
      v_matches := v_matches + 1;
      UPDATE inventory_audit_lines
        SET confirmed = true, confirmed_at = COALESCE(confirmed_at, now())
      WHERE id = v_line.id;
      CONTINUE;
    END IF;

    IF v_line.line_status = 'variance' THEN
      IF v_line.inventory_item_id IS NULL THEN
        RAISE EXCEPTION 'variance line % has NULL inventory_item_id', v_line.id
          USING ERRCODE = 'P0001';
      END IF;
      IF v_line.actual_qty IS NULL THEN
        RAISE EXCEPTION 'variance line % has NULL actual_qty', v_line.id
          USING ERRCODE = 'P0001';
      END IF;
      IF v_line.variance_reason IS NULL THEN
        RAISE EXCEPTION 'variance line % has NULL variance_reason', v_line.id
          USING ERRCODE = 'P0001';
      END IF;

      IF v_line.actual_qty > 0 THEN
        INSERT INTO inventory_movements (
          movement_kind, dest_item_id, qty, unit, reason_code,
          reference_type, reference_id, notes, movement_date, created_by
        ) VALUES (
          'RECONCILIATION', v_line.inventory_item_id, v_line.actual_qty,
          v_line.unit, v_line.variance_reason::text,
          'inventory_audit', p_audit_id,
          COALESCE(v_line.variance_notes,
            'Audit ' || v_audit.audit_number || ' line ' ||
            COALESCE(v_line.line_order::text, v_line.id::text)),
          now(), COALESCE(v_caller::text, 'system')
        ) RETURNING id INTO v_movement_id;
      ELSE
        SELECT on_hand_qty INTO v_live_qty
        FROM inventory_items WHERE id = v_line.inventory_item_id FOR UPDATE;
        IF v_live_qty > 0 THEN
          INSERT INTO inventory_movements (
            movement_kind, source_item_id, qty, unit, reason_code,
            reference_type, reference_id, notes, movement_date, created_by
          ) VALUES (
            'CONSUME', v_line.inventory_item_id, v_live_qty,
            v_line.unit, v_line.variance_reason::text,
            'inventory_audit', p_audit_id,
            COALESCE(v_line.variance_notes,
              'Audit ' || v_audit.audit_number || ' variance-to-zero'),
            now(), COALESCE(v_caller::text, 'system')
          ) RETURNING id INTO v_movement_id;
        ELSE
          v_movement_id := NULL;
        END IF;
      END IF;

      IF v_movement_id IS NOT NULL THEN
        v_movements_written := v_movements_written + 1;
      END IF;

      INSERT INTO variance_log (
        source_type, source_id, inventory_item_id, package_id,
        expected_qty, actual_qty, variance_qty, variance_percentage,
        unit, variance_reason, notes, inventory_stage,
        strain, batch, product_name, user_id, movement_id, timestamp
      ) VALUES (
        'audit_reconciliation', p_audit_id, v_line.inventory_item_id,
        v_line.package_id, v_line.expected_qty, v_line.actual_qty,
        COALESCE(v_line.variance_qty, v_line.actual_qty - v_line.expected_qty),
        COALESCE(v_line.variance_percentage,
          CASE WHEN v_line.expected_qty <> 0
            THEN ((v_line.actual_qty - v_line.expected_qty) / v_line.expected_qty) * 100
            ELSE 0 END),
        v_line.unit, v_line.variance_reason, v_line.variance_notes,
        v_line.stage, v_line.strain, v_line.batch, v_line.product_name,
        v_caller, v_movement_id, now()
      );

      v_variances           := v_variances + 1;
      v_variances_logged    := v_variances_logged + 1;
      v_net_variance_qty    := v_net_variance_qty +
        COALESCE(v_line.variance_qty, v_line.actual_qty - v_line.expected_qty);

      UPDATE inventory_audit_lines
        SET confirmed = true, confirmed_at = COALESCE(confirmed_at, now())
      WHERE id = v_line.id;
      CONTINUE;
    END IF;

    IF v_line.line_status = 'not_found' THEN
      IF v_line.inventory_item_id IS NULL THEN
        RAISE EXCEPTION 'not_found line % has NULL inventory_item_id', v_line.id
          USING ERRCODE = 'P0001';
      END IF;

      SELECT on_hand_qty INTO v_live_qty
      FROM inventory_items WHERE id = v_line.inventory_item_id FOR UPDATE;

      IF v_live_qty IS NULL THEN
        v_movement_id := NULL;
      ELSIF v_live_qty > 0 THEN
        INSERT INTO inventory_movements (
          movement_kind, source_item_id, qty, unit, reason_code,
          reference_type, reference_id, notes, movement_date, created_by
        ) VALUES (
          'CONSUME', v_line.inventory_item_id, v_live_qty,
          v_line.unit, 'not_found',
          'inventory_audit', p_audit_id,
          COALESCE(v_line.variance_notes,
            'Audit ' || v_audit.audit_number || ' not_found line'),
          now(), COALESCE(v_caller::text, 'system')
        ) RETURNING id INTO v_movement_id;
        v_movements_written   := v_movements_written + 1;
        v_not_found_cleared   := v_not_found_cleared + 1;
      ELSE
        v_movement_id := NULL;
      END IF;

      INSERT INTO variance_log (
        source_type, source_id, inventory_item_id, package_id,
        expected_qty, actual_qty, variance_qty, variance_percentage,
        unit, variance_reason, notes, inventory_stage,
        strain, batch, product_name, user_id, movement_id, timestamp
      ) VALUES (
        'audit_reconciliation', p_audit_id, v_line.inventory_item_id,
        v_line.package_id, v_line.expected_qty, 0,
        -v_line.expected_qty, -100,
        v_line.unit, 'not_found',
        COALESCE(v_line.variance_notes, 'Package physically absent at audit'),
        v_line.stage, v_line.strain, v_line.batch, v_line.product_name,
        v_caller, v_movement_id, now()
      );

      v_not_found           := v_not_found + 1;
      v_variances_logged    := v_variances_logged + 1;
      v_net_variance_qty    := v_net_variance_qty - v_line.expected_qty;

      UPDATE inventory_audit_lines
        SET confirmed = true, confirmed_at = COALESCE(confirmed_at, now())
      WHERE id = v_line.id;
      CONTINUE;
    END IF;

    IF v_line.line_status = 'orphan' THEN
      v_orphans := v_orphans + 1;

      IF v_line.inventory_item_id IS NOT NULL THEN
        v_orphans_skipped := v_orphans_skipped + 1;
        UPDATE inventory_audit_lines
          SET confirmed = true, confirmed_at = COALESCE(confirmed_at, now())
        WHERE id = v_line.id;
        CONTINUE;
      END IF;

      IF v_line.actual_qty IS NULL OR v_line.actual_qty <= 0 THEN
        RAISE EXCEPTION
          'orphan line % has NULL or zero actual_qty — cannot ingest without a quantity',
          v_line.id USING ERRCODE = 'P0001';
      END IF;

      v_batch_id := NULL;
      IF v_line.batch IS NOT NULL THEN
        SELECT id INTO v_batch_id
        FROM batch_registry
        WHERE batch_number = v_line.batch
        LIMIT 1;

        IF v_batch_id IS NULL THEN
          INSERT INTO batch_registry (batch_number, strain, status, lifecycle_state)
          VALUES (
            v_line.batch,
            COALESCE(v_line.strain, 'Unknown'),
            'active',
            'bulk_available'
          )
          RETURNING id INTO v_batch_id;
        END IF;
      END IF;

      IF v_batch_id IS NULL THEN
        RAISE EXCEPTION
          'orphan line % has no batch reference — cannot create inventory_item without batch_id',
          v_line.id USING ERRCODE = 'P0001';
      END IF;

      -- ── THE FIX ──────────────────────────────────────────────────────
      -- status was 'active' — not in the app-layer whitelist for order
      -- assignment. 'available' matches every other creation path and is
      -- accepted by packageAssignment.service.ts.
      INSERT INTO inventory_items (
        package_id, product_name, batch, batch_id,
        strain, status, stage, room,
        on_hand_qty, available_qty, reserved_qty,
        unit, category
      ) VALUES (
        v_line.package_id,
        v_line.product_name,
        v_line.batch,
        v_batch_id,
        v_line.strain,
        'available',           -- was 'active' — see fix note above
        v_line.stage,
        v_line.room,
        v_line.actual_qty,
        v_line.actual_qty,
        0,
        v_line.unit,
        NULL
      )
      RETURNING id INTO v_new_item_id;

      INSERT INTO inventory_movements (
        movement_kind, dest_item_id, qty, unit, reason_code,
        reference_type, reference_id, notes, movement_date, created_by
      ) VALUES (
        'RECONCILIATION',
        v_new_item_id,
        v_line.actual_qty,
        v_line.unit,
        'audit_orphan_ingest',
        'inventory_audit',
        p_audit_id,
        'Audit ' || v_audit.audit_number ||
          ' — orphan ingest: package found physically, not previously in system',
        now(),
        COALESCE(v_caller::text, 'system')
      ) RETURNING id INTO v_movement_id;

      v_movements_written   := v_movements_written + 1;
      v_orphans_ingested    := v_orphans_ingested + 1;

      INSERT INTO variance_log (
        source_type, source_id, inventory_item_id, package_id,
        expected_qty, actual_qty, variance_qty, variance_percentage,
        unit, variance_reason, notes, inventory_stage,
        strain, batch, product_name, user_id, movement_id, timestamp
      ) VALUES (
        'audit_orphan_ingest', p_audit_id, v_new_item_id,
        v_line.package_id,
        0,
        v_line.actual_qty,
        v_line.actual_qty,
        100,
        v_line.unit,
        'orphan_ingest',
        COALESCE(v_line.variance_notes,
          'Package found physically at audit, ingested as new inventory item'),
        v_line.stage, v_line.strain, v_line.batch, v_line.product_name,
        v_caller, v_movement_id, now()
      );

      UPDATE inventory_audit_lines
        SET inventory_item_id = v_new_item_id,
            confirmed         = true,
            confirmed_at      = COALESCE(confirmed_at, now())
      WHERE id = v_line.id;

      CONTINUE;
    END IF;

    RAISE EXCEPTION 'line % has unrecognised line_status %',
      v_line.id, v_line.line_status USING ERRCODE = 'P0001';
  END LOOP;

  v_summary := jsonb_build_object(
    'total_lines',          v_total_lines,
    'matches',              v_matches,
    'variances',            v_variances,
    'not_found',            v_not_found,
    'orphans',              v_orphans,
    'orphans_ingested',     v_orphans_ingested,
    'orphans_skipped',      v_orphans_skipped,
    'skipped',              v_skipped,
    'movements_written',    v_movements_written,
    'variances_logged',     v_variances_logged,
    'not_found_cleared',    v_not_found_cleared,
    'net_variance_qty',     v_net_variance_qty,
    'applied_at',           now(),
    'applied_by',           v_caller
  );

  UPDATE inventory_audits
  SET
    status                  = 'applied',
    applied_at              = now(),
    applied_by              = v_caller,
    completed_at            = COALESCE(completed_at, now()),
    completed_by            = COALESCE(completed_by, v_caller),
    total_packages          = v_total_lines,
    packages_with_variance  = v_variances + v_not_found,
    total_variance_amount   = v_net_variance_qty,
    summary                 = v_summary,
    updated_at              = now()
  WHERE id = p_audit_id;

  RETURN v_summary;
END;
$function$;

COMMENT ON FUNCTION public.fn_apply_audit_adjustments(uuid) IS
  'Applies an inventory audit. Orphan-ingested rows are created with status = available (matches packageAssignment.service.ts whitelist so they are visible to order assignment).';

-- ── 2. Backfill the 46 existing orphan rows ──────────────────────────────
-- All 46 rows were written by the 2026-04-14 20:02:14 audit apply. Safe blanket
-- update because 'active' is not used anywhere else in inventory_items.

UPDATE public.inventory_items
SET status     = 'available',
    last_updated = now()
WHERE status = 'active';

-- ── 3. Normalise product_name on the 3 packaged orphans ──────────────────
-- Canonical format (system_rule #45): "Packaged - [Strain] - [Size] [Type]"
-- Type inferred from physical labels (PRODUCT TYPE: Flower). Also fixes the
-- "14gs" typo on the Capulator and Chemlatto rows.

UPDATE public.inventory_items
SET product_name = 'Packaged - Animal Tsunami - 14g Flower',
    last_updated = now()
WHERE package_id = '260412-ASU-001'
  AND product_name = 'Packaged- Animal Tsunami- 14g';

UPDATE public.inventory_items
SET product_name = 'Packaged - Capulator Junky - 14g Flower',
    last_updated = now()
WHERE package_id = '260412-CAP'
  AND product_name = 'Packaged- Capulator Junky- 14gs';

UPDATE public.inventory_items
SET product_name = 'Packaged - Chemlatto - 14g Flower',
    last_updated = now()
WHERE package_id = '260412-CHL'
  AND product_name = 'Packaged- Chemlatto- 14gs';
