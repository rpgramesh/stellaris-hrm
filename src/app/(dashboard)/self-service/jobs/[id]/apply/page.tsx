'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { recruitmentService } from '@/services/recruitmentService';
import { Job, Applicant } from '@/types';
import Link from 'next/link';

export default function ApplyJobPage() {
  const { id } = useParams();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    portfolioUrl: '',
    resumeUrl: '',
    coverLetterUrl: '',
    experience: '',
    currentCompany: '',
    currentPosition: '',
    expectedSalary: '',
    noticePeriod: '',
    notes: ''
  });

  useEffect(() => {
    if (id) {
      fetchJob(id as string);
    }
  }, [id]);

  const fetchJob = async (jobId: string) => {
    try {
      setLoading(true);
      const data = await recruitmentService.getJobById(jobId);
      if (data) {
        setJob(data);
      } else {
        setError('Job not found');
      }
    } catch (err) {
      console.error('Failed to fetch job details', err);
      setError('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;

    try {
      setSubmitting(true);
      setError(null);

      const applicantData: Partial<Applicant> = {
        jobId: job.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        linkedinUrl: formData.linkedinUrl,
        portfolioUrl: formData.portfolioUrl,
        resumeUrl: formData.resumeUrl,
        coverLetterUrl: formData.coverLetterUrl,
        experience: formData.experience,
        currentCompany: formData.currentCompany,
        currentPosition: formData.currentPosition,
        expectedSalary: formData.expectedSalary ? Number(formData.expectedSalary) : undefined,
        noticePeriod: formData.noticePeriod,
        notes: formData.notes,
        status: 'New',
        source: 'Company Website', // Or 'Internal' if we had that option
        appliedDate: new Date().toISOString().split('T')[0],
        tags: ['Internal Application'],
        rating: 0
      };

      await recruitmentService.createApplicant(applicantData);
      
      // Navigate back to jobs list with success (in a real app we might show a success page)
      router.push('/self-service/jobs?success=true');
    } catch (err) {
      console.error('Failed to submit application', err);
      setError('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        {error || 'Job not found'}
        <div className="mt-4">
          <Link href="/self-service/jobs" className="text-blue-600 hover:underline">
            Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="mb-6">
        <Link href={`/self-service/jobs/${id}`} className="text-gray-500 hover:text-gray-700 mb-4 inline-block">
          &larr; Back to Job Details
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Apply for {job.title}</h1>
        <p className="text-gray-600">{job.department} &bull; {job.location}</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Professional Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label htmlFor="currentCompany" className="block text-sm font-medium text-gray-700 mb-1">Current Company</label>
                <input
                  type="text"
                  id="currentCompany"
                  name="currentCompany"
                  value={formData.currentCompany}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="currentPosition" className="block text-sm font-medium text-gray-700 mb-1">Current Position</label>
                <input
                  type="text"
                  id="currentPosition"
                  name="currentPosition"
                  value={formData.currentPosition}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">Experience (Years) *</label>
                <input
                  type="text"
                  id="experience"
                  name="experience"
                  required
                  placeholder="e.g. 5 years"
                  value={formData.experience}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="expectedSalary" className="block text-sm font-medium text-gray-700 mb-1">Expected Salary</label>
                <input
                  type="number"
                  id="expectedSalary"
                  name="expectedSalary"
                  value={formData.expectedSalary}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

             <div>
              <label htmlFor="noticePeriod" className="block text-sm font-medium text-gray-700 mb-1">Notice Period</label>
              <input
                type="text"
                id="noticePeriod"
                name="noticePeriod"
                placeholder="e.g. 2 weeks"
                value={formData.noticePeriod}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Links & Documents</h3>
            <p className="text-sm text-gray-500 mb-4">Please provide links to your documents stored in cloud storage (Google Drive, Dropbox, etc.)</p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="resumeUrl" className="block text-sm font-medium text-gray-700 mb-1">Resume URL *</label>
                <input
                  type="url"
                  id="resumeUrl"
                  name="resumeUrl"
                  required
                  placeholder="https://"
                  value={formData.resumeUrl}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="coverLetterUrl" className="block text-sm font-medium text-gray-700 mb-1">Cover Letter URL</label>
                <input
                  type="url"
                  id="coverLetterUrl"
                  name="coverLetterUrl"
                  placeholder="https://"
                  value={formData.coverLetterUrl}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="linkedinUrl" className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    id="linkedinUrl"
                    name="linkedinUrl"
                    placeholder="https://linkedin.com/in/..."
                    value={formData.linkedinUrl}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="portfolioUrl" className="block text-sm font-medium text-gray-700 mb-1">Portfolio URL</label>
                  <input
                    type="url"
                    id="portfolioUrl"
                    name="portfolioUrl"
                    placeholder="https://"
                    value={formData.portfolioUrl}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
             <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Link 
              href={`/self-service/jobs/${id}`}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 mr-4"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
