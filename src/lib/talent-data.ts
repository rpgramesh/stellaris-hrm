import { Job, Applicant, Interview, Assessment, Offer, PerformanceReview, KPI, OKR, KeyResult, Feedback360, LMSCourse, CourseEnrollment, TrainingProgram, LearningPath } from '@/types';

// Recruitment & ATS Mock Data
export const mockJobs: Job[] = [
  {
    id: 'JOB001',
    title: 'Senior Frontend Engineer',
    department: 'Engineering',
    location: 'Sydney, Australia',
    jobType: 'Full-time',
    locationType: 'Hybrid',
    description: 'We are looking for an experienced Frontend Engineer to join our team and help build amazing user experiences.',
    requirements: [
      '5+ years of React experience',
      'Strong TypeScript skills',
      'Experience with modern CSS frameworks',
      'Excellent communication skills'
    ],
    responsibilities: [
      'Develop and maintain frontend applications',
      'Collaborate with design and backend teams',
      'Optimize application performance',
      'Mentor junior developers'
    ],
    salaryRange: {
      min: 120000,
      max: 150000,
      currency: 'AUD'
    },
    experienceLevel: 'Senior',
    status: 'Published',
    priority: 'High',
    postedDate: '2024-01-15',
    closingDate: '2024-02-15',
    hiringManagerId: 'EMP001',
    hiringManagerName: 'John Smith',
    applicantsCount: 12,
    interviewsScheduled: 5,
    offersMade: 0,
    tags: ['React', 'TypeScript', 'Frontend'],
    remote: true,
    urgent: false
  },
  {
    id: 'JOB002',
    title: 'Product Manager',
    department: 'Product',
    location: 'Melbourne, Australia',
    jobType: 'Full-time',
    locationType: 'On-site',
    description: 'Join our product team to drive product strategy and roadmap execution.',
    requirements: [
      '3+ years of product management experience',
      'Strong analytical skills',
      'Experience with Agile methodologies',
      'Excellent stakeholder management'
    ],
    responsibilities: [
      'Define product vision and strategy',
      'Manage product roadmap',
      'Collaborate with engineering and design teams',
      'Analyze market trends and user feedback'
    ],
    salaryRange: {
      min: 130000,
      max: 160000,
      currency: 'AUD'
    },
    experienceLevel: 'Mid',
    status: 'Published',
    priority: 'Medium',
    postedDate: '2024-01-20',
    closingDate: '2024-02-20',
    hiringManagerId: 'EMP002',
    hiringManagerName: 'Sarah Johnson',
    applicantsCount: 8,
    interviewsScheduled: 3,
    offersMade: 0,
    tags: ['Product Management', 'Agile', 'Strategy'],
    remote: false,
    urgent: false
  },
  {
    id: 'JOB003',
    title: 'UX Designer',
    department: 'Design',
    location: 'Remote',
    jobType: 'Full-time',
    locationType: 'Remote',
    description: 'Looking for a creative UX Designer to enhance our product user experience.',
    requirements: [
      '4+ years of UX design experience',
      'Proficiency in Figma, Sketch, or similar tools',
      'Strong portfolio demonstrating user-centered design',
      'Experience with user research and testing'
    ],
    responsibilities: [
      'Design user interfaces and experiences',
      'Conduct user research and usability testing',
      'Create wireframes and prototypes',
      'Collaborate with product and engineering teams'
    ],
    salaryRange: {
      min: 100000,
      max: 130000,
      currency: 'AUD'
    },
    experienceLevel: 'Mid',
    status: 'Published',
    priority: 'Low',
    postedDate: '2024-01-10',
    closingDate: '2024-02-10',
    hiringManagerId: 'EMP003',
    hiringManagerName: 'Mike Chen',
    applicantsCount: 24,
    interviewsScheduled: 8,
    offersMade: 1,
    tags: ['UX', 'Design', 'Figma'],
    remote: true,
    urgent: false
  }
];

