-- Ensure timesheets changes are streamed via Supabase Realtime (CDC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE timesheets';
    EXCEPTION WHEN others THEN
      -- ignore if already added
      NULL;
    END;
  END IF;
END $$;

-- Transactional update with locking and audit
CREATE OR REPLACE FUNCTION timesheets_update_submission(
  p_id UUID,
  p_status TEXT,
  p_hours NUMERIC,
  p_prev_updated_at TIMESTAMPTZ,
  p_user UUID
) RETURNS timesheets AS $$
DECLARE
  v_old timesheets;
  v_new timesheets;
BEGIN
  SELECT * INTO v_old FROM timesheets WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Timesheet % not found', p_id USING ERRCODE = 'NO_DATA_FOUND';
  END IF;

  IF v_old.updated_at IS DISTINCT FROM p_prev_updated_at THEN
    RAISE EXCEPTION 'Concurrent update detected for %', p_id USING ERRCODE = '40001';
  END IF;

  UPDATE timesheets
     SET status = COALESCE(p_status, status),
         total_hours = COALESCE(p_hours, total_hours),
         updated_at = NOW()
   WHERE id = p_id
   RETURNING * INTO v_new;

  INSERT INTO audit_logs (user_id, action, resource, resource_id, details)
  VALUES (p_user, 'UPDATE', 'timesheets', p_id::TEXT, jsonb_build_object('old_data', v_old, 'new_data', v_new));

  RETURN v_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

