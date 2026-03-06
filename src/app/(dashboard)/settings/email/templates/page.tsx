'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { emailService, EmailType, EmailTemplate, EmailTemplateAssignment } from '@/services/emailService';
import { Save, Eye, AlertCircle, CheckCircle2, Loader2, Mail, Info, ArrowLeft, Plus, X, Trash2, Pencil } from 'lucide-react';

export default function EmailTemplatesConfigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [assignments, setAssignments] = useState<EmailTemplateAssignment[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Template Editing State
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    body: '',
    category: 'General',
    variables: [] as string[]
  });
  const [variablesInput, setVariablesInput] = useState('');

  const emailTypes = emailService.getEmailTypes();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all templates
      const tplData = await emailService.getAllTemplates();
      setTemplates(tplData);

      // Fetch current assignments
      const assignData = await emailService.getTemplateAssignments();
      setAssignments(assignData);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (emailType: EmailType, templateId: string) => {
    try {
      setProcessing(emailType);
      setError(null);
      setSuccess(null);
      
      await emailService.assignTemplate(emailType, templateId);
      
      // Update local state
      const updatedAssignments = await emailService.getTemplateAssignments();
      setAssignments(updatedAssignments);
      
      setSuccess(`Template assigned successfully for ${emailType}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error assigning template:', err);
      setError(err.message || 'Failed to assign template');
    } finally {
      setProcessing(null);
    }
  };

  const handleToggleEnabled = async (emailType: EmailType, currentEnabled: boolean) => {
    try {
      setProcessing(`toggle-${emailType}`);
      setError(null);
      
      await emailService.toggleEmailTypeEnabled(emailType, !currentEnabled);
      
      // Update local state
      const updatedAssignments = await emailService.getTemplateAssignments();
      setAssignments(updatedAssignments);
      
      setSuccess(`${emailType} email ${!currentEnabled ? 'enabled' : 'disabled'} successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error toggling email status:', err);
      setError(err.message || 'Failed to toggle email status');
    } finally {
      setProcessing(null);
    }
  };

  const handleCreateOrUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcessing(editingTemplate ? 'updating' : 'creating');
      setError(null);
      
      const vars = variablesInput.split(',').map(v => v.trim()).filter(Boolean);
      const templateData = {
        name: newTemplate.name,
        subject: newTemplate.subject,
        body: newTemplate.body,
        category: newTemplate.category,
        variables: vars
      };

      if (editingTemplate) {
        await emailService.updateTemplate(editingTemplate.id, templateData);
        setSuccess('Template updated successfully');
      } else {
        await emailService.createTemplate(templateData);
        setSuccess('Template created successfully');
      }
      
      setIsAddingTemplate(false);
      setEditingTemplate(null);
      setNewTemplate({
        name: '',
        subject: '',
        body: '',
        category: 'General',
        variables: []
      });
      setVariablesInput('');
      
      // Refresh data
      await fetchData();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving template:', err);
      setError(err.message || `Failed to ${editingTemplate ? 'update' : 'create'} template`);
    } finally {
      setProcessing(null);
    }
  };

  const handleEditClick = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setNewTemplate({
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category,
      variables: template.variables
    });
    setVariablesInput(template.variables.join(', '));
    setIsAddingTemplate(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template? Any assignments using this template will be cleared.')) return;
    
    try {
      setProcessing('deleting');
      await emailService.deleteTemplate(id);
      setSuccess('Template deleted successfully');
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error deleting template:', err);
      setError(err.message || 'Failed to delete template');
    } finally {
      setProcessing(null);
    }
  };

  const getAssignedTemplateId = (emailType: EmailType) => {
    return assignments.find(a => a.email_type === emailType)?.template_id || '';
  };

  const renderPreview = () => {
    if (!previewTemplate) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Template Preview: {previewTemplate.name}
            </h3>
            <button 
              onClick={() => setPreviewTemplate(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Subject</label>
              <div className="p-3 bg-gray-50 rounded-lg border font-medium">{previewTemplate.subject}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Body</label>
              <div className="p-4 bg-gray-50 rounded-lg border whitespace-pre-wrap font-mono text-sm leading-relaxed min-h-[200px]">
                {previewTemplate.body}
              </div>
            </div>
            {previewTemplate.variables && previewTemplate.variables.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Available Variables</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {previewTemplate.variables.map((v: string) => (
                    <span key={v} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded border border-blue-100">
                      {'{{'}{v}{'}}'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="p-6 border-t bg-gray-50 flex justify-end">
            <button
              onClick={() => setPreviewTemplate(null)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCreateModal = () => {
    if (!isAddingTemplate) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              {editingTemplate ? <Save className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
              {editingTemplate ? 'Edit Email Template' : 'Create New Email Template'}
            </h3>
            <button 
              onClick={() => {
                setIsAddingTemplate(false);
                setEditingTemplate(null);
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
          </div>
          <form onSubmit={handleCreateOrUpdateTemplate} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
              <input
                type="text"
                required
                value={newTemplate.name}
                onChange={e => setNewTemplate({...newTemplate, name: e.target.value})}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g. Standard Welcome Email"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newTemplate.category}
                  onChange={e => setNewTemplate({...newTemplate, category: e.target.value})}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="Onboarding">Onboarding</option>
                  <option value="Payroll">Payroll</option>
                  <option value="Leave">Leave</option>
                  <option value="Performance">Performance</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Variables (comma separated)</label>
                <input
                  type="text"
                  value={variablesInput}
                  onChange={e => setVariablesInput(e.target.value)}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="fullName, username, loginUrl"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
              <input
                type="text"
                required
                value={newTemplate.subject}
                onChange={e => setNewTemplate({...newTemplate, subject: e.target.value})}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Subject line with {{variable}} placeholders"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Body</label>
              <textarea
                required
                rows={8}
                value={newTemplate.body}
                onChange={e => setNewTemplate({...newTemplate, body: e.target.value})}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono"
                placeholder="Email body content with {{variable}} placeholders..."
              />
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsAddingTemplate(false);
                  setEditingTemplate(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing === 'creating' || processing === 'updating'}
                className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-lg font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {(processing === 'creating' || processing === 'updating') ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingTemplate ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingTemplate ? 'Save Changes' : 'Create Template'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-gray-500 font-medium">Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Go Back"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <Mail className="h-8 w-8 text-blue-600" />
              Email Template Configuration
            </h1>
            <p className="mt-1 text-gray-600 text-lg">
              Map system email types to your customized templates.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsAddingTemplate(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-lg font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors gap-2"
        >
          <Plus className="h-5 w-5" />
          New Template
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
          <div className="text-red-700 font-medium">{error}</div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-md flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5" />
          <div className="text-green-700 font-medium">{success}</div>
        </div>
      )}

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Email Type
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Assigned Template
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {emailTypes.map((type) => {
                const assignment = assignments.find(a => a.email_type === type);
                const assignedId = assignment?.template_id || '';
                const assignedTemplate = templates.find(t => t.id === assignedId);
                const isEnabled = assignment?.is_enabled !== false;
                
                // Simple validation check
                const expectedVars: string[] = [];
                if (type === 'WELCOME') expectedVars.push('fullName', 'username', 'temporaryPassword', 'changePasswordUrl');
                if (type === 'PASSWORD_RESET') expectedVars.push('fullName', 'resetLink');
                if (type === 'PAYSLIP_NOTIFICATION') expectedVars.push('fullName', 'periodStart', 'periodEnd', 'netPay');
                
                const validation = assignedTemplate ? emailService.validateTemplateContent(assignedTemplate.subject, assignedTemplate.body, expectedVars) : { missing: [] };
                
                return (
                  <tr key={type} className={`transition-colors ${!isEnabled ? 'bg-gray-50 opacity-75' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold font-mono px-2 py-1 rounded border w-fit ${
                          !isEnabled ? 'bg-gray-200 text-gray-500 border-gray-300' : 'bg-gray-100 text-gray-900 border-gray-200'
                        }`}>
                          {type}
                        </span>
                        {isEnabled && assignedTemplate && validation.missing.length > 0 && (
                          <span className="text-[10px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Missing: {validation.missing.join(', ')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className={`text-sm ${!isEnabled ? 'text-gray-400' : 'text-gray-600'}`}>
                        {type === 'WELCOME' && 'Sent to new employees with their login credentials.'}
                        {type === 'PASSWORD_RESET' && 'Sent when a user requests a password reset link.'}
                        {type === 'PAYSLIP_NOTIFICATION' && 'Notification that a new payslip is available.'}
                        {type === 'LEAVE_REQUEST_APPROVAL' && 'Sent when a leave request is approved.'}
                        {type === 'LEAVE_REQUEST_REJECTION' && 'Sent when a leave request is rejected.'}
                        {type === 'DOCUMENT_SUBMISSION_REMINDER' && 'Reminder to upload missing compliance documents.'}
                        {type === 'PERFORMANCE_REVIEW_NOTIFICATION' && 'Notification of an upcoming performance review.'}
                        {type === 'POLICY_UPDATE_NOTIFICATION' && 'Alert about updated company policies.'}
                        {type === 'ACCOUNT_CREATION' && 'Sent when an employee account is created.'}
                        {type === 'JOB_APPLICATION_RECEIVED' && 'Confirmation to candidates after applying.'}
                        {type === 'INTERVIEW_INVITATION' && 'Sent to candidates invited for an interview.'}
                        {type === 'INTERVIEW_REJECTION' && 'Sent to candidates who were not selected.'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={assignedId}
                        onChange={(e) => handleAssign(type, e.target.value)}
                        disabled={processing === type || !isEnabled}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-400 transition-all cursor-pointer"
                      >
                        <option value="">Select a template...</option>
                        {templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name} ({tpl.category})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleEnabled(type, isEnabled)}
                        disabled={processing === `toggle-${type}`}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span className="sr-only">{isEnabled ? 'Disable' : 'Enable'} {type}</span>
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-3">
                        {assignedTemplate && (
                          <>
                            <button
                              onClick={() => handleEditClick(assignedTemplate)}
                              disabled={!isEnabled}
                              className={`inline-flex items-center gap-1 p-2 rounded-lg transition-all ${
                                !isEnabled 
                                  ? 'text-gray-300 cursor-not-allowed' 
                                  : 'text-blue-600 hover:text-blue-900 hover:bg-blue-50'
                              }`}
                              title={isEnabled ? "Edit Template" : "Template disabled"}
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setPreviewTemplate(assignedTemplate)}
                              disabled={!isEnabled}
                              className={`inline-flex items-center gap-1 p-2 rounded-lg transition-all ${
                                !isEnabled 
                                  ? 'text-gray-300 cursor-not-allowed' 
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                              title={isEnabled ? "Preview Template" : "Template disabled"}
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(assignedTemplate.id)}
                              disabled={!isEnabled}
                              className={`inline-flex items-center gap-1 p-2 rounded-lg transition-all ${
                                !isEnabled 
                                  ? 'text-gray-300 cursor-not-allowed' 
                                  : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                              }`}
                              title={isEnabled ? "Delete Template" : "Template disabled"}
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        {(processing === type || processing === `toggle-${type}`) ? (
                          <Loader2 className="h-5 w-5 text-blue-600 animate-spin m-2" />
                        ) : (
                          <div className="w-9 h-9" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex items-start gap-4 shadow-sm">
        <div className="bg-blue-100 p-2 rounded-lg">
          <Info className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h4 className="text-lg font-semibold text-blue-900">Dynamic Templates Note</h4>
          <p className="mt-1 text-blue-800 text-sm leading-relaxed">
            Changing these assignments will immediately update which template is sent for each email type. 
            Ensure your templates contain the required variables for the selected email type. 
            Variables like <code className="bg-blue-100 px-1 rounded font-mono">{'{{fullName}}'}</code> are standard across most types.
          </p>
        </div>
      </div>

      {renderPreview()}
      {renderCreateModal()}
    </div>
  );
}
