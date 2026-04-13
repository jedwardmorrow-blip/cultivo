-- Fix generate_next_package_id to handle null strain_id gracefully.
-- Previously: INNER JOIN on strains via strain_id meant null strain_id = function failure.
-- Now: LEFT JOIN + fallback to extracting strain code from batch_number (e.g. '251022-CHP' -> 'CHP').
--
-- Also backfilled 5 batch_registry rows that had null strain_id:
--   250704-HF  -> Magic Marker (MGM)
--   250704-HH  -> Z Marker (ZMK)
--   251022-CHL -> Chemlatto (CHL)
--   251022-CHP -> Cherry Paloma (CHP)
--   251022-ZCH -> Z Chem (ZCH)

CREATE OR REPLACE FUNCTION public.generate_next_package_id(p_batch_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_strain_code text;
  v_date_prefix text;
  v_next_seq integer;
  v_package_id text;
  v_batch_number text;
BEGIN
  -- Get strain code from batch via strain_id join
  SELECT s.abbreviation, b.batch_number
  INTO v_strain_code, v_batch_number
  FROM batch_registry b
  LEFT JOIN strains s ON b.strain_id = s.id
  WHERE b.id = p_batch_id;

  IF v_batch_number IS NULL THEN
    RAISE EXCEPTION 'Batch not found: %', p_batch_id;
  END IF;

  -- Fallback: if strain_id is null or strain has no abbreviation,
  -- extract the strain code from the batch_number (e.g. '251022-CHP' -> 'CHP')
  IF v_strain_code IS NULL THEN
    v_strain_code := split_part(v_batch_number, '-', 2);
  END IF;

  IF v_strain_code IS NULL OR v_strain_code = '' THEN
    RAISE EXCEPTION 'Cannot determine strain code for batch: % (batch_number: %)', p_batch_id, v_batch_number;
  END IF;

  -- Generate date prefix (YYMMDD format)
  v_date_prefix := to_char(CURRENT_DATE, 'YYMMDD');

  -- Find max sequence from conversion_packages
  SELECT COALESCE(MAX(CAST(regexp_replace(package_id, '^[0-9]{6}-[A-Z]+-([0-9]+)$', '\1') AS integer)), 0) + 1
  INTO v_next_seq
  FROM conversion_packages
  WHERE package_id LIKE v_date_prefix || '-' || v_strain_code || '-%';

  -- Check inventory_items for higher sequence number
  SELECT GREATEST(v_next_seq, COALESCE(MAX(CAST(regexp_replace(package_id, '^[0-9]{6}-[A-Z]+-([0-9]+)$', '\1') AS integer)), 0) + 1)
  INTO v_next_seq
  FROM inventory_items
  WHERE package_id LIKE v_date_prefix || '-' || v_strain_code || '-%';

  -- Generate final package ID with zero-padded sequence
  v_package_id := v_date_prefix || '-' || v_strain_code || '-' || lpad(v_next_seq::text, 3, '0');

  RETURN v_package_id;
END;
$function$;

COMMENT ON FUNCTION generate_next_package_id(uuid) IS
  'Generates next sequential package ID (YYMMDD-STRAIN-NNN). Falls back to parsing batch_number for strain code when strain_id is null.';
