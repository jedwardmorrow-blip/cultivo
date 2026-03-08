/*
  # Split combined binned inventory into individual packages per bin entry

  ## Summary
  The binning session completion logic previously created a single combined inventory
  package per session, summing all bin entry weights. This migration retroactively splits
  those 7 combined packages into 36 individual packages — one per bin entry — each with
  its own unique package ID and the correct individual weight.

  ## Changes
  1. Deletes 7 PRODUCE movement records tied to the combined packages
  2. Deletes 7 combined inventory_items rows
  3. Creates 36 new inventory_items rows (one per bin entry) with individual weights
  4. Creates 36 corresponding PRODUCE movement records

  ## Affected Batches
  - 260218-ASU (Animal Tsunami): 1 combined -> 3 individual packages
  - 260218-BLM (Black Maple): 1 combined -> 6 individual packages
  - 260218-BLP (Blue Pave): 1 combined -> 6 individual packages
  - 260218-EAR (Early Riser): 1 combined -> 5 individual packages
  - 260218-SSM (Silver Marker): 1 combined -> 5 individual packages
  - 260218-SWF (Swamp Water Fumez): 1 combined -> 4 individual packages
  - 260218-TIZ (Trillionz): 1 combined -> 7 individual packages

  ## Safety
  - All 7 existing packages have zero reserved_qty and zero downstream usage
  - Each has exactly one movement record (PRODUCE)
  - No package assignments or allocations reference these items
  - Total inventory weight remains unchanged per batch
*/

DO $$
DECLARE
  v_session RECORD;
  v_entry RECORD;
  v_old_item RECORD;
  v_old_movement_id uuid;
  v_strain_name text;
  v_strain_id uuid;
  v_batch_number text;
  v_batch_id uuid;
  v_product_stage_id uuid;
  v_product_name text;
  v_category text;
  v_seq integer;
  v_strain_code text;
  v_date_prefix text;
  v_package_id text;
  v_new_item_id uuid;
  v_entry_count integer;
BEGIN
  v_date_prefix := to_char(CURRENT_DATE, 'YYMMDD');

  FOR v_session IN
    SELECT
      bs.id as session_id,
      bs.batch_registry_id,
      br.batch_number,
      br.strain_id,
      s.name as strain_name,
      s.abbreviation as strain_abbrev
    FROM binning_sessions bs
    JOIN batch_registry br ON br.id = bs.batch_registry_id
    JOIN strains s ON br.strain_id = s.id
    WHERE bs.session_status = 'completed'
      AND br.batch_number LIKE '260218-%'
    ORDER BY br.batch_number
  LOOP
    v_batch_id := v_session.batch_registry_id;
    v_batch_number := v_session.batch_number;
    v_strain_id := v_session.strain_id;
    v_strain_name := v_session.strain_name;
    v_strain_code := v_session.strain_abbrev;
    v_product_name := 'Binned - ' || v_strain_name || ' - Flower';
    v_category := 'Binned';

    SELECT id INTO v_product_stage_id
    FROM product_stages
    WHERE LOWER(name) = 'binned'
    LIMIT 1;

    SELECT ii.id INTO v_old_item
    FROM inventory_items ii
    WHERE ii.batch_id = v_batch_id
      AND ii.product_name = v_product_name
    LIMIT 1;

    IF v_old_item.id IS NOT NULL THEN
      DELETE FROM inventory_movements
      WHERE dest_item_id = v_old_item.id
        AND movement_kind = 'PRODUCE'
        AND reason_code = 'session_finalization';

      DELETE FROM inventory_items WHERE id = v_old_item.id;
    END IF;

    SELECT COUNT(*) INTO v_entry_count
    FROM bin_entries
    WHERE binning_session_id = v_session.session_id;

    v_seq := 0;
    FOR v_entry IN
      SELECT id, bin_weight_grams, entry_order
      FROM bin_entries
      WHERE binning_session_id = v_session.session_id
      ORDER BY entry_order
    LOOP
      SELECT COALESCE(
        MAX(CAST(regexp_replace(package_id, '^[0-9]{6}-[A-Z]+-([0-9]+)$', '\1') AS integer)),
        0
      ) + 1
      INTO v_seq
      FROM inventory_items
      WHERE package_id LIKE v_date_prefix || '-' || v_strain_code || '-%';

      v_package_id := v_date_prefix || '-' || v_strain_code || '-' || lpad(v_seq::text, 3, '0');

      INSERT INTO inventory_items (
        package_id, batch_id, batch_number, batch,
        strain_id, strain, product_stage_id, product_name, category,
        net_weight, on_hand_qty, available_qty, reserved_qty,
        unit, status, package_date
      ) VALUES (
        v_package_id, v_batch_id, v_batch_number, v_batch_number,
        v_strain_id, v_strain_name, v_product_stage_id, v_product_name, v_category,
        NULL, v_entry.bin_weight_grams, v_entry.bin_weight_grams, 0,
        'g', 'Available', CURRENT_DATE
      )
      RETURNING id INTO v_new_item_id;

      INSERT INTO inventory_movements (
        movement_kind, dest_item_id, qty, unit, reason_code, notes
      ) VALUES (
        'PRODUCE', v_new_item_id, v_entry.bin_weight_grams, 'g',
        'session_finalization',
        'Binning entry ' || v_entry.entry_order || ' of ' || v_entry_count || ' — ' || v_entry.bin_weight_grams || 'g'
      );
    END LOOP;
  END LOOP;
END $$;