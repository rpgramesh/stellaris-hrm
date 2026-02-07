 "use client";
 
 import { useState } from "react";
import { PayComponent } from "@/types/payroll";

type RuleRow = {
   id: string;
   award: string;
   penaltyRate: number;
   overtimeRule: string;
   allowance: string;
   shiftLoading: number;
 };
 
 export default function AwardInterpretationPage() {
   const [rows, setRows] = useState<RuleRow[]>([
    { id: "R1", award: "Clerks Award", penaltyRate: 25, overtimeRule: "After 38h/week", allowance: "Meal", shiftLoading: 15 },
    { id: "R2", award: "Manufacturing Award", penaltyRate: 30, overtimeRule: "After 8h/day", allowance: "Tool", shiftLoading: 20 },
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const handleRunInterpretation = async () => {
    setIsProcessing(true);
    try {
      const mockRecords = [
        { id: "ATT001", date: "2025-06-02", clockIn: "2025-06-02T08:00:00", clockOut: "2025-06-02T17:00:00" },
        { id: "ATT002", date: "2025-06-07", clockIn: "2025-06-07T09:00:00", clockOut: "2025-06-07T14:00:00" },
      ];

      const response = await fetch('/api/payroll/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: mockRecords, hourlyRate: 40 }),
      });

      if (!response.ok) throw new Error("Failed to interpret");

      const data = await response.json();
      setTestResults(data);
    } catch (error) {
      alert("Error running interpretation");
      console.error(error);
    }
    setIsProcessing(false);
  };

  const addRow = () => {
     const id = `R${rows.length + 1}`;
     setRows([...rows, { id, award: "", penaltyRate: 0, overtimeRule: "", allowance: "", shiftLoading: 0 }]);
   };
 
   const updateRow = (id: string, patch: Partial<RuleRow>) => {
     setRows(rows.map(r => (r.id === id ? { ...r, ...patch } : r)));
   };
 
   const removeRow = (id: string) => {
     setRows(rows.filter(r => r.id !== id));
   };
 
   return (
     <div className="space-y-6 p-6">
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-2xl font-bold">Automated Award Interpretation</h1>
           <p className="text-gray-600">Configure penalty rates, overtime, allowances, and shift loadings.</p>
         </div>
         <button onClick={addRow} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
           Add Rule
         </button>
       </div>
 
       <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
         <div className="px-6 py-4 border-b border-gray-200">
           <h2 className="text-lg font-semibold">Award Rule Set</h2>
         </div>
         <div className="overflow-x-auto">
           <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-50">
               <tr>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Award</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Penalty Rate (%)</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime Rule</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allowance</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift Loading (%)</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
               </tr>
             </thead>
             <tbody className="bg-white divide-y divide-gray-200">
               {rows.map(r => (
                 <tr key={r.id} className="hover:bg-gray-50">
                   <td className="px-6 py-4">
                     <input
                       value={r.award}
                       onChange={e => updateRow(r.id, { award: e.target.value })}
                       className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                       placeholder="Modern Award name"
                     />
                   </td>
                   <td className="px-6 py-4">
                     <input
                       type="number"
                       value={r.penaltyRate}
                       onChange={e => updateRow(r.id, { penaltyRate: Number(e.target.value) })}
                       className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                       placeholder="0"
                     />
                   </td>
                   <td className="px-6 py-4">
                     <input
                       value={r.overtimeRule}
                       onChange={e => updateRow(r.id, { overtimeRule: e.target.value })}
                       className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                       placeholder="Rule description"
                     />
                   </td>
                   <td className="px-6 py-4">
                     <input
                       value={r.allowance}
                       onChange={e => updateRow(r.id, { allowance: e.target.value })}
                       className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                       placeholder="Allowance type"
                     />
                   </td>
                   <td className="px-6 py-4">
                     <input
                       type="number"
                       value={r.shiftLoading}
                       onChange={e => updateRow(r.id, { shiftLoading: Number(e.target.value) })}
                       className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                       placeholder="0"
                     />
                   </td>
                   <td className="px-6 py-4">
                     <button
                       onClick={() => removeRow(r.id)}
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
       <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 mt-6">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Test Interpretation Engine</h2>
          <button 
            onClick={handleRunInterpretation}
            disabled={isProcessing}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isProcessing ? "Processing..." : "Run Simulation (Backend)"}
          </button>
        </div>
        {testResults.length > 0 && (
          <div className="p-6 space-y-4">
            {testResults.map((res) => (
              <div key={res.recordId} className="border rounded-md p-4 bg-gray-50">
                <h3 className="font-medium text-gray-800 mb-2">Date: {res.date}</h3>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase">Units</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {res.components.map((comp, idx) => (
                      <tr key={idx}>
                        <td className="text-sm text-gray-900">{comp.code}</td>
                        <td className="text-sm text-gray-600">{comp.description}</td>
                        <td className="text-sm text-gray-900 text-right">{comp.units.toFixed(2)}</td>
                        <td className="text-sm text-gray-900 text-right">${comp.rate.toFixed(2)}</td>
                        <td className="text-sm text-gray-900 text-right font-medium">${comp.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
