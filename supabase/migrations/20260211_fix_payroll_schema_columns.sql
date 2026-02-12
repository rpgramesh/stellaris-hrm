-- Fix missing columns in payroll_runs if table already existed
DO $$
BEGIN
    -- Add stp_submission_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_runs' AND column_name = 'stp_submission_id') THEN
        ALTER TABLE payroll_runs ADD COLUMN stp_submission_id TEXT;
    END IF;

    -- Add stp_status if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_runs' AND column_name = 'stp_status') THEN
        ALTER TABLE payroll_runs ADD COLUMN stp_status TEXT CHECK (stp_status IN ('Pending', 'Submitted', 'Accepted', 'Rejected'));
    END IF;

    -- Add processed_by if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payroll_runs' AND column_name = 'processed_by') THEN
        ALTER TABLE payroll_runs ADD COLUMN processed_by UUID REFERENCES employees(id);
    END IF;
END $$;

-- Ensure super_funds exists
CREATE TABLE IF NOT EXISTS super_funds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fund_name TEXT NOT NULL,
    fund_abn VARCHAR(11) NOT NULL,
    usi VARCHAR(20),
    product_name TEXT,
    contribution_restrictions JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure superannuation_contributions exists
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

-- Ensure stp_submissions exists
CREATE TABLE IF NOT EXISTS stp_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
    submission_type TEXT NOT NULL CHECK (submission_type IN ('PayEvent', 'UpdateEvent', 'FullFileReplacement')),
    submission_id TEXT,
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

-- Enable RLS for new tables
ALTER TABLE super_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE superannuation_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stp_submissions ENABLE ROW LEVEL SECURITY;

-- Add basic policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'super_funds' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON super_funds FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'superannuation_contributions' AND policyname = 'Enable read access for authenticated users') THEN
        CREATE POLICY "Enable read access for authenticated users" ON superannuation_contributions FOR SELECT USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stp_submissions' AND policyname = 'Enable read access for authenticated users') THEN
        CREATE POLICY "Enable read access for authenticated users" ON stp_submissions FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stp_submissions' AND policyname = 'Enable insert access for authenticated users') THEN
        CREATE POLICY "Enable insert access for authenticated users" ON stp_submissions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;
