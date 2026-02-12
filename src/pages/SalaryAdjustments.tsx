import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Eye, 
  CheckCircle, 
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { SalaryAdjustment } from '../types/payroll';
import { salaryAdjustmentService } from '../services/salaryAdjustmentService';

interface AdjustmentFilters {
  status: string;
  adjustmentType: string;
  employeeId: string;
  dateFrom: string;
  dateTo: string;
}

export default function SalaryAdjustments() {
  const router = useRouter();
  const [adjustments, setAdjustments] = useState<SalaryAdjustment[]>([]);
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<AdjustmentFilters>({
    status: '',
    adjustmentType: '',
    employeeId: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    loadAdjustments();
  }, [filters]);

  const fetchEmployeeNames = async (employeeIds: string[]) => {
    if (employeeIds.length === 0) return;
    
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .in('id', employeeIds);

      if (error) throw error;

      const names: Record<string, string> = {};
      data?.forEach(emp => {
        names[emp.id] = `${emp.first_name} ${emp.last_name}`;
      });
      setEmployeeNames(names);
    } catch (error) {
      console.error('Error loading employee names:', error);
    }
  };

  const loadAdjustments = async () => {
    try {
      console.log('Loading salary adjustments with filters:', filters);
      
      let query = supabase
        .from('salary_adjustments')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.adjustmentType) {
        query = query.eq('adjustment_type', filters.adjustmentType);
      }
      if (filters.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }
      if (filters.dateFrom) {
        query = query.gte('effective_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('effective_date', filters.dateTo);
      }

      console.log('Executing query...');
      const { data, error } = await query;
      
      console.log('Query result:', { data, error });

      if (error) {
        console.error('Query error details:', error);
        throw error;
      }

      const mappedData = (data || []).map(item => salaryAdjustmentService.mapFromDb(item));
      setAdjustments(mappedData);

      // Fetch employee names for the loaded adjustments
      if (mappedData.length > 0) {
        const employeeIds = [...new Set(mappedData.map(adj => adj.employeeId))];
        console.log('Fetching names for employee IDs:', employeeIds);
        await fetchEmployeeNames(employeeIds);
      }
    } catch (error) {
      console.error('Error loading adjustments:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('salary_adjustments')
        .update({ 
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      loadAdjustments();
    } catch (error) {
      console.error('Error approving adjustment:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('salary_adjustments')
        .update({ 
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      loadAdjustments();
    } catch (error) {
      console.error('Error rejecting adjustment:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'PendingApproval':
        return 'bg-yellow-100 text-yellow-800';
      case 'Processed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAdjustments = adjustments.filter(adjustment => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        employeeNames[adjustment.employeeId]?.toLowerCase().includes(searchLower) ||
        adjustment.adjustmentType.toLowerCase().includes(searchLower) ||
        adjustment.adjustmentReason.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Salary Adjustments</h1>
          <p className="text-gray-600 mt-1">Manage salary adjustments and approval workflows</p>
        </div>
        <Link
          href="/payroll/adjustments/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Adjustment</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search adjustments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="PendingApproval">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Processed">Processed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.adjustmentType}
                onChange={(e) => setFilters({ ...filters, adjustmentType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="BaseSalary">Base Salary</option>
                <option value="Allowance">Allowance</option>
                <option value="Bonus">Bonus</option>
                <option value="Deduction">Deduction</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Adjustments Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adjustment Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Effective Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAdjustments.map((adjustment) => (
                <tr key={adjustment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {employeeNames[adjustment.employeeId] || 'Loading...'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {adjustment.employeeId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {adjustment.adjustmentType.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${adjustment.amount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      {new Date(adjustment.effectiveDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(adjustment.status)}`}>
                      {adjustment.status.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {adjustment.adjustmentReason}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/payroll/adjustments/${adjustment.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      
                      {adjustment.status === 'PendingApproval' && (
                        <>
                          <button
                            onClick={() => handleApprove(adjustment.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleReject(adjustment.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      
                      {adjustment.status === 'Approved' && (
                        <Link
                          href={`/payroll/adjustments/${adjustment.id}/edit`}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAdjustments.length === 0 && (
          <div className="text-center py-8">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No adjustments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filters.status || filters.adjustmentType 
                ? "Try adjusting your search or filter criteria."
                : "Get started by creating a new salary adjustment."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}