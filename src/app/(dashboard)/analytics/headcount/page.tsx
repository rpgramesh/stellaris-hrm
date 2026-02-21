"use client";

import { useEffect, useState } from 'react';
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
import { employeeService } from '@/services/employeeService';

type HeadcountPoint = {
  month: string;
  employees: number;
};

type TurnoverPoint = {
  department: string;
  rate: number;
};

export default function HeadcountPage() {
  const [headcountTrend, setHeadcountTrend] = useState<HeadcountPoint[]>([]);
  const [turnoverData, setTurnoverData] = useState<TurnoverPoint[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await employeeService.getAll();

        const now = new Date();
        const points: HeadcountPoint[] = [];

        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

          const count = data.filter((e) => {
            if (!e.joinDate) return false;
            const join = new Date(e.joinDate);
            return join <= endOfMonth && e.status !== 'Terminated';
          }).length;

          points.push({
            month: date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }),
            employees: count
          });
        }

        setHeadcountTrend(points);

        const byDept: Record<
          string,
          { total: number; terminated: number }
        > = {};

        data.forEach((e) => {
          const dept = e.department || 'Unknown';
          if (!byDept[dept]) {
            byDept[dept] = { total: 0, terminated: 0 };
          }
          byDept[dept].total += 1;
          if (e.status === 'Terminated') {
            byDept[dept].terminated += 1;
          }
        });

        const turnover: TurnoverPoint[] = Object.keys(byDept).map((dept) => {
          const info = byDept[dept];
          const rate =
            info.total > 0 ? (info.terminated / info.total) * 100 : 0;
          return {
            department: dept,
            rate: Number(rate.toFixed(1))
          };
        });

        setTurnoverData(turnover);
      } catch (error) {
        console.error('Error loading headcount analytics', error);
      }
    };

    load();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Headcount & Turnover Analytics
        </h1>
        <p className="text-gray-500">
          Detailed analysis of workforce growth and retention (live from
          Supabase).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Headcount Growth Trend
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={headcountTrend}>
                <defs>
                  <linearGradient
                    id="colorEmployees"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#3B82F6"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="#3B82F6"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="employees"
                  stroke="#3B82F6"
                  fillOpacity={1}
                  fill="url(#colorEmployees)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Turnover by Department (% of employees marked Terminated)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={turnoverData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal
                  vertical={false}
                />
                <XAxis type="number" />
                <YAxis dataKey="department" type="category" width={100} />
                <Tooltip />
                <Bar
                  dataKey="rate"
                  fill="#EF4444"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                >
                  {turnoverData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.rate > 10 ? '#EF4444' : '#F59E0B'}
                    />
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
