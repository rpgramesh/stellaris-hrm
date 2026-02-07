import { supabase } from '@/lib/supabase';
import { 
  Job, Applicant, Interview, Assessment, Offer, 
  JobStatus, JobType, JobPriority, JobLocation, 
  ApplicantStatus, ApplicantSource 
} from '@/types';

// Helper to map DB Job to Domain Job
const mapJobFromDb = (dbRecord: any): Job => {
  // Handle applicants count from join if available
  let applicantsCount = 0;
  if (dbRecord.applicants_count !== undefined) {
      applicantsCount = Number(dbRecord.applicants_count);
  } else if (dbRecord.applicants && Array.isArray(dbRecord.applicants) && dbRecord.applicants.length > 0) {
      // Supabase returns [{ count: N }] when using select('applicants(count)')
      applicantsCount = dbRecord.applicants[0].count;
  }

  return {
    id: dbRecord.id,
    title: dbRecord.title,
    department: dbRecord.department,
    location: dbRecord.location,
    jobType: dbRecord.job_type as JobType,
    locationType: dbRecord.location_type as JobLocation,
    description: dbRecord.description,
    requirements: dbRecord.requirements || [],
    responsibilities: dbRecord.responsibilities || [],
    salaryRange: {
      min: dbRecord.salary_min,
      max: dbRecord.salary_max,
      currency: dbRecord.salary_currency
    },
    experienceLevel: dbRecord.experience_level,
    status: dbRecord.status as JobStatus,
    priority: dbRecord.priority as JobPriority,
    postedDate: dbRecord.posted_date,
    closingDate: dbRecord.closing_date,
    hiringManagerId: dbRecord.hiring_manager_id,
    hiringManagerName: dbRecord.employees ? `${dbRecord.employees.first_name} ${dbRecord.employees.last_name}` : 'Unknown',
    applicantsCount: applicantsCount || 0,
    interviewsScheduled: 0,
    offersMade: 0,
    tags: dbRecord.tags || [],
    remote: dbRecord.remote,
    urgent: dbRecord.urgent
  };
};

const mapJobFromRpc = (dbRecord: any): Job => {
  return {
    id: dbRecord.id,
    title: dbRecord.title,
    department: dbRecord.department,
    location: dbRecord.location,
    jobType: dbRecord.job_type as JobType,
    locationType: dbRecord.location_type as JobLocation,
    description: dbRecord.description,
    requirements: dbRecord.requirements || [],
    responsibilities: dbRecord.responsibilities || [],
    salaryRange: {
      min: dbRecord.salary_min,
      max: dbRecord.salary_max,
      currency: dbRecord.salary_currency
    },
    experienceLevel: dbRecord.experience_level,
    status: dbRecord.status as JobStatus,
    priority: dbRecord.priority as JobPriority,
    postedDate: dbRecord.posted_date,
    closingDate: dbRecord.closing_date,
    hiringManagerId: dbRecord.hiring_manager_id,
    hiringManagerName: dbRecord.hiring_manager_first_name ? `${dbRecord.hiring_manager_first_name} ${dbRecord.hiring_manager_last_name}` : 'Unknown',
    applicantsCount: Number(dbRecord.applicants_count) || 0,
    interviewsScheduled: Number(dbRecord.interviews_count) || 0,
    offersMade: Number(dbRecord.offers_count) || 0,
    tags: dbRecord.tags || [],
    remote: dbRecord.remote,
    urgent: dbRecord.urgent
  };
};

