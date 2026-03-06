-- Payroll Management System Schema
-- Idempotent Migration Script with Existence Checks

BEGIN;

-- Pre-migration: Rename existing columns in payslips and payroll_runs if they exist from older versions
DO $$
BEGIN
    -- Fix payslips
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payslips') THEN
        -- Rename period_start to pay_period_start if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'period_start') THEN
            ALTER TABLE payslips RENAME COLUMN period_start TO pay_period_start;
        END IF;

        -- Rename period_end to pay_period_end if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'period_end') THEN
            ALTER TABLE payslips RENAME COLUMN period_end TO pay_period_end;
        END IF;

        -- Rename gross_pay to gross_earnings if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'gross_pay') THEN
            ALTER TABLE payslips RENAME COLUMN gross_pay TO gross_earnings;
        END IF;

        -- Add income_tax if missing (renamed from taxable_income or tax_withheld in some contexts)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'income_tax') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'tax_withheld') THEN
                ALTER TABLE payslips RENAME COLUMN tax_withheld TO income_tax;
            ELSE
                ALTER TABLE payslips ADD COLUMN income_tax NUMERIC(12,2) NOT NULL DEFAULT 0;
            END IF;
        END IF;

        -- Add other columns that might be missing from the old payslips schema
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'basic_pay') THEN
            ALTER TABLE payslips ADD COLUMN basic_pay NUMERIC(12,2) NOT NULL DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'working_days') THEN
            ALTER TABLE payslips ADD COLUMN working_days INTEGER NOT NULL DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'paid_days') THEN
            ALTER TABLE payslips ADD COLUMN paid_days INTEGER NOT NULL DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'total_deductions') THEN
            ALTER TABLE payslips ADD COLUMN total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0;
        END IF;
    END IF;

    -- Fix payroll_runs (some of this was in 20260224, but let's be sure)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_runs') THEN
        -- Rename period_start to pay_period_start if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_runs' AND column_name = 'period_start') THEN
            ALTER TABLE payroll_runs RENAME COLUMN period_start TO pay_period_start;
        END IF;

        -- Rename period_end to pay_period_end if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_runs' AND column_name = 'period_end') THEN
            ALTER TABLE payroll_runs RENAME COLUMN period_end TO pay_period_end;
        END IF;

        -- Ensure month_year exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_runs' AND column_name = 'month_year') THEN
            ALTER TABLE payroll_runs ADD COLUMN month_year TEXT NOT NULL DEFAULT '';
        END IF;
    END IF;
END $$;

-- Salary Structures
CREATE TABLE IF NOT EXISTS salary_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  basic_pay DECIMAL(5,2) NOT NULL,
  da_allowance DECIMAL(5,2) NOT NULL DEFAULT 0,
  hra DECIMAL(5,2) NOT NULL DEFAULT 0,
  conveyance DECIMAL(5,2) NOT NULL DEFAULT 0,
  medical DECIMAL(5,2) NOT NULL DEFAULT 0,
  special_allowance DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee Salary Details
