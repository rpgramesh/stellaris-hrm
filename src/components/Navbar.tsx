"use client";

import React, { useState, useEffect } from 'react';
import { Bell, User, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { employeeService } from '@/services/employeeService';
import { notificationService } from '@/services/notificationService';
import GlobalSearch from './GlobalSearch';

const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
};

export default function Navbar() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('User');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error fetching user details:', formatError(error));
          return;
        }
        const user = data?.user;
        if (user) {
          const employee = await employeeService.getByUserId(user.id);
          if (employee) {
            setUserName(`${employee.firstName} ${employee.lastName}`);
            if (employee.avatarUrl) {
              setAvatarUrl(employee.avatarUrl);
            }
          }
        }
      } catch (error) {
        console.error('Unexpected error fetching user details:', formatError(error));
      }
    };

    const fetchNotifications = async () => {
      try {
        const notifications = await notificationService.getMyNotifications();
        const unread = notifications.filter(n => !n.isRead);
        setUnreadCount(unread.length);
      } catch (error) {
        console.error('Unexpected error fetching notifications:', formatError(error));
      }
    };

    fetchUser();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <header className="bg-white shadow p-4 flex justify-between items-center z-10 relative">
      <div className="flex items-center w-96">
        <GlobalSearch />
      </div>
      <div className="flex items-center space-x-4">
        <button
          type="button"
          onClick={() => router.push('/notifications')}
          className="p-2 hover:bg-gray-100 rounded-full relative"
          aria-label="Open notifications"
        >
          <Bell className="w-6 h-6 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[0.5rem] h-2 bg-red-500 rounded-full" />
          )}
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(prev => !prev)}
            className="flex items-center space-x-2 px-2 py-1 rounded-full hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[11px] text-gray-400">Welcome</span>
              <span className="text-sm font-medium text-gray-700 truncate max-w-[140px]">
                {userName}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${
                profileOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  router.push('/self-service/profile');
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                My Profile
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
