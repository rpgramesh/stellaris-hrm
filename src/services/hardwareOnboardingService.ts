import { supabase } from '@/lib/supabase';

export interface HardwareOnboardingAsset {
  id: string;
  onboardingId: string;
  assetTag: string;
  assetType: string;
  serialNumber: string;
  model: string;
  status: string;
  assetCode: string | null;
}

export interface HardwareOnboardingRecord {
  id: string;
  employeeId: string;
  clientName: string;
  clientManagerEmail: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
  remark?: string | null;
  assets: HardwareOnboardingAsset[];
}

export const hardwareOnboardingService = {
  async getLatestByEmployee(employeeId: string): Promise<HardwareOnboardingRecord | null> {
    const { data, error } = await supabase
      .from('hardware_onboarding')
      .select('*')
      .eq('employee_id', employeeId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return null;
    }

    const { data: assets, error: assetsError } = await supabase
      .from('hardware_onboarding_assets')
      .select('*')
      .eq('onboarding_id', data.id)
      .order('created_at', { ascending: true });

    if (assetsError) throw assetsError;

    return {
      id: data.id,
      employeeId: data.employee_id,
      clientName: data.client_name,
      clientManagerEmail: data.client_manager_email,
      status: data.status,
      submittedAt: data.submitted_at,
      updatedAt: data.updated_at,
      remark: data.remark,
      assets: (assets || []).map(a => ({
        id: a.id,
        onboardingId: a.onboarding_id,
        assetTag: a.asset_tag,
        assetType: a.asset_type,
        serialNumber: a.serial_number,
        model: a.model,
        status: a.status,
        assetCode: a.asset_code ?? null
      }))
    };
  },

  async hasHardwareForEmployee(employeeId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('hardware_onboarding')
      .select('id')
      .eq('employee_id', employeeId)
      .limit(1);

    if (error) throw error;
    return !!(data && data.length > 0);
  },

  async upsertForEmployee(params: {
    employeeId: string;
    clientName: string;
    clientManagerEmail: string;
    assets: {
      assetTag: string;
      assetType: string;
      serialNumber: string;
      model: string;
      status: string;
      assetCode: string;
    }[];
  }): Promise<HardwareOnboardingRecord> {
    const { employeeId, clientName, clientManagerEmail, assets } = params;

    const { data: existing, error: existingError } = await supabase
      .from('hardware_onboarding')
      .select('id')
      .eq('employee_id', employeeId)
      .order('submitted_at', { ascending: false })
      .limit(1);

    if (existingError) throw existingError;

    let onboardingId: string;

    if (existing && existing.length > 0) {
      const { data, error } = await supabase
        .from('hardware_onboarding')
        .update({
          client_name: clientName,
          client_manager_email: clientManagerEmail,
          status: 'submitted',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing[0].id)
        .select('*')
        .single();

      if (error) throw error;
      onboardingId = data.id;
    } else {
      const { data, error } = await supabase
        .from('hardware_onboarding')
        .insert({
          employee_id: employeeId,
          client_name: clientName,
          client_manager_email: clientManagerEmail,
          status: 'submitted'
        })
        .select('*')
        .single();

      if (error) throw error;
      onboardingId = data.id;
    }

    const { error: deleteError } = await supabase
      .from('hardware_onboarding_assets')
      .delete()
      .eq('onboarding_id', onboardingId);

    if (deleteError) throw deleteError;

    if (assets.length > 0) {
      const insertPayload = assets.map(a => ({
        onboarding_id: onboardingId,
        asset_tag: a.assetTag,
        asset_type: a.assetType,
        serial_number: a.serialNumber,
        model: a.model,
        status: a.status,
        asset_code: a.assetCode
      }));

      const { error: insertError } = await supabase
        .from('hardware_onboarding_assets')
        .insert(insertPayload);

      if (insertError) throw insertError;
    }

    return this.getLatestByEmployee(employeeId) as Promise<HardwareOnboardingRecord>;
  }
};

