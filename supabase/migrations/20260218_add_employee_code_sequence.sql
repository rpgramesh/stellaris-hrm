-- Ensure sequential employee codes for all employees

DO $$
DECLARE
  max_num INTEGER;
BEGIN
  -- Find the highest numeric part of any existing employee_code, if present
  SELECT COALESCE(MAX(CAST(regexp_replace(employee_code, '\D', '', 'g') AS INTEGER)), 0)
  INTO max_num
  FROM employees
  WHERE employee_code IS NOT NULL
    AND employee_code <> ''
    AND employee_code ~ '\d';

  -- Create the sequence if it does not exist, starting after the current max
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE relkind = 'S'
      AND relname = 'employee_code_seq'
  ) THEN
    EXECUTE format('CREATE SEQUENCE employee_code_seq START WITH %s INCREMENT BY 1;', max_num + 1);
  ELSE
    -- Align existing sequence with current max so new values do not collide
    PERFORM setval('employee_code_seq', max_num);
  END IF;

  -- Backfill missing employee_code values
  UPDATE employees
  SET employee_code = 'EMP' || LPAD(nextval('employee_code_seq')::text, 4, '0')
  WHERE employee_code IS NULL
     OR employee_code = '';
END $$;

-- Set default so future inserts get an automatic employee_code when omitted
ALTER TABLE employees
ALTER COLUMN employee_code SET DEFAULT 'EMP' || LPAD(nextval('employee_code_seq')::text, 4, '0');

-- Enforce uniqueness of employee_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_employee_code_unique
  ON employees(employee_code);