export const mockApplicants: Applicant[] = [
  {
    id: 'APP001',
    jobId: 'JOB001',
    jobTitle: 'Senior Frontend Engineer',
    firstName: 'Alice',
    lastName: 'Williams',
    email: 'alice.williams@email.com',
    phone: '+61 400 123 456',
    resumeUrl: '/uploads/resumes/alice_williams.pdf',
    linkedinUrl: 'https://linkedin.com/in/alicewilliams',
    portfolioUrl: 'https://alicewilliams.dev',
    status: 'Interview',
    source: 'LinkedIn',
    appliedDate: '2024-01-16',
    currentStage: 'Technical Interview',
    nextAction: 'Schedule final interview',
    nextActionDate: '2024-01-30',
    rating: 4.5,
    experience: '6 years',
    currentCompany: 'Tech Corp',
    currentPosition: 'Senior Frontend Developer',
    expectedSalary: 135000,
    noticePeriod: '4 weeks',
    availableDate: '2024-03-01',
    tags: ['React Expert', 'TypeScript', 'Team Lead'],
    notes: 'Excellent technical skills, strong leadership potential',
    interviews: [
      {
        id: 'INT001',
        applicantId: 'APP001',
        type: 'Phone',
        scheduledDate: '2024-01-20',
        duration: 45,
        interviewerId: 'EMP001',
        interviewerName: 'John Smith',
        interviewerRole: 'Engineering Manager',
        status: 'Completed',
        feedback: 'Strong technical background, good communication skills',
        rating: 4.5,
        recommendation: 'Yes',
        notes: 'Discussed React patterns and team management experience'
      }
    ],
    assessments: [
      {
        id: 'ASSESS001',
        applicantId: 'APP001',
        type: 'Technical',
        name: 'React Coding Challenge',
        completedDate: '2024-01-25',
        duration: 120,
        score: 92,
        maxScore: 100,
        percentage: 92,
        status: 'Completed',
        result: 'Pass',
        notes: 'Excellent solution with clean code and good performance'
      }
    ],
    offers: []
  },
  {
    id: 'APP002',
    jobId: 'JOB001',
    jobTitle: 'Senior Frontend Engineer',
    firstName: 'Bob',
    lastName: 'Martinez',
    email: 'bob.martinez@email.com',
    phone: '+61 400 234 567',
    resumeUrl: '/uploads/resumes/bob_martinez.pdf',
    linkedinUrl: 'https://linkedin.com/in/bobmartinez',
    status: 'Screening',
    source: 'Referral',
    referrerId: 'EMP004',
    referrerName: 'Jane Davis',
    appliedDate: '2024-01-18',
    currentStage: 'Initial Screening',
    nextAction: 'Schedule phone interview',
    nextActionDate: '2024-01-28',
    rating: 3.8,
    experience: '4 years',
    currentCompany: 'StartupXYZ',
    currentPosition: 'Frontend Developer',
    expectedSalary: 125000,
    noticePeriod: '2 weeks',
    availableDate: '2024-02-15',
    tags: ['Vue.js', 'JavaScript', 'Fast Learner'],
    notes: 'Good potential, needs more React experience',
    interviews: [],
    assessments: [],
    offers: []
  },
  {
    id: 'APP003',
    jobId: 'JOB002',
    jobTitle: 'Product Manager',
    firstName: 'Carol',
    lastName: 'Thompson',
    email: 'carol.thompson@email.com',
    phone: '+61 400 345 678',
    resumeUrl: '/uploads/resumes/carol_thompson.pdf',
    linkedinUrl: 'https://linkedin.com/in/carolthompson',
    status: 'Assessment',
    source: 'Company Website',
    appliedDate: '2024-01-22',
    currentStage: 'Case Study Review',
    nextAction: 'Review case study submission',
    nextActionDate: '2024-01-29',
    rating: 4.2,
    experience: '5 years',
    currentCompany: 'Product Inc',
    currentPosition: 'Product Manager',
    expectedSalary: 140000,
    noticePeriod: '1 month',
    availableDate: '2024-03-15',
    tags: ['Agile', 'Data Analysis', 'Stakeholder Management'],
    notes: 'Strong analytical skills, good product sense',
    interviews: [
      {
        id: 'INT002',
        applicantId: 'APP003',
        type: 'Video',
        scheduledDate: '2024-01-25',
        duration: 60,
        interviewerId: 'EMP002',
        interviewerName: 'Sarah Johnson',
        interviewerRole: 'Head of Product',
        status: 'Completed',
        feedback: 'Good understanding of product management principles',
        rating: 4.0,
        recommendation: 'Yes',
        notes: 'Discussed product roadmap and user research methods'
      }
    ],
    assessments: [
      {
        id: 'ASSESS002',
        applicantId: 'APP003',
        type: 'Skills',
        name: 'Product Management Case Study',
        scheduledDate: '2024-01-28',
        duration: 180,
        status: 'In Progress',
        notes: 'Product prioritization and roadmap exercise'
      }
    ],
    offers: []
  }
];

