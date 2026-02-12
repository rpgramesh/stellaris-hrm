-- Create Awards Table
CREATE TABLE IF NOT EXISTS awards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    industry TEXT,
    version TEXT DEFAULT '1.0',
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Award Rules Table
CREATE TABLE IF NOT EXISTS award_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    award_id UUID REFERENCES awards(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL, -- PenaltyRate, Allowance, ShiftLoading, Overtime
    name TEXT NOT NULL,
    description TEXT,
    
    -- Conditions (JSONB for flexibility)
    conditions JSONB DEFAULT '{}',
    
    -- Calculation (JSONB for flexibility)
    calculation JSONB DEFAULT '{}',
    
    -- Explicit columns for engine compatibility
    classification TEXT,
    day_type TEXT, -- weekday, weekend, saturday, sunday
    time_from TEXT, -- Storing as text 'HH:MM' to match interface expectations if needed
    time_to TEXT,
    penalty_percentage NUMERIC(5,2),
    flat_amount NUMERIC(10,2),
    multiplier NUMERIC(4,2),
    allowance_type TEXT,
    shift_type TEXT,
    overtime_type TEXT,
    
    priority INTEGER DEFAULT 0,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_awards_code ON awards(code);
CREATE INDEX IF NOT EXISTS idx_award_rules_award_id ON award_rules(award_id);
CREATE INDEX IF NOT EXISTS idx_award_rules_type ON award_rules(rule_type);

-- Enable RLS
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_rules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read access for awards" ON awards FOR SELECT USING (true);
CREATE POLICY "Public read access for award_rules" ON award_rules FOR SELECT USING (true);

-- Admin write access
CREATE POLICY "Admin write access for awards" ON awards FOR ALL USING (
    auth.uid() IN (SELECT id FROM employees WHERE role IN ('HR Admin', 'Super Admin'))
);
CREATE POLICY "Admin write access for award_rules" ON award_rules FOR ALL USING (
    auth.uid() IN (SELECT id FROM employees WHERE role IN ('HR Admin', 'Super Admin'))
);
