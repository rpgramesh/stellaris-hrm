'use client';

import { useState, useEffect } from 'react';
import { BuildingOfficeIcon, EnvelopeIcon, PhoneIcon, GlobeAltIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { CompanyInformation } from '@/types';
import { companyInformationService } from '@/services/companyInformationService';

export default function EmployerInformationPage() {
  const [formData, setFormData] = useState<CompanyInformation>({
    id: '',
    companyName: '',
    registrationNumber: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    taxId: '',
    primaryContact: '',
    foundedYear: ''
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      const data = await companyInformationService.get();
      if (data) setFormData(data);
    } catch (error) {
      console.error('Error loading company info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await companyInformationService.update(formData);
      setIsEditing(false);
      // In a real app, show a success toast
      alert('Company information saved!');
    } catch (error) {
      console.error('Error saving company info:', error);
      alert('Failed to save company information.');
    }
  };

  if (loading) {
    return <div className="p-4">Loading information...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employer Information</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your company details and contact information</p>
        </div>
        <button
          onClick={() => isEditing ? handleSubmit(new Event('submit') as any) : setIsEditing(true)}
          className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isEditing 
              ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
          }`}
        >
          {isEditing ? 'Save Changes' : 'Edit Information'}
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">General Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number (ABN/ACN)</label>
              <input
                type="text"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                disabled={!isEditing}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
              <input
                type="text"
                name="taxId"
                value={formData.taxId}
                onChange={handleChange}
                disabled={!isEditing}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Founded Year</label>
              <input
                type="text"
                name="foundedYear"
                value={formData.foundedYear}
                onChange={handleChange}
                disabled={!isEditing}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPinIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <PhoneIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact Person</label>
              <input
                type="text"
                name="primaryContact"
                value={formData.primaryContact}
                onChange={handleChange}
                disabled={!isEditing}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
