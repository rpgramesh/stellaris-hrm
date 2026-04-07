"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { emailService } from '@/services/emailService';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // MFA State
  const [showMFA, setShowMFA] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [showEmailMfa, setShowEmailMfa] = useState(false);
  const [emailMfaCode, setEmailMfaCode] = useState('');
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [mfaMethod, setMfaMethod] = useState<'Authenticator App' | 'Email'>('Authenticator App');

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email first');
      return;
    }
    setResetLoading(true);
    setError(null);
    setMessage(null);
    try {
      // Use our new API route that sends the templated email
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        // Fallback if the API route isn't ready or fails
        const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (supabaseError) throw supabaseError;
      }

      setMessage('Password reset instructions have been sent to your email.');
    } catch (err: any) {
      console.error('Forgot password error:', err);
      const msg = err?.message || (typeof err === 'string' ? err : 'Error sending reset link');
      setError(msg === '{}' ? 'Failed to send reset email. Please try again later.' : msg);
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    console.log('Attempting login for:', email);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }

      if (authData.user) {
        const metadata = authData.user.user_metadata || {};
        const preferredMethod = metadata.preferred_mfa_method || 'Authenticator App';
        const isRequired = metadata.is_mfa_required || false;
        
        setMfaMethod(preferredMethod);
        setUserData(authData.user);

        // SYNC CHECK: Cross-reference with Employee Record for ultimate reliability
        let { data: employeeRec } = await supabase
          .from('employees')
          .select('is_mfa_required, preferred_mfa_method')
          .eq('user_id', authData.user.id)
          .maybeSingle();
        
        const finalIsRequired = isRequired || employeeRec?.is_mfa_required || false;
        const finalMethod = employeeRec?.preferred_mfa_method || preferredMethod;

        // CASE 1: EMAIL OTP PREFERRED AND REQUIRED
        if (finalMethod === 'Email' && finalIsRequired) {
          // ... rest of email logic ...
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          
          const metaRes = await fetch('/api/auth/save-mfa-meta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: authData.user.id, code }),
          });
          
          if (!metaRes.ok) throw new Error('Failed to secure verification. Please try again.');

          setSentCode(code);
          setUserData(authData.user);
          
          const res = await fetch('/api/auth/send-mfa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, code: code }),
          });
          
          if (!res.ok) {
             throw new Error('Failed to send verification code. Please try again.');
          }
          
          setShowEmailMfa(true);
          setLoading(false);
          return;
        } 
        
        // CASE 2: TOTP (APP) PATH
        if (finalMethod === 'Authenticator App') {
          const userFactors = authData.user.factors || [];
          const enrolledTotp = userFactors.find((f: any) => f.factor_type === 'totp' && f.status === 'verified');

          if (enrolledTotp && finalIsRequired) {
            setShowMFA(true);
            setFactorId(enrolledTotp.id);
            setLoading(false);
            return;
          }

          if (finalIsRequired) {
            await startMfaEnrollment();
            return;
          }
        }

        // NO MFA REQUIRED OR ALREADY PASSED
        await processEmployeeLogin(authData.user);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err?.message || (typeof err === 'string' ? err : 'An error occurred during login');
      setError(msg === '{}' ? 'Authentication failed. Please check your credentials.' : msg);
      await supabase.auth.signOut();
    } finally {
      if (!showMFA && !showMfaSetup) setLoading(false);
    }
  };

  const startEmailMfa = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false,
        }
      });
      if (otpError) throw otpError;
      setShowEmailMfa(true);
    } catch (err: any) {
      console.error('Email MFA start error:', err);
      setError(err?.message || 'Failed to send verification email.');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);
    setError(null);
    try {
      // 1. Get current user and metadata
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (userData) {
           // If we lost the session object but still have userData state, try verify against sentCode
           if (emailMfaCode === sentCode) {
             await processEmployeeLogin(userData);
             return;
           }
        }
        throw new Error('Session timed out. Please login again.');
      }

      const metadata = user.user_metadata || {};
      const serverCode = metadata.temp_mfa_code;

      // 2. Verify code (Check both server-persisted and local state)
      if (emailMfaCode === String(serverCode) || emailMfaCode === sentCode) {
        console.log('OTP Verified. Proceeding to dashboard...');
        
        // Clear the code after use via Admin API (best effort)
        fetch('/api/auth/save-mfa-meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, code: null }),
        }).catch(() => {});

        await processEmployeeLogin(user);
      } else {
        throw new Error('Invalid verification code. Please check your email.');
      }
    } catch (err: any) {
      console.error('Email OTP Verify error:', err);
      setError(err?.message || 'Invalid verification code.');
    } finally {
      setMfaLoading(false);
    }
  };

  const startMfaEnrollment = async () => {
    try {
      setLoading(true);
      setShowMfaSetup(true);
      setError(null);
      
      const { data: listData } = await supabase.auth.mfa.listFactors();
      const unverified = (listData?.totp || []).filter((f: any) => f.status === 'unverified');
      for (const f of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (enrollError) throw enrollError;
      
      setFactorId(data.id);
      setQrCodeData(data.totp.uri);
    } catch (err: any) {
      console.error('MFA setup error:', err);
      setError(err?.message || 'Failed to start MFA enrollment.');
    } finally {
      setLoading(false);
    }
  };

  const processEmployeeLogin = async (user: any) => {
    try {
      // Fetch employee role and employment status
      // 1. Try by user_id
      console.log('Fetching employee record for user_id:', user.id);
      let { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, role, is_password_change_required, employment_status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (empError) {
        console.warn('Non-critical: Error fetching employee by user_id:', empError.message || empError);
      }

      // 2. Fallback to email if not found by user_id
      if (!employee) {
        console.log('No employee record found by user_id (or error), trying by email:', user.email);
        const { data: empByEmail, error: emailError } = await supabase
          .from('employees')
          .select('id, role, is_password_change_required, employment_status')
          .eq('email', user.email)
          .maybeSingle();
        
        if (emailError) {
          console.warn('Non-critical: Error fetching employee by email:', emailError.message || emailError);
        }
        
        if (empByEmail) {
          console.log('Found employee record by email, linking user_id...');
          employee = empByEmail;
          // Auto-link user_id for future logins - ignore error if RLS blocks it
          supabase
            .from('employees')
            .update({ user_id: user.id })
            .eq('id', empByEmail.id)
            .then(({ error }) => {
              if (error) console.warn('Failed to auto-link user_id:', error.message);
            });
        }
      }
      
      console.log('Resolved employee record:', employee);

      const metadata = user.user_metadata || {};
      const role = employee?.role || metadata.role;
      const isPasswordChangeRequired = employee?.is_password_change_required || false;
      const employmentStatus = employee?.employment_status || 'Active';

      console.log('Resolved identity:', { role, isPasswordChangeRequired, employmentStatus });

      // Block terminated employees
      if (employmentStatus === 'Terminated') {
        throw new Error('Access Denied: Your employment is terminated.');
      }

      // Check for forced password change
      if (isPasswordChangeRequired) {
        window.location.href = '/change-password';
        return;
      }

      const validAdminRoles = ['Super Admin', 'Employer Admin', 'Administrator', 'HR Admin'];
      const validHrRoles = ['HR Manager', 'HR', 'HR Admin'];

      // Define valid roles mapping
      if (validAdminRoles.includes(role) || validHrRoles.includes(role)) {
        console.log('Redirecting to dashboard...');
        window.location.href = '/dashboard';
      } else {
        console.log('Employee login, checking employee record...');
        if (!employee) {
            throw new Error('Access Denied: No employee record found for this user. Please contact HR to set up your profile.');
        }
        console.log('Redirecting to self-service...');
        window.location.href = '/self-service';
      }
    } catch (err: any) {
      console.error('Login routing error:', err);
      const msg = err?.message || (typeof err === 'string' ? err : 'An error occurred during login');
      setError(msg === '{}' ? 'Authentication failed. Please check your credentials.' : msg);
      await supabase.auth.signOut();
      if (showMFA) setShowMFA(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;

    setMfaLoading(true);
    setError(null);

    try {
      const verify = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: mfaCode,
      });

      if (verify.error) throw verify.error;

      // MFA successful! Proceed with the original routine.
      await processEmployeeLogin(userData);

    } catch (err: any) {
      console.error('MFA Verify error:', err);
      setError(err?.message || 'Invalid Two-Factor Code. Please try again.');
    } finally {
      setMfaLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="pointer-events-none absolute -top-40 -right-32 w-80 h-80 bg-blue-500/25 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl" />

      <div className="absolute top-8 left-8 z-10">
        <Link href="/">
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 shadow-lg">
            <img 
              src="/logo.png" 
              alt="Stellaris Logo" 
              className="h-10 w-auto object-contain drop-shadow" 
            />
          </div>
        </Link>
      </div>

      <div className="relative w-full max-w-md bg-white shadow-2xl rounded-2xl overflow-hidden z-10">

        {showMfaSetup ? (
          <form onSubmit={handleMfaSubmit} className="p-8 space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Setup Required</h2>
              <p className="text-slate-500 mt-2 text-sm">Your administrator has required you to set up Two-Factor Authentication.</p>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {qrCodeData ? (
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 inline-block mb-4">
                  <QRCodeSVG value={qrCodeData} size={200} />
                </div>
                <p className="text-sm text-slate-500 mb-4 text-center">Scan this code with your authenticator app, then enter the 6-digit verification code below.</p>
                <div className="relative group w-full">
                   <input
                     type="text"
                     className="w-full border p-3 rounded-lg font-mono text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-blue-500 outline-none"
                     value={mfaCode}
                     onChange={(e) => setMfaCode(e.target.value)}
                     maxLength={6}
                     placeholder="000000"
                     required
                   />
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-slate-500">Generating secure token...</p>
              </div>
            )}
            
            <button
               type="submit"
               disabled={mfaLoading || mfaCode.length !== 6 || !qrCodeData}
               className={`w-full text-white font-bold py-3 px-4 rounded shadow-md transition-colors uppercase text-sm tracking-wide ${
                 (mfaLoading || mfaCode.length !== 6 || !qrCodeData) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
               }`}
             >
               {mfaLoading ? 'Verifying...' : 'Verify & Continue'}
            </button>
            <div className="text-center mt-4">
               <button type="button" onClick={() => { setShowMfaSetup(false); supabase.auth.signOut(); }} className="text-sm text-slate-500 hover:text-slate-700">Cancel & Logout</button>
            </div>
          </form>
        ) : showEmailMfa ? (
          <form onSubmit={verifyEmailOtp} className="p-8 space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Check Your Email</h2>
              <p className="text-slate-500 mt-2 text-sm">We've sent a 6-digit verification code to your email. Please enter it below to continue.</p>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="relative group">
               <input
                 type="text"
                 className="w-full border p-3 rounded-lg font-mono text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-blue-500 outline-none"
                 value={emailMfaCode}
                 onChange={(e) => setEmailMfaCode(e.target.value)}
                 maxLength={6}
                 placeholder="000000"
                 required
               />
            </div>
            
            <button
               type="submit"
               disabled={mfaLoading || emailMfaCode.length !== 6}
               className={`w-full text-white font-bold py-3 px-4 rounded shadow-md transition-colors uppercase text-sm tracking-wide ${
                 (mfaLoading || emailMfaCode.length !== 6) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
               }`}
             >
               {mfaLoading ? 'Verifying...' : 'Verify & Continue'}
            </button>
            <div className="text-center mt-4">
               <button type="button" onClick={() => { setShowEmailMfa(false); supabase.auth.signOut(); }} className="text-sm text-slate-500 hover:text-slate-700">Cancel & Logout</button>
            </div>
          </form>
        ) : showMFA ? (
          // MFA Challenge UI
          <form onSubmit={handleMfaSubmit} className="p-8 space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Two-Factor Authentication</h2>
              <p className="text-slate-500 mt-2 text-sm">Please enter the 6-digit code from your authenticator app to continue.</p>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="relative group">
               <label className="block text-sm text-gray-500 mb-1">Authenticator Code</label>
               <input
                 type="text"
                 className="w-full border p-3 rounded-lg font-mono text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-blue-500 outline-none"
                 value={mfaCode}
                 onChange={(e) => setMfaCode(e.target.value)}
                 maxLength={6}
                 required
               />
            </div>
            
            <button
               type="submit"
               disabled={mfaLoading || mfaCode.length !== 6}
               className={`w-full text-white font-bold py-3 px-4 rounded shadow-md transition-colors uppercase text-sm tracking-wide ${
                 (mfaLoading || mfaCode.length !== 6) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
               }`}
             >
               {mfaLoading ? 'Verifying...' : 'Verify & Continue'}
            </button>
            <div className="text-center mt-4">
               <button type="button" onClick={() => { setShowMFA(false); supabase.auth.signOut(); }} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
            </div>
          </form>
        ) : (
          // Password Form
          <>
        <form onSubmit={handleLogin} className="p-8 space-y-8">
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
              <p className="text-green-700 text-sm">{message}</p>
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

          {/* HR Role Toggle - removed as not required */}

          {/* Forgot Password */}
          <div className="text-right">
            <button 
              type="button"
              onClick={handleForgotPassword}
              disabled={resetLoading}
              className="text-sm text-cyan-500 hover:text-cyan-700 disabled:opacity-50"
            >
              {resetLoading ? 'Sending...' : 'Forgot Password?'}
            </button>
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
              {loading ? 'Logging in...' : 'Login'}
            </button>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
