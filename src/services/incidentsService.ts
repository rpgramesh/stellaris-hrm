import { supabase } from '@/lib/supabase';
import { Incident, IncidentCategory, IncidentType, IncidentDecision } from '@/types';

export const incidentsService = {
  async getIncidents(): Promise<Incident[]> {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching incidents:', error);
      return [];
    }

    return data.map(mapIncidentFromDb);
  },

  async getCategories(activeOnly = true): Promise<IncidentCategory[]> {
    let query = supabase
      .from('incident_categories')
      .select('*');

    if (activeOnly) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching incident categories:', error);
      return [];
    }

    return data.map(mapCategoryFromDb);
  },

  async createCategory(category: Omit<IncidentCategory, 'id'>): Promise<IncidentCategory> {
    const { data, error } = await supabase
      .from('incident_categories')
      .insert({
        code: category.code,
        description: category.description,
        active: category.active,
        color: category.color,
        allow_causeless: category.allowCauseless,
        reporter_allowed: category.reporterAllowed,
        investigation_access: category.investigationAccess,
        team_access: category.teamAccess,
        custom_role_access: category.customRoleAccess,
      })
      .select()
      .single();

    if (error) throw error;
    return mapCategoryFromDb(data);
  },

  async updateCategory(id: string, category: Partial<IncidentCategory>): Promise<IncidentCategory> {
    const updates: any = {};
    if (category.code !== undefined) updates.code = category.code;
    if (category.description !== undefined) updates.description = category.description;
    if (category.active !== undefined) updates.active = category.active;
    if (category.color !== undefined) updates.color = category.color;
    if (category.allowCauseless !== undefined) updates.allow_causeless = category.allowCauseless;
    if (category.reporterAllowed !== undefined) updates.reporter_allowed = category.reporterAllowed;
    if (category.investigationAccess !== undefined) updates.investigation_access = category.investigationAccess;
    if (category.teamAccess !== undefined) updates.team_access = category.teamAccess;
    if (category.customRoleAccess !== undefined) updates.custom_role_access = category.customRoleAccess;

    const { data, error } = await supabase
      .from('incident_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapCategoryFromDb(data);
  },

  async getTypes(): Promise<IncidentType[]> {
    const { data, error } = await supabase
      .from('incident_types')
      .select('*')
      .eq('active', true);

    if (error) {
      console.error('Error fetching incident types:', error);
      return [];
    }

    return data.map(mapTypeFromDb);
  },

  async getDecisions(): Promise<IncidentDecision[]> {
    const { data, error } = await supabase
      .from('incident_decisions')
      .select('*');

    if (error) {
      console.error('Error fetching incident decisions:', error);
      return [];
    }

    return data.map(mapDecisionFromDb);
  },

  async createIncident(incident: Omit<Incident, 'id'>) {
    const { data, error } = await supabase
      .from('incidents')
      .insert({
        category_id: incident.categoryId,
        type_id: incident.typeId,
        from_date: incident.fromDate,
        to_date: incident.toDate,
        summary: incident.summary,
        story: incident.story,
        attachment: incident.attachment,
        status: incident.status,
        is_open: incident.isOpen,
        explain_by: incident.explainBy,
        decision_id: incident.decisionId,
        decision_from: incident.decisionFrom,
        decision_to: incident.decisionTo,
        management_remark: incident.managementRemark,
        created_by: incident.createdBy,
        created_at: incident.createdAt
      })
      .select()
      .single();

    if (error) throw error;
    return mapIncidentFromDb(data);
  },

  async updateIncident(incident: Incident) {
    const { error } = await supabase
      .from('incidents')
      .update({
        category_id: incident.categoryId,
        type_id: incident.typeId,
        from_date: incident.fromDate,
        to_date: incident.toDate,
        summary: incident.summary,
        story: incident.story,
        attachment: incident.attachment,
        status: incident.status,
        is_open: incident.isOpen,
        explain_by: incident.explainBy,
        decision_id: incident.decisionId,
        decision_from: incident.decisionFrom,
        decision_to: incident.decisionTo,
        management_remark: incident.managementRemark,
      })
      .eq('id', incident.id);

    if (error) throw error;
  },

  async deleteIncident(id: string) {
    const { error } = await supabase
      .from('incidents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

function mapIncidentFromDb(data: any): Incident {
  return {
    id: data.id,
    categoryId: data.category_id,
    typeId: data.type_id,
    fromDate: data.from_date,
    toDate: data.to_date,
    summary: data.summary,
    story: data.story,
    attachment: data.attachment,
    status: data.status,
    isOpen: data.is_open,
    explainBy: data.explain_by,
    decisionId: data.decision_id,
    decisionFrom: data.decision_from,
    decisionTo: data.decision_to,
    managementRemark: data.management_remark,
    createdBy: data.created_by,
    createdAt: data.created_at
  };
}

function mapCategoryFromDb(data: any): IncidentCategory {
  return {
    id: data.id,
    code: data.code,
    description: data.description,
    active: data.active,
    color: data.color,
    allowCauseless: data.allow_causeless,
    reporterAllowed: data.reporter_allowed,
    investigationAccess: data.investigation_access,
    teamAccess: data.team_access || {},
    customRoleAccess: data.custom_role_access || []
  };
}

function mapTypeFromDb(data: any): IncidentType {
  return {
    id: data.id,
    code: data.code,
    description: data.description,
    active: data.active,
    categoryId: data.category_id,
    weight: data.weight,
    rule: data.rule
  };
}

function mapDecisionFromDb(data: any): IncidentDecision {
  return {
    id: data.id,
    name: data.name
  };
}
