
'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Filter, 
  Search,
  RefreshCw,
  Eye,
  Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PayrollError {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  error_type: 'Validation' | 'Calculation' | 'Data' | 'System' | 'Compliance';
  error_code: string;
  message: string;
  details: any;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'Resolved' | 'Ignored';
  created_at: string;
  employee?: {
    first_name: string;
    last_name: string;
  };
  payroll_run?: {
    pay_period_start: string;
    pay_period_end: string;
  };
}

export default function PayrollErrorsPage() {
  const [errors, setErrors] = useState<PayrollError[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'Open',
    severity: 'All',
    type: 'All'
  });

  useEffect(() => {
    loadErrors();
  }, [filter]);

  const loadErrors = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('payroll_errors')
        .select(`
          *,
          employee:employee_id (first_name, last_name),
          payroll_run:payroll_run_id (pay_period_start, pay_period_end)
        `)
        .order('created_at', { ascending: false });

      if (filter.status !== 'All') {
        query = query.eq('status', filter.status);
      }
      if (filter.severity !== 'All') {
        query = query.eq('severity', filter.severity);
      }
      if (filter.type !== 'All') {
        query = query.eq('error_type', filter.type);
      }

      const { data, error } = await query;
      if (error) throw error;
      setErrors(data || []);
    } catch (error) {
      console.error('Error loading payroll errors:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveError = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payroll_errors')
        .update({ 
          status: 'Resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setErrors(prev => prev.map(err => 
        err.id === id ? { ...err, status: 'Resolved' } : err
      ));
    } catch (error) {
      console.error('Error resolving error:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payroll Errors</h1>
        <p className="text-gray-600 mt-1">Track and resolve issues encountered during payroll processing</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filter by:</span>
        </div>
        
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="All">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Resolved">Resolved</option>
          <option value="Ignored">Ignored</option>
        </select>

        <select
          value={filter.severity}
          onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
          className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="All">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={filter.type}
          onChange={(e) => setFilter({ ...filter, type: e.target.value })}
          className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="All">All Types</option>
          <option value="Validation">Validation</option>
          <option value="Calculation">Calculation</option>
          <option value="Data">Data</option>
          <option value="System">System</option>
          <option value="Compliance">Compliance</option>
        </select>

        <button
          onClick={loadErrors}
          className="ml-auto p-2 text-gray-400 hover:text-blue-600"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Errors Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading errors...</p>
          </div>
        ) : errors.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-900 font-medium">No errors found</p>
            <p className="text-gray-500 text-sm">Everything looks good!</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pay Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {errors.map((error) => (
                <tr key={error.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-start">
                      <AlertTriangle className={`h-5 w-5 mr-3 mt-0.5 ${error.severity === 'Critical' ? 'text-red-500' : 'text-yellow-500'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{error.message}</p>
                        <p className="text-xs text-gray-500">{error.error_code} • {error.error_type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {error.employee ? `${error.employee.first_name} ${error.employee.last_name}` : 'System'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {error.payroll_run ? `${new Date(error.payroll_run.pay_period_start).toLocaleDateString()} - ${new Date(error.payroll_run.pay_period_end).toLocaleDateString()}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(error.severity)}`}>
                      {error.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {error.status === 'Resolved' ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-400 mr-1" />
                      )}
                      <span className="text-sm text-gray-700">{error.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="h-4 w-4" />
                      </button>
                      {error.status === 'Open' && (
                        <button 
                          onClick={() => resolveError(error.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
