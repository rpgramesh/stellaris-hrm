"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Download, 
  FileText,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  MoreHorizontal,
  Eye,
  FileSpreadsheet,
  Edit,
  X,
  Check,
  Loader2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from "recharts";
import { supabase } from "@/lib/supabase";
import { timesheetService } from "@/services/timesheetService";
import { subscribeToTableWithClient, optimisticMutation } from "@/lib/realtime";
import jsPDF from "jspdf";
import "jspdf-autotable";

// --- Types ---

type SubmissionStatus = 'Submitted' | 'Pending' | 'Approved' | 'Rejected' | 'Overdue';

interface TimesheetSubmission {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  hireDate?: string;
  empStatus?: string;
  status: SubmissionStatus;
  submittedAt?: string;
  payPeriod: string;
  hoursLogged: number;
  approvalTimeHrs?: number; // Hours taken to approve
}

const DEPARTMENTS = ["Engineering", "Product", "Sales", "HR", "Marketing", "Operations"];

const TREND_DATA = [
  { name: "Feb 24", submissions: 5, pending: 15 },
  { name: "Feb 25", submissions: 8, pending: 12 },
  { name: "Feb 26", submissions: 12, pending: 8 },
  { name: "Feb 27", submissions: 15, pending: 5 },
  { name: "Feb 28", submissions: 18, pending: 2 },
  { name: "Mar 01", submissions: 20, pending: 0 },
  { name: "Mar 02", submissions: 22, pending: 0 },
];

// --- Component ---

