"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { employeeService } from '@/services/employeeService';
import { Employee } from '@/types';

export default function ProfilePage() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState({
    bankName: '',
    bankAccount: '',
    accountName: '' // Not in DB, will mock or store in notes if needed, but for now just local state
  });

  useEffect(() => {
    async function fetchEmployee() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        let currentEmployee: Employee | undefined;

        if (user?.email) {
           const allEmployees = await employeeService.getAll();
           currentEmployee = allEmployees.find(e => e.email === user.email);
        }

        if (!currentEmployee) {
          const allEmployees = await employeeService.getAll();
          if (allEmployees.length > 0) currentEmployee = allEmployees[0];
        }

        if (currentEmployee) {
          setEmployee(currentEmployee);
          setFormState({
            bankName: currentEmployee.bankName || '',
            bankAccount: currentEmployee.bankAccount || '',
            accountName: `${currentEmployee.firstName} ${currentEmployee.lastName}`
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEmployee();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    try {
      await employeeService.update(employee.id, {
        bankName: formState.bankName,
        bankAccount: formState.bankAccount
      });
      
      setEmployee(prev => prev ? ({ ...prev, ...formState }) : null);
      setIsEditing(false);
      alert("Bank details updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update details.");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
  if (!employee) return <div className="p-8 text-center text-red-500">Employee not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500">Manage your personal information and banking details.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Personal Info Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
            <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 overflow-hidden">
               {employee.avatarUrl ? (
                 <img src={employee.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <svg className="w-full h-full text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                   <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                 </svg>
               )}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{employee.firstName} {employee.lastName}</h2>
            <p className="text-sm text-gray-500">{employee.position}</p>
            <div className="mt-4 flex justify-center space-x-2">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${employee.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {employee.status}
              </span>
              <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">Full Time</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-500 text-xs uppercase">Email</label>
                <div className="font-medium break-all">{employee.email}</div>
              </div>
              <div>
                <label className="block text-gray-500 text-xs uppercase">Phone</label>
                <div className="font-medium">{employee.phone || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-gray-500 text-xs uppercase">Address</label>
                <div className="font-medium">{employee.address || 'N/A'}</div>
              </div>
            </div>
            <button className="mt-4 w-full text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg py-2 hover:bg-blue-50 transition-colors">
              Request Update
            </button>
          </div>
        </div>

        {/* Bank Details Form */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
                Bank Details
              </h3>
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Edit Details
                </button>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                  <input
                    type="text"
                    disabled={true} // Usually this matches employee name
                    value={formState.accountName}
                    className="w-full rounded-lg border-gray-300 shadow-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formState.bankName}
                    onChange={(e) => setFormState({...formState, bankName: e.target.value})}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="e.g. Commonwealth Bank"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number (including BSB)</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formState.bankAccount}
                    onChange={(e) => setFormState({...formState, bankAccount: e.target.value})}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="BSB + Account Number"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormState({
                        bankName: employee.bankName || '',
                        bankAccount: employee.bankAccount || '',
                        accountName: `${employee.firstName} ${employee.lastName}`
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-yellow-800">
                  For security reasons, changing your bank details may require 2-factor authentication or manager approval. 
                  Updates made before Wednesday will be processed for the current pay cycle.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
