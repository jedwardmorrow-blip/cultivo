/*
  # fn_start_audit — RPC with pending-conversion guard

  ## Problem
  When conversion sessions (trim/bucking/packaging) are completed but not yet
  finalized, their output weight hasn't been committed to inventory. Starting an
  audit in this state means the snapshot will be stale the moment those sessions
  are finalized, producing phantom variances.

  ## Solution
  Replace the direct INSERT from the frontend with an RPC that:
  1. Checks `pending_conversion_sessions` for ANY pending rows (global guard).
  2. If pending conversions exist, raises an exception listing batch names and
     counts so the user knows exactly what to resolve.
  3. If clear, creates the audit row and returns it.

  ## Changes
  - New function: fn_start_audit(p_selected_stages, p_room_scope, p_notes)
  - SECURITY DEFINER so it can read pending_conversion_sessions regardless of
    caller's RLS context.
  - GRANTed to `authenticated`.
*/

CREATE OR REPLACE FUNCTION fn_start_audit(
  p_selected_stages text[],
  p_room_scope      text[]  DEFAULT NULL,
  p_notes           text    DEFAULT NULL
)
RETURNS inventory_audits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_count  integer;
  v_pending_detail text;
  v_audit_number   text;
  v_audit_row      inventory_audits;
BEGIN
  -- -------------------------------------------------------
  -- 1. Guard: block if any pending conversion sessions exist
  -- -------------------------------------------------------
  SELECT
    count(*),
    string_agg(
      batch_name || ': ' || cnt::text,
      ', ' ORDER BY batch_name
    )
  INTO v_pending_count, v_pending_detail
  FROM (
    SELECT
      batch_name,
      count(*) AS cnt
    FROM pending_conversion_sessions
    GROUP BY batch_name
  ) sub;

  IF v_pending_count > 0 THEN
    RAISE EXCEPTION
      'Cannot start audit: % pending conversion(s) exist (%). Finalize or void all pending conversions before starting an audit.',
      (SELECT sum(cnt) FROM (
        SELECT count(*) AS cnt
        FROM pending_conversion_sessions
        GROUP BY batch_name
      ) s),
      v_pending_detail;
  END IF;

  -- -------------------------------------------------------
  -- 2. Generate audit number
  -- -------------------------------------------------------
  v_audit_number := fn_generate_audit_number();

  -- -------------------------------------------------------
  -- 3. Insert the audit row
  -- -------------------------------------------------------
  INSERT INTO inventory_audits (
    audit_number,
    status,
    selected_stages,
    room_scope,
    notes,
    initiated_by,
    initiated_at
  )
  VALUES (
    v_audit_number,
    'in_progress'::audit_status,
    p_selected_stages,
    p_room_scope,
    p_notes,
    auth.uid(),
    now()
  )
  RETURNING * INTO v_audit_row;

  RETURN v_audit_row;
END;
$$;

-- Grant execute to authenticated users (RLS on the table still applies for
-- reads; the SECURITY DEFINER only elevates the INSERT).
GRANT EXECUTE ON FUNCTION fn_start_audit(text[], text[], text) TO authenticated;

COMMENT ON FUNCTION fn_start_audit(text[], text[], text) IS
  'Creates an inventory audit after verifying no pending conversion sessions exist. '
  'Raises an exception listing batch names if any conversions are unfinalized.';
