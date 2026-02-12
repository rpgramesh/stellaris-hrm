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

-- Timesheets Table (Weekly Header)
CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  week_start_date DATE NOT NULL,
  status TEXT DEFAULT 'Draft', -- Draft, Submitted, Approved, Rejected
  total_hours NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, week_start_date)
);

-- Timesheet Rows (Projects in a timesheet)
CREATE TABLE IF NOT EXISTS timesheet_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id UUID REFERENCES timesheets(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id), 
  type TEXT DEFAULT 'Project', -- Project, Break
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Timesheet Entries (Daily hours for a row)
CREATE TABLE IF NOT EXISTS timesheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id UUID REFERENCES timesheet_rows(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  hours NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Templates Table
CREATE TABLE IF NOT EXISTS timesheet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  name TEXT NOT NULL,
  project_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Projects if empty
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
