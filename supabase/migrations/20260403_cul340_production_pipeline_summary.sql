-- CUL-340: Production Pipeline Summary RPC
-- Maps inventory_items.category to canonical pipeline stages.
-- Returns one row per stage ordered binned → bucked → bulk → packaged.

CREATE OR REPLACE FUNCTION get_production_pipeline_summary()
RETURNS TABLE (
  stage          text,
  item_count     bigint,
  total_qty_g    numeric,
  batch_count    bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH categorized AS (
    SELECT
      CASE ii.category
        WHEN 'flower_binned'   THEN 'binned'
        WHEN 'flower_bucked'   THEN 'bucked'
        WHEN 'smalls_bucked'   THEN 'bucked'
        WHEN 'flower_bulk'     THEN 'bulk'
        WHEN 'trim_bulk'       THEN 'bulk'
        WHEN 'smalls_bulk'     THEN 'bulk'
        WHEN 'flower_packaged' THEN 'packaged'
        ELSE NULL
      END AS stage,
      ii.on_hand_qty,
      ii.batch_id
    FROM inventory_items ii
    WHERE ii.status NOT IN ('consumed', 'archived')
      AND ii.category IN (
        'flower_binned','flower_bucked','smalls_bucked',
        'flower_bulk','trim_bulk','smalls_bulk','flower_packaged'
      )
  )
  SELECT
    c.stage,
    COUNT(*)                        AS item_count,
    COALESCE(SUM(c.on_hand_qty), 0) AS total_qty_g,
    COUNT(DISTINCT c.batch_id)      AS batch_count
  FROM categorized c
  GROUP BY c.stage
  ORDER BY
    CASE c.stage
      WHEN 'binned'   THEN 1
      WHEN 'bucked'   THEN 2
      WHEN 'bulk'     THEN 3
      WHEN 'packaged' THEN 4
      ELSE 5
    END;
$$;

GRANT EXECUTE ON FUNCTION get_production_pipeline_summary() TO authenticated;
