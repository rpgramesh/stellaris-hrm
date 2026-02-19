'use client';

import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { Placement, Employee, JobPosition, Department, Branch, Level } from '@/types';
import { placementService } from '@/services/placementService';
import { employeeService } from '@/services/employeeService';
import { jobPositionService } from '@/services/jobPositionService';
import { departmentService } from '@/services/departmentService';
import { branchService } from '@/services/branchService';
import { levelService } from '@/services/levelService';

export default function PlacementsPage() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Lists for dropdowns
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [placementsData, employeesData, jobPositionsData, departmentsData, branchesData, levelsData] = await Promise.all([
          placementService.getAll(),
          employeeService.getAll(),
          jobPositionService.getAll(),
          departmentService.getAll(),
          branchService.getAll(),
          levelService.getAll()
        ]);
        setPlacements(placementsData);
        setEmployees(employeesData);
        setJobPositions(jobPositionsData);
        setDepartments(departmentsData);
        setBranches(branchesData);
        setLevels(levelsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Form State
  const [formData, setFormData] = useState<Partial<Placement>>({
    effectiveDate: new Date().toISOString().split('T')[0],
    jobPositionId: '',
    lineManagerId: '',
    departmentId: '',
    branchId: '',
    levelId: '',
    remark: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewing, setIsViewing] = useState(false);

  const handleView = (placement: Placement) => {
    setFormData({
      ...placement,
      employeeId: placement.employeeId,
      effectiveDate: placement.effectiveDate.split('T')[0],
      jobPositionId: placement.jobPositionId,
      departmentId: placement.departmentId,
      branchId: placement.branchId,
      levelId: placement.levelId,
      lineManagerId: placement.lineManagerId
    });
    setEditingId(placement.id);
    setIsViewing(true);
    setIsAdding(true);
  };

  const handleEdit = (placement: Placement) => {
    setFormData({
      ...placement,
      employeeId: placement.employeeId,
      // Ensure date is in YYYY-MM-DD format for input[type="date"]
      effectiveDate: placement.effectiveDate.split('T')[0],
      jobPositionId: placement.jobPositionId,
      departmentId: placement.departmentId,
      branchId: placement.branchId,
      levelId: placement.levelId,
      lineManagerId: placement.lineManagerId
    });
    setEditingId(placement.id);
    setIsViewing(false);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this placement record?')) {
      try {
        await placementService.delete(id);
        setPlacements(prev => prev.filter(p => p.id !== id));
      } catch (error) {
        console.error('Error deleting placement:', error);
        alert('Failed to delete placement');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewing) return;

    const employeeName = employees.find(e => e.id === formData.employeeId)?.firstName + ' ' + employees.find(e => e.id === formData.employeeId)?.lastName || 'Unknown';

    try {
      if (editingId) {
        const updatedPlacement = await placementService.update(editingId, {
          ...formData,
          employeeName
        } as Placement);
        setPlacements(prev => prev.map(p => p.id === editingId ? updatedPlacement : p));
      } else {
        const newPlacement = await placementService.create({
          employeeId: formData.employeeId || '',
          employeeName,
          effectiveDate: formData.effectiveDate || '',
          jobPositionId: formData.jobPositionId,
          lineManagerId: formData.lineManagerId,
          departmentId: formData.departmentId,
          branchId: formData.branchId,
          levelId: formData.levelId,
          remark: formData.remark
        });
        setPlacements([newPlacement, ...placements]);
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData({
        effectiveDate: new Date().toISOString().split('T')[0],
        jobPositionId: '',
        lineManagerId: '',
        departmentId: '',
        branchId: '',
        levelId: '',
        remark: ''
      });
    } catch (error) {
      console.error('Error saving placement:', JSON.stringify(error, null, 2));
      alert('Failed to save placement. Check console for details.');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading placements...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Placements</h1>
          <p className="text-gray-500">Manage employee placements and job history.</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setIsViewing(false);
            setFormData({
              effectiveDate: new Date().toISOString().split('T')[0],
              jobPositionId: '',
              lineManagerId: '',
              departmentId: '',
              branchId: '',
              levelId: '',
              remark: ''
            });
            setIsAdding(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Placement
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-bold text-gray-900">
                {isViewing ? 'View Placement' : (editingId ? 'Edit Placement' : 'Add Placement')}
              </h3>
              <button onClick={() => setIsAdding(false)} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Employee Selector (Added for context) */}
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
                <div className="relative">
                    <input
                    type="date"
                    required
                    disabled={isViewing}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({...formData, effectiveDate: e.target.value})}
                    />
                </div>
              </div>

              {/* Job Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Position *</label>
                <div className="flex gap-2">
                  <select
                    required
                    disabled={isViewing}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.jobPositionId || ''}
                    onChange={(e) => setFormData({...formData, jobPositionId: e.target.value})}
                  >
                    <option value="">Select Position</option>
                    {jobPositions.map(pos => (
                      <option key={pos.id} value={pos.id}>{pos.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line Manager */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Line Manager</label>
                <select
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  value={formData.lineManagerId || ''}
                  onChange={(e) => setFormData({...formData, lineManagerId: e.target.value})}
                >
                  <option value="">Select Manager</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <div className="flex gap-2">
                  <select
                    disabled={isViewing}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.departmentId || ''}
                    onChange={(e) => setFormData({...formData, departmentId: e.target.value})}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Branch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <div className="flex gap-2">
                  <select
                    disabled={isViewing}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.branchId || ''}
                    onChange={(e) => setFormData({...formData, branchId: e.target.value})}
                  >
                    <option value="">Select Branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                <div className="flex gap-2">
                  <select
                    disabled={isViewing}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.levelId || ''}
                    onChange={(e) => setFormData({...formData, levelId: e.target.value})}
                  >
                    <option value="">Select Level</option>
                    {levels.map(lvl => (
                      <option key={lvl.id} value={lvl.id}>{lvl.name}</option>
                    ))}
                  </select>
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
                    Save Placement
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {placements.map((placement) => (
              <tr key={placement.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{placement.employeeName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{placement.jobPosition}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{placement.department}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(placement.effectiveDate).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{placement.branch || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleView(placement)}
                      className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded"
                      title="View"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(placement)}
                      className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(placement.id)}
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
