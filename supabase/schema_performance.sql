
-- Performance Management Schema

-- Performance Reviews Table
CREATE TABLE IF NOT EXISTS performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    reviewer_id UUID REFERENCES employees(id),
    cycle TEXT NOT NULL, -- e.g., 'Q1 2024', 'Annual 2023'
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Self Review', 'Manager Review', 'Completed'
    self_assessment JSONB DEFAULT '{}', -- Stores strengths, improvements, achievements, goals
    manager_assessment JSONB DEFAULT '{}', -- Stores strengths, improvements, achievements, goals, overallRating
    final_rating NUMERIC,
    recommendations TEXT[],
    development_plan TEXT[],
    promotion_recommendation TEXT, -- 'Yes', 'No', 'Maybe'
    completed_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KPIs Table
CREATE TABLE IF NOT EXISTS kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT, -- 'Productivity', 'Quality', 'Process', etc.
    target TEXT,
    current_value TEXT,
    unit TEXT, -- 'Percentage', 'Count', 'Currency', etc.
    weight NUMERIC,
    progress NUMERIC DEFAULT 0,
    due_date DATE,
    status TEXT DEFAULT 'In Progress', -- 'In Progress', 'Completed', 'At Risk', 'Overdue'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OKRs Table
CREATE TABLE IF NOT EXISTS okrs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    quarter TEXT, -- e.g., 'Q1 2024'
    objective TEXT NOT NULL,
    description TEXT,
    progress NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'In Progress',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Key Results Table
CREATE TABLE IF NOT EXISTS key_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    okr_id UUID REFERENCES okrs(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    target NUMERIC,
    current NUMERIC,
    unit TEXT,
    progress NUMERIC DEFAULT 0,
    confidence NUMERIC, -- 0-100
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 360 Feedback Table
CREATE TABLE IF NOT EXISTS feedback_360 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id), -- The person being reviewed
    reviewer_id UUID REFERENCES employees(id), -- The person giving feedback
    relationship TEXT, -- 'Peer', 'Manager', 'Direct Report'
    period_start DATE,
    period_end DATE,
    status TEXT DEFAULT 'Pending', -- 'Pending', 'Completed'
    competencies JSONB DEFAULT '[]', -- Array of { competency, rating, comments }
    overall_comments TEXT,
    strengths TEXT[],
    improvements TEXT[],
    submitted_date DATE,
    anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_360 ENABLE ROW LEVEL SECURITY;

-- Create policies (simplified for now, similar to other tables)
CREATE POLICY "Enable read access for all authenticated users" ON performance_reviews FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for all authenticated users" ON performance_reviews FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for all authenticated users" ON performance_reviews FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all authenticated users" ON kpis FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for all authenticated users" ON kpis FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for all authenticated users" ON kpis FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all authenticated users" ON okrs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for all authenticated users" ON okrs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for all authenticated users" ON okrs FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all authenticated users" ON key_results FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for all authenticated users" ON key_results FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for all authenticated users" ON key_results FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all authenticated users" ON feedback_360 FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for all authenticated users" ON feedback_360 FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for all authenticated users" ON feedback_360 FOR UPDATE USING (auth.role() = 'authenticated');
