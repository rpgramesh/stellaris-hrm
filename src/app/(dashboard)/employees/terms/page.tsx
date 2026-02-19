'use client';

import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { EmploymentTerm, Employee } from '@/types';
import { employmentTermService } from '@/services/employmentTermService';
import { employeeService } from '@/services/employeeService';
import { 
  initialJobTypes, 
  initialJobStatuses, 
  initialLeaveWorkflows, 
  initialWorkdays, 
  initialHolidays 
} from '@/lib/constants';

export default function EmploymentTermsPage() {
  const [terms, setTerms] = useState<EmploymentTerm[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewing, setIsViewing] = useState(false);

  // Dropdown lists
  const [jobTypes, setJobTypes] = useState(initialJobTypes);
  const [jobStatuses, setJobStatuses] = useState(initialJobStatuses);
  const [leaveWorkflows, setLeaveWorkflows] = useState(initialLeaveWorkflows);
  const [workdays, setWorkdays] = useState(initialWorkdays);
  const [holidays, setHolidays] = useState(initialHolidays);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [termsData, employeesData] = await Promise.all([
          employmentTermService.getAll(),
          employeeService.getAll()
        ]);
        setTerms(termsData);
        setEmployees(employeesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Form State
  const [formData, setFormData] = useState<Partial<EmploymentTerm>>({
    effectiveDate: new Date().toISOString().split('T')[0],
    jobType: '',
    jobStatus: '',
    leaveWorkflow: 'DEFAULT',
    workday: 'DEFAULT',
    holiday: 'DEFAULT',
    termStart: '',
    termEnd: '',
    remark: ''
  });

  const handleAddItem = (listName: string, setter: Dispatch<SetStateAction<string[]>>) => {
    const newItem = prompt(`Enter new ${listName}:`);
    if (newItem && newItem.trim() !== '') {
      setter(prev => [...prev, newItem.trim()]);
      // Auto-select the new item
      const fieldMap: Record<string, keyof EmploymentTerm> = {
        'Leave Workflow': 'leaveWorkflow',
        'Workday': 'workday',
        'Holiday': 'holiday'
      };
      if (fieldMap[listName]) {
        setFormData(prev => ({ ...prev, [fieldMap[listName]]: newItem.trim() }));
      }
    }
  };

  const handleView = (term: EmploymentTerm) => {
    setFormData({
      ...term,
      effectiveDate: term.effectiveDate.split('T')[0],
      termStart: term.termStart ? term.termStart.split('T')[0] : '',
      termEnd: term.termEnd ? term.termEnd.split('T')[0] : ''
    });
    setEditingId(term.id);
    setIsViewing(true);
    setIsAdding(true);
  };

  const handleEdit = (term: EmploymentTerm) => {
    setFormData({
      ...term,
      effectiveDate: term.effectiveDate.split('T')[0],
      termStart: term.termStart ? term.termStart.split('T')[0] : '',
      termEnd: term.termEnd ? term.termEnd.split('T')[0] : ''
    });
    setEditingId(term.id);
    setIsViewing(false);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this employment term record?')) {
      try {
        await employmentTermService.delete(id);
        setTerms(prev => prev.filter(t => t.id !== id));
      } catch (error) {
        console.error('Error deleting employment term:', error);
        alert('Failed to delete employment term');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewing) return;

    const employee = employees.find(e => e.id === formData.employeeId);
    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';

    try {
      if (editingId) {
        const updatedTerm = await employmentTermService.update(editingId, {
          ...formData,
          employeeName
        } as EmploymentTerm);
        setTerms(prev => prev.map(t => t.id === editingId ? updatedTerm : t));
      } else {
        const newTerm = await employmentTermService.create({
          employeeId: formData.employeeId || '',
          effectiveDate: formData.effectiveDate || '',
          jobType: formData.jobType || '',
          jobStatus: formData.jobStatus || '',
          leaveWorkflow: formData.leaveWorkflow || 'DEFAULT',
          workday: formData.workday || 'DEFAULT',
          holiday: formData.holiday || 'DEFAULT',
          termStart: formData.termStart,
          termEnd: formData.termEnd,
          remark: formData.remark
        });
        setTerms([newTerm, ...terms]);
      }
      setIsAdding(false);
      setEditingId(null);
      resetForm();
    } catch (error) {
      console.error('Error saving employment term:', error);
      alert('Failed to save employment term');
    }
  };

  const resetForm = () => {
    setFormData({
      effectiveDate: new Date().toISOString().split('T')[0],
      jobType: '',
      jobStatus: '',
      leaveWorkflow: 'DEFAULT',
      workday: 'DEFAULT',
      holiday: 'DEFAULT',
      termStart: '',
      termEnd: '',
      remark: ''
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading employment terms...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employment Terms</h1>
          <p className="text-gray-500">Manage employee contracts and terms.</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setIsViewing(false);
            resetForm();
            setIsAdding(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Term
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-bold text-gray-900">
                {isViewing ? 'View Employment Term' : (editingId ? 'Edit Employment Term' : 'Add Employment Term')}
              </h3>
              <button onClick={() => setIsAdding(false)} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Employee Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                <select
                  required
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  value={formData.employeeId || ''}
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>

              {/* Effective Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date *</label>
                <input
                  type="date"
                  required
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData({...formData, effectiveDate: e.target.value})}
                />
              </div>

              {/* Job Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                <select
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  value={formData.jobType}
                  onChange={(e) => setFormData({...formData, jobType: e.target.value})}
                >
                  <option value="">Select Job Type</option>
                  {jobTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Job Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Status</label>
                <select
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  value={formData.jobStatus}
                  onChange={(e) => setFormData({...formData, jobStatus: e.target.value})}
                >
                  <option value="">Select Job Status</option>
                  {jobStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* Leave Workflow */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Workflow</label>
                <div className="flex gap-2">
                  <select
                    disabled={isViewing}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.leaveWorkflow}
                    onChange={(e) => setFormData({...formData, leaveWorkflow: e.target.value})}
                  >
                    {leaveWorkflows.map(wf => (
                      <option key={wf} value={wf}>{wf}</option>
                    ))}
                  </select>
                  {!isViewing && (
                    <button
                      type="button"
                      onClick={() => handleAddItem('Leave Workflow', setLeaveWorkflows)}
                      className="bg-yellow-500 text-white p-2 rounded-full hover:bg-yellow-600 w-10 h-10 flex items-center justify-center flex-shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Workday */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Workday</label>
                <div className="flex gap-2">
                  <select
                    disabled={isViewing}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.workday}
                    onChange={(e) => setFormData({...formData, workday: e.target.value})}
                  >
                    {workdays.map(wd => (
                      <option key={wd} value={wd}>{wd}</option>
                    ))}
                  </select>
                  {!isViewing && (
                    <button
                      type="button"
                      onClick={() => handleAddItem('Workday', setWorkdays)}
                      className="bg-yellow-500 text-white p-2 rounded-full hover:bg-yellow-600 w-10 h-10 flex items-center justify-center flex-shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Holiday */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Holiday</label>
                <div className="flex gap-2">
                  <select
                    disabled={isViewing}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.holiday}
                    onChange={(e) => setFormData({...formData, holiday: e.target.value})}
                  >
                    {holidays.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  {!isViewing && (
                    <button
                      type="button"
                      onClick={() => handleAddItem('Holiday', setHolidays)}
                      className="bg-yellow-500 text-white p-2 rounded-full hover:bg-yellow-600 w-10 h-10 flex items-center justify-center flex-shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Term Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Term Start</label>
                  <input
                    type="date"
                    disabled={isViewing}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.termStart}
                    onChange={(e) => setFormData({...formData, termStart: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Term End</label>
                  <input
                    type="date"
                    disabled={isViewing}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.termEnd}
                    onChange={(e) => setFormData({...formData, termEnd: e.target.value})}
                  />
                </div>
              </div>

              {/* Remark */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remark (200 characters max)</label>
                <textarea
                  maxLength={200}
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  rows={3}
                  value={formData.remark}
                  onChange={(e) => setFormData({...formData, remark: e.target.value})}
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors mr-2"
                >
                  {isViewing ? 'Close' : 'Cancel'}
                </button>
                {!isViewing && (
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Save Term
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List View */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Term Start</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {terms.map((term) => (
              <tr key={term.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{term.employeeName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(term.effectiveDate).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{term.jobType}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{term.jobStatus}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{term.termStart ? new Date(term.termStart).toLocaleDateString() : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleView(term)}
                      className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded"
                      title="View"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(term)}
                      className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(term.id)}
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
