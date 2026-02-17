import { supabase } from '@/lib/supabase';
import { OnboardingProcess } from '@/types';
import { learningService } from '@/services/learningService';

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
    const attemptCreateWorkflow = async () => {
      return supabase
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
    };

    let workflow: any | null = null;
    let wfError: any = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const result = await attemptCreateWorkflow();
      workflow = result.data;
      wfError = result.error;

      if (!wfError) {
        break;
      }

      const message =
        typeof wfError === 'string'
          ? wfError
          : typeof wfError?.message === 'string'
          ? wfError.message
          : '';

      const isAbortError =
        typeof message === 'string' &&
        message.toLowerCase().includes('aborterror');

      if (!isAbortError || attempt === 2) {
        const logPayload =
          wfError instanceof Error
            ? wfError.message
            : typeof wfError === 'object'
            ? JSON.stringify(wfError, null, 2)
            : String(wfError);

        console.error('Error creating onboarding workflow:', logPayload);
        throw wfError;
      }
    }

    if (!workflow) {
      throw new Error('Failed to create onboarding workflow after retry.');
    }

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
      const logPayload =
        tasksError instanceof Error
          ? tasksError.message
          : typeof tasksError === 'object'
          ? JSON.stringify(tasksError, null, 2)
          : String(tasksError);

      console.error('Error creating workflow tasks:', logPayload);
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
  },

  async syncMandatoryLearningTask(employeeId: string): Promise<void> {
    try {
      const completed = await learningService.hasCompletedMandatoryOnboarding(employeeId);
      if (!completed) return;

      const { data, error } = await supabase
        .from('onboarding_workflows')
        .select(`
          id,
          status,
          progress,
          current_stage,
          tasks:workflow_tasks(*)
        `)
        .eq('employee_id', employeeId)
        .eq('type', 'Onboarding')
        .in('status', ['Not Started', 'In Progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return;

      const tasks = (data as any).tasks as any[];
      if (!tasks || tasks.length === 0) return;

      const targetIndex = tasks.findIndex(
        t => typeof t.title === 'string' && t.title.toLowerCase().includes('mandatory learning')
      );
      if (targetIndex === -1) return;

      const targetTask = tasks[targetIndex];
      if (targetTask.status === 'Completed') return;

      const now = new Date().toISOString();

      const { error: taskError } = await supabase
        .from('workflow_tasks')
        .update({ status: 'Completed', updated_at: now })
        .eq('id', targetTask.id);

      if (taskError) return;

      tasks[targetIndex] = { ...targetTask, status: 'Completed' };

      const total = tasks.length;
      const completedCount = tasks.filter(t => t.status === 'Completed').length;
      const progress = total > 0 ? Math.round((completedCount / total) * 100) : data.progress;

      const nextIncomplete = tasks.find(t => t.status !== 'Completed');
      const currentStage = nextIncomplete ? nextIncomplete.title : 'Completed';
      const status = progress === 100 ? 'Completed' : 'In Progress';

      await supabase
        .from('onboarding_workflows')
        .update({
          progress,
          status,
          current_stage: currentStage,
          updated_at: now
        })
        .eq('id', data.id);
    } catch (error) {
      console.error('Error syncing mandatory learning task for onboarding:', error);
    }
  }
};
