 "use client";
 
 import { useState } from "react";
 
 type Accrual = {
   enabled: boolean;
   method: "Per Pay Period" | "Per Hour Worked";
   rate: number;
   capDays?: number;
   carryOver: boolean;
   negativeAllowed: boolean;
 };
 
 export default function EarningPolicyPage() {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      alert("Earning policies saved successfully!");
    }, 1000);
  };

  const [annual, setAnnual] = useState<Accrual>({
     enabled: true,
     method: "Per Pay Period",
     rate: 1.538,
     capDays: 20,
     carryOver: true,
     negativeAllowed: false,
   });
 
   const [personal, setPersonal] = useState<Accrual>({
     enabled: true,
     method: "Per Pay Period",
     rate: 0.769,
     capDays: 10,
     carryOver: false,
     negativeAllowed: false,
   });
 
   const [longService, setLongService] = useState<Accrual>({
     enabled: true,
     method: "Per Hour Worked",
     rate: 0.016,
     carryOver: true,
     negativeAllowed: false,
   });
 
   return (
     <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Leave Earning Policy</h1>
          <p className="text-gray-600">Automated accruals for Annual, Personal/Carer’s, and Long Service Leave.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <section className="bg-white rounded-lg shadow border border-gray-200">
           <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
             <h2 className="text-lg font-semibold">Annual Leave</h2>
             <label className="inline-flex items-center gap-2">
               <input
                 type="checkbox"
                 checked={annual.enabled}
                 onChange={e => setAnnual({ ...annual, enabled: e.target.checked })}
               />
               <span className="text-sm text-gray-600">Enabled</span>
             </label>
           </div>
           <div className="p-6 space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm text-gray-700 mb-1">Accrual Method</label>
                 <select
                   value={annual.method}
                   onChange={e => setAnnual({ ...annual, method: e.target.value as Accrual["method"] })}
                   className="w-full border border-gray-300 rounded-md px-3 py-2"
                 >
                   <option>Per Pay Period</option>
                   <option>Per Hour Worked</option>
                 </select>
               </div>
               <div>
                 <label className="block text-sm text-gray-700 mb-1">Rate</label>
                 <input
                   type="number"
                   step="0.001"
                   value={annual.rate}
                   onChange={e => setAnnual({ ...annual, rate: Number(e.target.value) })}
                   className="w-full border border-gray-300 rounded-md px-3 py-2"
                 />
               </div>
               <div>
                 <label className="block text-sm text-gray-700 mb-1">Cap (Days)</label>
                 <input
                   type="number"
                   value={annual.capDays}
                   onChange={e => setAnnual({ ...annual, capDays: Number(e.target.value) })}
                   className="w-full border border-gray-300 rounded-md px-3 py-2"
                 />
               </div>
               <div className="flex items-center gap-6">
                 <label className="inline-flex items-center gap-2">
                   <input
                     type="checkbox"
                     checked={annual.carryOver}
                     onChange={e => setAnnual({ ...annual, carryOver: e.target.checked })}
                   />
                   <span className="text-sm text-gray-700">Carry Over</span>
                 </label>
                 <label className="inline-flex items-center gap-2">
                   <input
                     type="checkbox"
                     checked={annual.negativeAllowed}
                     onChange={e => setAnnual({ ...annual, negativeAllowed: e.target.checked })}
                   />
                   <span className="text-sm text-gray-700">Negative Balance Allowed</span>
                 </label>
               </div>
             </div>
           </div>
         </section>
 
         <section className="bg-white rounded-lg shadow border border-gray-200">
           <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
             <h2 className="text-lg font-semibold">Personal/Carer’s Leave</h2>
             <label className="inline-flex items-center gap-2">
               <input
                 type="checkbox"
                 checked={personal.enabled}
                 onChange={e => setPersonal({ ...personal, enabled: e.target.checked })}
               />
               <span className="text-sm text-gray-600">Enabled</span>
             </label>
           </div>
           <div className="p-6 space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm text-gray-700 mb-1">Accrual Method</label>
                 <select
                   value={personal.method}
                   onChange={e => setPersonal({ ...personal, method: e.target.value as Accrual["method"] })}
                   className="w-full border border-gray-300 rounded-md px-3 py-2"
                 >
                   <option>Per Pay Period</option>
                   <option>Per Hour Worked</option>
                 </select>
               </div>
               <div>
                 <label className="block text-sm text-gray-700 mb-1">Rate</label>
                 <input
                   type="number"
                   step="0.001"
                   value={personal.rate}
                   onChange={e => setPersonal({ ...personal, rate: Number(e.target.value) })}
                   className="w-full border border-gray-300 rounded-md px-3 py-2"
                 />
               </div>
               <div>
                 <label className="block text-sm text-gray-700 mb-1">Cap (Days)</label>
                 <input
                   type="number"
                   value={personal.capDays}
                   onChange={e => setPersonal({ ...personal, capDays: Number(e.target.value) })}
                   className="w-full border border-gray-300 rounded-md px-3 py-2"
                 />
               </div>
               <div className="flex items-center gap-6">
                 <label className="inline-flex items-center gap-2">
                   <input
                     type="checkbox"
                     checked={personal.carryOver}
                     onChange={e => setPersonal({ ...personal, carryOver: e.target.checked })}
                   />
                   <span className="text-sm text-gray-700">Carry Over</span>
                 </label>
                 <label className="inline-flex items-center gap-2">
                   <input
                     type="checkbox"
                     checked={personal.negativeAllowed}
                     onChange={e => setPersonal({ ...personal, negativeAllowed: e.target.checked })}
                   />
                   <span className="text-sm text-gray-700">Negative Balance Allowed</span>
                 </label>
               </div>
             </div>
           </div>
         </section>
 
         <section className="bg-white rounded-lg shadow border border-gray-200">
           <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
             <h2 className="text-lg font-semibold">Long Service Leave</h2>
             <label className="inline-flex items-center gap-2">
               <input
                 type="checkbox"
                 checked={longService.enabled}
                 onChange={e => setLongService({ ...longService, enabled: e.target.checked })}
               />
               <span className="text-sm text-gray-600">Enabled</span>
             </label>
           </div>
           <div className="p-6 space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm text-gray-700 mb-1">Accrual Method</label>
                 <select
                   value={longService.method}
                   onChange={e => setLongService({ ...longService, method: e.target.value as Accrual["method"] })}
                   className="w-full border border-gray-300 rounded-md px-3 py-2"
                 >
                   <option>Per Pay Period</option>
                   <option>Per Hour Worked</option>
                 </select>
               </div>
               <div>
                 <label className="block text-sm text-gray-700 mb-1">Rate</label>
                 <input
                   type="number"
                   step="0.001"
                   value={longService.rate}
                   onChange={e => setLongService({ ...longService, rate: Number(e.target.value) })}
                   className="w-full border border-gray-300 rounded-md px-3 py-2"
                 />
               </div>
               <div className="flex items-center gap-6">
                 <label className="inline-flex items-center gap-2">
                   <input
                     type="checkbox"
                     checked={longService.carryOver}
                     onChange={e => setLongService({ ...longService, carryOver: e.target.checked })}
                   />
                   <span className="text-sm text-gray-700">Carry Over</span>
                 </label>
                 <label className="inline-flex items-center gap-2">
                   <input
                     type="checkbox"
                     checked={longService.negativeAllowed}
                     onChange={e => setLongService({ ...longService, negativeAllowed: e.target.checked })}
                   />
                   <span className="text-sm text-gray-700">Negative Balance Allowed</span>
                 </label>
               </div>
             </div>
           </div>
         </section>
       </div>
     </div>
   );
 }
