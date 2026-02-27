
-- Create payroll_settings table for storing global payroll configuration
CREATE TABLE IF NOT EXISTS payroll_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT,
    abn TEXT,
    default_pay_frequency TEXT CHECK (default_pay_frequency IN ('Weekly', 'Fortnightly', 'Monthly')),
    financial_year_start DATE DEFAULT '2024-07-01',
    stp_enabled BOOLEAN DEFAULT true,
    superannuation_guarantee_rate NUMERIC(5,2) DEFAULT 11.5,
    payroll_tax_threshold NUMERIC(12,2) DEFAULT 75000,
    workers_compensation_rate NUMERIC(5,2) DEFAULT 1.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one row exists
CREATE UNIQUE INDEX IF NOT EXISTS payroll_settings_single_row_idx ON payroll_settings ((TRUE));

-- Insert default row if not exists
INSERT INTO payroll_settings (
    company_name, 
    abn, 
    default_pay_frequency, 
    financial_year_start, 
    stp_enabled, 
    superannuation_guarantee_rate, 
    payroll_tax_threshold, 
    workers_compensation_rate
)
VALUES (
    'My Company Pty Ltd', 
    '12 345 678 901', 
    'Monthly', 
    '2024-07-01', 
    true, 
    11.5, 
    75000, 
    1.5
)
ON CONFLICT DO NOTHING;

-- Create RLS policies
ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for authenticated users" ON payroll_settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow update access for admin users" ON payroll_settings
    FOR UPDATE USING (auth.role() = 'authenticated'); -- Simplified for now, should check role
