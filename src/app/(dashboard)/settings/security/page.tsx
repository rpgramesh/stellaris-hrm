"use client";

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, ShieldAlert, XCircle } from 'lucide-react';

export default function SecuritySettingsPage() {
  const [factors, setFactors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchFactors();
  }, []);

  const fetchFactors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verifiedTotp = (data.totp || []).filter((f: any) => f.status === 'verified');
      setFactors(verifiedTotp);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load MFA settings.');
    } finally {
      setLoading(false);
    }
  };

  const startEnrollment = async () => {
    try {
      setEnrolling(true);
      setError(null);
      setMessage(null);

      // Clean up any unverified factors first to prevent the "already exists" error
      const { data: listData } = await supabase.auth.mfa.listFactors();
      const unverified = (listData?.totp || []).filter((f: any) => f.status === 'unverified');
      for (const f of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });
      if (error) throw error;

      setFactorId(data.id);
      setQrCodeData(data.totp.uri);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to start MFA enrollment.');
    } finally {
      setEnrolling(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!factorId || !verifyCode) return;
    try {
      setEnrolling(true);
      setError(null);

      const verify = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: verifyCode,
      });

      if (verify.error) throw verify.error;

      setMessage('MFA successfully enabled!');
      setQrCodeData(null);
      setFactorId(null);
      setVerifyCode('');
      fetchFactors();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const unenroll = async (id: string) => {
    if (!window.confirm('Are you sure you want to disable MFA?')) return;
    try {
      setLoading(true);
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (error) throw error;
      setMessage('MFA successfully disabled.');
      fetchFactors();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to disable MFA.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Security Settings</h1>
        <p className="text-slate-500 mt-2">Manage your account security and authentication methods.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-500" />
              Multi-Factor Authentication (MFA)
            </h2>
            <p className="text-sm text-slate-500 mt-2 max-w-xl">
              Add an extra layer of security to your account by turning on Two-Factor Authentication using an authenticator app (like Google Authenticator or Authy).
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {message && (
          <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm">{message}</span>
          </div>
        )}

        <div className="mt-6 border-t pt-6">
          {loading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            </div>
          ) : factors.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg inline-flex">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">MFA is currently Enabled</span>
              </div>
              <div className="border rounded-lg divide-y">
                {factors.map((factor) => (
                  <div key={factor.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">Authenticator App</p>
                      <p className="text-xs text-slate-500">Added on {new Date(factor.created_at).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => unenroll(factor.id)}
                      className="text-red-500 text-sm font-medium hover:text-red-700 transition"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {!qrCodeData ? (
                <button
                  onClick={startEnrollment}
                  disabled={enrolling}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
                >
                  {enrolling ? 'Preparing...' : 'Set up Authenticator App'}
                </button>
              ) : (
                <div className="space-y-6 max-w-md">
                  <div className="bg-slate-50 p-6 rounded-lg border flex flex-col items-center text-center">
                    <p className="font-semibold text-slate-800 mb-4">1. Scan this QR code</p>
                    <div className="bg-white p-4 rounded-xl shadow-sm inline-block">
                      <QRCodeSVG value={qrCodeData} size={200} />
                    </div>
                    <p className="text-sm text-slate-500 mt-4">
                      Open your authenticator app and scan the image above.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="block font-semibold text-slate-800">2. Enter verification code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        className="flex-1 border p-2 rounded-lg font-mono text-center text-lg tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      <button
                        onClick={verifyAndEnable}
                        disabled={enrolling || verifyCode.length !== 6}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 font-medium rounded-lg transition disabled:opacity-50"
                      >
                        {enrolling ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setQrCodeData(null);
                      setFactorId(null);
                    }}
                    className="text-slate-500 text-sm hover:text-slate-700"
                  >
                    Cancel Setup
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
