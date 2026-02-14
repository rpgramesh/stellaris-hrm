
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { learningService } from '@/services/learningService';
import { CourseEnrollment } from '@/types';
import { Loader2, Printer, Award } from 'lucide-react';
import Image from 'next/image';

export default function CertificatePage() {
  const params = useParams();
  const id = params?.id as string;
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadCertificate();
    }
  }, [id]);

  const loadCertificate = async () => {
    try {
      const data = await learningService.getEnrollmentById(id);
      setEnrollment(data);
    } catch (error) {
      console.error('Error loading certificate:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500">Certificate not found.</p>
      </div>
    );
  }

  // If status is not completed, don't show certificate
  if (enrollment.status !== 'Completed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500">Course not yet completed.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      {/* Controls */}
      <div className="w-full max-w-4xl flex justify-end mb-6 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Printer size={18} />
          Print Certificate
        </button>
      </div>

      {/* Certificate Container */}
      <div className="bg-white w-full max-w-4xl aspect-[1.414/1] shadow-2xl relative p-8 text-center print:shadow-none print:p-0">
        {/* Outer Decorative Border */}
        <div className="absolute inset-4 border-4 border-double border-gray-300 pointer-events-none print:inset-0" />
        
        {/* Inner Content Container with Border */}
        <div className="relative h-full flex flex-col justify-between py-12 px-12 border-[12px] border-blue-900 bg-white m-4 print:m-0 print:border-8">
            {/* Background Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
              <Award size={400} />
            </div>

            {/* Header */}
            <div className="relative z-10">
                <div className="flex justify-center mb-8">
                   <div className="relative w-48 h-16">
                     <Image 
                       src="/logo.png" 
                       alt="Stellaris HRM" 
                       fill 
                       className="object-contain"
                       priority
                     />
                   </div>
                </div>
                
                <h1 className="text-6xl font-serif text-gray-900 mb-2 uppercase tracking-widest font-bold">Certificate</h1>
                <h2 className="text-2xl font-light text-blue-800 uppercase tracking-[0.3em]">of Completion</h2>
            </div>

            {/* Body */}
            <div className="relative z-10 space-y-8 flex-grow flex flex-col justify-center">
                <p className="text-xl text-gray-500 font-serif italic">This is to certify that</p>
                
                <div className="text-5xl font-bold text-gray-900 font-serif border-b-2 border-gray-200 pb-4 mx-auto w-3/4">
                    {enrollment.employeeName || 'Employee Name'}
                </div>
                
                <p className="text-xl text-gray-500 font-serif italic">has successfully completed the course</p>
                
                <div className="text-3xl font-bold text-blue-900 mx-auto max-w-3xl">
                    {enrollment.courseTitle}
                </div>

                <div className="flex justify-center items-center gap-2 text-gray-500 mt-2">
                    <span className="italic font-serif">on</span>
                    <span className="font-semibold text-gray-800 text-lg">
                        {enrollment.completedDate ? new Date(enrollment.completedDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }) : new Date().toLocaleDateString()}
                    </span>
                </div>
            </div>

            {/* Footer / Signatures */}
            <div className="relative z-10 flex justify-between items-end mt-12 px-8">
                <div className="text-center">
                    <div className="w-56 border-t border-gray-400 mb-3"></div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Director</p>
                </div>
                
                <div className="mb-2">
                     <div className="w-24 h-24 rounded-full border-4 border-blue-900 flex items-center justify-center opacity-80">
                        <Award size={48} className="text-blue-900" />
                     </div>
                </div>

                <div className="text-center">
                    <div className="w-56 border-t border-gray-400 mb-3"></div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Instructor</p>
                </div>
            </div>
            
            {/* Certificate ID */}
            <div className="absolute bottom-2 left-0 right-0 text-center">
                <p className="text-[10px] text-gray-300 uppercase tracking-widest">ID: {enrollment.id}</p>
            </div>
        </div>
      </div>
    </div>
  );
}
