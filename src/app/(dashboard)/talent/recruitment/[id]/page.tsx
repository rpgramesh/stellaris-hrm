'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { recruitmentService } from '@/services/recruitmentService';
import { Job, Applicant } from '@/types';

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [jobData, applicantsData] = await Promise.all([
        recruitmentService.getJobById(id),
        recruitmentService.getApplicantsByJobId(id)
      ]);
      setJob(jobData);
      setApplicants(applicantsData);
    } catch (error) {
      console.error('Failed to load job details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) return;
    
    try {
      await recruitmentService.deleteJob(id);
      router.push('/talent/recruitment');
    } catch (error) {
      console.error('Failed to delete job:', error);
      alert('Failed to delete job.');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading job details...</div>;
  if (!job) return <div className="p-8 text-center">Job not found.</div>;

  const now = new Date();
  let effectiveStatus = job.status;
  if (job.closingDate) {
    const closing = new Date(job.closingDate);
    if (closing < now && (job.status === 'Published' || job.status === 'Paused')) {
      effectiveStatus = 'Closed';
    }
  }

  let displayStatus: string = effectiveStatus;
  if (effectiveStatus !== 'Closed' && applicants.length > 0) {
    const statuses = applicants.map(a => a.status);
    const hasHired = statuses.includes('Hired');
    const hasOffer = statuses.includes('Offer');
    const hasInterviewStage =
      statuses.includes('Interview') ||
      applicants.some(a => Array.isArray(a.interviews) && a.interviews.length > 0);
    const hasScreening = statuses.includes('Screening');

    if (hasHired) {
      displayStatus = 'Filled';
    } else if (hasOffer) {
      displayStatus = 'Offer';
    } else if (hasInterviewStage) {
      displayStatus = 'Interview';
    } else if (hasScreening) {
      displayStatus = 'Screening';
    }
  }

  const statusColor =
    displayStatus === 'Published'
      ? 'bg-green-100 text-green-800'
      : displayStatus === 'Draft'
      ? 'bg-gray-100 text-gray-800'
      : displayStatus === 'Paused'
      ? 'bg-yellow-100 text-yellow-800'
      : displayStatus === 'Filled'
      ? 'bg-blue-100 text-blue-800'
      : displayStatus === 'Closed'
      ? 'bg-red-100 text-red-800'
      : displayStatus === 'Offer'
      ? 'bg-purple-100 text-purple-800'
      : displayStatus === 'Interview'
      ? 'bg-blue-100 text-blue-800'
      : displayStatus === 'Screening'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-gray-100 text-gray-800';

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <Link href="/talent/recruitment" className="text-gray-500 hover:text-gray-700 mb-2 inline-block">
            &larr; Back to Recruitment
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
              {displayStatus}
            </span>
          </div>
          <p className="text-gray-500 mt-1">{job.department} • {job.location} ({job.locationType})</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleDelete}
            className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete Job
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Edit Job
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Description</h2>
            <p className="text-gray-600 whitespace-pre-wrap">{job.description}</p>
            
            <h2 className="text-lg font-semibold mt-6 mb-4">Requirements</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              {job.requirements.map((req, i) => (
                <li key={i}>{req}</li>
              ))}
            </ul>

            <h2 className="text-lg font-semibold mt-6 mb-4">Responsibilities</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              {job.responsibilities.map((res, i) => (
                <li key={i}>{res}</li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Applicants ({applicants.length})</h2>
            {applicants.length === 0 ? (
              <p className="text-gray-500">No applicants yet.</p>
            ) : (
              <div className="space-y-4">
                {applicants.map(app => (
                  <div key={app.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {app.firstName.charAt(0)}{app.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{app.firstName} {app.lastName}</p>
                        <p className="text-sm text-gray-500">{app.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">{app.status}</span>
                      <p className="text-xs text-gray-400 mt-1">{new Date(app.appliedDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Job Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Salary Range</p>
                <p className="font-medium">
                  {job.salaryRange?.currency} {job.salaryRange?.min?.toLocaleString()} - {job.salaryRange?.max?.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Job Type</p>
                <p className="font-medium">{job.jobType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Experience Level</p>
                <p className="font-medium">{job.experienceLevel}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Priority</p>
                <p className="font-medium">{job.priority}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Posted Date</p>
                <p className="font-medium">{new Date(job.postedDate).toLocaleDateString()}</p>
              </div>
              {job.closingDate && (
                <div>
                  <p className="text-sm text-gray-500">Closing Date</p>
                  <p className="font-medium">{new Date(job.closingDate).toLocaleDateString()}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Hiring Manager</p>
                <p className="font-medium">{job.hiringManagerName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
