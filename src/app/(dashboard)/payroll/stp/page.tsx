"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface STPEvent {
  id: string;
  submission_date: string;
  submission_id: string;
  submission_type: string;
  status: 'Draft' | 'Submitted' | 'Accepted' | 'Rejected' | 'Corrected';
  employee_count: number;
  total_gross: number;
  total_tax: number;
  total_super: number;
  response_message?: string;
}

export default function STPPage() {
  const [atoOrgId, setAtoOrgId] = useState("");
  const [softwareId, setSoftwareId] = useState("SSID-882910");
  const [lastSubmission, setLastSubmission] = useState<string | null>(null);
  const [events, setEvents] = useState<STPEvent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('stp_submissions')
        .select('*')
        .order('submission_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);

      const lastSuccess = data?.find(e => e.status === 'Accepted' || e.status === 'Submitted');
      if (lastSuccess) {
        setLastSubmission(lastSuccess.submission_date);
      }
    } catch (error) {
      console.error('Failed to load STP events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayEvent = async () => {
    setIsGenerating(true);
    try {
      // Find latest approved payroll run that hasn't been submitted
      const { data: payRuns, error: runError } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('status', 'Paid')
        .is('stp_submission_id', null)
        .order('payment_date', { ascending: false })
        .limit(1);

      if (runError) throw runError;

      if (!payRuns || payRuns.length === 0) {
        alert("No pending pay runs found to generate event.");
        setIsGenerating(false);
        return;
      }

      const payRun = payRuns[0];

      // Create STP submission record
      const { data: newSubmission, error: submitError } = await supabase
        .from('stp_submissions')
        .insert({
          payroll_run_id: payRun.id,
          submission_type: 'PayEvent',
          submission_id: `STP-${Date.now()}`,
          status: 'Draft',
          submission_date: new Date().toISOString(),
          employee_count: payRun.employee_count,
          total_gross: payRun.total_gross_pay,
          total_tax: payRun.total_tax,
          total_super: payRun.total_super
        })
        .select()
        .single();

      if (submitError) throw submitError;
      
      setEvents([newSubmission, ...events]);
    } catch (error: any) {
      alert("Error generating pay event");
      console.error('STP Generation Error:', error.message || error.details || error);
    }
    setIsGenerating(false);
  };

  const handleSubmitToATO = async (event: STPEvent) => {
    setIsSubmitting(true);
    try {
      // Mock ATO submission delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const success = Math.random() > 0.1; // 90% success rate mock
      const status = success ? 'Submitted' : 'Rejected';
      const message = success ? 'Received by ATO' : 'Connection timeout';

      const { error } = await supabase
        .from('stp_submissions')
        .update({
          status: status,
          response_message: message,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);

      if (error) throw error;

      // Update payroll run status
      if (success) {
         await supabase
          .from('payroll_runs')
          .update({ stp_status: 'Submitted' })
          .eq('stp_submission_id', event.submission_id); // Assuming we link back, but schema has stp_submission_id on payroll_runs
      }
        
      // Optimistic update
      setEvents(events.map(e => (e.id === event.id ? { ...e, status: status as any, response_message: message } : e)));
      if (success) {
        setLastSubmission(new Date().toISOString());
        alert(message);
      } else {
        alert("Submission Failed: " + message);
      }
    } catch (error) {
      alert("Error submitting to ATO");
      console.error(error);
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Single Touch Payroll (STP) Phase 2</h1>
          <p className="text-gray-600">Real-time reporting of tax, pay, and superannuation to the ATO.</p>
        </div>
        <button
          onClick={handleGeneratePayEvent}
          disabled={isGenerating}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Generate Pay Event"}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">ATO Configuration</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">AUSkey/Org ID</label>
            <input
              value={atoOrgId}
              onChange={e => setAtoOrgId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Enter Organisation ID"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Software ID (SSID)</label>
            <input
              value={softwareId}
              onChange={e => setSoftwareId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Displaying Software ID..."
              disabled
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Submission History</h2>
          {lastSubmission && (
            <span className="text-sm text-gray-500">Last successful submission: {new Date(lastSubmission).toLocaleString()}</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.length === 0 ? (
                <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No STP events found.</td>
                </tr>
              ) : (
                  events.map((event) => (
                    <tr key={event.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(event.submission_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {event.submission_id?.substring(0, 15)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.submission_type} ({event.employee_count} employees)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${event.status === 'Submitted' ? 'bg-green-100 text-green-800' : 
                            event.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                            event.status === 'Accepted' ? 'bg-blue-100 text-blue-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Gross: ${(event.total_gross || 0).toLocaleString()} | Tax: ${(event.total_tax || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.status === 'Draft' && (
                          <button
                            onClick={() => handleSubmitToATO(event)}
                            disabled={isSubmitting}
                            className="text-blue-600 hover:text-blue-900 font-medium disabled:opacity-50"
                          >
                            Submit
                          </button>
                        )}
                        {event.status !== 'Draft' && (
                          <span className="text-gray-400">Archived</span>
                        )}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
