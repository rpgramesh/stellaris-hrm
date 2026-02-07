-- Fix for missing columns in payslips table
-- Detected missing: period_start, period_end, allowances, overtime, payg_tax, payment_date, status

ALTER TABLE payslips 
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS allowances NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payg_tax NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Draft';

-- Re-apply RLS policies just in case (optional, but safe)
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON payslips;
CREATE POLICY "Enable read access for authenticated users" ON payslips
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON payslips;
CREATE POLICY "Enable insert access for authenticated users" ON payslips
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON payslips;
CREATE POLICY "Enable update access for authenticated users" ON payslips
    FOR UPDATE
    TO authenticated
    USING (true);
