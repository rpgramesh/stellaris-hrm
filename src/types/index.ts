export type Role = 'Super Admin' | 'Employer Admin' | 'HR Manager' | 'HR Admin' | 'Manager' | 'Employee';

export type PrivacyLevel = 'Not Accessible' | 'Employee' | 'Manager';

export interface PrivacySettings {
  email?: PrivacyLevel;
  officePhone?: PrivacyLevel;
  homePhone?: PrivacyLevel;
  emergencyContact?: PrivacyLevel;
  familyBirthday?: PrivacyLevel;
  blogUrl?: PrivacyLevel;
  mobilePhone?: PrivacyLevel;
  address?: PrivacyLevel;
  birthday?: PrivacyLevel;
  anniversary?: PrivacyLevel;
}

export interface HealthData {
  height?: number; // cm
  weight?: number; // kg
  bloodType?: string;
  vision?: { left: string; right: string };
  hearing?: { left: string; right: string };
  hand?: { left: string; right: string };
  leg?: { left: string; right: string };
}

export type EmployeeStatus = 'Active' | 'On Leave' | 'Terminated' | 'Probation';

export interface Employee {
  id: string;
  userId?: string; // Links to auth.users
  isPasswordChangeRequired?: boolean;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  // Extended Contact
  blogUrl?: string;
  officePhone?: string;
  mobilePhone?: string;
  homePhone?: string;
  address?: string;

  gender: 'Male' | 'Female' | 'Other';
  birthDate: string;
  nationality: string;
  nationalId: string;
  passport?: string;
  ethnicity?: string;
  religion?: string;
  
  // Job / Placement
  role: Role;
  department: string;
  departmentId?: string;
  position: string;
  joinDate: string; // ISO date string
  endOfProbation?: string;
  timeClockNeeded: boolean;
  status: EmployeeStatus;
  avatarUrl?: string;
  
  // Placement Details
  placementEffectiveDate?: string;
  lineManager?: string;
  lineManagerId?: string;
  branch?: string;
  level?: string;
  
  // Employment Terms
  employmentTermsEffectiveDate?: string;
  allowProfileUpdate?: boolean;
  profileUpdateDeadline?: string;

  // Payroll related
  salary?: number; // Annual Base Salary
  salaryEffectiveDate?: string;
  currency?: string;
  nextReviewDate?: string;
  paymentMethod?: 'Cash' | 'Bank';
  bankName?: string;
  bankAccount?: string;
  payCycle?: 'Monthly' | 'Weekly' | 'Fortnightly';
  superRate?: number; // Percentage (e.g., 11.5)
  
  // Family
  maritalStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  spouse?: {
    working: boolean;
    firstName: string;
    middleName?: string;
    lastName: string;
    birthDate: string;
    nationality?: string;
    nationalId?: string;
    passport?: string;
    ethnicity?: string;
    religion?: string;
  };
  childrenCount?: number;

  // Health
  health?: HealthData;

  // Directory / Access
  systemAccessRole?: 'Guest' | 'Employee' | 'Manager';
  privacySettings?: PrivacySettings;

  // Others
  remark?: string;
}

export interface Department {
  id: string;
  name: string;
  managerId: string;
  location: string;
  branchId?: string;
  branchName?: string;
}

export interface JobPosition {
  id: string;
  title: string;
  department: string;
  level: string;
  description: string;
  active: boolean;
}

export interface OnboardingTask {
  id: string;
  name: string;
  completed: boolean;
}

export interface OnboardingProcess {
  id: string;
  employeeId: string;
  startDate: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  progress: number; // 0-100
  currentStage: string;
  tasks: OnboardingTask[];
}

export type ComplianceCategory = 'Fair Work' | 'NES' | 'Modern Award' | 'Policy';
export type ComplianceStatus = 'Compliant' | 'Non-Compliant' | 'At Risk' | 'Pending Review';
export type CompliancePriority = 'High' | 'Medium' | 'Low';

export interface ComplianceItem {
  id: string;
  title: string;
  description: string;
  category: ComplianceCategory;
  status: ComplianceStatus;
  lastChecked: string;
  nextCheckDue: string;
  assignee?: string;
  priority: CompliancePriority;
  notes?: string;
}

