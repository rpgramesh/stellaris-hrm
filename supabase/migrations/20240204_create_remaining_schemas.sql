-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- RECRUITMENT SCHEMA
-- ==========================================

-- Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    location TEXT NOT NULL,
    job_type TEXT, -- Full-time, Part-time, Contract, etc.
    location_type TEXT, -- On-site, Remote, Hybrid
    description TEXT,
    requirements TEXT[],
    responsibilities TEXT[],
    salary_min NUMERIC,
    salary_max NUMERIC,
    salary_currency TEXT DEFAULT 'AUD',
    experience_level TEXT,
    status TEXT DEFAULT 'Draft', -- Draft, Published, Closed
    priority TEXT DEFAULT 'Medium',
    posted_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closing_date TIMESTAMP WITH TIME ZONE,
    hiring_manager_id UUID REFERENCES employees(id),
    tags TEXT[],
    remote BOOLEAN DEFAULT false,
    urgent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applicants Table
CREATE TABLE IF NOT EXISTS applicants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    resume_url TEXT,
    cover_letter_url TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    status TEXT DEFAULT 'New', -- New, Screening, Interview, Offer, Rejected, Hired
    source TEXT,
    referrer_id UUID REFERENCES employees(id),
    applied_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_stage TEXT,
    next_action TEXT,
    next_action_date TIMESTAMP WITH TIME ZONE,
    rating INTEGER CHECK (rating >= 0 AND rating <= 5),
    experience TEXT,
    current_company TEXT,
    current_position TEXT,
    expected_salary NUMERIC,
    notice_period TEXT,
    available_date TIMESTAMP WITH TIME ZONE,
    tags TEXT[],
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job Offers Table
CREATE TABLE IF NOT EXISTS job_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id),
    applicant_id UUID REFERENCES applicants(id),
    base_salary NUMERIC,
    currency TEXT DEFAULT 'AUD',
    frequency TEXT DEFAULT 'Annually',
    benefits TEXT[],
    start_date DATE,
    probation_period TEXT,
    notice_period TEXT,
    status TEXT DEFAULT 'Draft', -- Draft, Sent, Accepted, Rejected, Pending Response
    sent_date TIMESTAMP WITH TIME ZONE,
    response_deadline TIMESTAMP WITH TIME ZONE,
    response_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_by UUID REFERENCES employees(id),
    approved_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PERFORMANCE SCHEMA
-- ==========================================

-- KPIs Table
CREATE TABLE IF NOT EXISTS kpis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    target NUMERIC,
    current_value NUMERIC DEFAULT 0,
    unit TEXT,
    weight NUMERIC,
    progress NUMERIC GENERATED ALWAYS AS (
        CASE WHEN target > 0 THEN (current_value / target) * 100 ELSE 0 END
    ) STORED,
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'Not Started', -- Not Started, In Progress, Completed, At Risk, Overdue
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OKRs Table
CREATE TABLE IF NOT EXISTS okrs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    quarter TEXT NOT NULL, -- e.g., "Q1 2024"
    objective TEXT NOT NULL,
    description TEXT,
    progress NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'On Track',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Key Results Table (Child of OKRs)