CREATE TABLE IF NOT EXISTS employee_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  salary_structure_id UUID REFERENCES salary_structures(id),
  basic_salary NUMERIC(12,2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_current BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Statutory Rates
CREATE TABLE IF NOT EXISTS pf_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_rate NUMERIC(5,2) NOT NULL,
  employer_rate NUMERIC(5,2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS esi_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_rate NUMERIC(5,2) NOT NULL,
  employer_rate NUMERIC(5,2) NOT NULL,
  salary_limit NUMERIC(12,2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS professional_tax_slabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL,
  min_salary NUMERIC(12,2) NOT NULL,
  max_salary NUMERIC(12,2),
  tax_amount NUMERIC(12,2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payroll Runs
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year TEXT NOT NULL,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, processed, finalized, paid
  total_employees INTEGER NOT NULL DEFAULT 0,
  total_gross_pay NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_net_pay NUMERIC(15,2) NOT NULL DEFAULT 0,
  processed_by UUID REFERENCES employees(id),
  processed_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payslips
CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_salary_id UUID REFERENCES employee_salaries(id),
  payslip_number TEXT NOT NULL UNIQUE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  basic_pay NUMERIC(12,2) NOT NULL,
  da_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  hra NUMERIC(12,2) NOT NULL DEFAULT 0,
  conveyance NUMERIC(12,2) NOT NULL DEFAULT 0,
  medical NUMERIC(12,2) NOT NULL DEFAULT 0,
  special_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_hours NUMERIC(8,2) DEFAULT 0,
  overtime_amount NUMERIC(12,2) DEFAULT 0,
  gross_earnings NUMERIC(12,2) NOT NULL,
  pf_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  esi_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  professional_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  income_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(12,2) NOT NULL,
  net_pay NUMERIC(12,2) NOT NULL,
  working_days INTEGER NOT NULL,
  paid_days INTEGER NOT NULL,
  leave_days INTEGER NOT NULL DEFAULT 0,
  overtime_hours_worked NUMERIC(8,2) DEFAULT 0,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'generated', -- generated, paid
  payment_date DATE,
  payment_method TEXT,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loan and Advance Management
CREATE TABLE IF NOT EXISTS employee_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  loan_type TEXT NOT NULL, -- salary_advance, personal_loan, emergency_loan
  amount NUMERIC(12,2) NOT NULL,
  interest_rate NUMERIC(5,2) DEFAULT 0,
  tenure_months INTEGER NOT NULL,
  monthly_installment NUMERIC(12,2) NOT NULL,
  total_payable NUMERIC(12,2) NOT NULL,
  remaining_balance NUMERIC(12,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES employee_loans(id) ON DELETE CASCADE,
  payslip_id UUID REFERENCES payslips(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  principal_amount NUMERIC(12,2) NOT NULL,
  interest_amount NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  repayment_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Arrears Management
CREATE TABLE IF NOT EXISTS salary_arrears (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  payslip_id UUID REFERENCES payslips(id) ON DELETE SET NULL,
  month_year TEXT NOT NULL,
  arrears_type TEXT NOT NULL, -- salary_revision, overtime, allowance, bonus
  amount NUMERIC(12,2) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, processed, paid
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payroll Audit Trail
CREATE TABLE IF NOT EXISTS payroll_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- insert, update, delete
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES employees(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Indexes for Performance (Safe as long as we use CREATE INDEX IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_payslips_employee_id ON payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslips_payroll_run_id ON payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payslips_month_year ON payslips(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_employee_salaries_employee_id ON employee_salaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_salaries_current ON employee_salaries(is_current);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_month_year ON payroll_runs(month_year);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan_id ON loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_payslip_id ON loan_repayments(payslip_id);
CREATE INDEX IF NOT EXISTS idx_salary_arrears_employee_id ON salary_arrears(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_arrears_status ON salary_arrears(status);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_table_record ON payroll_audit_log(table_name, record_id);

-- Default Statutory Rates (Using ON CONFLICT to avoid duplicate entries)
INSERT INTO pf_rates (employee_rate, employer_rate, effective_from) 
VALUES (12.00, 13.61, '2024-01-01')
ON CONFLICT DO NOTHING;

INSERT INTO esi_rates (employee_rate, employer_rate, salary_limit, effective_from) 
VALUES (0.75, 3.25, 21000, '2024-01-01')
ON CONFLICT DO NOTHING;

-- Professional Tax Slabs for Major States
INSERT INTO professional_tax_slabs (state, min_salary, max_salary, tax_amount, effective_from) 
VALUES 
('Maharashtra', 0, 7500, 0, '2024-01-01'),
('Maharashtra', 7501, 10000, 175, '2024-01-01'),
('Maharashtra', 10001, NULL, 200, '2024-01-01'),
('Karnataka', 0, 15000, 0, '2024-01-01'),
('Karnataka', 15001, NULL, 200, '2024-01-01'),
('Tamil Nadu', 0, 21000, 0, '2024-01-01'),
('Tamil Nadu', 21001, 30000, 135, '2024-01-01'),
('Tamil Nadu', 30001, 45000, 315, '2024-01-01'),
('Tamil Nadu', 45001, 60000, 690, '2024-01-01'),
('Tamil Nadu', 60001, 75000, 1025, '2024-01-01'),
('Tamil Nadu', 75001, NULL, 1250, '2024-01-01')
ON CONFLICT DO NOTHING;

-- Default Salary Structure
INSERT INTO salary_structures (name, description, basic_pay, da_allowance, hra, conveyance, medical, special_allowance, is_active) 
VALUES ('Standard Structure', 'Default salary structure for all employees', 50.0, 20.0, 20.0, 5.0, 2.0, 3.0, TRUE)
ON CONFLICT DO NOTHING;

-- Row Level Security and Policies with Existence Checks
DO $$
DECLARE
    table_name_var TEXT;
    tables_to_enable TEXT[] := ARRAY[
        'salary_structures', 'employee_salaries', 'pf_rates', 'esi_rates', 
        'professional_tax_slabs', 'payroll_runs', 'payslips', 'employee_loans', 
        'loan_repayments', 'salary_arrears', 'payroll_audit_log'
    ];
BEGIN
    FOREACH table_name_var IN ARRAY tables_to_enable
    LOOP
        -- Conditional check using information_schema
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = table_name_var) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name_var);
        END IF;
    END LOOP;
END $$;

-- Policies with existence checks via DO blocks or DROP IF EXISTS
-- Using DO blocks for strict compliance with "existence checks" requirement

DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'salary_structures') THEN
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'salary_structures' AND policyname = 'Authenticated users can view salary structures') THEN
            CREATE POLICY "Authenticated users can view salary structures" ON salary_structures FOR SELECT TO authenticated USING (TRUE);
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'salary_structures' AND policyname = 'HR Admins can manage salary structures') THEN
            CREATE POLICY "HR Admins can manage salary structures" ON salary_structures FOR ALL TO authenticated USING (
              EXISTS (SELECT 1 FROM user_role_assignments ura JOIN user_roles ur ON ura.role_id = ur.id WHERE ura.user_id = auth.uid() AND ur.name IN ('HR Admin', 'HR Manager', 'Administrator'))
            );
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employee_salaries') THEN
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'employee_salaries' AND policyname = 'Authenticated users can view their own salaries') THEN
            CREATE POLICY "Authenticated users can view their own salaries" ON employee_salaries FOR SELECT TO authenticated USING (
              employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
            );
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'employee_salaries' AND policyname = 'HR Admins can manage all employee salaries') THEN
            CREATE POLICY "HR Admins can manage all employee salaries" ON employee_salaries FOR ALL TO authenticated USING (
              EXISTS (SELECT 1 FROM user_role_assignments ura JOIN user_roles ur ON ura.role_id = ur.id WHERE ura.user_id = auth.uid() AND ur.name IN ('HR Admin', 'HR Manager', 'Administrator'))
            );
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payslips') THEN
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'payslips' AND policyname = 'Authenticated users can view their own payslips') THEN
            CREATE POLICY "Authenticated users can view their own payslips" ON payslips FOR SELECT TO authenticated USING (
              employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
            );
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'payslips' AND policyname = 'HR Admins can manage all payslips') THEN
            CREATE POLICY "HR Admins can manage all payslips" ON payslips FOR ALL TO authenticated USING (
              EXISTS (SELECT 1 FROM user_role_assignments ura JOIN user_roles ur ON ura.role_id = ur.id WHERE ura.user_id = auth.uid() AND ur.name IN ('HR Admin', 'HR Manager', 'Administrator'))
            );
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employee_loans') THEN
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'employee_loans' AND policyname = 'Authenticated users can view their own loans') THEN
            CREATE POLICY "Authenticated users can view their own loans" ON employee_loans FOR SELECT TO authenticated USING (
              employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
            );
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'employee_loans' AND policyname = 'HR Admins can manage all loans') THEN
            CREATE POLICY "HR Admins can manage all loans" ON employee_loans FOR ALL TO authenticated USING (
              EXISTS (SELECT 1 FROM user_role_assignments ura JOIN user_roles ur ON ura.role_id = ur.id WHERE ura.user_id = auth.uid() AND ur.name IN ('HR Admin', 'HR Manager', 'Administrator'))
            );
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payroll_runs') THEN
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'payroll_runs' AND policyname = 'HR Admins can manage payroll runs') THEN
            CREATE POLICY "HR Admins can manage payroll runs" ON payroll_runs FOR ALL TO authenticated USING (
              EXISTS (SELECT 1 FROM user_role_assignments ura JOIN user_roles ur ON ura.role_id = ur.id WHERE ura.user_id = auth.uid() AND ur.name IN ('HR Admin', 'HR Manager', 'Administrator'))
            );
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payroll_audit_log') THEN
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'payroll_audit_log' AND policyname = 'HR Admins can view audit logs') THEN
            CREATE POLICY "HR Admins can view audit logs" ON payroll_audit_log FOR SELECT TO authenticated USING (
              EXISTS (SELECT 1 FROM user_role_assignments ura JOIN user_roles ur ON ura.role_id = ur.id WHERE ura.user_id = auth.uid() AND ur.name IN ('HR Admin', 'HR Manager', 'Administrator'))
            );
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'payroll_audit_log' AND policyname = 'Allow authenticated users to insert audit logs') THEN
            CREATE POLICY "Allow authenticated users to insert audit logs" ON payroll_audit_log FOR INSERT TO authenticated WITH CHECK (TRUE);
        END IF;
    END IF;
