-- ============================================================================
-- Migration: Fix generate_next_package_id to check audit orphan lines
-- Date: 2026-04-17
--
-- BUG: generate_next_package_id only checked conversion_packages and
--      inventory_items for existing sequence numbers. Orphan totes added
--      during an audit are written to inventory_audit_lines first and don't
--      land in inventory_items until the audit is applied. This meant every
--      orphan of the same strain on the same day got the SAME package ID,
--      causing duplicate package IDs in the system.
--
-- FIX: Add a third check against inventory_audit_lines where is_orphan=true
--      so the sequence increments even for not-yet-ingested orphans.
-- ============================================================================

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

  -- Check inventory_audit_lines for orphan package IDs that have been
  -- generated during an audit but not yet ingested into inventory_items
  SELECT GREATEST(v_next_seq, COALESCE(MAX(CAST(regexp_replace(package_id, '^[0-9]{6}-[A-Z]+-([0-9]+)$', '\1') AS integer)), 0) + 1)
  INTO v_next_seq
  FROM inventory_audit_lines
  WHERE package_id LIKE v_date_prefix || '-' || v_strain_code || '-%'
    AND is_orphan = true;

  -- Generate final package ID with zero-padded sequence
  v_package_id := v_date_prefix || '-' || v_strain_code || '-' || lpad(v_next_seq::text, 3, '0');

  RETURN v_package_id;
END;
$function$;
