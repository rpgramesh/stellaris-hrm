-- Add manager_id to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES employees(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_projects_manager_id ON projects(manager_id);