CREATE TABLE IF NOT EXISTS key_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    okr_id UUID REFERENCES okrs(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    target NUMERIC NOT NULL,
    current NUMERIC DEFAULT 0,
    unit TEXT,
    progress NUMERIC GENERATED ALWAYS AS (
        CASE WHEN target > 0 THEN (current / target) * 100 ELSE 0 END
    ) STORED,
    confidence INTEGER, -- 0-10 or percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Reviews Table
CREATE TABLE IF NOT EXISTS performance_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    reviewer_id UUID REFERENCES employees(id),
    cycle TEXT, -- e.g., "2023 Annual Review"
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'Scheduled',
    self_assessment TEXT,
    manager_assessment TEXT,
    final_rating NUMERIC,
    recommendations TEXT,
    development_plan TEXT,
    promotion_recommendation BOOLEAN,
    completed_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 360 Feedback Table
CREATE TABLE IF NOT EXISTS feedback_360 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    reviewer_id UUID REFERENCES employees(id),
    relationship TEXT, -- Peer, Direct Report, Manager
    period_start DATE,
    period_end DATE,
    status TEXT DEFAULT 'Pending',
    competencies JSONB, -- Array of objects {competency, rating, comment}
    overall_comments TEXT,
    strengths TEXT[],
    improvements TEXT[],
    submitted_date TIMESTAMP WITH TIME ZONE,
    anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- LEARNING & DEVELOPMENT SCHEMA
-- ==========================================

-- Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    provider TEXT,
    duration TEXT, -- e.g. "2 hours"
    category TEXT,
    url TEXT,
    active BOOLEAN DEFAULT true,
    format TEXT, -- Online, In-person
    level TEXT, -- Beginner, etc.
    cost NUMERIC,
    currency TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training Records Table (Ad-hoc or external training)
CREATE TABLE IF NOT EXISTS training_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE,
    course TEXT, -- Can be linked to courses table or free text for external
    trainer TEXT,
    result TEXT, -- Pass, Fail, Completed
    attachment TEXT,
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course Enrollments (Formal internal courses)
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'Enrolled', -- Enrolled, In Progress, Completed
    enrolled_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    progress NUMERIC DEFAULT 0,
    score NUMERIC,
    certificate_url TEXT,
    feedback TEXT,
    rating INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training Programs (Tracks/Paths)
CREATE TABLE IF NOT EXISTS training_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT,
    target_audience TEXT[],
    courses UUID[], -- Array of course IDs
    duration NUMERIC, -- hours
    mandatory BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'Draft',
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INCIDENTS SCHEMA
-- ==========================================

-- Incident Categories
CREATE TABLE IF NOT EXISTS incident_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    color TEXT,
    allow_causeless BOOLEAN DEFAULT false,
    reporter_allowed TEXT,
    investigation_access TEXT,
    team_access JSONB,
    custom_role_access JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incident Types
CREATE TABLE IF NOT EXISTS incident_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    category_id UUID REFERENCES incident_categories(id),
    weight INTEGER,
    rule TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incident Decisions
CREATE TABLE IF NOT EXISTS incident_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incidents
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES incident_categories(id),
    type_id UUID REFERENCES incident_types(id),
    from_date TIMESTAMP WITH TIME ZONE,
    to_date TIMESTAMP WITH TIME ZONE,
    summary TEXT,
    story TEXT,
    attachment TEXT,
    status TEXT DEFAULT 'Not Started',
    is_open BOOLEAN DEFAULT true,
    explain_by TEXT,
    decision_id UUID REFERENCES incident_decisions(id),
    decision_from DATE,
    decision_to DATE,
    management_remark TEXT,
    created_by UUID REFERENCES employees(id), -- Nullable if anonymous
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ATTENDANCE SCHEMA
-- ==========================================

CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    location JSONB, -- {lat, lng, address}
    status TEXT, -- Present, Late, Absent, etc.
    worker_type TEXT,
    project_code TEXT,
    notes TEXT,
    breaks JSONB, -- Array of break objects
    total_break_minutes INTEGER DEFAULT 0,
    overtime_minutes INTEGER DEFAULT 0,
    is_field_work BOOLEAN DEFAULT false,
    selfie_url TEXT,
    verification_photo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- EXPENSES SCHEMA
-- ==========================================

-- Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    "limit" NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense Types
CREATE TABLE IF NOT EXISTS expense_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense Workflows
CREATE TABLE IF NOT EXISTS expense_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    steps TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses (Claims)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date_submitted TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'Draft',
    total_amount NUMERIC DEFAULT 0,
    workflow_id UUID REFERENCES expense_workflows(id),
    current_approver_id UUID REFERENCES employees(id),
    approved_by UUID REFERENCES employees(id),
    history JSONB, -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expense Items
CREATE TABLE IF NOT EXISTS expense_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES expense_categories(id),
    type_id UUID REFERENCES expense_types(id),
    date DATE,
    amount NUMERIC NOT NULL,
    description TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- SETTINGS & COMPANY INFO SCHEMA
-- ==========================================

CREATE TABLE IF NOT EXISTS company_information (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT,
    registration_number TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    tax_id TEXT,
    primary_contact TEXT,
    founded_year TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date_format TEXT DEFAULT 'DD/MM/YYYY',
    time_zone TEXT DEFAULT 'UTC',
    currency TEXT DEFAULT 'USD',
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    two_factor_auth BOOLEAN DEFAULT false,
    session_timeout INTEGER DEFAULT 30, -- minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- OFFBOARDING SCHEMA
-- ==========================================

-- Offboarding Workflows Table
CREATE TABLE IF NOT EXISTS offboarding_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    exit_date DATE,
    reason TEXT,
    status TEXT DEFAULT 'Scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Offboarding Tasks Table
CREATE TABLE IF NOT EXISTS offboarding_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES offboarding_workflows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PAYROLL STP SCHEMA
-- ==========================================

-- STP Events Table
CREATE TABLE IF NOT EXISTS stp_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    run_date TIMESTAMP WITH TIME ZONE,
    transaction_id TEXT,
    status TEXT DEFAULT 'Draft',
    employee_count INTEGER,
    total_gross NUMERIC,
    total_tax NUMERIC,
    total_super NUMERIC,
    response_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STP Payees Table
CREATE TABLE IF NOT EXISTS stp_payees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES stp_events(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    ytd_gross NUMERIC,
    ytd_tax NUMERIC,
    ytd_super NUMERIC,
    pay_period_gross NUMERIC,
    pay_period_tax NUMERIC,
    pay_period_super NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ENABLE RLS
-- ==========================================

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_360 ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stp_payees ENABLE ROW LEVEL SECURITY;

ALTER TABLE incident_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLICIES (Simple Authenticated Access)
-- ==========================================

-- Create a macro-like approach for policies to reduce repetition in source
-- (We'll just list them out for compatibility)

DO $$
DECLARE
    tables TEXT[] := ARRAY[
        'jobs', 'applicants', 'job_offers',
        'kpis', 'okrs', 'key_results', 'performance_reviews', 'feedback_360',
        'courses', 'training_records', 'course_enrollments', 'training_programs',
        'offboarding_workflows', 'offboarding_tasks',
        'stp_events', 'stp_payees',
        'incident_categories', 'incident_types', 'incident_decisions', 'incidents',
        'attendance_records',
        'expense_categories', 'expense_types', 'expense_workflows', 'expenses', 'expense_items',
        'company_information', 'system_settings'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('CREATE POLICY "Enable read access for authenticated users" ON %I FOR SELECT USING (auth.role() = ''authenticated'')', t);
        EXECUTE format('CREATE POLICY "Enable insert access for authenticated users" ON %I FOR INSERT WITH CHECK (auth.role() = ''authenticated'')', t);
        EXECUTE format('CREATE POLICY "Enable update access for authenticated users" ON %I FOR UPDATE USING (auth.role() = ''authenticated'')', t);
        EXECUTE format('CREATE POLICY "Enable delete access for authenticated users" ON %I FOR DELETE USING (auth.role() = ''authenticated'')', t);
    END LOOP;
END $$;

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================

-- Ensure the function exists (it should from previous migration, but safe to re-declare or check)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
DECLARE
    tables TEXT[] := ARRAY[
        'jobs', 'applicants', 'job_offers',
        'kpis', 'okrs', 'key_results', 'performance_reviews', 'feedback_360',
        'courses', 'training_records', 'course_enrollments', 'training_programs',
        'offboarding_workflows', 'offboarding_tasks',
        'stp_events', 'stp_payees',
        'incident_categories', 'incident_types', 'incident_decisions', 'incidents',
        'attendance_records',
        'expense_categories', 'expense_types', 'expense_workflows', 'expenses', 'expense_items',
        'company_information', 'system_settings'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_modtime ON %I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_modtime BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_modified_column()', t, t);
    END LOOP;
END $$;
