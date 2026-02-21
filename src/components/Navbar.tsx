"use client";

import React, { useState, useEffect } from 'react';
import { Bell, User, ChevronDown } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { employeeService } from '@/services/employeeService';
import { notificationService } from '@/services/notificationService';
import GlobalSearch from './GlobalSearch';
import { menuItems as sidebarMenuItems } from './Sidebar';

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
  const pathname = usePathname();
  const [userName, setUserName] = useState<string>('User');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedMenus, setMobileExpandedMenus] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

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
            setUserRole(employee.role);
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

  const filteredMenuItems = sidebarMenuItems
    .filter(item => {
      if (!userRole) return false;

      if (userRole === 'Employee') {
        return ['Dashboard', 'Self Service (ESS)'].includes(item.name);
      }

      if (userRole === 'Manager') {
        return ['Dashboard', 'Self Service (ESS)', 'Team', 'Leave'].includes(item.name);
      }

      if (['HR Admin', 'HR Manager'].includes(userRole)) {
        return item.name !== 'Settings';
      }

      return true;
    })
    .map(item => {
      if (userRole === 'Manager' && item.name === 'Leave' && item.subItems) {
        const allowedSubItems = ['Review', 'Planner', 'Schedule', 'Management'];
        return {
          ...item,
          subItems: item.subItems.filter(sub => sub.name && allowedSubItems.includes(sub.name))
        };
      }

      if (['HR Admin', 'HR Manager'].includes(userRole!) && item.subItems) {
        return {
          ...item,
          subItems: item.subItems.filter(sub => sub.name !== 'Web Account')
        };
      }
      return item;
    });

  const toggleMobileSection = (name: string) => {
    setMobileExpandedMenus(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  return (
    <>
      <header className="bg-white shadow px-4 py-3 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            className="md:hidden p-2 rounded-full hover:bg-gray-100 border border-gray-200"
            aria-label="Open navigation menu"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="block w-5 h-0.5 bg-gray-800 rounded-sm mb-1" />
            <span className="block w-5 h-0.5 bg-gray-800 rounded-sm mb-1" />
            <span className="block w-5 h-0.5 bg-gray-800 rounded-sm" />
          </button>
          <Link
            href="/dashboard"
            className="md:hidden flex items-center"
          >
            <img
              src="/logo.png"
              alt="Stellaris HRM"
              className="h-8 w-auto object-contain"
            />
          </Link>
          <div className="hidden sm:flex flex-1 max-w-md">
            <GlobalSearch />
          </div>
        </div>
        <div className="flex items-center space-x-3">
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
              <div className="hidden sm:flex flex-col items-start leading-tight">
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
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-30">
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
      <div className="px-4 pt-2 pb-3 sm:hidden">
        <GlobalSearch />
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Close navigation menu"
            onClick={() => {
              setMobileMenuOpen(false);
              setMobileExpandedMenus([]);
            }}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80%] bg-gray-900 text-white shadow-xl transform transition-transform duration-300">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
              <Link
                href="/dashboard"
                className="flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                <img
                  src="/logo.png"
                  alt="Stellaris HRM"
                  className="h-8 w-auto object-contain"
                />
              </Link>
              <button
                type="button"
                className="p-2 rounded-full hover:bg-gray-800"
                aria-label="Close navigation menu"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setMobileExpandedMenus([]);
                }}
              >
                <span className="block w-5 h-0.5 bg-white rotate-45 translate-y-[2px]" />
                <span className="block w-5 h-0.5 bg-white -rotate-45 -translate-y-[2px]" />
              </button>
            </div>
            <nav className="overflow-y-auto h-full pb-20">
              <ul className="pt-2">
                {filteredMenuItems.map(item => {
                  const isActive =
                    pathname === item.href ||
                    (item.subItems && item.subItems.some(sub => sub.href && pathname === sub.href));
                  const isExpanded = mobileExpandedMenus.includes(item.name);

                  return (
                    <li key={item.name}>
                      {item.subItems ? (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleMobileSection(item.name)}
                            className={`w-full flex items-center justify-between px-4 py-3 min-h-[44px] ${
                              isActive
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-200 hover:bg-gray-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {item.icon && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5 min-w-[20px]"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d={item.icon}
                                  />
                                </svg>
                              )}
                              <span className="text-sm font-medium">{item.name}</span>
                            </div>
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          {isExpanded && (
                            <ul className="pl-11 pr-4 pb-1 space-y-1 bg-gray-900/90">
                              {item.subItems.map((subItem, index) => {
                                if (subItem.type === 'divider') {
                                  return (
                                    <li
                                      key={`divider-${item.name}-${index}`}
                                      className="my-1 border-t border-gray-700"
                                    />
                                  );
                                }
                                const isSubActive = pathname === subItem.href;
                                return (
                                  <li key={subItem.name}>
                                    <Link
                                      href={subItem.href!}
                                      className={`block w-full rounded-md px-3 py-2 text-sm min-h-[40px] ${
                                        isSubActive
                                          ? 'bg-gray-800 text-white font-medium'
                                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                      }`}
                                      onClick={() => {
                                        setMobileMenuOpen(false);
                                        setMobileExpandedMenus([]);
                                      }}
                                    >
                                      {subItem.name}
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </>
                      ) : (
                        <Link
                          href={item.href}
                          className={`flex items-center gap-3 px-4 py-3 min-h-[44px] ${
                            isActive ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-gray-800'
                          }`}
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setMobileExpandedMenus([]);
                          }}
                        >
                          {item.icon && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 min-w-[20px]"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d={item.icon}
                              />
                            </svg>
                          )}
                          <span className="text-sm font-medium">{item.name}</span>
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
