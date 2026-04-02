-- CUL-156: cost_per_gram RPC and v_batch_margins view for Operations HUB
-- Primary consumer: Scott Tucker (COO/CFO) via BatchMarginTable component
--
-- Cost estimate methodology (no dedicated cost column exists on batch_registry):
--   estimated_cost_usd = wet_weight_g * strains.forecast_price_per_gram * 0.25
--   (25% of revenue proxy — cost-of-goods estimate pending real COGS tracking)
-- TODO: replace with actual cost column once COGS tracking is implemented.


-- ────────────────────────────────────────────────────────────────────────────
-- RPC: get_cost_per_gram_summary()
-- Returns one row per batch with wet weight, dry weight, cost estimate,
-- cost-per-gram, harvest date, and room name.
-- Dry weight = sum of bucked flower + smalls from finalized bucking sessions.
-- Wet weight = sum of harvest_sessions.wet_weight_grams for the batch.
-- Room name  = grow_room from the batch's harvest session (fallback: batch_registry.room).
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_cost_per_gram_summary()
RETURNS TABLE (
  batch_id            TEXT,
  strain_name         TEXT,
  total_wet_weight_g  NUMERIC,
  total_dry_weight_g  NUMERIC,
  estimated_cost_usd  NUMERIC,
  cost_per_gram_usd   NUMERIC,
  harvest_date        DATE,
  room_name           TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH wet AS (
    -- Aggregate wet weight from all harvest sessions for each batch
    SELECT
      hs.batch_registry_id,
      SUM(COALESCE(hs.wet_weight_grams, 0))  AS wet_weight_g,
      -- Use first non-null grow_room_id (batches typically harvested from one room)
      (ARRAY_AGG(hs.grow_room_id ORDER BY hs.created_at) FILTER (WHERE hs.grow_room_id IS NOT NULL))[1] AS grow_room_id
    FROM harvest_sessions hs
    WHERE hs.session_status != 'cancelled'
    GROUP BY hs.batch_registry_id
  ),
  dry AS (
    -- Aggregate dry (bucked) weight from finalized bucking sessions for each batch
    SELECT
      bs.batch_registry_id,
      SUM(
        COALESCE(bs.bucked_flower_grams, 0) +
        COALESCE(bs.bucked_smalls_grams, 0)
      ) AS dry_weight_g
    FROM bucking_sessions bs
    WHERE bs.cancelled_at IS NULL
    GROUP BY bs.batch_registry_id
  )
  SELECT
    br.batch_number                                                             AS batch_id,
    COALESCE(s.display_name, br.strain)                                        AS strain_name,
    COALESCE(w.wet_weight_g, br.initial_weight_grams, 0)                       AS total_wet_weight_g,
    COALESCE(d.dry_weight_g, 0)                                                AS total_dry_weight_g,
    -- Cost estimate: wet_weight * forecast_price_per_gram * 0.25
    -- (revenue-proxy COGS: ~25% of wholesale revenue as production cost)
    ROUND(
      COALESCE(w.wet_weight_g, br.initial_weight_grams, 0)
        * COALESCE(s.forecast_price_per_gram, 0)
        * 0.25,
      2
    )                                                                           AS estimated_cost_usd,
    -- cost_per_gram = estimated_cost / dry_weight (NULL when no dry weight recorded)
    CASE
      WHEN COALESCE(d.dry_weight_g, 0) > 0 THEN
        ROUND(
          (COALESCE(w.wet_weight_g, br.initial_weight_grams, 0)
            * COALESCE(s.forecast_price_per_gram, 0)
            * 0.25)
          / d.dry_weight_g,
          4
        )
      ELSE NULL
    END                                                                         AS cost_per_gram_usd,
    br.harvest_date,
    COALESCE(gr.name, br.room)                                                  AS room_name
  FROM batch_registry br
  LEFT JOIN strains        s   ON s.id  = br.strain_id
  LEFT JOIN wet            w   ON w.batch_registry_id = br.id
  LEFT JOIN dry            d   ON d.batch_registry_id = br.id
  LEFT JOIN grow_rooms     gr  ON gr.id = w.grow_room_id
  WHERE br.archived_at IS NULL
  ORDER BY br.harvest_date DESC NULLS LAST, br.batch_number;
$$;

-- Grant execute to authenticated users (same pattern used across other RPCs in this project)
GRANT EXECUTE ON FUNCTION get_cost_per_gram_summary() TO authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- VIEW: v_batch_margins
-- Month-by-month batch margin estimates for BatchMarginTable component.
-- revenue_estimate = dry_weight * forecast_price_per_gram
-- cost_estimate    = wet_weight * forecast_price_per_gram * 0.25
-- margin_pct       = (revenue - cost) / revenue * 100
-- ────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS v_batch_margins;

CREATE VIEW v_batch_margins AS
SELECT
  cpg.batch_id,
  cpg.strain_name,
  DATE_TRUNC('month', cpg.harvest_date)::DATE            AS harvest_month,
  -- Revenue estimate: what the dry weight would sell for at forecast price
  ROUND(cpg.total_dry_weight_g * COALESCE(s.forecast_price_per_gram, 0), 2)
                                                          AS revenue_estimate,
  cpg.estimated_cost_usd                                  AS cost_estimate,
  -- Margin % = (revenue - cost) / revenue * 100, NULL if no revenue
  CASE
    WHEN ROUND(cpg.total_dry_weight_g * COALESCE(s.forecast_price_per_gram, 0), 2) > 0 THEN
      ROUND(
        (
          ROUND(cpg.total_dry_weight_g * COALESCE(s.forecast_price_per_gram, 0), 2)
          - cpg.estimated_cost_usd
        )
        / ROUND(cpg.total_dry_weight_g * COALESCE(s.forecast_price_per_gram, 0), 2)
        * 100,
        2
      )
    ELSE NULL
  END                                                     AS margin_pct
FROM get_cost_per_gram_summary() cpg
LEFT JOIN batch_registry br ON br.batch_number = cpg.batch_id
LEFT JOIN strains         s  ON s.id = br.strain_id
WHERE cpg.harvest_date IS NOT NULL;

-- Grant select to authenticated users
GRANT SELECT ON v_batch_margins TO authenticated;
