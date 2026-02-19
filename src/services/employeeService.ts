
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';

// Helper to map DB columns (snake_case) to Frontend Type (camelCase)
const mapEmployeeFromDb = (dbRecord: any): Employee => {
  return {
    id: dbRecord.id,
    employeeCode: dbRecord.employee_code || '',
    firstName: dbRecord.first_name,
    isPasswordChangeRequired: dbRecord.is_password_change_required,
    lastName: dbRecord.last_name,
    fullName: `${dbRecord.first_name} ${dbRecord.last_name}`.trim(),
    email: dbRecord.email,
    phone: dbRecord.phone || '',
    role: dbRecord.role,
    department: dbRecord.department?.name || 'Unknown',
    departmentId: dbRecord.department_id,
    position: dbRecord.position?.title || 'Unknown',
    joinDate: dbRecord.start_date,
    timeClockNeeded: true, // Default
    status: dbRecord.employment_status,
    gender: dbRecord.gender || 'Other',
    birthDate: dbRecord.date_of_birth,
    nationality: dbRecord.nationality || 'Australian',
    nationalId: dbRecord.national_id || '',
    tfn: dbRecord.tfn || '',
    abn: dbRecord.abn || '',
    salary: parseFloat(dbRecord.salary) || 0,
    salaryEffectiveDate: dbRecord.salary_effective_date || dbRecord.start_date, 
    superRate: 11.5,
    payCycle: (dbRecord.pay_cycle as any) || 'Monthly',
    paymentMethod: dbRecord.payment_method || 'Bank',
    currency: dbRecord.currency || 'AUD',
    bankName: dbRecord.bank_name || '',
    bankAccount: dbRecord.bank_account_number || '',
    bankBsb: dbRecord.bank_bsb || '',
    avatarUrl: dbRecord.avatar_url || dbRecord.profile_photo_url || '',
    address: dbRecord.address || '',
    // Map other fields as best as possible or leave as defaults
    middleName: dbRecord.middle_name || '', 
    passport: dbRecord.passport || '',
    ethnicity: dbRecord.ethnicity || '',
    religion: dbRecord.religion || '',
    clientName: dbRecord.client_name || '',
    clientEmail: dbRecord.client_email || '',
    clientLineManager: dbRecord.client_line_manager || '',
    clientDepartment: dbRecord.client_department || '',
    clientBranch: dbRecord.client_branch || '',
    superannuationFundName: dbRecord.superannuation_fund_name || '',
    superannuationMemberNumber: dbRecord.superannuation_member_number || '',
    medicareNumber: dbRecord.medicare_number || '',
    workRightsStatus: dbRecord.work_rights_status || '',
    visaType: dbRecord.visa_type || '',
    visaExpiryDate: dbRecord.visa_expiry_date || '',
    policeClearanceStatus: dbRecord.police_clearance_status || '',
    wwccNumber: dbRecord.wwcc_number || '',
    driversLicenseNumber: dbRecord.drivers_license_number || '',
    driversLicenseExpiry: dbRecord.drivers_license_expiry || '',
    endOfProbation: dbRecord.probation_end_date || '',
    placementEffectiveDate: dbRecord.start_date,
    lineManager: '', // specific logic needed to fetch manager name if needed
    lineManagerId: dbRecord.line_manager_id,
    branch: dbRecord.branch || '',
    level: '',
    employmentTermsEffectiveDate: dbRecord.start_date,
    nextReviewDate: dbRecord.next_review_date || '',
    maritalStatus: dbRecord.marital_status || 'Single',
    childrenCount: dbRecord.children_count || 0,
    spouse: {
      firstName: dbRecord.spouse_first_name || '',
      lastName: dbRecord.spouse_last_name || '',
      birthDate: dbRecord.spouse_birth_date || '',
      working: dbRecord.spouse_working || false,
      middleName: dbRecord.spouse_middle_name || '',
      nationality: dbRecord.spouse_nationality || '',
      nationalId: dbRecord.spouse_national_id || '',
      passport: dbRecord.spouse_passport || '',
      ethnicity: dbRecord.spouse_ethnicity || '',
      religion: dbRecord.spouse_religion || ''
    },
    blogUrl: dbRecord.blog_url || '',
    officePhone: dbRecord.office_phone || '',
    mobilePhone: dbRecord.mobile_phone || '',
    homePhone: dbRecord.home_phone || '',
    emergencyContactName: dbRecord.emergency_contact_name || '',
    emergencyContactRelationship: dbRecord.emergency_contact_relationship || '',
    emergencyContactPhone: dbRecord.emergency_contact_phone || '',
    emergencyContactAddress: dbRecord.emergency_contact_address || '',
    remark: dbRecord.remark || '',
    systemAccessRole: dbRecord.system_access_role || 'Employee',
    privacySettings: dbRecord.privacy_settings || {},
    health: dbRecord.health_data || {}
  } as Employee;
};

