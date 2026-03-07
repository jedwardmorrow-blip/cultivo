/*
  # Split lumped binning inventory into individual per-entry packages

  Three binning sessions (Stay Puft, Chemlatto, Cherry Paloma) from 2026-03-05
  were completed while a stale code bundle was running, creating a single lumped
  inventory item per session instead of one per bin entry.

  1. Changes
    - Deletes 3 incorrect PRODUCE movement records (one per session)
    - Deletes 3 lumped inventory_items (one per session)
    - Creates 20 individual inventory_items (7 + 6 + 7) with correct per-bin weights
    - Creates 20 matching PRODUCE movement records for audit trail

  2. Affected Batches
    - 260218-STP (Stay Puft): 7 bins totaling 6,702g
    - 260218-CHL (Chemlatto): 6 bins totaling 6,888g
    - 260218-CHP (Cherry Paloma): 7 bins totaling 8,076g

  3. Safety
    - No downstream movements reference these items (verified: zero source_item_id refs)
    - Totals are preserved exactly (no weight change)
    - All new items satisfy chk_atp_consistency constraint
*/

-- Step 1: Delete the 3 lumped PRODUCE movements
DELETE FROM inventory_movements
WHERE id IN (
  '159438de-03dc-4d22-875f-ea019c5811d5',  -- Chemlatto lumped
  'c5895c6a-cd28-4af4-9596-b38569bd168b',  -- Cherry Paloma lumped
  'c98ece70-ab62-43fe-aeaf-61d9add874bc'   -- Stay Puft lumped
);

-- Step 2: Delete the 3 lumped inventory items
DELETE FROM inventory_items
WHERE id IN (
  'c15ee44f-5c2c-4230-9cb4-e217e410b5f0',  -- Chemlatto 260305-CHL-001
  '4f150e7f-52e0-4ba5-85ce-67bf0f8249f9',  -- Cherry Paloma 260305-CHP-001
  'ece9b828-256d-41f4-9110-872cb02cc311'   -- Stay Puft 260305-STP-001
);

-- Step 3: Create individual inventory items for Stay Puft (7 bins, 6702g total)
-- batch_id: 91260fbe-d243-482c-8de8-daf0473f660c
-- strain_id: 865b0f66-9f62-4ee5-9b39-02379ba978b6
DO $$
DECLARE
  v_batch_id uuid := '91260fbe-d243-482c-8de8-daf0473f660c';
  v_strain_id uuid := '865b0f66-9f62-4ee5-9b39-02379ba978b6';
  v_stage_id uuid := 'c360e356-eb78-4512-8777-ee47c328157d';
  v_weights numeric[] := ARRAY[976, 986, 930, 1076, 1088, 924, 722];
  v_total_entries int := 7;
  v_pkg_id text;
  v_inv_id uuid;
  v_weight numeric;
BEGIN
  FOR i IN 1..v_total_entries LOOP
    v_weight := v_weights[i];
    v_pkg_id := generate_next_package_id(v_batch_id);

    INSERT INTO inventory_items (
      package_id, batch_id, batch_number, batch, strain_id, strain,
      product_stage_id, product_name, category,
      on_hand_qty, available_qty, reserved_qty, unit, status, package_date
    ) VALUES (
      v_pkg_id, v_batch_id, '260218-STP', '260218-STP', v_strain_id, 'Stay Puft',
      v_stage_id, 'Binned - Stay Puft - Flower', 'Binned',
      v_weight, v_weight, 0, 'g', 'Available', '2026-03-05'
    )
    RETURNING id INTO v_inv_id;

    INSERT INTO inventory_movements (
      movement_kind, dest_item_id, qty, unit, reason_code, notes
    ) VALUES (
      'PRODUCE', v_inv_id, v_weight, 'g', 'session_finalization',
      format('Binning entry %s of %s — %sg', i, v_total_entries, v_weight)
    );
  END LOOP;
