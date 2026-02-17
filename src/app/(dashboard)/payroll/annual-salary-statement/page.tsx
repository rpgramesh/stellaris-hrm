'use client';

import { useState, useMemo } from 'react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 2 }).format(
    isNaN(value) ? 0 : value
  );

export default function AnnualSalaryStatementPage() {
  const [annualSalaryInput, setAnnualSalaryInput] = useState<string>('60000');
  const [superRateInput, setSuperRateInput] = useState<string>('11.5');
  const [salaryIncludesSuper, setSalaryIncludesSuper] = useState<boolean>(false);

  const parsed = useMemo(() => {
    const salary = parseFloat(annualSalaryInput.replace(/,/g, '')) || 0;
    const superRate = parseFloat(superRateInput.replace(/,/g, '')) || 0;
    const rateFraction = superRate / 100;

    let baseAnnual = salary;
    let superAnnual = salary * rateFraction;
    let totalAnnual = baseAnnual + superAnnual;

    if (salaryIncludesSuper && rateFraction > 0) {
      totalAnnual = salary;
      baseAnnual = salary / (1 + rateFraction);
      superAnnual = totalAnnual - baseAnnual;
    }

    const cycles = {
      Weekly: 52,
      Fortnightly: 26,
      Monthly: 12,
      Annually: 1,
    } as const;

    const rows = Object.entries(cycles).map(([label, divisor]) => {
      const base = baseAnnual / divisor;
      const sup = superAnnual / divisor;
      const total = totalAnnual / divisor;
      return {
        label,
        base,
        superAmount: sup,
        total,
      };
    });

    return {
      baseAnnual,
      superAnnual,
      totalAnnual,
      rows,
    };
  }, [annualSalaryInput, superRateInput, salaryIncludesSuper]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Annual Salary & Superannuation</h1>
          <p className="text-gray-600 text-sm mt-1">
            Enter the annual package and review salary and super across pay cycles.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-md shadow-sm border border-gray-200 p-4 space-y-4">
          <h2 className="text-lg font-medium">Inputs</h2>

          <div className="space-y-3">
            <div className="relative">
              <input
                type="number"
                min="0"
                step="100"
                value={annualSalaryInput}
                onChange={e => setAnnualSalaryInput(e.target.value)}
                className="peer w-full border border-gray-300 rounded px-3 pt-4 pb-2 focus:border-blue-500 focus:outline-none placeholder-transparent"
                placeholder="Annual Salary"
              />
              <label className="absolute left-3 top-0 text-xs text-gray-500 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-0 peer-focus:text-xs peer-focus:text-blue-500">
                Annual Salary (per year, AUD)
              </label>
            </div>

            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={superRateInput}
                onChange={e => setSuperRateInput(e.target.value)}
                className="peer w-full border border-gray-300 rounded px-3 pt-4 pb-2 focus:border-blue-500 focus:outline-none placeholder-transparent"
                placeholder="Super Rate"
              />
              <label className="absolute left-3 top-0 text-xs text-gray-500 transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-0 peer-focus:text-xs peer-focus:text-blue-500">
                Superannuation Rate (%)
              </label>
            </div>

            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={salaryIncludesSuper}
                onChange={e => setSalaryIncludesSuper(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              Salary amount includes superannuation
            </label>
          </div>

          <div className="mt-4 space-y-2 text-sm border-t border-gray-200 pt-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Base salary (annual)</span>
              <span className="font-medium">{formatCurrency(parsed.baseAnnual)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Superannuation (annual)</span>
              <span className="font-medium">{formatCurrency(parsed.superAnnual)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total package (annual)</span>
              <span className="font-semibold text-blue-700">{formatCurrency(parsed.totalAnnual)}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-md shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium">Pay Cycle Summary</h2>
              <p className="text-xs text-gray-500">
                Based on 52 weeks, 26 fortnights, 12 months, and 1 annual cycle.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Pay Cycle</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Base Salary</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Superannuation</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Total Package</th>
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map(row => (
                  <tr key={row.label} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-800">{row.label}</td>
                    <td className="py-2 px-3 text-right text-gray-800">{formatCurrency(row.base)}</td>
                    <td className="py-2 px-3 text-right text-gray-800">{formatCurrency(row.superAmount)}</td>
                    <td className="py-2 px-3 text-right font-semibold text-blue-700">
                      {formatCurrency(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
