"use client";

import React, { useState, useEffect } from 'react';
import { Bell, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { employeeService } from '@/services/employeeService';
import { notificationService } from '@/services/notificationService';
import GlobalSearch from './GlobalSearch';

export default function Navbar() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('User');
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const employee = await employeeService.getByUserId(user.id);
          if (employee) {
            setUserName(`${employee.firstName} ${employee.lastName}`);
          }
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    };

    const fetchNotifications = async () => {
      try {
        const notifications = await notificationService.getMyNotifications();
        const unread = notifications.filter(n => !n.isRead);
        setUnreadCount(unread.length);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchUser();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
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
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-gray-700 font-medium">Welcome, {userName}</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
