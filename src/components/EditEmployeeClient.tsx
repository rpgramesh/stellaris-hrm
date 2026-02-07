"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Employee } from '@/types';
import EmployeeForm from '@/components/EmployeeForm';
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
      await employeeService.update(updatedEmployee.id, updatedEmployee);
      router.push('/employees');
    } catch (error) {
      console.error('Failed to update employee:', error);
      alert('Failed to update employee. Please try again.');
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
