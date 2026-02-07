"use client";

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart,
  Area,
  Cell
} from 'recharts';

export default function HeadcountPage() {
  const headcountTrend = [
    { month: 'Jan', employees: 120 },
    { month: 'Feb', employees: 122 },
    { month: 'Mar', employees: 125 },
    { month: 'Apr', employees: 124 },
    { month: 'May', employees: 128 },
    { month: 'Jun', employees: 135 },
  ];

  const turnoverData = [
    { department: 'Engineering', rate: 5.2 },
    { department: 'Sales', rate: 12.5 },
    { department: 'Marketing', rate: 8.1 },
    { department: 'HR', rate: 2.5 },
    { department: 'Product', rate: 4.0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Headcount & Turnover Analytics</h1>
        <p className="text-gray-500">Detailed analysis of workforce growth and retention.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Headcount Growth Trend</h3>
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

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Turnover by Department (%)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={turnoverData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis dataKey="department" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="rate" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={20}>
                   {turnoverData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.rate > 10 ? '#EF4444' : '#F59E0B'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