export interface ComplianceChecklistItem {
  id: string;
  question: string;
  isCompliant: boolean;
  notes?: string;
}

export interface ComplianceChecklist {
  id: string;
  standard: string;
  items: ComplianceChecklistItem[];
  lastUpdated: string;
}

export interface Placement {
  id: string;
  employeeId: string;
  employeeName: string; // For display
  effectiveDate: string;
  jobPosition: string;
  jobPositionId?: string;
  lineManager?: string;
  lineManagerId?: string;
  department: string;
  departmentId?: string;
  branch?: string;
  branchId?: string;
  level?: string;
  levelId?: string;
  remark?: string;
}

export interface EmploymentTerm {
  id: string;
  employeeId: string;
  employeeName: string;
  effectiveDate: string;
  jobType: string;
  jobStatus: string;
  leaveWorkflow: string;
  workday: string;
  holiday: string;
  termStart?: string;
  termEnd?: string;
  remark?: string;
}

export interface WebAccount {
  id: string;
  employeeId: string;
  platform: string;
  username: string;
  status: 'Active' | 'Suspended';
  lastLogin?: string;
}

export interface EmployeeRequest {
  id: string;
  employeeId: string;
  type: 'Profile Update' | 'Asset Request' | 'Document Request' | 'Other';
  description: string;
  date: string;
  status: 'Pending' | 'Manager Approved' | 'Approved' | 'Rejected';
}

export interface Trainer {
  id: string;
  name: string;
  type?: string;
  contact?: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
}

export interface Level {
  id: string;
  name: string;
  grade: string;
  description: string;
}

export interface Bank {
  id: string;
  name: string;
  swiftCode: string;
}

export interface Course {
  id: string;
  name: string;
  description?: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
}

export interface Ethnicity {
  id: string;
  name: string;
}

export interface Religion {
  id: string;
  name: string;
}

export interface Education {
  id: string;
  employeeId: string;
  employeeName: string;
  school: string;
  fieldOfStudy: string;
  degree: string;
  grade: string;
  fromYear: string;
  toYear: string;
  attachment?: string;
  remark?: string;
}

export interface Experience {
  id: string;
  employeeId: string;
  employeeName: string;
  employer: string;
  jobTitle: string;
  fromDate: string;
  toDate: string;
  salary?: number;
  currency?: string;
  country?: string;
  attachment?: string;
  remark?: string;
}

export interface Training {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  course: string;
  courseId?: string;
  trainer: string;
  trainerId?: string;
  result?: string;
  attachment?: string;
  remark?: string;
}

export interface LegalDocument {
  id: string;
  employeeId: string;
  employeeName: string;
  documentType: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority?: string;
  attachment?: string;
  remark?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string; // ISO timestamp
  clockOut?: string; // ISO timestamp
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  selfieUrl?: string;
  status: 'Present' | 'Late' | 'Absent' | 'Half Day';
  workerType: 'Permanent' | 'Casual' | 'Contract';
  projectCode?: string;
  notes?: string;
  breaks?: BreakRecord[];
  totalBreakMinutes?: number;
  overtimeMinutes?: number;
  isFieldWork?: boolean;
  verificationPhoto?: string;
}

export interface BreakRecord {
  id: string;
  startTime: string; // ISO timestamp
  endTime?: string; // ISO timestamp
  type: 'Lunch' | 'Short' | 'Tea' | 'Other';
  notes?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  days: number;
  totalHours?: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Manager Approved';
  reason?: string;
  approvedBy?: string;
  approvedByName?: string;
  createdAt: string;
}

export interface LeaveEntitlement {
  id: string;
  employeeId: string;
  year: number;
  leaveType: string;
  totalDays: number;
  carriedOver: number;
}

export interface Payslip {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  grossPay: number;
  allowances: number;
  overtime: number;
  paygTax: number;
  netPay: number;
  superannuation: number;
  paymentDate: string;
  status: 'Draft' | 'Published' | 'Paid';
}

export type ExpenseStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Paid';

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  limit?: number;
}

export interface ExpenseType {
  id: string;
  name: string;
  description?: string;
}

export interface ExpenseWorkflow {
  id: string;
  name: string;
  steps: string[]; // Array of role names or user IDs
}

