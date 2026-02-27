"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { auditService } from '@/services/auditService';

function ChangePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);

  useEffect(() => {
    const emailParam = searchParams?.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const validatePassword = (value: string): string | null => {
    if (value.length < 12) return 'Password must be at least 12 characters.';
    if (!/[A-Z]/.test(value)) return 'Password must include at least one uppercase letter.';
    if (!/[a-z]/.test(value)) return 'Password must include at least one lowercase letter.';
    if (!/[0-9]/.test(value)) return 'Password must include at least one number.';
    if (!/[!@#$%^&*()[\]\-_=+{};:\'",.<>/?\\|`~]/.test(value)) {
      return 'Password must include at least one special character.';
    }
    return null;
  };

  const hashPasswordForComparison = async (value: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(digest);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Starting password change process...');
    setLoading(true);
    setError(null);

    if (blockedUntil && Date.now() < blockedUntil) {
      setLoading(false);
      setError('Too many attempts. Please wait a few minutes before trying again.');
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const policyError = validatePassword(password);
    if (policyError) {
      setError(policyError);
      setLoading(false);
      setAttempts((prev) => prev + 1);
      if (attempts + 1 >= 5) {
        setBlockedUntil(Date.now() + 5 * 60 * 1000);
      }
      return;
    }

    try {
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser();

      let user = sessionUser;

      if (!user || user.email !== email) {
        if (!email || !currentPassword) {
          setError('Email and current password are required.');
          setLoading(false);
          return;
        }

        console.log('Attempting sign in for password change...');
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password: currentPassword,
          });

        if (signInError) {
          console.error('Sign in error during password change:', signInError);
          const msg = signInError?.message || 'Current password is incorrect.';
          setError(msg === '{}' ? 'Authentication failed. Please check your credentials.' : msg);
          setLoading(false);
          return;
        }
        
        user = signInData.user;
        // Ensure session is active
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Check if they are trying to set the same password as the temporary one
      const metadata = user?.user_metadata || {};
      const existingHash = metadata.initial_password_hash;

      if (existingHash && typeof existingHash === 'string') {
        const newHash = await hashPasswordForComparison(password);
        if (newHash === existingHash) {
          setError('New password cannot be the same as your initial temporary password.');
          setLoading(false);
          return;
        }
      }

      // 1. Update Password
      console.log('Attempting password update for user:', user?.id);
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) {
        if (authError.message?.includes('Aborted')) {
          // Retry once if aborted
          const { error: retryError } = await supabase.auth.updateUser({ password });
          if (retryError) throw retryError;
        } else {
          throw authError;
        }
      }

      // Password changed successfully!
      // Any failures after this point (DB updates, logging) should not block the redirect.
      try {
        if (user) {
          const { error: dbError } = await supabase
            .from('employees')
            .update({ is_password_change_required: false })
            .eq('user_id', user.id);
            
          if (dbError) {
            console.error('Error updating employee record:', dbError);
          }

          await auditService.logAction(
            'auth',
            user.id,
            'SYSTEM_ACTION',
            null,
            {
              event: 'PASSWORD_CHANGED',
              occurred_at: new Date().toISOString(),
            }
          ).catch(e => console.error('Failed to log password change audit:', e));
        }
      } catch (postError) {
        console.error('Non-critical post-password-change error:', postError);
      }

      // Redirect to dashboard
      console.log('Password changed successfully, redirecting...');
      router.push('/self-service');
      router.refresh(); 
    } catch (err: any) {
      console.error('Password change error details:', err);
      
      let errorMessage = 'Failed to change password';
      
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.name === 'AbortError' || err?.message?.includes('Aborted')) {
        errorMessage = 'The operation was interrupted. Please try clicking "Update Password" again.';
      } else if (err?.message && err.message !== '{}') {
        errorMessage = err.message;
      } else if (err?.error_description && err.error_description !== '{}') {
        errorMessage = err.error_description;
      } else if (err?.error && typeof err.error === 'string') {
        errorMessage = err.error;
      } else {
        // If it's still {} or something unhelpful, try to see if it's a Supabase error with a nested message
        const possibleMessage = err?.data?.message || err?.error?.message;
        if (possibleMessage && possibleMessage !== '{}') {
          errorMessage = possibleMessage;
        } else {
          try {
            const stringified = JSON.stringify(err);
            if (stringified !== '{}' && stringified !== 'undefined') {
              errorMessage = stringified;
            } else {
              // Last resort: check properties directly if it's an Error object
              errorMessage = err.name ? `${err.name}: ${err.message || 'Unknown error'}` : 'An unexpected error occurred.';
            }
          } catch (e) {
            errorMessage = 'An unexpected error occurred. Please check console for details.';
          }
        }
      }
      
      setError(errorMessage);
      setAttempts((prev) => prev + 1);
      if (attempts + 1 >= 5) {
        setBlockedUntil(Date.now() + 5 * 60 * 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900">Change Password</h1>
        <p className="text-sm text-gray-600 mb-4 text-center">
          Enter your email, current password, and a new password.
        </p>
        
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email (username)</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-900" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input 
              type="password" 
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-900" 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading || (blockedUntil !== null && Date.now() < blockedUntil)}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100">Loading...</div>}>
      <ChangePasswordContent />
    </Suspense>
  );
}
