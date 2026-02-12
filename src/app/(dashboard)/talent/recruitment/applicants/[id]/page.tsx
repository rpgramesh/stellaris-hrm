'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { recruitmentService } from '@/services/recruitmentService';
import { Applicant } from '@/types';

export default function ApplicantDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await recruitmentService.getApplicantById(id);
      setApplicant(data);
    } catch (error) {
      console.error('Failed to load applicant details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading applicant details...</div>;
  if (!applicant) return <div className="p-8 text-center">Applicant not found.</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <Link href="/talent/recruitment" className="text-gray-500 hover:text-gray-700 mb-2 inline-block">
            &larr; Back to Recruitment
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-gray-900">{applicant.firstName} {applicant.lastName}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium 
              ${applicant.status === 'Hired' ? 'bg-green-100 text-green-800' : 
                applicant.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                'bg-blue-100 text-blue-800'}`}>
              {applicant.status}
            </span>
          </div>
          <p className="text-gray-500 mt-1">{applicant.jobTitle} • {applicant.email} • {applicant.phone}</p>
        </div>
        <div className="flex gap-3">
             <Link 
                href={`/talent/recruitment/offers/create?applicantId=${applicant.id}&jobId=${applicant.jobId}`}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Create Offer
             </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
            {/* Experience & Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold mb-4">Application Details</h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Current Company</p>
                            <p className="font-medium">{applicant.currentCompany || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Current Position</p>
                            <p className="font-medium">{applicant.currentPosition || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Experience</p>
                            <p className="font-medium">{applicant.experience || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Expected Salary</p>
                            <p className="font-medium">{applicant.expectedSalary ? `$${applicant.expectedSalary.toLocaleString()}` : 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Notice Period</p>
                            <p className="font-medium">{applicant.noticePeriod || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Applied Date</p>
                            <p className="font-medium">{new Date(applicant.appliedDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Notes */}
            {applicant.notes && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold mb-4">Notes</h2>
                    <p className="text-gray-600 whitespace-pre-wrap">{applicant.notes}</p>
                </div>
            )}
            
            {/* Offers Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Offers</h2>
                </div>
                
                {applicant.offers && applicant.offers.length > 0 ? (
                    <div className="space-y-4">
                        {applicant.offers.map(offer => (
                            <div key={offer.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                <div>
                                    <p className="font-medium text-gray-900">{offer.jobTitle}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-2 py-0.5 text-xs rounded-full 
                                            ${offer.status === 'Accepted' ? 'bg-green-100 text-green-800' : 
                                              offer.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                                              'bg-yellow-100 text-yellow-800'}`}>
                                            {offer.status}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            {offer.salary.currency} {offer.salary.base.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <Link href={`/talent/recruitment/offers/${offer.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                                    View Details &rarr;
                                </Link>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-gray-500">No offers created yet.</p>
                        <Link 
                            href={`/talent/recruitment/offers/create?applicantId=${applicant.id}&jobId=${applicant.jobId}`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 inline-block"
                        >
                            Create First Offer
                        </Link>
                    </div>
                )}
            </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Documents & Links</h2>
             <div className="space-y-3">
                {applicant.resumeUrl ? (
                    <a href={applicant.resumeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        Resume
                    </a>
                ) : <span className="text-gray-400 text-sm">No resume provided</span>}
                
                {applicant.linkedinUrl ? (
                    <a href={applicant.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.337 7.433c-.814 0-1.473-.66-1.473-1.473 0-.814.659-1.473 1.473-1.473.814 0 1.473.659 1.473 1.473 0 .814-.659 1.473-1.473 1.473zm1.293 8.905H4.044v-8.59h2.586v8.59zM2.5 0h15a2.5 2.5 0 012.5 2.5v15a2.5 2.5 0 01-2.5 2.5h-15A2.5 2.5 0 010 17.5v-15A2.5 2.5 0 012.5 0z" />
                        </svg>
                        LinkedIn Profile
                    </a>
                ) : <span className="text-gray-400 text-sm">No LinkedIn profile</span>}
                
                {applicant.portfolioUrl ? (
                    <a href={applicant.portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                        </svg>
                        Portfolio
                    </a>
                ) : <span className="text-gray-400 text-sm">No portfolio</span>}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}