'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { recruitmentService } from '@/services/recruitmentService';
import { Job, Applicant, Offer } from '@/types';

export default function RecruitmentPage() {
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [jobsData, applicantsData, offersData] = await Promise.all([
        recruitmentService.getJobs(),
        recruitmentService.getApplicants(),
        recruitmentService.getOffers()
      ]);
      setJobs(jobsData);
      setApplicants(applicantsData);
      setOffers(offersData);
    } catch (error) {
      console.error('Failed to load recruitment data:', JSON.stringify(error, null, 2));
      console.error('Original error object:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recruitment & ATS</h1>
          <p className="text-gray-500">Manage job openings, applicants, and hiring pipelines.</p>
        </div>
        <Link 
          href="/talent/recruitment/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Post New Job
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['Jobs', 'Applicants', 'Offers'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`
                whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.toLowerCase()
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'jobs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
              No jobs found. Create your first job posting!
            </div>
          ) : (
            jobs.map((job) => {
              const daysAgo = Math.floor((Date.now() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24));
              const statusColor = job.status === 'Published' ? 'bg-green-100 text-green-800' : 
                                job.status === 'Paused' ? 'bg-yellow-100 text-yellow-800' :
                                job.status === 'Filled' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800';
              
              return (
                <div key={job.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                      {job.status}
                    </span>
                    <span className="text-gray-400 text-sm">{daysAgo}d ago</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{job.title}</h3>
                  <p className="text-gray-500 text-sm mb-2">{job.department}</p>
                  <p className="text-gray-400 text-xs mb-4">{job.location}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{job.applicantsCount}</span> applicants
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{job.interviewsScheduled}</span> interviews
                      </div>
                      <Link href={`/talent/recruitment/${job.id}`} className="text-blue-600 text-sm font-medium hover:text-blue-700">
                        View Details &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'applicants' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {applicants.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No applicants found.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied For</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applicants.map((applicant) => {
                  const stageColor = applicant.status === 'Offer' ? 'bg-green-100 text-green-800' : 
                                   applicant.status === 'Interview' ? 'bg-blue-100 text-blue-800' :
                                   applicant.status === 'Screening' ? 'bg-yellow-100 text-yellow-800' :
                                   applicant.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                   'bg-gray-100 text-gray-800';
                  
                  return (
                    <tr key={applicant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            {applicant.firstName.charAt(0)}{applicant.lastName.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{applicant.firstName} {applicant.lastName}</div>
                            <div className="text-sm text-gray-500">{applicant.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{applicant.jobTitle}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${stageColor}`}>
                          {applicant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-500">
                        {'★'.repeat(applicant.rating || 0)}{'☆'.repeat(5 - (applicant.rating || 0))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(applicant.appliedDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/talent/recruitment/applicants/${applicant.id}`} className="text-blue-600 hover:text-blue-900">Review</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'offers' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {offers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No offers found.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Offer Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Offer Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {offers.map((offer) => {
                  const statusColor = offer.status === 'Accepted' ? 'bg-green-100 text-green-800' : 
                                   offer.status === 'Pending Response' ? 'bg-yellow-100 text-yellow-800' :
                                   offer.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                   'bg-gray-100 text-gray-800';
                  
                  return (
                    <tr key={offer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            {offer.applicantName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{offer.applicantName}</div>
                            <div className="text-sm text-gray-500">ID: {offer.applicantId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{offer.jobTitle}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
                          {offer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {offer.salary.currency} {offer.salary.base.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(offer.createdDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/talent/recruitment/offers/${offer.id}`} className="text-blue-600 hover:text-blue-900">View Details</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
