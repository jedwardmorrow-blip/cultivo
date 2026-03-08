/*
  # Create Harvest Metrics Aggregation View

  1. New Views
    - `v_harvest_metrics` — Joins harvest sessions with binning sessions,
      plant groups, strains, grow rooms, dry rooms, and batch registry
      to produce a single denormalized row per completed harvest with:
      - Strain name and abbreviation
      - Grow room code and dry room code
      - Batch number
      - Wet weight (original and adjusted), waste, plant count
      - Dry weight from binning session (if completed)
      - Yield percentage (dry/wet ratio)
      - Average yield per plant (wet and dry)
      - Days in dry (harvest date to binning completion)
      - Harvest date and completion timestamps

  2. Security
    - View inherits RLS from underlying tables
    - Only authenticated users with existing table access can query
*/

CREATE OR REPLACE VIEW v_harvest_metrics AS
SELECT
  hs.id AS harvest_session_id,
  hs.harvest_date,
  hs.session_status AS harvest_status,
  hs.wet_weight_grams,
  COALESCE(hs.adjusted_weight_grams, hs.wet_weight_grams) AS effective_wet_weight_grams,
  hs.waste_grams,
  hs.plant_count_harvested,
  hs.completed_at AS harvest_completed_at,
  hs.notes AS harvest_notes,

  s.id AS strain_id,
  s.name AS strain_name,
  s.abbreviation AS strain_abbreviation,

  gr.id AS grow_room_id,
  gr.room_code AS grow_room_code,
  gr.room_type AS grow_room_type,
  gr.capacity_plants AS grow_room_capacity,

  dr.id AS dry_room_id,
  dr.room_code AS dry_room_code,

  br.id AS batch_registry_id,
  br.batch_number,

  bs.id AS binning_session_id,
  bs.dry_weight_grams,
  bs.water_loss_grams,
  bs.bin_date,
  bs.session_status AS binning_status,
  bs.completed_at AS binning_completed_at,

  CASE
    WHEN bs.dry_weight_grams IS NOT NULL
      AND bs.dry_weight_grams > 0
      AND COALESCE(hs.adjusted_weight_grams, hs.wet_weight_grams) > 0
    THEN ROUND(
      (bs.dry_weight_grams / COALESCE(hs.adjusted_weight_grams, hs.wet_weight_grams)) * 100,
      1
    )
    ELSE NULL
  END AS yield_percentage,

  CASE
    WHEN hs.plant_count_harvested > 0
    THEN ROUND(
      COALESCE(hs.adjusted_weight_grams, hs.wet_weight_grams) / hs.plant_count_harvested,
      1
    )
    ELSE NULL
  END AS avg_wet_per_plant,

  CASE
    WHEN bs.dry_weight_grams IS NOT NULL AND hs.plant_count_harvested > 0
    THEN ROUND(bs.dry_weight_grams / hs.plant_count_harvested, 1)
    ELSE NULL
  END AS avg_dry_per_plant,

  CASE
    WHEN bs.completed_at IS NOT NULL AND hs.harvest_date IS NOT NULL
    THEN EXTRACT(DAY FROM (bs.completed_at - hs.harvest_date::timestamptz))::integer
    ELSE NULL
  END AS days_in_dry

FROM harvest_sessions hs
LEFT JOIN plant_groups pg ON pg.id = hs.plant_group_id
LEFT JOIN strains s ON s.id = pg.strain_id
LEFT JOIN grow_rooms gr ON gr.id = hs.grow_room_id
LEFT JOIN dry_rooms dr ON dr.id = hs.dry_room_id
LEFT JOIN batch_registry br ON br.id = hs.batch_registry_id
LEFT JOIN binning_sessions bs ON bs.harvest_session_id = hs.id
WHERE hs.session_status IN ('active', 'completed');