export const mockOffers: Offer[] = [
  {
    id: 'OFFER001',
    jobId: 'JOB001',
    applicantId: 'APP001',
    applicantName: 'Sarah Johnson',
    jobTitle: 'Senior Frontend Engineer',
    salary: {
      base: 120000,
      currency: 'AUD',
      frequency: 'Annually'
    },
    benefits: [
      'Health Insurance',
      'Dental Coverage',
      '401k Matching',
      'Stock Options',
      'Remote Work Allowance'
    ],
    startDate: '2024-02-01',
    status: 'Accepted',
    responseDeadline: '2024-01-25',
    createdBy: 'EMP005',
    createdDate: '2024-01-15',
    notes: 'Excellent candidate with strong React experience'
  },
  {
    id: 'OFFER002',
    jobId: 'JOB002',
    applicantId: 'APP003',
    applicantName: 'Michael Brown',
    jobTitle: 'Product Manager',
    salary: {
      base: 130000,
      currency: 'AUD',
      frequency: 'Annually'
    },
    benefits: [
      'Health Insurance',
      'Dental Coverage',
      '401k Matching',
      'Performance Bonus'
    ],
    startDate: '2024-02-15',
    status: 'Pending Response',
    responseDeadline: '2024-01-30',
    createdBy: 'EMP005',
    createdDate: '2024-01-20',
    notes: 'Pending background check completion'
  },
  {
    id: 'OFFER003',
    jobId: 'JOB003',
    applicantId: 'APP005',
    applicantName: 'Emily Davis',
    jobTitle: 'UX Designer',
    salary: {
      base: 95000,
      currency: 'AUD',
      frequency: 'Annually'
    },
    benefits: [
      'Health Insurance',
      'Dental Coverage',
      '401k Matching',
      'Design Conference Budget'
    ],
    startDate: '2024-02-10',
    status: 'Rejected',
    responseDeadline: '2024-02-05',
    createdBy: 'EMP005',
    createdDate: '2024-01-25',
    notes: 'Candidate declined due to better offer elsewhere'
  }
];

// Performance Management Mock Data
export const mockPerformanceReviews: PerformanceReview[] = [
  {
    id: 'REV001',
    employeeId: 'EMP001',
    employeeName: 'John Smith',
    reviewerId: 'EMP005',
    reviewerName: 'David Wilson',
    reviewerRole: 'VP Engineering',
    cycle: 'Quarterly',
    period: {
      start: '2024-01-01',
      end: '2024-03-31'
    },
    status: 'Completed',
    selfAssessment: {
      strengths: ['Technical leadership', 'Team mentoring', 'Code quality'],
      improvements: ['Cross-team communication', 'Strategic planning'],
      achievements: ['Led successful product launch', 'Reduced team turnover by 20%'],
      goals: ['Improve cross-functional collaboration', 'Develop junior team members'],
      submittedDate: '2024-04-05'
    },
    managerAssessment: {
      strengths: ['Strong technical expertise', 'Effective team leadership', 'Problem solving'],
      improvements: ['Time management', 'Stakeholder communication'],
      achievements: ['Delivered complex project on time', 'Improved team performance metrics'],
      goals: ['Take on more strategic initiatives', 'Mentor senior engineers'],
      overallRating: 4.2,
      submittedDate: '2024-04-10'
    },
    finalRating: 4.2,
    recommendations: ['Consider for senior leadership role', 'Provide strategic planning training'],
    developmentPlan: ['Leadership training', 'Cross-functional project experience'],
    promotionRecommendation: 'Yes',
    completedDate: '2024-04-15'
  }
];

export const mockKPIs: KPI[] = [
  {
    id: 'KPI001',
    employeeId: 'EMP001',
    employeeName: 'John Smith',
    title: 'Team Productivity',
    description: 'Increase team productivity by improving development processes',
    category: 'Productivity',
    target: 'Increase velocity by 20%',
    currentValue: '18% increase achieved',
    unit: 'Percentage',
    weight: 30,
    progress: 90,
    dueDate: '2024-06-30',
    status: 'In Progress',
    notes: 'Implementing new development workflow',
    updatedDate: '2024-01-25'
  },
  {
    id: 'KPI002',
    employeeId: 'EMP001',
    employeeName: 'John Smith',
    title: 'Code Quality',
    description: 'Maintain high code quality standards',
    category: 'Quality',
    target: 'Less than 5 bugs per release',
    currentValue: '3 bugs in latest release',
    unit: 'Count',
    weight: 25,
    progress: 100,
    dueDate: '2024-06-30',
    status: 'Completed',
    notes: 'Code review process improved',
    updatedDate: '2024-01-20'
  },
  {
    id: 'KPI003',
    employeeId: 'EMP002',
    employeeName: 'Sarah Johnson',
    title: 'Product Launch Success',
    description: 'Successfully launch new product features',
    category: 'Process',
    target: 'Launch 3 major features',
    currentValue: '2 features launched',
    unit: 'Features',
    weight: 40,
    progress: 67,
    dueDate: '2024-06-30',
    status: 'In Progress',
    notes: 'Third feature in development',
    updatedDate: '2024-01-28'
  }
];

