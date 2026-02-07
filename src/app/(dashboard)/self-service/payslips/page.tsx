"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { employeeService } from '@/services/employeeService';
import { payrollService } from '@/services/payrollService';
import { Payslip, Employee } from '@/types';

export default function PayslipsPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        let currentEmployee: Employee | undefined;
        
        if (user?.email) {
          const allEmployees = await employeeService.getAll();
          currentEmployee = allEmployees.find(e => e.email === user.email);
        }

        // Fallback for demo purposes if no matching user found
        if (!currentEmployee) {
          const allEmployees = await employeeService.getAll();
          if (allEmployees.length > 0) {
            currentEmployee = allEmployees[0];
          }
        }

        if (currentEmployee) {
          setEmployee(currentEmployee);
          const employeePayslips = await payrollService.getPayslipsByEmployee(currentEmployee.id);
          setPayslips(employeePayslips);
        }
      } catch (error) {
        console.error("Error fetching payslips:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredPayslips = payslips.filter(payslip => 
    new Date(payslip.paymentDate).getFullYear().toString() === selectedYear
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
    const endDate = new Date(end).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
    return `${startDate} - ${endDate}`;
  };

  if (loading) {
    return <div className="p-6 text-center">Loading payslips...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Payslips</h1>
          <p className="text-gray-500">View and download your pay advice.</p>
        </div>
        <select 
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="2024">2024</option>
          <option value="2023">2023</option>
          <option value="2022">2022</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="hidden md:grid grid-cols-5 gap-4 px-6 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-2">Pay Period</div>
          <div>Payment Date</div>
          <div>Net Pay</div>
          <div className="text-right">Action</div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredPayslips.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No payslips found for {selectedYear}</div>
          ) : (
            filteredPayslips.map((payslip) => (
              <div key={payslip.id} className="p-6 md:p-4 flex flex-col md:grid md:grid-cols-5 gap-4 hover:bg-gray-50 transition-colors">
                <div className="col-span-2 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{formatPeriod(payslip.periodStart, payslip.periodEnd)}</div>
                    <div className="md:hidden text-xs text-gray-500">{formatDate(payslip.paymentDate)}</div>
                  </div>
                </div>
                
                <div className="hidden md:flex items-center text-sm text-gray-500">
                  {formatDate(payslip.paymentDate)}
                </div>

                <div className="flex items-center justify-between md:justify-start">
                  <div className="md:hidden text-sm text-gray-500">Net Pay:</div>
                  <div className="font-bold text-gray-900">{formatCurrency(payslip.netPay)}</div>
                </div>

                <div className="flex items-center justify-end">
                  <button className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
