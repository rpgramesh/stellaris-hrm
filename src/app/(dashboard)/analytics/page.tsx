"use client";

import { useEffect, useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { analyticsService } from '@/services/analyticsService';

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [headcountTrend, setHeadcountTrend] = useState<{month:string; employees:number}[]>([]);
  const [salaryData, setSalaryData] = useState<{department:string; actual:number}[]>([]);
  const [genderData, setGenderData] = useState<{name:string; value:number}[]>([]);
  const COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B'];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [hc, sal, gen] = await Promise.all([
          analyticsService.getHeadcountTrend(6),
          analyticsService.getDepartmentSalaryActuals(),
          analyticsService.getGenderDistribution()
        ]);
        setHeadcountTrend(hc);
        setSalaryData(sal);
        setGenderData(gen);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalHeadcount = useMemo(() => headcountTrend.length ? headcountTrend[headcountTrend.length-1].employees : 0, [headcountTrend]);
  const femaleSlice = (genderData.find(g => g.name === 'Female')?.value || 0);
  const totalGender = genderData.reduce((s, g) => s + g.value, 0) || 1;
  const femalePct = Math.round((femaleSlice / totalGender) * 100);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HR Analytics Dashboard</h1>
          <p className="text-gray-500">Real-time insights into workforce metrics and trends.</p>
        </div>
        <div className="flex gap-2">
          <select className="border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500">
            <option>Last 6 Months</option>
            <option>Year to Date</option>
            <option>Last Year</option>
          </select>
          <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm">
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm font-medium mb-1">Total Headcount</div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-gray-900">{totalHeadcount}</span>
          </div>
          <div className="text-xs text-gray-400 mt-2">vs. last month</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm font-medium mb-1">Turnover Rate</div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-gray-900">{Math.max(0, totalHeadcount - (headcountTrend[headcountTrend.length-2]?.employees || 0))}</span>
          </div>
          <div className="text-xs text-gray-400 mt-2">Change vs last month</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm font-medium mb-1">Total Salary Cost</div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-gray-900">${(salaryData.reduce((s, d) => s + d.actual, 0)).toLocaleString()}</span>
            <span className="text-gray-500 text-sm mb-1">/ total</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '92%' }}></div>
          </div>
          <div className="text-xs text-gray-400 mt-1">92% of budget utilized</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm font-medium mb-1">Gender Ratio (F/M)</div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-gray-900">{femalePct}%</span>
            <span className="text-gray-500 text-sm mb-1">Female</span>
          </div>
          <div className="flex mt-3 h-1.5 rounded-full overflow-hidden">
            <div className="bg-pink-500 h-full" style={{ width: `${femalePct}%` }}></div>
            <div className="bg-blue-500 h-full" style={{ width: `${100 - femalePct}%` }}></div>
          </div>
          <div className="text-xs text-gray-400 mt-1">Goal: 45% Female</div>
        </div>
      </div>

      {/* Main Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headcount Growth */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Headcount Growth</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={headcountTrend}>
                <defs>
                  <linearGradient id="colorEmployees" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="employees" stroke="#3B82F6" fillOpacity={1} fill="url(#colorEmployees)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Salary Costs vs Budget */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Salary Costs by Department</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salaryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="department" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="actual" name="Actual" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gender Diversity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-1">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Gender Diversity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center text-sm text-gray-500">
            Diversity metrics are based on self-reported data.
          </div>
        </div>

        {/* Turnover by Department */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Department Salary Contribution (%)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salaryData.map(d => ({ department: d.department, rate: d.actual }))} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis dataKey="department" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="rate" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20}>
                  {salaryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Contribution calculated from sum of employee salaries per department
          </div>
        </div>
      </div>
    </div>
  );
}