export const mockOKRs: OKR[] = [
  {
    id: 'OKR001',
    employeeId: 'EMP001',
    employeeName: 'John Smith',
    quarter: 'Q1 2024',
    objective: 'Improve engineering team efficiency and quality',
    description: 'Focus on team productivity, code quality, and knowledge sharing',
    keyResults: [
      {
        id: 'KR001',
        okrId: 'OKR001',
        description: 'Increase team velocity by 20%',
        target: 20,
        current: 18,
        unit: 'Percentage',
        progress: 90,
        confidence: 85,
        updatedDate: '2024-01-25'
      },
      {
        id: 'KR002',
        okrId: 'OKR001',
        description: 'Reduce production bugs by 30%',
        target: 30,
        current: 25,
        unit: 'Percentage',
        progress: 83,
        confidence: 80,
        updatedDate: '2024-01-20'
      },
      {
        id: 'KR003',
        okrId: 'OKR001',
        description: 'Conduct 8 knowledge sharing sessions',
        target: 8,
        current: 6,
        unit: 'Sessions',
        progress: 75,
        confidence: 90,
        updatedDate: '2024-01-28'
      }
    ],
    progress: 83,
    status: 'In Progress',
    createdDate: '2024-01-01',
    dueDate: '2024-03-31'
  }
];

export const mockFeedback360: Feedback360[] = [
  {
    id: 'FB001',
    employeeId: 'EMP001',
    employeeName: 'John Smith',
    reviewerId: 'EMP006',
    reviewerName: 'Lisa Brown',
    reviewerRelationship: 'Peer',
    reviewPeriod: {
      start: '2024-01-01',
      end: '2024-03-31'
    },
    status: 'Completed',
    competencies: [
      {
        competency: 'Technical Skills',
        rating: 4.5,
        comments: 'Excellent technical knowledge and problem-solving abilities'
      },
      {
        competency: 'Communication',
        rating: 4.0,
        comments: 'Clear and effective communicator'
      },
      {
        competency: 'Teamwork',
        rating: 4.2,
        comments: 'Great team player and collaborator'
      },
      {
        competency: 'Leadership',
        rating: 4.3,
        comments: 'Strong leadership skills and team management'
      }
    ],
    overallComments: 'John is a valuable team member with strong technical and leadership skills.',
    strengths: ['Technical expertise', 'Leadership', 'Problem solving'],
    improvements: ['Time management', 'Delegation'],
    submittedDate: '2024-04-05',
    anonymous: false
  }
];

// Learning & Development Mock Data
export const mockCourses: LMSCourse[] = [
  {
    id: 'COURSE001',
    title: 'React Advanced Patterns',
    description: 'Advanced React patterns and best practices for building scalable applications.',
    type: 'Technical',
    category: 'Frontend Development',
    format: 'Online',
    level: 'Advanced',
    duration: 16,
    instructor: 'Sarah Johnson',
    instructorId: 'EMP002',
    maxParticipants: 20,
    cost: 299,
    currency: 'AUD',
    status: 'Published',
    startDate: '2024-02-01',
    endDate: '2024-02-15',
    prerequisites: ['Basic React knowledge', 'JavaScript ES6+'],
    objectives: [
      'Master advanced React patterns',
      'Learn performance optimization techniques',
      'Understand state management best practices'
    ],
    materials: ['Video lectures', 'Code examples', 'Exercise files'],
    certificateAvailable: true,
    tags: ['React', 'JavaScript', 'Frontend'],
    createdDate: '2024-01-15',
    updatedDate: '2024-01-15'
  },
  {
    id: 'COURSE002',
    title: 'Workplace Safety Compliance',
    description: 'Mandatory workplace safety training for all employees.',
    type: 'Compliance',
    category: 'Safety',
    format: 'In-person',
    level: 'Beginner',
    duration: 4,
    instructor: 'Mike Chen',
    instructorId: 'EMP003',
    location: 'Training Room A',
    maxParticipants: 30,
    cost: 0,
    status: 'Published',
    startDate: '2024-02-05',
    prerequisites: [],
    objectives: [
      'Understand workplace safety regulations',
      'Learn emergency procedures',
      'Identify potential hazards'
    ],
    materials: ['Safety manual', 'Emergency procedures guide'],
    certificateAvailable: true,
    tags: ['Safety', 'Compliance', 'Mandatory'],
    createdDate: '2024-01-10',
    updatedDate: '2024-01-10'
  },
  {
    id: 'COURSE003',
    title: 'Leadership Essentials',
    description: 'Essential leadership skills for new managers.',
    type: 'Leadership',
    category: 'Management',
    format: 'Blended',
    level: 'Intermediate',
    duration: 24,
    instructor: 'David Wilson',
    instructorId: 'EMP005',
    maxParticipants: 15,
    cost: 599,
    currency: 'AUD',
    status: 'Published',
    startDate: '2024-02-10',
    endDate: '2024-03-10',
    prerequisites: ['Management role or promotion track'],
    objectives: [
      'Develop leadership skills',
      'Learn team management techniques',
      'Improve communication skills'
    ],
    materials: ['Leadership workbook', 'Case studies', 'Video content'],
    certificateAvailable: true,
    tags: ['Leadership', 'Management', 'Soft Skills'],
    createdDate: '2024-01-12',
    updatedDate: '2024-01-12'
  }
];

