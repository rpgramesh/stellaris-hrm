-- Create helper function to check admin status
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees 
    WHERE (user_id = auth.uid() OR email = (auth.jwt() ->> 'email')) 
    AND role = 'Administrator'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_entitlements ENABLE ROW LEVEL SECURITY;

-- Employees Policies
CREATE POLICY "Users can view own profile" 
ON employees FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (email = (auth.jwt() ->> 'email')) OR
  is_admin()
);

CREATE POLICY "Users can update own profile" 
ON employees FOR UPDATE 
USING (
  (auth.uid() = user_id) OR 
  (email = (auth.jwt() ->> 'email')) OR
  is_admin()
);

CREATE POLICY "Admins can insert employees"
ON employees FOR INSERT
WITH CHECK (is_admin());

-- Leave Requests Policies
CREATE POLICY "Users can view own leave requests" 
ON leave_requests FOR SELECT 
USING (
  employee_id IN (
    SELECT id FROM employees 
    WHERE (user_id = auth.uid() OR email = (auth.jwt() ->> 'email'))
  ) OR
  is_admin()
);

CREATE POLICY "Users can insert own leave requests" 
ON leave_requests FOR INSERT 
WITH CHECK (
  employee_id IN (
    SELECT id FROM employees 
    WHERE (user_id = auth.uid() OR email = (auth.jwt() ->> 'email'))
  )
);

CREATE POLICY "Admins can update leave requests"
ON leave_requests FOR UPDATE
USING (is_admin());

-- Leave Entitlements Policies
CREATE POLICY "Users can view own entitlements" 
ON leave_entitlements FOR SELECT 
USING (
  employee_id IN (
    SELECT id FROM employees 
    WHERE (user_id = auth.uid() OR email = (auth.jwt() ->> 'email'))
  ) OR
  is_admin()
);

CREATE POLICY "Admins can manage entitlements"
ON leave_entitlements FOR ALL
USING (is_admin());
