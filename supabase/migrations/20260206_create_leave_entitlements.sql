-- Create leave_entitlements table if it doesn't exist
-- This table seems to be missing from previous migrations but is referenced in RLS policies

CREATE TABLE IF NOT EXISTS leave_entitlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    leave_type TEXT NOT NULL,
    total_days NUMERIC(10, 2) DEFAULT 0,
    carried_over NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (if not already enabled)
ALTER TABLE leave_entitlements ENABLE ROW LEVEL SECURITY;

-- Re-apply policies (safe to do with IF NOT EXISTS logic or DROP/CREATE)
-- We'll use the same policies as in 20240204_enable_rls_core_tables.sql

DROP POLICY IF EXISTS "Users can view own entitlements" ON leave_entitlements;
CREATE POLICY "Users can view own entitlements" 
ON leave_entitlements FOR SELECT 
USING (
  employee_id IN (
    SELECT id FROM employees 
    WHERE (user_id = auth.uid() OR email = (auth.jwt() ->> 'email'))
  ) OR
  EXISTS (
    SELECT 1 FROM employees 
    WHERE (user_id = auth.uid() OR email = (auth.jwt() ->> 'email')) 
    AND role = 'Administrator'
  )
);

DROP POLICY IF EXISTS "Admins can manage entitlements" ON leave_entitlements;
CREATE POLICY "Admins can manage entitlements"
ON leave_entitlements FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE (user_id = auth.uid() OR email = (auth.jwt() ->> 'email')) 
    AND role = 'Administrator'
  )
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_leave_entitlements_updated_at ON leave_entitlements;
CREATE TRIGGER update_leave_entitlements_updated_at 
BEFORE UPDATE ON leave_entitlements 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