export const mockCourseEnrollments: CourseEnrollment[] = [
  {
    id: 'ENROLL001',
    courseId: 'COURSE001',
    courseTitle: 'React Advanced Patterns',
    employeeId: 'EMP001',
    employeeName: 'John Smith',
    status: 'In Progress',
    enrolledDate: '2024-01-20',
    startedDate: '2024-02-01',
    progress: 60,
    feedback: 'Great course with practical examples',
    rating: 5,
    notes: 'Very relevant to current projects'
  },
  {
    id: 'ENROLL002',
    courseId: 'COURSE002',
    courseTitle: 'Workplace Safety Compliance',
    employeeId: 'EMP001',
    employeeName: 'John Smith',
    status: 'Completed',
    enrolledDate: '2024-01-15',
    startedDate: '2024-02-05',
    completedDate: '2024-02-05',
    progress: 100,
    score: 95,
    certificateUrl: '/certificates/safety_2024_john_smith.pdf',
    feedback: 'Essential training for workplace safety',
    rating: 4,
    notes: 'Completed mandatory compliance training'
  }
];

export const mockTrainingPrograms: TrainingProgram[] = [
  {
    id: 'PROGRAM001',
    title: 'New Employee Induction',
    description: 'Comprehensive induction program for new employees.',
    type: 'Induction',
    targetAudience: ['New Employees'],
    courses: ['COURSE002', 'COURSE003'],
    duration: 28,
    mandatory: true,
    recurring: false,
    startDate: '2024-02-01',
    endDate: '2024-02-28',
    status: 'Active',
    createdDate: '2024-01-01',
    createdBy: 'EMP005'
  },
  {
    id: 'PROGRAM002',
    title: 'Leadership Development Program',
    description: 'Advanced leadership training for senior managers.',
    type: 'Skills Development',
    targetAudience: ['Senior Managers', 'Team Leads'],
    courses: ['COURSE003'],
    duration: 24,
    mandatory: false,
    recurring: true,
    frequency: 'Quarterly',
    startDate: '2024-02-10',
    endDate: '2024-05-10',
    status: 'Active',
    createdDate: '2024-01-15',
    createdBy: 'EMP005'
  }
];

export const mockLearningPaths: LearningPath[] = [
  {
    id: 'PATH001',
    title: 'Frontend Developer Career Path',
    description: 'Complete learning path for frontend developers.',
    targetRole: 'Frontend Developer',
    targetLevel: 'Senior',
    courses: ['COURSE001'],
    estimatedDuration: 40,
    difficulty: 'Advanced',
    mandatory: false,
    completionCertificate: true,
    createdDate: '2024-01-20',
    updatedDate: '2024-01-20'
  },
  {
    id: 'PATH002',
    title: 'Management Leadership Path',
    description: 'Leadership development path for managers.',
    targetRole: 'Manager',
    targetLevel: 'Senior',
    courses: ['COURSE003'],
    estimatedDuration: 50,
    difficulty: 'Intermediate',
    mandatory: true,
    completionCertificate: true,
    createdDate: '2024-01-25',
    updatedDate: '2024-01-25'
  }
];