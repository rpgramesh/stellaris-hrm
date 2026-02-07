
-- Create compliance tables

-- Compliance Items Table
CREATE TABLE IF NOT EXISTS compliance_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('Fair Work', 'NES', 'Modern Award', 'Policy')),
  status TEXT CHECK (status IN ('Compliant', 'Non-Compliant', 'At Risk', 'Pending Review')),
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_check_due TIMESTAMP WITH TIME ZONE,
  assignee UUID REFERENCES employees(id),
  priority TEXT CHECK (priority IN ('High', 'Medium', 'Low')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Checklists Table
CREATE TABLE IF NOT EXISTS compliance_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  standard TEXT NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Checklist Items Table
CREATE TABLE IF NOT EXISTS compliance_checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID REFERENCES compliance_checklists(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  is_compliant BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checklist_items ENABLE ROW LEVEL SECURITY;

-- Create policies (simplified for now)
CREATE POLICY "Enable read access for all authenticated users" ON compliance_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for all authenticated users" ON compliance_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for all authenticated users" ON compliance_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete access for all authenticated users" ON compliance_items FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all authenticated users" ON compliance_checklists FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for all authenticated users" ON compliance_checklists FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for all authenticated users" ON compliance_checklists FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete access for all authenticated users" ON compliance_checklists FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all authenticated users" ON compliance_checklist_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for all authenticated users" ON compliance_checklist_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for all authenticated users" ON compliance_checklist_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete access for all authenticated users" ON compliance_checklist_items FOR DELETE USING (auth.role() = 'authenticated');

-- Create triggers for updated_at
CREATE TRIGGER update_compliance_items_updated_at BEFORE UPDATE ON compliance_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_checklists_updated_at BEFORE UPDATE ON compliance_checklists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_checklist_items_updated_at BEFORE UPDATE ON compliance_checklist_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
