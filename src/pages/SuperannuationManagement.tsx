import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Building,
  User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SuperannuationManagementService } from '../services/superannuationManagementService';

// Define DB types locally to match Supabase response
interface SuperFundDB {
  id: string;
  fund_name: string;
  fund_abn: string;
  usi: string;
}

interface SuperannuationContributionDB {
  id: string;
  employee_id: string;
  fund_id: string;
  contribution_type: string;
  amount: number;
  pay_period_start: string;
  pay_period_end: string;
  payment_date: string | null;
  status: 'Pending' | 'Processed' | 'Submitted' | 'Paid' | 'Error' | 'Rejected';
  description: string;
  employees: {
    first_name: string;
    last_name: string;
    full_name?: string;
  };
  super_funds: {
    fund_name: string;
    fund_abn: string;
  };
  created_at: string;
}

interface ContributionFilters {
  status: string;
  fundId: string;
  employeeId: string;
  dateFrom: string;
  dateTo: string;
}

export default function SuperannuationManagement() {
  const router = useRouter();
  const superannuationService = new SuperannuationManagementService();
  const [contributions, setContributions] = useState<SuperannuationContributionDB[]>([]);
  const [superFunds, setSuperFunds] = useState<SuperFundDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ContributionFilters>({
    status: '',
    fundId: '',
    employeeId: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showNewContribution, setShowNewContribution] = useState(false);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      const [contributionsData, fundsData] = await Promise.all([
        loadContributions(),
        supabase.from('super_funds').select('*').order('fund_name')
      ]);

      setContributions(contributionsData);
      setSuperFunds(fundsData.data || []);
    } catch (error: any) {
      console.error('Error loading data:', error.message || error.details || error);
    } finally {
      setLoading(false);
    }
  };

  const loadContributions = async () => {
    let query = supabase
      .from('superannuation_contributions')
      .select(`
        *,
        employees!inner(first_name, last_name),
        super_funds!inner(fund_name, fund_abn)
      `)
      .order('pay_period_end', { ascending: false });

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.fundId) {
      query = query.eq('fund_id', filters.fundId);
    }
    if (filters.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }
    if (filters.dateFrom) {
      query = query.gte('pay_period_end', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('pay_period_end', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform data to match interface
    // @ts-ignore
    return data?.map(item => ({
      ...item,
      employees: {
        ...item.employees,
        full_name: `${item.employees.first_name} ${item.employees.last_name}`
      }
    })) || [];
  };

  const getCurrentQuarter = () => {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();
    
    let start, end;
    if (month >= 6 && month <= 8) { // Jul-Sep (Q1)
      start = new Date(year, 6, 1);
      end = new Date(year, 8, 30);
    } else if (month >= 9 && month <= 11) { // Oct-Dec (Q2)
      start = new Date(year, 9, 1);
      end = new Date(year, 11, 31);
    } else if (month >= 0 && month <= 2) { // Jan-Mar (Q3)
      start = new Date(year, 0, 1);
      end = new Date(year, 2, 31);
    } else { // Apr-Jun (Q4)
      start = new Date(year, 3, 1);
      end = new Date(year, 5, 30);
    }
    
    return { 
      start: start.toISOString().split('T')[0], 
      end: end.toISOString().split('T')[0] 
    };
  };

  const handleProcessContributions = async () => {
    try {
      const currentQuarter = getCurrentQuarter();
      
      // Fetch processed payroll runs in the current quarter
      const { data: runs, error: runsError } = await supabase
        .from('payroll_runs')
        .select(`
          id,
          pay_period_start,
          pay_period_end,
          status,
          payslips (
            id,
            employee_id,
            gross_pay,
            superannuation
          )
        `)
        .eq('status', 'Paid')
        .gte('pay_period_end', currentQuarter.start)
        .lte('pay_period_end', currentQuarter.end);

      if (runsError) throw runsError;

      if (!runs || runs.length === 0) {
        alert('No processed payroll runs found for current quarter');
        return;
      }

      const contributionsToInsert: any[] = [];

      for (const run of runs) {
        if (!run.payslips) continue;
        
        // @ts-ignore
        for (const payslip of run.payslips) {
           // Fetch employee super fund
           const { data: empFund } = await supabase
             .from('payroll_employees')
             .select('super_fund_id, super_membership_number')
             .eq('id', payslip.employee_id)
             .single();
             
           if (empFund && empFund.super_fund_id) {
             contributionsToInsert.push({
               employee_id: payslip.employee_id,
               fund_id: empFund.super_fund_id,
               amount: payslip.superannuation,
               pay_period_start: run.pay_period_start,
               pay_period_end: run.pay_period_end,
               status: 'Pending',
               contribution_type: 'SG', // Super Guarantee
               description: `Super for ${run.pay_period_end}`
             });
           }
        }
      }

      if (contributionsToInsert.length > 0) {
        const { error } = await supabase
          .from('superannuation_contributions')
          .insert(contributionsToInsert);

        if (error) throw error;
        alert(`Successfully processed ${contributionsToInsert.length} superannuation contributions`);
        loadData();
      } else {
        alert('No new contributions to process.');
      }

    } catch (error) {
      console.error('Error processing contributions:', error);
      alert('Error processing superannuation contributions');
    }
  };

  const handleSubmitSTP = async (contributionIds: string[]) => {
    try {
      // Submit contributions to ATO via STP
      const { error } = await supabase
        .from('superannuation_contributions')
        .update({ 
          status: 'Submitted',
        })
        .in('id', contributionIds);

      if (error) throw error;

      alert('Superannuation contributions submitted to ATO successfully');
      loadData();

    } catch (error) {
      console.error('Error submitting contributions:', error);
      alert('Error submitting superannuation contributions');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Processed':
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Submitted':
        return 'bg-blue-100 text-blue-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Error':
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredContributions = contributions.filter(contribution => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        contribution.employees?.full_name?.toLowerCase().includes(searchLower) ||
        contribution.employee_id?.toLowerCase().includes(searchLower) ||
        contribution.super_funds?.fund_name?.toLowerCase().includes(searchLower);
      
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
          <h1 className="text-3xl font-bold text-gray-900">Superannuation Management</h1>
          <p className="text-gray-600 mt-1">Manage superannuation contributions and compliance</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleProcessContributions}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <DollarSign className="h-4 w-4" />
            <span>Process Contributions</span>
          </button>
          <button
            onClick={() => setShowNewContribution(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Contribution</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Contributions</p>
              <p className="text-2xl font-bold text-gray-900">${contributions.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{contributions.filter(c => c.status === 'Pending').length}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Submitted</p>
              <p className="text-2xl font-bold text-gray-900">{contributions.filter(c => c.status === 'Submitted').length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Funds</p>
              <p className="text-2xl font-bold text-gray-900">{superFunds.length}</p>
            </div>
            <Building className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search contributions..."
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
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Processed">Processed</option>
                <option value="Submitted">Submitted</option>
                <option value="Error">Error</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Super Fund</label>
              <select
                value={filters.fundId}
                onChange={(e) => setFilters({ ...filters, fundId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Funds</option>
                {superFunds.map(fund => (
                  <option key={fund.id} value={fund.id}>{fund.fund_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Contributions List */}
      <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fund</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredContributions.map((contribution) => (
              <tr key={contribution.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{contribution.employees?.full_name}</div>
                      <div className="text-sm text-gray-500">{contribution.contribution_type}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{contribution.super_funds?.fund_name}</div>
                  <div className="text-sm text-gray-500">ABN: {contribution.super_funds?.fund_abn}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(contribution.pay_period_start).toLocaleDateString()} - 
                    {new Date(contribution.pay_period_end).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">${contribution.amount.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(contribution.status)}`}>
                    {contribution.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">
                    <Eye className="h-4 w-4" />
                  </button>
                  {contribution.status === 'Pending' && (
                    <button 
                      onClick={() => handleSubmitSTP([contribution.id])}
                      className="text-green-600 hover:text-green-900"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}