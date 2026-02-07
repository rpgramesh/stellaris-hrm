"use client";

import { useState, useEffect } from 'react';
import { incidentsService } from '@/services/incidentsService';
import { Incident, IncidentCategory, IncidentType, IncidentDecision } from '@/types';

export default function IncidentManagementPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [categories, setCategories] = useState<IncidentCategory[]>([]);
  const [types, setTypes] = useState<IncidentType[]>([]);
  const [decisions, setDecisions] = useState<IncidentDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentIncident, setCurrentIncident] = useState<Partial<Incident>>({});
  const [viewMode, setViewMode] = useState(false); // If true, fields are read-only
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [incidentsData, categoriesData, typesData, decisionsData] = await Promise.all([
        incidentsService.getIncidents(),
        incidentsService.getCategories(),
        incidentsService.getTypes(),
        incidentsService.getDecisions()
      ]);
      setIncidents(incidentsData);
      setCategories(categoriesData);
      setTypes(typesData);
      setDecisions(decisionsData);
    } catch (error) {
      console.error('Failed to load incident data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setCurrentIncident({
      status: 'Not Started',
      isOpen: true,
      createdAt: new Date().toISOString().split('T')[0],
    });
    setViewMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = (incident: Incident) => {
    setCurrentIncident({ ...incident });
    setViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (incident: Incident) => {
    setCurrentIncident({ ...incident });
    setViewMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmation(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmation) {
      try {
        await incidentsService.deleteIncident(deleteConfirmation);
        setIncidents(incidents.filter(i => i.id !== deleteConfirmation));
        setDeleteConfirmation(null);
      } catch (error) {
        console.error('Failed to delete incident:', error);
        alert('Failed to delete incident. Please try again.');
      }
    }
  };

  const handleSave = async () => {
    try {
      if (currentIncident.id) {
        // Update
        await incidentsService.updateIncident(currentIncident as Incident);
        setIncidents(incidents.map(i => i.id === currentIncident.id ? currentIncident as Incident : i));
      } else {
        // Create
        const newIncident = await incidentsService.createIncident(currentIncident as Incident);
        setIncidents([newIncident, ...incidents]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save incident:', error);
      alert('Failed to save incident. Please try again.');
    }
  };

  // Helper to get names
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.description || id;
  const getTypeName = (id: string) => types.find(t => t.id === id)?.description || id;
  const getDecisionName = (id?: string) => decisions.find(d => d.id === id)?.name || '-';

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incident Management</h1>
          <p className="text-gray-600">Manage and track workplace incidents.</p>
        </div>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Incident
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Summary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Decision</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {incidents.map((incident) => (
              <tr key={incident.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{incident.fromDate}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{incident.summary}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getTypeName(incident.typeId)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getCategoryName(incident.categoryId)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${incident.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                      incident.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'}`}>
                    {incident.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getDecisionName(incident.decisionId)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleView(incident)} className="text-blue-600 hover:text-blue-900" title="View">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button onClick={() => handleEdit(incident)} className="text-indigo-600 hover:text-indigo-900" title="Edit">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(incident.id)} className="text-red-600 hover:text-red-900" title="Delete">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {incidents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No incidents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this incident? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit/View Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsModalOpen(false)} className="bg-blue-500 text-white rounded-full p-1 hover:bg-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </button>
                <h2 className="text-xl font-bold">Incident</h2>
              </div>
              <div className="flex items-center gap-2">
                 {/* Placeholder for 'Check' button from image */}
                 {!viewMode && (
                    <button onClick={handleSave} className="bg-green-500 text-white rounded-full p-2 hover:bg-green-600 shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </button>
                 )}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              
              {/* Category */}
              <div className="bg-white border rounded-md p-2 flex items-center gap-2 relative">
                <label className="text-gray-500 text-sm absolute -top-2 left-2 bg-white px-1">Category <span className="text-red-500">*</span></label>
                <select 
                    disabled={viewMode}
                    value={currentIncident.categoryId || ''}
                    onChange={(e) => setCurrentIncident({...currentIncident, categoryId: e.target.value})}
                    className="w-full outline-none bg-transparent pt-2"
                >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.description}</option>)}
                </select>
                <button className="text-yellow-400 hover:text-yellow-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                </button>
              </div>

              {/* Type */}
              <div className="bg-white border rounded-md p-2 flex items-center gap-2 relative">
                <label className="text-gray-500 text-sm absolute -top-2 left-2 bg-white px-1">Incident Type <span className="text-red-500">*</span></label>
                <select 
                    disabled={viewMode}
                    value={currentIncident.typeId || ''}
                    onChange={(e) => setCurrentIncident({...currentIncident, typeId: e.target.value})}
                    className="w-full outline-none bg-transparent pt-2"
                >
                    <option value="">Select Type</option>
                    {types.filter(t => !currentIncident.categoryId || t.categoryId === currentIncident.categoryId).map(t => (
                        <option key={t.id} value={t.id}>{t.description}</option>
                    ))}
                </select>
                <button className="text-yellow-400 hover:text-yellow-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                </button>
              </div>

              {/* Rule (Read Only) */}
              <div className="bg-gray-100 border rounded-md p-3 relative">
                 <label className="text-gray-500 text-xs block">Rule</label>
                 <div className="text-gray-700">{types.find(t => t.id === currentIncident.typeId)?.rule || 'N/A'}</div>
              </div>

              {/* From / To Date */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-100 border rounded-md p-2 relative flex items-center">
                    <label className="text-gray-500 text-sm absolute -top-2 left-2 bg-white px-1">From <span className="text-red-500">*</span></label>
                    <input 
                        type="date" 
                        disabled={viewMode}
                        value={currentIncident.fromDate || ''}
                        onChange={(e) => setCurrentIncident({...currentIncident, fromDate: e.target.value})}
                        className="w-full bg-transparent outline-none pt-2"
                    />
                  </div>
                  <div className="bg-gray-100 border rounded-md p-2 relative flex items-center">
                    <label className="text-gray-500 text-sm absolute -top-2 left-2 bg-white px-1">To <span className="text-red-500">*</span></label>
                    <input 
                        type="date" 
                        disabled={viewMode}
                        value={currentIncident.toDate || ''}
                        onChange={(e) => setCurrentIncident({...currentIncident, toDate: e.target.value})}
                        className="w-full bg-transparent outline-none pt-2"
                    />
                  </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-100 border rounded-md p-2 relative">
                <label className="text-gray-500 text-sm absolute -top-2 left-2 bg-white px-1">Summary <span className="text-red-500">*</span></label>
                <input 
                    type="text" 
                    disabled={viewMode}
                    value={currentIncident.summary || ''}
                    onChange={(e) => setCurrentIncident({...currentIncident, summary: e.target.value})}
                    className="w-full bg-transparent outline-none pt-2"
                />
              </div>

              {/* Story */}
              <div className="bg-gray-100 border rounded-md p-2 relative">
                <label className="text-gray-500 text-sm absolute -top-2 left-2 bg-white px-1">Story</label>
                <textarea 
                    disabled={viewMode}
                    value={currentIncident.story || ''}
                    onChange={(e) => setCurrentIncident({...currentIncident, story: e.target.value})}
                    className="w-full bg-transparent outline-none pt-2 h-24 resize-none"
                />
              </div>

              {/* Attachment */}
              <div className="bg-gray-100 border rounded-md p-2 relative flex items-center justify-between">
                <span className="text-gray-500">Attachment</span>
                <button className="text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                </button>
              </div>
              <div className="text-right text-xs text-gray-400">0 (0.0B)</div>

              {/* INVESTIGATION Section */}
              <div className="bg-gray-400 text-white p-3 rounded-md font-bold flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                 </svg>
                 INVESTIGATION
              </div>

              {/* Status */}
              <div className="bg-gray-100 border rounded-md p-2">
                 <div className="text-xs text-gray-500">Status</div>
                 <div className="text-gray-700 font-medium">{currentIncident.status || 'Not Started'}</div>
              </div>

              {/* Open & Explain By */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 border rounded-md p-3 flex items-center justify-between">
                      <span className="text-gray-700">Open</span>
                      <div 
                        onClick={() => !viewMode && setCurrentIncident({...currentIncident, isOpen: !currentIncident.isOpen})}
                        className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${currentIncident.isOpen ? 'bg-blue-500' : 'bg-gray-300'}`}
                      >
                          <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${currentIncident.isOpen ? 'translate-x-6' : 'translate-x-0'}`} />
                      </div>
                  </div>
                  <div className="bg-gray-100 border rounded-md p-2 relative flex items-center">
                    <label className="text-gray-500 text-sm absolute -top-2 left-2 bg-white px-1">Explain By</label>
                    <input 
                        type="date" 
                        disabled={viewMode}
                        value={currentIncident.explainBy || ''}
                        onChange={(e) => setCurrentIncident({...currentIncident, explainBy: e.target.value})}
                        className="w-full bg-transparent outline-none pt-2"
                    />
                  </div>
              </div>

              {/* DECISION Section */}
              <div className="bg-gray-400 text-white p-3 rounded-md font-bold flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                 </svg>
                 DECISION
              </div>

              {/* Incident Decision */}
              <div className="bg-gray-100 border rounded-md p-2 flex items-center gap-2 relative">
                <label className="text-gray-500 text-sm absolute -top-2 left-2 bg-white px-1">Incident Decision</label>
                <select 
                    disabled={viewMode}
                    value={currentIncident.decisionId || ''}
                    onChange={(e) => setCurrentIncident({...currentIncident, decisionId: e.target.value})}
                    className="w-full outline-none bg-transparent pt-2"
                >
                    <option value="">Select Decision</option>
                    {decisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <button className="text-yellow-400 hover:text-yellow-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                </button>
              </div>

              {/* Decision From / To */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-100 border rounded-md p-2 relative flex items-center">
                    <label className="text-gray-500 text-sm absolute -top-2 left-2 bg-white px-1">From</label>
                    <input 
                        type="date" 
                        disabled={viewMode}
                        value={currentIncident.decisionFrom || ''}
                        onChange={(e) => setCurrentIncident({...currentIncident, decisionFrom: e.target.value})}
                        className="w-full bg-transparent outline-none pt-2"
                    />
                  </div>
                  <div className="bg-gray-100 border rounded-md p-2 relative flex items-center">
                    <label className="text-gray-500 text-sm absolute -top-2 left-2 bg-white px-1">To</label>
                    <input 
                        type="date" 
                        disabled={viewMode}
                        value={currentIncident.decisionTo || ''}
                        onChange={(e) => setCurrentIncident({...currentIncident, decisionTo: e.target.value})}
                        className="w-full bg-transparent outline-none pt-2"
                    />
                  </div>
              </div>

              {/* MANAGEMENT Section */}
              <div className="bg-gray-400 text-white p-3 rounded-md font-bold flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                 </svg>
                 MANAGEMENT
              </div>

              {/* Remark */}
              <div className="bg-gray-100 border rounded-md p-2 relative">
                <label className="text-gray-500 text-sm absolute -top-2 left-2 bg-white px-1">Remark</label>
                <textarea 
                    disabled={viewMode}
                    value={currentIncident.managementRemark || ''}
                    onChange={(e) => setCurrentIncident({...currentIncident, managementRemark: e.target.value})}
                    className="w-full bg-transparent outline-none pt-2 h-20 resize-none"
                />
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