// Helper to map DB Applicant to Domain Applicant
const mapApplicantFromDb = (dbRecord: any): Applicant => {
  return {
    id: dbRecord.id,
    jobId: dbRecord.job_id,
    jobTitle: dbRecord.jobs ? dbRecord.jobs.title : 'Unknown',
    firstName: dbRecord.first_name,
    lastName: dbRecord.last_name,
    email: dbRecord.email,
    phone: dbRecord.phone,
    resumeUrl: dbRecord.resume_url,
    coverLetterUrl: dbRecord.cover_letter_url,
    linkedinUrl: dbRecord.linkedin_url,
    portfolioUrl: dbRecord.portfolio_url,
    status: dbRecord.status as ApplicantStatus,
    source: dbRecord.source as ApplicantSource,
    referrerId: dbRecord.referrer_id,
    referrerName: dbRecord.referrer ? `${dbRecord.referrer.first_name} ${dbRecord.referrer.last_name}` : undefined,
    appliedDate: dbRecord.applied_date,
    currentStage: dbRecord.current_stage,
    nextAction: dbRecord.next_action,
    nextActionDate: dbRecord.next_action_date,
    rating: dbRecord.rating,
    experience: dbRecord.experience,
    currentCompany: dbRecord.current_company,
    currentPosition: dbRecord.current_position,
    expectedSalary: dbRecord.expected_salary,
    noticePeriod: dbRecord.notice_period,
    availableDate: dbRecord.available_date,
    tags: dbRecord.tags || [],
    notes: dbRecord.notes,
    interviews: dbRecord.interviews ? dbRecord.interviews.map(mapInterviewFromDb) : [],
    assessments: dbRecord.assessments ? dbRecord.assessments.map(mapAssessmentFromDb) : [],
    offers: dbRecord.job_offers ? dbRecord.job_offers.map(mapOfferFromDb) : []
  };
};

const mapInterviewFromDb = (dbRecord: any): Interview => {
  return {
    id: dbRecord.id,
    applicantId: dbRecord.applicant_id,
    type: dbRecord.type,
    scheduledDate: dbRecord.scheduled_date,
    duration: dbRecord.duration,
    interviewerId: dbRecord.interviewer_id,
    interviewerName: dbRecord.interviewer ? `${dbRecord.interviewer.first_name} ${dbRecord.interviewer.last_name}` : 'Unknown',
    interviewerRole: dbRecord.interviewer?.role || 'Interviewer',
    location: dbRecord.location,
    meetingLink: dbRecord.meeting_link,
    status: dbRecord.status,
    feedback: dbRecord.feedback,
    rating: dbRecord.rating,
    recommendation: dbRecord.recommendation,
    notes: dbRecord.notes
  };
};

const mapAssessmentFromDb = (dbRecord: any): Assessment => {
  return {
    id: dbRecord.id,
    applicantId: dbRecord.applicant_id,
    type: dbRecord.type,
    name: dbRecord.name,
    scheduledDate: dbRecord.scheduled_date,
    completedDate: dbRecord.completed_date,
    duration: dbRecord.duration,
    score: dbRecord.score,
    maxScore: dbRecord.max_score,
    percentage: dbRecord.max_score > 0 ? (dbRecord.score / dbRecord.max_score) * 100 : 0,
    status: dbRecord.status,
    result: dbRecord.result,
    notes: dbRecord.notes,
    attachmentUrl: dbRecord.attachment_url
  };
};

const mapOfferFromDb = (record: any): Offer => {
  return {
    id: record.id,
    applicantId: record.applicant_id,
    jobId: record.job_id,
    jobTitle: record.jobs ? record.jobs.title : 'Unknown',
    applicantName: record.applicants ? `${record.applicants.first_name} ${record.applicants.last_name}` : 'Unknown',
    salary: {
      base: record.base_salary || 0,
      currency: record.currency || 'AUD',
      frequency: record.frequency || 'Annually'
    },
    benefits: record.benefits || [],
    startDate: record.start_date,
    probationPeriod: record.probation_period ? Number(record.probation_period) : undefined,
    noticePeriod: record.notice_period ? Number(record.notice_period) : undefined,
    status: record.status as any,
    sentDate: record.sent_date,
    responseDeadline: record.response_deadline,
    responseDate: record.response_date,
    notes: record.notes,
    createdBy: record.creator ? `${record.creator.first_name} ${record.creator.last_name}` : 'Unknown',
    createdDate: record.created_at,
    approvedBy: record.approved_by
  };
};

