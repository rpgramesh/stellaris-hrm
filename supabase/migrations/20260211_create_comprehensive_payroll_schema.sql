-- Comprehensive Payroll Module Schema
-- This migration creates all necessary tables for the complete payroll system

-- 1. Employee Payroll Configuration
CREATE TABLE IF NOT EXISTS payroll_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    pay_frequency TEXT NOT NULL CHECK (pay_frequency IN ('Weekly', 'Fortnightly', 'Monthly')),
    tax_file_number VARCHAR(11),
    tax_scale TEXT NOT NULL DEFAULT 'TaxFreeThreshold',
    residency_status TEXT NOT NULL CHECK (residency_status IN ('Resident', 'NonResident', 'WorkingHoliday')),
    employment_type TEXT NOT NULL CHECK (employment_type IN ('FullTime', 'PartTime', 'Casual')),
    super_fund_id UUID,
    super_member_number VARCHAR(50),
    award_classification TEXT,
    is_salary_sacrifice BOOLEAN DEFAULT FALSE,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Salary Adjustment System
CREATE TABLE IF NOT EXISTS salary_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('BaseSalary', 'Allowance', 'Bonus', 'Deduction')),
    amount NUMERIC(12,2) NOT NULL,
    adjustment_reason TEXT NOT NULL CHECK (adjustment_reason IN ('AnnualReview', 'Promotion', 'MarketAdjustment', 'Performance', 'Other')),
    effective_date DATE NOT NULL,
    end_date DATE, -- For temporary adjustments
    is_permanent BOOLEAN DEFAULT TRUE,
    is_processed BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL CHECK (status IN ('Draft', 'PendingApproval', 'Approved', 'Rejected', 'Processed')),
    requested_by UUID REFERENCES employees(id),
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    back_pay_calculated BOOLEAN DEFAULT FALSE,
    back_pay_amount NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Payroll Runs
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    payment_date DATE NOT NULL,
    pay_frequency TEXT NOT NULL CHECK (pay_frequency IN ('Weekly', 'Fortnightly', 'Monthly')),
    status TEXT NOT NULL CHECK (status IN ('Draft', 'Approved', 'Processing', 'Paid', 'STPSubmitted')),
    total_gross_pay NUMERIC(14,2) DEFAULT 0,
    total_tax NUMERIC(14,2) DEFAULT 0,
    total_super NUMERIC(14,2) DEFAULT 0,
    total_net_pay NUMERIC(14,2) DEFAULT 0,
    employee_count INTEGER DEFAULT 0,
    processed_by UUID REFERENCES employees(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    stp_submission_id TEXT,
    stp_status TEXT CHECK (stp_status IN ('Pending', 'Submitted', 'Accepted', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enhanced Payslips
CREATE TABLE IF NOT EXISTS payslips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    payslip_number VARCHAR(50) UNIQUE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    payment_date DATE NOT NULL,
    gross_pay NUMERIC(12,2) DEFAULT 0,
    taxable_income NUMERIC(12,2) DEFAULT 0,
    tax_withheld NUMERIC(12,2) DEFAULT 0,
    superannuation NUMERIC(12,2) DEFAULT 0,
    net_pay NUMERIC(12,2) DEFAULT 0,
    ytd_gross NUMERIC(14,2) DEFAULT 0,
    ytd_tax NUMERIC(14,2) DEFAULT 0,
    ytd_super NUMERIC(14,2) DEFAULT 0,
    hours_worked NUMERIC(6,2) DEFAULT 0,
    pay_frequency TEXT NOT NULL CHECK (pay_frequency IN ('Weekly', 'Fortnightly', 'Monthly')),
    status TEXT NOT NULL CHECK (status IN ('Draft', 'Final', 'Corrected')),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    corrected_from UUID REFERENCES payslips(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Pay Components (Earnings, Allowances, etc.)
CREATE TABLE IF NOT EXISTS pay_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payslip_id UUID REFERENCES payslips(id) ON DELETE CASCADE,
    component_type TEXT NOT NULL CHECK (component_type IN ('BaseSalary', 'Overtime', 'Allowance', 'Bonus', 'Commission', 'LeaveLoading', 'Super')),
    description TEXT NOT NULL,
    units NUMERIC(8,2) NOT NULL, -- hours, days, or count
    rate NUMERIC(10,2) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    tax_treatment TEXT NOT NULL CHECK (tax_treatment IN ('Taxable', 'NonTaxable', 'Reportable', 'SalarySacrifice')),
    stp_category TEXT NOT NULL CHECK (stp_category IN ('SAW', 'OVT', 'ALW', 'BON', 'COM', 'LVE', 'SUP')),
    is_ytd BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Deductions
CREATE TABLE IF NOT EXISTS deductions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    deduction_type TEXT NOT NULL CHECK (deduction_type IN ('PreTax', 'PostTax')),
    category TEXT NOT NULL CHECK (category IN ('UnionFees', 'SalaryPackaging', 'ChildSupport', 'Voluntary', 'Other')),
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    is_fixed BOOLEAN DEFAULT TRUE,
    is_percentage BOOLEAN DEFAULT FALSE,
    percentage NUMERIC(5,2), -- e.g., 5.5 for 5.5%
    priority INTEGER NOT NULL DEFAULT 100, -- Processing order (lower = higher priority)
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Deduction Applications (Actual deductions applied to payslips)
CREATE TABLE IF NOT EXISTS deduction_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payslip_id UUID REFERENCES payslips(id) ON DELETE CASCADE,
    deduction_id UUID REFERENCES deductions(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    ytd_amount NUMERIC(14,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Superannuation Funds
CREATE TABLE IF NOT EXISTS super_funds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    abn VARCHAR(11) NOT NULL,
    usi VARCHAR(20) NOT NULL,
    contact_address TEXT,
    contact_phone VARCHAR(20),
    contact_email TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Superannuation Contributions
CREATE TABLE IF NOT EXISTS superannuation_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    fund_id UUID REFERENCES super_funds(id),
    payslip_id UUID REFERENCES payslips(id) ON DELETE CASCADE,
    contribution_type TEXT NOT NULL CHECK (contribution_type IN ('SuperGuarantee', 'SalarySacrifice', 'Voluntary', 'Award')),
    amount NUMERIC(12,2) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    payment_date DATE NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    payment_reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. STP Phase 2 Submissions
CREATE TABLE IF NOT EXISTS stp_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
    submission_type TEXT NOT NULL CHECK (submission_type IN ('PayEvent', 'UpdateEvent', 'FullFileReplacement')),
    submission_id TEXT, -- ATO assigned ID
    status TEXT NOT NULL CHECK (status IN ('Draft', 'Submitted', 'Accepted', 'Rejected', 'Corrected')),
    submission_date TIMESTAMP WITH TIME ZONE NOT NULL,
    employee_count INTEGER NOT NULL,
    total_gross NUMERIC(14,2) NOT NULL,
    total_tax NUMERIC(14,2) NOT NULL,
    total_super NUMERIC(14,2) NOT NULL,
    response_message TEXT,
    error_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. STP Payee Data
CREATE TABLE IF NOT EXISTS stp_payee_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stp_submission_id UUID REFERENCES stp_submissions(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    income_type TEXT NOT NULL CHECK (income_type IN ('SAW', 'WHM', 'IAA', 'SWP', 'JSP', 'FEI', 'CDP', 'SIP', 'RAP')),
    country_code VARCHAR(2),
    tax_treatment_code TEXT NOT NULL,
    gross_amount NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(12,2) NOT NULL,
    super_amount NUMERIC(12,2) NOT NULL,
    ytd_gross NUMERIC(14,2) NOT NULL,
    ytd_tax NUMERIC(14,2) NOT NULL,
    ytd_super NUMERIC(14,2) NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    payment_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Awards and Award Rules
CREATE TABLE IF NOT EXISTS awards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL, -- e.g., 'MA000002'
    name TEXT NOT NULL,
    version VARCHAR(10) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS award_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    award_id UUID REFERENCES awards(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('PenaltyRate', 'Overtime', 'Allowance', 'ShiftLoading', 'PublicHoliday')),
    name TEXT NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL, -- Complex conditions stored as JSON
    calculation JSONB NOT NULL, -- Calculation method and parameters
    priority INTEGER NOT NULL DEFAULT 100,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Tax Tables
CREATE TABLE IF NOT EXISTS tax_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    financial_year VARCHAR(9) NOT NULL, -- e.g., '2024-2025'
    tax_scale TEXT NOT NULL,
    residency_status TEXT NOT NULL CHECK (residency_status IN ('Resident', 'NonResident', 'WorkingHoliday')),
    pay_frequency TEXT NOT NULL CHECK (pay_frequency IN ('Weekly', 'Fortnightly', 'Monthly')),
    income_thresholds JSONB NOT NULL, -- Array of threshold objects
    effective_from DATE NOT NULL,
    effective_to DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Statutory Rates (Super, Medicare, etc.)
CREATE TABLE IF NOT EXISTS statutory_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rate_type TEXT NOT NULL CHECK (rate_type IN ('SuperannuationGuarantee', 'MedicareLevy', 'PayrollTax', 'WorkersCompensation')),
    financial_year VARCHAR(9) NOT NULL,
    rate NUMERIC(5,4) NOT NULL, -- e.g., 0.1150 for 11.50%
    threshold NUMERIC(12,2), -- Applicable threshold if any
    effective_from DATE NOT NULL,
    effective_to DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Bonus Payments
CREATE TABLE IF NOT EXISTS bonus_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    bonus_type TEXT NOT NULL CHECK (bonus_type IN ('Performance', 'Retention', 'SignOn', 'Annual', 'Special')),
    amount NUMERIC(12,2) NOT NULL,
    payment_date DATE NOT NULL,
    tax_method TEXT NOT NULL CHECK (tax_method IN ('Aggregate', 'LumpSumA', 'LumpSumB', 'LumpSumD')),
    is_processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    payslip_id UUID REFERENCES payslips(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Annual Salary Statements
CREATE TABLE IF NOT EXISTS annual_salary_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    financial_year VARCHAR(9) NOT NULL,
    gross_payments NUMERIC(14,2) DEFAULT 0,
    tax_withheld NUMERIC(14,2) DEFAULT 0,
    superannuation NUMERIC(14,2) DEFAULT 0,
    reportable_fringe_benefits NUMERIC(14,2) DEFAULT 0,
    reportable_super_contributions NUMERIC(14,2) DEFAULT 0,
    workplace_giving NUMERIC(14,2) DEFAULT 0,
    allowances NUMERIC(14,2) DEFAULT 0,
    lump_sum_payments NUMERIC(14,2) DEFAULT 0,
    termination_payments NUMERIC(14,2) DEFAULT 0,
    is_final BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    amended_from UUID REFERENCES annual_salary_statements(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, financial_year)
);

-- Enable RLS on all payroll tables
ALTER TABLE payroll_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deduction_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE superannuation_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stp_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stp_payee_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE statutory_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_salary_statements ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_employees_employee_id ON payroll_employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_employees_effective ON payroll_employees(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_employee_id ON salary_adjustments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_status ON salary_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_salary_adjustments_effective_date ON salary_adjustments(effective_date);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_payslips_employee_id ON payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslips_payroll_run_id ON payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payslips_payment_date ON payslips(payment_date);
CREATE INDEX IF NOT EXISTS idx_pay_components_payslip_id ON pay_components(payslip_id);
CREATE INDEX IF NOT EXISTS idx_deductions_employee_id ON deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_deductions_active ON deductions(is_active);
CREATE INDEX IF NOT EXISTS idx_super_contributions_employee_id ON superannuation_contributions(employee_id);
CREATE INDEX IF NOT EXISTS idx_stp_submissions_payroll_run_id ON stp_submissions(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_bonus_payments_employee_id ON bonus_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_annual_statements_employee_id ON annual_salary_statements(employee_id);

-- Insert sample data
INSERT INTO super_funds (name, abn, usi, contact_address, contact_phone, contact_email) VALUES
    ('AustralianSuper', '65714948879', 'STA0100AU', 'Level 28, 50 Lonsdale Street, Melbourne VIC 3000', '1300300875', 'enquiries@australiansuper.com'),
    ('REST Super', '62653271687', 'RES0101AU', 'Level 3, 45 William Street, Melbourne VIC 3000', '1800337755', 'info@rest.com.au'),
    ('Hostplus', '68657294732', 'HOS0100AU', 'Level 10, 333 Collins Street, Melbourne VIC 3000', '1300468378', 'info@hostplus.com.au');

INSERT INTO statutory_rates (rate_type, financial_year, rate, threshold, effective_from, effective_to) VALUES
    ('SuperannuationGuarantee', '2024-2025', 0.1150, NULL, '2024-07-01', '2025-06-30'),
    ('MedicareLevy', '2024-2025', 0.0200, NULL, '2024-07-01', '2025-06-30');

INSERT INTO awards (code, name, version, effective_from, effective_to) VALUES
    ('MA000002', 'Clerks - Private Sector Award 2020', '1.0', '2020-01-01', NULL),
    ('MA000004', 'General Retail Industry Award 2020', '1.0', '2020-01-01', NULL);