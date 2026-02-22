"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { employeeService } from '@/services/employeeService';

export const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  {
    name: 'Self Service (ESS)',
    href: '/self-service',
    icon: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    subItems: [
      { name: 'My Dashboard', href: '/self-service' },
      { name: 'My Payslips', href: '/self-service/payslips' },
      { name: 'Profile & Bank', href: '/self-service/profile' },
      { name: 'Apply Leave', href: '/self-service/leave' },
      { name: 'Timesheets', href: '/attendance' },
      { name: 'Jobs', href: '/self-service/jobs' },
      { name: 'My Learning', href: '/talent/learning' },
      { name: '100-Point ID Check', href: '/self-service/id-check' },
      { name: 'Hardware Onboarding', href: '/self-service/hardware-onboarding' },
    ]
  },
  { 
    name: 'Employee', 
    href: '/employees', 
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    subItems: [
      { name: 'Management', href: '/employees' },
      { name: 'Onboarding', href: '/employees/onboarding' },
      { name: 'Offboarding', href: '/employees/offboarding' },
      { name: 'Request', href: '/employees/requests' },
      { type: 'divider' },
      { name: 'Employment Terms', href: '/employees/terms' },
      { name: 'Education', href: '/employees/education' },
      { name: 'Experience', href: '/employees/experience' },
      { name: 'Identification Documents', href: '/employees/documents' },
    ]
  },
  {
    name: 'Talent',
    href: '/talent',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    subItems: [
      { name: 'Recruitment (ATS)', href: '/talent/recruitment' },
      { name: 'L&D / Training', href: '/talent/learning' },
    ]
  },
  {
    name: 'Compliance',
    href: '/compliance',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  { 
    name: 'Expense Claim', 
    href: '/expenses', 
    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    subItems: [
      { name: 'Management', href: '/expenses/management' },
      { name: 'Review', href: '/expenses/review' },
      { name: 'Transaction Report', href: '/expenses/reports' },
      { name: 'Category', href: '/expenses/categories' },
      { name: 'Type', href: '/expenses/types' },
      { name: 'Approval Workflow', href: '/expenses/workflows' },
    ]
  },
  { 
    name: 'Leave', 
    href: '/leave', 
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    subItems: [
      { name: 'Management', href: '/leave/management' },
      { name: 'Planner', href: '/leave/planner' },
      { name: 'Schedule', href: '/leave/schedule' },
      { name: 'Review', href: '/leave/review' },
      { name: 'Transaction Report', href: '/leave/transaction-report' },
      { name: 'Entitlement Report', href: '/leave/entitlement-report' },
      { name: 'Type', href: '/leave/types' },
      { name: 'Earning Policy', href: '/leave/earning-policy' },
      { name: 'Approval Workflow', href: '/leave/workflows' },
      { name: 'Workday', href: '/leave/workday' },
      { name: 'Holiday', href: '/leave/holiday' },
      { name: 'Setting', href: '/leave/settings' },
    ]
  },
  { 
    name: 'Attendance', 
    href: '/attendance', 
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    subItems: [
      { name: 'Projects & Approvers', href: '/attendance/projects' },
      { name: 'Workday', href: '/attendance/workday' },
      { name: 'Holiday', href: '/attendance/holiday' },
      { name: 'Setting', href: '/attendance/settings' },
    ]
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    subItems: [
      { name: 'Overview', href: '/analytics' },
      { name: 'Headcount & Turnover', href: '/analytics/headcount' },
      { name: 'Salary & Costs', href: '/analytics/salary' },
      { name: 'Diversity & Inclusion', href: '/analytics/diversity' },
    ]
  },
  { 
    name: 'Document Workflow', 
    href: '/documents', 
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    subItems: [
      { name: 'Management', href: '/documents/management' },
      { name: 'Review', href: '/documents/review' },
      { name: 'Approval Workflow', href: '/documents/workflows' },
    ]
  },
  { 
    name: 'WHS (Incident)', 
    href: '/incidents', 
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    subItems: [
      { name: 'Incident Management', href: '/incidents/management' },
      { name: 'Hazard Management', href: '/incidents/hazards' },
      { name: 'Risk Assessment', href: '/incidents/risk-assessments' },
      { name: 'Causeless Incident', href: '/incidents/causeless' },
      { type: 'divider' },
      { name: 'Category', href: '/incidents/category' },
      { name: 'Type', href: '/incidents/type' },
      { name: 'Decision', href: '/incidents/decision' },
    ]
  },
  { 
    name: 'Team', 
    href: '/team', 
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    subItems: [
      { name: 'Discussion', href: '/team/discussion' },
      { name: 'Document & Form Sharing', href: '/team/sharing' },
      { name: 'Announcement', href: '/team/announcement' },
    ]
  },
  { 
    name: 'Payroll', 
    href: '/payroll', 
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    subItems: [
      { name: 'Dashboard', href: '/payroll' },
      { name: 'Salary Adjustments', href: '/payroll/adjustments' },
      { name: 'Process Payroll', href: '/payroll/process' },
      { name: 'Superannuation', href: '/payroll/superannuation' },
      { name: 'STP Phase 2', href: '/payroll/stp' },
      { name: 'Award Interpretation', href: '/payroll/award-interpretation' },
      { name: 'Annual Salary Statement', href: '/payroll/annual-salary-statement' },
      { name: 'Earning', href: '/payroll/earning' },
      { name: 'Deduction', href: '/payroll/deduction' },
      { name: 'Bonus', href: '/payroll/bonus' },
      { name: 'Statutory Contribution', href: '/payroll/statutory-contribution' },
      { name: 'Statutory Table', href: '/payroll/statutory-table' },
      { name: 'Settings', href: '/payroll/settings' },
    ]
  },
  { 
    name: 'Employer', 
    href: '/employer', 
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    subItems: [
      { name: 'Information', href: '/employer/information' },
      { name: 'Organization Hierarchy', href: '/organization' },
      { type: 'divider' },
      { name: 'Job Position', href: '/employer/job-positions' },
      { name: 'Department', href: '/employer/departments' },
      { name: 'Branch', href: '/employer/branches' },
      { name: 'Level', href: '/employer/levels' },
      { type: 'divider' },
      { name: 'Bank', href: '/employer/banks' },
      { name: 'Course', href: '/employer/courses' },
      { name: 'Trainer', href: '/employer/trainers' },
      { name: 'Ethnicity', href: '/employer/ethnicities' },
      { name: 'Religion', href: '/employer/religions' },
      { name: 'Document Category', href: '/employer/document-categories' },
      { type: 'divider' },
      { name: 'Setting', href: '/employer/settings' },
      { name: 'Module Access', href: '/employer/module-access' },
      { name: 'HR Role', href: '/employees/hr-roles' },
    ]
  },
  { name: 'Reports', href: '/reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { name: 'Settings', href: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('User');
  const [userPosition, setUserPosition] = useState('');
  const [roleMenuPermissions, setRoleMenuPermissions] = useState<string[] | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const employee = await employeeService.getByUserId(user.id);
          if (employee) {
            const primaryRole = employee.role;
            const accessRole = employee.systemAccessRole;
            const adminRoles = ['Administrator', 'Super Admin', 'Employer Admin', 'HR Admin', 'HR Manager'];
            const resolvedRole = adminRoles.includes(primaryRole)
              ? primaryRole
              : accessRole || primaryRole;
            setUserRole(resolvedRole);
            setUserName(`${employee.firstName} ${employee.lastName}`);
            setUserPosition(employee.position || employee.role);

            const { data: roleRow } = await supabase
              .from('user_roles')
              .select('permissions')
              .eq('name', resolvedRole)
              .eq('is_active', true)
              .single();

            if (roleRow) {
              setRoleMenuPermissions(roleRow.permissions || []);
            } else {
              setRoleMenuPermissions(null);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  useEffect(() => {
    if (!userRole) return;
    const channel = supabase
      .channel(`role-menu-${userRole}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_roles',
          filter: `name=eq.${userRole}`
        },
        payload => {
          const nextPermissions = (payload.new as any)?.permissions || [];
          setRoleMenuPermissions(nextPermissions);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole]);

  const isExpanded = isLocked || isHovered;

  const toggleMenu = (name: string) => {
    setExpandedMenus(prev => 
      prev.includes(name) ? [] : [name]
    );
  };

  const filteredMenuItems = menuItems
    .filter(item => {
      if (loading) return false;
      if (!userRole) return false;

      const hasMenuConfig =
        roleMenuPermissions && roleMenuPermissions.some(p => typeof p === 'string' && p.startsWith('menu:'));

      if (!hasMenuConfig) {
        if (userRole === 'Employee') {
          return ['Dashboard', 'Self Service (ESS)'].includes(item.name);
        }
        if (userRole === 'Manager') {
          return ['Dashboard', 'Team', 'Leave'].includes(item.name);
        }
        if (['HR Admin', 'HR Manager'].includes(userRole)) {
          return item.name !== 'Settings' && item.name !== 'Self Service (ESS)';
        }
        return item.name !== 'Self Service (ESS)';
      }

      const menuKey = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const keyToken = `menu:${menuKey}`;
      return roleMenuPermissions!.includes(keyToken);
    })
    .map(item => {
      if (userRole === 'Manager' && item.name === 'Leave' && item.subItems) {
        const allowedSubItems = ['Review', 'Planner', 'Schedule', 'Management'];
        return {
          ...item,
          subItems: item.subItems.filter(sub => sub.name && allowedSubItems.includes(sub.name))
        };
      }

      // Additional sub-item filtering for HR Admin
      if (['HR Admin', 'HR Manager'].includes(userRole!) && item.subItems) {
        // Hide 'Web Account' from HR Admin
        return {
          ...item,
          subItems: item.subItems.filter(sub => sub.name !== 'Web Account')
        };
      }
      return item;
    });

  return (
    <aside 
      className={`bg-gray-900 text-white min-h-screen flex flex-col shadow-xl transition-all duration-300 group overflow-hidden z-50 ${isExpanded ? 'w-64' : 'w-20'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`p-4 border-b border-gray-200 bg-white flex items-center transition-all duration-300 whitespace-nowrap overflow-hidden relative ${isExpanded ? 'justify-between' : 'justify-center'}`}>
        <Link href="/dashboard" className="flex items-center overflow-hidden">
          <img 
            src="/logo.png" 
            alt="Stellaris HRM" 
            className={`h-10 w-auto transition-opacity duration-300 ${isExpanded ? 'opacity-100 static' : 'opacity-0 absolute'}`}
          />
          <div
            className={`flex items-center justify-center rounded-full border border-gray-200 bg-white transition-opacity duration-300 ${isExpanded ? 'opacity-0 absolute' : 'opacity-100 block'}`}
          >
            <img
              src="/logo-icon.png"
              alt="Stellaris HRM"
              className="h-8 w-8 object-contain"
            />
          </div>
        </Link>
        
        {isExpanded && (
          <button 
            onClick={() => setIsLocked(!isLocked)}
            className="flex items-center text-xs text-gray-500 hover:text-gray-700 transition-colors ml-3"
            title={isLocked ? 'Sidebar pinned open' : 'Sidebar auto-hide'}
            type="button"
          >
            <span
              className={`w-9 h-5 flex items-center rounded-full transition-colors ${
                isLocked ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                  isLocked ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </span>
          </button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-4 overflow-x-hidden">
        <ul className="space-y-1 px-3">
          {loading ? (
             // Simple loading skeleton or just empty
             <div className="animate-pulse space-y-4 mt-4">
               {[1, 2, 3, 4].map(i => (
                 <div key={i} className="h-10 bg-gray-800 rounded-lg w-full"></div>
               ))}
             </div>
          ) : (
            filteredMenuItems.map((item) => {
            const isActive = pathname === item.href || (item.subItems && item.subItems.some(sub => sub.href && pathname === sub.href));
            const isMenuExpanded = expandedMenus.includes(item.name);

            return (
              <li key={item.name}>
                {item.subItems ? (
                  <div className="space-y-1">
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 min-w-[24px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                          </svg>
                        )}
                        <span className={`font-medium transition-opacity duration-200 whitespace-nowrap ${isExpanded ? 'opacity-100 block' : 'opacity-0 hidden'}`}>{item.name}</span>
                      </div>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-4 w-4 transition-transform duration-200 ${isMenuExpanded ? 'transform rotate-180' : ''} ${isExpanded ? 'opacity-100 block' : 'opacity-0 hidden'}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {isMenuExpanded && (
                      <ul className={`pl-4 space-y-1 mt-1 animate-fade-in-down ${isExpanded ? 'block' : 'hidden'}`}>
                        {item.subItems.map((subItem, index) => {
                          if (subItem.type === 'divider') {
                            return <li key={`divider-${index}`} className="my-2 border-t border-gray-700" />;
                          }
                          const isSubActive = pathname === subItem.href;
                          return (
                            <li key={subItem.name}>
                              <Link
                                href={subItem.href!}
                                className={`block py-2 px-3 rounded-md text-sm transition-colors whitespace-nowrap ${
                                  isSubActive
                                    ? 'bg-gray-800 text-white font-medium border-l-2 border-blue-500'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                }`}
                              >
                                {subItem.name}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {item.icon && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 min-w-[24px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                      </svg>
                    )}
                    <span className={`font-medium transition-opacity duration-200 whitespace-nowrap ${isExpanded ? 'opacity-100 block' : 'opacity-0 hidden'}`}>{item.name}</span>
                  </Link>
                )}
              </li>
            );
          }))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 min-w-[32px] rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold">
                {userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div className={`text-sm transition-opacity duration-200 whitespace-nowrap ${isExpanded ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                <div className="font-medium">{userName}</div>
                <div className="text-gray-400 text-xs">{userPosition}</div>
            </div>
        </div>
      </div>
    </aside>
  );
}
