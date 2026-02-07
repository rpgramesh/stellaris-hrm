import { supabase } from '@/lib/supabase';
import { OnboardingProcess, OnboardingTask } from '@/types';


export const onboardingService = {
  async getAll(): Promise<OnboardingProcess[]> {
    const { data, error } = await supabase
      .from('onboarding_workflows')
      .select(`
        *,
        tasks:workflow_tasks(*)
      `);

    if (error) throw error;
    if (data) {
          return data.map((item: any) => ({
              id: item.id,
              employeeId: item.employee_id, 
              startDate: item.created_at,
              status: item.status,
              progress: item.progress,
              currentStage: item.current_stage || (item.status === 'Completed' ? 'Completed' : 'In Progress'),
              tasks: item.tasks.map((t: any) => ({
                  id: t.id,
                  name: t.title,
                  completed: t.status === 'Completed'
              }))
          }));
    }
    return [];
  },

  async create(process: Omit<OnboardingProcess, 'id'>): Promise<OnboardingProcess> {
    // 1. Create Workflow
    const { data: workflow, error: wfError } = await supabase
      .from('onboarding_workflows')
      .insert({
        employee_id: process.employeeId,
        status: process.status,
        progress: process.progress,
        type: 'Onboarding',
        current_stage: process.currentStage
      })
      .select()
      .single();

    if (wfError) {
        console.error('Error creating onboarding workflow:', JSON.stringify(wfError, null, 2));
        throw wfError;
      }

      // 2. Create Tasks
      const tasksToInsert = process.tasks.map(t => ({
          workflow_id: workflow.id,
          title: t.name,
          status: t.completed ? 'Completed' : 'Pending'
      }));

      const { data: tasks, error: tasksError } = await supabase
        .from('workflow_tasks')
        .insert(tasksToInsert)
        .select();

      if (tasksError) {
        console.error('Error creating workflow tasks:', JSON.stringify(tasksError, null, 2));
        throw tasksError;
      }

    return {
        id: workflow.id,
        employeeId: workflow.employee_id,
        startDate: workflow.created_at,
        status: workflow.status,
        progress: workflow.progress,
        currentStage: process.currentStage,
        tasks: tasks.map((t: any) => ({
            id: t.id,
            name: t.title,
            completed: t.status === 'Completed'
        }))
    };
  },

  async updateTask(taskId: string, completed: boolean): Promise<void> {
    const { error } = await supabase
      .from('workflow_tasks')
      .update({ 
        status: completed ? 'Completed' : 'Pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) throw error;
  },

  async updateWorkflow(id: string, updates: Partial<OnboardingProcess>): Promise<void> {
    const dbUpdates: any = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
    if (updates.currentStage) dbUpdates.current_stage = updates.currentStage;
    
    if (Object.keys(dbUpdates).length === 0) return;

    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('onboarding_workflows')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
  }
};
