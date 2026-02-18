/*
  # Add created_by Column to batch_registry

  1. Modified Tables
    - `batch_registry`
      - Added `created_by` (uuid, nullable, references auth.users)

  2. Purpose
    - Tracks which user created each batch for compliance audit trail
    - Required by the upcoming cultivation harvest completion trigger
    - Aligns batch_registry with other auditable tables (orders, conversion_packages, inventory_movements)

  3. Backfill
    - Attempts to backfill from batch_production_history where event_type = 'batch_created'
    - The performed_by column in batch_production_history is text type, so we cast where possible

  4. Important Notes
    - Column is nullable to preserve existing rows that predate this migration
    - No destructive changes — additive only
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_registry' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE batch_registry ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

UPDATE batch_registry br
SET created_by = bph.performed_by::uuid
FROM batch_production_history bph
WHERE bph.batch_id = br.id
  AND bph.event_type = 'batch_created'
  AND bph.performed_by IS NOT NULL
  AND bph.performed_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND br.created_by IS NULL;