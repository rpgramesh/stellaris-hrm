"use client";

import { useState, useEffect } from 'react';
import { incidentsService } from '@/services/incidentsService';
import { IncidentCategory } from '@/types';

export default function IncidentCategoryPage() {
  const [categories, setCategories] = useState<IncidentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<IncidentCategory>>({});
  const [expandedCustomRoles, setExpandedCustomRoles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await incidentsService.getCategories(false);
        setCategories(data);
      } catch (error) {
        console.error('Failed to load incident categories:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const handleAdd = () => {
    setCurrentCategory({
      active: true,
      allowCauseless: false,
      color: '#EF4444',
      reporterAllowed: 'Employee',
      investigationAccess: 'Join Investigation',
      teamAccess: {
        lineManager: 'Join Investigation',
        headOfDepartment: 'Join Investigation',
        headOfBranch: 'Join Investigation',
        customRole1: 'Join Investigation',
        customRole2: 'Join Investigation',
        customRole3: 'Join Investigation',
      },
      customRoleAccess: []
    });
    setIsFormOpen(true);
  };

  const handleEdit = (category: IncidentCategory) => {
    setCurrentCategory({ ...category });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    try {
      if (currentCategory.id) {
        const updated = await incidentsService.updateCategory(currentCategory.id, currentCategory);
        setCategories(categories.map(c => c.id === updated.id ? updated : c));
      } else {
        const created = await incidentsService.createCategory(currentCategory as Omit<IncidentCategory, 'id'>);
        setCategories([...categories, created]);
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error('Failed to save category:', error);
      alert('Failed to save category. Please try again.');
    }
  };

  const toggleCustomRole = (role: string) => {
    setExpandedCustomRoles(prev => ({ ...prev, [role]: !prev[role] }));
  };

  if (isFormOpen) {
    return (
      <div className="p-6 max-w-4xl mx-auto bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setIsFormOpen(false)}
                className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-800">Incident Category</h1>
          </div>
          <button 
            onClick={handleSave}
            className="p-2 rounded-full bg-green-500 text-white hover:bg-green-600 shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          
          {/* Basic Info */}
          <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
            <div className="relative border rounded-md p-2">
                <label className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">Code <span className="text-red-500">*</span></label>
                <input 
                    type="text" 
                    value={currentCategory.code || ''}
                    onChange={(e) => setCurrentCategory({...currentCategory, code: e.target.value})}
                    className="w-full outline-none pt-1"
                />
            </div>
            <div className="relative border rounded-md p-2">
                <label className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">Description <span className="text-red-500">*</span></label>
                <input 
                    type="text" 
                    value={currentCategory.description || ''}
                    onChange={(e) => setCurrentCategory({...currentCategory, description: e.target.value})}
                    className="w-full outline-none pt-1"
                />
            </div>
            
            <div className="flex items-center justify-between py-2">
                <span className="text-gray-700">Active</span>
                <button 
                    onClick={() => setCurrentCategory({...currentCategory, active: !currentCategory.active})}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${currentCategory.active ? 'bg-blue-500' : 'bg-gray-300'}`}
                >
                    <div className={`w-4 h-4 bg-white rounded-full transform transition-transform ${currentCategory.active ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
            </div>

            {/* Color Picker */}
            <div className="border rounded-lg p-2 flex items-center gap-4">
                <div className="flex-1 h-12 rounded bg-red-500 relative flex items-center justify-end px-4" style={{ backgroundColor: currentCategory.color }}>
                   {/* Hidden color input covering the bar */}
                   <input 
                        type="color" 
                        value={currentCategory.color || '#EF4444'}
                        onChange={(e) => setCurrentCategory({...currentCategory, color: e.target.value})}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                   />
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                   </svg>
                </div>
            </div>
          </div>

          {/* REPORTING Section */}
          <div className="space-y-4">
            <div className="bg-blue-400 text-white p-3 rounded-md font-bold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                REPORTING
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                    <span className="text-gray-700">Allow Causeless Incident</span>
                    <button 
                        onClick={() => setCurrentCategory({...currentCategory, allowCauseless: !currentCategory.allowCauseless})}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${currentCategory.allowCauseless ? 'bg-blue-500' : 'bg-gray-300'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full transform transition-transform ${currentCategory.allowCauseless ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>

                <div className="relative border rounded-md p-2">
                    <label className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">Reporter Allowed</label>
                    <select 
                        value={currentCategory.reporterAllowed || ''}
                        onChange={(e) => setCurrentCategory({...currentCategory, reporterAllowed: e.target.value as any})}
                        className="w-full outline-none pt-1 bg-transparent"
                    >
                        <option value="Employee">Employee</option>
                        <option value="Employer">Employer</option>
                        <option value="Anonymous Employee">Anonymous Employee</option>
                        <option value="Anonymous Employee, Employee, Employer">Anonymous Employee, Employee, Employer</option>
                    </select>
                </div>

                <div className="relative border rounded-md p-2">
                    <label className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">Investigation Access for Employee Reporter</label>
                    <select 
                        value={currentCategory.investigationAccess || ''}
                        onChange={(e) => setCurrentCategory({...currentCategory, investigationAccess: e.target.value})}
                        className="w-full outline-none pt-1 bg-transparent"
                    >
                        <option value="Join Investigation">Join Investigation</option>
                        <option value="View Only">View Only</option>
                        <option value="No Access">No Access</option>
                    </select>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex gap-3 items-start">
                    <div className="bg-yellow-500 text-white rounded-sm p-0.5 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <p className="text-sm text-gray-800">
                        Causeless Incident allows for the reporting of incident without attributing to any specific employee.
                    </p>
                </div>
            </div>
          </div>

          {/* TEAM INCIDENT ACCESS LEVEL Section */}
          <div className="space-y-4">
            <div className="bg-blue-400 text-white p-3 rounded-md font-bold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                TEAM INCIDENT ACCESS LEVEL
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
                {['Line Manager', 'Head of Department', 'Head of Branch', 'Custom Role 1', 'Custom Role 2', 'Custom Role 3'].map((role) => {
                    const key = role.toLowerCase().replace(/ /g, '') as keyof typeof currentCategory.teamAccess;
                    return (
                        <div key={role} className="relative border rounded-md p-2">
                            <label className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">{role}</label>
                            <select 
                                value={(currentCategory.teamAccess as any)?.[key] || 'Join Investigation'}
                                onChange={(e) => setCurrentCategory({
                                    ...currentCategory, 
                                    teamAccess: { 
                                        ...currentCategory.teamAccess, 
                                        [key]: e.target.value 
                                    }
                                })}
                                className="w-full outline-none pt-1 bg-transparent"
                            >
                                <option value="Join Investigation">Join Investigation</option>
                                <option value="View Only">View Only</option>
                                <option value="No Access">No Access</option>
                            </select>
                        </div>
                    );
                })}

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex gap-3 items-start">
                    <div className="bg-yellow-500 text-white rounded-sm p-0.5 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <p className="text-sm text-gray-800">
                        Determine when and how managers will be able to access a team member's Incident.
                    </p>
                </div>
            </div>
          </div>

           {/* CUSTOM ROLE ACCESS Section */}
           <div className="space-y-4">
            <div className="bg-blue-400 text-white p-3 rounded-md font-bold flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    CUSTOM ROLE ACCESS
                </div>
                <button className="bg-green-500 rounded-full p-1 hover:bg-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                         <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                         <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm divide-y">
                {['Custom Role 1', 'Custom Role 2', 'Custom Role 3'].map((role) => (
                    <div key={role} className="p-4">
                        <div 
                            className="flex justify-between items-center cursor-pointer"
                            onClick={() => toggleCustomRole(role)}
                        >
                            <span className="text-gray-600 font-medium">{role}</span>
                            <div className="flex items-center gap-2">
                                <button className="text-yellow-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    className={`h-5 w-5 text-gray-400 transform transition-transform ${expandedCustomRoles[role] ? 'rotate-180' : ''}`} 
                                    viewBox="0 0 20 20" 
                                    fill="currentColor"
                                >
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                        {expandedCustomRoles[role] && (
                            <div className="mt-4 pl-4 border-l-2 border-gray-100">
                                <p className="text-sm text-gray-500">Configure access for {role}...</p>
                                {/* Add more detailed configuration fields here if needed */}
                            </div>
                        )}
                    </div>
                ))}
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incident Categories</h1>
          <p className="text-gray-600">Configure incident categories here.</p>
        </div>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
            <div key={category.id} className="bg-white p-4 rounded-lg shadow border-l-4" style={{ borderLeftColor: category.color || '#ccc' }}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg">{category.description}</h3>
                        <p className="text-sm text-gray-500">{category.code}</p>
                    </div>
                    <button onClick={() => handleEdit(category)} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                    </button>
                </div>
                <div className="mt-4 flex gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${category.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {category.active ? 'Active' : 'Inactive'}
                    </span>
                    {category.allowCauseless && (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            Causeless Allowed
                        </span>
                    )}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}
