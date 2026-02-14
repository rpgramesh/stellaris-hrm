"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Navigation Items
const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', keywords: ['home', 'main'] },
  { name: 'Employees', path: '/employees', keywords: ['staff', 'people', 'users', 'directory'] },
  { name: 'Payroll', path: '/payroll', keywords: ['salary', 'payments', 'money', 'payslips'] },
  { name: 'Leave Management', path: '/leave', keywords: ['time off', 'vacation', 'sick', 'holidays'] },
  { name: 'Attendance', path: '/attendance', keywords: ['clock', 'timesheet', 'hours'] },
  { name: 'Recruitment', path: '/talent/recruitment', keywords: ['hiring', 'jobs', 'candidates', 'ats'] },
  { name: 'Organization', path: '/organization', keywords: ['departments', 'branches', 'structure'] },
  { name: 'Settings', path: '/settings', keywords: ['config', 'admin', 'profile'] },
  { name: 'Self Service', path: '/self-service', keywords: ['my', 'personal', 'ess'] },
];

interface SearchResult {
  type: 'employee' | 'page';
  title: string;
  subtitle?: string;
  url: string;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Click outside to close
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  useEffect(() => {
    const search = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      setIsOpen(true);

      try {
        // 1. Search Pages
        const pageResults: SearchResult[] = NAV_ITEMS
          .filter(item => 
            item.name.toLowerCase().includes(query.toLowerCase()) || 
            item.keywords.some(k => k.includes(query.toLowerCase()))
          )
          .map(item => ({
            type: 'page',
            title: item.name,
            subtitle: 'Navigation',
            url: item.path
          }));

        // 2. Search Employees
        // Note: Using a simple OR query. For production, consider a more robust search index or RPC.
        const { data: employees, error } = await supabase
          .from('employees')
          .select('id, first_name, last_name, email, department:departments(name), position:job_positions(title)')
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(5);

        let employeeResults: SearchResult[] = [];
        if (employees) {
          employeeResults = employees.map((emp: any) => ({
            type: 'employee',
            title: `${emp.first_name} ${emp.last_name}`,
            subtitle: `${emp.position?.title || 'No Position'} • ${emp.department?.name || 'No Dept'}`,
            url: `/employees?view=${emp.id}` // Navigate to employee list with view param
          }));
        }

        setResults([...pageResults, ...employeeResults]);

      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (url: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(url);
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          placeholder="Search employees, pages..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-colors text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if(query.length >= 2) setIsOpen(true); }}
        />
        <div className="absolute left-3 top-2.5 text-gray-400">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
        </div>
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50">
          <ul className="max-h-96 overflow-y-auto py-2">
            {results.map((result, index) => (
              <li key={index}>
                <button
                  onClick={() => handleSelect(result.url)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start space-x-3 transition-colors group border-b border-gray-50 last:border-0"
                >
                  <div className={`mt-1 p-1.5 rounded-full flex-shrink-0 ${result.type === 'employee' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                    {result.type === 'employee' ? <User className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {result.title}
                    </div>
                    {result.subtitle && (
                      <div className="text-xs text-gray-500 truncate">
                        {result.subtitle}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOpen && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-100 p-4 text-center text-gray-500 z-50 text-sm">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
}
