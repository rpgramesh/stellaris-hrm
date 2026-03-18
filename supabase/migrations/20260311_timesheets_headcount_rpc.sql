CREATE OR REPLACE FUNCTION timesheets_count_distinct_employees(
  p_status TEXT DEFAULT NULL,
  p_employee_ids UUID[] DEFAULT NULL,
  p_week_start_from DATE DEFAULT NULL,
  p_week_start_to DATE DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT t.employee_id)
    INTO v_count
    FROM timesheets t
   WHERE (p_status IS NULL OR t.status = p_status)
     AND (p_employee_ids IS NULL OR t.employee_id = ANY(p_employee_ids))
     AND (p_week_start_from IS NULL OR t.week_start_date >= p_week_start_from)
     AND (p_week_start_to IS NULL OR t.week_start_date <= p_week_start_to);

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

