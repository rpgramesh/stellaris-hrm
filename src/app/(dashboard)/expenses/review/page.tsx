'use client';

import React, { useState, useEffect } from 'react';
import { expensesService } from '@/services/expensesService';
import { employeeService } from '@/services/employeeService';
import { ExpenseClaim, Employee } from '@/types';

export default function ExpenseReviewPage() {
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedClaims, fetchedEmployees] = await Promise.all([
          expensesService.getExpenses(),
          employeeService.getAll()
        ]);
        setClaims(fetchedClaims.filter(c => c.status === 'Submitted'));
        setEmployees(fetchedEmployees);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : id;
  };

  const handleApprove = async (id: string) => {
    try {
        // In a real app, we would get the current user ID
        const approverId = 'current-user-id'; 
        await expensesService.updateExpenseStatus(id, 'Approved', approverId);
        setClaims(claims.filter(c => c.id !== id));
        alert(`Claim ${id} approved.`);
    } catch (error) {
        console.error('Error approving claim:', error);
        alert('Failed to approve claim');
    }
  };

  const handleReject = async (id: string) => {
    try {
        const approverId = 'current-user-id';
        await expensesService.updateExpenseStatus(id, 'Rejected', approverId);
        setClaims(claims.filter(c => c.id !== id));
        alert(`Claim ${id} rejected.`);
    } catch (error) {
        console.error('Error rejecting claim:', error);
        alert('Failed to reject claim');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Expense Review</h1>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Claim ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {claims.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No pending claims to review.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {claim.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getEmployeeName(claim.employeeId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {claim.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {claim.dateSubmitted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${claim.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleApprove(claim.id)}
                          className="text-green-600 hover:text-green-900 bg-green-50 p-1.5 rounded"
                          title="Approve"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l2.25 2.25L15 9.75" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleReject(claim.id)}
                          className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded"
                          title="Reject"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
    </div>
  );
}
