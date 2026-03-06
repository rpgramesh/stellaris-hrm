"use client";

import { useState, useEffect } from "react";
import { attendanceService } from "@/services/attendanceService";
import { employeeService } from "@/services/employeeService";
import { AttendanceRecord, Employee } from "@/types";
import { format, parseISO } from "date-fns";

import { 
  Users, 
  Search, 
  Filter, 
  Calendar, 
  UserCheck, 
  Clock, 
  UserX, 
  AlertCircle, 
  Download, 
  Plus, 
  Edit, 
  Eye,
  MoreHorizontal,
  ChevronRight
} from "lucide-react";

export default function AttendanceManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [empData, attData] = await Promise.all([
          employeeService.getAll(),
          attendanceService.getAll()
        ]);
        setEmployees(empData);
        setAttendanceRecords(attData);
      } catch (error) {
        console.error("Error fetching attendance data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getEmployee = (id: string) => {
    return employees.find((e) => e.id === id);
  };

  const getEmployeeName = (id: string) => {
    const emp = getEmployee(id);
    return emp ? `${emp.firstName} ${emp.lastName}` : "Unknown Employee";
  };

  const filteredRecords = attendanceRecords.filter((record) => {
    const empName = getEmployeeName(record.employeeId).toLowerCase();
    const matchesSearch = empName.includes(searchTerm.toLowerCase()) || 
                          record.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || record.status === statusFilter;
    const matchesDate = !selectedDate || record.date === selectedDate;
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Stats calculation for the selected date
  const stats = {
    present: filteredRecords.filter(r => r.status === "Present").length,
    late: filteredRecords.filter(r => r.status === "Late").length,
    absent: filteredRecords.filter(r => r.status === "Absent").length,
    halfDay: filteredRecords.filter(r => r.status === "Half Day").length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Present":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Late":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "Absent":
        return "bg-rose-50 text-rose-700 border-rose-100";
      case "Half Day":
        return "bg-sky-50 text-sky-700 border-sky-100";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance Management</h1>
          <div className="flex items-center gap-2 text-slate-500 mt-1">
            <span>Attendance</span>
            <ChevronRight className="w-4 h-4" />
            <span>Management</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
            <Download className="w-4 h-4 text-slate-500" />
            Export
          </button>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-blue-200">
            <Plus className="w-4 h-4" />
            Add Record
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg">
            <UserCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Present</p>
            <p className="text-2xl font-bold text-slate-900">{stats.present}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Late</p>
            <p className="text-2xl font-bold text-slate-900">{stats.late}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-lg">
            <UserX className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Absent</p>
            <p className="text-2xl font-bold text-slate-900">{stats.absent}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-sky-50 rounded-lg">
            <AlertCircle className="w-6 h-6 text-sky-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Half Day</p>
            <p className="text-2xl font-bold text-slate-900">{stats.halfDay}</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors w-4 h-4" />
          <input
            type="text"
            placeholder="Search employee by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/50 border-none rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-slate-50/50 border-none rounded-lg pl-10 pr-8 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-slate-50 transition-all min-w-[140px]"
            >
              <option value="All">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
              <option value="Half Day">Half Day</option>
            </select>
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50/50 border-none rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-slate-50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Main Content Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Check In / Out</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Break</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4 h-16 bg-slate-50/20" />
                  </tr>
                ))
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((record) => {
                  const emp = getEmployee(record.employeeId);
                  return (
                    <tr key={record.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100 shadow-sm group-hover:scale-105 transition-transform">
                              {emp?.avatarUrl ? (
                                <img src={emp.avatarUrl} alt="" className="h-full w-full object-cover rounded-xl" />
                              ) : (
                                <span>{getEmployeeName(record.employeeId).split(" ").map(n => n[0]).join("")}</span>
                              )}
                            </div>
                            {record.status === "Present" && (
                              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{getEmployeeName(record.employeeId)}</div>
                            <div className="text-xs font-medium text-slate-400 font-mono tracking-tight uppercase">{record.employeeId.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="inline-flex flex-col items-center bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                          <span className="text-xs font-bold text-slate-900 uppercase">{format(parseISO(record.date), "EEE")}</span>
                          <span className="text-[10px] font-bold text-slate-400">{format(parseISO(record.date), "MMM d")}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-tighter">In</span>
                            <span className="text-sm font-bold text-slate-700">{format(parseISO(record.clockIn), "h:mm a")}</span>
                          </div>
                          <div className="h-8 w-px bg-slate-200 rotate-[20deg]" />
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-tighter">Out</span>
                            <span className="text-sm font-bold text-slate-700">{record.clockOut ? format(parseISO(record.clockOut), "h:mm a") : "--:--"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-sm font-semibold">{record.totalBreakMinutes || 0} <span className="text-xs text-slate-400 font-medium">mins</span></span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-[11px] font-bold rounded-full border shadow-sm ${getStatusColor(record.status)} uppercase tracking-wide`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Edit Record">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all" title="More Options">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 grayscale opacity-50">
                      <Users className="w-12 h-12 text-slate-300" />
                      <p className="text-slate-500 font-medium tracking-tight">No attendance records found for this selection.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
