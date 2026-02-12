-- Role-Based Access Control (RBAC) Schema

-- User Roles Table
CREATE TABLE user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions TEXT[] DEFAULT '{}',
    level INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions Table
CREATE TABLE permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role-Permission Mapping
CREATE TABLE role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- User Role Assignments
CREATE TABLE user_role_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    assigned_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- Approval Workflows
CREATE TABLE approval_workflows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    module VARCHAR(100) NOT NULL,
    approval_levels JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approval Levels (as part of workflow)
-- approval_levels structure: [
--   {
--     "level": 1,
--     "role_id": "uuid",
--     "required_approvals": 1,
--     "auto_approve_threshold": 1000,
--     "escalation_timeout": 24,
--     "escalation_role_id": "uuid"
--   }
-- ]

-- Approval Requests
CREATE TABLE approval_requests (
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

-- Individual Approvals
CREATE TABLE approvals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    comments TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
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

-- Indexes for performance
CREATE INDEX idx_user_roles_level ON user_roles(level);
CREATE INDEX idx_user_roles_active ON user_roles(is_active);
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_action ON permissions(action);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX idx_user_role_assignments_role_id ON user_role_assignments(role_id);
CREATE INDEX idx_user_role_assignments_active ON user_role_assignments(is_active);
CREATE INDEX idx_approval_workflows_module ON approval_workflows(module);
CREATE INDEX idx_approval_workflows_active ON approval_workflows(is_active);
CREATE INDEX idx_approval_requests_workflow_id ON approval_requests(workflow_id);
CREATE INDEX idx_approval_requests_requester_id ON approval_requests(requester_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_entity ON approval_requests(entity_type, entity_id);
CREATE INDEX idx_approvals_request_id ON approvals(request_id);
CREATE INDEX idx_approvals_approver_id ON approvals(approver_id);
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_level ON approvals(level);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Row Level Security (RLS) Policies

-- User Roles Policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active roles" ON user_roles
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Administrators can manage roles" ON user_roles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_role_assignments ura
            JOIN user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = auth.uid() 
            AND ur.name = 'Administrator'
            AND ura.is_active = true
        )
    );

-- Permissions Policies
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view permissions" ON permissions
    FOR SELECT
    USING (true);

-- Role Permissions Policies
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view role permissions" ON role_permissions
    FOR SELECT
    USING (true);

CREATE POLICY "Administrators can manage role permissions" ON role_permissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_role_assignments ura
            JOIN user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = auth.uid() 
            AND ur.name = 'Administrator'
            AND ura.is_active = true
        )
    );

-- User Role Assignments Policies
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own role assignments" ON user_role_assignments
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Administrators can manage role assignments" ON user_role_assignments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_role_assignments ura
            JOIN user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = auth.uid() 
            AND ur.name = 'Administrator'
            AND ura.is_active = true
        )
    );

-- Approval Workflows Policies
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active workflows" ON approval_workflows
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "HR Managers can manage workflows" ON approval_workflows
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_role_assignments ura
            JOIN user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = auth.uid() 
            AND (ur.name = 'HR Manager' OR ur.name = 'Administrator')
            AND ura.is_active = true
        )
    );

-- Approval Requests Policies
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests" ON approval_requests
    FOR SELECT
    USING (requester_id = auth.uid());

CREATE POLICY "Approvers can view requests they need to approve" ON approval_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM approvals a
            WHERE a.request_id = approval_requests.id
            AND a.approver_id = auth.uid()
            AND a.status = 'pending'
        )
    );

CREATE POLICY "HR Managers can view all requests" ON approval_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_role_assignments ura
            JOIN user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = auth.uid() 
            AND (ur.name = 'HR Manager' OR ur.name = 'Administrator')
            AND ura.is_active = true
        )
    );

CREATE POLICY "Users can create approval requests" ON approval_requests
    FOR INSERT
    WITH CHECK (requester_id = auth.uid());

-- Approvals Policies
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approvers can view their approvals" ON approvals
    FOR SELECT
    USING (approver_id = auth.uid());

CREATE POLICY "Requesters can view approvals for their requests" ON approvals
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM approval_requests ar
            WHERE ar.id = approvals.request_id
            AND ar.requester_id = auth.uid()
        )
    );

