"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Employee } from '@/types';
import EmployeeForm from '@/components/EmployeeForm';
import { employeeService } from '@/services/employeeService';

export default function AddEmployeePage() {
  const router = useRouter();
  const [managers, setManagers] = useState<Employee[]>([]);

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const data = await employeeService.getAll();
        setManagers(data);
      } catch (error) {
        console.error('Failed to fetch employees:', error);
      }
    };
    fetchManagers();
  }, []);

  const handleAddEmployee = async (newEmployee: Employee) => {
    try {
      await employeeService.create(newEmployee);
      router.push('/employees');
    } catch (error) {
      console.error('Failed to create employee:', error);
      alert('Failed to create employee. Please try again.');
    }
  };

  return (
    <EmployeeForm 
      managers={managers}
      onSubmit={handleAddEmployee} 
      title="Add Employee" 
      backUrl="/employees"
    />
  );
}
