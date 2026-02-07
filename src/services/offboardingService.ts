import { supabase } from '@/lib/supabase';

export interface OffboardingTask {
  id: string;
  workflowId: string;
  name: string;
  completed: boolean;
}

export interface OffboardingWorkflow {
  id: string;
  employeeId: string;
  exitDate: string;
  reason: string;
  status: 'Scheduled' | 'In Progress' | 'Completed';
  tasks: OffboardingTask[];
}

const mapTaskFromDb = (dbTask: any): OffboardingTask => ({
  id: dbTask.id,
  workflowId: dbTask.workflow_id,
  name: dbTask.name,
  completed: dbTask.completed,
});

const mapWorkflowFromDb = (dbWorkflow: any, tasks: any[] = []): OffboardingWorkflow => ({
  id: dbWorkflow.id,
  employeeId: dbWorkflow.employee_id,
  exitDate: dbWorkflow.exit_date,
  reason: dbWorkflow.reason,
  status: dbWorkflow.status,
  tasks: tasks.map(mapTaskFromDb),
});

export const offboardingService = {
  async getAll(): Promise<OffboardingWorkflow[]> {
    const { data: workflows, error: wfError } = await supabase
      .from('offboarding_workflows')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (wfError) throw wfError;
    if (!workflows) return [];

    const workflowIds = workflows.map(w => w.id);
    const { data: tasks, error: taskError } = await supabase
      .from('offboarding_tasks')
      .select('*')
      .in('workflow_id', workflowIds);
      
    if (taskError) throw taskError;

    return workflows.map(wf => {
      const wfTasks = tasks?.filter(t => t.workflow_id === wf.id) || [];
      return mapWorkflowFromDb(wf, wfTasks);
    });
  },

  async create(workflow: Omit<OffboardingWorkflow, 'id' | 'tasks'>, initialTasks: string[]): Promise<OffboardingWorkflow> {
    // Start transaction (conceptually, Supabase doesn't support direct transactions in client lib easily, so sequential)
    
    // 1. Create Workflow
    const { data: wfData, error: wfError } = await supabase
      .from('offboarding_workflows')
      .insert([{
        employee_id: workflow.employeeId,
        exit_date: workflow.exitDate,
        reason: workflow.reason,
        status: workflow.status
      }])
      .select()
      .single();

    if (wfError) throw wfError;

    // 2. Create Tasks
    const tasksToInsert = initialTasks.map(name => ({
      workflow_id: wfData.id,
      name,
      completed: false
    }));

    const { data: taskData, error: taskError } = await supabase
      .from('offboarding_tasks')
      .insert(tasksToInsert)
      .select();

    if (taskError) {
      // Ideally rollback here but ignoring for simplicity in MVP
      console.error('Error creating tasks', taskError);
    }

    return mapWorkflowFromDb(wfData, taskData || []);
  },

  async updateTaskStatus(taskId: string, completed: boolean): Promise<void> {
    const { error } = await supabase
      .from('offboarding_tasks')
      .update({ completed })
      .eq('id', taskId);
      
    if (error) throw error;
  },
  
  async updateWorkflowStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('offboarding_workflows')
      .update({ status })
      .eq('id', id);
      
    if (error) throw error;
  }
};
