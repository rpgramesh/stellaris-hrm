-- Fix RLS Infinite Recursion using Security Definer function

-- 1. Create a secure function to check roles without triggering RLS loops
CREATE OR REPLACE FUNCTION public.has_role(
  _user_id UUID,
  _role_name TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- This function runs with the privileges of the creator (SECURITY DEFINER)
  -- effectively bypassing RLS on user_role_assignments
  RETURN EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = _user_id 
    AND ur.name = _role_name
    AND ura.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix user_role_assignments policies
DROP POLICY IF EXISTS "Administrators can manage role assignments" ON user_role_assignments;
CREATE POLICY "Administrators can manage role assignments" ON user_role_assignments
    FOR ALL
    USING (has_role(auth.uid(), 'Administrator'));

-- 3. Fix approval_workflows policies
DROP POLICY IF EXISTS "HR Managers can manage workflows" ON approval_workflows;
CREATE POLICY "HR Managers can manage workflows" ON approval_workflows
    FOR ALL
    USING (has_role(auth.uid(), 'HR Manager') OR has_role(auth.uid(), 'Administrator'));

-- 4. Fix approval_requests policies
DROP POLICY IF EXISTS "HR Managers can view all requests" ON approval_requests;
CREATE POLICY "HR Managers can view all requests" ON approval_requests
    FOR SELECT
    USING (has_role(auth.uid(), 'HR Manager') OR has_role(auth.uid(), 'Administrator'));

-- 5. Fix audit_logs policies
DROP POLICY IF EXISTS "HR Managers can view all audit logs" ON audit_logs;
CREATE POLICY "HR Managers can view all audit logs" ON audit_logs
    FOR SELECT
    USING (has_role(auth.uid(), 'HR Manager') OR has_role(auth.uid(), 'Administrator'));

-- Ensure INSERT policy exists for audit_logs (Schema 1 compatibility)
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON audit_logs;
CREATE POLICY "Enable insert access for authenticated users" ON audit_logs 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');
