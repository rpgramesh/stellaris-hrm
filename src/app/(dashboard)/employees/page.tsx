"use client";

import { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Employee } from '@/types';
import { employeeService } from '@/services/employeeService';

function EmployeesContent() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewId = searchParams?.get('view');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    if (viewId && employees.length > 0) {
      const emp = employees.find(e => e.id === viewId);
      if (emp) {
        setSelectedEmployee(emp);
      }
    } else if (!viewId) {
      setSelectedEmployee(null);
    }
  }, [viewId, employees]);

  const handleViewEmployee = (id: string) => {
    router.push(`/employees?view=${id}`, { scroll: false });
  };

  const handleCloseModal = () => {
    router.push('/employees', { scroll: false });
  };


  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await employeeService.getAll();
        setEmployees(data);
      } catch (error) {
        console.error('Failed to fetch employees:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);


  const getManagerName = (managerId?: string) => {
    if (!managerId) return '-';
    const manager = employees.find(e => e.id === managerId);
    return manager ? `${manager.firstName} ${manager.lastName}` : '-';
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      try {
        await employeeService.delete(id);
        setEmployees(prev => prev.filter(emp => emp.id !== id));
      } catch (error) {
        console.error('Failed to delete employee:', error);
        alert('Failed to delete employee. Please try again.');
      }
    }
  };

  const handleExport = () => {
    // Define headers
    const headers = ['id', 'firstName', 'lastName', 'email', 'role', 'department', 'position', 'status', 'joinDate'];
    
    // Convert employees to CSV rows
    const csvContent = [
      headers.join(','),
      ...employees.map(emp => [
        emp.id,
        emp.firstName,
        emp.lastName,
        emp.email,
        emp.role,
        emp.department,
        emp.position,
        emp.status,
        emp.joinDate
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'employees_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      try {
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const newEmployees: Employee[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Simple CSV parsing (assuming simple quotes handling)
          const values = line.split(',').map(val => val.replace(/^"|"$/g, ''));
          
          if (values.length >= headers.length) {
             // Map based on expected structure or headers
             // For simplicity, assuming fixed order matching export
             const empData: any = {
               firstName: values[1],
               lastName: values[2],
               email: values[3],
               role: values[4],
               department: values[5],
               position: values[6],
               status: values[7] as any,
               joinDate: values[8],
               // Default values for fields not in simple CSV
               phone: '',
               address: '',
               emergencyContact: '',
               bankName: '',
               bankAccount: '',
               taxId: ''
             };
             
             // Create employee in DB
             try {
                const createdEmp = await employeeService.create(empData);
                newEmployees.push(createdEmp);
             } catch (err) {
                console.error('Failed to create imported employee:', values[3], err);
             }
          }
        }

        if (newEmployees.length > 0) {
          setEmployees(prev => [...prev, ...newEmployees]);
          alert(`Successfully imported ${newEmployees.length} employees.`);
        } else {
          alert('No valid employee data found in file.');
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
        alert('Error importing file. Please check the format.');
      }
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600 mt-1">Manage your team members and their roles.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".csv" 
            className="hidden" 
          />
          
          <button
            onClick={handleImportClick}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Import
          </button>
          
          <button
            onClick={handleExport}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" transform="rotate(180 12 12)" />
            </svg>
            Export
          </button>

          <Link 
            href="/employees/add"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Employee
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Join Date
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-gray-600 font-bold">
                          {employee.avatarUrl ? (
                            <img
                              src={employee.avatarUrl}
                              alt={`${employee.firstName} ${employee.lastName}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <>
                              {employee.firstName[0]}
                              {employee.lastName[0]}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.employeeCode ? `${employee.employeeCode} - ` : ''}{employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.phone ? `${employee.email} - ${employee.phone}` : employee.email}
                        </div>
                        <div className="text-xs text-gray-400">
                          Branch: {employee.branch || '-'} • Line Manager: {getManagerName(employee.lineManagerId)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.role}</div>
                    <div className="text-sm text-gray-500">{employee.position}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.department}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${employee.status === 'Active' ? 'bg-green-100 text-green-800' : 
                        employee.status === 'On Leave' ? 'bg-yellow-100 text-yellow-800' : 
                        employee.status === 'Terminated' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(employee.joinDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleViewEmployee(employee.id)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded"
                        title="View"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                      <Link
                        href={`/employees/edit/${employee.id}`}
                        className="inline-flex items-center text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => handleDelete(employee.id)}
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

      {selectedEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-[800px] shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Employee Details</h3>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
              <div className="space-y-6">
              {/* Header Section */}
              <div className="flex items-center space-x-4 border-b pb-4">
                <div className="h-20 w-20 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-2xl text-gray-600 font-bold">
                  {selectedEmployee.avatarUrl ? (
                    <img
                      src={selectedEmployee.avatarUrl}
                      alt={`${selectedEmployee.firstName} ${selectedEmployee.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      {selectedEmployee.firstName[0]}
                      {selectedEmployee.lastName[0]}
                    </>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedEmployee.employeeCode ? `${selectedEmployee.employeeCode} - ` : ''}
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h2>
                  <p className="text-gray-500">{selectedEmployee.role} - {selectedEmployee.department}</p>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full mt-2
                    ${selectedEmployee.status === 'Active' ? 'bg-green-100 text-green-800' : 
                      selectedEmployee.status === 'On Leave' ? 'bg-yellow-100 text-yellow-800' : 
                      selectedEmployee.status === 'Terminated' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                    {selectedEmployee.status}
                  </span>
                </div>
              </div>

              {selectedEmployee.status === 'Terminated' && (
                <div className="border border-red-200 bg-red-50 text-red-800 text-sm rounded-md px-4 py-3 flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-11.5a.75.75 0 011.5 0v5a.75.75 0 01-1.5 0v-5zm.75 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold">Login disabled</p>
                    <p>This employee cannot log in to the HR or Self Service portal because their status is set to Terminated.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                {/* Personal Information */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">Personal Information</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Email:</dt>
                      <dd className="col-span-2 break-words">{selectedEmployee.email}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Phone:</dt>
                      <dd className="col-span-2">{selectedEmployee.phone}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Gender:</dt>
                      <dd className="col-span-2">{selectedEmployee.gender}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Birth Date:</dt>
                      <dd className="col-span-2">{new Date(selectedEmployee.birthDate).toLocaleDateString()}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Nationality:</dt>
                      <dd className="col-span-2">{selectedEmployee.nationality}</dd>
                    </div>
                  </dl>
                </div>

                {/* Employment Details */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">Employment Details</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Employee Code:</dt>
                      <dd className="col-span-2">{selectedEmployee.employeeCode || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Position:</dt>
                      <dd className="col-span-2">{selectedEmployee.position}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Join Date:</dt>
                      <dd className="col-span-2">{new Date(selectedEmployee.joinDate).toLocaleDateString()}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Branch:</dt>
                      <dd className="col-span-2">{selectedEmployee.branch || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Line Manager:</dt>
                      <dd className="col-span-2">{selectedEmployee.lineManager || getManagerName(selectedEmployee.lineManagerId)}</dd>
                    </div>
                  </dl>
                </div>

                {/* Financial Information */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">Financial Information</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Salary:</dt>
                      <dd className="col-span-2">
                        {selectedEmployee.salary
                          ? new Intl.NumberFormat('en-AU', {
                              style: 'currency',
                              currency: selectedEmployee.currency || 'AUD',
                            }).format(selectedEmployee.salary)
                          : '-'}
                      </dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Bank:</dt>
                      <dd className="col-span-2">{selectedEmployee.bankName || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Account:</dt>
                      <dd className="col-span-2">{selectedEmployee.bankAccount || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">TFN:</dt>
                      <dd className="col-span-2">{selectedEmployee.tfn || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">ABN:</dt>
                      <dd className="col-span-2">{selectedEmployee.abn || '-'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Compliance & Work Rights */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">Compliance &amp; Work Rights</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Superannuation Fund Name:</dt>
                      <dd className="col-span-2">{selectedEmployee.superannuationFundName || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Superannuation Member Number:</dt>
                      <dd className="col-span-2">{selectedEmployee.superannuationMemberNumber || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Medicare Number:</dt>
                      <dd className="col-span-2">{selectedEmployee.medicareNumber || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Work Rights Status:</dt>
                      <dd className="col-span-2">{selectedEmployee.workRightsStatus || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Visa Type:</dt>
                      <dd className="col-span-2">{selectedEmployee.visaType || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Visa Expiry Date:</dt>
                      <dd className="col-span-2">
                        {selectedEmployee.visaExpiryDate
                          ? new Date(selectedEmployee.visaExpiryDate).toLocaleDateString()
                          : '-'}
                      </dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Police Clearance Status:</dt>
                      <dd className="col-span-2">{selectedEmployee.policeClearanceStatus || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">WWCC Number:</dt>
                      <dd className="col-span-2">{selectedEmployee.wwccNumber || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Driver's Licence Number:</dt>
                      <dd className="col-span-2">{selectedEmployee.driversLicenseNumber || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Driver's Licence Expiry:</dt>
                      <dd className="col-span-2">
                        {selectedEmployee.driversLicenseExpiry
                          ? new Date(selectedEmployee.driversLicenseExpiry).toLocaleDateString()
                          : '-'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Emergency Contact */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">Emergency Contact</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Contact Name:</dt>
                      <dd className="col-span-2">{selectedEmployee.emergencyContactName || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Relationship:</dt>
                      <dd className="col-span-2">{selectedEmployee.emergencyContactRelationship || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Contact Phone:</dt>
                      <dd className="col-span-2">{selectedEmployee.emergencyContactPhone || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Contact Address:</dt>
                      <dd className="col-span-2 break-words">{selectedEmployee.emergencyContactAddress || '-'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Client Details */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 border-b pb-1">Client Details</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Client Name:</dt>
                      <dd className="col-span-2">{selectedEmployee.clientName || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Client Email:</dt>
                      <dd className="col-span-2 break-words">{selectedEmployee.clientEmail || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Client Line Manager:</dt>
                      <dd className="col-span-2">
                        {selectedEmployee.clientLineManager ||
                          selectedEmployee.lineManager ||
                          getManagerName(selectedEmployee.lineManagerId)}
                      </dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Client Department:</dt>
                      <dd className="col-span-2">{selectedEmployee.clientDepartment || '-'}</dd>
                    </div>
                    <div className="grid grid-cols-3">
                      <dt className="text-gray-500">Client Branch:</dt>
                      <dd className="col-span-2">{selectedEmployee.clientBranch || '-'}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmployeesContent />
    </Suspense>
  );
}
