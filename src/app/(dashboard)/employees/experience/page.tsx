'use client';

import { useState, useEffect } from 'react';
import { Experience, Employee } from '@/types';
import { experienceService } from '@/services/experienceService';
import { employeeService } from '@/services/employeeService';

export default function ExperiencePage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewing, setIsViewing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [experiencesData, employeesData] = await Promise.all([
          experienceService.getAll(),
          employeeService.getAll()
        ]);
        setExperiences(experiencesData);
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
  const [formData, setFormData] = useState<Partial<Experience>>({
    employer: '',
    jobTitle: '',
    fromDate: '',
    toDate: '',
    reasonForLeaving: '',
    salary: undefined,
    currency: 'AUD',
    country: '',
    remark: ''
  });

  const currencies = ['AUD', 'USD', 'EUR', 'GBP', 'NZD'];
  const countries = ['Australia', 'USA', 'UK', 'New Zealand', 'Canada', 'Singapore'];

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return '-';
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return '-';
    
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`;
    }
    return `${months} month${months !== 1 ? 's' : ''}`;
  };

  const handleView = (exp: Experience) => {
    setFormData(exp);
    setEditingId(exp.id);
    setIsViewing(true);
    setIsAdding(true);
  };

  const handleEdit = (exp: Experience) => {
    setFormData(exp);
    setEditingId(exp.id);
    setIsViewing(false);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this experience record?')) {
      try {
        await experienceService.delete(id);
        setExperiences(prev => prev.filter(e => e.id !== id));
      } catch (error) {
        console.error('Error deleting experience:', error);
        alert('Failed to delete experience');
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
        const updatedExperience = await experienceService.update(editingId, {
          ...formData,
          employeeName
        } as Experience);
        setExperiences(prev => prev.map(e => e.id === editingId ? updatedExperience : e));
      } else {
        const newExperience = await experienceService.create({
          employeeId: formData.employeeId || '',
          employer: formData.employer || '',
          jobTitle: formData.jobTitle || '',
          fromDate: formData.fromDate || '',
          toDate: formData.toDate || '',
          reasonForLeaving: formData.reasonForLeaving || '',
          salary: formData.salary,
          currency: formData.currency,
          country: formData.country,
          remark: formData.remark
        });
        setExperiences([newExperience, ...experiences]);
      }
      setIsAdding(false);
      setEditingId(null);
      resetForm();
    } catch (error) {
      console.error('Error saving experience:', error);
      alert('Failed to save experience');
    }
  };

  const resetForm = () => {
    setFormData({
      employer: '',
      jobTitle: '',
      fromDate: '',
      toDate: '',
      reasonForLeaving: '',
      salary: undefined,
      currency: 'AUD',
      country: '',
      remark: ''
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading experience records...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Experience</h1>
          <p className="text-gray-500">Manage employee work experience records.</p>
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
          Add Experience
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-bold text-gray-900">
                {isViewing ? 'View Experience' : (editingId ? 'Edit Experience' : 'Add Experience')}
              </h3>
              <button
                onClick={() => setIsAdding(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Employee Selection */}
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

              {/* Employer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employer *</label>
                <input
                  type="text"
                  required
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  value={formData.employer}
                  onChange={(e) => setFormData({...formData, employer: e.target.value})}
                />
              </div>

              {/* Job Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                />
              </div>

              {/* From / To Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From *</label>
                  <input
                    type="date"
                    required
                    disabled={isViewing}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.fromDate}
                    onChange={(e) => setFormData({...formData, fromDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
                  <input
                    type="date"
                    required
                    disabled={isViewing}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.toDate}
                    onChange={(e) => setFormData({...formData, toDate: e.target.value})}
                  />
                </div>
              </div>

              {/* Duration Display */}
              <div className="bg-gray-50 p-2 rounded border border-gray-200">
                <label className="block text-xs font-medium text-gray-500 mb-1">Duration</label>
                <div className="text-sm font-medium text-gray-900">
                  {calculateDuration(formData.fromDate || '', formData.toDate || '')}
                </div>
              </div>

              {/* Salary / Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                  <input
                    type="number"
                    disabled={isViewing}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.salary || ''}
                    onChange={(e) => setFormData({...formData, salary: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    disabled={isViewing}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.currency}
                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  >
                    {currencies.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Country / Region */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country / Region</label>
                <select
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  value={formData.country || ''}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                >
                  <option value="">Select Country</option>
                  {countries.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Reason for Leaving */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Leaving</label>
                <textarea
                  maxLength={200}
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  rows={2}
                  value={formData.reasonForLeaving || ''}
                  onChange={(e) => setFormData({ ...formData, reasonForLeaving: e.target.value })}
                />
              </div>

              {/* Attachment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attachment</label>
                <div className={`border rounded-md p-2 flex items-center justify-between ${isViewing ? 'bg-gray-100' : 'bg-white'}`}>
                  <span className="text-gray-500 text-sm">
                    {formData.attachment ? 'File attached' : 'No file chosen'}
                  </span>
                  <button type="button" disabled={isViewing} className="text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                    </svg>
                  </button>
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
                    Save Experience
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {experiences.map((exp) => (
              <tr key={exp.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exp.employeeName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.employer}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.jobTitle}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(exp.fromDate).getFullYear()} - {new Date(exp.toDate).getFullYear()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleView(exp)}
                      className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded"
                      title="View"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(exp)}
                      className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(exp.id)}
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
            {experiences.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No experience records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
