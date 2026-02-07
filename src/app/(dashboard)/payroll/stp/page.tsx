"use client";

import { useState, useEffect } from "react";
import { stpService } from "@/services/stpService";
import { payrollService } from "@/services/payrollService"; // To fetch real payslips
import { STPPayEvent } from "@/types/payroll";
import { submitToATO } from "@/lib/payroll/stpService"; // Mock ATO submission logic

export default function STPPage() {
  const [atoOrgId, setAtoOrgId] = useState("");
  const [softwareId, setSoftwareId] = useState("");
  const [lastSubmission, setLastSubmission] = useState<string | null>(null);
  const [events, setEvents] = useState<STPPayEvent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await stpService.getEvents();
      setEvents(data);
    } catch (error) {
      console.error('Failed to load STP events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayEvent = async () => {
    setIsGenerating(true);
    try {
      // Fetch real payslips from the latest pay run or all pending payslips
      // For now, we'll fetch all payslips to simulate a run
      const payslips = await payrollService.getAllPayslips();
      
      // Filter for current period or just take last 5 for demo if no run logic exists yet
      const currentPayslips = payslips.slice(0, 5); 

      if (currentPayslips.length === 0) {
        alert("No payslips found to generate event.");
        setIsGenerating(false);
        return;
      }

      const newEvent = await stpService.generateEvent("RUN-" + Date.now(), currentPayslips);
      
      // Save to DB
      await stpService.createEvent(newEvent);
      
      setEvents([newEvent, ...events]);
    } catch (error) {
      alert("Error generating pay event");
      console.error(error);
    }
    setIsGenerating(false);
  };

  const handleSubmitToATO = async (event: STPPayEvent) => {
    setIsSubmitting(true);
    try {
      // 1. Submit to ATO (Mock)
      const result = await submitToATO(event);

      if (result.success) {
        // 2. Update status in DB
        await stpService.updateEventStatus(event.id, "Submitted", result.message);
        
        // Optimistic update
        setEvents(events.map(e => (e.id === event.id ? { ...e, status: "Submitted" as const, responseMessage: result.message } : e)));
        setLastSubmission(new Date().toISOString());
        alert(result.message);
      } else {
        await stpService.updateEventStatus(event.id, "Rejected", result.message);
        setEvents(events.map(e => (e.id === event.id ? { ...e, status: "Rejected" as const, responseMessage: result.message } : e)));
        alert("Submission Failed: " + result.message);
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
                        {new Date(event.submissionDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {event.transactionId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Pay Event ({event.employeeCount} employees)
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
                        Gross: ${event.totalGross.toLocaleString()} | Tax: ${event.totalTax.toLocaleString()}
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
