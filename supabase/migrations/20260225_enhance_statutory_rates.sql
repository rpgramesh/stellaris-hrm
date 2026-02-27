
-- Migration to enhance statutory_rates and add missing statutory tables
-- This migration adds missing columns to statutory_rates and creates other tables used by StatutoryTablesService

-- 1. Enhance statutory_rates
ALTER TABLE statutory_rates 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS calculation_base NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS maximum_amount NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS applicable_states TEXT[],
ADD COLUMN IF NOT EXISTS applicable_industries TEXT[],
ADD COLUMN IF NOT EXISTS applicable_employment_types TEXT[],
ADD COLUMN IF NOT EXISTS liability_account TEXT,
ADD COLUMN IF NOT EXISTS expense_account TEXT,
ADD COLUMN IF NOT EXISTS is_reportable BOOLEAN DEFAULT TRUE;

-- 1.1 Update rate_type check constraint to include all types
ALTER TABLE statutory_rates DROP CONSTRAINT IF EXISTS statutory_rates_rate_type_check;
ALTER TABLE statutory_rates ADD CONSTRAINT statutory_rates_rate_type_check CHECK (rate_type IN (
    'payg-withholding', 'superannuation-guarantee', 'payroll-tax', 'workers-compensation',
    'help-debt', 'sfss-debt', 'medicare-levy', 'medicare-levy-surcharge',
    'leave-loading-tax', 'overtime-tax', 'allowance-tax', 'fringe-benefits-tax',
    'payroll-tax-exemption', 'superannuation-co-contribution', 'low-income-super-contribution',
    'spouse-super-contribution', 'government-super-contribution',
    -- Also keep CamelCase versions for backward compatibility if needed
    'SuperannuationGuarantee', 'MedicareLevy', 'PayrollTax', 'WorkersCompensation'
));

-- 2. Create statutory_thresholds
CREATE TABLE IF NOT EXISTS statutory_thresholds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contribution_type TEXT NOT NULL,
    threshold_type TEXT NOT NULL CHECK (threshold_type IN ('income', 'wages', 'age', 'service', 'hours')),
    threshold_value NUMERIC(12,2) NOT NULL,
    comparison_operator TEXT NOT NULL CHECK (comparison_operator IN ('>', '>=', '<', '<=', '=', '!=')),
    applicable_year VARCHAR(9) NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
    effective_to TIMESTAMP WITH TIME ZONE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create statutory_exemptions
CREATE TABLE IF NOT EXISTS statutory_exemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contribution_type TEXT NOT NULL,
    exemption_type TEXT NOT NULL CHECK (exemption_type IN ('employee-type', 'age', 'income', 'service', 'industry', 'location', 'disability', 'veteran')),
    exemption_criteria JSONB NOT NULL,
    exemption_amount NUMERIC(12,2),
    exemption_percentage NUMERIC(5,4),
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
    effective_to TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create statutory_payment_schedules
CREATE TABLE IF NOT EXISTS statutory_payment_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES company_information(id),
    contribution_type TEXT NOT NULL,
    payment_frequency TEXT NOT NULL CHECK (payment_frequency IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'annually')),
    payment_day INTEGER NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('direct-debit', 'bank-transfer', 'cheque', 'online')),
    bank_account_details JSONB,
    contact_details JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
    effective_to TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create statutory_reporting_requirements
CREATE TABLE IF NOT EXISTS statutory_reporting_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contribution_type TEXT NOT NULL,
    report_name TEXT NOT NULL,
    reporting_authority TEXT NOT NULL,
    reporting_frequency TEXT NOT NULL CHECK (reporting_frequency IN ('weekly', 'fortnightly', 'monthly', 'quarterly', 'annually', 'adhoc')),
    due_date INTEGER NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('xml', 'csv', 'pdf', 'online', 'paper')),
    method TEXT NOT NULL CHECK (method IN ('online', 'email', 'post', 'in-person')),
    required_data TEXT[],
    validation_rules JSONB,
    penalties JSONB,
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
    effective_to TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable RLS
ALTER TABLE statutory_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE statutory_exemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE statutory_payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE statutory_reporting_requirements ENABLE ROW LEVEL SECURITY;

-- 7. Create Policies
DROP POLICY IF EXISTS "Allow authenticated users to view statutory tables" ON statutory_thresholds;
CREATE POLICY "Allow authenticated users to view statutory tables" ON statutory_thresholds FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to view statutory exemptions" ON statutory_exemptions;
CREATE POLICY "Allow authenticated users to view statutory exemptions" ON statutory_exemptions FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to view payment schedules" ON statutory_payment_schedules;
CREATE POLICY "Allow authenticated users to view payment schedules" ON statutory_payment_schedules FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to view reporting requirements" ON statutory_reporting_requirements;
CREATE POLICY "Allow authenticated users to view reporting requirements" ON statutory_reporting_requirements FOR SELECT USING (auth.role() = 'authenticated');

-- 8. Insert sample data for PAYG withholding (2024-2025)
INSERT INTO statutory_rates (rate_type, financial_year, rate, threshold, name, description, effective_from, effective_to) VALUES
('payg-withholding', '2024-2025', 0.00, 0, 'Tax Free Threshold', 'Income up to $18,200', '2024-07-01', '2025-06-30'),
('payg-withholding', '2024-2025', 0.19, 18200, 'Bracket 1', 'Income $18,201 – $45,000', '2024-07-01', '2025-06-30'),
('payg-withholding', '2024-2025', 0.325, 45000, 'Bracket 2', 'Income $45,001 – $120,000', '2024-07-01', '2025-06-30'),
('payg-withholding', '2024-2025', 0.37, 120000, 'Bracket 3', 'Income $120,001 – $180,000', '2024-07-01', '2025-06-30'),
('payg-withholding', '2024-2025', 0.45, 180000, 'Bracket 4', 'Income over $180,000', '2024-07-01', '2025-06-30')
ON CONFLICT DO NOTHING;

-- Update existing records if any
UPDATE statutory_rates SET name = rate_type WHERE name IS NULL;