// Helper to get or create department ID
const getDepartmentId = async (name: string): Promise<string | null> => {
  if (!name) return null;
  const { data } = await supabase.from('departments').select('id').eq('name', name).single();
  if (data) return data.id;
  
  const { data: newDept, error } = await supabase.from('departments').insert({ name }).select('id').single();
  if (error) {
    console.error('Error creating department:', error);
    return null;
  }
  return newDept?.id || null;
};

// Helper to get or create position ID
const getPositionId = async (title: string, departmentId: string | null): Promise<string | null> => {
  if (!title) return null;
  const { data } = await supabase.from('job_positions').select('id').eq('title', title).single();
  if (data) return data.id;

  const { data: newPos, error } = await supabase.from('job_positions').insert({ 
    title, 
    department_id: departmentId 
  }).select('id').single();
  
  if (error) {
    console.error('Error creating job position:', error);
    return null;
  }
  return newPos?.id || null;
};

export const employeeService = {
  async getAll(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        department:departments(name),
        position:job_positions(title)
      `);

    if (error) throw error;
    return data ? data.map(mapEmployeeFromDb) : [];
  },

  async getById(id: string): Promise<Employee | undefined> {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        department:departments(name),
        position:job_positions(title)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (data) return mapEmployeeFromDb(data);
    return undefined;
  },

  async getByUserId(userId: string): Promise<Employee | undefined> {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        department:departments(name),
        position:job_positions(title)
      `)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "Row not found"
    if (data) return mapEmployeeFromDb(data);
    return undefined;
  },

  async getEmployeeName(id: string): Promise<string> {
    const { data, error } = await supabase
      .from('employees')
      .select('first_name, last_name')
      .eq('id', id)
      .single();

    if (error) {
        console.error(`Error fetching employee name for ${id}:`, error);
        return id;
    }
    
    return `${data.first_name} ${data.last_name}`;
  },

  async getTeammates(departmentName: string): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        department:departments!inner(name),
        position:job_positions(title)
      `)
      .eq('department.name', departmentName);

    if (error) {
      console.error('Error fetching teammates:', error);
      return [];
    }
    return data ? data.map(mapEmployeeFromDb) : [];
  },

  async create(employee: Omit<Employee, 'id'>): Promise<Employee> {
    try {
      const deptId = employee.departmentId || await getDepartmentId(employee.department);
      const posId = await getPositionId(employee.position, deptId);

      const dbPayload: any = {
        first_name: employee.firstName,
        last_name: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        date_of_birth: employee.birthDate || null,
        gender: employee.gender,
        nationality: employee.nationality,
        national_id: employee.nationalId,
        tfn: employee.tfn,
        abn: employee.abn,
        address: employee.address,
        department_id: deptId,
        position_id: posId,
        employment_status: employee.status,
        start_date: employee.joinDate || null,
        probation_end_date: employee.endOfProbation || null,
        line_manager_id: employee.lineManagerId || null,
        branch: employee.branch,
        salary: employee.salary,
        salary_effective_date: employee.salaryEffectiveDate || null,
        currency: employee.currency,
        payment_method: employee.paymentMethod,
        pay_cycle: employee.payCycle,
        next_review_date: employee.nextReviewDate || null,
        bank_name: employee.bankName,
        bank_account_number: employee.bankAccount,
        bank_bsb: employee.bankBsb,
        role: employee.role,
        avatar_url: employee.avatarUrl,
        profile_photo_url: employee.avatarUrl,
        
        // Family
        marital_status: employee.maritalStatus,
        children_count: employee.childrenCount,
        spouse_first_name: employee.spouse?.firstName,
        spouse_last_name: employee.spouse?.lastName,
        spouse_birth_date: employee.spouse?.birthDate || null,
        spouse_middle_name: employee.spouse?.middleName,
        spouse_working: employee.spouse?.working,
        spouse_nationality: employee.spouse?.nationality,
        spouse_national_id: employee.spouse?.nationalId,
        spouse_passport: employee.spouse?.passport,
        spouse_ethnicity: employee.spouse?.ethnicity,
        spouse_religion: employee.spouse?.religion,
        
        // Extended Contact
        blog_url: employee.blogUrl,
        office_phone: employee.officePhone,
        mobile_phone: employee.mobilePhone,
        home_phone: employee.homePhone,
        emergency_contact_name: employee.emergencyContactName,
        emergency_contact_relationship: employee.emergencyContactRelationship,
        emergency_contact_phone: employee.emergencyContactPhone,
        emergency_contact_address: employee.emergencyContactAddress,
        
        // Others
        middle_name: employee.middleName,
        passport: employee.passport,
        ethnicity: employee.ethnicity,
        religion: employee.religion,
        client_name: employee.clientName,
        client_email: employee.clientEmail,
        client_line_manager: employee.clientLineManager,
        client_department: employee.clientDepartment,
        client_branch: employee.clientBranch,
        superannuation_fund_name: employee.superannuationFundName,
        superannuation_member_number: employee.superannuationMemberNumber,
        medicare_number: employee.medicareNumber,
        work_rights_status: employee.workRightsStatus,
        visa_type: employee.visaType,
        visa_expiry_date: employee.visaExpiryDate || null,
        police_clearance_status: employee.policeClearanceStatus,
        wwcc_number: employee.wwccNumber,
        drivers_license_number: employee.driversLicenseNumber,
        drivers_license_expiry: employee.driversLicenseExpiry || null,
        remark: employee.remark,
        
        health_data: employee.health,
        privacy_settings: employee.privacySettings,
        system_access_role: employee.systemAccessRole,
        is_password_change_required: employee.isPasswordChangeRequired || false,
        user_id: employee.userId || null
      };

      if (employee.employeeCode) {
        dbPayload.employee_code = employee.employeeCode;
      }

      const { data, error } = await supabase
        .from('employees')
        .insert(dbPayload)
        .select(`
          *,
          department:departments(name),
          position:job_positions(title)
        `)
        .single();

      if (error) throw error;
      return mapEmployeeFromDb(data);
    } catch (error) {
      console.error('Error creating employee in Supabase:', error);
      throw error;
    }
  },

  async update(id: string, updates: Partial<Employee>): Promise<Employee> {
    try {
      const deptId = updates.departmentId || (updates.department ? await getDepartmentId(updates.department) : undefined);
      const posId = updates.position ? await getPositionId(updates.position, deptId || null) : undefined;

      const dbPayload: any = {};
      if (updates.employeeCode) dbPayload.employee_code = updates.employeeCode;
      if (updates.firstName) dbPayload.first_name = updates.firstName;
      if (updates.lastName) dbPayload.last_name = updates.lastName;
      if (updates.email) dbPayload.email = updates.email;
      if (updates.phone) dbPayload.phone = updates.phone;
      if (updates.birthDate !== undefined) dbPayload.date_of_birth = updates.birthDate || null;
      if (updates.gender) dbPayload.gender = updates.gender;
      if (updates.nationality) dbPayload.nationality = updates.nationality;
      if (updates.nationalId) dbPayload.national_id = updates.nationalId;
      if (updates.address) dbPayload.address = updates.address;
      if (deptId) dbPayload.department_id = deptId;
      if (posId) dbPayload.position_id = posId;
      if (updates.status) dbPayload.employment_status = updates.status;
      if (updates.joinDate !== undefined) dbPayload.start_date = updates.joinDate || null;
      if (updates.endOfProbation !== undefined) dbPayload.probation_end_date = updates.endOfProbation || null;
      if (updates.lineManagerId !== undefined) dbPayload.line_manager_id = updates.lineManagerId || null;
      if (updates.branch) dbPayload.branch = updates.branch;
      if (updates.salary) dbPayload.salary = updates.salary;
      if (updates.salaryEffectiveDate !== undefined) dbPayload.salary_effective_date = updates.salaryEffectiveDate || null;
      if (updates.currency) dbPayload.currency = updates.currency;
      if (updates.paymentMethod) dbPayload.payment_method = updates.paymentMethod;
      if (updates.payCycle) dbPayload.pay_cycle = updates.payCycle;
      if (updates.isPasswordChangeRequired !== undefined) dbPayload.is_password_change_required = updates.isPasswordChangeRequired;
      if (updates.userId !== undefined) dbPayload.user_id = updates.userId;
      if (updates.nextReviewDate !== undefined) dbPayload.next_review_date = updates.nextReviewDate || null;
      if (updates.bankName) dbPayload.bank_name = updates.bankName;
      if (updates.bankAccount) dbPayload.bank_account_number = updates.bankAccount;
      if (updates.bankBsb !== undefined) dbPayload.bank_bsb = updates.bankBsb;
      if (updates.role) dbPayload.role = updates.role;
      if (updates.avatarUrl) {
        dbPayload.avatar_url = updates.avatarUrl;
        dbPayload.profile_photo_url = updates.avatarUrl;
      }
      if (updates.userId) dbPayload.user_id = updates.userId;
      
      // Family
      if (updates.maritalStatus) dbPayload.marital_status = updates.maritalStatus;
      if (updates.childrenCount !== undefined) dbPayload.children_count = updates.childrenCount;
      if (updates.tfn !== undefined) dbPayload.tfn = updates.tfn;
      if (updates.abn !== undefined) dbPayload.abn = updates.abn;
      if (updates.spouse) {
         if (updates.spouse.firstName) dbPayload.spouse_first_name = updates.spouse.firstName;
         if (updates.spouse.lastName) dbPayload.spouse_last_name = updates.spouse.lastName;
         if (updates.spouse.birthDate !== undefined) dbPayload.spouse_birth_date = updates.spouse.birthDate || null;
         if (updates.spouse.middleName) dbPayload.spouse_middle_name = updates.spouse.middleName;
         if (updates.spouse.working !== undefined) dbPayload.spouse_working = updates.spouse.working;
         if (updates.spouse.nationality) dbPayload.spouse_nationality = updates.spouse.nationality;
         if (updates.spouse.nationalId) dbPayload.spouse_national_id = updates.spouse.nationalId;
         if (updates.spouse.passport) dbPayload.spouse_passport = updates.spouse.passport;
         if (updates.spouse.ethnicity) dbPayload.spouse_ethnicity = updates.spouse.ethnicity;
         if (updates.spouse.religion) dbPayload.spouse_religion = updates.spouse.religion;
       }
       
       // Extended Contact
       if (updates.blogUrl) dbPayload.blog_url = updates.blogUrl;
       if (updates.officePhone) dbPayload.office_phone = updates.officePhone;
       if (updates.mobilePhone) dbPayload.mobile_phone = updates.mobilePhone;
       if (updates.homePhone) dbPayload.home_phone = updates.homePhone;
       if (updates.emergencyContactName !== undefined) dbPayload.emergency_contact_name = updates.emergencyContactName;
       if (updates.emergencyContactRelationship !== undefined) dbPayload.emergency_contact_relationship = updates.emergencyContactRelationship;
       if (updates.emergencyContactPhone !== undefined) dbPayload.emergency_contact_phone = updates.emergencyContactPhone;
       if (updates.emergencyContactAddress !== undefined) dbPayload.emergency_contact_address = updates.emergencyContactAddress;
       
      // Others
      if (updates.middleName) dbPayload.middle_name = updates.middleName;
      if (updates.passport) dbPayload.passport = updates.passport;
      if (updates.ethnicity) dbPayload.ethnicity = updates.ethnicity;
      if (updates.religion) dbPayload.religion = updates.religion;
      if (updates.clientName !== undefined) dbPayload.client_name = updates.clientName;
      if (updates.clientEmail !== undefined) dbPayload.client_email = updates.clientEmail;
      if (updates.clientLineManager !== undefined) dbPayload.client_line_manager = updates.clientLineManager;
      if (updates.clientDepartment !== undefined) dbPayload.client_department = updates.clientDepartment;
      if (updates.clientBranch !== undefined) dbPayload.client_branch = updates.clientBranch;
      if (updates.superannuationFundName !== undefined) dbPayload.superannuation_fund_name = updates.superannuationFundName;
      if (updates.superannuationMemberNumber !== undefined) dbPayload.superannuation_member_number = updates.superannuationMemberNumber;
      if (updates.medicareNumber !== undefined) dbPayload.medicare_number = updates.medicareNumber;
      if (updates.workRightsStatus !== undefined) dbPayload.work_rights_status = updates.workRightsStatus;
      if (updates.visaType !== undefined) dbPayload.visa_type = updates.visaType;
      if (updates.visaExpiryDate !== undefined) dbPayload.visa_expiry_date = updates.visaExpiryDate || null;
      if (updates.policeClearanceStatus !== undefined) dbPayload.police_clearance_status = updates.policeClearanceStatus;
      if (updates.wwccNumber !== undefined) dbPayload.wwcc_number = updates.wwccNumber;
      if (updates.driversLicenseNumber !== undefined) dbPayload.drivers_license_number = updates.driversLicenseNumber;
      if (updates.driversLicenseExpiry !== undefined) dbPayload.drivers_license_expiry = updates.driversLicenseExpiry || null;
      if (updates.remark) dbPayload.remark = updates.remark;
       
       if (updates.health) dbPayload.health_data = updates.health;
       if (updates.privacySettings) dbPayload.privacy_settings = updates.privacySettings;
       if (updates.systemAccessRole) dbPayload.system_access_role = updates.systemAccessRole;

      const { data, error } = await supabase
        .from('employees')
        .update(dbPayload)
        .eq('id', id)
        .select(`
          *,
          department:departments(name),
          position:job_positions(title)
        `)
        .single();

      if (error) throw error;
      return mapEmployeeFromDb(data);
    } catch (error) {
      console.error('Error updating employee in Supabase:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) throw error;
  }
};
