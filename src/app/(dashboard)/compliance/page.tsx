"use client";

import { useState, useEffect } from 'react';
import { complianceService } from '@/services/complianceService';
import { ComplianceCategory, ComplianceStatus, ComplianceItem, ComplianceChecklist } from '@/types';

export default function CompliancePage() {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [nesChecklists, setNesChecklists] = useState<ComplianceChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChecklist, setExpandedChecklist] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ComplianceStatus | 'All'>('All');
  const [filterCategory, setFilterCategory] = useState<ComplianceCategory | 'All'>('All');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsData, checklistsData] = await Promise.all([
        complianceService.getComplianceItems(),
        complianceService.getNESChecklists()
      ]);
      setItems(itemsData);
      setNesChecklists(checklistsData);
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const statusMatch = filterStatus === 'All' || item.status === filterStatus;
    const categoryMatch = filterCategory === 'All' || item.category === filterCategory;
    return statusMatch && categoryMatch;
  });

  const compliantCount = items.filter(i => i.status === 'Compliant').length;
  const atRiskCount = items.filter(i => i.status === 'At Risk').length;
  const nonCompliantCount = items.filter(i => i.status === 'Non-Compliant').length;
  const pendingCount = items.filter(i => i.status === 'Pending Review').length;
  const complianceRate = Math.round((compliantCount / items.length) * 100);

  const getStatusColor = (status: ComplianceStatus) => {
    switch (status) {
      case 'Compliant': return 'bg-green-100 text-green-800 border-green-200';
      case 'Non-Compliant': return 'bg-red-100 text-red-800 border-red-200';
      case 'At Risk': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Pending Review': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-600 font-medium';
      case 'Medium': return 'text-yellow-600 font-medium';
      case 'Low': return 'text-green-600 font-medium';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Management</h1>
          <p className="text-gray-500">Monitor Fair Work Act, NES, and Modern Award obligations.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Requirement
        </button>
      </div>

      {/* Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500 mb-1">Overall Compliance</div>
          <div className="text-3xl font-bold text-gray-900">{complianceRate}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${complianceRate}%` }}></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500 mb-1">At Risk Items</div>
          <div className="text-3xl font-bold text-yellow-600">{atRiskCount}</div>
          <div className="text-xs text-yellow-600 mt-1">Requires attention soon</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500 mb-1">Non-Compliant</div>
          <div className="text-3xl font-bold text-red-600">{nonCompliantCount}</div>
          <div className="text-xs text-red-600 mt-1">Immediate action required</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500 mb-1">Pending Review</div>
          <div className="text-3xl font-bold text-blue-600">{pendingCount}</div>
          <div className="text-xs text-blue-600 mt-1">Scheduled for audit</div>
        </div>
      </div>

      {/* Filters and List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-4 items-center justify-between">
          <h2 className="font-semibold text-gray-800">Compliance Requirements</h2>
          <div className="flex gap-2">
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Categories</option>
              <option value="Fair Work">Fair Work Act</option>
              <option value="NES">NES</option>
              <option value="Modern Award">Modern Award</option>
              <option value="Policy">Internal Policy</option>
            </select>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Compliant">Compliant</option>
              <option value="At Risk">At Risk</option>
              <option value="Non-Compliant">Non-Compliant</option>
              <option value="Pending Review">Pending Review</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">Requirement</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Priority</th>
                <th className="px-6 py-3">Last Checked</th>
                <th className="px-6 py-3">Next Due</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{item.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs" title={item.description}>{item.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded border border-gray-200">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded border ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={getPriorityColor(item.priority)}>{item.priority}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{item.lastChecked}</td>
                  <td className="px-6 py-4 text-gray-500">{item.nextCheckDue}</td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:underline mr-3">Audit</button>
                    <button className="text-gray-600 hover:underline">Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredItems.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No compliance items found matching your filters.
            </div>
          )}
        </div>
      </div>

      {/* NES Checklists Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-800">NES Standard Checklists</h2>
          <p className="text-sm text-gray-500 mt-1">Detailed compliance checklists for National Employment Standards.</p>
        </div>
        <div className="p-4 space-y-4">
          {nesChecklists.map((checklist) => (
            <div key={checklist.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div 
                className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setExpandedChecklist(expandedChecklist === checklist.id ? null : checklist.id)}
              >
                <div>
                  <h3 className="font-medium text-gray-900">{checklist.standard}</h3>
                  <p className="text-xs text-gray-500">Last Updated: {checklist.lastUpdated}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-1">
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                      {checklist.items.filter(i => i.isCompliant).length} Pass
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                      {checklist.items.filter(i => !i.isCompliant).length} Fail
                    </span>
                  </div>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 text-gray-400 transition-transform ${expandedChecklist === checklist.id ? 'transform rotate-180' : ''}`} 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              {expandedChecklist === checklist.id && (
                <div className="p-4 bg-white border-t border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                        <th className="text-left py-2 w-2/3">Question</th>
                        <th className="text-center py-2 w-24">Status</th>
                        <th className="text-left py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checklist.items.map((item) => (
                        <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                          <td className="py-3 pr-4 text-gray-700">{item.question}</td>
                          <td className="py-3 text-center">
                            {item.isCompliant ? (
                              <span className="inline-block w-3 h-3 rounded-full bg-green-500" title="Compliant"></span>
                            ) : (
                              <span className="inline-block w-3 h-3 rounded-full bg-red-500" title="Non-Compliant"></span>
                            )}
                          </td>
                          <td className="py-3 text-gray-500 italic text-xs">{item.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 flex justify-end">
                    <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                      Update Checklist
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
