-- Create interviews table
CREATE TABLE IF NOT EXISTS interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER, -- minutes
    interviewer_id UUID REFERENCES employees(id),
    location TEXT,
    meeting_link TEXT,
    status TEXT DEFAULT 'Scheduled',
    feedback TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    recommendation TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assessments table
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    applicant_id UUID REFERENCES applicants(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- minutes
    score NUMERIC,
    max_score NUMERIC,
    status TEXT DEFAULT 'Pending',
    result TEXT,
    notes TEXT,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for interviews
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable access for authenticated users" ON interviews;
CREATE POLICY "Enable access for authenticated users" ON interviews
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Enable RLS for assessments
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable access for authenticated users" ON assessments;
CREATE POLICY "Enable access for authenticated users" ON assessments
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Add trigger for interviews updated_at
DROP TRIGGER IF EXISTS update_interviews_updated_at ON interviews;
CREATE TRIGGER update_interviews_updated_at
    BEFORE UPDATE ON interviews
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Add trigger for assessments updated_at
DROP TRIGGER IF EXISTS update_assessments_updated_at ON assessments;
CREATE TRIGGER update_assessments_updated_at
    BEFORE UPDATE ON assessments
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Create RPC to get jobs with counts
CREATE OR REPLACE FUNCTION get_jobs_with_counts(p_job_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  title TEXT,
  department TEXT,
  location TEXT,
  job_type TEXT,
  location_type TEXT,
  description TEXT,
  requirements TEXT[],
  responsibilities TEXT[],
  salary_min NUMERIC,
  salary_max NUMERIC,
  salary_currency TEXT,
  experience_level TEXT,
  status TEXT,
  priority TEXT,
  posted_date TIMESTAMP WITH TIME ZONE,
  closing_date TIMESTAMP WITH TIME ZONE,
  hiring_manager_id UUID,
  tags TEXT[],
  remote BOOLEAN,
  urgent BOOLEAN,
  hiring_manager_first_name TEXT,
  hiring_manager_last_name TEXT,
  applicants_count BIGINT,
  interviews_count BIGINT,
  offers_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.department,
    j.location,
    j.job_type,
    j.location_type,
    j.description,
    j.requirements,
    j.responsibilities,
    j.salary_min,
    j.salary_max,
    j.salary_currency,
    j.experience_level,
    j.status,
    j.priority,
    j.posted_date,
    j.closing_date,
    j.hiring_manager_id,
    j.tags,
    j.remote,
    j.urgent,
    e.first_name as hiring_manager_first_name,
    e.last_name as hiring_manager_last_name,
    (SELECT COUNT(*) FROM applicants a WHERE a.job_id = j.id) as applicants_count,
    (SELECT COUNT(*) FROM interviews i JOIN applicants a ON i.applicant_id = a.id WHERE a.job_id = j.id) as interviews_count,
    (SELECT COUNT(*) FROM job_offers o WHERE o.job_id = j.id) as offers_count
  FROM jobs j
  LEFT JOIN employees e ON j.hiring_manager_id = e.id
  WHERE (p_job_id IS NULL OR j.id = p_job_id)
  ORDER BY j.posted_date DESC;
END;
$$ LANGUAGE plpgsql;
