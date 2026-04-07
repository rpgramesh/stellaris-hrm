"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Employee } from '@/types';
import EmployeeForm from '@/components/EmployeeForm';
import { getMfaRequiredAction, toggleMfaRequiredAction } from '@/app/actions/auth';
import { employeeService } from '@/services/employeeService';

export default function EditEmployeeClient({ id }: { id: string }) {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | undefined>(undefined);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [foundEmployee, allEmployees] = await Promise.all([
          employeeService.getById(id),
          employeeService.getAll()
        ]);
        
        let mfaRequired = false;
        let preferredMethod: 'Authenticator App' | 'Email' = 'Authenticator App';

        if (foundEmployee?.userId) {
          const { isRequired, preferredMethod: currentMethod } = await getMfaRequiredAction(foundEmployee.userId);
          if (isRequired) mfaRequired = true;
          if (currentMethod) preferredMethod = currentMethod as 'Authenticator App' | 'Email';
        }
        
        if (foundEmployee) {
          foundEmployee.isMfaRequired = mfaRequired;
          foundEmployee.preferredMfaMethod = preferredMethod;
        }

        setEmployee(foundEmployee);
        setManagers(allEmployees);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleUpdateEmployee = async (updatedEmployee: Employee) => {
    try {
      if (employee?.userId && 
          (updatedEmployee.isMfaRequired !== employee.isMfaRequired || 
           updatedEmployee.preferredMfaMethod !== employee.preferredMfaMethod)) {
        await toggleMfaRequiredAction(
          employee.userId, 
          !!updatedEmployee.isMfaRequired,
          updatedEmployee.preferredMfaMethod
        );
      }
      
      await employeeService.update(updatedEmployee.id, updatedEmployee);
      router.push('/employees');
    } catch (error: any) {
      console.error('Failed to update employee:', error);
      alert(`Failed to update employee. Error: ${error?.message || JSON.stringify(error)}`);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading employee data...</div>;
  }

  if (!employee) {
    return <div className="p-8 text-center text-red-500">Employee not found</div>;
  }

  return (
    <EmployeeForm 
      initialData={employee}
      managers={managers}
      onSubmit={handleUpdateEmployee} 
      title={`Edit Employee: ${employee.firstName} ${employee.lastName}`} 
      backUrl="/employees"
    />
  );
}
