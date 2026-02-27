import { supabase } from '@/lib/supabase';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export const emailTemplateService = {
  async getAll(): Promise<EmailTemplate[]> {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<EmailTemplate | null> {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<EmailTemplate> {
    const { data, error } = await supabase
      .from('email_templates')
      .insert([template])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>>): Promise<EmailTemplate> {
    const { data, error } = await supabase
      .from('email_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
