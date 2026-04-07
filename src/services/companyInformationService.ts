import { supabase } from '@/lib/supabase';
import { CompanyInformation } from '../types';

export const companyInformationService = {
  async get(): Promise<CompanyInformation | null> {
    const { data, error } = await supabase
      .from('company_information')
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }
    
    return data ? {
      id: data.id,
      companyName: data.company_name,
      registrationNumber: data.registration_number,
      address: data.address,
      phone: data.phone,
      email: data.email,
      website: data.website,
      taxId: data.tax_id,
      primaryContact: data.primary_contact,
      foundedYear: data.founded_year,
      updatedAt: data.updated_at
    } : null;
  },

  async update(info: Partial<CompanyInformation>): Promise<CompanyInformation> {
    // Map camelCase to snake_case for DB
    const dbData: any = {};
    if (info.companyName !== undefined) dbData.company_name = info.companyName;
    if (info.registrationNumber !== undefined) dbData.registration_number = info.registrationNumber;
    if (info.address !== undefined) dbData.address = info.address;
    if (info.phone !== undefined) dbData.phone = info.phone;
    if (info.email !== undefined) dbData.email = info.email;
    if (info.website !== undefined) dbData.website = info.website;
    if (info.taxId !== undefined) dbData.tax_id = info.taxId;
    if (info.primaryContact !== undefined) dbData.primary_contact = info.primaryContact;
    if (info.foundedYear !== undefined) dbData.founded_year = info.foundedYear;

    // Check if record exists
    const existing = await this.get();

    let data, error;
    
    if (existing) {
      const result = await supabase
        .from('company_information')
        .update(dbData)
        .eq('id', existing.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from('company_information')
        .insert([dbData])
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;
    
    return {
      id: data.id,
      companyName: data.company_name,
      registrationNumber: data.registration_number,
      address: data.address,
      phone: data.phone,
      email: data.email,
      website: data.website,
      taxId: data.tax_id,
      primaryContact: data.primary_contact,
      foundedYear: data.founded_year,
      updatedAt: data.updated_at
    };
  }
};
