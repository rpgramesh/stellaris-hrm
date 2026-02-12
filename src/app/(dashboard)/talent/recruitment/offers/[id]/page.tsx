'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { recruitmentService } from '@/services/recruitmentService';
import { Offer, OfferStatus } from '@/types';

export default function OfferDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      loadOffer();
    }
  }, [id]);

  const loadOffer = async () => {
    try {
      setLoading(true);
      const data = await recruitmentService.getOfferById(id);
      setOffer(data);
    } catch (err) {
      console.error('Failed to load offer:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: OfferStatus) => {
    if (!offer) return;
    if (!confirm(`Are you sure you want to change the status to ${newStatus}?`)) return;

    try {
      setUpdating(true);
      const updates: Partial<Offer> = { status: newStatus };
      
      // If sending, set sentDate
      if (newStatus === 'Sent' && !offer.sentDate) {
        updates.sentDate = new Date().toISOString();
      }
      
      // If responding, set responseDate
      if ((newStatus === 'Accepted' || newStatus === 'Rejected') && !offer.responseDate) {
        updates.responseDate = new Date().toISOString();
      }

      await recruitmentService.updateOffer(offer.id, updates);
      await loadOffer();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!offer) return <div className="p-8">Offer not found</div>;

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/talent/recruitment" className="text-gray-500 hover:text-gray-900">Recruitment</Link>
            <span className="text-gray-300">/</span>
            <Link href={`/talent/recruitment/applicants/${offer.applicantId}`} className="text-gray-500 hover:text-gray-900">
              {offer.applicantName}
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-medium">Offer Details</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Offer for {offer.applicantName}
          </h1>
          <p className="text-gray-600">{offer.jobTitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
            offer.status === 'Accepted' ? 'bg-green-50 text-green-700 border-green-200' :
            offer.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
            offer.status === 'Sent' ? 'bg-blue-50 text-blue-700 border-blue-200' :
            'bg-gray-50 text-gray-700 border-gray-200'
          }`}>
            {offer.status}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Compensation Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Compensation</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Base Salary</p>
                <p className="text-xl font-medium text-gray-900">
                  {formatCurrency(offer.salary.base, offer.salary.currency)}
                </p>
                <p className="text-sm text-gray-500">{offer.salary.frequency}</p>
              </div>
            </div>
          </div>

          {/* Terms Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Terms of Employment</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Start Date</p>
                <p className="font-medium text-gray-900">{new Date(offer.startDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Probation Period</p>
                <p className="font-medium text-gray-900">{offer.probationPeriod} months</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Notice Period</p>
                <p className="font-medium text-gray-900">{offer.noticePeriod} weeks</p>
              </div>
            </div>
          </div>

          {/* Benefits Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Benefits</h2>
            {offer.benefits && offer.benefits.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {offer.benefits.map((benefit, index) => (
                  <li key={index}>{benefit}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No specific benefits listed.</p>
            )}
          </div>

          {/* Notes Card */}
          {offer.notes && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Internal Notes</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{offer.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column - Actions & Meta */}
        <div className="space-y-6">
          {/* Actions Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              {offer.status === 'Draft' && (
                <button
                  onClick={() => handleStatusUpdate('Sent')}
                  disabled={updating}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Send Offer
                </button>
              )}
              
              {(offer.status === 'Sent' || offer.status === 'Pending Response') && (
                <>
                  <button
                    onClick={() => handleStatusUpdate('Accepted')}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Mark as Accepted
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('Rejected')}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Mark as Rejected
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('Withdrawn')}
                    disabled={updating}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Withdraw Offer
                  </button>
                </>
              )}

              {offer.status === 'Accepted' && (
                <div className="text-center p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
                  <p className="font-medium">Offer Accepted</p>
                  <p className="text-sm mt-1">Onboarding process can start.</p>
                </div>
              )}
            </div>
          </div>

          {/* Meta Info Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">History</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500">Created By</p>
                <p className="font-medium text-gray-900">{offer.createdBy}</p>
                <p className="text-gray-400 text-xs">{new Date(offer.createdDate).toLocaleDateString()}</p>
              </div>
              {offer.sentDate && (
                <div>
                  <p className="text-gray-500">Sent Date</p>
                  <p className="font-medium text-gray-900">{new Date(offer.sentDate).toLocaleDateString()}</p>
                </div>
              )}
              {offer.responseDate && (
                <div>
                  <p className="text-gray-500">Response Date</p>
                  <p className="font-medium text-gray-900">{new Date(offer.responseDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