END $$;

-- Step 4: Create individual inventory items for Chemlatto (6 bins, 6888g total)
-- batch_id: 210d6a4e-7960-4759-9165-0ce9fc6c13c1
-- strain_id: d38b2e52-8fed-4c5a-80eb-590c8ed7ea75
DO $$
DECLARE
  v_batch_id uuid := '210d6a4e-7960-4759-9165-0ce9fc6c13c1';
  v_strain_id uuid := 'd38b2e52-8fed-4c5a-80eb-590c8ed7ea75';
  v_stage_id uuid := 'c360e356-eb78-4512-8777-ee47c328157d';
  v_weights numeric[] := ARRAY[1442, 1062, 1270, 1250, 736, 1128];
  v_total_entries int := 6;
  v_pkg_id text;
  v_inv_id uuid;
  v_weight numeric;
BEGIN
  FOR i IN 1..v_total_entries LOOP
    v_weight := v_weights[i];
    v_pkg_id := generate_next_package_id(v_batch_id);

    INSERT INTO inventory_items (
      package_id, batch_id, batch_number, batch, strain_id, strain,
      product_stage_id, product_name, category,
      on_hand_qty, available_qty, reserved_qty, unit, status, package_date
    ) VALUES (
      v_pkg_id, v_batch_id, '260218-CHL', '260218-CHL', v_strain_id, 'Chemlatto',
      v_stage_id, 'Binned - Chemlatto - Flower', 'Binned',
      v_weight, v_weight, 0, 'g', 'Available', '2026-03-05'
    )
    RETURNING id INTO v_inv_id;

    INSERT INTO inventory_movements (
      movement_kind, dest_item_id, qty, unit, reason_code, notes
    ) VALUES (
      'PRODUCE', v_inv_id, v_weight, 'g', 'session_finalization',
      format('Binning entry %s of %s — %sg', i, v_total_entries, v_weight)
    );
  END LOOP;
END $$;

-- Step 5: Create individual inventory items for Cherry Paloma (7 bins, 8076g total)
-- batch_id: 4b481964-2e4f-471e-baec-c6b24e8e4132
-- strain_id: 2d1cb85f-51d8-4274-a1c8-244ddc2f6188
DO $$
DECLARE
  v_batch_id uuid := '4b481964-2e4f-471e-baec-c6b24e8e4132';
  v_strain_id uuid := '2d1cb85f-51d8-4274-a1c8-244ddc2f6188';
  v_stage_id uuid := 'c360e356-eb78-4512-8777-ee47c328157d';
  v_weights numeric[] := ARRAY[1184, 1066, 1202, 966, 1100, 1266, 1292];
  v_total_entries int := 7;
  v_pkg_id text;
  v_inv_id uuid;
  v_weight numeric;
BEGIN
  FOR i IN 1..v_total_entries LOOP
    v_weight := v_weights[i];
    v_pkg_id := generate_next_package_id(v_batch_id);

    INSERT INTO inventory_items (
      package_id, batch_id, batch_number, batch, strain_id, strain,
      product_stage_id, product_name, category,
      on_hand_qty, available_qty, reserved_qty, unit, status, package_date
    ) VALUES (
      v_pkg_id, v_batch_id, '260218-CHP', '260218-CHP', v_strain_id, 'Cherry Paloma',
      v_stage_id, 'Binned - Cherry Paloma - Flower', 'Binned',
      v_weight, v_weight, 0, 'g', 'Available', '2026-03-05'
    )
    RETURNING id INTO v_inv_id;

    INSERT INTO inventory_movements (
      movement_kind, dest_item_id, qty, unit, reason_code, notes
    ) VALUES (
      'PRODUCE', v_inv_id, v_weight, 'g', 'session_finalization',
      format('Binning entry %s of %s — %sg', i, v_total_entries, v_weight)
    );
  END LOOP;
END $$;
