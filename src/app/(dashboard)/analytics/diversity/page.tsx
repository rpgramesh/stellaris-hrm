"use client";

import { useEffect, useState } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { analyticsService } from '@/services/analyticsService';

export default function DiversityPage() {
  const [genderData, setGenderData] = useState<{name:string; value:number}[]>([]);
  const [loading, setLoading] = useState(true);
  const COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B'];

  useEffect(() => {
    analyticsService.getGenderDistribution()
      .then(setGenderData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Diversity & Inclusion</h1>
        <p className="text-gray-500">Workforce demographics and diversity metrics.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-2xl mx-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Gender Distribution</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
                label
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
        {!loading && genderData.length === 0 && <div className="mt-6 text-center text-gray-500">No data</div>}
      </div>
    </div>
  );
}
