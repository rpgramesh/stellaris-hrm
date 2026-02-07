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
                  <button
                    onClick={() => handleView(placement)}
                    className="text-gray-600 hover:text-gray-900 mr-4"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(placement)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(placement.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
