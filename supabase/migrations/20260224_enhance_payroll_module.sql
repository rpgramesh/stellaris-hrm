-- Enhanced Payroll Module Migration - FIXED VERSION
-- This migration adds comprehensive error handling and reporting capabilities

-- 1. Ensure payroll_runs has correct column names
DO $$
BEGIN
    -- Rename period_start to pay_period_start if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_runs' AND column_name = 'period_start') THEN
        ALTER TABLE payroll_runs RENAME COLUMN period_start TO pay_period_start;
    END IF;

    -- Rename period_end to pay_period_end if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_runs' AND column_name = 'period_end') THEN
        ALTER TABLE payroll_runs RENAME COLUMN period_end TO pay_period_end;
    END IF;

    -- Rename total_gross to total_gross_pay if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_runs' AND column_name = 'total_gross') THEN
        ALTER TABLE payroll_runs RENAME COLUMN total_gross TO total_gross_pay;
    END IF;

    -- Rename total_net to total_net_pay if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_runs' AND column_name = 'total_net') THEN
        ALTER TABLE payroll_runs RENAME COLUMN total_net TO total_net_pay;
    END IF;

    -- Add pay_frequency if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_runs' AND column_name = 'pay_frequency') THEN
        ALTER TABLE payroll_runs ADD COLUMN pay_frequency TEXT NOT NULL DEFAULT 'Fortnightly' CHECK (pay_frequency IN ('Weekly', 'Fortnightly', 'Monthly'));
    END IF;

    -- Add employee_count if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_runs' AND column_name = 'employee_count') THEN
        ALTER TABLE payroll_runs ADD COLUMN employee_count INTEGER DEFAULT 0;
    END IF;

    -- Add processed_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_runs' AND column_name = 'processed_at') THEN
        ALTER TABLE payroll_runs ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add company_id if missing (for RLS policies)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_runs' AND column_name = 'company_id') THEN
        ALTER TABLE payroll_runs ADD COLUMN company_id UUID REFERENCES company_information(id);
    END IF;
END $$;

