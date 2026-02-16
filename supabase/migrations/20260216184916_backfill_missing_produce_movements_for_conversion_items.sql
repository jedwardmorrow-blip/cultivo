/*
  # Backfill missing PRODUCE audit movements for conversion inventory items

  ## Problem
  The conversions.service.ts used reason_code='finalized_conversion' which
  caused the fn_update_inventory_on_hand trigger to attempt incrementing
  on_hand_qty (already set during INSERT). The chk_atp_consistency CHECK
  constraint (available_qty = on_hand_qty - reserved_qty) then rejected
  the movement, leaving inventory items without audit trail entries.

  ## Fix
  Insert PRODUCE movements with reason_code='session_finalization' for all
  conversion inventory items that lack a corresponding PRODUCE movement.
  The trigger bypasses on_hand_qty updates for this reason_code, making
  these movements audit-only (which is correct per Architecture Decision #1).

  ## Items Affected
  All inventory_items linked to finalized conversion_packages that have
  no existing PRODUCE movement in inventory_movements.

  ## Security
  - No RLS changes
  - Uses SECURITY DEFINER context via existing movement trigger chain
*/

INSERT INTO inventory_movements (
  movement_kind,
  dest_item_id,
  qty,
  unit,
  reason_code,
  notes,
  created_at
)
SELECT
  'PRODUCE',
  ii.id,
  COALESCE(cp.weight, cp.units, 0),
  CASE WHEN cp.weight IS NOT NULL AND cp.weight > 0 THEN 'g' ELSE 'unit' END,
  'session_finalization',
  'Backfill: audit movement for conversion finalization (originally missing due to reason_code bug)',
  ii.created_at
FROM inventory_items ii
JOIN conversion_packages cp ON cp.package_id = ii.package_id
WHERE cp.finalization_status = 'finalized'
  AND NOT EXISTS (
    SELECT 1 FROM inventory_movements im
    WHERE im.dest_item_id = ii.id
      AND im.movement_kind = 'PRODUCE'
  )
  AND COALESCE(cp.weight, cp.units, 0) > 0;
