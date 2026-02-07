"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'admin' | 'employee'>('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [isHrRole, setIsHrRole] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Fetch employee role
        // 1. Try by user_id
        let { data: employee, error: empError } = await supabase
          .from('employees')
          .select('role, is_password_change_required')
          .eq('user_id', authData.user.id)
          .single();

        // 2. Fallback to email if not found by user_id
        if (!employee) {
             const { data: empByEmail, error: emailError } = await supabase
               .from('employees')
               .select('id, role, is_password_change_required')
               .eq('email', authData.user.email)
               .single();
             
             if (empByEmail) {
                employee = empByEmail;
                // Auto-link user_id for future logins
                await supabase
                  .from('employees')
                  .update({ user_id: authData.user.id })
                  .eq('id', empByEmail.id);
             }
        }
        
        // Check for forced password change
        if (employee?.is_password_change_required) {
            router.push('/change-password');
            return;
        }

        const role = employee?.role;

        // Define valid roles mapping
        const validAdminRoles = ['Super Admin', 'Employer Admin', 'Administrator', 'HR Admin'];
        const validHrRoles = ['HR Manager', 'HR', 'HR Admin'];

        if (activeTab === 'admin') {
          // Administrator Tab Logic
          if (isHrRole) {
            // HR Role Toggle is ON: Must be HR or Administrator with HR privileges
            // Allowing Super Admin to access HR as well
            if (!validHrRoles.includes(role) && !validAdminRoles.includes(role)) {
              throw new Error('Access Denied: You do not have HR privileges.');
            }
          } else {
            // HR Role Toggle is OFF: Must be Administrator
            if (!validAdminRoles.includes(role)) {
              throw new Error('Access Denied: You do not have Administrator privileges.');
            }
          }
          router.push('/dashboard');
        } else {
          // Employee Tab Logic
          // Require an employee record to exist
          if (!employee) {
             throw new Error('Access Denied: No employee record found for this user.');
          }
          router.push('/self-service/profile');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="w-full max-w-md bg-white shadow-xl rounded-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex text-sm font-bold uppercase tracking-wide">
          <button
            onClick={() => { setActiveTab('admin'); setError(null); }}
            className={`flex-1 py-5 text-center transition-colors ${
              activeTab === 'admin'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-blue-400 hover:bg-gray-200'
            }`}
          >
            Administrator
          </button>
          <button
            onClick={() => { setActiveTab('employee'); setError(null); }}
            className={`flex-1 py-5 text-center transition-colors ${
              activeTab === 'employee'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-blue-400 hover:bg-gray-200'
            }`}
          >
            Employee
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="p-8 space-y-8">
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Email Input */}
          <div className="relative group">
            <div className="flex items-end border-b border-gray-300 py-2">
              <div className="text-gray-500 mr-4 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  className="appearance-none bg-transparent border-none w-full text-gray-700 py-1 leading-tight focus:outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Password Input */}
          <div className="relative group">
             <div className="flex items-center border-b border-gray-300 bg-blue-50 px-2 py-2">
                <div className="text-gray-500 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-0.5">Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="appearance-none bg-transparent border-none w-full text-gray-800 py-1 leading-tight focus:outline-none font-medium tracking-widest"
                    value={password}
                    placeholder="••••••••••••"
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-500 focus:outline-none ml-2"
                >
                  {showPassword ? (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
             </div>
          </div>

          {/* HR Role Toggle - Only for Administrator */}
          {activeTab === 'admin' && (
            <div className="flex justify-end pt-2">
              <div className="flex items-center space-x-3 border border-blue-400 rounded-full px-4 py-1">
                <span className="text-blue-500 font-bold text-sm">HR Role</span>
                <button
                  type="button"
                  onClick={() => setIsHrRole(!isHrRole)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isHrRole ? 'bg-blue-400' : 'bg-gray-200'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isHrRole ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Forgot Password */}
          <div className="text-right">
            <a href="#" className="text-sm text-cyan-500 hover:text-cyan-700">
              Forgot {activeTab === 'admin' ? 'Administrator' : 'Employee'} Password?
            </a>
          </div>

        </form>

        {/* Login Button */}
        <div className="px-8 pb-8">
            <button
              onClick={handleLogin}
              disabled={loading}
              className={`w-full text-white font-bold py-3 px-4 rounded shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors uppercase text-sm tracking-wide ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {loading ? 'Logging in...' : activeTab === 'admin' ? 'HR Login' : 'Employee Login'}
            </button>
            <div className="mt-4 text-center">
               <Link href="/register" className="text-sm text-blue-500 hover:text-blue-700">
                 Need an account? Register here
               </Link>
             </div>
        </div>
      </div>
    </div>
  );
}
