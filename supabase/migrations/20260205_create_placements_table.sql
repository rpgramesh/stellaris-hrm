-- Create placements table if it doesn't exist
CREATE TABLE IF NOT EXISTS placements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    effective_date DATE NOT NULL,
    job_position_id UUID REFERENCES job_positions(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    level_id UUID REFERENCES job_levels(id) ON DELETE SET NULL,
    line_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE placements ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Enable access for authenticated users" ON placements;
CREATE POLICY "Enable access for authenticated users" ON placements
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Ensure updated_at is updated
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_placements_updated_at ON placements;
CREATE TRIGGER update_placements_updated_at
    BEFORE UPDATE ON placements
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
