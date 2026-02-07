-- Add missing columns to employees table for full profile support

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS branch TEXT,
ADD COLUMN IF NOT EXISTS salary_effective_date DATE,
ADD COLUMN IF NOT EXISTS next_review_date DATE,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'AUD',
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS pay_cycle TEXT,

-- Family Details
ADD COLUMN IF NOT EXISTS marital_status TEXT,
ADD COLUMN IF NOT EXISTS children_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS spouse_first_name TEXT,
ADD COLUMN IF NOT EXISTS spouse_last_name TEXT,
ADD COLUMN IF NOT EXISTS spouse_birth_date DATE,
ADD COLUMN IF NOT EXISTS spouse_middle_name TEXT,
ADD COLUMN IF NOT EXISTS spouse_working BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS spouse_nationality TEXT,
ADD COLUMN IF NOT EXISTS spouse_national_id TEXT,
ADD COLUMN IF NOT EXISTS spouse_passport TEXT,
ADD COLUMN IF NOT EXISTS spouse_ethnicity TEXT,
ADD COLUMN IF NOT EXISTS spouse_religion TEXT,

-- Extended Contact Info
ADD COLUMN IF NOT EXISTS blog_url TEXT,
ADD COLUMN IF NOT EXISTS office_phone TEXT,
ADD COLUMN IF NOT EXISTS mobile_phone TEXT,
ADD COLUMN IF NOT EXISTS home_phone TEXT,

-- Health & Privacy
ADD COLUMN IF NOT EXISTS health_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS system_access_role TEXT DEFAULT 'Employee',

-- Other missing fields
ADD COLUMN IF NOT EXISTS middle_name TEXT,
ADD COLUMN IF NOT EXISTS passport TEXT,
ADD COLUMN IF NOT EXISTS ethnicity TEXT,
ADD COLUMN IF NOT EXISTS religion TEXT,
ADD COLUMN IF NOT EXISTS remark TEXT;

-- Add indexes for commonly filtered fields if needed
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch);