export interface ExpenseItem {
  id: string;
  claimId: string;
  categoryId: string;
  typeId: string;
  date: string;
  amount: number;
  description: string;
  receiptUrl?: string;
}

export interface ExpenseClaim {
  id: string;
  employeeId: string;
  title: string;
  dateSubmitted: string;
  status: ExpenseStatus;
  totalAmount: number;
  items: ExpenseItem[];
  workflowId?: string;
  currentApproverId?: string;
  approvedBy?: string;
  history?: {
    date: string;
    action: string;
    actorId: string;
    comment?: string;
  }[];
}

export interface IncidentCategory {
  id: string;
  code: string;
  description: string;
  active: boolean;
  color?: string;
  allowCauseless: boolean;
  reporterAllowed: 'Anonymous Employee' | 'Employee' | 'Employer';
  investigationAccess: string; // e.g. 'Join Investigation'
  teamAccess: {
    lineManager?: string;
    headOfDepartment?: string;
    headOfBranch?: string;
    customRole1?: string;
    customRole2?: string;
    customRole3?: string;
  };
  customRoleAccess: {
    roleId: string;
    access: string;
  }[];
}

export interface IncidentType {
  id: string;
  code: string;
  description: string;
  active: boolean;
  categoryId: string;
  weight: number; // 0-10
  rule?: string;
}

export interface IncidentDecision {
  id: string;
  name: string;
}

export interface Incident {
  id: string;
  categoryId: string;
  typeId: string;
  fromDate: string;
  toDate: string;
  summary: string;
  story?: string;
  attachment?: string;
  
  // Investigation
  status: 'Not Started' | 'In Progress' | 'Completed';
  isOpen: boolean;
  explainBy?: string;
  
  // Decision
  decisionId?: string;
  decisionFrom?: string;
  decisionTo?: string;

  // Management
  managementRemark?: string;

  // Meta
  createdBy?: string; // Employee ID or 'Anonymous'
  createdAt: string;
}

export interface OnboardingStep {
  id: string;
  name: string;
  completed: boolean;
  dueDate?: string;
  assignee?: string;
}

export interface OnboardingWorkflow {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  department: string;
  startDate: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  progress: number;
  steps: OnboardingStep[];
  managerId?: string;
}

export interface OffboardingStep {
  id: string;
  name: string;
  completed: boolean;
  dueDate?: string;
  assignee?: string;
}

export interface OffboardingWorkflow {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  department: string;
  exitDate: string;
  type: 'Voluntary' | 'Involuntary' | 'Retirement';
  status: 'Pending' | 'In Progress' | 'Completed';
  progress: number;
  steps: OffboardingStep[];
  managerId?: string;
}

// Talent Management Interfaces

export type JobStatus = 'Draft' | 'Published' | 'Paused' | 'Closed' | 'Filled';
export type JobPriority = 'High' | 'Medium' | 'Low';
export type JobType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Freelance';
export type JobLocation = 'On-site' | 'Remote' | 'Hybrid';

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  jobType: JobType;
  locationType: JobLocation;
  description: string;
  requirements: string[];
  responsibilities: string[];
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  experienceLevel: 'Entry' | 'Mid' | 'Senior' | 'Lead' | 'Executive';
  status: JobStatus;
  priority: JobPriority;
  postedDate: string;
  closingDate?: string;
  hiringManagerId: string;
  hiringManagerName: string;
  applicantsCount: number;
  interviewsScheduled: number;
  offersMade: number;
  tags: string[];
  remote: boolean;
  urgent: boolean;
}

export type ApplicantStatus = 'New' | 'Screening' | 'Interview' | 'Assessment' | 'Offer' | 'Hired' | 'Rejected' | 'Withdrawn';
export type ApplicantSource = 'Job Board' | 'Referral' | 'LinkedIn' | 'Company Website' | 'Recruiter' | 'Campus' | 'Other';

