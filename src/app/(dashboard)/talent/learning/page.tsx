"use client";

import { useState, useEffect } from 'react';
import { trainingService } from '@/services/trainingService';
import { courseService } from '@/services/courseService';
import { Training, Course } from '@/types';

export default function LearningPage() {
  const [activeTab, setActiveTab] = useState('mandatory');
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [trainingsData, coursesData] = await Promise.all([
        trainingService.getAll(),
        courseService.getAll()
      ]);
      setTrainings(trainingsData);
      setCourses(coursesData);
    } catch (error) {
      console.error('Failed to load learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper logic to mimic original mock data structure
  const getProgress = (training: Training): number => {
    if (training.result === 'Pass' || training.result === 'Completed') return 100;
    if (training.result === 'Fail') return 0;
    return 50;
  };

  const getStatus = (training: Training) => {
    if (training.result === 'Pass' || training.result === 'Completed') return 'Completed';
    return 'In Progress';
  };

  const inProgressCount = trainings.filter(t => getStatus(t) === 'In Progress').length;
  const completedCount = trainings.filter(t => getStatus(t) === 'Completed').length;
  
  // Calculate hours - assuming 2 hours per course as we don't have duration in Training or Course types yet
  // actually Course type has description but not duration. 
  const completedHours = completedCount * 2; 

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Learning & Development</h1>
          <p className="text-gray-500">Access training modules, compliance courses, and track your progress.</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div className="text-blue-600 font-medium mb-1">In Progress</div>
          <div className="text-2xl font-bold text-blue-900">
            {inProgressCount} Courses
          </div>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
          <div className="text-red-600 font-medium mb-1">Overdue</div>
          <div className="text-2xl font-bold text-red-900">
            0 Modules
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
          <div className="text-green-600 font-medium mb-1">Completed (YTD)</div>
          <div className="text-2xl font-bold text-green-900">
            {completedHours} Hours
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
          <div className="text-purple-600 font-medium mb-1">Certificates</div>
          <div className="text-2xl font-bold text-purple-900">
            {completedCount} Earned
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('mandatory')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'mandatory' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Trainings
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'catalog' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Course Catalog
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'mandatory' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">My Training Records</h3>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {trainings.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No training records found.</div>
            ) : (
              trainings.map((training) => {
                const progress = getProgress(training);
                const status = getStatus(training);
                const daysSinceEnrolled = Math.floor((Date.now() - new Date(training.date).getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={training.id} className="p-6 border-b border-gray-100 last:border-0 hover:bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 p-2 rounded-lg ${progress === 0 ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{training.course}</h4>
                        <p className="text-sm text-gray-500">
                          {status} • Assigned: {new Date(training.date).toLocaleDateString()}
                        </p>
                        {training.remark && <p className="text-xs text-gray-400 mt-1">{training.remark}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {progress > 0 && (
                        <div className="w-32 hidden md:block">
                          <div className="flex justify-between text-xs mb-1">
                            <span>{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
                      )}
                      <button className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        status === 'Completed' 
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}>
                        {status === 'Completed' ? 'View Certificate' : 'Continue'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.length === 0 ? (
             <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
               No courses available in the catalog.
             </div>
          ) : (
            courses.map(course => (
              <div key={course.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.name}</h3>
                <p className="text-gray-500 text-sm mb-4 line-clamp-3">{course.description}</p>
                <button className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">
                  Enroll
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
