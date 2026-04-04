-- CUL-370: session_pauses table + toggle_session_pause RPC
-- Note: is_paused + total_pause_minutes columns already existed on session tables from prior migration

CREATE TABLE IF NOT EXISTS session_pauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type text NOT NULL CHECK (session_type IN ('trim', 'bucking', 'packaging')),
  session_id uuid NOT NULL,
  paused_at timestamptz NOT NULL DEFAULT now(),
  resumed_at timestamptz NULL,
  pause_duration_minutes numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_pauses_session ON session_pauses (session_type, session_id);

ALTER TABLE session_pauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read session pauses"
  ON session_pauses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert session pauses"
  ON session_pauses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update session pauses"
  ON session_pauses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete session pauses"
  ON session_pauses FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION toggle_session_pause(
  p_session_type text,
  p_session_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_paused boolean;
  v_pause_id uuid;
  v_paused_at timestamptz;
  v_duration_minutes numeric;
  v_total_pause_minutes numeric;
BEGIN
  IF p_session_type NOT IN ('trim', 'bucking', 'packaging') THEN
    RAISE EXCEPTION 'Invalid session_type: %. Must be trim, bucking, or packaging.', p_session_type;
  END IF;

  CASE p_session_type
    WHEN 'trim' THEN
      SELECT is_paused, total_pause_minutes INTO v_is_paused, v_total_pause_minutes
      FROM trim_sessions WHERE id = p_session_id;
    WHEN 'bucking' THEN
      SELECT is_paused, total_pause_minutes INTO v_is_paused, v_total_pause_minutes
      FROM bucking_sessions WHERE id = p_session_id;
    WHEN 'packaging' THEN
      SELECT is_paused, total_pause_minutes INTO v_is_paused, v_total_pause_minutes
      FROM packaging_sessions WHERE id = p_session_id;
  END CASE;

  IF v_is_paused IS NULL THEN
    RAISE EXCEPTION 'Session % of type % not found', p_session_id, p_session_type;
  END IF;

  IF NOT v_is_paused THEN
    INSERT INTO session_pauses (session_type, session_id, paused_at)
    VALUES (p_session_type, p_session_id, now())
    RETURNING id, paused_at INTO v_pause_id, v_paused_at;

    CASE p_session_type
      WHEN 'trim' THEN
        UPDATE trim_sessions SET is_paused = true, updated_at = now() WHERE id = p_session_id;
      WHEN 'bucking' THEN
        UPDATE bucking_sessions SET is_paused = true, updated_at = now() WHERE id = p_session_id;
      WHEN 'packaging' THEN
        UPDATE packaging_sessions SET is_paused = true, updated_at = now() WHERE id = p_session_id;
    END CASE;

    RETURN jsonb_build_object(
      'action', 'paused', 'pause_id', v_pause_id,
      'paused_at', v_paused_at, 'session_type', p_session_type, 'session_id', p_session_id
    );
  ELSE
    SELECT id, paused_at INTO v_pause_id, v_paused_at
    FROM session_pauses
    WHERE session_type = p_session_type AND session_id = p_session_id AND resumed_at IS NULL
    ORDER BY paused_at DESC LIMIT 1;

    IF v_pause_id IS NULL THEN
      RAISE EXCEPTION 'No open pause record found for session % of type %', p_session_id, p_session_type;
    END IF;

    v_duration_minutes := EXTRACT(EPOCH FROM (now() - v_paused_at)) / 60.0;

    UPDATE session_pauses
    SET resumed_at = now(), pause_duration_minutes = v_duration_minutes
    WHERE id = v_pause_id;

    CASE p_session_type
      WHEN 'trim' THEN
        UPDATE trim_sessions
        SET is_paused = false, total_pause_minutes = COALESCE(total_pause_minutes, 0) + v_duration_minutes, updated_at = now()
        WHERE id = p_session_id RETURNING total_pause_minutes INTO v_total_pause_minutes;
      WHEN 'bucking' THEN
        UPDATE bucking_sessions
        SET is_paused = false, total_pause_minutes = COALESCE(total_pause_minutes, 0) + v_duration_minutes, updated_at = now()
        WHERE id = p_session_id RETURNING total_pause_minutes INTO v_total_pause_minutes;
      WHEN 'packaging' THEN
        UPDATE packaging_sessions
        SET is_paused = false, total_pause_minutes = COALESCE(total_pause_minutes, 0) + v_duration_minutes, updated_at = now()
        WHERE id = p_session_id RETURNING total_pause_minutes INTO v_total_pause_minutes;
    END CASE;

    RETURN jsonb_build_object(
      'action', 'resumed', 'pause_id', v_pause_id, 'paused_at', v_paused_at, 'resumed_at', now(),
      'pause_duration_minutes', round(v_duration_minutes::numeric, 2),
      'total_pause_minutes', round(v_total_pause_minutes::numeric, 2),
      'session_type', p_session_type, 'session_id', p_session_id
    );
  END IF;
END;
$$;
