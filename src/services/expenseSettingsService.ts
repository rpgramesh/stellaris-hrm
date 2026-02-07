
import { supabase } from '@/lib/supabase';
import { ExpenseCategory, ExpenseType, ExpenseWorkflow } from '@/types';

// Fallback data since tables cannot be created in read-only mode
const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat-travel', name: 'Travel', description: 'Business travel expenses', limit: 5000 },
  { id: 'cat-office', name: 'Office Supplies', description: 'Stationery and equipment', limit: 1000 },
  { id: 'cat-meals', name: 'Meals & Entertainment', description: 'Client meetings', limit: 500 },
  { id: 'cat-training', name: 'Training', description: 'Courses and certifications', limit: 2000 }
];

const DEFAULT_TYPES: ExpenseType[] = [
  { id: 'type-receipt', name: 'Receipt', description: 'Standard receipt' },
  { id: 'type-invoice', name: 'Invoice', description: 'Tax invoice' },
  { id: 'type-perdiem', name: 'Per Diem', description: 'Daily allowance' },
  { id: 'type-mileage', name: 'Mileage', description: 'Vehicle mileage' }
];

const DEFAULT_WORKFLOWS: ExpenseWorkflow[] = [
  { id: 'wf-standard', name: 'Standard Approval', steps: ['Manager', 'Finance'] },
  { id: 'wf-executive', name: 'Executive Approval', steps: ['Director', 'CFO'] },
  { id: 'wf-auto', name: 'Auto Approval', steps: [] }
];

export const expenseSettingsService = {
  // Categories
  async getCategories(): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching expense categories (using fallback):', error.message);
      return DEFAULT_CATEGORIES;
    }

    return data.map(mapCategoryFromDb);
  },

  async createCategory(category: Omit<ExpenseCategory, 'id'>): Promise<ExpenseCategory> {
    const { data, error } = await supabase
      .from('expense_categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return mapCategoryFromDb(data);
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Types
  async getTypes(): Promise<ExpenseType[]> {
    const { data, error } = await supabase
      .from('expense_types')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching expense types (using fallback):', error.message);
      return DEFAULT_TYPES;
    }

    return data.map(mapTypeFromDb);
  },

  async createType(type: Omit<ExpenseType, 'id'>): Promise<ExpenseType> {
    const { data, error } = await supabase
      .from('expense_types')
      .insert(type)
      .select()
      .single();

    if (error) throw error;
    return mapTypeFromDb(data);
  },

  async deleteType(id: string): Promise<void> {
    const { error } = await supabase
      .from('expense_types')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Workflows
  async getWorkflows(): Promise<ExpenseWorkflow[]> {
    const { data, error } = await supabase
      .from('expense_workflows')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching expense workflows (using fallback):', error.message);
      return DEFAULT_WORKFLOWS;
    }

    return data.map(mapWorkflowFromDb);
  },

  async createWorkflow(workflow: Omit<ExpenseWorkflow, 'id'>): Promise<ExpenseWorkflow> {
    const { data, error } = await supabase
      .from('expense_workflows')
      .insert(workflow)
      .select()
      .single();

    if (error) throw error;
    return mapWorkflowFromDb(data);
  },

  async deleteWorkflow(id: string): Promise<void> {
    const { error } = await supabase
      .from('expense_workflows')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

function mapCategoryFromDb(data: any): ExpenseCategory {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    limit: data.limit
  };
}

function mapTypeFromDb(data: any): ExpenseType {
  return {
    id: data.id,
    name: data.name,
    description: data.description
  };
}

function mapWorkflowFromDb(data: any): ExpenseWorkflow {
  return {
    id: data.id,
    name: data.name,
    steps: data.steps || []
  };
}
