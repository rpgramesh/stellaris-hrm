
-- Add branch_id to departments
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    performed_by UUID REFERENCES auth.users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy for reading audit logs (Admins only - assuming simplistic check for now or all authenticated)
CREATE POLICY "Enable read access for authenticated users" ON audit_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for authenticated users" ON audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
