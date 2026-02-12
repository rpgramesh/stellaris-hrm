-- 1. Create Tables

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  color TEXT DEFAULT 'bg-gray-500',
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Timesheets Table
CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  week_start_date DATE NOT NULL,
  status TEXT DEFAULT 'Draft',
  total_hours NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, week_start_date)
);

-- Timesheet Rows
CREATE TABLE IF NOT EXISTS timesheet_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id UUID REFERENCES timesheets(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id), 
  type TEXT DEFAULT 'Project',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Timesheet Entries
CREATE TABLE IF NOT EXISTS timesheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id UUID REFERENCES timesheet_rows(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  hours NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Templates
CREATE TABLE IF NOT EXISTS timesheet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  name TEXT NOT NULL,
  project_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_templates ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies

-- Projects: Everyone can view active projects
CREATE POLICY "Enable read access for authenticated users" ON projects
  FOR SELECT TO authenticated USING (active = true);

-- Timesheets: Users can view/edit their own
CREATE POLICY "Users can view own timesheets" ON timesheets
  FOR SELECT TO authenticated 
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own timesheets" ON timesheets
  FOR INSERT TO authenticated 
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own timesheets" ON timesheets
  FOR UPDATE TO authenticated 
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- Timesheet Rows: Access via timesheet
CREATE POLICY "Users can view own rows" ON timesheet_rows
  FOR SELECT TO authenticated 
  USING (timesheet_id IN (SELECT id FROM timesheets WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert own rows" ON timesheet_rows
  FOR INSERT TO authenticated 
  WITH CHECK (timesheet_id IN (SELECT id FROM timesheets WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())));

CREATE POLICY "Users can update own rows" ON timesheet_rows
  FOR UPDATE TO authenticated 
  USING (timesheet_id IN (SELECT id FROM timesheets WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())));

CREATE POLICY "Users can delete own rows" ON timesheet_rows
  FOR DELETE TO authenticated 
  USING (timesheet_id IN (SELECT id FROM timesheets WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())));

-- Timesheet Entries: Access via row -> timesheet
CREATE POLICY "Users can view own entries" ON timesheet_entries
  FOR SELECT TO authenticated 
  USING (row_id IN (SELECT id FROM timesheet_rows WHERE timesheet_id IN (SELECT id FROM timesheets WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()))));

CREATE POLICY "Users can insert own entries" ON timesheet_entries
  FOR INSERT TO authenticated 
  WITH CHECK (row_id IN (SELECT id FROM timesheet_rows WHERE timesheet_id IN (SELECT id FROM timesheets WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()))));

CREATE POLICY "Users can update own entries" ON timesheet_entries
  FOR UPDATE TO authenticated 
  USING (row_id IN (SELECT id FROM timesheet_rows WHERE timesheet_id IN (SELECT id FROM timesheets WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()))));

CREATE POLICY "Users can delete own entries" ON timesheet_entries
  FOR DELETE TO authenticated 
  USING (row_id IN (SELECT id FROM timesheet_rows WHERE timesheet_id IN (SELECT id FROM timesheets WHERE employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()))));


-- 4. Seed Data (Projects)
INSERT INTO projects (name, code, color)
SELECT 'Project Y', 'PRJ-Y', 'bg-blue-500'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Project Y');

INSERT INTO projects (name, code, color)
SELECT 'Project X', 'PRJ-X', 'bg-pink-500'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Project X');

INSERT INTO projects (name, code, color)
SELECT 'Office', 'OFFICE', 'bg-yellow-500'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Office');

INSERT INTO projects (name, code, color)
SELECT 'Internal', 'INT', 'bg-purple-500'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Internal');

INSERT INTO projects (name, code, color)
SELECT 'Training', 'TRN', 'bg-green-500'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Training');
