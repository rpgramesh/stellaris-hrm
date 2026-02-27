"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUser } from '@/app/actions/auth';
import { Employee } from '@/types';
import { organizationService, Department, Manager } from '@/services/organizationService';
import { supabase } from '@/lib/supabase';

interface EmployeeFormProps {
  initialData?: Employee;
  managers?: Employee[];
  onSubmit: (data: Employee) => void;
  title: string;
  backUrl: string;
}

export default function EmployeeForm({ initialData, managers = [], onSubmit, title, backUrl }: EmployeeFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'quick' | 'personal' | 'job' | 'salary' | 'contact' | 'client' | 'directory' | 'others'>('quick');
  
  // Hierarchy State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<Manager[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const [inviteLater, setInviteLater] = useState(false);

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

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfileUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${formData.id || 'new'}_${Date.now()}.${ext}`;
      const filePath = `profile-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading profile photo:', uploadError);
        alert('Failed to upload profile photo.');
        return;
      }

      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      setFormData(prev => ({
        ...prev,
        avatarUrl: publicUrl
      }));
    } catch (error) {
      console.error('Unexpected error uploading profile photo:', error);
      alert('Failed to upload profile photo.');
    } finally {
      setProfileUploading(false);
      e.target.value = '';
    }
  };

  // Default form state
  const defaultFormData = {
    // Personal / Quick
    id: '',
    employeeCode: '',
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'Female',
    birthDate: '2006-01-01',
    nationality: 'Australia',
    nationalId: '',
    passport: '',
    tfn: '',
    abn: '',
    jobPosition: '',
    email: '',
    phone: '',
    allowProfileUpdate: false,
    profileUpdateDeadline: '2026-02-03',
    ethnicity: '',
    religion: '',
    clientName: '',
    clientEmail: '',
    superannuationFundName: '',
    superannuationMemberNumber: '',
    medicareNumber: '',
    workRightsStatus: '',
    visaType: '',
    visaExpiryDate: '',
    policeClearanceStatus: '',
    wwccNumber: '',
    driversLicenseNumber: '',
    driversLicenseExpiry: '',
    
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
    paymentBsb: '',
    payCycle: 'Monthly',
    paymentMethod: 'Bank',
    
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

    avatarUrl: '',

    // Contact
    blogUrl: '',
    officePhone: '',
    mobilePhone: '',
    homePhone: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    emergencyContactAddress: '',

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
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Initialize form data from initialData if provided
  useEffect(() => {
    if (initialData) {
      setFormData({
        // Personal
        id: initialData.id,
        employeeCode: initialData.employeeCode || '',
        firstName: initialData.firstName,
        middleName: initialData.middleName || '',
        lastName: initialData.lastName,
        gender: initialData.gender,
        birthDate: initialData.birthDate,
        nationality: initialData.nationality,
        nationalId: initialData.nationalId,
        passport: initialData.passport || '',
        tfn: initialData.tfn || '',
        abn: initialData.abn || '',
        jobPosition: initialData.position,
        email: initialData.email,
        phone: initialData.phone,
        allowProfileUpdate: initialData.allowProfileUpdate || false,
        profileUpdateDeadline: initialData.profileUpdateDeadline || '',
        ethnicity: initialData.ethnicity || '',
        religion: initialData.religion || '',
        clientName: initialData.clientName || '',
        clientEmail: initialData.clientEmail || '',
        superannuationFundName: initialData.superannuationFundName || '',
        superannuationMemberNumber: initialData.superannuationMemberNumber || '',
        medicareNumber: initialData.medicareNumber || '',
        workRightsStatus: initialData.workRightsStatus || '',
        visaType: initialData.visaType || '',
        visaExpiryDate: initialData.visaExpiryDate || '',
        policeClearanceStatus: initialData.policeClearanceStatus || '',
        wwccNumber: initialData.wwccNumber || '',
        driversLicenseNumber: initialData.driversLicenseNumber || '',
        driversLicenseExpiry: initialData.driversLicenseExpiry || '',
        
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
        paymentBsb: initialData.bankBsb || '',
        payCycle: (initialData.payCycle as any) || 'Monthly',
        paymentMethod: initialData.paymentMethod || 'Bank',
        
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

        avatarUrl: initialData.avatarUrl || '',

        // Contact
        blogUrl: initialData.blogUrl || '',
        officePhone: initialData.officePhone || '',
        mobilePhone: initialData.mobilePhone || '',
        homePhone: initialData.homePhone || '',
        emergencyContactName: initialData.emergencyContactName || '',
        emergencyContactRelationship: initialData.emergencyContactRelationship || '',
        emergencyContactPhone: initialData.emergencyContactPhone || '',
        emergencyContactAddress: initialData.emergencyContactAddress || '',

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
    let nextValue: any = type === 'checkbox' ? checked : value;
    
    if (name === 'paymentBsb') {
      const digitsOnly = (value || '').replace(/\D/g, '');
      nextValue = digitsOnly.slice(0, 6);
    } else if (name === 'paymentAccount') {
      const digitsOnly = (value || '').replace(/\D/g, '');
      nextValue = digitsOnly.slice(0, 10);
    } else if (name === 'tfn') {
      const digitsOnly = (value || '').replace(/\D/g, '');
      nextValue = digitsOnly.slice(0, 9);
    } else if (name === 'abn') {
      const digitsOnly = (value || '').replace(/\D/g, '');
      nextValue = digitsOnly.slice(0, 11);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: nextValue
    }));
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
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
    
    const validationErrors: { [key: string]: string } = {};
    const emailRaw = formData.email ? formData.email.trim() : '';

    if (!emailRaw) {
      validationErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      validationErrors.email = 'Enter a valid email address';
    }
    if (formData.tfn) {
      const tfnDigits = (formData.tfn || '').replace(/\D/g, '');
      if (!/^\d{9}$/.test(tfnDigits)) {
        validationErrors.tfn = 'TFN must be exactly 9 digits';
      }
    }
    if (formData.abn) {
      const abnDigits = (formData.abn || '').replace(/\D/g, '');
      if (!/^\d{11}$/.test(abnDigits)) {
        validationErrors.abn = 'ABN must be exactly 11 digits';
      }
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    // Map form data to Employee type
    const employeeData: Employee = {
      id: formData.id,
      employeeCode: formData.employeeCode || undefined,
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      email: emailRaw,
      phone: formData.phone,
      gender: formData.gender as 'Male' | 'Female' | 'Other',
      birthDate: formData.birthDate,
      nationality: formData.nationality,
      nationalId: formData.nationalId,
      passport: formData.passport,
      ethnicity: formData.ethnicity,
      religion: formData.religion,
      clientName: formData.clientName,
      clientEmail: formData.clientEmail,
      tfn: formData.tfn ? formData.tfn.replace(/\D/g, '') : undefined,
      abn: formData.abn ? formData.abn.replace(/\D/g, '') : undefined,
      superannuationFundName: formData.superannuationFundName || undefined,
      superannuationMemberNumber: formData.superannuationMemberNumber || undefined,
      medicareNumber: formData.medicareNumber || undefined,
      workRightsStatus: formData.workRightsStatus || undefined,
      visaType: formData.visaType || undefined,
      visaExpiryDate: formData.visaExpiryDate || undefined,
      policeClearanceStatus: formData.policeClearanceStatus || undefined,
      wwccNumber: formData.wwccNumber || undefined,
      driversLicenseNumber: formData.driversLicenseNumber || undefined,
      driversLicenseExpiry: formData.driversLicenseExpiry || undefined,
      
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
      paymentMethod: formData.paymentMethod as 'Bank',
      bankName: formData.paymentBank,
      bankAccount: formData.paymentAccount,
      bankBsb: formData.paymentBsb,
      payCycle: formData.payCycle as 'Weekly' | 'Fortnightly' | 'Monthly' | 'Annually',
      
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
      emergencyContactName: formData.emergencyContactName,
      emergencyContactRelationship: formData.emergencyContactRelationship,
      emergencyContactPhone: formData.emergencyContactPhone,
      emergencyContactAddress: formData.emergencyContactAddress,

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

    if (!initialData && !inviteLater) {
      try {
        const { userId, error, temporaryPassword } = await createUser(
          formData.email,
          `${formData.firstName} ${formData.lastName}`.trim() || formData.email
        );
        if (error) {
          const errorMessage =
            typeof error === 'string'
              ? error
              : error && typeof error === 'object'
              ? String((error as any).message || '') || JSON.stringify(error)
              : String(error);
          console.error('Failed to create user account', error);
          
          // Only alert if it's not a known error like "user already exists"
          // If user exists, we might want to just link it or inform the user
          const displayMessage = errorMessage === '{}' ? 'User already exists or admin key is invalid' : errorMessage;
          alert(`Could not create user account (${displayMessage}). The employee record will still be created; you can invite the user later.`);
        } else if (userId) {
          (employeeData as any).isPasswordChangeRequired = true;
          if (temporaryPassword) {
            alert(`User account created.\n\nUsername: ${formData.email}\nTemporary Password: ${temporaryPassword}\n\nShare these details with the employee. They will be required to change the password at first login.`);
          }
        }
      } catch (err: any) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
            ? err
            : JSON.stringify(err);
        console.error('Error creating user account:', message);
        alert(`Could not create user account (${message}). The employee record will still be created; you can invite the user later.`);
      }
    }

    onSubmit(employeeData);
  };

  const renderTextField = (
    name: string,
    label: string,
    required = false,
    type = 'text',
    placeholder = '',
    maxLength?: number,
    autoFocus = false
  ) => {
    const error = errors[name];
    const effectiveMaxLength =
      typeof maxLength === 'number'
        ? maxLength
        : name === 'paymentBsb'
        ? 6
        : name === 'paymentAccount'
        ? 10
        : undefined;
    const numericOnly = name === 'tfn' || name === 'abn';
    const numericPattern = name === 'tfn' ? '\\d{0,9}' : name === 'abn' ? '\\d{0,11}' : undefined;
    return (
      <div className="relative">
        <input
          type={type}
          name={name}
          value={(formData as any)[name] ?? ''}
          onChange={handleChange}
          maxLength={effectiveMaxLength}
          autoFocus={autoFocus}
          readOnly={name === 'employeeCode'}
          inputMode={numericOnly ? 'numeric' : undefined}
          pattern={numericPattern}
          className={`peer w-full border rounded px-3 pt-4 pb-2 focus:border-blue-500 focus:outline-none placeholder-transparent ${
            name === 'employeeCode' ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : ''
          } ${error ? 'border-red-500' : 'border-gray-300'}`}
          placeholder={placeholder || label}
        />
        <label className="absolute left-3 top-0 text-xs text-gray-500 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-0 peer-focus:text-xs peer-focus:text-blue-500">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {error && (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        )}
      </div>
    );
  };

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
          {['quick', 'personal', 'job', 'salary', 'contact', 'client', 'directory', 'others'].map((tab) => (
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
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-gray-600 font-bold">
                    {formData.avatarUrl ? (
                      <img src={formData.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        {(formData.firstName || '').charAt(0)}
                        {(formData.lastName || '').charAt(0)}
                      </>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase">Profile Photo</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePhotoChange}
                      disabled={profileUploading}
                      className="mt-1 text-xs"
                    />
                    {profileUploading && (
                      <p className="text-xs text-gray-500 mt-1">Uploading...</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {renderTextField('employeeCode', 'Employee Code')}
                  {renderTextField('firstName', 'First Name', true, 'text', '', undefined, !initialData)}
                  {renderTextField('lastName', 'Last Name', true)}
                </div>
                {renderSelectField('gender', 'Gender', ['Female', 'Male', 'Other'], true)}
                {renderTextField('birthDate', 'Birth Date', true, 'date')}
                {renderSelectField('nationality', 'Nationality', ['Australia', 'USA', 'UK', 'Canada'])}
                <div className="grid grid-cols-2 gap-4">
                  {renderTextField('nationalId', 'National ID', true)}
                  {renderTextField('passport', 'Passport')}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {renderTextField('tfn', 'TFN', false, 'text', '9 digits')}
                  {renderTextField('abn', 'ABN', false, 'text', '11 digits')}
                </div>
                {renderSelectField('jobPosition', 'Job Position', ['Manager', 'Developer', 'Designer'], true)}
                <div className="grid grid-cols-2 gap-4">
                  {renderTextField('email', 'Email', true, 'email')}
                  {renderTextField('phone', 'Phone', false, 'tel')}
                </div>
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
                <h3 className="font-medium text-lg border-b pb-2 mt-6 mb-4">Compliance & Work Rights</h3>
                <div className="grid grid-cols-2 gap-4">
                  {renderTextField('superannuationFundName', 'Superannuation Fund Name')}
                  {renderTextField('superannuationMemberNumber', 'Superannuation Member Number')}
                  {renderTextField('medicareNumber', 'Medicare Number')}
                  {renderTextField('workRightsStatus', 'Work Rights Status')}
                  {renderTextField('visaType', 'Visa Type')}
                  {renderTextField('visaExpiryDate', 'Visa Expiry Date', false, 'date')}
                  {renderTextField('policeClearanceStatus', 'Police Clearance Status')}
                  {renderTextField('wwccNumber', 'WWCC Number')}
                  {renderTextField('driversLicenseNumber', 'Driver\'s Licence Number')}
                  {renderTextField('driversLicenseExpiry', 'Driver\'s Licence Expiry', false, 'date')}
                </div>
             </div>
          )}

          {activeTab === 'job' && (
            <div className="space-y-4 animate-fade-in bg-white p-4 rounded-md shadow-sm border border-gray-200">
                 <h3 className="font-medium text-lg border-b pb-2 mb-4">Job Details</h3>
                 <div className="grid grid-cols-2 gap-4">
                    {renderTextField('dateJoined', 'Date Joined', false, 'date')}
                    {renderDepartmentSelect()}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Branch (Auto-filled)
                      </label>
                      <input
                        type="text"
                        name="branch"
                        value={formData.branch}
                        readOnly
                        className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 text-gray-500 focus:outline-none"
                      />
                    </div>
                    {renderManagerSelect()}
                    {renderSelectField('status', 'Employment Status', ['Active', 'On Leave', 'Terminated', 'Probation'], true)}
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
                    {renderTextField('nextReviewDate', 'Performance Review', false, 'date')}
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    {renderSelectField('paymentMethod', 'Payment Method', ['Bank'])}
                    {renderSelectField('payCycle', 'Pay Cycle', ['Weekly', 'Fortnightly', 'Monthly', 'Annually'])}
                 </div>
                 {formData.paymentMethod === 'Bank' && (
                    <div className="grid grid-cols-3 gap-4">
                        {renderTextField('paymentBank', 'Bank Name')}
                        {renderTextField('paymentBsb', 'BSB Number')}
                        {renderTextField('paymentAccount', 'Account Number')}
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

                 <h3 className="font-medium text-lg border-b pb-2 mt-6 mb-4">Emergency Contact</h3>
                 <div className="grid grid-cols-2 gap-4">
                    {renderTextField('emergencyContactName', 'Contact Name', true)}
                    {renderTextField('emergencyContactRelationship', 'Relationship', false)}
                    {renderTextField('emergencyContactPhone', 'Contact Phone', true, 'tel')}
                    {renderTextField('emergencyContactAddress', 'Contact Address', false)}
                 </div>
            </div>
          )}

          {activeTab === 'client' && (
            <div className="space-y-4 animate-fade-in bg-white p-4 rounded-md shadow-sm border border-gray-200">
              <h3 className="font-medium text-lg border-b pb-2 mb-4">Client Details</h3>
              <div className="grid grid-cols-2 gap-4">
                {renderTextField('clientName', 'Client Name')}
                {renderTextField('clientEmail', 'Client Email', false, 'email')}
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

                 {!initialData && (
                   <div className="mt-6 border-t pt-4">
                     <h4 className="font-medium mb-3">Onboarding Invitation</h4>
                     <div className="flex items-center">
                       <input
                         type="checkbox"
                         id="inviteLater"
                         className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                         checked={inviteLater}
                         onChange={(e) => setInviteLater(e.target.checked)}
                       />
                       <label htmlFor="inviteLater" className="ml-2 block text-sm text-gray-900">
                         Invite Later (Do not send welcome email now)
                       </label>
                     </div>
                     <p className="mt-1 text-xs text-gray-500 ml-6">
                       If checked, the employee record will be created but the welcome email with login details will not be sent immediately. You can trigger it later from the employee list or onboarding page.
                     </p>
                   </div>
                 )}
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