export const recruitmentService = {
  // --- JOBS ---
  async getJobs(): Promise<Job[]> {
    // Try to use the RPC for better performance and counts
    const { data, error } = await supabase.rpc('get_jobs_with_counts');

    if (error) {
        console.warn('RPC get_jobs_with_counts failed, falling back to basic query:', error.message);
        // Fallback to normal fetch if RPC fails (e.g. migration not applied yet)
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('jobs')
          .select(`
            *,
            employees (first_name, last_name),
            applicants (count)
          `)
          .order('posted_date', { ascending: false });
        
        if (fallbackError) throw fallbackError;
        return fallbackData ? fallbackData.map(mapJobFromDb) : [];
    }
    
    return data ? data.map(mapJobFromRpc) : [];
  },

  async getJobById(id: string): Promise<Job | null> {
    // Try to use the RPC to get the job with counts
    const { data, error } = await supabase.rpc('get_jobs_with_counts', { p_job_id: id });
    
    if (error) {
        console.warn('RPC get_jobs_with_counts failed for single job, falling back to basic query:', error.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('jobs')
          .select(`
            *,
            employees (first_name, last_name),
            applicants (count)
          `)
          .eq('id', id)
          .single();
        
        if (fallbackError) throw fallbackError;
        return fallbackData ? mapJobFromDb(fallbackData) : null;
    }

    return data && data.length > 0 ? mapJobFromRpc(data[0]) : null;
  },

  async createJob(job: Omit<Job, 'id' | 'hiringManagerName' | 'applicantsCount' | 'interviewsScheduled' | 'offersMade'>): Promise<Job> {
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        title: job.title,
        department: job.department,
        location: job.location,
        job_type: job.jobType,
        location_type: job.locationType,
        description: job.description,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        salary_min: job.salaryRange?.min,
        salary_max: job.salaryRange?.max,
        salary_currency: job.salaryRange?.currency,
        experience_level: job.experienceLevel,
        status: job.status,
        priority: job.priority,
        posted_date: job.postedDate,
        closing_date: job.closingDate,
        hiring_manager_id: job.hiringManagerId,
        tags: job.tags,
        remote: job.remote,
        urgent: job.urgent
      })
      .select('*, employees(first_name, last_name)')
      .single();

    if (error) throw error;
    return mapJobFromDb(data);
  },

  async updateJob(id: string, updates: Partial<Job>): Promise<Job> {
    const dbUpdates: any = {};
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.department) dbUpdates.department = updates.department;
    if (updates.location) dbUpdates.location = updates.location;
    if (updates.jobType) dbUpdates.job_type = updates.jobType;
    if (updates.locationType) dbUpdates.location_type = updates.locationType;
    if (updates.description) dbUpdates.description = updates.description;
    if (updates.requirements) dbUpdates.requirements = updates.requirements;
    if (updates.responsibilities) dbUpdates.responsibilities = updates.responsibilities;
    if (updates.salaryRange) {
        dbUpdates.salary_min = updates.salaryRange.min;
        dbUpdates.salary_max = updates.salaryRange.max;
        dbUpdates.salary_currency = updates.salaryRange.currency;
    }
    if (updates.experienceLevel) dbUpdates.experience_level = updates.experienceLevel;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.priority) dbUpdates.priority = updates.priority;
    if (updates.closingDate) dbUpdates.closing_date = updates.closingDate;
    if (updates.hiringManagerId) dbUpdates.hiring_manager_id = updates.hiringManagerId;
    if (updates.tags) dbUpdates.tags = updates.tags;
    if (updates.remote !== undefined) dbUpdates.remote = updates.remote;
    if (updates.urgent !== undefined) dbUpdates.urgent = updates.urgent;

    const { data, error } = await supabase
      .from('jobs')
      .update(dbUpdates)
      .eq('id', id)
      .select('*, employees(first_name, last_name)')
      .single();

    if (error) throw error;
    return mapJobFromDb(data);
  },

  async deleteJob(id: string): Promise<void> {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // --- APPLICANTS ---
  async getApplicants(): Promise<Applicant[]> {
    try {
      const { data, error } = await supabase
        .from('applicants')
        .select(`
          *,
          jobs (title),
          referrer:employees!applicants_referrer_id_fkey (first_name, last_name),
          interviews (
            *,
            interviewer:employees!interviews_interviewer_id_fkey (first_name, last_name)
          ),
          assessments (*),
          job_offers (
              *,
              jobs (title),
              applicants (first_name, last_name),
              creator:employees!job_offers_created_by_fkey (first_name, last_name)
          )
        `)
        .order('applied_date', { ascending: false });

      if (error) throw error;
      return data ? data.map(mapApplicantFromDb) : [];
    } catch (error) {
      console.warn('Detailed getApplicants failed (likely missing tables), falling back to basic query:', error);
      // Fallback query without new tables (interviews, assessments)
      const { data, error: fallbackError } = await supabase
        .from('applicants')
        .select(`
          *,
          jobs (title),
          referrer:employees!applicants_referrer_id_fkey (first_name, last_name)
        `)
        .order('applied_date', { ascending: false });

      if (fallbackError) throw fallbackError;
      return data ? data.map(mapApplicantFromDb) : [];
    }
  },

  async getApplicantsByJobId(jobId: string): Promise<Applicant[]> {
    try {
      const { data, error } = await supabase
        .from('applicants')
        .select(`
          *,
          jobs (title),
          referrer:employees!applicants_referrer_id_fkey (first_name, last_name),
          interviews (
            *,
            interviewer:employees!interviews_interviewer_id_fkey (first_name, last_name)
          ),
          assessments (*),
          job_offers (
              *,
              jobs (title),
              applicants (first_name, last_name),
              creator:employees!job_offers_created_by_fkey (first_name, last_name)
          )
        `)
        .eq('job_id', jobId)
        .order('applied_date', { ascending: false });

      if (error) throw error;
      return data ? data.map(mapApplicantFromDb) : [];
    } catch (error) {
      console.warn('Detailed getApplicantsByJobId failed, falling back to basic query:', error);
      const { data, error: fallbackError } = await supabase
        .from('applicants')
        .select(`
          *,
          jobs (title),
          referrer:employees!applicants_referrer_id_fkey (first_name, last_name)
        `)
        .eq('job_id', jobId)
        .order('applied_date', { ascending: false });

      if (fallbackError) throw fallbackError;
      return data ? data.map(mapApplicantFromDb) : [];
    }
  },

  async getApplicantById(id: string): Promise<Applicant | null> {
    try {
      const { data, error } = await supabase
        .from('applicants')
        .select(`
          *,
          jobs (title),
          referrer:employees!applicants_referrer_id_fkey (first_name, last_name),
          interviews (
            *,
            interviewer:employees!interviews_interviewer_id_fkey (first_name, last_name)
          ),
          assessments (*),
          job_offers (
              *,
              jobs (title),
              applicants (first_name, last_name),
              creator:employees!job_offers_created_by_fkey (first_name, last_name)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data ? mapApplicantFromDb(data) : null;
    } catch (error) {
      console.warn('Detailed getApplicantById failed, falling back to basic query:', error);
      const { data, error: fallbackError } = await supabase
        .from('applicants')
        .select(`
          *,
          jobs (title),
          referrer:employees!applicants_referrer_id_fkey (first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (fallbackError) throw fallbackError;
      return data ? mapApplicantFromDb(data) : null;
    }
  },

  async createApplicant(applicant: Partial<Applicant>): Promise<Applicant> {
    const { data, error } = await supabase
      .from('applicants')
      .insert({
        job_id: applicant.jobId,
        first_name: applicant.firstName,
        last_name: applicant.lastName,
        email: applicant.email,
        phone: applicant.phone,
        resume_url: applicant.resumeUrl,
        cover_letter_url: applicant.coverLetterUrl,
        linkedin_url: applicant.linkedinUrl,
        portfolio_url: applicant.portfolioUrl,
        status: applicant.status,
        source: applicant.source,
        referrer_id: applicant.referrerId,
        applied_date: applicant.appliedDate,
        current_stage: applicant.currentStage,
        experience: applicant.experience,
        current_company: applicant.currentCompany,
        current_position: applicant.currentPosition,
        expected_salary: applicant.expectedSalary,
        notice_period: applicant.noticePeriod,
        available_date: applicant.availableDate,
        tags: applicant.tags,
        notes: applicant.notes
      })
      .select(`
        *,
        jobs (title),
        referrer:employees!applicants_referrer_id_fkey (first_name, last_name)
      `)
      .single();

    if (error) throw error;
    return mapApplicantFromDb(data);
  },

  async updateApplicant(id: string, updates: Partial<Applicant>): Promise<Applicant> {
    const dbUpdates: any = {};
    if (updates.firstName) dbUpdates.first_name = updates.firstName;
    if (updates.lastName) dbUpdates.last_name = updates.lastName;
    if (updates.email) dbUpdates.email = updates.email;
    if (updates.phone) dbUpdates.phone = updates.phone;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.currentStage) dbUpdates.current_stage = updates.currentStage;
    if (updates.nextAction) dbUpdates.next_action = updates.nextAction;
    if (updates.nextActionDate) dbUpdates.next_action_date = updates.nextActionDate;
    if (updates.rating) dbUpdates.rating = updates.rating;
    if (updates.notes) dbUpdates.notes = updates.notes;
    // Add other fields as needed

    const { data, error } = await supabase
      .from('applicants')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        jobs (title),
        referrer:employees!applicants_referrer_id_fkey (first_name, last_name),
        interviews (
          *,
          interviewer:employees!interviews_interviewer_id_fkey (first_name, last_name)
        ),
        assessments (*),
        job_offers (
            *,
            jobs (title),
            applicants (first_name, last_name),
            creator:employees!job_offers_created_by_fkey (first_name, last_name)
        )
      `)
      .single();

    if (error) throw error;
    return mapApplicantFromDb(data);
  },

  async deleteApplicant(id: string): Promise<void> {
    const { error } = await supabase
      .from('applicants')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // --- INTERVIEWS ---
  async getInterviews(): Promise<Interview[]> {
    const { data, error } = await supabase
      .from('interviews')
      .select(`
        *,
        interviewer:employees!interviews_interviewer_id_fkey (first_name, last_name)
      `)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data ? data.map(mapInterviewFromDb) : [];
  },

  async createInterview(interview: Partial<Interview>): Promise<Interview> {
    const { data, error } = await supabase
      .from('interviews')
      .insert({
        applicant_id: interview.applicantId,
        type: interview.type,
        scheduled_date: interview.scheduledDate,
        duration: interview.duration,
        interviewer_id: interview.interviewerId,
        location: interview.location,
        meeting_link: interview.meetingLink,
        status: interview.status,
        notes: interview.notes
      })
      .select(`
        *,
        interviewer:employees!interviews_interviewer_id_fkey (first_name, last_name)
      `)
      .single();

    if (error) throw error;
    return mapInterviewFromDb(data);
  },

  async updateInterview(id: string, updates: Partial<Interview>): Promise<Interview> {
    const dbUpdates: any = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.feedback) dbUpdates.feedback = updates.feedback;
    if (updates.rating) dbUpdates.rating = updates.rating;
    if (updates.recommendation) dbUpdates.recommendation = updates.recommendation;
    if (updates.notes) dbUpdates.notes = updates.notes;

    const { data, error } = await supabase
      .from('interviews')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        interviewer:employees!interviews_interviewer_id_fkey (first_name, last_name)
      `)
      .single();

    if (error) throw error;
    return mapInterviewFromDb(data);
  },

  async deleteInterview(id: string): Promise<void> {
    const { error } = await supabase
      .from('interviews')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // --- ASSESSMENTS ---
  async getAssessments(): Promise<Assessment[]> {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data ? data.map(mapAssessmentFromDb) : [];
  },

  async createAssessment(assessment: Partial<Assessment>): Promise<Assessment> {
    const { data, error } = await supabase
      .from('assessments')
      .insert({
        applicant_id: assessment.applicantId,
        type: assessment.type,
        name: assessment.name,
        scheduled_date: assessment.scheduledDate,
        completed_date: assessment.completedDate,
        duration: assessment.duration,
        score: assessment.score,
        max_score: assessment.maxScore,
        status: assessment.status,
        result: assessment.result,
        notes: assessment.notes,
        attachment_url: assessment.attachmentUrl
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapAssessmentFromDb(data);
  },

  async updateAssessment(id: string, updates: Partial<Assessment>): Promise<Assessment> {
    const dbUpdates: any = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.score) dbUpdates.score = updates.score;
    if (updates.result) dbUpdates.result = updates.result;
    if (updates.completedDate) dbUpdates.completed_date = updates.completedDate;
    if (updates.notes) dbUpdates.notes = updates.notes;
    // Add other fields as needed

    const { data, error } = await supabase
      .from('assessments')
      .update(dbUpdates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return mapAssessmentFromDb(data);
  },

  async deleteAssessment(id: string): Promise<void> {
    const { error } = await supabase
      .from('assessments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // --- OFFERS ---
  async getOffers(): Promise<Offer[]> {
    try {
      const { data, error } = await supabase
        .from('job_offers')
        .select(`
          *,
          applicants (first_name, last_name),
          jobs (title),
          creator:employees!job_offers_created_by_fkey (first_name, last_name)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data ? data.map(mapOfferFromDb) : [];
    } catch (error) {
      console.warn('getOffers failed:', error);
      return [];
    }
  },

  async getOfferById(id: string): Promise<Offer | null> {
    const { data, error } = await supabase
      .from('job_offers')
      .select(`
        *,
        applicants (first_name, last_name),
        jobs (title),
        creator:employees!job_offers_created_by_fkey (first_name, last_name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? mapOfferFromDb(data) : null;
  },

  async createOffer(offer: Partial<Offer>): Promise<Offer> {
    const { data, error } = await supabase
      .from('job_offers')
      .insert({
        job_id: offer.jobId,
        applicant_id: offer.applicantId,
        base_salary: offer.salary?.base,
        currency: offer.salary?.currency,
        frequency: offer.salary?.frequency,
        benefits: offer.benefits,
        start_date: offer.startDate,
        probation_period: offer.probationPeriod,
        notice_period: offer.noticePeriod,
        status: offer.status,
        sent_date: offer.sentDate,
        response_deadline: offer.responseDeadline,
        approved_by: offer.approvedBy,
        notes: offer.notes,
        created_by: offer.createdBy
      })
      .select(`
        *,
        applicants (first_name, last_name),
        jobs (title),
        creator:employees!job_offers_created_by_fkey (first_name, last_name)
      `)
      .single();

    if (error) throw error;
    return mapOfferFromDb(data);
  },
  
  async updateOffer(id: string, updates: Partial<Offer>): Promise<Offer> {
    const dbUpdates: any = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.sentDate) dbUpdates.sent_date = updates.sentDate;
    if (updates.responseDeadline) dbUpdates.response_deadline = updates.responseDeadline;
    if (updates.responseDate) dbUpdates.response_date = updates.responseDate;
    if (updates.startDate) dbUpdates.start_date = updates.startDate;
    if (updates.probationPeriod) dbUpdates.probation_period = updates.probationPeriod;
    if (updates.noticePeriod) dbUpdates.notice_period = updates.noticePeriod;
    if (updates.notes) dbUpdates.notes = updates.notes;
    if (updates.approvedBy) dbUpdates.approved_by = updates.approvedBy;
    
    if (updates.salary) {
        if (updates.salary.base !== undefined) dbUpdates.base_salary = updates.salary.base;
        if (updates.salary.currency) dbUpdates.currency = updates.salary.currency;
        if (updates.salary.frequency) dbUpdates.frequency = updates.salary.frequency;
    }
    
    if (updates.benefits) dbUpdates.benefits = updates.benefits;

    const { data, error } = await supabase
      .from('job_offers')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        applicants (first_name, last_name),
        jobs (title),
        creator:employees!job_offers_created_by_fkey (first_name, last_name)
      `)
      .single();

    if (error) throw error;
    return mapOfferFromDb(data);
  },

  async deleteOffer(id: string): Promise<void> {
    const { error } = await supabase
      .from('job_offers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
