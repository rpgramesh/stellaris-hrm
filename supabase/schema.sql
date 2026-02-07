-- DEPARTMENTS
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    manager_id TEXT,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- JOB POSITIONS
CREATE TABLE job_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    department TEXT, -- Legacy text field, keeping for compatibility but should use department_id
    department_id UUID REFERENCES departments(id),
    level TEXT,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EMPLOYEES (Core table)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'Employee',
    department_id UUID REFERENCES departments(id),
    position_id UUID REFERENCES job_positions(id),
    start_date DATE,
    employment_status TEXT,
    gender TEXT,
    date_of_birth DATE,
    nationality TEXT,
    national_id TEXT,
    address TEXT,
    salary NUMERIC,
    bank_name TEXT,
    bank_account_number TEXT,
    avatar_url TEXT,
    probation_end_date DATE,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ONBOARDING WORKFLOWS
CREATE TABLE onboarding_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id), -- Changed from TEXT to UUID FK
    status TEXT DEFAULT 'Not Started',
    progress INTEGER DEFAULT 0,
    current_stage TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ONBOARDING TASKS
CREATE TABLE onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES onboarding_workflows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TRAINERS
CREATE TABLE trainers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT,
    contact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BRANCHES
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    contact_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- JOB LEVELS
CREATE TABLE job_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    grade TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BANKS
CREATE TABLE banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    swift_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- COURSES
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DOCUMENT CATEGORIES
CREATE TABLE document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ETHNICITIES
CREATE TABLE ethnicities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RELIGIONS
CREATE TABLE religions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MODULES
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL, -- e.g., 'mod_emp'
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- COMPANY INFORMATION
CREATE TABLE company_information (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT,
    registration_number TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    tax_id TEXT,
    primary_contact TEXT,
    founded_year TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SYSTEM SETTINGS
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_format TEXT DEFAULT 'DD/MM/YYYY',
    time_zone TEXT DEFAULT 'Australia/Sydney',
    currency TEXT DEFAULT 'AUD',
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT false,
    two_factor_auth BOOLEAN DEFAULT false,
    session_timeout TEXT DEFAULT '30',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Data for Module Access
INSERT INTO module_access (key, name, description, enabled) VALUES
('mod_emp', 'Employee Management', 'Core employee profiles and records', true),
('mod_leave', 'Leave Management', 'Leave requests, approvals and balances', true),
('mod_payroll', 'Payroll', 'Salary processing and payslips', true),
('mod_exp', 'Expense Management', 'Expense claims and reimbursements', true),
('mod_ats', 'Recruitment (ATS)', 'Job postings and candidate tracking', false),
('mod_perf', 'Performance', 'Reviews, goals and feedback', false),
('mod_train', 'Training', 'Course management and learning records', true),
('mod_assets', 'Asset Management', 'Company asset tracking', false)
ON CONFLICT (key) DO NOTHING;

-- Seed Data for Company Information (Single Row)
INSERT INTO company_information (company_name, registration_number, address, phone, email, website, tax_id, primary_contact, founded_year)
SELECT 'Stellaris HRM', 'ABN 12 345 678 901', '123 Innovation Way, Tech Park, Sydney NSW 2000', '+61 2 1234 5678', 'contact@stellaris.com', 'https://www.stellaris.com', '12345678901', 'John Doe', '2020'
WHERE NOT EXISTS (SELECT 1 FROM company_information);

-- Seed Data for System Settings (Single Row)
INSERT INTO system_settings (date_format, time_zone, currency, email_notifications, push_notifications, two_factor_auth, session_timeout)
SELECT 'DD/MM/YYYY', 'Australia/Sydney', 'AUD', true, false, false, '30'
WHERE NOT EXISTS (SELECT 1 FROM system_settings);
-- DOCUMENTS
CREATE TABLE legal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    document_type TEXT NOT NULL,
    document_number TEXT,
    issue_date DATE,
    expiry_date DATE,
    issuing_authority TEXT,
    attachment TEXT,
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TRAINING RECORDS
CREATE TABLE training_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    date DATE,
    course TEXT,
    trainer TEXT,
    result TEXT,
    attachment TEXT,
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