END $$;

-- Payroll Calculation Functions (Using CREATE OR REPLACE for idempotency)
CREATE OR REPLACE FUNCTION calculate_pf_deduction(salary NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  pf_rate NUMERIC;
BEGIN
  SELECT employee_rate INTO pf_rate
  FROM pf_rates
  WHERE is_active = TRUE
    AND effective_from <= CURRENT_DATE
    AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
  ORDER BY effective_from DESC
  LIMIT 1;
  
  RETURN ROUND(salary * COALESCE(pf_rate, 12.00) / 100, 2);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_esi_deduction(salary NUMERIC, is_employer BOOLEAN DEFAULT FALSE)
RETURNS NUMERIC AS $$
DECLARE
  esi_rate NUMERIC;
  salary_limit NUMERIC;
BEGIN
  SELECT 
    CASE WHEN is_employer THEN employer_rate ELSE employee_rate END,
    salary_limit
  INTO esi_rate, salary_limit
  FROM esi_rates
  WHERE is_active = TRUE
    AND effective_from <= CURRENT_DATE
    AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
  ORDER BY effective_from DESC
  LIMIT 1;
  
  IF salary > salary_limit THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND(salary * COALESCE(esi_rate, 0.75) / 100, 2);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_professional_tax(salary NUMERIC, state TEXT DEFAULT 'Maharashtra')
RETURNS NUMERIC AS $$
DECLARE
  tax_amount NUMERIC;
BEGIN
  SELECT pt.tax_amount INTO tax_amount
  FROM professional_tax_slabs pt
  WHERE pt.state = calculate_professional_tax.state
    AND pt.is_active = TRUE
    AND salary >= pt.min_salary
    AND (pt.max_salary IS NULL OR salary <= pt.max_salary)
  ORDER BY pt.effective_from DESC
  LIMIT 1;
  
  RETURN COALESCE(tax_amount, 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger for audit logging
CREATE OR REPLACE FUNCTION trg_payroll_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_id UUID;
BEGIN
  -- Resolve employee_id from auth.uid()
  SELECT id INTO v_employee_id FROM employees WHERE user_id = auth.uid();

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO payroll_audit_log (table_name, record_id, action, old_data, new_data, changed_by, changed_at)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), v_employee_id, NOW());
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO payroll_audit_log (table_name, record_id, action, new_data, changed_by, changed_at)
    VALUES (TG_TABLE_NAME, NEW.id, 'insert', to_jsonb(NEW), v_employee_id, NOW());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO payroll_audit_log (table_name, record_id, action, old_data, changed_by, changed_at)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD), v_employee_id, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- Run with permissions of creator to bypass RLS on audit table