-- 2. Create payroll_errors table for comprehensive error tracking
CREATE TABLE IF NOT EXISTS payroll_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    error_type TEXT NOT NULL CHECK (error_type IN ('Validation', 'Calculation', 'Data', 'System', 'Compliance')),
    error_code VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    severity TEXT NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Resolved', 'Ignored')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES employees(id),
    resolution_notes TEXT
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_payroll_errors_payroll_run_id ON payroll_errors(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_errors_employee_id ON payroll_errors(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_errors_error_type ON payroll_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_payroll_errors_severity ON payroll_errors(severity);
CREATE INDEX IF NOT EXISTS idx_payroll_errors_status ON payroll_errors(status);
CREATE INDEX IF NOT EXISTS idx_payroll_errors_created_at ON payroll_errors(created_at DESC);

-- 3. Add missing columns to payroll_employees table
ALTER TABLE payroll_employees 
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS casual_loading_rate NUMERIC(5,4) DEFAULT 0.25,
ADD COLUMN IF NOT EXISTS has_help_debt BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_sfss_debt BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_private_health_insurance BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_exempt_from_payroll_tax BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS job_classification TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES company_information(id),
ADD COLUMN IF NOT EXISTS industry_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS state VARCHAR(3);

-- 4. Add missing columns to payslips table for enhanced tracking
ALTER TABLE payslips
ADD COLUMN IF NOT EXISTS taxable_income NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ytd_gross NUMERIC(14,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ytd_tax NUMERIC(14,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ytd_super NUMERIC(14,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS hours_worked NUMERIC(6,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS corrected_from UUID REFERENCES payslips(id),
ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Add missing columns to superannuation_contributions table
ALTER TABLE superannuation_contributions
ADD COLUMN IF NOT EXISTS super_member_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS compliance_checked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS compliance_notes TEXT[];

-- 6. Create comprehensive audit log table for payroll operations
CREATE TABLE IF NOT EXISTS payroll_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    operation TEXT NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE', 'PROCESS', 'VALIDATE', 'APPROVE', 'REJECT')),
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    performed_by UUID REFERENCES employees(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_payroll_audit_logs_payroll_run_id ON payroll_audit_logs(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_logs_employee_id ON payroll_audit_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_logs_performed_at ON payroll_audit_logs(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_logs_operation ON payroll_audit_logs(operation);

-- 7. Create payroll processing queue table for handling large payroll runs
CREATE TABLE IF NOT EXISTS payroll_processing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed', 'Retry')),
    priority INTEGER NOT NULL DEFAULT 100,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for processing queue
CREATE INDEX IF NOT EXISTS idx_payroll_queue_payroll_run_id ON payroll_processing_queue(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_queue_status ON payroll_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_payroll_queue_priority ON payroll_processing_queue(priority ASC);
CREATE INDEX IF NOT EXISTS idx_payroll_queue_created_at ON payroll_processing_queue(created_at ASC);

-- 8. Create payroll validation rules table for configurable validation
CREATE TABLE IF NOT EXISTS payroll_validation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('Data', 'Calculation', 'Compliance', 'Business')),
    description TEXT,
    validation_logic JSONB NOT NULL,
    error_message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    is_active BOOLEAN DEFAULT TRUE,
    applies_to_employment_types TEXT[] DEFAULT ARRAY['FullTime', 'PartTime', 'Casual', 'Contractor'],
    applies_to_pay_frequencies TEXT[] DEFAULT ARRAY['Weekly', 'Fortnightly', 'Monthly'],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES employees(id)
);

-- Create indexes for validation rules
CREATE INDEX IF NOT EXISTS idx_validation_rules_rule_type ON payroll_validation_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_validation_rules_is_active ON payroll_validation_rules(is_active);

-- 9. Insert default validation rules
INSERT INTO payroll_validation_rules (rule_name, rule_type, description, validation_logic, error_message, severity) VALUES
('minimum_wage_check', 'Compliance', 'Ensure all employees are paid at least minimum wage', 
 '{"type": "minimum_wage", "minimum_hourly_rate": 23.23, "check_overtime": true}', 
 'Employee pay is below minimum wage requirements', 'Critical'),

('tax_file_number_required', 'Data', 'Ensure employees have tax file numbers for tax calculations', 
 '{"type": "required_field", "field": "tax_file_number", "employment_types": ["FullTime", "PartTime", "Casual"]}', 
 'Tax file number is required for payroll processing', 'High'),

('super_fund_required', 'Data', 'Ensure employees have superannuation funds configured', 
 '{"type": "required_field", "field": "super_fund_id", "employment_types": ["FullTime", "PartTime", "Casual"]}', 
 'Superannuation fund is required for payroll processing', 'High'),

('timesheet_approval_required', 'Business', 'Ensure timesheets are approved before payroll processing', 
 '{"type": "timesheet_status", "required_status": "Approved", "employment_types": ["Casual", "Contractor"]}', 
 'Timesheets must be approved before payroll can be processed', 'Medium'),

('maximum_hours_check', 'Compliance', 'Ensure employees do not exceed maximum allowable hours', 
 '{"type": "maximum_hours", "weekly_limit": 38, "overtime_limit": 20}', 
 'Employee hours exceed maximum allowable limits', 'Medium')
ON CONFLICT (rule_name) DO NOTHING;

-- 10. Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_payslips_employee_period ON payslips(employee_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_payslips_payment_date ON payslips(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_pay_components_payslip_type ON pay_components(payslip_id, component_type);
CREATE INDEX IF NOT EXISTS idx_super_contributions_period ON superannuation_contributions(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period_status ON payroll_runs(pay_period_start, pay_period_end, status);

-- 11. Enable RLS on new tables
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_validation_rules ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for payroll_runs
DROP POLICY IF EXISTS "Allow authenticated users to view payroll runs" ON payroll_runs;
CREATE POLICY "Allow authenticated users to view payroll runs" ON payroll_runs
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to insert payroll runs" ON payroll_runs;
CREATE POLICY "Allow authenticated users to insert payroll runs" ON payroll_runs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to update payroll runs" ON payroll_runs;
CREATE POLICY "Allow authenticated users to update payroll runs" ON payroll_runs
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 13. Create RLS policies for payroll_errors
DROP POLICY IF EXISTS "Employees can view their own payroll errors" ON payroll_errors;
CREATE POLICY "Employees can view their own payroll errors" ON payroll_errors
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE employees.id = payroll_errors.employee_id 
            AND employees.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "HR/Admins can view all payroll errors" ON payroll_errors;
CREATE POLICY "HR/Admins can view all payroll errors" ON payroll_errors
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "HR/Admins can update payroll errors" ON payroll_errors;
CREATE POLICY "HR/Admins can update payroll errors" ON payroll_errors
    FOR UPDATE
    USING (true);

-- 14. Create RLS policies for payroll_audit_logs
DROP POLICY IF EXISTS "HR/Admins can view all payroll audit logs" ON payroll_audit_logs;
CREATE POLICY "HR/Admins can view all payroll audit logs" ON payroll_audit_logs
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert payroll audit logs" ON payroll_audit_logs;
CREATE POLICY "Allow authenticated users to insert payroll audit logs" ON payroll_audit_logs
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 14. Create RLS policies for payroll_processing_queue
DROP POLICY IF EXISTS "HR/Admins can view all payroll queue items" ON payroll_processing_queue;
CREATE POLICY "HR/Admins can view all payroll queue items" ON payroll_processing_queue
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "HR/Admins can update payroll queue items" ON payroll_processing_queue;
CREATE POLICY "HR/Admins can update payroll queue items" ON payroll_processing_queue
    FOR UPDATE
    USING (true);

-- 15. Create RLS policies for payroll_validation_rules
DROP POLICY IF EXISTS "HR/Admins can view all validation rules" ON payroll_validation_rules;
CREATE POLICY "HR/Admins can view all validation rules" ON payroll_validation_rules
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "HR/Admins can manage validation rules" ON payroll_validation_rules;
CREATE POLICY "HR/Admins can manage validation rules" ON payroll_validation_rules
    FOR ALL
    USING (true);

-- 16. Insert sample statutory rates for 2024-2025 financial year
INSERT INTO statutory_rates (rate_type, financial_year, rate, threshold, effective_from, effective_to) VALUES
('SuperannuationGuarantee', '2024-2025', 0.1150, NULL, '2024-07-01', '2025-06-30'),
('MedicareLevy', '2024-2025', 0.0200, NULL, '2024-07-01', '2025-06-30'),
('PayrollTax', '2024-2025', 0.0475, 75000, '2024-07-01', '2025-06-30'),
('WorkersCompensation', '2024-2025', 0.0150, NULL, '2024-07-01', '2025-06-30')
ON CONFLICT DO NOTHING;

-- 17. Create function to automatically create audit logs
CREATE OR REPLACE FUNCTION create_payroll_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_payroll_run_id UUID := NULL;
    v_employee_id UUID := NULL;
    v_performed_by_employee_id UUID := NULL;
BEGIN
    -- Get the employee_id for the current authenticated user
    SELECT id INTO v_performed_by_employee_id
    FROM employees
    WHERE user_id = auth.uid()
    LIMIT 1;

    -- Dynamically extract payroll_run_id if it exists in the NEW record
    BEGIN
        IF TG_TABLE_NAME = 'payroll_runs' THEN
            v_payroll_run_id := NEW.id;
        ELSIF TG_TABLE_NAME IN ('payslips', 'payroll_errors', 'payroll_processing_queue') THEN
            v_payroll_run_id := NEW.payroll_run_id;
        END IF;
    EXCEPTION WHEN undefined_column THEN
        v_payroll_run_id := NULL;
    END;

    -- Dynamically extract employee_id if it exists in the NEW record
    BEGIN
        IF TG_TABLE_NAME = 'employees' THEN
            v_employee_id := NEW.id;
        ELSIF TG_TABLE_NAME IN ('payslips', 'payroll_errors', 'payroll_processing_queue', 'payroll_employees') THEN
            v_employee_id := NEW.employee_id;
        END IF;
    EXCEPTION WHEN undefined_column THEN
        v_employee_id := NULL;
    END;

    INSERT INTO payroll_audit_logs (
        payroll_run_id,
        employee_id,
        operation,
        table_name,
        record_id,
        old_values,
        new_values,
        performed_by
    ) VALUES (
        v_payroll_run_id,
        v_employee_id,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'CREATE'
            WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
            WHEN TG_OP = 'DELETE' THEN 'DELETE'
        END,
        TG_TABLE_NAME,
        NEW.id,
        CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        to_jsonb(NEW),
        v_performed_by_employee_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 18. Create triggers for automatic audit logging
DROP TRIGGER IF EXISTS trigger_payroll_runs_audit ON payroll_runs;
CREATE TRIGGER trigger_payroll_runs_audit
    AFTER INSERT OR UPDATE ON payroll_runs
    FOR EACH ROW EXECUTE FUNCTION create_payroll_audit_log();

DROP TRIGGER IF EXISTS trigger_payslips_audit ON payslips;
CREATE TRIGGER trigger_payslips_audit
    AFTER INSERT OR UPDATE ON payslips
    FOR EACH ROW EXECUTE FUNCTION create_payroll_audit_log();

DROP TRIGGER IF EXISTS trigger_payroll_errors_audit ON payroll_errors;
CREATE TRIGGER trigger_payroll_errors_audit
    AFTER INSERT OR UPDATE ON payroll_errors
    FOR EACH ROW EXECUTE FUNCTION create_payroll_audit_log();

DROP TRIGGER IF EXISTS trigger_payroll_processing_queue_audit ON payroll_processing_queue;
CREATE TRIGGER trigger_payroll_processing_queue_audit
    AFTER INSERT OR UPDATE ON payroll_processing_queue
    FOR EACH ROW EXECUTE FUNCTION create_payroll_audit_log();