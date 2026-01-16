/*
  # Backfill Product Names for Existing Sessions

  ## Purpose
  Populate the newly added product_name columns for all existing pending sessions.
  This ensures the simplified VIEW will work correctly for existing data.

  ## Safety
  - Only updates sessions with status = 'completed' AND finalization_status = 'pending'
  - These are sessions visible in the conversions UI that need product names
  - Finalized sessions don't need backfill (already processed)
  - Uses hardcoded names matching current system behavior

  ## Product Names Used
  - Bucking: "Bulk Flower (Bucked)" and "Bulk Smalls (Bucked)"
  - Trim: "Bulk Flower (Trimmed)" and "Bulk Smalls (Trimmed)"
  - Packaging: "Packaged Products" (generic, will be enhanced later if needed)
*/

-- Backfill bucking sessions
UPDATE bucking_sessions
SET 
  output_product_flower_name = CASE 
    WHEN COALESCE(bucked_flower_grams, 0) > 0 THEN 'Bulk Flower (Bucked)'
    ELSE NULL
  END,
  output_product_smalls_name = CASE
    WHEN COALESCE(bucked_smalls_grams, 0) > 0 THEN 'Bulk Smalls (Bucked)'
    ELSE NULL
  END
WHERE session_status = 'completed'
  AND finalization_status = 'pending'
  AND (output_product_flower_name IS NULL OR output_product_smalls_name IS NULL);

-- Backfill trim sessions
UPDATE trim_sessions
SET
  output_product_bigs_name = CASE
    WHEN COALESCE(big_buds_grams, 0) > 0 THEN 'Bulk Flower (Trimmed)'
    ELSE NULL
  END,
  output_product_smalls_name = CASE
    WHEN COALESCE(small_buds_grams, 0) > 0 THEN 'Bulk Smalls (Trimmed)'
    ELSE NULL
  END
WHERE session_status = 'completed'
  AND finalization_status = 'pending'
  AND (output_product_bigs_name IS NULL OR output_product_smalls_name IS NULL);

-- Backfill packaging sessions
UPDATE packaging_sessions
SET output_product_name = 'Packaged Products'
WHERE session_status = 'completed'
  AND finalization_status = 'pending'
  AND output_product_name IS NULL;
