
import { supabase } from '@/lib/supabase';
import { ExpenseCategory, ExpenseType, ExpenseWorkflow } from '@/types';

export const expenseSettingsService = {
  // Categories
  async getCategories(): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching expense categories:', error.message);
      return [];
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
      console.warn('Error fetching expense types:', error.message);
      return [];
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
      console.warn('Error fetching expense workflows:', error.message);
      return [];
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