export interface Applicant {
  id: string;
  jobId: string;
  jobTitle: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  resumeUrl?: string;
  coverLetterUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  status: ApplicantStatus;
  source: ApplicantSource;
  referrerId?: string;
  referrerName?: string;
  appliedDate: string;
  currentStage?: string;
  nextAction?: string;
  nextActionDate?: string;
  rating: number; // 1-5
  experience: string;
  currentCompany?: string;
  currentPosition?: string;
  expectedSalary?: number;
  noticePeriod?: string;
  availableDate?: string;
  tags: string[];
  notes: string;
  interviews: Interview[];
  assessments: Assessment[];
  offers: Offer[];
}

export interface Interview {
  id: string;
  applicantId: string;
  type: 'Phone' | 'Video' | 'In-person' | 'Panel' | 'Technical' | 'HR';
  scheduledDate: string;
  duration: number; // minutes
  interviewerId: string;
  interviewerName: string;
  interviewerRole: string;
  location?: string;
  meetingLink?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'No-show';
  feedback?: string;
  rating?: number; // 1-5
  recommendation?: 'Strong Yes' | 'Yes' | 'Maybe' | 'No' | 'Strong No';
  notes?: string;
}

export interface Assessment {
  id: string;
  applicantId: string;
  type: 'Technical' | 'Psychometric' | 'Skills' | 'Personality' | 'Cognitive' | 'Language';
  name: string;
  scheduledDate?: string;
  completedDate?: string;
  duration?: number; // minutes
  score?: number;
  maxScore?: number;
  percentage?: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Expired';
  result?: 'Pass' | 'Fail' | 'Needs Review';
  notes?: string;
  attachmentUrl?: string;
}

export type OfferStatus = 'Draft' | 'Sent' | 'Pending Response' | 'Accepted' | 'Rejected' | 'Expired' | 'Withdrawn';

export interface Offer {
  id: string;
  applicantId: string;
  jobId: string;
  jobTitle: string;
  applicantName: string;
  salary: {
    base: number;
    currency: string;
    frequency: 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | 'Annually';
  };
  benefits: string[];
  startDate: string;
  probationPeriod?: number; // months
  noticePeriod?: number; // months
  status: OfferStatus;
  sentDate?: string;
  responseDeadline?: string;
  responseDate?: string;
  notes?: string;
  createdBy: string;
  createdDate: string;
  approvedBy?: string;
}

// Performance Management

export type ReviewCycle = 'Quarterly' | 'Semi-annual' | 'Annual';
export type ReviewStatus = 'Draft' | 'In Progress' | 'Submitted' | 'Manager Review' | 'Completed' | 'Closed';

export interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: string;
  cycle: ReviewCycle;
  period: {
    start: string;
    end: string;
  };
  status: ReviewStatus;
  selfAssessment?: {
    strengths: string[];
    improvements: string[];
    achievements: string[];
    goals: string[];
    submittedDate?: string;
  };
  managerAssessment?: {
    strengths: string[];
    improvements: string[];
    achievements: string[];
    goals: string[];
    overallRating: number; // 1-5
    submittedDate?: string;
  };
  finalRating?: number; // 1-5
  recommendations?: string[];
  developmentPlan?: string[];
  promotionRecommendation?: 'Strong Yes' | 'Yes' | 'Maybe' | 'No' | 'Not Applicable';
  salaryAdjustment?: {
    current: number;
    recommended: number;
    effectiveDate: string;
  };
  completedDate?: string;
}

export interface KPI {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  description: string;
  category: 'Financial' | 'Customer' | 'Process' | 'Learning' | 'Quality' | 'Productivity';
  target: string;
  currentValue: string;
  unit: string;
  weight: number; // 0-100
  progress: number; // 0-100
  dueDate: string;
  status: 'Not Started' | 'In Progress' | 'At Risk' | 'Completed' | 'Overdue';
  notes?: string;
  updatedDate: string;
}

export interface OKR {
  id: string;
  employeeId: string;
  employeeName: string;
  quarter: string; // e.g., 'Q1 2024'
  objective: string;
  description: string;
  keyResults: KeyResult[];
  progress: number; // 0-100 (calculated from key results)
  status: 'Draft' | 'In Progress' | 'Completed' | 'Closed';
  createdDate: string;
  dueDate: string;
  completedDate?: string;
}

export interface KeyResult {
  id: string;
  okrId: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  progress: number; // 0-100 (calculated)
  confidence: number; // 0-100
  notes?: string;
  updatedDate: string;
}

