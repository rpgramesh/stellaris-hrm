
-- Create workday_configurations table to store working hours per day
CREATE TABLE IF NOT EXISTS workday_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_name TEXT NOT NULL UNIQUE, -- 'monday', 'tuesday', etc.
    is_active BOOLEAN DEFAULT true,
    hours NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workday_configurations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for authenticated users" ON workday_configurations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable update access for authenticated users" ON workday_configurations
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON workday_configurations
    FOR INSERT TO authenticated WITH CHECK (true);

-- Seed default data
INSERT INTO workday_configurations (day_name, is_active, hours) VALUES
('monday', true, 7.6),
('tuesday', true, 7.6),
('wednesday', true, 7.6),
('thursday', true, 7.6),
('friday', true, 7.6),
('saturday', false, 0),
('sunday', false, 0)
ON CONFLICT (day_name) DO NOTHING;
