-- STP Events Table
CREATE TABLE IF NOT EXISTS stp_events (
    id TEXT PRIMARY KEY,
    submission_date TIMESTAMPTZ,
    run_date DATE,
    transaction_id TEXT,
    status TEXT, -- 'Draft', 'Submitted', 'Accepted', 'Rejected'
    employee_count INTEGER,
    total_gross NUMERIC,
    total_tax NUMERIC,
    total_super NUMERIC,
    response_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STP Payees Table
CREATE TABLE IF NOT EXISTS stp_payees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT REFERENCES stp_events(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    ytd_gross NUMERIC,
    ytd_tax NUMERIC,
    ytd_super NUMERIC,
    pay_period_gross NUMERIC,
    pay_period_tax NUMERIC,
    pay_period_super NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stp_payees ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for authenticated users" ON stp_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for authenticated users" ON stp_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for authenticated users" ON stp_events FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON stp_payees FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for authenticated users" ON stp_payees FOR INSERT WITH CHECK (auth.role() = 'authenticated');
