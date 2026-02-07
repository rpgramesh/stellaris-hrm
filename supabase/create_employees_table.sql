-- Create employees table if not exists
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    date_of_birth DATE,
    gender TEXT,
    nationality TEXT,
    national_id TEXT,
    address TEXT,
    department_id UUID REFERENCES departments(id),
    position_id UUID REFERENCES job_positions(id),
    employment_status TEXT,
    start_date DATE,
    probation_end_date DATE,
    salary NUMERIC,
    bank_name TEXT,
    bank_account_number TEXT,
    role TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add user_id column if it does not exist (for linking with auth.users)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'user_id') THEN
        ALTER TABLE employees ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS line_manager_id UUID REFERENCES employees(id);
CREATE INDEX IF NOT EXISTS idx_employees_line_manager_id ON employees(line_manager_id);