export default function TimesheetDashboard() {
  const [submissions, setSubmissions] = useState<TimesheetSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [deptFilter, setDeptFilter] = useState<string>("All");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(false);

  // Modal States
  const [selectedSubmission, setSelectedSubmission] = useState<TimesheetSubmission | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit Form State
  const [editFormData, setEditFormData] = useState<Partial<TimesheetSubmission>>({});

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { rows } = await timesheetService.listSubmissions();
      setSubmissions(rows as any);
    } catch (error) {
      console.error("Error fetching initial timesheet data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial Data Load & Realtime Subscription
  useEffect(() => {
    fetchInitialData();

    const sub = subscribeToTableWithClient(
      supabase,
      { table: 'timesheets' },
      {
        onUpdate: (payload) => {
          console.log('[Realtime] Timesheet updated:', payload.new);
          setSubmissions(prev => prev.map(s => 
            s.id === payload.new.id 
              ? { 
                  ...s, 
                  status: payload.new.status, 
                  hoursLogged: Number(payload.new.total_hours) 
                } 
              : s
          ));
        },
        onInsert: () => {
          // For simplicity, refetch everything on insert to ensure proper mapping/joining
          handleRefresh();
        },
        onDelete: (payload) => {
          setSubmissions(prev => prev.filter(s => s.id !== payload.old.id));
        },
        onReconnect: () => setIsLive(true),
        onError: () => setIsLive(false)
      }
    );

    setIsLive(true);
    return () => sub.unsubscribe();
  }, [fetchInitialData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchInitialData().finally(() => {
      setLastRefresh(new Date());
      setIsRefreshing(false);
    });
  }, [fetchInitialData]);

  const handleViewDetails = (sub: TimesheetSubmission) => {
    setSelectedSubmission(sub);
    setIsViewModalOpen(true);
  };

  const handleEditSubmission = (sub: TimesheetSubmission) => {
    setSelectedSubmission(sub);
    setEditFormData({ ...sub });
    setIsEditModalOpen(true);
    setSaveError(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedSubmission) return;

    if (editFormData.hoursLogged === undefined || editFormData.hoursLogged < 0) {
      setSaveError("Hours logged must be a positive number.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const oldData = submissions.find(s => s.id === selectedSubmission.id);

    await optimisticMutation({
      apply: () => {
        setSubmissions(prev => prev.map(s => 
          s.id === selectedSubmission.id 
            ? { ...s, ...editFormData } as TimesheetSubmission
            : s
        ));
        setIsEditModalOpen(false);
      },
      rollback: () => {
        if (oldData) {
          setSubmissions(prev => prev.map(s => s.id === oldData.id ? oldData : s));
        }
        setSaveError("Failed to sync changes with server. Rolling back...");
        setIsEditModalOpen(true);
      },
      action: () => timesheetService.updateSubmission(selectedSubmission.id, editFormData as any)
    }).finally(() => {
      setIsSaving(false);
    });
  };

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const matchesSearch = sub.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            sub.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "All" || sub.status === statusFilter;
      const matchesDept = deptFilter === "All" || sub.department === deptFilter;
      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [submissions, searchTerm, statusFilter, deptFilter]);

  const stats = useMemo(() => {
    const total = submissions.length;
    const submittedCount = submissions.filter(s => ['Submitted', 'Approved', 'Rejected'].includes(s.status)).length;
    const pending = submissions.filter(s => s.status === 'Pending').length;
    const approved = submissions.filter(s => s.status === 'Approved').length;
    const rejected = submissions.filter(s => s.status === 'Rejected').length;
    const overdue = submissions.filter(s => s.status === 'Overdue').length;
    
    const avgApprovalTime = submissions
      .filter(s => s.approvalTimeHrs !== undefined)
      .reduce((acc, curr) => acc + (curr.approvalTimeHrs || 0), 0) / (approved || 1);

    return {
      total,
      submitted: submittedCount,
      pending,
      approved,
      rejected,
      overdue,
      submissionRate: total > 0 ? Number(((submittedCount / total) * 100).toFixed(1)) : 0,
      avgApprovalTime: avgApprovalTime.toFixed(1)
    };
  }, [submissions]);

  const pieData = [
    { name: 'Approved', value: stats.approved, color: '#10b981' },
    { name: 'Submitted', value: stats.submitted - stats.approved - stats.rejected, color: '#3b82f6' },
    { name: 'Pending', value: stats.pending, color: '#f59e0b' },
    { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
    { name: 'Overdue', value: stats.overdue, color: '#64748b' },
  ];

  const getStatusBadge = (status: SubmissionStatus) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Submitted': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Rejected': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'Overdue': return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Timesheet Submission Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), "PPP p")}`, 14, 22);
    
    const tableData = filteredSubmissions.map(sub => [
      sub.employeeId,
      sub.employeeName,
      sub.department,
      sub.status,
      sub.hoursLogged,
      sub.submittedAt ? format(parseISO(sub.submittedAt), "MMM dd, HH:mm") : "-"
    ]);

    (doc as any).autoTable({
      head: [['ID', 'Name', 'Dept', 'Status', 'Hours', 'Submitted At']],
      body: tableData,
      startY: 30,
    });
    
    doc.save("timesheet-report.pdf");
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Timesheet Dashboard</h1>
            {isLive ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100 animate-pulse">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                LIVE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 text-slate-400 rounded-full text-[10px] font-bold border border-slate-100">
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                OFFLINE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-500 mt-1">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Pay Period: Feb 16 - Feb 28, 2026</span>
            <ChevronRight className="w-4 h-4" />
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-1.5 hover:text-blue-600 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-xs">Refreshed {format(lastRefresh, "h:mm a")}</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportPDF}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            PDF Report
          </button>
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Excel Export
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Submission Rate</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.submissionRate}%</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-emerald-600 text-sm font-medium">
            <ArrowUpRight className="w-4 h-4" />
            <span>5% vs last period</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Avg. Approval Time</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.avgApprovalTime}h</p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Clock className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-rose-600 text-sm font-medium">
            <ArrowDownRight className="w-4 h-4" />
            <span>1.2h slower</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Overdue</p>
              <p className="text-3xl font-bold text-rose-600 mt-1">{stats.overdue}</p>
            </div>
            <div className="p-2 bg-rose-50 rounded-lg">
              <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Action required for {stats.overdue} employees</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Headcount</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <Users className="w-6 h-6 text-slate-600" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Active employees this period</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Submission Trend</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="submissions" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Submitted" />
                <Bar dataKey="pending" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Status Distribution</h3>
          <div className="flex-1 h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}} />
                <span className="text-xs font-medium text-slate-600">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/30 flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors w-4 h-4" />
            <input
              type="text"
              placeholder="Search employee name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-slate-50 transition-all min-w-[140px] shadow-sm"
              >
                <option value="All">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Submitted">Submitted</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-slate-50 transition-all min-w-[140px] shadow-sm"
              >
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pay Period</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hours</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Submission Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-4 h-16 bg-slate-50/20" />
                  </tr>
                ))
              ) : filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                          {sub.employeeName.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{sub.employeeName}</div>
                          <div className="text-[10px] font-medium text-slate-400 font-mono">{sub.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-600">{sub.department}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-600">{sub.payPeriod}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm font-bold text-slate-700">{sub.hoursLogged} <span className="text-[10px] text-slate-400 font-medium">hrs</span></span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-500">
                        {sub.submittedAt ? format(parseISO(sub.submittedAt), "MMM dd, yyyy") : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border shadow-sm uppercase tracking-wide ${getStatusBadge(sub.status)}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleViewDetails(sub)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEditSubmission(sub)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" 
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all" title="More">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FileText className="w-12 h-12 opacity-20" />
                      <p className="font-medium">No records found matching your filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {isViewModalOpen && selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900">Timesheet Details</h3>
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-8">
              <div className="flex items-center gap-5">
                <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 text-2xl font-bold border border-blue-100 shadow-sm">
                  {selectedSubmission.employeeName.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900">{selectedSubmission.employeeName}</h4>
                  <p className="text-sm font-medium text-slate-400 font-mono tracking-wider uppercase">{selectedSubmission.employeeId}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</p>
                  <p className="text-sm font-bold text-slate-700">{selectedSubmission.department}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                  <span className={`inline-block px-3 py-1 text-[10px] font-bold rounded-full border shadow-sm uppercase tracking-wide ${getStatusBadge(selectedSubmission.status)}`}>
                    {selectedSubmission.status}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pay Period</p>
                  <p className="text-sm font-bold text-slate-700">{selectedSubmission.payPeriod}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hours Logged</p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <p className="text-sm font-bold text-slate-700">{selectedSubmission.hoursLogged} hrs</p>
                  </div>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Submission Time</p>
                  <p className="text-sm font-bold text-slate-700">
                    {selectedSubmission.submittedAt ? format(parseISO(selectedSubmission.submittedAt), "PPPP 'at' p") : "Not submitted yet"}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Edit className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Edit Timesheet</h3>
              </div>
              <button 
                onClick={() => !isSaving && setIsEditModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50"
                disabled={isSaving}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center text-slate-600 text-lg font-bold border border-slate-200 shadow-sm">
                  {selectedSubmission.employeeName.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedSubmission.employeeName}</h4>
                  <p className="text-xs font-medium text-slate-400 font-mono tracking-tight">{selectedSubmission.employeeId}</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Status</label>
                  <select 
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value as SubmissionStatus})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer hover:bg-slate-100"
                    disabled={isSaving}
                  >
                    <option value="Approved">Approved</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Hours Logged</label>
                  <div className="relative group">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                      type="number"
                      value={editFormData.hoursLogged}
                      onChange={(e) => setEditFormData({...editFormData, hoursLogged: parseFloat(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all hover:bg-slate-100"
                      placeholder="Enter hours..."
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {saveError && (
                  <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl animate-in shake-in duration-300">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-xs font-bold leading-tight">{saveError}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 active:scale-95"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-70 active:scale-95"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
