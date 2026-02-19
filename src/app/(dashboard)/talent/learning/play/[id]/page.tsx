
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { learningService } from '@/services/learningService';
import { onboardingService } from '@/services/onboardingService';
import { CourseEnrollment } from '@/types';
import { Loader2, ArrowLeft, CheckCircle, PlayCircle, FileText, Video } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Mock content for the course player since we don't have a modules table yet
const MOCK_MODULES = [
  { id: 'm1', title: 'Introduction', type: 'video', duration: '5 min', completed: true },
  { id: 'm2', title: 'Core Concepts', type: 'video', duration: '15 min', completed: false },
  { id: 'm3', title: 'Practical Application', type: 'reading', duration: '10 min', completed: false },
  { id: 'm4', title: 'Assessment', type: 'quiz', duration: '20 min', completed: false },
];

export default function CoursePlayerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState(MOCK_MODULES[0]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (id) {
      loadEnrollment();
    }
  }, [id]);

  const loadEnrollment = async () => {
    try {
      const data = await learningService.getEnrollmentById(id);
      setEnrollment(data);
      if (data) {
        setProgress(data.progress);
        // If completed, maybe show all as completed?
      }
    } catch (error) {
      console.error('Error loading course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModuleClick = (module: any) => {
    setActiveModule(module);
  };

  const handleMarkModuleComplete = async () => {
    if (!enrollment) return;

    const currentIndex = MOCK_MODULES.findIndex(m => m.id === activeModule.id);
    if (currentIndex === -1) return;

    // Calculate progress based on this module being completed
    // (currentIndex + 1) because index is 0-based. 1 module done = 1/4 = 25%
    const progressPerModule = 100 / MOCK_MODULES.length;
    // We only want to increase progress, never decrease it via this button
    // And we assume completion of current module means all previous are done in this linear model
    const newProgress = Math.max(progress, Math.round((currentIndex + 1) * progressPerModule));
    
    // Update DB if progress actually increases
    if (newProgress > progress) {
        setProgress(newProgress); // Optimistic update
        
        try {
            if (id.startsWith('tr-')) {
                // Legacy training record
                if (newProgress === 100) {
                  await learningService.completeCourse(id);
                } else {
                  await learningService.updateTrainingProgress(id, newProgress);
                }
            } else {
                const { error } = await supabase
                    .from('course_enrollments')
                    .update({ 
                        progress: newProgress,
                        status: newProgress === 100 ? 'Completed' : 'In Progress',
                        ...(newProgress === 100 ? { completed_date: new Date().toISOString() } : {})
                    })
                    .eq('id', id);
                
                if (error) throw error;
            }

            if (newProgress === 100 && enrollment.employeeId) {
              await onboardingService.syncMandatoryLearningTask(enrollment.employeeId);
            }
            
            // Background refresh to ensure sync
            // Don't await this or it might overwrite our optimistic update with old data if it's too fast
            // Instead, we trust our calculation and only fetch to ensure consistency later if needed
            // loadEnrollment();

        } catch (error) {
            console.error('Error updating progress:', error);
            // In a real app, might want to revert optimistic update here
        }
    }

    // Move to next module if available
    if (currentIndex < MOCK_MODULES.length - 1) {
        setActiveModule(MOCK_MODULES[currentIndex + 1]);
        // Scroll to top of content
        const mainContent = document.querySelector('main');
        if (mainContent) mainContent.scrollTop = 0;
    }
  };

  const getCurrentModuleIndex = () => MOCK_MODULES.findIndex(m => m.id === activeModule.id);
  
  const isCurrentModuleCompleted = () => {
      const index = getCurrentModuleIndex();
      const progressPerModule = 100 / MOCK_MODULES.length;
      return progress >= (index + 1) * progressPerModule;
  };

  const getButtonText = () => {
      const index = getCurrentModuleIndex();
      const isLastModule = index === MOCK_MODULES.length - 1;
      const isCompleted = isCurrentModuleCompleted();

      if (isLastModule) {
          return isCompleted ? 'Course Completed' : 'Finish Course';
      }
      
      return isCompleted ? 'Next Module' : 'Mark Module Complete & Continue';
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
        <p className="text-gray-500">Course not found.</p>
        <button 
            onClick={() => router.back()}
            className="text-blue-600 hover:underline"
        >
            Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
            <button 
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
                <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
                <h1 className="text-lg font-bold text-gray-900">{enrollment.courseTitle}</h1>
                <p className="text-xs text-gray-500">
                    {enrollment.status === 'Completed' ? 'Completed' : `${progress}% Complete`}
                </p>
            </div>
        </div>
        <div className="w-48 bg-gray-200 rounded-full h-2">
            <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${progress}%` }}
            ></div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Modules */}
        <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto hidden md:block">
            <div className="p-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Course Content</h2>
                <div className="space-y-2">
                    {MOCK_MODULES.map((module, index) => (
                        <button
                            key={module.id}
                            onClick={() => handleModuleClick(module)}
                            className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                                activeModule.id === module.id 
                                    ? 'bg-blue-50 border border-blue-100' 
                                    : 'hover:bg-gray-50 border border-transparent'
                            }`}
                        >
                            <div className="mt-1">
                                {progress >= (index + 1) * 25 ? (
                                    <CheckCircle size={16} className="text-green-500" />
                                ) : (
                                    module.type === 'video' ? <PlayCircle size={16} className="text-gray-400" /> : <FileText size={16} className="text-gray-400" />
                                )}
                            </div>
                            <div>
                                <p className={`text-sm font-medium ${activeModule.id === module.id ? 'text-blue-700' : 'text-gray-700'}`}>
                                    {module.title}
                                </p>
                                <p className="text-xs text-gray-500">{module.duration}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
                    {/* Content Placeholder */}
                    <div className="bg-gray-900 aspect-video flex items-center justify-center text-white">
                        <div className="text-center">
                            <Video size={48} className="mx-auto mb-4 opacity-50" />
                            <h2 className="text-2xl font-bold mb-2">{activeModule.title}</h2>
                            <p className="text-gray-400">Video Content Placeholder</p>
                        </div>
                    </div>

                    <div className="p-8 flex-1">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{activeModule.title}</h2>
                        <p className="text-gray-600 leading-relaxed mb-8">
                            This is a placeholder for the actual course content. In a real application, 
                            this would contain the video player, article text, or interactive quiz for 
                            the selected module.
                        </p>
                        
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8">
                            <h3 className="text-sm font-semibold text-blue-900 mb-2">Learning Objectives</h3>
                            <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                                <li>Understand the key concepts of {activeModule.title}</li>
                                <li>Apply knowledge in practical scenarios</li>
                                <li>Review best practices and common pitfalls</li>
                            </ul>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-gray-50 border-t border-gray-100 p-6 flex justify-end">
                        <button
                            onClick={handleMarkModuleComplete}
                            disabled={progress === 100 && getCurrentModuleIndex() === MOCK_MODULES.length - 1}
                            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                                (progress === 100 && getCurrentModuleIndex() === MOCK_MODULES.length - 1)
                                    ? 'bg-green-100 text-green-700 cursor-default'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            {getButtonText()}
                        </button>
                    </div>
                </div>
            </div>
        </main>
      </div>
    </div>
  );
}
