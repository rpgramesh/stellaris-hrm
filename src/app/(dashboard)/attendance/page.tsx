"use client";

import { useState, useEffect } from 'react';
import { attendanceService } from '@/services/attendanceService';
import { employeeService } from '@/services/employeeService';
import { supabase } from '@/lib/supabase';
import { AttendanceRecord, BreakRecord, Employee } from '@/types';

export default function AttendancePage() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number, address?: string} | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);

  const [breakStartTime, setBreakStartTime] = useState<string | null>(null);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [selectedBreakType, setSelectedBreakType] = useState<'Lunch' | 'Short' | 'Tea' | 'Other'>('Lunch');
  const [breakNote, setBreakNote] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedProjectCode, setSelectedProjectCode] = useState('');
  const [note, setNote] = useState('');
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [workerType, setWorkerType] = useState<'Permanent' | 'Casual' | 'Contract'>('Permanent');

  useEffect(() => {
    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    
    // Set initial time to avoid hydration mismatch
    setCurrentTime(new Date().toLocaleTimeString());

    return () => clearInterval(interval);
  }, []);

  // Fetch Initial Data
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const emp = await employeeService.getByUserId(user.id);
          if (emp) {
            setCurrentEmployee(emp);
            setWorkerType(emp.status as any || 'Permanent'); // Sync worker type from profile

            // Fetch recent attendance (last 30 days)
            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            
            const records = await attendanceService.getAll(
              thirtyDaysAgo.toISOString().split('T')[0], 
              today.toISOString().split('T')[0], 
              emp.id
            );
            setAttendanceHistory(records);

            // Check if currently clocked in (today's record with no clock out)
            // Sort by date/time descending to get latest
            if (records.length > 0) {
                // Find if there is an open record (no clock out)
                const openRecord = records.find(r => !r.clockOut);
                if (openRecord) {
                    setIsClockedIn(true);
                    setCurrentRecordId(openRecord.id);
                    // Check if on break
                    // Assuming last break has no end time? Schema says break object has endTime.
                    // If we want to track "currently on break", we'd need to check if the last break in the array has no end time.
                    // But the BreakRecord type usually requires endTime? 
                    // Let's check logic: handleBreakAction creates a break record ONLY when ending the break.
                    // So "isOnBreak" state is local while the break is happening.
                    // If page refreshes, we lose "isOnBreak" state unless we persist it or check an incomplete break record in DB.
                    // For now, let's assume we don't persist "in-progress" break state in DB structure shown (JSONB array).
                    // To persist it, we'd need a separate status or structure.
                    // We'll stick to local state for now, acknowledging limitation on refresh.
                }
            }
          }
        }
      } catch (error) {
        console.error("Error initializing attendance page:", error);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const getLocation = () => {
    return new Promise<{lat: number, lng: number}>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation is not supported by your browser');
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            reject('Unable to retrieve your location');
          }
        );
      }
    });
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, upload to server/cloud storage
      // For now, just simulate upload
      setPhotoUploaded(true);
      setTimeout(() => setPhotoUploaded(false), 3000); // Reset after 3 seconds
    }
  };

  const handleBreakAction = async () => {
    if (!currentRecordId || !currentEmployee) return;

    if (isOnBreak) {
      // End Break
      const breakEndTime = new Date().toISOString();
      const breakStartISO = breakStartTime ? new Date(breakStartTime).toISOString() : new Date().toISOString();
      
      // Calculate break duration in minutes
      const breakDuration = Math.round((new Date(breakEndTime).getTime() - new Date(breakStartISO).getTime()) / (1000 * 60));
      
      // Create break record
      const breakRecord: BreakRecord = {
        id: `BR${Date.now()}`,
        startTime: breakStartISO,
        endTime: breakEndTime,
        type: selectedBreakType,
        notes: breakNote || undefined
      };
      
      // Update DB
      try {
          // Get current record to append break
          const currentRecord = attendanceHistory.find(r => r.id === currentRecordId);
          if (currentRecord) {
              const updatedBreaks = [...(currentRecord.breaks || []), breakRecord];
              const updatedTotalBreak = (currentRecord.totalBreakMinutes || 0) + breakDuration;

              const updated = await attendanceService.update(currentRecordId, {
                  breaks: updatedBreaks,
                  totalBreakMinutes: updatedTotalBreak
              });

              // Update local state
              setAttendanceHistory(prev => prev.map(r => r.id === currentRecordId ? updated : r));
          }
      } catch (err) {
          console.error("Error saving break:", err);
          alert("Failed to save break record");
      }
      
      setIsOnBreak(false);
      setBreakStartTime(null);
      setBreakNote('');
    } else {
      // Start Break
      setIsOnBreak(true);
      setBreakStartTime(new Date().toISOString());
    }
  };

  const handleClockAction = async () => {
    if (!currentEmployee) {
        alert("Employee profile not found. Please contact HR.");
        return;
    }

    setLoading(true);
    setLocationError('');
    
    try {
      // 1. Get Location
      const coords = await getLocation();
      setLocation(coords);

      if (!isClockedIn) {
        // Clock In Logic
        const newRecordPayload = {
          employeeId: currentEmployee.id,
          date: new Date().toISOString().split('T')[0],
          clockIn: new Date().toISOString(),
          location: {
            lat: coords.lat,
            lng: coords.lng,
            address: 'Detected Location' 
          },
          status: 'Present' as const, 
          workerType: workerType,
          projectCode: selectedProjectCode || undefined,
          notes: note || undefined,
          breaks: [],
          totalBreakMinutes: 0
        };

        const savedRecord = await attendanceService.create(newRecordPayload);
        setAttendanceHistory([savedRecord, ...attendanceHistory]);
        setCurrentRecordId(savedRecord.id);
        setIsClockedIn(true);
      } else {
        // Clock Out Logic
        if (currentRecordId) {
            const updated = await attendanceService.update(currentRecordId, {
                clockOut: new Date().toISOString()
            });
            setAttendanceHistory(prev => prev.map(r => r.id === currentRecordId ? updated : r));
        }
        setIsClockedIn(false);
        setCurrentRecordId(null);
        setNote('');
        setSelectedJob('');
      }
    } catch (error: any) {
      console.error("Clock action error:", error);
      setLocationError(typeof error === 'string' ? error : 'An error occurred. Ensure location access is allowed.');
    } finally {
      setLoading(false);
    }
  };

  const getWorkerData = (): { type: string; infoTitle: string; infoValue: string; secondaryTitle?: string; secondaryValue?: string } => {
    switch(workerType) {
      case 'Casual':
        return {
          type: 'Casual - Level 3',
          infoTitle: 'Est. Earnings',
          infoValue: '$0.00', // Dynamic calc not implemented
          secondaryTitle: 'Hours Cap',
          secondaryValue: '38h / week'
        };
      case 'Contract':
        return {
          type: 'Contractor - Fixed Term',
          infoTitle: 'Contract End',
          infoValue: currentEmployee?.endOfProbation || 'N/A',
          secondaryTitle: 'Billable',
          secondaryValue: 'Yes'
        };
      case 'Permanent':
      default:
        return {
          type: 'Permanent - Full Time',
          infoTitle: 'Next Review',
          infoValue: currentEmployee?.nextReviewDate || 'N/A',
          secondaryTitle: 'Scheduled',
          secondaryValue: '8h 00m'
        };
    }
  };

  const currentShift = {
    start: '09:00 AM',
    end: '05:00 PM',
    type: workerType,
    role: currentEmployee?.position || 'Employee'
  };

  const workerData = getWorkerData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Time & Attendance</h1>
          <p className="text-gray-500">Track your work hours, breaks, and location.</p>
        </div>
        <div className="flex items-center gap-4">
           {/* Demo Toggle */}
           <div className="bg-white border border-gray-200 rounded-lg p-1 flex text-xs font-medium">
              {(['Permanent', 'Casual', 'Contract'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setWorkerType(type)}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    workerType === type 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {type}
                </button>
              ))}
           </div>

           <div className="text-right hidden md:block">
              <div className="text-sm text-gray-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div className="text-2xl font-mono font-bold text-gray-900">{currentTime || '--:--:--'}</div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Clock Panel */}
        <div className="lg:col-span-2 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col items-center justify-center space-y-8">
            
            {/* Shift Info Banner */}
            <div className="w-full grid grid-cols-3 gap-4 bg-blue-50 border border-blue-100 rounded-lg p-4">
               <div>
                 <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Shift</span>
                 <div className="text-blue-900 font-medium">{currentShift.start} - {currentShift.end}</div>
               </div>
               <div className="text-center">
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{workerData.infoTitle}</span>
                  <div className="text-blue-900 font-medium">{workerData.infoValue}</div>
               </div>
               <div className="text-right">
                 <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Type</span>
                 <div className="text-blue-900 font-medium">{workerData.type}</div>
               </div>
            </div>

            <div className="relative">
              <button
                onClick={handleClockAction}
                disabled={loading || isOnBreak}
                className={`w-64 h-64 rounded-full flex flex-col items-center justify-center transition-all transform hover:scale-105 shadow-xl border-8 relative z-10
                  ${loading ? 'bg-gray-100 border-gray-300 cursor-not-allowed' : 
                    isOnBreak ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' :
                    isClockedIn 
                      ? 'bg-red-50 border-red-500 text-red-600 hover:bg-red-100 ring-4 ring-red-100' 
                      : 'bg-green-50 border-green-500 text-green-600 hover:bg-green-100 ring-4 ring-green-100'
                  }`}
              >
                {loading ? (
                  <span className="text-gray-500 font-semibold animate-pulse">Processing...</span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-3xl font-bold">{isClockedIn ? 'Clock Out' : 'Clock In'}</span>
                    {isClockedIn && <span className="text-sm mt-2 font-medium">Since {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                  </>
                )}
              </button>
            </div>

            {/* Break Controls */}
            {isClockedIn && (
              <div className="space-y-4 w-full max-w-md">
                {/* Break Type Selection */}
                {isOnBreak && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-medium text-orange-900 mb-3">Break Details</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-orange-800 mb-1">Break Type</label>
                        <select 
                          value={selectedBreakType}
                          onChange={(e) => setSelectedBreakType(e.target.value as 'Lunch' | 'Short' | 'Tea' | 'Other')}
                          className="w-full rounded-lg border-orange-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 bg-white"
                        >
                          <option value="Lunch">Lunch Break</option>
                          <option value="Short">Short Break</option>
                          <option value="Tea">Tea Break</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-orange-800 mb-1">Notes (Optional)</label>
                        <textarea 
                          value={breakNote}
                          onChange={(e) => setBreakNote(e.target.value)}
                          className="w-full rounded-lg border-orange-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 bg-white"
                          rows={2}
                          placeholder="Add break notes..."
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-4 w-full justify-center">
                   <button 
                      onClick={handleBreakAction}
                      className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                        isOnBreak 
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                      }`}
                   >
                      {isOnBreak ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                          End Break
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Start Break
                        </>
                      )}
                   </button>
                </div>
              </div>
            )}
            
            {/* Status Messages */}
            <div className="text-center space-y-2">
               {isOnBreak && (
                 <div className="text-orange-600 font-medium animate-pulse">
                   On {selectedBreakType} Break since {breakStartTime ? new Date(breakStartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                 </div>
               )}
               {location && (
                 <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                   </svg>
                   {location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                 </p>
               )}
               {locationError && (
                 <p className="text-sm text-red-500 flex items-center justify-center gap-1">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                   </svg>
                   {locationError}
                 </p>
               )}
            </div>
          </div>
        </div>

        {/* Side Panel: Job Codes & Notes */}
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Job Details</h3>
              <div className="space-y-4">
                 <div className="space-y-4">
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Job/Task</label>
                       <select 
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                         value={selectedJob}
                         onChange={(e) => setSelectedJob(e.target.value)}
                         disabled={!isClockedIn}
                       >
                          <option value="">Select Job</option>
                          <option value="Warehouse Loading">Warehouse Loading</option>
                          <option value="Delivery Route A">Delivery Route A</option>
                          <option value="Site Cleanup">Site Cleanup</option>
                          <option value="Event Setup">Event Setup</option>
                       </select>
                    </div>
                    
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Project Code</label>
                       <select 
                         className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                         value={selectedProjectCode}
                         onChange={(e) => setSelectedProjectCode(e.target.value)}
                         disabled={!isClockedIn}
                       >
                          <option value="">Select Project Code</option>
                          <option value="PJ-101">PJ-101 - Construction Site A</option>
                          <option value="PJ-102">PJ-102 - Warehouse Operations</option>
                          <option value="PJ-103">PJ-103 - Event Management</option>
                          <option value="PJ-104">PJ-104 - Delivery Services</option>
                          <option value="PJ-105">PJ-105 - Cleaning Services</option>
                       </select>
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shift Notes</label>
                    <textarea 
                       value={note}
                       onChange={(e) => setNote(e.target.value)}
                       className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                       rows={3}
                       placeholder="Add notes about your shift..."
                       disabled={!isClockedIn}
                    />
                 </div>
                 
                 {/* Photo / Verification - Especially for Field/Casual */}
                 {(workerType === 'Casual' || workerType === 'Contract') && (
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Proof of Work / Site Photo</label>
                       <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={!isClockedIn}
                            id="photo-upload"
                          />
                          <label 
                            htmlFor="photo-upload"
                            className={`w-full border-2 border-dashed rounded-lg p-4 flex items-center justify-center gap-2 transition-colors ${
                              photoUploaded 
                                ? 'border-green-300 bg-green-50 text-green-600' 
                                : 'border-gray-300 text-gray-500 hover:border-blue-500 hover:text-blue-500'
                            } ${!isClockedIn ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                             {photoUploaded ? (
                               <>
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                 </svg>
                                 <span>Photo Uploaded!</span>
                               </>
                             ) : (
                               <>
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                 </svg>
                                 <span>Add Photo</span>
                               </>
                             )}
                          </label>
                       </div>
                    </div>
                 )}
              </div>
           </div>

           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Today's Summary</h3>
              <div className="space-y-3">
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{workerData.secondaryTitle || 'Scheduled'}</span>
                    <span className="font-medium text-gray-900">{workerData.secondaryValue || '8h 00m'}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Worked</span>
                    <span className="font-medium text-green-600">3h 45m</span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Break</span>
                    <span className="font-medium text-orange-600">0h 30m</span>
                 </div>
                 <div className="pt-3 border-t flex justify-between font-medium">
                    <span className="text-gray-900">Remaining</span>
                    <span className="text-blue-600">4h 15m</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worker Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Code</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breaks</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendanceHistory.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.clockOut ? new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.location?.address || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${record.status === 'Present' ? 'bg-green-100 text-green-800' : 
                        record.status === 'Late' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.workerType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.projectCode || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.breaks && record.breaks.length > 0 ? (
                      <div className="text-xs">
                        <div>{record.breaks.length} break(s)</div>
                        <div className="text-gray-500">{record.totalBreakMinutes || 0} min total</div>
                      </div>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
