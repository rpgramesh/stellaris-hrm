import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { bonusCalculationsService } from '@/services/bonusCalculationsService';
import { BonusPayment, BonusType } from '@/types/bonus';
import { PayrollEmployee } from '@/types/payroll';
import { Plus, DollarSign, Calendar, User, FileText, Check, X, AlertCircle } from 'lucide-react';

export default function BonusManagement() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewBonusModal, setShowNewBonusModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [bonusType, setBonusType] = useState<BonusType>('performance');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('payroll_employees')
        .select(`
          *,
          employees:employee_id (
            first_name,
            last_name
          )
        `)
        .eq('is_active', true);

      if (employeesError) throw employeesError;

      const mappedEmployees = employeesData.map((emp: any) => ({
        ...emp,
        full_name: emp.employees ? `${emp.employees.first_name} ${emp.employees.last_name}` : 'Unknown'
      }));
      setEmployees(mappedEmployees);

      // Fetch bonuses
      const { data: bonusesData, error: bonusesError } = await supabase
        .from('bonus_payments')
        .select(`
          *,
          employees (
            first_name,
            last_name
          )
        `)
        .order('payment_date', { ascending: false });

      if (bonusesError) throw bonusesError;
      
      const mappedBonuses = bonusesData.map((b: any) => ({
         ...b,
         grossAmount: b.amount, // Map back for display
         employeeName: b.employees ? `${b.employees.first_name} ${b.employees.last_name}` : 'Unknown'
      }));

      setBonuses(mappedBonuses);

    } catch (error: any) {
      console.error('Error loading data:', error.message || error.details || error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !amount || !paymentDate) return;

    try {
      setProcessing(true);
      const employee = employees.find(e => e.id === selectedEmployeeId);
      if (!employee) throw new Error('Employee not found');

      // Calculate
      const result = await bonusCalculationsService.calculateBonus(
        employee,
        bonusType,
        parseFloat(amount),
        new Date(paymentDate),
        {
            taxMethod: 'marginal-rates', // Default for now
            includeSuperannuation: true
        }
      );

      // Save
      await bonusCalculationsService.processBonusPayment(result);

      setShowNewBonusModal(false);
      resetForm();
      loadData();
      alert('Bonus processed successfully!');

    } catch (error: any) {
      console.error('Error processing bonus:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedEmployeeId('');
    setBonusType('performance');
    setAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bonus Payments</h1>
          <p className="text-gray-600 mt-1">Manage employee bonuses and commissions</p>
        </div>
        <button
          onClick={() => setShowNewBonusModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} />
          New Bonus
        </button>
      </div>

      {/* Bonus List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bonuses.map((bonus: any) => (
              <tr key={bonus.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bonus.employeeName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{bonus.bonus_type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${bonus.amount?.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(bonus.payment_date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    bonus.approval_status === 'approved' ? 'bg-green-100 text-green-800' : 
                    bonus.approval_status === 'rejected' ? 'bg-red-100 text-red-800' : 
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {bonus.approval_status || 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
             {bonuses.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No bonus payments found.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Bonus Modal */}
      {showNewBonusModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">New Bonus Payment</h2>
            <form onSubmit={handleCalculateAndSave}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee</label>
                  <select
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Bonus Type</label>
                  <select
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    value={bonusType}
                    onChange={(e) => setBonusType(e.target.value as BonusType)}
                  >
                    <option value="performance">Performance</option>
                    <option value="annual">Annual</option>
                    <option value="sign-on">Sign-on</option>
                    <option value="retention">Retention</option>
                    <option value="commission">Commission</option>
                    <option value="special">Special</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                  <input
                    type="date"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewBonusModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Calculate & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
