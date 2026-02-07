"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Employee } from '@/types';
import { employeeService } from '@/services/employeeService';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

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
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                          {employee.firstName[0]}{employee.lastName[0]}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{employee.firstName} {employee.lastName}</div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
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
                    <Link href={`/employees/edit/${employee.id}`} className="text-blue-600 hover:text-blue-900 mr-4">
                      Edit
                    </Link>
                    <button 
                      onClick={() => handleDelete(employee.id)}
                      className="text-red-600 hover:text-red-900 mr-4"
                    >
                      Delete
                    </button>
                    <button 
                      onClick={() => setSelectedEmployee(employee)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      View
                    </button>
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
              <button onClick={() => setSelectedEmployee(null)} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Header Section */}
              <div className="flex items-center space-x-4 border-b pb-4">
                <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl text-gray-600 font-bold">
                  {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
                  <p className="text-gray-500">{selectedEmployee.role} - {selectedEmployee.department}</p>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full mt-2
                    ${selectedEmployee.status === 'Active' ? 'bg-green-100 text-green-800' : 
                      selectedEmployee.status === 'On Leave' ? 'bg-yellow-100 text-yellow-800' : 
                      selectedEmployee.status === 'Terminated' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                    {selectedEmployee.status}
                  </span>
                </div>
              </div>

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
                        {selectedEmployee.salary ? 
                          new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedEmployee.currency || 'USD' }).format(selectedEmployee.salary) 
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
                  </dl>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedEmployee(null)}
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