export interface Feedback360 {
  id: string;
  employeeId: string;
  employeeName: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRelationship: 'Manager' | 'Peer' | 'Subordinate' | 'Customer' | 'Self';
  reviewPeriod: {
    start: string;
    end: string;
  };
  status: 'Pending' | 'In Progress' | 'Completed';
  competencies: CompetencyRating[];
  overallComments?: string;
  strengths?: string[];
  improvements?: string[];
  submittedDate?: string;
  anonymous: boolean;
}

export interface CompetencyRating {
  competency: string;
  rating: number; // 1-5
  comments?: string;
}

// Learning & Development

export type CourseType = 'Mandatory' | 'Compliance' | 'Skills' | 'Leadership' | 'Technical' | 'Soft Skills' | 'Induction';
export type CourseStatus = 'Draft' | 'Published' | 'Archived';
export type CourseFormat = 'Online' | 'In-person' | 'Blended' | 'Webinar';
export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface LMSCourse {
  id: string;
  title: string;
  description: string;
  type: CourseType;
  category: string;
  format: CourseFormat;
  level: CourseLevel;
  duration: number; // hours
  instructor?: string;
  instructorId?: string;
  location?: string;
  meetingLink?: string;
  maxParticipants?: number;
  cost?: number;
  currency?: string;
  status: CourseStatus;
  startDate?: string;
  endDate?: string;
  prerequisites: string[];
  objectives: string[];
  materials: string[];
  certificateAvailable: boolean;
  certificateTemplate?: string;
  tags: string[];
  createdDate: string;
  updatedDate: string;
}

export type EnrollmentStatus = 'Enrolled' | 'In Progress' | 'Completed' | 'Dropped' | 'Waitlisted';

export interface CourseEnrollment {
  id: string;
  courseId: string;
  courseTitle: string;
  employeeId: string;
  employeeName: string;
  status: EnrollmentStatus;
  enrolledDate: string;
  startedDate?: string;
  completedDate?: string;
  progress: number; // 0-100
  score?: number; // 0-100
  certificateUrl?: string;
  feedback?: string;
  rating?: number; // 1-5
  notes?: string;
}

export interface TrainingProgram {
  id: string;
  title: string;
  description: string;
  type: 'Induction' | 'Compliance' | 'Skills Development' | 'Leadership' | 'Custom';
  targetAudience: string[]; // role names or department names
  courses: string[]; // course IDs
  duration: number; // total hours
  mandatory: boolean;
  recurring: boolean;
  frequency?: 'Monthly' | 'Quarterly' | 'Semi-annual' | 'Annual';
  startDate?: string;
  endDate?: string;
  status: 'Draft' | 'Active' | 'Completed' | 'Archived';
  createdDate: string;
  createdBy: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  targetRole: string;
  targetLevel: string;
  courses: string[]; // course IDs in sequence
  estimatedDuration: number; // hours
  difficulty: CourseLevel;
  mandatory: boolean;
  completionCertificate: boolean;
  createdDate: string;
  updatedDate: string;
}

// System Configuration Interfaces

export interface Module {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface CompanyInformation {
  id: string;
  companyName: string;
  registrationNumber: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  primaryContact: string;
  foundedYear: string;
}

export interface SystemSettings {
  id: string;
  dateFormat: string;
  timeZone: string;
  currency: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  twoFactorAuth: boolean;
  sessionTimeout: string;
}

// Timesheet & Projects
export type TimesheetStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  managerId?: string;
  color: string;
  active: boolean;
}

export interface TimesheetEntry {
  id: string;
  rowId: string;
  date: string;
  hours: number;
  notes?: string;
}

export interface TimesheetRow {
  id: string;
  timesheetId: string;
  projectId?: string;
  project?: Project;
  type: 'Project' | 'Break';
  entries: TimesheetEntry[];
}

export interface TimesheetTemplate {
  id: string;
  name: string;
  projectIds: string[];
}

export interface Timesheet {
  id: string;
  employeeId: string;
  weekStartDate: string;
  status: TimesheetStatus;
  totalHours: number;
  rows: TimesheetRow[];
  created_at: string;
  updated_at: string;
}
