-- FIX RBAC & RLS RECURSION (MANUAL FIX)
-- Run this entire script in your Supabase SQL Editor to ensure RBAC tables exist and RLS is safe.

-- 1. Create Tables (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions TEXT[] DEFAULT '{}',
    level INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_role_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    assigned_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    module VARCHAR(100) NOT NULL,
    approval_levels JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    current_level INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    requested_amount DECIMAL(12,2),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approvals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    comments TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Security Definer Function (THE FIX)
CREATE OR REPLACE FUNCTION public.has_role(
  _user_id UUID,
  _role_name TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = _user_id 
    AND ur.name = _role_name
    AND ura.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Apply Correct Policies (Replacing Recursive Ones)

-- user_roles
DROP POLICY IF EXISTS "Users can view active roles" ON user_roles;
CREATE POLICY "Users can view active roles" ON user_roles FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Administrators can manage roles" ON user_roles;
CREATE POLICY "Administrators can manage roles" ON user_roles FOR ALL USING (has_role(auth.uid(), 'Administrator'));

-- user_role_assignments
DROP POLICY IF EXISTS "Users can view their own role assignments" ON user_role_assignments;
CREATE POLICY "Users can view their own role assignments" ON user_role_assignments FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Administrators can manage role assignments" ON user_role_assignments;
CREATE POLICY "Administrators can manage role assignments" ON user_role_assignments FOR ALL USING (has_role(auth.uid(), 'Administrator'));

-- audit_logs
DROP POLICY IF EXISTS "Users can view audit logs for their actions" ON audit_logs;
CREATE POLICY "Users can view audit logs for their actions" ON audit_logs FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "HR Managers can view all audit logs" ON audit_logs;
CREATE POLICY "HR Managers can view all audit logs" ON audit_logs FOR SELECT USING (has_role(auth.uid(), 'HR Manager') OR has_role(auth.uid(), 'Administrator'));

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON audit_logs;
CREATE POLICY "Enable insert access for authenticated users" ON audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5. Seed Data (Safe Insert)
INSERT INTO user_roles (name, description, permissions, level, is_active) VALUES
('Employee', 'Basic employee access', '{"self_service.view", "payslips.view", "profile.view"}', 1, true),
('Manager', 'Manager level access', '{"employee.view", "leave.approve", "timesheet.approve", "expense.approve"}', 2, true),
('HR Admin', 'HR administrative access', '{"employee.manage", "leave.manage", "payroll.view", "reports.view"}', 3, true),
('HR Manager', 'HR management access', '{"employee.manage", "payroll.manage", "compliance.manage", "settings.manage"}', 4, true),
('Payroll Admin', 'Payroll administrative access', '{"payroll.manage", "salary_adjustments.manage", "superannuation.manage", "stp.manage"}', 3, true),
('Payroll Manager', 'Payroll management access', '{"payroll.manage", "payroll_settings.manage", "compliance.manage", "reports.manage"}', 4, true),
('Administrator', 'Full system access', '{"*"}', 5, true)
ON CONFLICT (name) DO NOTHING;
