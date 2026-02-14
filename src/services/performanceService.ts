import { supabase } from '@/lib/supabase';
import { KPI, OKR, PerformanceReview, Feedback360 } from '@/types';

export const performanceService = {
  // KPIs
  async getKPIs(): Promise<KPI[]> {
    const { data, error } = await supabase
      .from('kpis')
      .select(`
        *,
        employee:employees(first_name, last_name)
      `)
      .order('due_date', { ascending: true });

    if (error) {
        console.error('Error fetching KPIs:', JSON.stringify(error, null, 2));
        return [];
    }
    
    return data.map(item => ({
      id: item.id,
      employeeId: item.employee_id,
      employeeName: item.employee ? `${item.employee.first_name} ${item.employee.last_name}` : 'Unknown',
      title: item.title,
      description: item.description,
      category: item.category,
      target: item.target,
      currentValue: item.current_value,
      unit: item.unit,
      weight: item.weight,
      progress: item.progress,
      dueDate: item.due_date,
      status: item.status,
      notes: item.notes,
      updatedDate: item.updated_at
    }));
  },

  // OKRs
  async getOKRs(): Promise<OKR[]> {
    const { data, error } = await supabase
      .from('okrs')
      .select(`
        *,
        employee:employees(first_name, last_name),
        key_results(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching OKRs:', JSON.stringify(error, null, 2));
        return [];
    }

    return data.map(item => ({
      id: item.id,
      employeeId: item.employee_id,
      employeeName: item.employee ? `${item.employee.first_name} ${item.employee.last_name}` : 'Unknown',
      quarter: item.quarter,
      objective: item.objective,
      description: item.description,
      keyResults: item.key_results ? item.key_results.map((kr: any) => ({
        id: kr.id,
        okrId: kr.okr_id,
        description: kr.description,
        target: kr.target,
        current: kr.current,
        unit: kr.unit,
        progress: kr.progress,
        confidence: kr.confidence,
        updatedDate: kr.updated_at
      })) : [],
      progress: item.progress,
      status: item.status,
      createdDate: item.created_at,
      dueDate: item.end_date,
      updatedDate: item.updated_at
    }));
  },

  // Reviews
  async getReviews(): Promise<PerformanceReview[]> {
    const { data, error } = await supabase
      .from('performance_reviews')
      .select(`
        *,
        employee:employees!employee_id(first_name, last_name),
        reviewer:employees!reviewer_id(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching reviews:', JSON.stringify(error, null, 2));
        return [];
    }

    return data.map(item => ({
      id: item.id,
      employeeId: item.employee_id,
      employeeName: item.employee ? `${item.employee.first_name} ${item.employee.last_name}` : 'Unknown',
      reviewerId: item.reviewer_id,
      reviewerName: item.reviewer ? `${item.reviewer.first_name} ${item.reviewer.last_name}` : 'Unknown',
      reviewerRole: 'Reviewer', // Placeholder as it's not in the join yet, or need to join job_positions
      cycle: item.cycle,
      period: {
        start: item.start_date,
        end: item.end_date
      },
      status: item.status,
      selfAssessment: item.self_assessment,
      managerAssessment: item.manager_assessment,
      finalRating: item.final_rating,
      recommendations: item.recommendations,
      developmentPlan: item.development_plan,
      promotionRecommendation: item.promotion_recommendation,
      completedDate: item.completed_date
    }));
  },

  // Feedback 360
  async getFeedback360(): Promise<Feedback360[]> {
    const { data, error } = await supabase
      .from('feedback_360')
      .select(`
        *,
        employee:employees!employee_id(first_name, last_name),
        reviewer:employees!reviewer_id(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching feedback 360:', JSON.stringify(error, null, 2));
        return [];
    }

    return data.map(item => ({
      id: item.id,
      employeeId: item.employee_id,
      employeeName: item.employee ? `${item.employee.first_name} ${item.employee.last_name}` : 'Unknown',
      reviewerId: item.reviewer_id,
      reviewerName: item.reviewer ? `${item.reviewer.first_name} ${item.reviewer.last_name}` : 'Unknown',
      reviewerRelationship: item.relationship,
      reviewPeriod: {
        start: item.period_start,
        end: item.period_end
      },
      status: item.status,
      competencies: item.competencies,
      overallComments: item.overall_comments,
      strengths: item.strengths,
      improvements: item.improvements,
      submittedDate: item.submitted_date,
      anonymous: item.anonymous
    }));
  }
};
