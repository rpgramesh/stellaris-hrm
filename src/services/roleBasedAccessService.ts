import { supabase } from '../lib/supabase';

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  created_at: string;
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  description: string;
  module: string;
  approval_levels: ApprovalLevel[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApprovalLevel {
  level: number;
  role_id: string;
  required_approvals: number;
  auto_approve_threshold?: number;
  escalation_timeout?: number;
  escalation_role_id?: string;
}

export interface ApprovalRequest {
  id: string;
  workflow_id: string;
  requester_id: string;
  entity_type: string;
  entity_id: string;
  current_level: number;
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'cancelled';
  requested_amount?: number;
  reason: string;
  created_at: string;
  updated_at: string;
  approvals: Approval[];
}

export interface Approval {
  id: string;
  request_id: string;
  approver_id: string;
  level: number;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  approved_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  resource_id: string;
  details: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export class RoleBasedAccessService {
  private readonly menuPrefix = 'menu:';

  // Role Management
  async getRoles(): Promise<UserRole[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('is_active', true)
      .order('level', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getRoleById(roleId: string): Promise<UserRole | null> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (error) throw error;
    return data;
  }

  async createRole(role: Omit<UserRole, 'id' | 'created_at' | 'updated_at'>): Promise<UserRole> {
    const { data, error } = await supabase
      .from('user_roles')
      .insert([{
        ...role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateRole(roleId: string, updates: Partial<UserRole>): Promise<UserRole> {
    const { data, error } = await supabase
      .from('user_roles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', roleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteRole(roleId: string): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .update({ is_active: false })
      .eq('id', roleId);

    if (error) throw error;
  }

  async getRoleMenuPermissions(roleId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('permissions')
      .eq('id', roleId)
      .single();

    if (error) throw error;
    const permissions: string[] = data?.permissions || [];
    return permissions.filter(p => p.startsWith(this.menuPrefix));
  }

  async updateRoleMenuPermissions(roleId: string, menuKeys: string[], userId: string): Promise<void> {
    const { data: existing, error: fetchError } = await supabase
      .from('user_roles')
      .select('permissions')
      .eq('id', roleId)
      .single();

    if (fetchError) throw fetchError;

    const currentPermissions: string[] = existing?.permissions || [];
    const nonMenuPermissions = currentPermissions.filter(p => !p.startsWith(this.menuPrefix));
    const nextMenuPermissions = Array.from(
      new Set(menuKeys.map(key => `${this.menuPrefix}${key}`))
    );
    const updatedPermissions = [...nonMenuPermissions, ...nextMenuPermissions];

    const { error: updateError } = await supabase
      .from('user_roles')
      .update({
        permissions: updatedPermissions,
        updated_at: new Date().toISOString()
      })
      .eq('id', roleId);

    if (updateError) throw updateError;

    await this.logAction(
      userId,
      'update_menu_permissions',
      'menu_permissions',
      roleId,
      {
        previousMenuPermissions: currentPermissions.filter(p => p.startsWith(this.menuPrefix)),
        nextMenuPermissions
      }
    );
  }

  // Permission Management
  async getPermissions(): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('resource', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getPermissionsByRole(roleId: string): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        permissions!inner(*)
      `)
      .eq('role_id', roleId);

    if (error) throw error;
    return data?.map(rp => rp.permissions).flat() || [];
  }

  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    const { error } = await supabase
      .from('role_permissions')
      .insert([{
        role_id: roleId,
        permission_id: permissionId,
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    const { error } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_id', permissionId);

    if (error) throw error;
  }

  // User Role Assignment
  async getUserRoles(userId: string): Promise<UserRole[]> {
    const { data, error } = await supabase
      .from('user_role_assignments')
      .select(`
        roles!inner(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;
    return data?.map(ura => ura.roles).flat() || [];
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    const { error } = await supabase
      .from('user_role_assignments')
      .insert([{
        user_id: userId,
        role_id: roleId,
        is_active: true,
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    const { error } = await supabase
      .from('user_role_assignments')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('role_id', roleId);

    if (error) throw error;
  }

  // Permission Checking
  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    
    for (const role of userRoles) {
      const permissions = await this.getPermissionsByRole(role.id);
      const hasPermission = permissions.some(p => 
        p.resource === resource && p.action === action
      );
      
      if (hasPermission) {
        return true;
      }
    }
    
    return false;
  }

  async hasAnyPermission(userId: string, permissions: Array<{resource: string, action: string}>): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(userId, permission.resource, permission.action)) {
        return true;
      }
    }
    return false;
  }

  async hasAllPermissions(userId: string, permissions: Array<{resource: string, action: string}>): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await this.hasPermission(userId, permission.resource, permission.action))) {
        return false;
      }
    }
    return true;
  }

  // Approval Workflow Management
  async getApprovalWorkflows(): Promise<ApprovalWorkflow[]> {
    const { data, error } = await supabase
      .from('approval_workflows')
      .select(`
        *,
        approval_levels(*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getApprovalWorkflowById(workflowId: string): Promise<ApprovalWorkflow | null> {
    const { data, error } = await supabase
      .from('approval_workflows')
      .select(`
        *,
        approval_levels(*)
      `)
      .eq('id', workflowId)
      .single();

    if (error) throw error;
    return data;
  }

  async createApprovalWorkflow(workflow: Omit<ApprovalWorkflow, 'id' | 'created_at' | 'updated_at'>): Promise<ApprovalWorkflow> {
    const { data, error } = await supabase
      .from('approval_workflows')
      .insert([{
        ...workflow,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Approval Request Management
  async createApprovalRequest(request: Omit<ApprovalRequest, 'id' | 'created_at' | 'updated_at' | 'current_level' | 'status' | 'approvals'>): Promise<ApprovalRequest> {
    const { data, error } = await supabase
      .from('approval_requests')
      .insert([{
        ...request,
        current_level: 1,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select(`
        *,
        approvals(*)
      `)
      .single();

    if (error) throw error;
    
    // Create initial approval records for the first level
    await this.createApprovalRecords(data.id, data.workflow_id, 1);
    
    return data;
  }

  async getApprovalRequests(userId?: string, status?: string): Promise<ApprovalRequest[]> {
    let query = supabase
      .from('approval_requests')
      .select(`
        *,
        approvals(*),
        workflows!inner(*)
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('requester_id', userId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getPendingApprovals(userId: string): Promise<ApprovalRequest[]> {
    const userRoles = await this.getUserRoles(userId);
    const roleIds = userRoles.map(r => r.id);

    const { data, error } = await supabase
      .from('approval_requests')
      .select(`
        *,
        approvals!inner(*),
        workflows!inner(*, approval_levels(*))
      `)
      .eq('status', 'pending')
      .in('workflows.approval_levels.role_id', roleIds);

    if (error) throw error;
    return data || [];
  }

  private async createApprovalRecords(requestId: string, workflowId: string, level: number): Promise<void> {
    const workflow = await this.getApprovalWorkflowById(workflowId);
    if (!workflow) return;

    const approvalLevel = workflow.approval_levels.find(al => al.level === level);
    if (!approvalLevel) return;

    // Get users with the required role
    const { data: usersWithRole } = await supabase
      .from('user_role_assignments')
      .select('user_id')
      .eq('role_id', approvalLevel.role_id)
      .eq('is_active', true);

    if (usersWithRole && usersWithRole.length > 0) {
      const approvalRecords = usersWithRole.map(user => ({
        request_id: requestId,
        approver_id: user.user_id,
        level: level,
        status: 'pending' as const,
        created_at: new Date().toISOString()
      }));

      await supabase.from('approvals').insert(approvalRecords);
    }
  }

  async approveRequest(approvalId: string, approverId: string, comments?: string): Promise<void> {
    const { data: approval, error: approvalError } = await supabase
      .from('approvals')
      .select(`
        *,
        requests!inner(*)
      `)
      .eq('id', approvalId)
      .single();

    if (approvalError) throw approvalError;
    if (!approval) throw new Error('Approval not found');

    // Update the approval
    const { error: updateError } = await supabase
      .from('approvals')
      .update({
        status: 'approved',
        comments,
        approved_at: new Date().toISOString()
      })
      .eq('id', approvalId);

    if (updateError) throw updateError;

    // Check if all approvals at this level are complete
    const { data: levelApprovals } = await supabase
      .from('approvals')
      .select('status')
      .eq('request_id', approval.request_id)
      .eq('level', approval.level);

    const approvedCount = levelApprovals?.filter(a => a.status === 'approved').length || 0;
    const totalCount = levelApprovals?.length || 0;

    const workflow = await this.getApprovalWorkflowById(approval.requests.workflow_id);
    if (!workflow) return;

    const currentLevel = workflow.approval_levels.find(al => al.level === approval.level);
    if (!currentLevel) return;

    if (approvedCount >= currentLevel.required_approvals) {
      // Move to next level or complete the request
      const nextLevel = workflow.approval_levels.find(al => al.level === approval.level + 1);
      
      if (nextLevel) {
        // Move to next level
        await supabase
          .from('approval_requests')
          .update({ 
            current_level: approval.level + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', approval.request_id);

        // Create approval records for next level
        await this.createApprovalRecords(approval.request_id, approval.requests.workflow_id, approval.level + 1);
      } else {
        // All levels complete - approve the request
        await supabase
          .from('approval_requests')
          .update({ 
            status: 'approved',
            updated_at: new Date().toISOString()
          })
          .eq('id', approval.request_id);
      }
    }
  }

  async rejectRequest(approvalId: string, approverId: string, comments?: string): Promise<void> {
    const { data: approval, error: approvalError } = await supabase
      .from('approvals')
      .select(`
        *,
        requests!inner(*)
      `)
      .eq('id', approvalId)
      .single();

    if (approvalError) throw approvalError;
    if (!approval) throw new Error('Approval not found');

    // Update the approval
    const { error: updateError } = await supabase
      .from('approvals')
      .update({
        status: 'rejected',
        comments,
        approved_at: new Date().toISOString()
      })
      .eq('id', approvalId);

    if (updateError) throw updateError;

    // Reject the entire request
    await supabase
      .from('approval_requests')
      .update({ 
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', approval.request_id);
  }

  // Audit Logging
  async logAction(userId: string, action: string, resource: string, resourceId: string, details?: any): Promise<void> {
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        user_id: userId,
        table_name: resource,
        record_id: resourceId,
        action,
        resource,
        resource_id: resourceId,
        old_data: null,
        new_data: details || {},
        details: details || {},
        performed_by: userId,
        ip_address: null,
        user_agent: null
      }]);

    if (error) throw error;
  }

  async getAuditLogs(filters?: {
    userId?: string;
    resource?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AuditLog[]> {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.resource) {
      query = query.eq('resource', filters.resource);
    }
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  // Escalation Handling
  async checkEscalations(): Promise<void> {
    const { data: pendingRequests, error } = await supabase
      .from('approval_requests')
      .select(`
        *,
        workflows!inner(*, approval_levels(*))
      `)
      .eq('status', 'pending');

    if (error) throw error;

    for (const request of pendingRequests || []) {
      const currentLevel = request.workflows.approval_levels.find(
        (al: ApprovalLevel) => al.level === request.current_level
      );

      if (currentLevel?.escalation_timeout) {
        const timeoutHours = currentLevel.escalation_timeout;
        const createdAt = new Date(request.created_at);
        const now = new Date();
        const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

        if (hoursDiff > timeoutHours) {
          await this.escalateRequest(request.id);
        }
      }
    }
  }

  private async escalateRequest(requestId: string): Promise<void> {
    const { data: request, error } = await supabase
      .from('approval_requests')
      .select(`
        *,
        workflows!inner(*, approval_levels(*))
      `)
      .eq('id', requestId)
      .single();

    if (error) throw error;
    if (!request) return;

    const currentLevel = request.workflows.approval_levels.find(
      (al: ApprovalLevel) => al.level === request.current_level
    );

    if (currentLevel?.escalation_role_id) {
      // Update request status and create new approval records
      await supabase
        .from('approval_requests')
        .update({ 
          status: 'escalated',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      // Create approval records for escalation role
      const { data: escalationUsers } = await supabase
        .from('user_role_assignments')
        .select('user_id')
        .eq('role_id', currentLevel.escalation_role_id)
        .eq('is_active', true);

      if (escalationUsers && escalationUsers.length > 0) {
        const escalationApprovals = escalationUsers.map(user => ({
          request_id: requestId,
          approver_id: user.user_id,
          level: request.current_level + 1,
          status: 'pending' as const,
          created_at: new Date().toISOString()
        }));

        await supabase.from('approvals').insert(escalationApprovals);
      }
    }
  }
}

export const roleBasedAccessService = new RoleBasedAccessService();
