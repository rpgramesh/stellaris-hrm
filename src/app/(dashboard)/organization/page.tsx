
'use client';

import { useState, useEffect } from 'react';
import { organizationService, Branch, Department, Manager } from '@/services/organizationService';
import { useRouter } from 'next/navigation';

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState<'branches' | 'departments' | 'managers' | 'audit'>('branches');
  const [isLoading, setIsLoading] = useState(true);
  
  // Data State
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Filter State
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  // Audit Filters
  const [auditFilterEntity, setAuditFilterEntity] = useState<string>('');
  const [auditFilterAction, setAuditFilterAction] = useState<string>('');

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState<any>(null); // For Audit Details
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Load Initial Data
  useEffect(() => {
    loadData();
  }, []);

  // Reload Audit Logs when filters change (if active tab is audit)
  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [auditFilterEntity, auditFilterAction, activeTab]);

  const loadAuditLogs = async () => {
    try {
      const logs = await organizationService.getAuditLogs({
        tableName: auditFilterEntity || undefined,
        action: auditFilterAction || undefined,
        limit: 100
      });
      setAuditLogs(logs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const results = await Promise.allSettled([
        organizationService.getBranches(),
        organizationService.getDepartments(),
        organizationService.getManagers(),
        organizationService.getAuditLogs()
      ]);

      // Handle Branches
      if (results[0].status === 'fulfilled') setBranches(results[0].value);
      else console.error('Failed to load branches:', results[0].reason);

      // Handle Departments
      if (results[1].status === 'fulfilled') setDepartments(results[1].value);
      else console.error('Failed to load departments:', results[1].reason);

      // Handle Managers
      if (results[2].status === 'fulfilled') setManagers(results[2].value);
      else console.error('Failed to load managers:', results[2].reason);

      // Handle Audit Logs
      if (results[3].status === 'fulfilled') setAuditLogs(results[3].value);
      else console.error('Failed to load audit logs:', results[3].reason);

      // Show error if critical data failed
      if (results[0].status === 'rejected' || results[1].status === 'rejected') {
        showNotification('error', 'Some data failed to load. Check console for details.');
      }
    } catch (error) {
      console.error('Unexpected error loading data:', error);
      showNotification('error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Filter Logic
  const filteredDepartments = departments.filter(d => 
    (!selectedBranchId || d.branchId === selectedBranchId)
  );

  const filteredManagers = managers.filter(m => 
    (!selectedBranchId || m.branchId === selectedBranchId) &&
    (!selectedDeptId || m.departmentId === selectedDeptId)
  );

  const getDisplayData = () => {
    let data: any[] = [];
    if (activeTab === 'branches') data = branches;
    if (activeTab === 'departments') data = filteredDepartments;
    if (activeTab === 'managers') data = filteredManagers;
    if (activeTab === 'audit') data = auditLogs;

    if (searchTerm && activeTab !== 'audit') {
      const lower = searchTerm.toLowerCase();
      data = data.filter(item => 
        Object.values(item).some(val => 
          String(val).toLowerCase().includes(lower)
        )
      );
    }
    return data;
  };

  // CRUD Handlers
  const handleSave = async (formData: any) => {
    try {
      if (activeTab === 'branches') {
        if (modalMode === 'create') await organizationService.createBranch(formData);
        else await organizationService.updateBranch(currentItem.id, formData);
      } else if (activeTab === 'departments') {
        if (modalMode === 'create') await organizationService.createDepartment(formData);
        else await organizationService.updateDepartment(currentItem.id, formData);
      } else if (activeTab === 'managers') {
        if (modalMode === 'create') await organizationService.createManager(formData);
        else await organizationService.updateManager(currentItem.id, formData);
      }
      
      await loadData();
      setIsModalOpen(false);
      showNotification('success', `${modalMode === 'create' ? 'Created' : 'Updated'} successfully`);
    } catch (error) {
      console.error(error);
      showNotification('error', 'Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (activeTab === 'branches') await organizationService.deleteBranch(itemToDelete.id);
      else if (activeTab === 'departments') await organizationService.deleteDepartment(itemToDelete.id);
      else if (activeTab === 'managers') await organizationService.deleteManager(itemToDelete.id);
      
      await loadData();
      setIsDeleteOpen(false);
      setItemToDelete(null);
      showNotification('success', 'Deleted successfully');
    } catch (error) {
      console.error(error);
      showNotification('error', 'Delete failed');
    }
  };

  const openModal = (mode: 'create' | 'edit', item: any = null) => {
    setModalMode(mode);
    setCurrentItem(item);
    setIsModalOpen(true);
  };

  // --- Components ---

  const AuditDetailsModal = () => {
    if (!selectedAuditLog) return null;

    const formatJSON = (data: any) => {
      if (!data) return <span className="text-gray-400 italic">None</span>;
      return (
        <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-60 border border-gray-200">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
               <h3 className="text-lg font-bold">Audit Log Details</h3>
               <p className="text-sm text-gray-500">
                 {selectedAuditLog.action} on {selectedAuditLog.tableName} • {new Date(selectedAuditLog.performedAt).toLocaleString()}
               </p>
            </div>
            <button 
              onClick={() => setSelectedAuditLog(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-2 text-gray-700">Old Data</h4>
              {formatJSON(selectedAuditLog.oldData)}
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2 text-gray-700">New Data</h4>
              {formatJSON(selectedAuditLog.newData)}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button 
              onClick={() => setSelectedAuditLog(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFilterBar = () => {
    if (activeTab === 'audit') {
      return (
        <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
           <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Entity Type</label>
            <select 
              className="w-full border rounded p-2 text-sm"
              value={auditFilterEntity}
              onChange={(e) => setAuditFilterEntity(e.target.value)}
            >
              <option value="">All Entities</option>
              <option value="branches">Branches</option>
              <option value="departments">Departments</option>
              <option value="employees">Managers/Employees</option>
              <option value="auth">Password/Security</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Action Type</label>
            <select 
              className="w-full border rounded p-2 text-sm"
              value={auditFilterAction}
              onChange={(e) => setAuditFilterAction(e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="INSERT">Create (INSERT)</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="SYSTEM_ACTION">Security Events</option>
            </select>
          </div>
          <div className="flex-none flex items-end">
             <button 
               onClick={loadAuditLogs}
               className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm"
             >
               Refresh
             </button>
          </div>
        </div>
      );
    }

    return (
    <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-gray-500 mb-1">Branch</label>
        <select 
          className="w-full border rounded p-2 text-sm"
          value={selectedBranchId}
          onChange={(e) => {
            setSelectedBranchId(e.target.value);
            setSelectedDeptId(''); // Reset dept when branch changes
          }}
        >
          <option value="">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
        <select 
          className="w-full border rounded p-2 text-sm"
          value={selectedDeptId}
          onChange={(e) => setSelectedDeptId(e.target.value)}
          disabled={!selectedBranchId && activeTab === 'managers'} // Optional restriction
        >
          <option value="">All Departments</option>
          {/* Show departments filtered by branch if branch selected, else all */}
          {departments
            .filter(d => !selectedBranchId || d.branchId === selectedBranchId)
            .map(d => <option key={d.id} value={d.id}>{d.name}</option>)
          }
        </select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
        <input 
          type="text" 
          placeholder="Search..." 
          className="w-full border rounded p-2 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </div>
  );
  };

  const renderTable = () => {
    const data = getDisplayData();
    
    if (activeTab === 'audit') {
      return (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(log.performedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      log.action === 'INSERT' ? 'bg-green-100 text-green-800' :
                      log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                      log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{log.tableName}</td>
                  <td className="px-4 py-3 text-gray-600">{log.performedBy}</td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => setSelectedAuditLog(log)}
                      className="text-indigo-600 hover:text-indigo-900 text-xs font-medium"
                    >
                      View Changes
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No audit logs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium">
            <tr>
              {activeTab === 'branches' && <>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Contact</th>
              </>}
              {activeTab === 'departments' && <>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Manager</th>
              </>}
              {activeTab === 'managers' && <>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Branch</th>
              </>}
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {activeTab === 'branches' && <>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-gray-500">{item.address}</td>
                  <td className="px-4 py-3 text-gray-500">{item.contactNumber}</td>
                </>}
                {activeTab === 'departments' && <>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-gray-500">{item.branchName || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{item.managerName || '-'}</td>
                </>}
                {activeTab === 'managers' && <>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.firstName} {item.lastName}</td>
                  <td className="px-4 py-3 text-gray-500">{item.email}</td>
                  <td className="px-4 py-3 text-gray-500">{item.departmentName || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{branches.find(b => b.id === item.branchId)?.name || '-'}</td>
                </>}
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openModal('edit', item)}
                      className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => { setItemToDelete(item); setIsDeleteOpen(true); }}
                      className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No records found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const EntityModal = () => {
    if (!isModalOpen) return null;

    // Form State
    const [formBranchId, setFormBranchId] = useState(currentItem?.branchId || currentItem?.departments?.branch_id || '');
    const [formDeptId, setFormDeptId] = useState(currentItem?.departmentId || '');
    
    // Derived values for cascading in form
    const formDepts = departments.filter(d => !formBranchId || d.branchId === formBranchId);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      const data: any = Object.fromEntries(formData.entries());
      
      // Inject selected select values if not captured or for easier handling
      if (activeTab === 'departments') {
        data.branchId = formBranchId;
      }
      if (activeTab === 'managers') {
        data.departmentId = formDeptId;
      }

      handleSave(data);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <h3 className="text-lg font-bold mb-4">{modalMode === 'create' ? 'Add' : 'Edit'} {activeTab.slice(0, -1)}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Branch Form */}
            {activeTab === 'branches' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input name="name" defaultValue={currentItem?.name} required className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input name="address" defaultValue={currentItem?.address} className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Number</label>
                  <input name="contactNumber" defaultValue={currentItem?.contactNumber} className="w-full border rounded p-2" />
                </div>
              </>
            )}

            {/* Department Form */}
            {activeTab === 'departments' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Branch</label>
                  <select 
                    name="branchId"
                    value={formBranchId} 
                    onChange={e => setFormBranchId(e.target.value)} 
                    required 
                    className="w-full border rounded p-2"
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input name="name" defaultValue={currentItem?.name} required className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input name="location" defaultValue={currentItem?.location} className="w-full border rounded p-2" />
                </div>
              </>
            )}

            {/* Manager Form */}
            {activeTab === 'managers' && (
              <>
                 <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">First Name</label>
                    <input name="firstName" defaultValue={currentItem?.firstName} required className="w-full border rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Last Name</label>
                    <input name="lastName" defaultValue={currentItem?.lastName} required className="w-full border rounded p-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input name="email" type="email" defaultValue={currentItem?.email} required className="w-full border rounded p-2" />
                </div>
                
                {/* Cascading Logic for Form */}
                <div>
                  <label className="block text-sm font-medium mb-1">Branch (Filter)</label>
                  <select 
                    name="branchIdFilter"
                    value={formBranchId} 
                    onChange={e => { setFormBranchId(e.target.value); setFormDeptId(''); }}
                    className="w-full border rounded p-2 bg-gray-50"
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <select 
                    name="departmentId"
                    value={formDeptId} 
                    onChange={e => setFormDeptId(e.target.value)} 
                    required 
                    className="w-full border rounded p-2"
                    disabled={!formBranchId && departments.length > 0} // Optional: force branch selection first? No, let them select from all if branch not selected.
                  >
                    <option value="">Select Department</option>
                    {formDepts.length > 0 ? (
                      formDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)
                    ) : (
                      <option value="" disabled>No departments found {formBranchId ? 'in this branch' : ''}</option>
                    )}
                  </select>
                  {formBranchId && formDepts.length === 0 && (
                     <p className="text-xs text-red-500 mt-1">No departments linked to this branch.</p>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Master Data Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage organizational hierarchy</p>
        </div>
        {activeTab !== 'audit' && (
          <button 
            onClick={() => openModal('create')} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 flex items-center gap-2"
          >
            <span>+ Add {activeTab === 'branches' ? 'Branch' : activeTab === 'departments' ? 'Department' : 'Manager'}</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(['branches', 'departments', 'managers', 'audit'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Filter Bar (Only for non-audit tabs) */}
      {activeTab !== 'audit' && renderFilterBar()}

      {/* Notification */}
      {notification && (
        <div className={`mb-4 p-4 rounded ${notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {notification.message}
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading data...</div>
      ) : renderTable()}

      {/* Modals */}
      <EntityModal />
      <AuditDetailsModal />
      
      {/* Delete Confirmation */}
      {isDeleteOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-2 text-red-600">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this item? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsDeleteOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
