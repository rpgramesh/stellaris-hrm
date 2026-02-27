"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { auditService } from '@/services/auditService';

function ResetPasswordContent() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session check error:', error);
        setError('The reset link is invalid or has expired.');
      } else if (session) {
        setSessionReady(true);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed in reset-password:', event, !!session);
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
        setError(null);
      } else if (event === 'SIGNED_OUT') {
        setSessionReady(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const validatePassword = (value: string): string | null => {
    if (value.length < 12) return 'Password must be at least 12 characters.';
    if (!/[A-Z]/.test(value)) return 'Password must include at least one uppercase letter.';
    if (!/[a-z]/.test(value)) return 'Password must include at least one lowercase letter.';
    if (!/[0-9]/.test(value)) return 'Password must include at least one number.';
    if (!/[!@#$%^&*()[\\\]\-_=+{};:\'",.<>\/?\\|`~]/.test(value)) {
      return 'Password must include at least one special character.';
    }
    return null;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const policyError = validatePassword(password);
    if (policyError) {
      setError(policyError);
      setLoading(false);
      return;
    }

    try {
      // Check session before update
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session found. Your reset link may be invalid or expired. Please request a new one.');
      }

      const { data: { user }, error: authError } = await supabase.auth.updateUser({
        password: password
      });

      if (authError) throw authError;

      if (user) {
        // Log the action
        await auditService.logAction(
          'auth',
          user.id,
          'SYSTEM_ACTION',
          null,
          {
            event: 'PASSWORD_RESET_SUCCESS',
            occurred_at: new Date().toISOString(),
          }
        ).catch(e => console.error('Failed to log audit:', e));

        // Also update employee record if needed (e.g. clear password required flag)
        await supabase
          .from('employees')
          .update({ is_password_change_required: false })
          .eq('user_id', user.id)
          .catch(e => console.error('Failed to update employee record:', e));
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Reset password error details:', err);
      
      let errorMessage = 'Failed to reset password';
      
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.message && err.message !== '{}') {
        errorMessage = err.message;
      } else if (err?.error_description && err.error_description !== '{}') {
        errorMessage = err.error_description;
      } else if (err?.name === 'AuthRetryableFetchError') {
        errorMessage = 'Network error occurred while connecting to authentication server. Please check your connection and try again.';
      } else {
        // Try to extract from nested structures
        const possibleMessage = err?.data?.message || err?.error?.message;
        if (possibleMessage && possibleMessage !== '{}') {
          errorMessage = possibleMessage;
        } else {
          try {
            const stringified = JSON.stringify(err);
            if (stringified !== '{}' && stringified !== 'undefined') {
              errorMessage = stringified;
            } else {
              errorMessage = err.name ? `${err.name}: ${err.message || 'Unknown error'}` : 'An unexpected error occurred. The link may have expired.';
            }
          } catch (e) {
            errorMessage = 'An unexpected error occurred. Please request a new reset link.';
          }
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-96 text-center">
          <div className="text-green-500 mb-4 text-4xl">✓</div>
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Success!</h1>
          <p className="text-gray-600 mb-6">
            Your password has been reset successfully. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900">Reset Your Password</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Please enter your new password below.
        </p>
        
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 12 characters, uppercase, number..."
              className="w-full rounded-md border-gray-300 shadow-sm p-2.5 border text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input 
              type="password" 
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              className="w-full rounded-md border-gray-300 shadow-sm p-2.5 border text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
            />
          </div>
          
          <div className="text-xs text-gray-500 space-y-1 mt-2">
            <p>Password requirements:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>At least 12 characters</li>
              <li>Include uppercase and lowercase</li>
              <li>Include at least one number</li>
              <li>Include a special character (!@#$%^&*)</li>
            </ul>
          </div>

          <button 
            type="submit" 
            disabled={loading || !sessionReady}
            className="w-full bg-blue-600 text-white py-2.5 rounded-md font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-sm"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
          
          {!sessionReady && !error && !loading && (
            <p className="text-[10px] text-gray-400 text-center mt-2 animate-pulse">
              Verifying security token...
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
