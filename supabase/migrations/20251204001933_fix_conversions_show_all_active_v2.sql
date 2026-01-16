/*
  # Fix Conversion Lots Display - Show All Active Conversions

  ## Changes
  - Modified `get_conversion_lot_summary` function to show all active conversions when no date is provided
  - When p_date is NULL or empty, shows all active/completed_today conversions
  - When p_date is provided, filters by that specific date (preserves existing behavior)

  ## Rationale
  Active conversions need to be processed regardless of when they were created.
  The previous date-based filtering was hiding pending conversions from previous days.
*/

DROP FUNCTION IF EXISTS get_conversion_lot_summary(DATE);

CREATE FUNCTION get_conversion_lot_summary(p_date DATE DEFAULT NULL)
RETURNS TABLE (
  lot_id UUID,
  batch_id UUID,
  batch_name TEXT,
  strain_name TEXT,
  strain_code TEXT,
  product_id UUID,
  product_name TEXT,
  product_type TEXT,
  total_weight NUMERIC,
  total_units INTEGER,
  remaining_weight NUMERIC,
  remaining_units INTEGER,
  contributing_session_count INTEGER,
  status TEXT,
  is_locked BOOLEAN,
  locked_by_user UUID,
  locked_by_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cl.id as lot_id,
    cl.batch_id,
    b.batch_number as batch_name,
    s.name as strain_name,
    s.abbreviation as strain_code,
    cl.product_id,
    p.name as product_name,
    p.type as product_type,
    cl.total_weight,
    cl.total_units,
    cl.remaining_weight,
    cl.remaining_units,
    cl.contributing_session_count,
    cl.status,
    (CASE WHEN clk.id IS NOT NULL AND clk.expires_at > now() THEN true ELSE false END) as is_locked,
    clk.locked_by as locked_by_user,
    up.full_name as locked_by_name
  FROM conversion_lots cl
  JOIN batch_registry b ON cl.batch_id = b.id
  JOIN strains s ON b.strain_id = s.id
  JOIN products p ON cl.product_id = p.id
  LEFT JOIN conversion_locks clk ON cl.id = clk.conversion_lot_id
  LEFT JOIN user_profiles up ON clk.locked_by = up.id
  WHERE cl.status IN ('active', 'completed_today')
    AND (p_date IS NULL OR cl.lot_date = p_date)
  ORDER BY cl.status ASC, cl.lot_date DESC, s.name ASC, p.name ASC;
END;
$$;