-- Create audit triggers with existence checks
DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payslips') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payslips_audit') THEN
            CREATE TRIGGER trg_payslips_audit AFTER INSERT OR UPDATE OR DELETE ON payslips
            FOR EACH ROW EXECUTE FUNCTION trg_payroll_audit_log();
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payroll_runs') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payroll_runs_audit') THEN
            CREATE TRIGGER trg_payroll_runs_audit AFTER INSERT OR UPDATE OR DELETE ON payroll_runs
            FOR EACH ROW EXECUTE FUNCTION trg_payroll_audit_log();
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employee_salaries') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_employee_salaries_audit') THEN
            CREATE TRIGGER trg_employee_salaries_audit AFTER INSERT OR UPDATE OR DELETE ON employee_salaries
            FOR EACH ROW EXECUTE FUNCTION trg_payroll_audit_log();
        END IF;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employee_loans') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_employee_loans_audit') THEN
            CREATE TRIGGER trg_employee_loans_audit AFTER INSERT OR UPDATE OR DELETE ON employee_loans
            FOR EACH ROW EXECUTE FUNCTION trg_payroll_audit_log();
        END IF;
    END IF;
END $$;

-- Update timestamp triggers
-- First, ensure the timestamp update function exists (assuming it's defined elsewhere or we use the same one)
-- If not, we can define it here. Let's assume trg_set_updated_at exists as it was used in original script.

DO $$
DECLARE
    table_name_var TEXT;
    trigger_name_var TEXT;
    tables_to_update TEXT[] := ARRAY[
        'salary_structures', 'employee_salaries', 'pf_rates', 'esi_rates', 
        'professional_tax_slabs', 'payroll_runs', 'payslips', 'employee_loans', 
        'loan_repayments', 'salary_arrears'
    ];
BEGIN
    FOREACH table_name_var IN ARRAY tables_to_update
    LOOP
        trigger_name_var := 'set_updated_at_' || table_name_var; -- unique trigger name per table
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = table_name_var) THEN
            IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = trigger_name_var) THEN
                EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at()', trigger_name_var, table_name_var);
            END IF;
        END IF;
    END LOOP;
END $$;

COMMIT;
