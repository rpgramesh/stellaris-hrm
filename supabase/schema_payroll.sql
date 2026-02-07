
-- ... (Previous content kept, appending new tables) ...

-- PAYROLL & AWARDS (STP Phase 2 Support Structures)
CREATE TABLE awards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- e.g., 'MA000002'
    name TEXT NOT NULL, -- e.g., 'Clerks - Private Sector Award 2020'
    version DATE NOT NULL -- Effective date
);

CREATE TABLE pay_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    award_id UUID REFERENCES awards(id),
    name TEXT NOT NULL, -- e.g., 'Saturday Rate', 'Overtime 1.5x'
    multiplier NUMERIC(3, 2) DEFAULT 1.0,
    flat_rate NUMERIC(10, 2),
    condition_description TEXT, -- JSON or text description of when this applies
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    payment_date DATE NOT NULL,
    status TEXT DEFAULT 'Draft', -- Draft, Approved, Paid, Reported (STP)
    total_gross NUMERIC(12, 2),
    total_tax NUMERIC(12, 2),
    total_super NUMERIC(12, 2),
    total_net NUMERIC(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payslips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    gross_pay NUMERIC(10, 2),
    tax_withheld NUMERIC(10, 2),
    superannuation NUMERIC(10, 2),
    net_pay NUMERIC(10, 2),
    ytd_gross NUMERIC(12, 2),
    ytd_tax NUMERIC(12, 2),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STP Reporting Log
CREATE TABLE stp_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_run_id UUID REFERENCES payroll_runs(id),
    submission_id TEXT, -- From ATO
    status TEXT, -- Pending, Submitted, Accepted, Rejected
    response_message TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE
);
