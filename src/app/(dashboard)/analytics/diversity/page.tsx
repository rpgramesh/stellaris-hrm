"use client";

import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

export default function DiversityPage() {
  const genderData = [
    { name: 'Male', value: 75 },
    { name: 'Female', value: 55 },
    { name: 'Non-Binary', value: 5 },
  ];

  const COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B'];

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
        <div className="mt-6 text-center">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="font-semibold text-blue-700">Male</div>
              <div className="text-2xl font-bold text-blue-900">56%</div>
            </div>
            <div className="p-3 bg-pink-50 rounded-lg">
              <div className="font-semibold text-pink-700">Female</div>
              <div className="text-2xl font-bold text-pink-900">41%</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="font-semibold text-green-700">Non-Binary</div>
              <div className="text-2xl font-bold text-green-900">4%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
