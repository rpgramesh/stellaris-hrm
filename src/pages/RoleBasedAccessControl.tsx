import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { 
  Shield,  
  Users, 
  Key, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Edit, 
  Trash2,
  Clock,
  AlertTriangle,
  Settings,
  UserPlus,
  Workflow,
  Eye,
  Download
} from 'lucide-react';
import { roleBasedAccessService, UserRole, Permission, ApprovalWorkflow, ApprovalRequest } from '../services/roleBasedAccessService';

interface TabProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabNavigation: React.FC<TabProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'roles', name: 'Roles', icon: Shield },
    { id: 'permissions', name: 'Permissions', icon: Key },
    { id: 'workflows', name: 'Approval Workflows', icon: Workflow },
    { id: 'requests', name: 'Approval Requests', icon: Clock },
    { id: 'audit', name: 'Audit Logs', icon: Eye }
  ];

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default function RoleBasedAccessControl() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('roles');
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    fetchUser();
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permissionsData, workflowsData, requestsData] = await Promise.all([
        roleBasedAccessService.getRoles(),
        roleBasedAccessService.getPermissions(),
        roleBasedAccessService.getApprovalWorkflows(),
        roleBasedAccessService.getApprovalRequests()
      ]);

      setRoles(rolesData);
      setPermissions(permissionsData);
      setWorkflows(workflowsData);
      setRequests(requestsData);
    } catch (error) {
      console.error('Error loading RBAC data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (roleData: Omit<UserRole, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await roleBasedAccessService.createRole(roleData);
      await loadData();
      setShowRoleModal(false);
    } catch (error) {
      console.error('Error creating role:', error);
    }
  };

  const handleUpdateRole = async (roleId: string, updates: Partial<UserRole>) => {
    try {
      await roleBasedAccessService.updateRole(roleId, updates);
      await loadData();
      setEditingRole(null);
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    
    try {
      await roleBasedAccessService.deleteRole(roleId);
      await loadData();
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  const handleApproveRequest = async (requestId: string, approvalId: string, comments?: string) => {
    try {
      await roleBasedAccessService.approveRequest(approvalId, user?.id || '', comments);
      await loadData();
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleRejectRequest = async (requestId: string, approvalId: string, comments?: string) => {
    try {
      await roleBasedAccessService.rejectRequest(approvalId, user?.id || '', comments);
      await loadData();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'escalated':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Role-Based Access Control</h1>
          <p className="text-gray-600 mt-1">Manage roles, permissions, and approval workflows</p>
        </div>
        <div className="flex space-x-3">
          {activeTab === 'roles' && (
            <button
              onClick={() => setShowRoleModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Role</span>
            </button>
          )}
          {activeTab === 'permissions' && (
            <button
              onClick={() => setShowPermissionModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Permission</span>
            </button>
          )}
          {activeTab === 'workflows' && (
            <button
              onClick={() => setShowWorkflowModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Workflow</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border">
        {activeTab === 'roles' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {roles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Shield className="h-5 w-5 text-gray-400 mr-3" />
                          <div className="text-sm font-medium text-gray-900">{role.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{role.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Level {role.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          role.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {role.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingRole(role)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRole(role.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {permissions.map((permission) => (
                <div key={permission.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{permission.name}</h4>
                    <Key className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{permission.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{permission.resource}</span>
                    <span>{permission.action}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'workflows' && (
          <div className="p-6">
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                      <p className="text-sm text-gray-600">{workflow.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        workflow.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {workflow.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => setEditingWorkflow(workflow)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {workflow.approval_levels.map((level, index) => (
                      <div key={level.level} className="flex items-center space-x-3 text-sm">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                          {level.level}
                        </div>
                        <span>Level {level.level} - {level.required_approvals} approval(s) required</span>
                        {level.escalation_timeout && (
                          <span className="text-xs text-orange-600">
                            Escalates after {level.escalation_timeout}h
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requester
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {request.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.entity_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.requester_id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.requested_amount ? `$${request.requested_amount.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {request.status === 'pending' && request.approvals.some(a => 
                            a.approver_id === user?.id && a.status === 'pending'
                          ) && (
                            <>
                              <button
                                onClick={() => handleApproveRequest(request.id, request.approvals.find(a => 
                                  a.approver_id === user?.id && a.status === 'pending'
                                )!.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleRejectRequest(request.id, request.approvals.find(a => 
                                  a.approver_id === user?.id && a.status === 'pending'
                                )!.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
              <div className="flex space-x-2">
                <button className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>
            <div className="text-center py-8 text-gray-500">
              <Eye className="h-12 w-12 mx-auto mb-4" />
              <p>Audit logs will be displayed here</p>
              <p className="text-sm">Feature coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}