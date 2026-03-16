/*
  # Fix ADJUSTMENT/RECONCILIATION ATP Consistency Violation

  ## Problem
  The fn_update_inventory_on_hand trigger only updated on_hand_qty for ADJUSTMENT
  and RECONCILIATION movements, but did NOT update available_qty. This violated
  the chk_atp_consistency constraint (available_qty = on_hand_qty - reserved_qty),
  causing the Quick Adjustment feature to fail with an [object Object] error.

  This is the same class of bug that was fixed for FULFILLMENT movements in
  migration 20260301230247_fix_fulfillment_trigger_atp_constraint.sql.

  ## Fix
  All movement kind cases now atomically update both on_hand_qty AND available_qty
  in a single UPDATE statement, maintaining ATP consistency at all times:
  - ADJUSTMENT/RECONCILIATION: sets on_hand_qty = NEW.qty, available_qty = NEW.qty - reserved_qty
  - RECEIPT/PRODUCE/RETURN: increments both fields
  - CONSUME/FULFILLMENT: decrements both fields

  ## Also Fixed (frontend)
  - adjustment.service.ts: was passing inventory_item_id as source_item_id instead of dest_item_id
  - inventoryMovement.service.ts: Supabase PostgrestError not properly stringified (showed [object Object])

  ## Migration Date
  2026-03-16

  ## Applied To
  Production: fonreynkfeqywshijqpi
*/

CREATE OR REPLACE FUNCTION fn_update_inventory_on_hand()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  target_item_id uuid;
  qty_change numeric;
  current_qty numeric;
BEGIN
  IF NEW.movement_kind IN ('RESERVE', 'RELEASE') THEN
    RAISE NOTICE 'RESERVE/RELEASE movement % - ATP handled by session triggers, no on_hand_qty change', NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.reason_code = 'session_finalization' THEN
    RAISE NOTICE 'Session finalization movement % - audit trail only, quantities set directly', NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.reason_code = 'order_fulfillment' THEN
    RAISE NOTICE 'Order fulfillment movement % - audit trail only, quantities set by fulfillment trigger', NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.dest_item_id IS NOT NULL THEN
    target_item_id := NEW.dest_item_id;
  ELSIF NEW.source_item_id IS NOT NULL THEN
    target_item_id := NEW.source_item_id;
  ELSE
    RAISE EXCEPTION 'Movement must have either source_item_id or dest_item_id';
  END IF;

  SELECT on_hand_qty INTO current_qty
  FROM inventory_items
  WHERE id = target_item_id;

  PERFORM set_config('app.allow_quantity_update', 'true', true);

  BEGIN
    CASE NEW.movement_kind
      WHEN 'ADJUSTMENT', 'RECONCILIATION' THEN
        UPDATE inventory_items
        SET on_hand_qty = NEW.qty,
            available_qty = NEW.qty - COALESCE(reserved_qty, 0),
            last_updated = now()
        WHERE id = target_item_id;
        RAISE NOTICE 'Absolute movement: % -> % for item %', current_qty, NEW.qty, target_item_id;

      WHEN 'RECEIPT', 'PRODUCE', 'RETURN' THEN
        UPDATE inventory_items
        SET on_hand_qty = COALESCE(on_hand_qty, 0) + NEW.qty,
            available_qty = COALESCE(on_hand_qty, 0) + NEW.qty - COALESCE(reserved_qty, 0),
            last_updated = now()
        WHERE id = target_item_id;
        RAISE NOTICE 'Increment movement: % + % = % for item %', current_qty, NEW.qty, (COALESCE(current_qty, 0) + NEW.qty), target_item_id;

      WHEN 'CONSUME', 'FULFILLMENT' THEN
        UPDATE inventory_items
        SET on_hand_qty = GREATEST(0, COALESCE(on_hand_qty, 0) - NEW.qty),
            available_qty = GREATEST(0, COALESCE(on_hand_qty, 0) - NEW.qty) - COALESCE(reserved_qty, 0),
            last_updated = now()
        WHERE id = target_item_id;
        RAISE NOTICE 'Decrement movement: % - % = % for item %', current_qty, NEW.qty, GREATEST(0, COALESCE(current_qty, 0) - NEW.qty), target_item_id;

      ELSE
        RAISE EXCEPTION 'Unknown movement_kind: %', NEW.movement_kind;
    END CASE;

    IF NOT FOUND THEN
      RAISE WARNING 'No inventory item found with id: %', target_item_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM set_config('app.allow_quantity_update', 'false', true);
      RAISE;
  END;

  PERFORM set_config('app.allow_quantity_update', 'false', true);

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION fn_update_inventory_on_hand IS
  'PRIMARY FUNCTION (SECURITY DEFINER): Updates inventory_items.on_hand_qty AND available_qty based on movement_kind.
   All cases atomically maintain ATP consistency (available_qty = on_hand_qty - reserved_qty).
   RESERVE/RELEASE are NO-OP (ATP tracking only).
   Session finalization movements are NO-OP (audit trail only).
   Order fulfillment movements are NO-OP (quantities set by fulfillment trigger).
   Updated: 2026-03-16 (fixed ATP consistency for all movement kinds)';
