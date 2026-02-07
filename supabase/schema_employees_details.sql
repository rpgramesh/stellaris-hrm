
-- EMPLOYMENT TERMS
CREATE TABLE IF NOT EXISTS employment_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    effective_date DATE,
    term_start DATE,
    term_end DATE,
    job_type TEXT,
    job_status TEXT,
    leave_workflow TEXT,
    workday TEXT,
    holiday TEXT,
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PLACEMENTS
CREATE TABLE IF NOT EXISTS placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    effective_date DATE,
    job_position_id UUID REFERENCES job_positions(id),
    department_id UUID REFERENCES departments(id),
    branch_id UUID REFERENCES branches(id),
    level_id UUID REFERENCES job_levels(id),
    line_manager_id UUID REFERENCES employees(id),
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EXPERIENCES
CREATE TABLE IF NOT EXISTS experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    employer TEXT,
    job_title TEXT,
    from_date DATE,
    to_date DATE,
    salary NUMERIC,
    currency TEXT,
    country TEXT,
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EDUCATIONS
CREATE TABLE IF NOT EXISTS educations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    school TEXT,
    field_of_study TEXT,
    degree TEXT,
    grade TEXT,
    from_year TEXT,
    to_year TEXT,
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
