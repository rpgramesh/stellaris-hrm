"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUser } from '@/app/actions/auth';
import { Employee } from '@/types';
import { organizationService, Department, Manager } from '@/services/organizationService';

interface EmployeeFormProps {
  initialData?: Employee;
  managers?: Employee[];
  onSubmit: (data: Employee) => void;
  title: string;
  backUrl: string;
}

export default function EmployeeForm({ initialData, managers = [], onSubmit, title, backUrl }: EmployeeFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'quick' | 'personal' | 'job' | 'salary' | 'family' | 'contact' | 'health' | 'directory' | 'others'>('quick');
  const [password, setPassword] = useState('');
  
  // Hierarchy State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<Manager[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);

  // Load Departments on mount
  useEffect(() => {
    const loadDepartments = async () => {
      setLoadingHierarchy(true);
      try {
        const data = await organizationService.getDepartments();
        setDepartments(data);
      } catch (err) {
        console.error('Failed to load departments:', err);
      } finally {
        setLoadingHierarchy(false);
      }
    };
    loadDepartments();
  }, []);

  // Default form state
  const defaultFormData = {
    // Personal / Quick
    id: '',
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'Female',
    birthDate: '2006-01-01',
    nationality: 'Australia',
    nationalId: '',
    passport: '',
    jobPosition: '',
    email: '',
    phone: '',
    allowProfileUpdate: false,
    profileUpdateDeadline: '2026-02-03',
    ethnicity: '',
    religion: '',
    
    // Job
    dateJoined: '2026-01-01',
    endOfProbation: '',
    timeClockNeeded: true,
    placementEffectiveDate: '2026-01-01',
    lineManager: '',
    lineManagerId: '',
    department: '',
    departmentId: '',
    branch: '',
    level: '',
    status: 'Active',
    employmentTermsEffectiveDate: '2026-01-01',
    
    // Salary
    salaryEffectiveDate: '2026-01-01',
    basicSalary: '',
    currency: 'AUD',
    nextReviewDate: '',
    paymentBank: '',
    paymentAccount: '',
    payCycle: 'Monthly',
    paymentMethod: 'Cash',
    
    // Family
    maritalStatus: 'Single',
    spouseWorking: false,
    spouseFirstName: '',
    spouseMiddleName: '',
    spouseLastName: '',
    spouseBirthDate: '',
    spouseNationality: 'Australia',
    spouseNationalId: '',
    spousePassport: '',
    spouseEthnicity: '',
    spouseReligion: '',
    childrenCount: 0,

    // Contact
    blogUrl: '',
    officePhone: '',
    mobilePhone: '',
    homePhone: '',

    // Health
    height: '',
    weight: '',
    bloodType: '',
    visionLeft: '',
    visionRight: '',
    hearingLeft: '',
    hearingRight: '',
    handLeft: '',
    handRight: '',
    legLeft: '',
    legRight: '',

    // Directory
    role: 'Employee',
    systemAccessRole: 'Employee',
    privacyEmail: 'Employee',
    privacyOfficePhone: 'Employee',
    privacyMobilePhone: 'Employee',
    privacyHomePhone: 'Not Accessible',
    privacyEmergencyContact: 'Manager',
    privacyFamilyBirthday: 'Employee',
    privacyBlogUrl: 'Employee',
    privacyAddress: 'Not Accessible',
    privacyBirthday: 'Employee',
    privacyAnniversary: 'Employee',

    // Others
    remark: '',
  };

  const [formData, setFormData] = useState(defaultFormData);

  // Initialize form data from initialData if provided
  useEffect(() => {
    if (initialData) {
      setFormData({
        // Personal
        id: initialData.id,
        firstName: initialData.firstName,
        middleName: initialData.middleName || '',
        lastName: initialData.lastName,
        gender: initialData.gender,
        birthDate: initialData.birthDate,
        nationality: initialData.nationality,
        nationalId: initialData.nationalId,
        passport: initialData.passport || '',
        jobPosition: initialData.position,
        email: initialData.email,
        phone: initialData.phone,
        allowProfileUpdate: initialData.allowProfileUpdate || false,
        profileUpdateDeadline: initialData.profileUpdateDeadline || '',
        ethnicity: initialData.ethnicity || '',
        religion: initialData.religion || '',
        
        // Job
        dateJoined: initialData.joinDate,
        endOfProbation: initialData.endOfProbation || '',
        timeClockNeeded: initialData.timeClockNeeded,
        placementEffectiveDate: initialData.placementEffectiveDate || '',
        lineManager: initialData.lineManager || '',
        lineManagerId: initialData.lineManagerId || '',
        department: initialData.department,
        departmentId: initialData.departmentId || '',
        branch: initialData.branch || '',
        level: initialData.level || '',
        status: initialData.status || 'Active',
        employmentTermsEffectiveDate: initialData.employmentTermsEffectiveDate || '',
        
        // Salary
        salaryEffectiveDate: initialData.salaryEffectiveDate || '',
        basicSalary: initialData.salary?.toString() || '',
        currency: initialData.currency || 'AUD',
        nextReviewDate: initialData.nextReviewDate || '',
        paymentBank: initialData.bankName || '',
        paymentAccount: initialData.bankAccount || '',
        payCycle: initialData.payCycle || 'Monthly',
        paymentMethod: initialData.paymentMethod || 'Cash',
        
        // Family
        maritalStatus: initialData.maritalStatus || 'Single',
        spouseWorking: initialData.spouse?.working || false,
        spouseFirstName: initialData.spouse?.firstName || '',
        spouseMiddleName: initialData.spouse?.middleName || '',
        spouseLastName: initialData.spouse?.lastName || '',
        spouseBirthDate: initialData.spouse?.birthDate || '',
        spouseNationality: initialData.spouse?.nationality || 'Australia',
        spouseNationalId: initialData.spouse?.nationalId || '',
        spousePassport: initialData.spouse?.passport || '',
        spouseEthnicity: initialData.spouse?.ethnicity || '',
        spouseReligion: initialData.spouse?.religion || '',
        childrenCount: initialData.childrenCount || 0,

        // Contact
        blogUrl: initialData.blogUrl || '',
        officePhone: initialData.officePhone || '',
        mobilePhone: initialData.mobilePhone || '',
        homePhone: initialData.homePhone || '',

        // Health
        height: initialData.health?.height?.toString() || '',
        weight: initialData.health?.weight?.toString() || '',
        bloodType: initialData.health?.bloodType || '',
        visionLeft: initialData.health?.vision?.left || '',
        visionRight: initialData.health?.vision?.right || '',
        hearingLeft: initialData.health?.hearing?.left || '',
        hearingRight: initialData.health?.hearing?.right || '',
        handLeft: initialData.health?.hand?.left || '',
        handRight: initialData.health?.hand?.right || '',
        legLeft: initialData.health?.leg?.left || '',
        legRight: initialData.health?.leg?.right || '',

        // Directory
        role: initialData.role || 'Employee',
        systemAccessRole: initialData.systemAccessRole || 'Employee',
        privacyEmail: initialData.privacySettings?.email || 'Employee',
        privacyOfficePhone: initialData.privacySettings?.officePhone || 'Employee',
        privacyMobilePhone: initialData.privacySettings?.mobilePhone || 'Employee',
        privacyHomePhone: initialData.privacySettings?.homePhone || 'Not Accessible',
        privacyEmergencyContact: initialData.privacySettings?.emergencyContact || 'Manager',
        privacyFamilyBirthday: initialData.privacySettings?.familyBirthday || 'Employee',
        privacyBlogUrl: initialData.privacySettings?.blogUrl || 'Employee',
        privacyAddress: initialData.privacySettings?.address || 'Not Accessible',
        privacyBirthday: initialData.privacySettings?.birthday || 'Employee',
        privacyAnniversary: initialData.privacySettings?.anniversary || 'Employee',

        // Others
        remark: initialData.remark || '',
      });
    }
  }, [initialData]);

  // Sync Managers when Department changes
  useEffect(() => {
    const fetchManagers = async () => {
      if (formData.departmentId) {
        const dept = departments.find(d => d.id === formData.departmentId);
        try {
          // If we found the department, use its branch info for better filtering
          // Otherwise just try fetching by departmentId
          const managers = await organizationService.getManagers(dept?.branchId || undefined, formData.departmentId || undefined);
          // Filter out the current employee from the manager list to prevent self-management
          setFilteredManagers(managers.filter(m => m.id !== formData.id));
        } catch (error) {
          console.error('Error fetching managers:', error);
        }
      } else {
        setFilteredManagers([]);
      }
    };
    
    fetchManagers();
  }, [formData.departmentId, departments]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deptId = e.target.value;
    const selectedDept = departments.find(d => d.id === deptId);
    
    setFormData(prev => ({
      ...prev,
      departmentId: deptId,
      department: selectedDept?.name || '',
      branch: selectedDept?.branchName || '',
      lineManager: '',
      lineManagerId: ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Map form data to Employee type
    const employeeData: Employee = {
      id: formData.id,
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      gender: formData.gender as 'Male' | 'Female' | 'Other',
      birthDate: formData.birthDate,
      nationality: formData.nationality,
      nationalId: formData.nationalId,
      passport: formData.passport,
      ethnicity: formData.ethnicity,
      religion: formData.religion,
      
      role: (formData as any).role || 'Employee',
      department: formData.department,
      position: formData.jobPosition,
      joinDate: formData.dateJoined,
      endOfProbation: formData.endOfProbation,
      timeClockNeeded: formData.timeClockNeeded,
      status: formData.status as 'Active' | 'On Leave' | 'Terminated' | 'Probation',
      avatarUrl: (formData as any).avatarUrl,
     // Placement
      placementEffectiveDate: formData.placementEffectiveDate,
      lineManager: formData.lineManager,
      lineManagerId: formData.lineManagerId,
      branch: formData.branch,
      level: formData.level,
      
      employmentTermsEffectiveDate: formData.employmentTermsEffectiveDate,
      allowProfileUpdate: formData.allowProfileUpdate,
      profileUpdateDeadline: formData.profileUpdateDeadline,
      
      salary: formData.basicSalary ? Number(formData.basicSalary) : undefined,
      salaryEffectiveDate: formData.salaryEffectiveDate,
      currency: formData.currency,
      nextReviewDate: formData.nextReviewDate,
      paymentMethod: formData.paymentMethod as 'Cash' | 'Bank',
      bankName: formData.paymentBank,
      bankAccount: formData.paymentAccount,
      payCycle: formData.payCycle as 'Monthly' | 'Weekly' | 'Fortnightly',
      
      maritalStatus: formData.maritalStatus as 'Single' | 'Married' | 'Divorced' | 'Widowed',
      spouse: formData.maritalStatus === 'Married' ? {
        working: formData.spouseWorking,
        firstName: formData.spouseFirstName,
        middleName: formData.spouseMiddleName,
        lastName: formData.spouseLastName,
        birthDate: formData.spouseBirthDate,
        nationality: formData.spouseNationality,
        nationalId: formData.spouseNationalId,
        passport: formData.spousePassport,
        ethnicity: formData.spouseEthnicity,
        religion: formData.spouseReligion,
      } : undefined,
      childrenCount: Number(formData.childrenCount),

      // Contact
      blogUrl: formData.blogUrl,
      officePhone: formData.officePhone,
      mobilePhone: formData.mobilePhone,
      homePhone: formData.homePhone,

      // Health
      health: {
        height: formData.height ? Number(formData.height) : undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
        bloodType: formData.bloodType,
        vision: {
          left: formData.visionLeft,
          right: formData.visionRight,
        },
        hearing: {
          left: formData.hearingLeft,
          right: formData.hearingRight,
        },
        hand: {
          left: formData.handLeft,
          right: formData.handRight,
        },
        leg: {
          left: formData.legLeft,
          right: formData.legRight,
        },
      },

      // Directory
      systemAccessRole: formData.systemAccessRole as 'Guest' | 'Employee' | 'Manager',
      privacySettings: {
        email: formData.privacyEmail as any,
        officePhone: formData.privacyOfficePhone as any,
        mobilePhone: formData.privacyMobilePhone as any,
        homePhone: formData.privacyHomePhone as any,
        emergencyContact: formData.privacyEmergencyContact as any,
        familyBirthday: formData.privacyFamilyBirthday as any,
        blogUrl: formData.privacyBlogUrl as any,
        address: formData.privacyAddress as any,
        birthday: formData.privacyBirthday as any,
        anniversary: formData.privacyAnniversary as any,
      },

      // Others
      remark: formData.remark,
    };

    if (password && !initialData) {
      try {
        const { userId, error } = await createUser(formData.email, password, `${formData.firstName} ${formData.lastName}`);
        if (error) {
          alert(`Failed to create user account: ${error}`);
          return;
        }
        if (userId) {
          (employeeData as any).userId = userId;
          (employeeData as any).isPasswordChangeRequired = true;
        }
      } catch (err: any) {
        alert(`Error: ${err.message}`);
        return;
      }
    }

    onSubmit(employeeData);
  };

  const renderTextField = (name: string, label: string, required = false, type = 'text', placeholder = '') => (
    <div className="relative">
      <input
        type={type}
        name={name}
        value={(formData as any)[name] ?? ''}
        onChange={handleChange}
        className="peer w-full border border-gray-300 rounded px-3 pt-4 pb-2 focus:border-blue-500 focus:outline-none placeholder-transparent"
        placeholder={placeholder || label}
      />
      <label className="absolute left-3 top-0 text-xs text-gray-500 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-0 peer-focus:text-xs peer-focus:text-blue-500">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    </div>
  );

  const renderSelectField = (name: string, label: string, options: string[], required = false) => (
    <div className="relative">
      <select
        name={name}
        value={(formData as any)[name] ?? ''}
        onChange={handleChange}
        className="peer w-full border border-gray-300 rounded px-3 pt-4 pb-2 focus:border-blue-500 focus:outline-none bg-transparent appearance-none"
      >
        <option value="">Select {label}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <label className="absolute left-3 top-0 text-xs text-gray-500">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="absolute right-3 top-4 pointer-events-none">
        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>
  );

  const renderDepartmentSelect = () => (
    <div className="relative">
      <select
        name="departmentId"
        value={(formData as any).departmentId ?? ''}
        onChange={handleDepartmentChange}
        className="peer w-full border border-gray-300 rounded px-3 pt-4 pb-2 focus:border-blue-500 focus:outline-none bg-transparent appearance-none"
        required
      >
        <option value="">Select Department</option>
        {departments.map(dept => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
          </option>
        ))}
      </select>
      <label className="absolute left-3 top-0 text-xs text-gray-500">
        Department {loadingHierarchy && '(Loading...)'}
      </label>
      <div className="absolute right-3 top-4 pointer-events-none">
        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>
  );

  const renderManagerSelect = () => (
    <div className="relative">
      <select
        name="lineManagerId"
        value={(formData as any).lineManagerId ?? ''}
        onChange={(e) => {
          const selectedId = e.target.value;
          const selectedManager = filteredManagers.find(m => m.id === selectedId);
          setFormData(prev => ({
            ...prev,
            lineManagerId: selectedId,
            lineManager: selectedManager ? `${selectedManager.firstName} ${selectedManager.lastName}` : ''
          }));
        }}
        className="peer w-full border border-gray-300 rounded px-3 pt-4 pb-2 focus:border-blue-500 focus:outline-none bg-transparent appearance-none"
        disabled={!formData.departmentId}
        required
      >
        <option value="">Select Line Manager</option>
        {filteredManagers.map(m => (
          <option key={m.id} value={m.id}>
            {m.firstName} {m.lastName}
          </option>
        ))}
      </select>
      <label className="absolute left-3 top-0 text-xs text-gray-500">
        Line Manager {!formData.departmentId ? '(Select Dept First)' : ''}
      </label>
      <div className="absolute right-3 top-4 pointer-events-none">
        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Link href={backUrl} className="bg-blue-500 rounded-full p-1 text-white hover:bg-blue-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-medium text-gray-800">{title}</h1>
        </div>
        <button 
          onClick={handleSubmit}
          className="bg-green-500 rounded-full p-1 text-white hover:bg-green-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 overflow-x-auto">
        <div className="flex space-x-6 text-sm">
          {['quick', 'personal', 'job', 'salary', 'family', 'contact', 'health', 'directory', 'others'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-3 px-1 border-b-2 font-medium capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
          
          {/* Quick Entry Tab */}
          {activeTab === 'quick' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-yellow-400/20 border border-yellow-400/30 p-4 rounded-md flex items-center gap-3 text-yellow-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-medium">In a rush? Just fill up this page and you are good to go.</span>
              </div>

              <div className="bg-white rounded-md shadow-sm border border-gray-200 p-4 space-y-4">
                {renderTextField('id', 'ID', true)}
                <div className="grid grid-cols-2 gap-4">
                  {renderTextField('firstName', 'First Name', true)}
                  {renderTextField('lastName', 'Last Name', true)}
                </div>
                {renderSelectField('gender', 'Gender', ['Female', 'Male', 'Other'], true)}
                {renderTextField('birthDate', 'Birth Date', true, 'date')}
                {renderSelectField('nationality', 'Nationality', ['Australia', 'USA', 'UK', 'Canada'])}
                <div className="grid grid-cols-2 gap-4">
                  {renderTextField('nationalId', 'National ID', true)}
                  {renderTextField('passport', 'Passport')}
                </div>
                {renderSelectField('jobPosition', 'Job Position', ['Manager', 'Developer', 'Designer'], true)}
                <div className="grid grid-cols-2 gap-4">
                  {renderTextField('phone', 'Phone', false, 'tel')}
                  {renderTextField('email', 'Email (Web Account)', false, 'email')}
                </div>
                {!initialData && (
                   <div className="mt-4">
                     <div className="relative">
                       <input
                         type="text"
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         className="peer w-full border border-gray-300 rounded px-3 pt-4 pb-2 focus:border-blue-500 focus:outline-none placeholder-transparent"
                         placeholder="Default Password"
                       />
                       <label className="absolute left-3 top-0 text-xs text-gray-500 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-0 peer-focus:text-xs peer-focus:text-blue-500">
                         Default Password (for User Account)
                       </label>
                     </div>
                     <p className="text-xs text-gray-500 mt-1">Leave empty to skip account creation. Employee can register later.</p>
                   </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'personal' && (
             <div className="space-y-4 animate-fade-in bg-white p-4 rounded-md shadow-sm border border-gray-200">
                <h3 className="font-medium text-lg border-b pb-2 mb-4">Personal Details</h3>
                <div className="grid grid-cols-2 gap-4">
                    {renderTextField('middleName', 'Middle Name')}
                    {renderTextField('ethnicity', 'Ethnicity')}
                    {renderTextField('religion', 'Religion')}
                </div>
             </div>
          )}

          {activeTab === 'job' && (
            <div className="space-y-4 animate-fade-in bg-white p-4 rounded-md shadow-sm border border-gray-200">
                 <h3 className="font-medium text-lg border-b pb-2 mb-4">Job Details</h3>
                 <div className="grid grid-cols-2 gap-4">
                    {renderTextField('dateJoined', 'Date Joined', false, 'date')}
                    {renderDepartmentSelect()}
                    <div className="relative">
                      <input
                        type="text"
                        name="branch"
                        value={formData.branch}
                        readOnly
                        className="peer w-full border border-gray-300 rounded px-3 pt-4 pb-2 bg-gray-50 text-gray-500 focus:outline-none"
                        placeholder="Branch"
                      />
                      <label className="absolute left-3 top-0 text-xs text-gray-500 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-0 peer-focus:text-xs peer-focus:text-blue-500">
                        Branch (Auto-filled)
                      </label>
                    </div>
                    {renderManagerSelect()}
                    {renderSelectField('status', 'Employment Status', ['Active', 'On Leave', 'Terminated', 'Probation'], true)}
                    <div className="flex items-center gap-3">
                         <input 
                            type="checkbox" 
                            name="timeClockNeeded" 
                            checked={formData.timeClockNeeded}
                            onChange={handleChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                         />
                         <label className="text-sm text-gray-700">Time Clock Needed</label>
                    </div>
                 </div>
            </div>
          )}

          {activeTab === 'salary' && (
            <div className="space-y-4 animate-fade-in bg-white p-4 rounded-md shadow-sm border border-gray-200">
                 <h3 className="font-medium text-lg border-b pb-2 mb-4">Salary & Payroll</h3>
                 <div className="grid grid-cols-2 gap-4">
                    {renderTextField('salaryEffectiveDate', 'Effective Date', false, 'date')}
                    {renderTextField('basicSalary', 'Basic Salary', false, 'number')}
                    {renderTextField('currency', 'Currency')}
                    {renderTextField('nextReviewDate', 'Next Review', false, 'date')}
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    {renderSelectField('paymentMethod', 'Payment Method', ['Cash', 'Bank'])}
                    {renderSelectField('payCycle', 'Pay Cycle', ['Monthly', 'Weekly', 'Fortnightly'])}
                 </div>
                 {formData.paymentMethod === 'Bank' && (
                    <div className="grid grid-cols-2 gap-4">
                        {renderTextField('paymentBank', 'Bank Name')}
                        {renderTextField('paymentAccount', 'Account Number')}
                    </div>
                 )}
            </div>
          )}

          {activeTab === 'family' && (
            <div className="space-y-4 animate-fade-in bg-white p-4 rounded-md shadow-sm border border-gray-200">
                 <h3 className="font-medium text-lg border-b pb-2 mb-4">Family Details</h3>
                 <div className="grid grid-cols-2 gap-4">
                    {renderSelectField('maritalStatus', 'Marital Status', ['Single', 'Married', 'Divorced', 'Widowed'])}
                    {renderTextField('childrenCount', 'Children Count', false, 'number')}
                 </div>
                 {formData.maritalStatus === 'Married' && (
                    <div className="mt-4 border-t pt-4">
                        <h4 className="font-medium mb-3">Spouse Details</h4>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            {renderTextField('spouseFirstName', 'Spouse First Name')}
                            {renderTextField('spouseLastName', 'Spouse Last Name')}
                            {renderTextField('spouseBirthDate', 'Spouse Birth Date', false, 'date')}
                        </div>
                    </div>
                 )}
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-4 animate-fade-in bg-white p-4 rounded-md shadow-sm border border-gray-200">
                 <h3 className="font-medium text-lg border-b pb-2 mb-4">Extended Contact Info</h3>
                 <div className="grid grid-cols-2 gap-4">
                    {renderTextField('blogUrl', 'Blog URL', false, 'url')}
                    {renderTextField('officePhone', 'Office Phone', false, 'tel')}
                    {renderTextField('mobilePhone', 'Mobile Phone', false, 'tel')}
                    {renderTextField('homePhone', 'Home Phone', false, 'tel')}
                 </div>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="space-y-4 animate-fade-in bg-white p-4 rounded-md shadow-sm border border-gray-200">
                 <h3 className="font-medium text-lg border-b pb-2 mb-4">Health Metrics</h3>
                 <div className="grid grid-cols-3 gap-4">
                    {renderTextField('height', 'Height (cm)', false, 'number')}
                    {renderTextField('weight', 'Weight (kg)', false, 'number')}
                    {renderTextField('bloodType', 'Blood Type')}
                 </div>
                 <h4 className="font-medium mt-4 mb-2">Senses & Limbs</h4>
                 <div className="grid grid-cols-2 gap-4">
                    {renderTextField('visionLeft', 'Vision (Left)')}
                    {renderTextField('visionRight', 'Vision (Right)')}
                    {renderTextField('hearingLeft', 'Hearing (Left)')}
                    {renderTextField('hearingRight', 'Hearing (Right)')}
                 </div>
            </div>
          )}

          {activeTab === 'directory' && (
            <div className="space-y-4 animate-fade-in bg-white p-4 rounded-md shadow-sm border border-gray-200">
                 <h3 className="font-medium text-lg border-b pb-2 mb-4">Directory & Access</h3>
                 <div className="mb-4 grid grid-cols-2 gap-4">
                    {renderSelectField('role', 'System Role (Permissions)', ['Super Admin', 'Employer Admin', 'HR Manager', 'HR Admin', 'Manager', 'Employee'], true)}
                    {renderSelectField('systemAccessRole', 'System Access Role', ['Guest', 'Employee', 'Manager'])}
                 </div>
                 <h4 className="font-medium mb-3">Privacy Settings (Who can see?)</h4>
                 <div className="grid grid-cols-2 gap-4">
                    {renderSelectField('privacyEmail', 'Email Visibility', ['Not Accessible', 'Employee', 'Manager'])}
                    {renderSelectField('privacyMobilePhone', 'Mobile Visibility', ['Not Accessible', 'Employee', 'Manager'])}
                    {renderSelectField('privacyAddress', 'Address Visibility', ['Not Accessible', 'Employee', 'Manager'])}
                 </div>
            </div>
          )}

          {activeTab === 'others' && (
            <div className="space-y-4 animate-fade-in bg-white p-4 rounded-md shadow-sm border border-gray-200">
                 <h3 className="font-medium text-lg border-b pb-2 mb-4">Remarks & Notes</h3>
                 <div className="relative">
                    <textarea
                        name="remark"
                        value={formData.remark ?? ''}
                        onChange={handleChange}
                        rows={6}
                        maxLength={2000}
                        className="peer w-full border border-gray-300 rounded px-3 pt-4 pb-2 focus:border-blue-500 focus:outline-none placeholder-transparent"
                        placeholder="Remarks"
                    />
                    <label className="absolute left-3 top-0 text-xs text-gray-500 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-0 peer-focus:text-xs peer-focus:text-blue-500">
                        Remarks (Max 2000 chars)
                    </label>
                    <div className="text-right text-xs text-gray-500 mt-1">
                        {formData.remark.length}/2000
                    </div>
                 </div>
            </div>
          )}
              
          <div className="flex justify-end pt-6">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
            >
              {initialData ? 'Update Employee' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
