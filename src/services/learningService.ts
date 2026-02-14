import { supabase } from '@/lib/supabase';
import { 
  LMSCourse, 
  CourseEnrollment, 
  CourseType, 
  CourseFormat, 
  CourseLevel, 
  EnrollmentStatus,
  LearningAnalytics 
} from '@/types';
import { notificationService } from '@/services/notificationService';

// Helper to check overdue status
const checkOverdue = (status: string, dueDate?: string): string => {
  if (status === 'Completed') return status;
  if (!dueDate) return status;
  if (new Date(dueDate) < new Date()) return 'Overdue';
  return status;
};

export const learningService = {
  // Catalog
  async getCatalog(filters?: {
    category?: string;
    level?: string;
    search?: string;
  }): Promise<LMSCourse[]> {
    // 1. Try fetching with full features (assuming schema is updated)
    let query = supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    // Only apply filters if we're in the "try" block essentially, 
    // but Supabase query building is synchronous. 
    // The execution is await query.
    
    if (filters?.category && filters.category !== 'All') {
      query = query.eq('category', filters.category);
    }
    if (filters?.level && filters.level !== 'All') {
      query = query.eq('level', filters.level);
    }
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    // We can't easily try-catch the query builder, but we can catch the execution.
    // However, if we use .eq() on a missing column, it might not error until execution?
    // Actually, .eq() just builds the URL params. The error comes from the server.

    // Let's try to add 'active' filter. If 'active' column is missing, this might fail.
    // We'll skip 'active' check for now or handle it in fallback.
    // actually, let's try the robust way:
    
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching course catalog (full query):', JSON.stringify(error, null, 2));
      
      // Fallback: Fetch only guaranteed columns without filters (except search which is on 'name')
      console.warn('Falling back to basic course fetch...');
      
      let fallbackQuery = supabase
        .from('courses')
        .select('id, name, description'); // Minimal columns we know exist from courseService

      if (filters?.search) {
        fallbackQuery = fallbackQuery.ilike('name', `%${filters.search}%`);
      }
      
      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      
      if (fallbackError) {
        console.error('Error fetching course catalog (fallback):', JSON.stringify(fallbackError, null, 2));
        return [];
      }
      
      return (fallbackData || []).map((item: any) => ({
        id: item.id,
        title: item.name,
        description: item.description,
        type: 'Skills',
        category: 'General',
        format: 'Online',
        level: 'Beginner',
        duration: 1,
        durationMinutes: 60,
        skillsCovered: [],
        instructor: 'Internal',
        cost: 0,
        currency: 'AUD',
        status: 'Published',
        prerequisites: [],
        objectives: [],
        materials: [],
        certificateAvailable: true,
        tags: [],
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString()
      }));
    }

    // If main query succeeds, map fully
    return data.map((item: any) => ({
      id: item.id,
      title: item.name,
      description: item.description,
      type: (item.type || 'Skills') as CourseType,
      category: item.category || 'General',
      format: (item.format || 'Online') as CourseFormat,
      level: (item.level || 'Beginner') as CourseLevel,
      duration: item.duration_minutes ? item.duration_minutes / 60 : (parseInt(item.duration) || 1),
      durationMinutes: item.duration_minutes,
      skillsCovered: item.skills_covered || [],
      instructor: item.provider,
      cost: item.cost,
      currency: item.currency,
      status: 'Published',
      prerequisites: [],
      objectives: [],
      materials: [],
      certificateAvailable: true,
      tags: [],
      createdDate: item.created_at,
      updatedDate: item.updated_at
    }));
  },

  // Enrollments (My Learning)
  async getEmployeeEnrollments(employeeId: string): Promise<CourseEnrollment[]> {
    // 1. Fetch official enrollments
    const { data: enrollments, error: enrollError } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        course:courses(name)
      `)
      .eq('employee_id', employeeId)
      .order('enrolled_date', { ascending: false });

    if (enrollError) {
      console.error('Error fetching enrollments:', JSON.stringify(enrollError, null, 2));
      return [];
    }

    const mappedEnrollments: CourseEnrollment[] = enrollments.map((item: any) => ({
      id: item.id,
      courseId: item.course_id,
      courseTitle: item.course?.name || 'Unknown Course',
      employeeId: item.employee_id,
      employeeName: '', 
      status: checkOverdue(item.status, item.due_date) as EnrollmentStatus,
      enrolledDate: item.enrolled_date,
      startedDate: item.started_date,
      completedDate: item.completed_date,
      dueDate: item.due_date,
      assignedBy: item.assigned_by,
      instructions: item.instructions,
      progress: item.progress || 0,
      score: item.score,
      certificateUrl: item.certificate_url,
      feedback: item.feedback,
      rating: item.rating,
      notes: item.notes
    }));

    // 2. Fetch training records (legacy or manually added)
    const { data: trainingRecords, error: trainingError } = await supabase
      .from('training_records')
      .select('*')
      .eq('employee_id', employeeId);

    if (trainingError) {
      console.error('Error fetching training records for learning view:', trainingError);
      // Do not fail, just return enrollments
      return mappedEnrollments;
    }

    // 3. Merge training records, avoiding duplicates if course_id matches
    const existingCourseIds = new Set(mappedEnrollments.map(e => e.courseId));
    
    const mappedTrainingRecords: CourseEnrollment[] = trainingRecords
      .filter((t: any) => {
         // If record has a course_id and we already have an enrollment for it, skip
         if (t.course_id && existingCourseIds.has(t.course_id)) return false;
         // If result is present, it's likely completed. If empty, it's pending.
         // We want to show ALL history here? Or just pending?
         // User wants to "attend and complete", so primarily pending ones.
         // But "My Learning" should probably show history too.
         return true;
      })
      .map((t: any) => {
        const isCompleted = t.result && t.result !== '-' && t.result.trim() !== '';
        
        // Parse progress from remark if available (format: "Notes... [PROGRESS:25]")
        let progress = 0;
        let cleanRemark = t.remark;
        
        if (isCompleted) {
          progress = 100;
        } else if (t.remark && typeof t.remark === 'string') {
          const progressMatch = t.remark.match(/\[PROGRESS:(\d+)\]/);
          if (progressMatch) {
            progress = parseInt(progressMatch[1], 10);
            // Optional: Hide the tag from UI if desired, but keeping it simple for now
            // cleanRemark = t.remark.replace(/\[PROGRESS:\d+\]/, '').trim();
          }
        }

        // Resolve certificate URL from attachment
        let certUrl: string | undefined = undefined;
        if (Array.isArray(t.attachment) && t.attachment.length > 0) {
            certUrl = t.attachment[0];
        } else if (typeof t.attachment === 'string' && t.attachment) {
            try {
                const parsed = JSON.parse(t.attachment);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    certUrl = parsed[0];
                } else if (typeof parsed === 'string') {
                    certUrl = parsed;
                }
            } catch (e) {
                if (t.attachment.startsWith('http')) {
                    certUrl = t.attachment;
                }
            }
        }

        return {
          id: `tr-${t.id}`, // Prefix to identify source
          courseId: t.course_id || `legacy-${t.id}`,
          courseTitle: t.course || 'Untitled Training',
          employeeId: t.employee_id,
          employeeName: '',
          status: isCompleted ? 'Completed' : 'Enrolled', // Default to Enrolled if not completed
          enrolledDate: t.date, // Use date as enrolled date
          startedDate: undefined,
          completedDate: isCompleted ? t.date : undefined,
          dueDate: undefined,
          assignedBy: undefined,
          instructions: t.remark,
          progress: progress,
          score: undefined,
          certificateUrl: certUrl,
          feedback: undefined,
          rating: undefined,
          notes: t.remark
        } as CourseEnrollment;
      });

    return [...mappedEnrollments, ...mappedTrainingRecords].sort((a, b) => 
      new Date(b.enrolledDate).getTime() - new Date(a.enrolledDate).getTime()
    );
  },

  // HR: Assign Course
  async assignCourse(enrollment: {
    courseId: string;
    employeeIds: string[];
    dueDate?: string;
    instructions?: string;
    assignedBy: string;
  }): Promise<void> {
    const enrollments = enrollment.employeeIds.map(empId => ({
      course_id: enrollment.courseId,
      employee_id: empId,
      status: 'Enrolled',
      due_date: enrollment.dueDate,
      assigned_by: enrollment.assignedBy,
      instructions: enrollment.instructions,
      enrolled_date: new Date().toISOString(),
      progress: 0
    }));

    const { error } = await supabase
      .from('course_enrollments')
      .insert(enrollments);

    if (error) throw error;
    
    // Send Notifications
    try {
      const { data: employees } = await supabase
        .from('employees')
        .select('id, user_id')
        .in('id', enrollment.employeeIds);
        
      const { data: course } = await supabase
          .from('courses')
          .select('name')
          .eq('id', enrollment.courseId)
          .single();
          
      if (employees && course) {
          for (const emp of employees) {
              if (emp.user_id) {
                  await notificationService.createNotification(
                      emp.user_id,
                      'New Course Assigned',
                      `You have been assigned to the course: ${course.name}. Due Date: ${enrollment.dueDate || 'None'}`,
                      'info'
                  );
              }
          }
          console.log(`Simulating email notifications to ${employees.length} employees for course ${course.name}`);
      }
    } catch (notifyError) {
      console.error('Error sending notifications:', notifyError);
      // Don't fail the assignment if notification fails
    }
  },

  // HR: Get All Assignments
  async getAllAssignments(): Promise<CourseEnrollment[]> {
    const { data, error } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        course:courses(name),
        employee:employees!course_enrollments_employee_id_fkey(first_name, last_name)
      `)
      .order('enrolled_date', { ascending: false });

    if (error) {
      console.error('Error fetching all assignments:', JSON.stringify(error, null, 2));
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      courseId: item.course_id,
      courseTitle: item.course?.name || 'Unknown Course',
      employeeId: item.employee_id,
      employeeName: item.employee ? `${item.employee.first_name} ${item.employee.last_name}` : 'Unknown',
      status: checkOverdue(item.status, item.due_date) as EnrollmentStatus,
      enrolledDate: item.enrolled_date,
      startedDate: item.started_date,
      completedDate: item.completed_date,
      dueDate: item.due_date,
      assignedBy: item.assigned_by,
      instructions: item.instructions,
      progress: item.progress || 0,
      score: item.score,
      certificateUrl: item.certificate_url
    }));
  },

  // Analytics
  async getAnalytics(): Promise<LearningAnalytics> {
    // Try full fetch first
    const { data: enrollments, error } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        course:courses(name)
      `);

    let safeEnrollments = enrollments;

    if (error) {
      console.error('Error fetching analytics data (full query):', JSON.stringify(error, null, 2));
      console.warn('Falling back to basic analytics fetch...');
      
      // Fallback: Fetch without extra course details
      const { data: basicData, error: basicError } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          course:courses(name)
        `);
    if (basicError) {
        console.error('Error fetching analytics data (fallback):', JSON.stringify(basicError, null, 2));
        return {
          totalEnrollments: 0,
          activeLearners: 0,
          completionRate: 0,
          avgTime: 0,
          totalAssigned: 0,
          averageScore: 0,
          hoursLearned: 0,
          overdueCount: 0,
          categoryDistribution: {},
          monthlyCompletions: [],
          skillGaps: []
        };
      }
      
      // Map basic data with default course info
      safeEnrollments = basicData?.map((item: any) => ({
        ...item,
        course: {
          ...item.course,
          category: 'General',
          duration: '1 hour',
          duration_minutes: 60,
          skills_covered: []
        }
      })) || [];
    }

    if (!safeEnrollments) {
        return {
          totalEnrollments: 0,
          activeLearners: 0,
          completionRate: 0,
          avgTime: 0,
          totalAssigned: 0,
          averageScore: 0,
          hoursLearned: 0,
          overdueCount: 0,
          categoryDistribution: {},
          monthlyCompletions: [],
          skillGaps: []
        };
    }

    const totalAssigned = safeEnrollments.length;
    const completedList = safeEnrollments.filter((e: any) => e.status === 'Completed');
    const completedCount = completedList.length;
    const completionRate = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;
    
    // Calculate average score
    const scoredEnrollments = safeEnrollments.filter((e: any) => e.score !== undefined && e.score !== null);
    const averageScore = scoredEnrollments.length > 0
      ? Math.round(scoredEnrollments.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0) / scoredEnrollments.length)
      : 0;

    // Calculate hours learned
    const hoursLearned = completedList.reduce((acc: number, curr: any) => {
        let minutes = 0;
        if (curr.course?.duration_minutes) {
            minutes = curr.course.duration_minutes;
        } else {
            const durationStr = curr.course?.duration || '';
            const val = parseInt(durationStr);
            if (!isNaN(val)) {
                 if (durationStr.toLowerCase().includes('hour')) {
                     minutes = val * 60;
                 } else {
                     minutes = val;
                 }
            }
        }
        return acc + (minutes / 60);
    }, 0);

    const overdueCount = safeEnrollments.filter((e: any) => checkOverdue(e.status, e.due_date) === 'Overdue').length;

    // Category distribution
    const categoryDistribution: Record<string, number> = {};
    safeEnrollments.forEach((e: any) => {
        const cat = e.course?.category || 'Uncategorized';
        categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
    });

    // Calculate active learners (unique employees with In Progress or Enrolled status)
    const activeLearnerIds = new Set(
        safeEnrollments
            .filter((e: any) => e.status === 'Enrolled' || e.status === 'In Progress')
            .map((e: any) => e.employee_id)
    );
    const activeLearners = activeLearnerIds.size;

    // Calculate average time (minutes) based on completed courses duration
    const totalMinutes = completedList.reduce((acc: number, curr: any) => {
        let minutes = 0;
        if (curr.course?.duration_minutes) {
            minutes = curr.course.duration_minutes;
        } else {
            const durationStr = curr.course?.duration || '';
            const val = parseInt(durationStr);
            if (!isNaN(val)) {
                 if (durationStr.toLowerCase().includes('hour')) {
                     minutes = val * 60;
                 } else {
                     minutes = val;
                 }
            }
        }
        return acc + minutes;
    }, 0);
    
    const avgTime = completedCount > 0 ? Math.round(totalMinutes / completedCount) : 0;

    return {
        totalEnrollments: totalAssigned,
        activeLearners,
        completionRate,
        avgTime,
        // Legacy/Extra fields if needed by other components, though page.tsx only uses the above
        totalAssigned,
        averageScore,
        hoursLearned: Math.round(hoursLearned * 10) / 10,
        overdueCount,
        categoryDistribution,
        monthlyCompletions: [],
        skillGaps: []
    } as any; // Cast to any to avoid strict type check if interface isn't updated yet, or I should update interface
  },

  // Employee: Mark as Complete
  async completeCourse(enrollmentId: string): Promise<void> {
    if (enrollmentId.startsWith('tr-')) {
      // It's a legacy training record
      const recordId = enrollmentId.replace('tr-', '');
      const { error } = await supabase
        .from('training_records')
        .update({
          result: 'Completed'
        })
        .eq('id', recordId);
      
      if (error) throw error;
    } else {
      // It's a standard enrollment
      const { error } = await supabase
        .from('course_enrollments')
        .update({
          status: 'Completed',
          progress: 100,
          completed_date: new Date().toISOString()
        })
        .eq('id', enrollmentId);

      if (error) throw error;
    }
  },

  // Get Enrollment/Training Details by ID (for Certificate)
  async getEnrollmentById(id: string): Promise<CourseEnrollment | null> {
    try {
      if (id.startsWith('tr-')) {
        const recordId = id.replace('tr-', '');
        const { data: record, error } = await supabase
          .from('training_records')
          .select(`
            *,
            employee:employees(first_name, last_name)
          `)
          .eq('id', recordId)
          .single();
        
        if (error || !record) return null;

        // Resolve certificate URL from attachment
        let certUrl: string | undefined = undefined;
        if (Array.isArray(record.attachment) && record.attachment.length > 0) {
            certUrl = record.attachment[0];
        } else if (typeof record.attachment === 'string' && record.attachment) {
            try {
                const parsed = JSON.parse(record.attachment);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    certUrl = parsed[0];
                } else if (typeof parsed === 'string') {
                    certUrl = parsed;
                }
            } catch (e) {
                if (record.attachment.startsWith('http')) {
                    certUrl = record.attachment;
                }
            }
        }

        const isCompleted = record.result && record.result !== '-' && record.result.trim() !== '';

        // Parse progress from remark
        let progress = 0;
        if (isCompleted) {
            progress = 100;
        } else if (record.remark && typeof record.remark === 'string') {
            const progressMatch = record.remark.match(/\[PROGRESS:(\d+)\]/);
            if (progressMatch) {
                progress = parseInt(progressMatch[1], 10);
            }
        }

        return {
          id: `tr-${record.id}`,
          courseId: record.course_id || `legacy-${record.id}`,
          courseTitle: record.course || 'Untitled Training',
          employeeId: record.employee_id,
          employeeName: record.employee ? `${record.employee.first_name} ${record.employee.last_name}` : 'Unknown',
          status: isCompleted ? 'Completed' : 'Enrolled',
          enrolledDate: record.date,
          completedDate: isCompleted ? record.date : undefined,
          progress: progress,
          certificateUrl: certUrl,
          instructions: record.remark
        } as CourseEnrollment;

      } else {
        const { data: enrollment, error } = await supabase
          .from('course_enrollments')
          .select(`
            *,
            course:courses(name),
            employee:employees(first_name, last_name)
          `)
          .eq('id', id)
          .single();

        if (error || !enrollment) return null;

        return {
          id: enrollment.id,
          courseId: enrollment.course_id,
          courseTitle: enrollment.course?.name || 'Unknown Course',
          employeeId: enrollment.employee_id,
          employeeName: enrollment.employee ? `${enrollment.employee.first_name} ${enrollment.employee.last_name}` : 'Unknown',
          status: checkOverdue(enrollment.status, enrollment.due_date) as EnrollmentStatus,
          enrolledDate: enrollment.enrolled_date,
          startedDate: enrollment.started_date,
          completedDate: enrollment.completed_date,
          dueDate: enrollment.due_date,
          assignedBy: enrollment.assigned_by,
          instructions: enrollment.instructions,
          progress: enrollment.progress || 0,
          score: enrollment.score,
          certificateUrl: enrollment.certificate_url
        };
      }
    } catch (error) {
      console.error('Error fetching enrollment details:', error);
      return null;
    }
  },

  async updateTrainingProgress(id: string, progress: number): Promise<void> {
    try {
        const recordId = id.replace('tr-', '');
        
        // Fetch current remark
        const { data: record, error: fetchError } = await supabase
            .from('training_records')
            .select('remark')
            .eq('id', recordId)
            .single();
            
        if (fetchError) throw fetchError;
        
        let newRemark = record?.remark || '';
        // Remove existing progress tag
        newRemark = newRemark.replace(/\[PROGRESS:\d+\]/, '').trim();
        // Add new progress tag
        newRemark = `${newRemark} [PROGRESS:${progress}]`;
        
        const { error: updateError } = await supabase
            .from('training_records')
            .update({ remark: newRemark })
            .eq('id', recordId);
            
        if (updateError) throw updateError;
        
    } catch (error: any) {
            if (error?.message?.includes('record "new" has no field "updated_at"')) {
                console.error('Database Schema Error: training_records table is missing updated_at column. Please run the migration 20260214150000_fix_training_records_updated_at.sql');
            } else {
                console.error('Error updating training progress:', JSON.stringify(error, null, 2));
            }
            throw error;
        }
  }
};


