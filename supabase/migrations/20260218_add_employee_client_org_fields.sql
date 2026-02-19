ALTER TABLE employees
ADD COLUMN IF NOT EXISTS client_line_manager TEXT,
ADD COLUMN IF NOT EXISTS client_department TEXT,
ADD COLUMN IF NOT EXISTS client_branch TEXT;

