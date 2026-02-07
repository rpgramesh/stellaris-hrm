-- Add line_manager_id column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS line_manager_id UUID REFERENCES employees(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_employees_line_manager_id ON employees(line_manager_id);
