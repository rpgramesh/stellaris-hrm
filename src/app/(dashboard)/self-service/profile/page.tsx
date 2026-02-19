"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { employeeService } from '@/services/employeeService';
import { employeeRequestService } from '@/services/employeeRequestService';
import { Employee } from '@/types';

export default function ProfilePage() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [managerName, setManagerName] = useState<string>('');
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [clientState, setClientState] = useState({
    lineManager: '',
    department: '',
    branch: '',
    email: ''
  });
  const [formState, setFormState] = useState({
    bankName: '',
    bankAccount: '',
    accountName: '' // Not in DB, will mock or store in notes if needed, but for now just local state
  });
  const [isContactRequestOpen, setIsContactRequestOpen] = useState(false);
  const [contactRequestDescription, setContactRequestDescription] = useState('');
  const [contactRequestSubmitting, setContactRequestSubmitting] = useState(false);
  const [contactRequestError, setContactRequestError] = useState<string | null>(null);
  const [contactRequestSuccess, setContactRequestSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEmployee() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        let currentEmployee: Employee | undefined;

        if (user?.email) {
           const allEmployees = await employeeService.getAll();
           currentEmployee = allEmployees.find(e => e.email === user.email);
        }

        if (!currentEmployee) {
          const allEmployees = await employeeService.getAll();
          if (allEmployees.length > 0) currentEmployee = allEmployees[0];
        }

        if (currentEmployee) {
          setEmployee(currentEmployee);
          setFormState({
            bankName: currentEmployee.bankName || '',
            bankAccount: currentEmployee.bankAccount || '',
            accountName: `${currentEmployee.firstName} ${currentEmployee.lastName}`
          });

          setClientState({
            lineManager: currentEmployee.clientLineManager || '',
            department: currentEmployee.clientDepartment || currentEmployee.department || '',
            branch: currentEmployee.clientBranch || currentEmployee.branch || '',
            email: currentEmployee.clientEmail || ''
          });

          if (currentEmployee.lineManagerId) {
            try {
              const name = await employeeService.getEmployeeName(currentEmployee.lineManagerId);
              setManagerName(name);
            } catch (err) {
              console.error('Error fetching manager name for profile:', err);
              setManagerName('');
            }
          } else {
            setManagerName('');
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEmployee();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    try {
      await employeeService.update(employee.id, {
        bankName: formState.bankName,
        bankAccount: formState.bankAccount
      });
      
      setEmployee(prev => prev ? ({ ...prev, ...formState }) : null);
      setIsEditing(false);
      alert("Bank details updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update details.");
    }
  };

  const handleSaveClientDetails = async () => {
    if (!employee) return;

    try {
      await employeeService.update(employee.id, {
        clientLineManager: clientState.lineManager,
        clientDepartment: clientState.department,
        clientBranch: clientState.branch,
        clientEmail: clientState.email
      });

      setEmployee(prev => prev ? ({
        ...prev,
        clientLineManager: clientState.lineManager,
        clientDepartment: clientState.department,
        clientBranch: clientState.branch,
        clientEmail: clientState.email
      }) : null);

      setIsEditingClient(false);
      alert("Client details updated successfully!");
    } catch (error) {
      console.error("Error updating client details:", error);
      alert("Failed to update client details.");
    }
  };

  const handleOpenContactRequest = () => {
    setContactRequestError(null);
    setContactRequestSuccess(null);
    setIsContactRequestOpen(true);
  };

  const handleSubmitContactRequest = async () => {
    if (!employee) return;
    if (!contactRequestDescription.trim()) {
      setContactRequestError('Please describe what you would like HR to update.');
      return;
    }

    try {
      setContactRequestSubmitting(true);
      setContactRequestError(null);
      await employeeRequestService.create({
        employeeId: employee.id,
        type: 'Profile Update',
        description: contactRequestDescription.trim()
      });
      setContactRequestSuccess('Your request has been sent to HR.');
      setContactRequestDescription('');
    } catch (error) {
      console.error('Failed to submit contact update request:', error);
      setContactRequestError('Failed to submit request. Please try again.');
    } finally {
      setContactRequestSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
  if (!employee) return <div className="p-8 text-center text-red-500">Employee not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500">Manage your personal information and banking details.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: identity, contact, client, compliance, emergency */}
        <div className="md:col-span-1 space-y-6">
          {/* Identity card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
            <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 overflow-hidden">
              {employee.avatarUrl ? (
                <img src={employee.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-full h-full text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {employee.firstName} {employee.lastName}
            </h2>
            <p className="text-sm text-gray-500">{employee.position}</p>
            <div className="mt-4 flex justify-center space-x-2">
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  employee.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {employee.status}
              </span>
              <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                Full Time
              </span>
            </div>
          </div>

          {/* Contact information */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-500 text-xs uppercase">Email</label>
                <div className="font-medium break-all">{employee.email}</div>
              </div>
              <div>
                <label className="block text-gray-500 text-xs uppercase">Phone</label>
                <div className="font-medium">{employee.phone || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-gray-500 text-xs uppercase">Address</label>
                <div className="font-medium">{employee.address || 'N/A'}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenContactRequest}
              className="mt-4 w-full text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg py-2 hover:bg-blue-50 transition-colors"
            >
              Request Update
            </button>
          </div>

          {/* Client details */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Client Details</h3>
              {!isEditingClient && (
                <button
                  onClick={() => setIsEditingClient(true)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Edit Client Details
                </button>
              )}
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-500 text-xs uppercase">Client Name</label>
                <div className="font-medium">{employee.clientName || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-gray-500 text-xs uppercase">Line Manager</label>
                {isEditingClient ? (
                  <input
                    type="text"
                    value={clientState.lineManager}
                    onChange={(e) => setClientState({ ...clientState, lineManager: e.target.value })}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter client line manager"
                  />
                ) : (
                  <div className="font-medium">
                    {employee.clientLineManager || managerName || employee.lineManager || 'N/A'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-gray-500 text-xs uppercase">Department</label>
                {isEditingClient ? (
                  <input
                    type="text"
                    value={clientState.department}
                    onChange={(e) => setClientState({ ...clientState, department: e.target.value })}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter client department"
                  />
                ) : (
                  <div className="font-medium">
                    {employee.clientDepartment || employee.department || 'N/A'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-gray-500 text-xs uppercase">Client Email</label>
                {isEditingClient ? (
                  <input
                    type="email"
                    value={clientState.email}
                    onChange={(e) => setClientState({ ...clientState, email: e.target.value })}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter client email"
                  />
                ) : (
                  <div className="font-medium break-all">{employee.clientEmail || 'N/A'}</div>
                )}
              </div>
              <div>
                <label className="block text-gray-500 text-xs uppercase">Branch</label>
                {isEditingClient ? (
                  <input
                    type="text"
                    value={clientState.branch}
                    onChange={(e) => setClientState({ ...clientState, branch: e.target.value })}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter client branch"
                  />
                ) : (
                  <div className="font-medium">{employee.clientBranch || employee.branch || 'N/A'}</div>
                )}
              </div>
            </div>

            {isEditingClient && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingClient(false);
                    setClientState({
                      lineManager: employee.clientLineManager || '',
                      department: employee.clientDepartment || employee.department || '',
                      branch: employee.clientBranch || employee.branch || '',
                      email: employee.clientEmail || '',
                    });
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveClientDetails}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Save Client Details
                </button>
              </div>
            )}
          </div>

          {/* Compliance & Work Rights */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Compliance &amp; Work Rights</h3>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 text-xs uppercase">TFN</label>
                  <div className="font-medium">{employee.tfn || 'N/A'}</div>
                </div>
                <div>
                  <label className="block text-gray-500 text-xs uppercase">ABN</label>
                  <div className="font-medium">{employee.abn || 'N/A'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 text-xs uppercase">Superannuation Fund Name</label>
                  <div className="font-medium">{employee.superannuationFundName || 'N/A'}</div>
                </div>
                <div>
                  <label className="block text-gray-500 text-xs uppercase">Superannuation Member Number</label>
                  <div className="font-medium">{employee.superannuationMemberNumber || 'N/A'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 text-xs uppercase">Medicare Number</label>
                  <div className="font-medium">{employee.medicareNumber || 'N/A'}</div>
                </div>
                <div>
                  <label className="block text-gray-500 text-xs uppercase">Work Rights Status</label>
                  <div className="font-medium">{employee.workRightsStatus || 'N/A'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 text-xs uppercase">Visa Type</label>
                  <div className="font-medium">{employee.visaType || 'N/A'}</div>
                </div>
                <div>
                  <label className="block text-gray-500 text-xs uppercase">Visa Expiry Date</label>
                  <div className="font-medium">
                    {employee.visaExpiryDate ? new Date(employee.visaExpiryDate).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 text-xs uppercase">Police Clearance Status</label>
                  <div className="font-medium">{employee.policeClearanceStatus || 'N/A'}</div>
                </div>
                <div>
                  <label className="block text-gray-500 text-xs uppercase">WWCC Number</label>
                  <div className="font-medium">{employee.wwccNumber || 'N/A'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 text-xs uppercase">Driver's Licence Number</label>
                  <div className="font-medium">{employee.driversLicenseNumber || 'N/A'}</div>
                </div>
                <div>
                  <label className="block text-gray-500 text-xs uppercase">Driver's Licence Expiry</label>
                  <div className="font-medium">
                    {employee.driversLicenseExpiry
                      ? new Date(employee.driversLicenseExpiry).toLocaleDateString()
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-gray-500 text-xs uppercase">Contact Name</label>
                <div className="font-medium">{employee.emergencyContactName || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-gray-500 text-xs uppercase">Relationship</label>
                <div className="font-medium">{employee.emergencyContactRelationship || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-gray-500 text-xs uppercase">Contact Phone</label>
                <div className="font-medium">{employee.emergencyContactPhone || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-gray-500 text-xs uppercase">Contact Address</label>
                <div className="font-medium break-words">{employee.emergencyContactAddress || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: overview + bank details */}
        <div className="md:col-span-2 space-y-6">
          {/* Overview */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 border-b pb-1">Personal Information</h3>
                <dl className="space-y-2">
                  <div className="grid grid-cols-3">
                    <dt className="text-gray-500">Email:</dt>
                    <dd className="col-span-2 break-words">{employee.email}</dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-gray-500">Phone:</dt>
                    <dd className="col-span-2">{employee.phone || 'N/A'}</dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-gray-500">Gender:</dt>
                    <dd className="col-span-2">{employee.gender}</dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-gray-500">Birth Date:</dt>
                    <dd className="col-span-2">
                      {employee.birthDate ? new Date(employee.birthDate).toLocaleDateString() : 'N/A'}
                    </dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-gray-500">Nationality:</dt>
                    <dd className="col-span-2">{employee.nationality}</dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-gray-500">Address:</dt>
                    <dd className="col-span-2 break-words">{employee.address || 'N/A'}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 border-b pb-1">Employment Details</h3>
                <dl className="space-y-2">
                  <div className="grid grid-cols-3">
                    <dt className="text-gray-500">Employee Code:</dt>
                    <dd className="col-span-2">{employee.employeeCode || '-'}</dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-gray-500">Position:</dt>
                    <dd className="col-span-2">{employee.position}</dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-gray-500">Join Date:</dt>
                    <dd className="col-span-2">
                      {employee.joinDate ? new Date(employee.joinDate).toLocaleDateString() : 'N/A'}
                    </dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-gray-500">Branch:</dt>
                    <dd className="col-span-2">{employee.branch || 'N/A'}</dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-gray-500">Department:</dt>
                    <dd className="col-span-2">{employee.department || 'N/A'}</dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-gray-500">Line Manager:</dt>
                    <dd className="col-span-2">{managerName || employee.lineManager || 'N/A'}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Bank Details Form */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path
                    fillRule="evenodd"
                    d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                    clipRule="evenodd"
                  />
                </svg>
                Bank Details
              </h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Edit Details
                </button>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                  <input
                    type="text"
                    disabled={true}
                    value={formState.accountName}
                    className="w-full rounded-lg border-gray-300 shadow-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formState.bankName}
                    onChange={(e) => setFormState({ ...formState, bankName: e.target.value })}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="e.g. Commonwealth Bank"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number (including BSB)
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formState.bankAccount}
                    onChange={(e) => setFormState({ ...formState, bankAccount: e.target.value })}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="BSB + Account Number"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormState({
                        bankName: employee.bankName || '',
                        bankAccount: employee.bankAccount || '',
                        accountName: `${employee.firstName} ${employee.lastName}`,
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-yellow-600 flex-shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-yellow-800">
                  For security reasons, changing your bank details may require 2-factor authentication or manager
                  approval. Updates made before Wednesday will be processed for the current pay cycle.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
      {isContactRequestOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Request Contact Update</h2>
            <p className="text-sm text-gray-600 mb-4">
              Tell HR what you would like to update in your contact information. Your request will appear in the Employee Requests list.
            </p>
            {contactRequestError && (
              <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {contactRequestError}
              </div>
            )}
            {contactRequestSuccess && (
              <div className="mb-3 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                {contactRequestSuccess}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Request details
              </label>
              <textarea
                value={contactRequestDescription}
                onChange={(e) => setContactRequestDescription(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Example: Please update my phone number and home address."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsContactRequestOpen(false);
                  setContactRequestError(null);
                  setContactRequestSuccess(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSubmitContactRequest}
                disabled={contactRequestSubmitting}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                  contactRequestSubmitting
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {contactRequestSubmitting ? 'Sending...' : 'Send to HR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
