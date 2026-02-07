import { supabase } from '@/lib/supabase';
import { DocumentCategory } from '@/types';

export const documentCategoryService = {
  async getAll(): Promise<DocumentCategory[]> {
    const { data, error } = await supabase
      .from('document_categories')
      .select('*')
      .order('name');
      
    if (error) throw error;
    return data || [];
  },

  async create(category: Omit<DocumentCategory, 'id'>): Promise<DocumentCategory> {
    const { data, error } = await supabase
      .from('document_categories')
      .insert([category])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<DocumentCategory>): Promise<DocumentCategory> {
    const { data, error } = await supabase
      .from('document_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('document_categories')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};
