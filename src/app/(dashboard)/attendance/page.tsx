"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Copy, 
  Save,
  CheckCircle,
  Users,
  Loader2,
  X,
  Trash2
} from 'lucide-react';
import {
  format,
  addDays,
  startOfWeek,
  subWeeks,
  addWeeks,
  isSameDay,
  parseISO,
  isValid
} from 'date-fns';
import { supabase } from '@/lib/supabase';
import { timesheetService } from '@/services/timesheetService';
import { 
  validateProjectAddition,
  validateDailyLimit,
  validateWeeklyLimit,
  validateWeeklyMinimum,
  MAX_DAILY_HOURS,
  MAX_WEEKLY_HOURS
} from '@/utils/timesheetValidation';
import { projectService } from '@/services/projectService';
import { employeeService } from '@/services/employeeService';
import { leaveService } from '@/services/leaveService';
import { holidayService } from '@/services/holidayService';
import { Timesheet, TimesheetRow, Project, Employee, LeaveRequest } from '@/types';
import { PublicHoliday } from '@/services/holidayService';

export default function TimesheetPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Leave & Holiday State
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  
  // UI State
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isTeammatesDropdownOpen, setIsTeammatesDropdownOpen] = useState(false);
  const [teammates, setTeammates] = useState<Employee[]>([]);

  // Refs for click outside
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  useEffect(() => {
    // Initial Load: Get User & Projects
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const emp = await employeeService.getByUserId(user.id);
          setCurrentUser(emp || null);
          setCurrentEmployee(emp || null);
          if (emp) {
            if (emp.department) {
              fetchTeammates(emp.department);
            }
          }
        }
        
        const allProjects = await projectService.getAll();
        setProjects(allProjects);
      } catch (error) {
        console.error("Init error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    init();

    // Click outside listener
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (currentEmployee) {
      fetchTimesheet(currentEmployee.id, currentWeekStart);
      
      // Realtime subscription for Leave Requests
      const channel = supabase
        .channel('leave_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'leave_requests',
            filter: `employee_id=eq.${currentEmployee.id}`
          },
          () => {
             console.log("Leave updated, refreshing timesheet...");
             fetchTimesheet(currentEmployee.id, currentWeekStart);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentWeekStart, currentEmployee]);

  const fetchTimesheet = async (employeeId: string, date: Date) => {
    setLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const weekEnd = addDays(date, 6);
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

      // Fetch Timesheet, Leaves, and Holidays in parallel
      const [timesheetData, leavesData, holidaysData] = await Promise.all([
        timesheetService.getByWeek(employeeId, dateStr),
        leaveService.getByDateRange(employeeId, dateStr, weekEndStr),
        holidayService.getHolidays(dateStr, weekEndStr)
      ]);
      
      let finalTimesheet = timesheetData;
      
      if (!finalTimesheet) {
        // Create draft if not exists (ONLY if viewing own timesheet)
        if (currentUser?.id === employeeId) {
          finalTimesheet = await timesheetService.create(employeeId, dateStr);
        }
      }
      setTimesheet(finalTimesheet);
      setLeaves(leavesData);
      setHolidays(holidaysData);

    } catch (error) {
      console.error("Error fetching data:", error);
      if (typeof error === 'object' && error !== null) {
        console.error("Error details:", JSON.stringify(error, null, 2));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTeammates = async (departmentName: string) => {
    try {
      const team = await employeeService.getTeammates(departmentName);
      setTeammates(team);
    } catch (error) {
      console.error("Error fetching teammates:", error);
    }
  };

  const handlePrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));

  const handleAddRow = async (project: Project) => {
    if (!timesheet) return;
    
    // Validate Project Addition
    const validation = validateProjectAddition(project, timesheet.rows || [], projects);

    if (!validation.isValid) {
      // Error (Strict Duplicate)
      console.warn(`[Timesheet] Blocked duplicate project addition: ${validation.message}`);
      alert(validation.message);
      setIsProjectDropdownOpen(false);
      return;
    }

    if (validation.type === 'warning') {
      // Warning (Soft Duplicate)
      console.warn(`[Timesheet] Warning for duplicate project addition: ${validation.message}`);
      const confirmed = confirm(`${validation.message}\n\nDo you want to add "${project.name}" anyway?`);
      if (!confirmed) {
        setIsProjectDropdownOpen(false);
        return;
      }
    }

    try {
      const newRow = await timesheetService.addRow(timesheet.id, project.id, 'Project');
      setTimesheet(prev => prev ? {
        ...prev,
        rows: [...(prev.rows || []), newRow]
      } : null);
      setIsProjectDropdownOpen(false);
    } catch (error) {
      console.error("Error adding row:", error);
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    if (!confirm('Are you sure you want to remove this project from the timesheet?')) return;
    
    try {
      await timesheetService.deleteRow(rowId);
      setTimesheet(prev => prev ? {
        ...prev,
        rows: prev.rows?.filter(r => r.id !== rowId) || []
      } : null);
    } catch (error) {
      console.error("Error deleting row:", error);
      alert('Failed to delete row');
    }
  };

  const handleUpdateHours = async (rowId: string, date: Date, value: string) => {
    if (!timesheet) return;

    let numValue = 0;
    if (value.includes(':')) {
      const [hours, minutes] = value.split(':').map(Number);
      if (!isNaN(hours)) {
        numValue = hours + (isNaN(minutes) ? 0 : minutes / 60);
      }
    } else {
      numValue = parseFloat(value);
    }

    if (isNaN(numValue)) numValue = 0;

    // Optimistic Update
    const dateStr = format(date, 'yyyy-MM-dd');
    setTimesheet(prev => {
      if (!prev) return null;
      return {
        ...prev,
        rows: prev.rows?.map(row => {
          if (row.id === rowId) {
            const existingEntryIndex = row.entries?.findIndex(e => e.date === dateStr);
            let newEntries = [...(row.entries || [])];
            
            if (existingEntryIndex !== undefined && existingEntryIndex >= 0) {
              if (numValue === 0) {
                 newEntries.splice(existingEntryIndex, 1);
              } else {
                 newEntries[existingEntryIndex] = { ...newEntries[existingEntryIndex], hours: numValue };
              }
            } else if (numValue > 0) {
              newEntries.push({ id: 'temp', rowId, date: dateStr, hours: numValue });
            }
            
            return { ...row, entries: newEntries };
          }
          return row;
        })
      };
    });

    // API Call (Debounce could be added here)
    try {
      await timesheetService.saveEntry(rowId, dateStr, numValue);
    } catch (error) {
      console.error("Error saving entry:", error);
      // Revert on error?
    }
  };

  const handleCopyLastWeek = async () => {
    if (!timesheet || !currentEmployee) return;
    setSaving(true);
    try {
      const lastWeekDate = subWeeks(currentWeekStart, 1);
      const lastWeekTimesheet = await timesheetService.getByWeek(currentEmployee.id, format(lastWeekDate, 'yyyy-MM-dd'));
      
      if (lastWeekTimesheet) {
        await timesheetService.copyLastWeek(timesheet.id, lastWeekTimesheet.id);
        fetchTimesheet(currentEmployee.id, currentWeekStart); // Refresh
      } else {
        alert("No timesheet found for last week.");
      }
    } catch (error) {
      console.error("Error copying last week:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!currentEmployee || !timesheet?.rows) return;
    const name = prompt("Enter template name:");
    if (!name) return;
    
    try {
      const projectIds = timesheet.rows
        .filter(r => r.type === 'Project' && r.projectId)
        .map(r => r.projectId!)
        .filter(Boolean);
        
      await timesheetService.saveTemplate(currentEmployee.id, name, projectIds);
      alert("Template saved!");
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  const handleSubmit = async () => {
    if (!timesheet) return;

    // Validation Checks
    const weeklyTotal = calculateWeeklyTotal();
    
    // Check Max Weekly Limit
    const weeklyMaxValidation = validateWeeklyLimit(weeklyTotal);
    if (!weeklyMaxValidation.isValid) {
      alert(`Cannot submit: ${weeklyMaxValidation.message}`);
      return;
    }

    // Check Min Weekly Limit (New Requirement)
    const weeklyMinValidation = validateWeeklyMinimum(weeklyTotal);
    if (!weeklyMinValidation.isValid) {
      alert(`Cannot submit: ${weeklyMinValidation.message}`);
      return;
    }

    for (const day of weekDays) {
      const dailyTotal = calculateDailyTotal(day);
      const dailyValidation = validateDailyLimit(dailyTotal);
      if (!dailyValidation.isValid) {
        alert(`Cannot submit: ${format(day, 'EEE')} - ${dailyValidation.message}`);
        return;
      }
    }

    if (confirm("Are you sure you want to submit this timesheet for approval?")) {
      try {
        await timesheetService.updateStatus(timesheet.id, 'Submitted');
        setTimesheet(prev => prev ? { ...prev, status: 'Submitted' } : null);
      } catch (error) {
        console.error("Error submitting:", error);
      }
    }
  };

  // Helpers
  const getHours = (row: TimesheetRow, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const entry = row.entries?.find(e => e.date === dateStr);
    return entry?.hours || 0;
  };

  const calculateDailyTotal = (date: Date) => {
    if (!timesheet?.rows) return 0;
    const dateStr = format(date, 'yyyy-MM-dd');
    return timesheet.rows.reduce((total, row) => {
      const entry = row.entries?.find(e => e.date === dateStr);
      return total + (entry?.hours || 0);
    }, 0);
  };

  const calculateWeeklyTotal = () => {
    if (!timesheet?.rows) return 0;
    return timesheet.rows.reduce((total, row) => {
      return total + (row.entries?.reduce((sum, e) => sum + e.hours, 0) || 0);
    }, 0);
  };

  const calculateLeaveHours = () => {
    let total = 0;
    weekDays.forEach(day => {
      const status = getBlockedStatus(day);
      if (status?.type === 'Leave') {
         total += 8; // Assuming 8 hour standard day
      } else if (status?.type === 'PartialLeave') {
         total += (status.hours || 0);
      }
    });
    return total;
  };

  const calculateHolidayHours = () => {
    let total = 0;
    weekDays.forEach(day => {
      const status = getBlockedStatus(day);
      if (status?.type === 'Holiday') {
         total += 8; // Assuming 8 hour standard day
      }
    });
    return total;
  };

  const formatHours = (hours: number) => {
    if (!hours) return '';
    if (hours % 1 === 0) return `${hours}:00`;
    const minutes = Math.round((hours % 1) * 60);
    return `${Math.floor(hours)}:${minutes.toString().padStart(2, '0')}`;
  };

  const isApprover = useMemo(() => {
    if (!currentUser || !timesheet || !projects.length) return false;
    // Check if current user manages any project in the timesheet
    return timesheet.rows?.some(row => {
      const project = projects.find(p => p.id === row.projectId);
      return project?.managerId === currentUser.id;
    });
  }, [currentUser, timesheet, projects]);

  const handleStatusChange = async (status: 'Approved' | 'Rejected') => {
    if (!timesheet) return;
    try {
      await timesheetService.updateStatus(timesheet.id, status);
      setTimesheet({ ...timesheet, status });
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  const getBlockedStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check Public Holidays
    const holiday = holidays.find(h => h.date === dateStr);
    if (holiday) {
      return { type: 'Holiday', name: holiday.name };
    }
    
    // Check Leaves
    const leave = leaves.find(l => {
      return dateStr >= l.startDate && dateStr <= l.endDate;
    });
    
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (leave && !isWeekend) {
      // Check for partial leave
      if (leave.startDate === leave.endDate && leave.totalHours && leave.totalHours < 8) {
         return { type: 'PartialLeave', name: leave.type, leave, hours: leave.totalHours };
      }
      return { type: 'Leave', name: leave.type, leave };
    }
    
    return null;
  };

  if (loading && !timesheet) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-gray-800">Timesheet</h1>
          {timesheet?.status && (
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                timesheet.status === 'Approved' ? 'bg-green-100 text-green-800' :
                timesheet.status === 'Submitted' ? 'bg-blue-100 text-blue-800' :
                timesheet.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {timesheet.status}
              </span>

              {/* Partial Leave Legend */}
              <div className="flex items-center gap-2 ml-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Leave</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Holiday</span>
              </div>

              {isApprover && timesheet.status === 'Submitted' && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleStatusChange('Approved')}
                    className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Approve
                  </button>
                  <button 
                    onClick={() => handleStatusChange('Rejected')}
                    className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setIsTeammatesDropdownOpen(!isTeammatesDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Users className="w-4 h-4" />
              Teammates
            </button>
            {isTeammatesDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-2">
                  {teammates.map(tm => (
                    <button 
                      key={tm.id} 
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                      onClick={() => {
                        setCurrentEmployee(tm);
                        setIsTeammatesDropdownOpen(false);
                      }}
                    >
                      {tm.firstName} {tm.lastName} {tm.id === currentEmployee?.id && '(You)'}
                    </button>
                  ))}
                  {teammates.length === 0 && <div className="p-2 text-sm text-gray-500">No teammates found</div>}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center bg-white border border-gray-300 rounded-lg shadow-sm">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border-r border-gray-300 hover:bg-gray-50">
              {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d')}
            </button>
            <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-50 border-r border-gray-300 text-gray-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={handleNextWeek} className="p-2 hover:bg-gray-50 text-gray-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Timesheet Table */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Total Worked</div>
          <div className="text-2xl font-semibold text-gray-900">{formatHours(calculateWeeklyTotal())}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Total Leave</div>
          <div className="text-2xl font-semibold text-green-600">{formatHours(calculateLeaveHours())}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500">Total Holiday</div>
          <div className="text-2xl font-semibold text-purple-600">{formatHours(calculateHolidayHours())}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                  Projects
                </th>
                {weekDays.map(day => (
                  <th key={day.toString()} className="px-4 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                    {format(day, 'EEE, MMM d')}
                  </th>
                ))}
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {/* Status Indicator Row */}
              <tr>
                <td className="p-0"></td>
                {weekDays.map((day) => {
                  const status = getBlockedStatus(day);
                  return (
                    <td key={day.toString()} className="p-0 relative">
                      {status && (
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-full flex justify-center pointer-events-none">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shadow-sm whitespace-nowrap ${
                            status.type === 'Holiday' 
                              ? 'bg-purple-100 text-purple-800 border-purple-200' 
                              : 'bg-green-100 text-green-800 border-green-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              status.type === 'Holiday' ? 'bg-purple-500' : 'bg-green-500'
                            }`}></span>
                            {status.name}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="p-0"></td>
              </tr>

              {/* Project Rows */}
              {timesheet?.rows?.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {row.project && (
                          <>
                            <div className={`w-2 h-2 rounded-full ${row.project.color}`}></div>
                            <span className="text-sm font-medium text-gray-900">{row.project.name}</span>
                          </>
                        )}
                        {!row.project && (
                          <span className="text-sm font-medium text-gray-500 italic">{row.type}</span>
                        )}
                      </div>
                      {timesheet?.status === 'Draft' && (
                        <button 
                          onClick={() => handleDeleteRow(row.id)}
                          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Remove project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  {weekDays.map((day, i) => {
                    const isWeekend = i === 5 || i === 6;
                    const status = getBlockedStatus(day);
                    const hours = getHours(row, day);
                    // Block only if it's a full day leave or holiday
                    const isBlocked = status && status.type !== 'PartialLeave';
                    const isPartial = status?.type === 'PartialLeave';
                    
                    // Calculate remaining hours for partial leave
                    const maxHours = isPartial && status.hours ? (24 - status.hours) : 24;

                    return (
                      <td key={day.toString()} className={`px-2 py-3 ${isWeekend ? 'bg-gray-50/50' : ''} ${isBlocked ? 'bg-gray-50/50' : ''}`}>
                         <div className={`relative ${status ? (status.type === 'Holiday' ? 'bg-purple-50/30' : 'bg-green-50/30') + ' -mx-2 px-2 py-1 rounded' : ''}`}>
                            <input 
                              type="text" 
                              className={`w-full text-center border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm h-9 border ${
                                isBlocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                              } ${isPartial && getHours(row, day) > maxHours ? 'border-red-500 text-red-600' : ''}`}
                              placeholder={isBlocked ? (status?.type === 'Holiday' ? 'H' : 'L') : (isPartial ? `Max ${maxHours}h` : "")}
                              value={isBlocked ? '' : formatHours(hours)}
                              disabled={timesheet.status !== 'Draft' || !!isBlocked}
                              onChange={(e) => {
                                const val = e.target.value;
                                // Basic validation for partial leave
                                let numVal = parseFloat(val);
                                if (val.includes(':')) {
                                  const [h, m] = val.split(':').map(Number);
                                  numVal = h + (m/60);
                                }
                                
                                if (isPartial && numVal > maxHours) {
                                  // We allow typing but show red border (handled in className)
                                  // Optional: prevent input > maxHours
                                  // return; 
                                }
                                handleUpdateHours(row.id, day, val);
                              }}
                              title={status ? `${status.name} (${status.type})${isPartial ? ` - ${status.hours}h taken` : ''}` : ''}
                            />
                         </div>
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {formatHours(row.entries?.reduce((sum, e) => sum + e.hours, 0) || 0)}
                  </td>
                </tr>
              ))}

              {/* Add New Row / Select Project */}
              {timesheet?.status === 'Draft' && (
                <tr className="hover:bg-gray-50 border-t-2 border-gray-100 relative">
                  <td className="px-6 py-4 whitespace-nowrap overflow-visible">
                    <div className="relative" ref={projectDropdownRef}>
                      {!isProjectDropdownOpen ? (
                        <button 
                          onClick={() => setIsProjectDropdownOpen(true)}
                          className="flex items-center gap-2 text-blue-500 hover:text-blue-600 font-medium text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Select project
                        </button>
                      ) : (
                        <div className="absolute top-0 left-0 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                          <div className="p-2 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Available Projects</span>
                            <button onClick={() => setIsProjectDropdownOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
                          </div>
                          {projects.filter(p => !timesheet?.rows?.some(r => r.projectId === p.id)).map(p => (
                            <button
                              key={p.id}
                              onClick={() => handleAddRow(p)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <div className={`w-2 h-2 rounded-full ${p.color}`}></div>
                              <span className="text-sm text-gray-700">{p.name}</span>
                            </button>
                          ))}
                          {projects.length === 0 && <div className="p-3 text-sm text-gray-500">No projects found.</div>}
                        </div>
                      )}
                    </div>
                  </td>
                  {weekDays.map(day => (
                    <td key={day.toString()} className="px-2 py-3">
                      <div className="w-full h-9 bg-gray-50 rounded border border-gray-200 border-dashed"></div>
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right text-sm text-gray-400">0:00</td>
                </tr>
              )}

              {/* Total Row */}
              <tr className="bg-gray-100 font-semibold text-gray-900">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  Total
                </td>
                {weekDays.map(day => {
                   const dailyTotal = calculateDailyTotal(day);
                   const validation = validateDailyLimit(dailyTotal);
                   return (
                     <td key={day.toString()} className={`px-4 py-4 whitespace-nowrap text-center text-sm ${
                        !validation.isValid ? 'text-red-600 bg-red-50' : ''
                     }`}>
                       {formatHours(dailyTotal)}
                       {!validation.isValid && (
                         <div className="text-[10px] text-red-500 font-normal mt-0.5" title={validation.message}>
                           Max {MAX_DAILY_HOURS}h
                         </div>
                       )}
                     </td>
                   );
                })}
                <td className={`px-6 py-4 whitespace-nowrap text-right text-sm ${
                  !validateWeeklyLimit(calculateWeeklyTotal()).isValid ? 'text-red-600 bg-red-50' : ''
                }`}>
                  {formatHours(calculateWeeklyTotal())}
                  {!validateWeeklyLimit(calculateWeeklyTotal()).isValid && (
                    <div className="text-[10px] text-red-500 font-normal mt-0.5">
                      Max {MAX_WEEKLY_HOURS}h
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsProjectDropdownOpen(true)}
            disabled={timesheet?.status !== 'Draft'}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4 text-blue-500" />
            Add new row
          </button>
          <button 
            onClick={handleCopyLastWeek}
            disabled={timesheet?.status !== 'Draft' || saving}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50"
          >
            <Copy className="w-4 h-4 text-gray-500" />
            {saving ? 'Copying...' : 'Copy last week'}
          </button>
          <button 
            onClick={handleSaveTemplate}
            disabled={timesheet?.status !== 'Draft'}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-gray-500" />
            Save as template
          </button>
        </div>

        <div>
          <button 
            onClick={handleSubmit}
            disabled={timesheet?.status !== 'Draft'}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-blue-500 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {timesheet?.status === 'Submitted' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Submitted
              </>
            ) : (
              'Submit for Approval'
            )}
          </button>
        </div>
      </div>
      {/* Summary Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <p className="text-sm font-medium text-blue-600">Total Worked</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{formatHours(calculateWeeklyTotal())} hrs</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <p className="text-sm font-medium text-green-600">Leave Hours</p>
            <p className="text-2xl font-bold text-green-900 mt-1">
              {leaves.reduce((sum, l) => {
                let daysInWeek = 0;
                weekDays.forEach(day => {
                    const dStr = format(day, 'yyyy-MM-dd');
                    if (dStr >= l.startDate && dStr <= l.endDate) {
                        daysInWeek++;
                    }
                });
                return sum + daysInWeek;
              }, 0) * 8} hrs
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <p className="text-sm font-medium text-purple-600">Public Holidays</p>
            <p className="text-2xl font-bold text-purple-900 mt-1">{holidays.length * 8} hrs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
