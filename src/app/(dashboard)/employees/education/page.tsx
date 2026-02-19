'use client';

import { useState, useEffect } from 'react';
import { Education, Employee } from '@/types';
import { educationService } from '@/services/educationService';
import { employeeService } from '@/services/employeeService';

export default function EducationPage() {
  const [educations, setEducations] = useState<Education[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewing, setIsViewing] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Education>>({
    school: '',
    fieldOfStudy: '',
    degree: '',
    grade: '',
    fromYear: '',
    toYear: '',
    remark: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [educationsData, employeesData] = await Promise.all([
          educationService.getAll(),
          employeeService.getAll()
        ]);
        setEducations(educationsData);
        setEmployees(employeesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleView = (edu: Education) => {
    setFormData(edu);
    setEditingId(edu.id);
    setIsViewing(true);
    setIsAdding(true);
  };

  const handleEdit = (edu: Education) => {
    setFormData(edu);
    setEditingId(edu.id);
    setIsViewing(false);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this education record?')) {
      try {
        await educationService.delete(id);
        setEducations(prev => prev.filter(e => e.id !== id));
      } catch (error) {
        console.error('Error deleting education:', error);
        alert('Failed to delete education record');
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
        const updatedEducation = await educationService.update(editingId, {
          ...formData,
          employeeName
        } as Education);
        setEducations(prev => prev.map(e => e.id === editingId ? updatedEducation : e));
      } else {
        const newEducation = await educationService.create({
          employeeId: formData.employeeId || '',
          school: formData.school || '',
          fieldOfStudy: formData.fieldOfStudy || '',
          degree: formData.degree || '',
          grade: formData.grade || '',
          fromYear: formData.fromYear || '',
          toYear: formData.toYear || '',
          remark: formData.remark
        });
        setEducations([newEducation, ...educations]);
      }
      setIsAdding(false);
      setEditingId(null);
      resetForm();
    } catch (error) {
      console.error('Error saving education:', error);
      alert('Failed to save education record');
    }
  };

  const resetForm = () => {
    setFormData({
      school: '',
      fieldOfStudy: '',
      degree: '',
      grade: '',
      fromYear: '',
      toYear: '',
      remark: ''
    });
  };

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Education</h1>
          <p className="text-gray-500">Manage employee education records.</p>
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
          Add Education
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-bold text-gray-900">
                {isViewing ? 'View Education' : (editingId ? 'Edit Education' : 'Add Education')}
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

              {/* School */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School *</label>
                <input
                  type="text"
                  required
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  value={formData.school || ''}
                  onChange={(e) => setFormData({...formData, school: e.target.value})}
                />
              </div>

              {/* Field of Study */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
                <input
                  type="text"
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  value={formData.fieldOfStudy || ''}
                  onChange={(e) => setFormData({...formData, fieldOfStudy: e.target.value})}
                />
              </div>

              {/* Degree */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Degree *</label>
                <input
                  type="text"
                  required
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  value={formData.degree || ''}
                  onChange={(e) => setFormData({...formData, degree: e.target.value})}
                />
              </div>

              {/* Grade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                <input
                  type="text"
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  value={formData.grade || ''}
                  onChange={(e) => setFormData({...formData, grade: e.target.value})}
                />
              </div>

              {/* From/To Year */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Year</label>
                  <input
                    type="text"
                    placeholder="YYYY"
                    disabled={isViewing}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.fromYear || ''}
                    onChange={(e) => setFormData({...formData, fromYear: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Year</label>
                  <input
                    type="text"
                    placeholder="YYYY"
                    disabled={isViewing}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.toYear || ''}
                    onChange={(e) => setFormData({...formData, toYear: e.target.value})}
                  />
                </div>
              </div>

              {/* Remark */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                <textarea
                  rows={3}
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  value={formData.remark || ''}
                  onChange={(e) => setFormData({...formData, remark: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                {!isViewing && (
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingId ? 'Update' : 'Save'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Degree</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {educations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No education records found
                </td>
              </tr>
            ) : (
              educations.map((edu) => (
                <tr key={edu.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{edu.employeeName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{edu.school}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{edu.degree}</div>
                    <div className="text-xs text-gray-500">{edu.fieldOfStudy}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {edu.fromYear} - {edu.toYear}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleView(edu)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded"
                        title="View"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleEdit(edu)}
                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(edu.id)}
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
