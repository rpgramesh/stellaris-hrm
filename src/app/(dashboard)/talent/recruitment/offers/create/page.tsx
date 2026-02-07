'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { recruitmentService } from '@/services/recruitmentService';
import { supabase } from '@/lib/supabase';
import { Applicant, Job, OfferStatus } from '@/types';

function CreateOfferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicantId = searchParams.get('applicantId');
  const jobId = searchParams.get('jobId');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    baseSalary: '',
    currency: 'AUD',
    frequency: 'Annually' as const,
    startDate: '',
    probationPeriod: '6',
    noticePeriod: '4',
    benefits: '', // comma separated
    notes: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 1. Get Current User/Employee
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const { data: empData } = await supabase
            .from('employees')
            .select('id')
            .eq('email', user.email)
            .single();
          if (empData) setCurrentEmployeeId(empData.id);
        }

        // 2. Get Applicant Data
        if (applicantId) {
          const appData = await recruitmentService.getApplicantById(applicantId);
          setApplicant(appData);
        }

      } catch (err: any) {
        console.error('Error loading data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [applicantId, jobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantId || !jobId || !currentEmployeeId) {
      setError('Missing required information (Applicant, Job, or Creator)');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await recruitmentService.createOffer({
        applicantId,
        jobId,
        salary: {
          base: Number(formData.baseSalary),
          currency: formData.currency,
          frequency: formData.frequency
        },
        benefits: formData.benefits.split(',').map(b => b.trim()).filter(Boolean),
        startDate: formData.startDate,
        probationPeriod: Number(formData.probationPeriod),
        noticePeriod: Number(formData.noticePeriod),
        status: 'Draft' as OfferStatus,
        notes: formData.notes,
        createdBy: currentEmployeeId // Passing ID here
      });

      // Redirect to the offer details or back to applicant
      router.push(`/talent/recruitment/applicants/${applicantId}`);
    } catch (err: any) {
      console.error('Error creating offer:', err);
      setError(err.message || 'Failed to create offer');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Create Job Offer</h1>
        {applicant && (
          <p className="text-gray-600">
            For <span className="font-medium text-gray-900">{applicant.firstName} {applicant.lastName}</span> • {applicant.jobTitle}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
        
        {/* Salary Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Compensation</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Salary</label>
              <input
                type="number"
                required
                value={formData.baseSalary}
                onChange={e => setFormData({...formData, baseSalary: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 80000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={e => setFormData({...formData, currency: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="AUD">AUD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={formData.frequency}
                onChange={e => setFormData({...formData, frequency: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Annually">Annually</option>
                <option value="Monthly">Monthly</option>
                <option value="Weekly">Weekly</option>
                <option value="Hourly">Hourly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Terms Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Terms of Employment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Probation Period (Months)</label>
              <input
                type="number"
                value={formData.probationPeriod}
                onChange={e => setFormData({...formData, probationPeriod: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period (Weeks)</label>
              <input
                type="number"
                value={formData.noticePeriod}
                onChange={e => setFormData({...formData, noticePeriod: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Benefits & Notes */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Benefits (Comma separated)</label>
              <textarea
                value={formData.benefits}
                onChange={e => setFormData({...formData, benefits: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Health Insurance, Gym Membership, Remote Work..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Private notes for the hiring team..."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Offer'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CreateOfferPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateOfferContent />
    </Suspense>
  );
}
