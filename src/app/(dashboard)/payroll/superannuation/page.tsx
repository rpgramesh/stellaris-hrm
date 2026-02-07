 "use client";
 
 import { useMemo, useState } from "react";
 
 type RateSchedule = { id: string; effective: string; rate: number };
 
 export default function SuperannuationPage() {
   const [schedules, setSchedules] = useState<RateSchedule[]>([
     { id: "SR1", effective: "2025-07-01", rate: 12 },
     { id: "SR0", effective: "2024-07-01", rate: 11.5 },
   ]);
 
   const currentRate = useMemo(() => {
     const today = new Date().toISOString().slice(0, 10);
     const sorted = [...schedules].sort((a, b) => (a.effective < b.effective ? 1 : -1));
     const match = sorted.find(s => s.effective <= today) || sorted[sorted.length - 1];
     return match.rate;
   }, [schedules]);
 
   const addSchedule = () => {
     const id = `SR${schedules.length + 1}`;
     setSchedules([{ id, effective: "", rate: 0 }, ...schedules]);
   };
 
   const updateSchedule = (id: string, patch: Partial<RateSchedule>) => {
     setSchedules(schedules.map(s => (s.id === id ? { ...s, ...patch } : s)));
   };
 
   const removeSchedule = (id: string) => {
     setSchedules(schedules.filter(s => s.id !== id));
   };
 
   return (
     <div className="space-y-6 p-6">
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-2xl font-bold">Superannuation Guarantee Management</h1>
           <p className="text-gray-600">Automated calculation and reporting. 12% from 1 July 2025.</p>
         </div>
         <div className="text-right">
           <div className="text-sm text-gray-600">Current Rate</div>
           <div className="text-2xl font-bold text-blue-600">{currentRate}%</div>
         </div>
       </div>
 
       <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
         <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
           <h2 className="text-lg font-semibold">Rate Schedule</h2>
           <button onClick={addSchedule} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
             Add Schedule
           </button>
         </div>
         <div className="overflow-x-auto">
           <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-50">
               <tr>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Date</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate (%)</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
               </tr>
             </thead>
             <tbody className="bg-white divide-y divide-gray-200">
               {schedules.map(s => (
                 <tr key={s.id} className="hover:bg-gray-50">
                   <td className="px-6 py-4">
                     <input
                       type="date"
                       value={s.effective}
                       onChange={e => updateSchedule(s.id, { effective: e.target.value })}
                       className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                     />
                   </td>
                   <td className="px-6 py-4">
                     <input
                       type="number"
                       step="0.1"
                       value={s.rate}
                       onChange={e => updateSchedule(s.id, { rate: Number(e.target.value) })}
                       className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                     />
                   </td>
                   <td className="px-6 py-4">
                     <button
                       onClick={() => removeSchedule(s.id)}
                       className="px-3 py-1 rounded-md text-sm bg-red-600 text-white hover:bg-red-700"
                     >
                       Remove
                     </button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </div>
     </div>
   );
 }
