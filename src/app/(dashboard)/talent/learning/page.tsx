'use client';

import React, { useEffect, useState } from 'react';
import { learningService } from '@/services/learningService';
import { employeeService } from '@/services/employeeService';
import { onboardingService } from '@/services/onboardingService';
import { LMSCourse, CourseEnrollment, Employee, OnboardingProcess } from '@/types';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Clock, 
  Award, 
  CheckCircle, 
  BarChart, 
  Users, 
  Calendar,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

export default function LearningPage() {
  const [activeTab, setActiveTab] = useState('catalog');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  
  // Data
  const [courses, setCourses] = useState<LMSCourse[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<CourseEnrollment[]>([]);
  const [allAssignments, setAllAssignments] = useState<CourseEnrollment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [onboardingProcesses, setOnboardingProcesses] = useState<OnboardingProcess[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');

  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    courseId: '',
    employeeIds: [] as string[],
    dueDate: '',
    instructions: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    // Re-fetch data whenever the tab is active to ensure freshness
    // especially after returning from the player
    const handleFocus = () => {
      if (activeTab === 'my-learning' && currentUser) {
        fetchMyEnrollments();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (activeTab === 'catalog') {
      fetchCatalog();
      if (currentUser) {
        fetchMyEnrollments();
      }
    } else if (activeTab === 'my-learning' && currentUser) {
      fetchMyEnrollments();
    } else if (activeTab === 'management' && isHR()) {
      fetchAllAssignments();
      fetchEmployees();
      fetchOnboarding();
    } else if (activeTab === 'analytics' && isHR()) {
      fetchAnalytics();
    }
  }, [activeTab, currentUser, searchQuery, selectedCategory, selectedLevel]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const emp = await employeeService.getByUserId(user.id);
        setCurrentUser(emp || null);
      }
      await fetchCatalog();
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async () => {
    const data = await learningService.getCatalog({
      search: searchQuery,
      category: selectedCategory,
      level: selectedLevel
    });
    setCourses(data);
  };

  const fetchMyEnrollments = async () => {
    if (!currentUser) return;
    const data = await learningService.getEmployeeEnrollments(currentUser.id);
    setMyEnrollments(data);
  };

  const fetchAllAssignments = async () => {
    const data = await learningService.getAllAssignments();
    setAllAssignments(data);
  };

  const fetchEmployees = async () => {
    const data = await employeeService.getAll();
    setEmployees(data);
  };

  const fetchOnboarding = async () => {
    try {
      const data = await onboardingService.getAll();
      setOnboardingProcesses(data);
    } catch (error) {
      console.error('Error fetching onboarding workflows for learning management:', error);
    }
  };

  const fetchAnalytics = async () => {
    const data = await learningService.getAnalytics();
    setAnalytics(data);
  };

  const handleAssignCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      await learningService.assignCourse({
        courseId: assignForm.courseId,
        employeeIds: assignForm.employeeIds,
        dueDate: assignForm.dueDate,
        instructions: assignForm.instructions,
        assignedBy: currentUser.id
      });
      setShowAssignModal(false);
      setAssignForm({ courseId: '', employeeIds: [], dueDate: '', instructions: '' });
      if (activeTab === 'management') fetchAllAssignments();
      alert('Course assigned successfully!');
    } catch (error) {
      console.error('Error assigning course:', error);
      alert('Failed to assign course.');
    }
  };

  const handleMarkComplete = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to mark this course as completed?')) return;
    if (!currentUser) return;
    try {
      await learningService.completeCourse(enrollmentId);
      await onboardingService.syncMandatoryLearningTask(currentUser.id);
      fetchMyEnrollments();
    } catch (error) {
      console.error('Error completing course:', error);
      alert('Failed to update status.');
    }
  };

  const handleViewCertificate = (enrollment: CourseEnrollment) => {
    if (enrollment.certificateUrl) {
      window.open(enrollment.certificateUrl, '_blank');
    } else {
      // Open generated certificate page
      const url = `/talent/learning/certificate/${enrollment.id}`;
      window.open(url, '_blank');
    }
  };

  const isHR = () => currentUser?.role === 'HR Admin' || currentUser?.role === 'Manager'; // Adjust based on specific role requirements

  const router = useRouter(); // Ensure useRouter is imported from next/navigation

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'management' && isHR()) {
      setActiveTab('management');
    }
  }, [currentUser]);

  if (loading && !currentUser) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Learning & Development</h1>
          <p className="text-gray-500">Manage your professional growth and training</p>
        </div>
        {isHR() && (
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <BookOpen size={18} />
            Assign Course
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <TabButton id="catalog" label="Course Catalog" icon={<BookOpen size={18} />} active={activeTab} onClick={setActiveTab} />
        <TabButton id="my-learning" label="My Learning" icon={<Award size={18} />} active={activeTab} onClick={setActiveTab} />
        {isHR() && (
          <>
            <TabButton id="management" label="Management" icon={<Users size={18} />} active={activeTab} onClick={setActiveTab} />
            <TabButton id="analytics" label="Analytics" icon={<BarChart size={18} />} active={activeTab} onClick={setActiveTab} />
          </>
        )}
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search courses..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="All">All Categories</option>
                <option value="Technical">Technical</option>
                <option value="Soft Skills">Soft Skills</option>
                <option value="Compliance">Compliance</option>
                <option value="Management">Management</option>
              </select>
              <select
                className="px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
              >
                <option value="All">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            {/* Course Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(course => (
                <div key={course.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-40 bg-gradient-to-r from-blue-500 to-indigo-600 p-6 flex items-center justify-center text-white">
                    <BookOpen size={48} className="opacity-50" />
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                        {course.category}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={12} />
                        {course.durationMinutes ? `${Math.round(course.durationMinutes / 60)}h` : `${course.duration}h`}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{course.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{course.description}</p>
                    
                    {course.skillsCovered && course.skillsCovered.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {course.skillsCovered.slice(0, 3).map((skill, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">{course.level}</span>
                      <div className="flex gap-2">
                        {/* Check if current user is enrolled */}
                        {myEnrollments.some(e => e.courseId === course.id) ? (
                          <button
                            onClick={() => setActiveTab('my-learning')}
                            className="text-sm text-green-600 font-medium hover:underline flex items-center gap-1"
                          >
                            <CheckCircle size={14} />
                            Enrolled
                          </button>
                        ) : (
                          // If not enrolled, show nothing for employees (unless self-enrollment is added later)
                          // HR can still assign
                          null
                        )}

                        {isHR() && (
                          <button
                            onClick={() => {
                              setAssignForm(prev => ({ ...prev, courseId: course.id }));
                              setShowAssignModal(true);
                            }}
                            className="text-sm text-blue-600 font-medium hover:underline"
                          >
                            Assign
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {courses.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No courses found matching your filters.
              </div>
            )}
          </div>
        )}

        {activeTab === 'my-learning' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {myEnrollments.map(enrollment => (
                <div key={enrollment.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{enrollment.courseTitle}</h3>
                      <StatusBadge status={enrollment.status} />
                    </div>
                    {enrollment.dueDate && (
                      <p className="text-sm text-red-500 flex items-center gap-1 mb-2">
                        <AlertCircle size={14} />
                        Due: {new Date(enrollment.dueDate).toLocaleDateString()}
                      </p>
                    )}
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${enrollment.progress}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Progress: {enrollment.progress}%</span>
                      {enrollment.instructions && (
                        <span className="italic">Note: {enrollment.instructions}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    {enrollment.status === 'Completed' ? (
                      <button 
                        onClick={() => handleViewCertificate(enrollment)}
                        className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-green-100 transition-colors"
                      >
                        <CheckCircle size={16} />
                        View Certificate
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => router.push(`/talent/learning/play/${enrollment.id}`)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          Continue Learning
                        </button>
                        <button 
                          onClick={() => handleMarkComplete(enrollment.id)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                        >
                          Mark Complete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {myEnrollments.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                You are not enrolled in any courses yet.
              </div>
            )}
          </div>
        )}

        {activeTab === 'management' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Course</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Due Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allAssignments.map(assignment => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{assignment.employeeName}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{assignment.courseTitle}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={assignment.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-1.5">
                          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${assignment.progress}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-500">{assignment.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnalyticsCard title="Total Enrollments" value={analytics.totalEnrollments} icon={<BookOpen className="text-blue-500" />} />
            <AnalyticsCard title="Active Learners" value={analytics.activeLearners} icon={<Users className="text-indigo-500" />} />
            <AnalyticsCard title="Completion Rate" value={`${analytics.completionRate}%`} icon={<CheckCircle className="text-green-500" />} />
            <AnalyticsCard title="Avg. Time (min)" value={analytics.avgTime} icon={<Clock className="text-orange-500" />} />
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-xl font-bold mb-4">Assign Course</h2>
            <form onSubmit={handleAssignCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={assignForm.courseId}
                  onChange={(e) => setAssignForm({ ...assignForm, courseId: e.target.value })}
                >
                  <option value="">Select a course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee(s)</label>
                <select
                  required
                  multiple
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32"
                  value={assignForm.employeeIds}
                  onChange={(e) => {
                    const options = Array.from(e.target.selectedOptions, option => option.value);
                    setAssignForm({ ...assignForm, employeeIds: options });
                  }}
                >
                  {employees.map(emp => {
                    const isOnboarding = onboardingProcesses.some(
                      p => p.employeeId === emp.id && p.status === 'In Progress'
                    );
                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                        {isOnboarding ? ' (Onboarding)' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={assignForm.dueDate}
                  onChange={(e) => setAssignForm({ ...assignForm, dueDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  value={assignForm.instructions}
                  onChange={(e) => setAssignForm({ ...assignForm, instructions: e.target.value })}
                  placeholder="Optional instructions..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Assign Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const TabButton = ({ id, label, icon, active, onClick }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
      active === id
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    {icon}
    {label}
  </button>
);

const StatusBadge = ({ status }: { status: string }) => {
  const colors: any = {
    'Enrolled': 'bg-blue-100 text-blue-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Completed': 'bg-green-100 text-green-800',
    'Overdue': 'bg-red-100 text-red-800',
    'Dropped': 'bg-gray-100 text-gray-800'
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
};

const AnalyticsCard = ({ title, value, icon }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
    <div className="p-3 bg-gray-50 rounded-full">{icon}</div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);
