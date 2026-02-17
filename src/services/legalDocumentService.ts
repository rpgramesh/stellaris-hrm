import { supabase } from '@/lib/supabase';
import { LegalDocument } from '@/types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const legalDocumentService = {
  async getAll(): Promise<LegalDocument[]> {
    const { data, error } = await supabase
      .from('legal_documents')
      .select(`
        *,
        employee:employees(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return data ? data.map(doc => ({
      id: doc.id,
      employeeId: doc.employee_id,
      employeeName: doc.employee ? `${doc.employee.first_name} ${doc.employee.last_name}` : 'Unknown',
      documentType: doc.document_type,
      documentNumber: doc.document_number,
      issueDate: doc.issue_date,
      expiryDate: doc.expiry_date,
      issuingAuthority: doc.issuing_authority,
      attachment: Array.isArray(doc.attachment) ? doc.attachment : (doc.attachment ? [doc.attachment] : []),
      remark: doc.remark
    })) : [];
  },

  async getByEmployeeId(employeeId: string): Promise<LegalDocument[]> {
    const { data, error } = await supabase
      .from('legal_documents')
      .select(`
        *,
        employee:employees(first_name, last_name)
      `)
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return data ? data.map(doc => ({
      id: doc.id,
      employeeId: doc.employee_id,
      employeeName: doc.employee ? `${doc.employee.first_name} ${doc.employee.last_name}` : 'Unknown',
      documentType: doc.document_type,
      documentNumber: doc.document_number,
      issueDate: doc.issue_date,
      expiryDate: doc.expiry_date,
      issuingAuthority: doc.issuing_authority,
      attachment: Array.isArray(doc.attachment) ? doc.attachment : (doc.attachment ? [doc.attachment] : []),
      remark: doc.remark
    })) : [];
  },

  async create(document: Omit<LegalDocument, 'id' | 'employeeName'>): Promise<LegalDocument> {
    const { data, error } = await supabase
      .from('legal_documents')
      .insert([{
        employee_id: document.employeeId,
        document_type: document.documentType,
        document_number: document.documentNumber,
        issue_date: document.issueDate || null,
        expiry_date: document.expiryDate || null,
        issuing_authority: document.issuingAuthority,
        attachment: document.attachment,
        remark: document.remark
      }])
      .select(`
        *,
        employee:employees(first_name, last_name)
      `)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      employeeId: data.employee_id,
      employeeName: data.employee ? `${data.employee.first_name} ${data.employee.last_name}` : 'Unknown',
      documentType: data.document_type,
      documentNumber: data.document_number,
      issueDate: data.issue_date,
      expiryDate: data.expiry_date,
      issuingAuthority: data.issuing_authority,
      attachment: Array.isArray(data.attachment) ? data.attachment : (data.attachment ? [data.attachment] : []),
      remark: data.remark
    };
  },

  async update(id: string, updates: Partial<LegalDocument>): Promise<LegalDocument> {
    const dbUpdates: any = {};
    if (updates.documentType) dbUpdates.document_type = updates.documentType;
    if (updates.documentNumber) dbUpdates.document_number = updates.documentNumber;
    if (updates.issueDate) dbUpdates.issue_date = updates.issueDate;
    if (updates.expiryDate) dbUpdates.expiry_date = updates.expiryDate;
    if (updates.issuingAuthority) dbUpdates.issuing_authority = updates.issuingAuthority;
    if (updates.attachment) dbUpdates.attachment = updates.attachment;
    if (updates.remark) dbUpdates.remark = updates.remark;

    const { data, error } = await supabase
      .from('legal_documents')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        employee:employees(first_name, last_name)
      `)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      employeeId: data.employee_id,
      employeeName: data.employee ? `${data.employee.first_name} ${data.employee.last_name}` : 'Unknown',
      documentType: data.document_type,
      documentNumber: data.document_number,
      issueDate: data.issue_date,
      expiryDate: data.expiry_date,
      issuingAuthority: data.issuing_authority,
      attachment: Array.isArray(data.attachment) ? data.attachment : (data.attachment ? [data.attachment] : []),
      remark: data.remark
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('legal_documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async uploadAttachments(files: File[]): Promise<string[]> {
    const uploadWithRetry = async (file: File, attempts = 3): Promise<string> => {
      let lastError: any;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `legal-documents/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (!uploadError) {
          const { data } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);
          return data.publicUrl;
        }

        lastError = uploadError;
        if (attempt < attempts) {
          await delay(300 * attempt);
        }
      }
      throw lastError;
    };

    const uploadPromises = files.map(file => uploadWithRetry(file));
    return Promise.all(uploadPromises);
  }
};