CREATE POLICY "Approvers can update their approvals" ON approvals
    FOR UPDATE
    USING (approver_id = auth.uid() AND status = 'pending');

-- Audit Logs Policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for their actions" ON audit_logs
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "HR Managers can view all audit logs" ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_role_assignments ura
            JOIN user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = auth.uid() 
            AND (ur.name = 'HR Manager' OR ur.name = 'Administrator')
            AND ura.is_active = true
        )
    );

-- Insert default roles
INSERT INTO user_roles (name, description, permissions, level, is_active) VALUES
('Employee', 'Basic employee access', '{"self_service.view", "payslips.view", "profile.view"}', 1, true),
('Manager', 'Manager level access', '{"employee.view", "leave.approve", "timesheet.approve", "expense.approve"}', 2, true),
('HR Admin', 'HR administrative access', '{"employee.manage", "leave.manage", "payroll.view", "reports.view"}', 3, true),
('HR Manager', 'HR management access', '{"employee.manage", "payroll.manage", "compliance.manage", "settings.manage"}', 4, true),
('Payroll Admin', 'Payroll administrative access', '{"payroll.manage", "salary_adjustments.manage", "superannuation.manage", "stp.manage"}', 3, true),
('Payroll Manager', 'Payroll management access', '{"payroll.manage", "payroll_settings.manage", "compliance.manage", "reports.manage"}', 4, true),
('Administrator', 'Full system access', '{"*"}', 5, true);

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
('View Employees', 'Can view employee information', 'employee', 'view'),
('Manage Employees', 'Can create, update, and delete employees', 'employee', 'manage'),
('View Payroll', 'Can view payroll information', 'payroll', 'view'),
('Manage Payroll', 'Can process payroll and manage payroll settings', 'payroll', 'manage'),
('Approve Salary Adjustments', 'Can approve salary adjustment requests', 'salary_adjustments', 'approve'),
('Manage Salary Adjustments', 'Can create and manage salary adjustments', 'salary_adjustments', 'manage'),
('Manage Superannuation', 'Can manage superannuation contributions and settings', 'superannuation', 'manage'),
('Manage STP', 'Can manage Single Touch Payroll submissions', 'stp', 'manage'),
('View Reports', 'Can view reports and analytics', 'reports', 'view'),
('Manage Reports', 'Can create and manage reports', 'reports', 'manage'),
('View Compliance', 'Can view compliance information', 'compliance', 'view'),
('Manage Compliance', 'Can manage compliance settings', 'compliance', 'manage'),
('View Settings', 'Can view system settings', 'settings', 'view'),
('Manage Settings', 'Can manage system settings', 'settings', 'manage'),
('Self Service View', 'Can view self-service information', 'self_service', 'view'),
('View Payslips', 'Can view payslips', 'payslips', 'view'),
('View Profile', 'Can view profile information', 'profile', 'view'),
('Approve Leave', 'Can approve leave requests', 'leave', 'approve'),
('Approve Timesheets', 'Can approve timesheets', 'timesheet', 'approve'),
('Approve Expenses', 'Can approve expense claims', 'expense', 'approve');

-- Insert default approval workflows
INSERT INTO approval_workflows (name, description, module, approval_levels) VALUES
('Salary Adjustment Approval', 'Workflow for salary adjustment approvals', 'salary_adjustments', '[
  {"level": 1, "role_id": "manager", "required_approvals": 1, "escalation_timeout": 24},
  {"level": 2, "role_id": "hr_manager", "required_approvals": 1}
]'),
('Leave Request Approval', 'Workflow for leave request approvals', 'leave', '[
  {"level": 1, "role_id": "manager", "required_approvals": 1, "escalation_timeout": 48}
]'),
('Expense Claim Approval', 'Workflow for expense claim approvals', 'expense', '[
  {"level": 1, "role_id": "manager", "required_approvals": 1, "auto_approve_threshold": 100},
  {"level": 2, "role_id": "hr_manager", "required_approvals": 1}
]'),
('Payroll Processing Approval', 'Workflow for payroll processing approvals', 'payroll', '[
  {"level": 1, "role_id": "payroll_manager", "required_approvals": 1}
]');