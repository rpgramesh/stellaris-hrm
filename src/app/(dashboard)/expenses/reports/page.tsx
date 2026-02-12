'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { expensesService } from '@/services/expensesService';
import { expenseSettingsService } from '@/services/expenseSettingsService';
import { ExpenseClaim, ExpenseCategory } from '@/types';

export default function ExpenseReportsPage() {
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedClaims, fetchedCategories] = await Promise.all([
          expensesService.getExpenses(),
          expenseSettingsService.getCategories()
        ]);
        setClaims(fetchedClaims);
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div>Loading reports...</div>;

  // Prepare Data for "Expenses by Category"
  const categoryData = categories.map(cat => {
    const total = claims.reduce((sum, claim) => {
      // Find items in this claim that belong to this category
      const catItems = claim.items.filter(item => item.categoryId === cat.id);
      const catSum = catItems.reduce((s, i) => s + i.amount, 0);
      return sum + catSum;
    }, 0);
    return { name: cat.name, value: total };
  }).filter(d => d.value > 0); // Only show categories with expenses

  // Prepare Data for "Expenses by Status"
  const statusCounts: Record<string, number> = {};
  claims.forEach(claim => {
    statusCounts[claim.status] = (statusCounts[claim.status] || 0) + claim.totalAmount;
  });

  const statusData = Object.keys(statusCounts).map(status => ({
    name: status,
    value: statusCounts[status]
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Calculate Summary Stats
  const totalExpenses = claims.reduce((sum, c) => sum + c.totalAmount, 0);
  const pendingAmount = claims
    .filter(c => c.status === 'Submitted')
    .reduce((sum, c) => sum + c.totalAmount, 0);
  const approvedAmount = claims
    .filter(c => c.status === 'Approved' || c.status === 'Paid')
    .reduce((sum, c) => sum + c.totalAmount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Expense Reports</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm font-medium">Total Expenses</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">${totalExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <h3 className="text-gray-500 text-sm font-medium">Pending Approval</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">${pendingAmount.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <h3 className="text-gray-500 text-sm font-medium">Approved / Paid</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">${approvedAmount.toFixed(2)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Expenses by Category Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Expenses by Category</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses by Status Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Expenses by Status</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
