'use client';

import { useState, useEffect, useRef } from 'react';
import { LegalDocument, Employee, DocumentCategory } from '@/types';
import { legalDocumentService } from '@/services/legalDocumentService';
import { employeeService } from '@/services/employeeService';
import { documentCategoryService } from '@/services/documentCategoryService';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [documentCategories, setDocumentCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // New Category State
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [employeesData, documentsData, categoriesData] = await Promise.all([
          employeeService.getAll(),
          legalDocumentService.getAll(),
          documentCategoryService.getAll()
        ]);
        setEmployees(employeesData);
        setDocuments(documentsData);
        setDocumentCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Form State
  const [formData, setFormData] = useState<Partial<LegalDocument>>({
    documentType: '',
    documentNumber: '',
    issueDate: '',
    expiryDate: '',
    issuingAuthority: '',
    remark: ''
  });

  const handleView = (doc: LegalDocument) => {
    setFormData(doc);
    setEditingId(doc.id);
    setIsViewing(true);
    setIsAdding(true);
    setSelectedFiles([]);
  };

  const handleEdit = (doc: LegalDocument) => {
    setFormData(doc);
    setEditingId(doc.id);
    setIsViewing(false);
    setIsAdding(true);
    setSelectedFiles([]);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await legalDocumentService.delete(id);
        setDocuments(prev => prev.filter(d => d.id !== id));
      } catch (error) {
        console.error('Failed to delete document:', error);
        alert('Failed to delete document. Please try again.');
      }
    }
  };

  const handleAddItem = () => {
    setShowCategoryInput(true);
    setNewCategoryName('');
  };

  const saveCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const newCategory = await documentCategoryService.create({ name: newCategoryName });
      setDocumentCategories(prev => [...prev, newCategory]);
      setFormData(prev => ({ ...prev, documentType: newCategory.name }));
      setShowCategoryInput(false);
    } catch (error) {
      console.error('Error adding document category:', error);
      alert('Failed to add document category');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (index: number) => {
    const currentAttachments = formData.attachment || [];
    const newAttachments = currentAttachments.filter((_, i) => i !== index);
    setFormData({ ...formData, attachment: newAttachments });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewing) return;

    setUploading(true);
    const employee = employees.find(e => e.id === formData.employeeId);
    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';

    try {
      let attachmentUrls: string[] = formData.attachment || [];

      if (selectedFiles.length > 0) {
        const newUrls = await legalDocumentService.uploadAttachments(selectedFiles);
        attachmentUrls = [...attachmentUrls, ...newUrls];
      }

      if (editingId) {
        const updatedDoc = await legalDocumentService.update(editingId, { ...formData, attachment: attachmentUrls });
        setDocuments(prev => prev.map(d => d.id === editingId ? {
          ...updatedDoc,
          employeeName // Ensure employeeName is preserved or updated
        } : d));
      } else {
        const newDocument = await legalDocumentService.create({
          employeeId: formData.employeeId || '',
          documentType: formData.documentType || '',
          documentNumber: formData.documentNumber || '',
          issueDate: formData.issueDate || '',
          expiryDate: formData.expiryDate || '',
          issuingAuthority: formData.issuingAuthority,
          remark: formData.remark,
          attachment: attachmentUrls
        });
        setDocuments([newDocument, ...documents]);
      }
      setIsAdding(false);
      setEditingId(null);
      resetForm();
    } catch (error) {
      console.error('Failed to save document:', error);
      alert(`Failed to save document: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      documentType: '',
      documentNumber: '',
      issueDate: '',
      expiryDate: '',
      issuingAuthority: '',
      remark: ''
    });
    setSelectedFiles([]);
  };

  if (loading) return <div>Loading...</div>;

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <h3 className="font-bold">Error Loading Data</h3>
        <p>{error}</p>
        <p className="text-sm mt-2">
          If this is a new feature, you may need to apply database migrations:
          <code className="block bg-red-100 p-2 mt-1 rounded">supabase db push</code>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Legal Documents</h1>
          <p className="text-gray-500">Manage employee legal documents.</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setIsViewing(false);
            resetForm();
            setIsAdding(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Document
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-bold text-gray-900">
                {isViewing ? 'View Document' : (editingId ? 'Edit Document' : 'Add Document')}
              </h3>
              <button
                onClick={() => setIsAdding(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                  disabled={isViewing}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
                <div className="flex gap-2">
                  <select
                    required
                    disabled={isViewing}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.documentType}
                    onChange={(e) => setFormData({...formData, documentType: e.target.value})}
                  >
                    <option value="">Select Type</option>
                    {documentCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                  {!isViewing && (
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="bg-yellow-400 p-2 rounded-md hover:bg-yellow-500 text-white"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Document Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Number *</label>
                <input
                  type="text"
                  required
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({...formData, documentNumber: e.target.value})}
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date *</label>
                  <input
                    type="date"
                    required
                    disabled={isViewing}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({...formData, issueDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    disabled={isViewing}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                  />
                </div>
              </div>

              {/* Issuing Authority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Authority</label>
                <input
                  type="text"
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  value={formData.issuingAuthority || ''}
                  onChange={(e) => setFormData({...formData, issuingAuthority: e.target.value})}
                />
              </div>

              {/* Attachment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  multiple
                />
                
                <div className="space-y-2">
                  {/* Existing Attachments */}
                  {formData.attachment && formData.attachment.map((url, index) => (
                     <div key={`existing-${index}`} className="border rounded-md p-2 flex items-center justify-between bg-gray-50">
                        <span className="text-gray-500 text-sm truncate max-w-[200px]">
                          {/* Try to extract filename, fallback to generic */}
                          {url.split('/').pop() || `Document ${index + 1}`}
                        </span>
                        <div className="flex items-center gap-2">
                           <a 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              View
                            </a>
                            {!isViewing && (
                              <button
                                type="button"
                                onClick={() => removeExistingAttachment(index)}
                                className="text-red-500 hover:text-red-700"
                                title="Remove attachment"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                        </div>
                     </div>
                  ))}

                  {/* Selected New Files */}
                  {selectedFiles.map((file, index) => (
                    <div key={`new-${index}`} className="border rounded-md p-2 flex items-center justify-between bg-white">
                      <span className="text-gray-500 text-sm truncate max-w-[200px]">
                        {file.name}
                      </span>
                      <div className="flex items-center gap-2">
                         <span className="text-xs text-gray-400">New</span>
                         {!isViewing && (
                            <button
                              type="button"
                              onClick={() => removeSelectedFile(index)}
                              className="text-red-500 hover:text-red-700"
                              title="Remove file"
                            >
                               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                         )}
                      </div>
                    </div>
                  ))}

                  {/* Add Button */}
                  {!isViewing && (
                     <button 
                        type="button" 
                        disabled={uploading} 
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Add Attachment
                      </button>
                  )}
                  {uploading && <span className="text-xs text-blue-500 ml-2">Uploading...</span>}
                </div>
              </div>

              {/* Remark */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remark (200 characters max)</label>
                <textarea
                  maxLength={200}
                  disabled={isViewing}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 disabled:bg-gray-100"
                  rows={3}
                  value={formData.remark || ''}
                  onChange={(e) => setFormData({...formData, remark: e.target.value})}
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                {!isViewing && (
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    {editingId ? 'Update' : 'Save'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryInput && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-[60] flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg shadow-xl w-80">
            <h4 className="font-bold text-lg mb-3">New Document Type</h4>
            <input
              type="text"
              className="w-full border border-gray-300 rounded p-2 mb-3"
              placeholder="Enter type name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCategoryInput(false)}
                className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={saveCategory}
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issuing Authority</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{doc.employeeName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.documentType}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.documentNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.expiryDate}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.issuingAuthority || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleView(doc)}
                      className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded"
                      title="View"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(doc)}
                      className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
