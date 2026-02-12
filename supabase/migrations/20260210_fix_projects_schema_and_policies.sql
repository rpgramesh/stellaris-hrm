-- 1. Ensure manager_id exists (Fixes "column manager_id does not exist")
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES employees(id);

CREATE INDEX IF NOT EXISTS idx_projects_manager_id ON projects(manager_id);

-- 2. Fix RLS Policies for Projects (Fixes "new row violates row-level security policy")
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON projects;

-- Create full access policies for authenticated users
-- (Allows creating/editing projects)

CREATE POLICY "Enable read access for authenticated users" ON projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON projects
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON projects
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON projects
  FOR DELETE TO authenticated USING (true);
