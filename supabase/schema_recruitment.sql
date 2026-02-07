-- Jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    location TEXT NOT NULL,
    job_type TEXT NOT NULL,
    location_type TEXT NOT NULL,
    description TEXT,
    requirements TEXT[],
    responsibilities TEXT[],
    salary_min NUMERIC,
    salary_max NUMERIC,
    salary_currency TEXT DEFAULT 'AUD',
    experience_level TEXT,
    status TEXT DEFAULT 'Draft',
    priority TEXT DEFAULT 'Medium',
    posted_date DATE DEFAULT CURRENT_DATE,
    closing_date DATE,
    hiring_manager_id UUID REFERENCES public.employees(id),
    tags TEXT[],
    remote BOOLEAN DEFAULT false,
    urgent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applicants table
CREATE TABLE IF NOT EXISTS public.applicants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    resume_url TEXT,
    cover_letter_url TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    status TEXT DEFAULT 'New',
    source TEXT,
    referrer_id UUID REFERENCES public.employees(id),
    applied_date DATE DEFAULT CURRENT_DATE,
    rating NUMERIC,
    experience TEXT,
    current_company TEXT,
    current_position TEXT,
    expected_salary NUMERIC,
    notice_period TEXT,
    available_date DATE,
    tags TEXT[],
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interviews table
CREATE TABLE IF NOT EXISTS public.interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID REFERENCES public.applicants(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER, -- minutes
    interviewer_id UUID REFERENCES public.employees(id),
    status TEXT DEFAULT 'Scheduled',
    feedback TEXT,
    rating NUMERIC,
    recommendation TEXT,
    notes TEXT,
    location TEXT,
    meeting_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job Offers table
CREATE TABLE IF NOT EXISTS public.job_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id),
    applicant_id UUID REFERENCES public.applicants(id) ON DELETE CASCADE,
    salary_base NUMERIC,
    salary_currency TEXT DEFAULT 'AUD',
    salary_frequency TEXT DEFAULT 'Annually',
    benefits TEXT[],
    start_date DATE,
    status TEXT DEFAULT 'Pending',
    response_deadline DATE,
    notes TEXT,
    created_by UUID REFERENCES public.employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_department ON public.jobs(department);
CREATE INDEX IF NOT EXISTS idx_applicants_job_id ON public.applicants(job_id);
CREATE INDEX IF NOT EXISTS idx_applicants_email ON public.applicants(email);
CREATE INDEX IF NOT EXISTS idx_interviews_applicant_id ON public.interviews(applicant_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_id ON public.interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_applicant_id ON public.job_offers(applicant_id);

-- Enable RLS (optional but recommended, kept disabled for simplicity as per current pattern or enabled if needed)
-- ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;
