CREATE OR REPLACE FUNCTION public.get_jobs_with_counts(p_job_id UUID)
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
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
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
    e.first_name AS hiring_manager_first_name,
    e.last_name AS hiring_manager_last_name,
    (SELECT COUNT(*)::BIGINT FROM public.applicants a WHERE a.job_id = j.id) AS applicants_count,
    (
      SELECT COUNT(*)::BIGINT
      FROM public.interviews i
      JOIN public.applicants a ON a.id = i.applicant_id
      WHERE a.job_id = j.id
    ) AS interviews_count,
    (SELECT COUNT(*)::BIGINT FROM public.job_offers o WHERE o.job_id = j.id) AS offers_count
  FROM public.jobs j
  LEFT JOIN public.employees e ON e.id = j.hiring_manager_id
  WHERE (p_job_id IS NULL OR j.id = p_job_id)
  ORDER BY j.posted_date DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_jobs_with_counts()
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
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.get_jobs_with_counts(NULL::UUID);
$$;

REVOKE ALL ON FUNCTION public.get_jobs_with_counts(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_jobs_with_counts() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_jobs_with_counts(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_jobs_with_counts() TO anon, authenticated;
