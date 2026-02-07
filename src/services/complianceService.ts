import { supabase } from '@/lib/supabase';
import { ComplianceItem, ComplianceChecklist, ComplianceChecklistItem } from '@/types';

export const complianceService = {
  async getComplianceItems(): Promise<ComplianceItem[]> {
    const { data, error } = await supabase
      .from('compliance_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching compliance items:', error);
      return [];
    }

    return data.map(mapComplianceItemFromDb);
  },

  async getNESChecklists(): Promise<ComplianceChecklist[]> {
    // Fetch checklists
    const { data: checklistsData, error: checklistsError } = await supabase
      .from('compliance_checklists')
      .select('*')
      .order('standard', { ascending: true });

    if (checklistsError) {
      console.error('Error fetching compliance checklists:', checklistsError);
      return [];
    }

    if (!checklistsData || checklistsData.length === 0) {
      return [];
    }

    // Fetch items for these checklists
    const checklistIds = checklistsData.map(c => c.id);
    const { data: itemsData, error: itemsError } = await supabase
      .from('compliance_checklist_items')
      .select('*')
      .in('checklist_id', checklistIds);

    if (itemsError) {
      console.error('Error fetching compliance checklist items:', itemsError);
      // Return checklists without items if items fetch fails
      return checklistsData.map(c => ({
        id: c.id,
        standard: c.standard,
        items: [],
        lastUpdated: new Date(c.updated_at).toLocaleDateString()
      }));
    }

    // Map items to checklists
    return checklistsData.map(checklist => {
      const items = itemsData
        .filter(item => item.checklist_id === checklist.id)
        .map(mapChecklistItemFromDb);
      
      return {
        id: checklist.id,
        standard: checklist.standard,
        items: items,
        lastUpdated: new Date(checklist.updated_at).toLocaleDateString()
      };
    });
  },

  async updateComplianceItemStatus(id: string, status: string) {
    const { error } = await supabase
      .from('compliance_items')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }
};

function mapComplianceItemFromDb(data: any): ComplianceItem {
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    category: data.category,
    status: data.status,
    lastChecked: new Date(data.last_checked).toLocaleDateString(),
    nextCheckDue: data.next_check_due ? new Date(data.next_check_due).toLocaleDateString() : '',
    assignee: data.assignee,
    priority: data.priority,
    notes: data.notes
  };
}

function mapChecklistItemFromDb(data: any): ComplianceChecklistItem {
  return {
    id: data.id,
    question: data.question,
    isCompliant: data.is_compliant,
    notes: data.notes
  };
}
