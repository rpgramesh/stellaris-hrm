-- Add additional core identity and compliance fields to employees

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS employee_code TEXT,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS tfn TEXT,
ADD COLUMN IF NOT EXISTS abn TEXT,
ADD COLUMN IF NOT EXISTS superannuation_fund_name TEXT,
ADD COLUMN IF NOT EXISTS superannuation_member_number TEXT,
ADD COLUMN IF NOT EXISTS medicare_number TEXT,
ADD COLUMN IF NOT EXISTS work_rights_status TEXT,
ADD COLUMN IF NOT EXISTS visa_type TEXT,
ADD COLUMN IF NOT EXISTS visa_expiry_date DATE,
ADD COLUMN IF NOT EXISTS police_clearance_status TEXT,
ADD COLUMN IF NOT EXISTS wwcc_number TEXT,
ADD COLUMN IF NOT EXISTS drivers_license_number TEXT,
ADD COLUMN IF NOT EXISTS drivers_license_expiry DATE;

-- Employee experience table

CREATE TABLE IF NOT EXISTS employee_experience (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  reason_for_leaving TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_experience_employee_id
  ON employee_experience(employee_id);

ALTER TABLE employee_experience ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable access for authenticated users" ON employee_experience;
CREATE POLICY "Enable access for authenticated users" ON employee_experience
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

