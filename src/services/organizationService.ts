
import { supabase } from '@/lib/supabase';

export interface Branch {
  id: string;
  name: string;
  address?: string;
  contactNumber?: string;
}

export interface Department {
  id: string;
  name: string;
  branchId?: string | null;
  branchName?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  location?: string | null;
}

export interface Manager {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  branchId?: string; // Derived from department
  departmentId?: string;
  departmentName?: string;
  role: string;
}

export interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  action: string;
  oldData?: any;
  newData?: any;
  performedBy?: string;
  performedAt: string;
}

// --- Audit Log Helper ---
const logAction = async (tableName: string, recordId: string, action: 'INSERT' | 'UPDATE' | 'DELETE', oldData: any, newData: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('audit_logs').insert({
    table_name: tableName,
    record_id: recordId,
    action,
    old_data: oldData,
    new_data: newData,
    performed_by: user?.id
  });
};

export const organizationService = {
  // --- Branches ---
  getBranches: async () => {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name');
    if (error) throw error;
    return data.map(b => ({
      id: b.id,
      name: b.name,
      address: b.address,
      contactNumber: b.contact_number
    }));
  },

  createBranch: async (branch: Omit<Branch, 'id'>) => {
    const { data, error } = await supabase
      .from('branches')
      .insert({
        name: branch.name,
        address: branch.address,
        contact_number: branch.contactNumber
      })
      .select()
      .single();
    
    if (error) throw error;
    await logAction('branches', data.id, 'INSERT', null, data);
    return data;
  },

  updateBranch: async (id: string, branch: Partial<Branch>) => {
    // Get old data for audit
    const { data: oldData } = await supabase.from('branches').select('*').eq('id', id).single();

    const { data, error } = await supabase
      .from('branches')
      .update({
        name: branch.name,
        address: branch.address,
        contact_number: branch.contactNumber
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await logAction('branches', id, 'UPDATE', oldData, data);
    return data;
  },

  deleteBranch: async (id: string) => {
    const { data: oldData } = await supabase.from('branches').select('*').eq('id', id).single();
    const { error } = await supabase.from('branches').delete().eq('id', id);
    if (error) throw error;
    await logAction('branches', id, 'DELETE', oldData, null);
  },

  // --- Departments ---
  getDepartments: async (branchId?: string) => {
    try {
      // 1. Fetch Departments with Branch relation (which is known to work)
      // We intentionally exclude the manager join here because the FK might be missing
      let query = supabase
        .from('departments')
        .select(`
          *,
          branches (name)
        `)
        .order('name');

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data: departments, error } = await query;
      if (error) throw error;

      // 2. Manual Join for Managers
      // Extract unique manager IDs to fetch them in a single batch
      const managerIds = [...new Set(departments
        .map((d: any) => d.manager_id)
        .filter((id: any) => id) // Filter out null/undefined
      )] as string[];

      let managersMap: Record<string, any> = {};

      if (managerIds.length > 0) {
        const { data: managers, error: managersError } = await supabase
          .from('employees')
          .select('id, first_name, last_name')
          .in('id', managerIds);
          
        if (!managersError && managers) {
          managersMap = managers.reduce((acc: any, curr: any) => {
            acc[curr.id] = curr;
            return acc;
          }, {});
        } else {
          console.warn('Failed to fetch manager details:', managersError);
        }
      }

      // 3. Map and Merge Data
      return departments.map((d: any) => {
        const manager = d.manager_id ? managersMap[d.manager_id] : null;
        return {
          id: d.id,
          name: d.name,
          branchId: d.branch_id || null,
          branchName: d.branches?.name || null,
          managerId: d.manager_id || null,
          managerName: manager ? `${manager.first_name} ${manager.last_name}` : null,
          location: d.location
        };
      });

    } catch (err: any) {
      console.error('Error fetching departments:', err);
      return [];
    }
  },

  createDepartment: async (dept: Omit<Department, 'id' | 'branchName' | 'managerName'>) => {
    const { data, error } = await supabase
      .from('departments')
      .insert({
        name: dept.name,
        branch_id: dept.branchId,
        manager_id: dept.managerId,
        location: dept.location
      })
      .select()
      .single();

    if (error) throw error;
    await logAction('departments', data.id, 'INSERT', null, data);
    return data;
  },

  updateDepartment: async (id: string, dept: Partial<Department>) => {
    const { data: oldData } = await supabase.from('departments').select('*').eq('id', id).single();
    const { data, error } = await supabase
      .from('departments')
      .update({
        name: dept.name,
        branch_id: dept.branchId,
        manager_id: dept.managerId,
        location: dept.location
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await logAction('departments', id, 'UPDATE', oldData, data);
    return data;
  },

  deleteDepartment: async (id: string) => {
    const { data: oldData } = await supabase.from('departments').select('*').eq('id', id).single();
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) throw error;
    await logAction('departments', id, 'DELETE', oldData, null);
  },

  // --- Line Managers (Employees with Role=Manager) ---
  getManagers: async (branchId?: string, departmentId?: string) => {
    // This is slightly complex because managers are employees.
    // We filter by role. Branch/Dept filtering depends on employee's assignment.
    
    try {
      let query = supabase
        .from('employees')
        .select(`
          id, first_name, last_name, email, role, department_id,
          departments (name, branch_id)
        `)
        .or('role.eq.Manager,role.eq.HR Manager,role.eq.Super Admin,system_access_role.eq.Manager');

      const { data, error } = await query;
      if (error) throw error;

      let managers = data.map((e: any) => ({
        id: e.id,
        firstName: e.first_name,
        lastName: e.last_name,
        email: e.email,
        role: e.role,
        departmentId: e.department_id,
        departmentName: e.departments?.name,
        branchId: e.departments?.branch_id
      }));

      if (branchId) {
        managers = managers.filter(m => m.branchId === branchId);
      }
      if (departmentId) {
        managers = managers.filter(m => m.departmentId === departmentId);
      }

      return managers;
    } catch (err: any) {
      console.error('Error fetching managers with relations:', err);

      // Fallback: Fetch raw employees without relations
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, role, department_id')
        .or('role.eq.Manager,role.eq.HR Manager,role.eq.Super Admin,system_access_role.eq.Manager');
        
      if (error) throw error;

      return data.map((e: any) => ({
        id: e.id,
        firstName: e.first_name,
        lastName: e.last_name,
        email: e.email,
        role: e.role,
        departmentId: e.department_id,
        departmentName: null,
        branchId: null
      }));
    }
  },
  
  // Update Manager (Employee) - simplified for MDM
  updateManager: async (id: string, updates: { firstName: string; lastName: string; departmentId: string }) => {
     const { data: oldData } = await supabase.from('employees').select('*').eq('id', id).single();
     const { data, error } = await supabase
      .from('employees')
      .update({
        first_name: updates.firstName,
        last_name: updates.lastName,
        department_id: updates.departmentId
      })
      .eq('id', id)
      .select()
      .single();
      
      if (error) throw error;
      await logAction('employees', id, 'UPDATE', oldData, data);
      return data;
  },
  
  // Note: Creating a manager usually involves creating a user, which is a separate complex flow. 
  // We might just allow "Promoting" via Edit or assume "Add Manager" is not fully creating a user here 
  // but maybe just adding a record? No, Employees are users.
  // For this MDM, I will skip "Create Manager" user creation logic (auth) and focus on managing existing.
  // OR, allow creating a "placeholder" employee record.
  // Given the "Add" requirement, I'll add a simple "Create Employee" (non-auth) or "Promote" stub?
  // Let's implement a simple "Create Employee Record" for now.
  
  createManager: async (manager: { firstName: string; lastName: string; email: string; departmentId: string }) => {
      const { data, error } = await supabase
      .from('employees')
      .insert({
          first_name: manager.firstName,
          last_name: manager.lastName,
          email: manager.email,
          department_id: manager.departmentId,
          role: 'Manager',
          system_access_role: 'Manager'
      })
      .select()
      .single();
      
      if (error) throw error;
      await logAction('employees', data.id, 'INSERT', null, data);
      return data;
  },
  
  deleteManager: async (id: string) => {
       // We don't delete employees usually, maybe just remove role?
       // For "Delete" button in UI, let's implement actual delete for now but warn.
       const { data: oldData } = await supabase.from('employees').select('*').eq('id', id).single();
       const { error } = await supabase.from('employees').delete().eq('id', id);
       if (error) throw error;
       await logAction('employees', id, 'DELETE', oldData, null);
  },

  // --- Audit Logs ---
  getAuditLogs: async (filters?: { tableName?: string; action?: string; limit?: number }) => {
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          performed_by_user:performed_by (email)
        `)
        .order('performed_at', { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.tableName) {
        query = query.eq('table_name', filters.tableName);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
        
      const { data, error } = await query;
        
      if (error) {
        // Handle missing table gracefully
        if (error.code === '42P01') {
          console.warn('Audit logs table does not exist. Please apply migration 20260210_org_hierarchy_updates.sql');
          return [];
        }
        throw error;
      }

      return data.map(log => ({
        id: log.id,
        tableName: log.table_name,
        recordId: log.record_id,
        action: log.action,
        oldData: log.old_data,
        newData: log.new_data,
        performedBy: log.performed_by_user?.email || 'Unknown',
        performedAt: log.performed_at,
        details: `${log.action} on ${log.table_name}`
      }));
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      return []; // Return empty logs instead of failing
    }
  },

  // --- Hierarchical Data Loading System ---
  getOrganizationHierarchy: async () => {
    console.log('[OrganizationService] Starting hierarchical data load...');
    const startTime = performance.now();

    try {
      // 1. Parallel Data Fetching for Performance
      const [branchesResult, departmentsResult, managersResult] = await Promise.allSettled([
        supabase.from('branches').select('id, name').order('name'),
        supabase.from('departments').select('id, name, branch_id').order('name'),
        supabase.from('employees')
          .select('id, first_name, last_name, role, department_id')
          .or('role.eq.Manager,role.eq.HR Manager,role.eq.Super Admin,system_access_role.eq.Manager')
          .order('first_name')
      ]);

      // 2. Error Handling & Data Extraction
      if (branchesResult.status === 'rejected') throw new Error(`Failed to load branches: ${branchesResult.reason}`);
      if (departmentsResult.status === 'rejected') throw new Error(`Failed to load departments: ${departmentsResult.reason}`);
      if (managersResult.status === 'rejected') throw new Error(`Failed to load managers: ${managersResult.reason}`);

      const branches = branchesResult.value.data || [];
      const departments = departmentsResult.value.data || [];
      const managers = managersResult.value.data || [];

      if (branchesResult.value.error) throw branchesResult.value.error;
      if (departmentsResult.value.error) throw departmentsResult.value.error;
      if (managersResult.value.error) throw managersResult.value.error;

      // 3. Construct Hierarchy (Branch -> Department -> Manager)
      const hierarchy = branches.map(branch => {
        // Find departments for this branch
        const branchDepts = departments.filter(d => d.branch_id === branch.id);
        
        const mappedDepts = branchDepts.map(dept => {
          // Find managers for this department
          const deptManagers = managers.filter(m => m.department_id === dept.id);
          
          return {
            id: dept.id,
            name: dept.name,
            managers: deptManagers.map(m => ({
              id: m.id,
              firstName: m.first_name,
              lastName: m.last_name,
              fullName: `${m.first_name} ${m.last_name}`,
              role: m.role
            }))
          };
        });

        return {
          id: branch.id,
          name: branch.name,
          departments: mappedDepts
        };
      });

      // 4. Identify Orphans (Data Consistency Check)
      const validBranchIds = new Set(branches.map(b => b.id));
      const validDeptIds = new Set(departments.map(d => d.id));

      const orphanedDepartments = departments.filter(d => !d.branch_id || !validBranchIds.has(d.branch_id));
      const orphanedManagers = managers.filter(m => !m.department_id || !validDeptIds.has(m.department_id));

      if (orphanedDepartments.length > 0) {
        console.warn(`[OrganizationService] Found ${orphanedDepartments.length} orphaned departments (missing valid branch_id)`);
      }
      if (orphanedManagers.length > 0) {
        console.warn(`[OrganizationService] Found ${orphanedManagers.length} orphaned managers (missing valid department_id)`);
      }

      const endTime = performance.now();
      console.log(`[OrganizationService] Hierarchy loaded in ${(endTime - startTime).toFixed(2)}ms`);

      return {
        hierarchy,
        stats: {
          branches: branches.length,
          departments: departments.length,
          managers: managers.length,
          orphanedDepartments: orphanedDepartments.length,
          orphanedManagers: orphanedManagers.length
        }
      };

    } catch (error) {
      console.error('[OrganizationService] Critical error loading hierarchy:', error);
      throw error;
    }
  },

  // Validate consistency across levels
  validateHierarchy: async (branchId: string, departmentId: string, managerId?: string) => {
    try {
        // 1. Validate Branch -> Department
        const { data: dept, error: deptError } = await supabase
            .from('departments')
            .select('branch_id')
            .eq('id', departmentId)
            .single();

        if (deptError || !dept) {
            return { valid: false, message: 'Department not found' };
        }

        if (dept.branch_id !== branchId) {
            return { valid: false, message: 'Selected Department does not belong to the selected Branch' };
        }

        // 2. Validate Department -> Manager (if provided)
        if (managerId) {
            const { data: manager, error: managerError } = await supabase
                .from('employees')
                .select('department_id')
                .eq('id', managerId)
                .single();

            if (managerError || !manager) {
                return { valid: false, message: 'Manager not found' };
            }

            // Note: In some loose hierarchies, a manager might manage a dept they don't belong to?
            // But usually for "Line Manager" selection, we might just check if they are a valid manager.
            // The user requirement says "consistency across all three levels".
            // If the UI filters managers by department, then the manager MUST belong to that department.
            // However, a Manager might belong to "Engineering" but manage "QA". 
            // For strict hierarchical loading (as per Point 3 "For each branch, load corresponding line managers"),
            // we assumed structural containment.
            // Let's enforce structural containment for now as per the "Hierarchy" definition.
            
            if (manager.department_id !== departmentId) {
                 return { valid: false, message: 'Selected Line Manager does not belong to the selected Department' };
            }
        }

        return { valid: true };
    } catch (error) {
        console.error('Validation error:', error);
        return { valid: false, message: 'Validation failed due to server error' };
    }
  }
};
