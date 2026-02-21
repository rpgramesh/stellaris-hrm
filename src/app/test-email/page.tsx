"use client";

import { useState } from "react";

export default function TestEmailPage() {
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      const response = await fetch("/api/email/welcome", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          subject: "Test Stellaris HRM email",
          text: "This is a test email sent from the Stellaris HRM test page.",
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        setStatus(`Error: ${text}`);
      } else {
        setStatus("Email sent successfully.");
      }
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unexpected error sending email"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900">
          Test Email Sender
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Recipient Email
            </label>
            <input
              type="email"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-900"
              placeholder="user@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Test Email"}
          </button>
        </form>
        {status && (
          <div className="mt-4 text-sm text-center text-gray-700 break-words">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

