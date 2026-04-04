-- CUL-311: Dry-phase reweigh workflow schema additions
-- binning_sessions already has dry_weight_grams + water_loss_grams.
-- Adding:
--   dried_at          — timestamp the dry reweigh was recorded
--   wet_to_dry_loss_pct — GENERATED ALWAYS as (water_loss / wet_weight * 100)
-- Also creates v_dry_phase_summary for per-batch drying metrics.

-- 1. Add dried_at timestamp
ALTER TABLE binning_sessions
  ADD COLUMN IF NOT EXISTS dried_at timestamptz;

-- Backfill dried_at from completed_at for existing completed sessions
UPDATE binning_sessions
SET dried_at = completed_at
WHERE dried_at IS NULL
  AND completed_at IS NOT NULL
  AND session_status = 'completed';

-- 2. Add wet_to_dry_loss_pct as a stored generated column
-- Formula: water_loss / (dry_weight + water_loss) * 100 = water_loss / wet_weight * 100
ALTER TABLE binning_sessions
  ADD COLUMN IF NOT EXISTS wet_to_dry_loss_pct numeric
    GENERATED ALWAYS AS (
      CASE
        WHEN (dry_weight_grams + water_loss_grams) > 0
        THEN ROUND(water_loss_grams / (dry_weight_grams + water_loss_grams) * 100, 2)
      END
    ) STORED;

-- 3. Dry phase summary view — per batch, aggregated across all binning sessions
CREATE OR REPLACE VIEW v_dry_phase_summary AS
SELECT
  bs.batch_registry_id,
  br.batch_number,
  s.name                                              AS strain_name,
  COUNT(bs.id)                                        AS session_count,
  SUM(hs.wet_weight_grams)                            AS total_wet_weight_g,
  SUM(bs.dry_weight_grams)                            AS total_dry_weight_g,
  SUM(bs.water_loss_grams)                            AS total_water_loss_g,
  ROUND(
    SUM(bs.water_loss_grams) /
    NULLIF(SUM(bs.dry_weight_grams + bs.water_loss_grams), 0) * 100
  , 2)                                                AS batch_wet_to_dry_loss_pct,
  MIN(bs.bin_date)                                    AS first_bin_date,
  MAX(bs.dried_at)                                    AS last_dried_at,
  COUNT(bs.id) FILTER (WHERE bs.dried_at IS NOT NULL) AS weighed_session_count
FROM binning_sessions bs
JOIN batch_registry br ON br.id = bs.batch_registry_id
LEFT JOIN harvest_sessions hs ON hs.id = bs.harvest_session_id
LEFT JOIN plant_groups pg ON pg.id = hs.plant_group_id
LEFT JOIN strains s ON s.id = pg.strain_id
WHERE bs.session_status IN ('completed', 'finalized')
GROUP BY bs.batch_registry_id, br.batch_number, s.name
ORDER BY MAX(bs.bin_date) DESC;

GRANT SELECT ON v_dry_phase_summary TO authenticated;
