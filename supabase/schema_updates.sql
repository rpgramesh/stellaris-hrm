-- LEAVE ENTITLEMENTS
CREATE TABLE leave_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    leave_type TEXT NOT NULL, -- 'Annual', 'Sick', etc.
    year INTEGER NOT NULL,
    total_days NUMERIC DEFAULT 0,
    carried_over NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, leave_type, year)
);

-- OFFBOARDING WORKFLOWS
CREATE TABLE offboarding_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    exit_date DATE,
    reason TEXT,
    status TEXT DEFAULT 'Scheduled', -- 'Scheduled', 'In Progress', 'Completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OFFBOARDING TASKS
CREATE TABLE offboarding_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES offboarding_workflows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WEB ACCOUNTS
CREATE TABLE web_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    status TEXT DEFAULT 'Active', -- 'Active', 'Suspended'
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EMPLOYEE REQUESTS
CREATE TABLE employee_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    type TEXT NOT NULL, -- 'Profile Update', 'Asset Request', 'Document Request', 'Other'
    description TEXT,
    request_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
