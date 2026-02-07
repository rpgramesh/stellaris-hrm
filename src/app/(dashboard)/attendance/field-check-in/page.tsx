"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

export default function FieldCheckInPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLocationCheck = () => {
    setIsLoadingLocation(true);
    // Simulate getting location
    setTimeout(() => {
      setLocation({
        lat: 40.7128,
        lng: -74.0060,
        address: "123 Field St, New York, NY"
      });
      setIsLoadingLocation(false);
    }, 1500);
  };

  const handleCheckAction = () => {
    if (!location) {
      handleLocationCheck();
      return;
    }
    // Simulate API call
    setIsCheckedIn(!isCheckedIn);
    alert(isCheckedIn ? "Checked Out Successfully" : "Checked In Successfully");
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Field Check-In</h1>
        <p className="text-gray-500">Mobile attendance for field workers</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        <div className="p-8 text-center bg-gradient-to-b from-blue-50 to-white">
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
            {format(currentTime, "EEEE, MMMM d, yyyy")}
          </div>
          <div className="text-5xl font-bold text-gray-900 tracking-tight font-mono">
            {format(currentTime, "HH:mm:ss")}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Location Status */}
          <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${location ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">Location</div>
                <div className="text-xs text-gray-500">
                  {isLoadingLocation ? "Acquiring..." : location ? location.address : "Location required"}
                </div>
              </div>
            </div>
            {!location && (
              <button 
                onClick={handleLocationCheck}
                disabled={isLoadingLocation}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Refresh
              </button>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={handleCheckAction}
            disabled={isLoadingLocation}
            className={`w-full h-48 rounded-full border-8 shadow-xl transition-all transform active:scale-95 flex flex-col items-center justify-center gap-2
              ${isCheckedIn 
                ? 'bg-red-500 border-red-100 hover:bg-red-600 text-white' 
                : 'bg-blue-600 border-blue-100 hover:bg-blue-700 text-white'
              }`}
          >
            <div className="text-3xl font-bold uppercase tracking-widest">
              {isCheckedIn ? "Check Out" : "Check In"}
            </div>
            <div className="text-sm opacity-80 font-medium">
              {isCheckedIn ? "End your shift" : "Start your shift"}
            </div>
          </button>

          {/* Photo Verification (Mock) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Photo Verification</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer">
              <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="mt-2 block text-xs font-medium text-gray-500">Tap to take photo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider ml-1">Recent Activity</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Checked In</div>
                <div className="text-xs text-gray-500">Today, 09:00 AM</div>
              </div>
            </div>
            <div className="text-xs font-medium text-gray-500">Field St</div>
          </div>
          <div className="p-4 flex items-center justify-between">
             <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Checked Out</div>
                <div className="text-xs text-gray-500">Yesterday, 05:30 PM</div>
              </div>
            </div>
            <div className="text-xs font-medium text-gray-500">Field St</div>
          </div>
        </div>
      </div>
    </div>
  );
}
