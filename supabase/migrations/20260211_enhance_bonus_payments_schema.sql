-- Enhance bonus_payments table to match application requirements
ALTER TABLE bonus_payments
ADD COLUMN IF NOT EXISTS tax_withheld NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS superannuation_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS calculation_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_reportable BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS pay_period_start DATE,
ADD COLUMN IF NOT EXISTS pay_period_end DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'calculated';

-- Drop restrictive constraints to allow full application logic
ALTER TABLE bonus_payments DROP CONSTRAINT IF EXISTS bonus_payments_bonus_type_check;
ALTER TABLE bonus_payments DROP CONSTRAINT IF EXISTS bonus_payments_tax_method_check;
