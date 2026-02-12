import { supabase } from '@/lib/supabase';
import { Project } from '@/types';

export const projectService = {
  async getAll(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return (data || []).map(p => ({
      ...p,
      managerId: p.manager_id
    }));
  },

  async create(project: Omit<Project, 'id'>): Promise<Project> {
    const dbPayload = {
      name: project.name,
      code: project.code,
      color: project.color,
      description: project.description,
      active: project.active,
      manager_id: project.managerId
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(dbPayload)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      managerId: data.manager_id
    };
  },

  async update(id: string, updates: Partial<Project>): Promise<Project> {
    const dbPayload: any = { ...updates };
    if (updates.managerId !== undefined) {
      dbPayload.manager_id = updates.managerId;
      delete dbPayload.managerId;
    }

    const { data, error } = await supabase
      .from('projects')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      managerId: data.manager_id
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
