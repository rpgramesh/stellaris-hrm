"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

type EmailConfig = {
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  from_address: string | null;
  from_name: string | null;
  smtp_password?: string | null;
  use_webhook: boolean | null;
  webhook_url: string | null;
};

export default function EmailConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [config, setConfig] = useState<EmailConfig>({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    from_address: '',
    from_name: '',
    use_webhook: false,
    webhook_url: '',
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setError('Not authenticated');
          return;
        }
        const res = await fetch('/api/email/config', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(String(json?.error || 'Failed to load email configuration'));
          return;
        }
        const c = json?.config || null;
        if (!c) return;
        setConfig((prev) => ({
          ...prev,
          smtp_host: c.smtp_host || '',
          smtp_port: typeof c.smtp_port === 'number' ? c.smtp_port : 587,
          smtp_user: c.smtp_user || '',
          from_address: c.from_address || '',
          from_name: c.from_name || '',
          use_webhook: !!c.use_webhook,
          webhook_url: c.webhook_url || '',
          smtp_password: '',
        }));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const body: any = {
        smtp_host: config.smtp_host || null,
        smtp_port: Number(config.smtp_port || 0) || null,
        smtp_user: config.smtp_user || null,
        from_address: config.from_address || null,
        from_name: config.from_name || null,
        use_webhook: !!config.use_webhook,
        webhook_url: config.webhook_url || null,
      };
      if (config.smtp_password && config.smtp_password.trim()) {
        body.smtp_password = config.smtp_password;
      }

      const res = await fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(String(json?.error || 'Failed to save email configuration'));
        return;
      }
      setConfig((prev) => ({ ...prev, smtp_password: '' }));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/settings" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Settings
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Email Delivery Configuration</h1>
          <p className="text-sm text-gray-600 mt-1">Configure SMTP/webhook sender details used by system emails.</p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save
        </button>
      </div>

      {loading && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center gap-3 text-gray-700">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading email configuration…
          </div>
        </div>
      )}

      {!loading && (
        <div className="bg-white p-6 rounded-lg border space-y-6">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded p-3">{error}</div>}
          {saved && <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded p-3">Saved</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From name</label>
              <input
                value={config.from_name || ''}
                onChange={(e) => setConfig((p) => ({ ...p, from_name: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Stellaris HRM"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From address</label>
              <input
                value={config.from_address || ''}
                onChange={(e) => setConfig((p) => ({ ...p, from_address: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="no-reply@example.com"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="useWebhook"
              type="checkbox"
              checked={!!config.use_webhook}
              onChange={(e) => setConfig((p) => ({ ...p, use_webhook: e.target.checked }))}
            />
            <label htmlFor="useWebhook" className="text-sm text-gray-700">
              Use webhook instead of SMTP
            </label>
          </div>

          {config.use_webhook ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
              <input
                value={config.webhook_url || ''}
                onChange={(e) => setConfig((p) => ({ ...p, webhook_url: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="https://..."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP host</label>
                <input
                  value={config.smtp_host || ''}
                  onChange={(e) => setConfig((p) => ({ ...p, smtp_host: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="smtp.example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP port</label>
                <input
                  type="number"
                  value={config.smtp_port ?? 587}
                  onChange={(e) => setConfig((p) => ({ ...p, smtp_port: Number(e.target.value) }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="587"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP user</label>
                <input
                  value={config.smtp_user || ''}
                  onChange={(e) => setConfig((p) => ({ ...p, smtp_user: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP password</label>
                <input
                  type="password"
                  value={config.smtp_password || ''}
                  onChange={(e) => setConfig((p) => ({ ...p, smtp_password: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="(leave blank to keep existing)"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

