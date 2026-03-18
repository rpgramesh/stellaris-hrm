"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Download, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { pdfGeneratorService } from "@/services/pdfGeneratorService";
import type { PaidPayrollSummaryReport } from "@/lib/payroll/paidPayrollSummary";

const toMoney = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PayrollSummaryReportPage() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [payFrequency, setPayFrequency] = useState<string>("");
  const [includeReady, setIncludeReady] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PaidPayrollSummaryReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const employeeRollup = useMemo(() => {
    const map = new Map<string, { employeeName: string; employeeCode?: string; grossPay: number; tax: number; deductions: number; netPay: number; superannuation: number }>();
    for (const run of report?.runs || []) {
      for (const e of run.employees) {
        const key = e.employeeId;
        const prev = map.get(key) || {
          employeeName: e.employeeName,
          employeeCode: e.employeeCode,
          grossPay: 0,
          tax: 0,
          deductions: 0,
          netPay: 0,
          superannuation: 0,
        };
        prev.grossPay += e.grossPay;
        prev.tax += e.tax;
        prev.deductions += e.deductions;
        prev.netPay += e.netPay;
        prev.superannuation += e.superannuation;
        map.set(key, prev);
      }
    }
    return Array.from(map.entries())
      .map(([employeeId, v]) => ({ employeeId, ...v }))
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [report]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setError("Not authenticated");
        setReport(null);
        return;
      }

      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (payFrequency) params.set("payFrequency", payFrequency);
      if (includeReady) params.set("includeReady", "true");

      const res = await fetch(`/api/payroll/reports/paid-summary?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as PaidPayrollSummaryReport;
      setReport(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    if (!startDate || !endDate) return;
    fetchReport();
  }, [startDate, endDate, payFrequency, includeReady]);

  const downloadCsv = async () => {
    if (!report) return;
    const header = ["Payroll Run", "Period Start", "Period End", "Employee", "Employee Code", "Gross Pay", "Tax", "Deductions", "Net Pay", "Super", "Allowances", "Overtime"];
    const rows = report.runs.flatMap((run) =>
      run.employees.map((e) => [
        run.payrollRunId,
        run.periodStart,
        run.periodEnd,
        e.employeeName,
        e.employeeCode || "",
        e.grossPay.toFixed(2),
        e.tax.toFixed(2),
        e.deductions.toFixed(2),
        e.netPay.toFixed(2),
        e.superannuation.toFixed(2),
        e.allowances.toFixed(2),
        e.overtime.toFixed(2),
      ])
    );
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-paid-summary-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = async () => {
    if (!report) return;
    const XLSX = await import("xlsx");
    const sheetRows = report.runs.flatMap((run) =>
      run.employees.map((e) => ({
        "Payroll Run": run.payrollRunId,
        "Period Start": run.periodStart,
        "Period End": run.periodEnd,
        Employee: e.employeeName,
        "Employee Code": e.employeeCode || "",
        "Gross Pay": e.grossPay,
        Tax: e.tax,
        Deductions: e.deductions,
        "Net Pay": e.netPay,
        Super: e.superannuation,
        Allowances: e.allowances,
        Overtime: e.overtime,
      }))
    );

    const ws = XLSX.utils.json_to_sheet(sheetRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Paid Payroll Summary");
    const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-paid-summary-${format(new Date(), "yyyyMMdd-HHmm")}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    if (!report) return;
    pdfGeneratorService.generatePayrollSummaryReport({
      periodStart: report.period.start,
      periodEnd: report.period.end,
      totalGrossPay: report.totals.grossPay,
      totalTax: report.totals.tax,
      totalNetPay: report.totals.netPay,
      totalSuper: report.totals.superannuation,
      totalEmployees: report.employeeCount,
      employeeBreakdown: employeeRollup.map((e) => ({
        employeeId: e.employeeId,
        employeeName: e.employeeName,
        grossPay: e.grossPay,
        tax: e.tax,
        netPay: e.netPay,
        super: e.superannuation,
        hoursWorked: 0,
        status: "Processed",
        errors: [],
        warnings: [],
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll Summary (Paid)</h1>
          <p className="text-gray-600 mt-1">Consolidated view of paid payroll across pay periods</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={downloadPdf}
            disabled={!report || loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            PDF
          </button>
          <button
            onClick={downloadCsv}
            disabled={!report || loading}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={downloadExcel}
            disabled={!report || loading}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Start Date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">End Date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Pay Frequency</span>
            <select
              value={payFrequency}
              onChange={(e) => setPayFrequency(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
            >
              <option value="">All</option>
              <option value="Weekly">Weekly</option>
              <option value="Fortnightly">Fortnightly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </label>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={includeReady}
            onChange={(e) => setIncludeReady(e.target.checked)}
            className="rounded"
          />
          Include ready-to-process payroll runs (Draft/Approved/Processing)
        </label>

        {error && <div className="text-sm font-semibold text-rose-600">{error}</div>}

        {report && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-xs text-gray-500">Paid Payroll Runs</div>
              <div className="text-2xl font-bold text-gray-900">{report.payrollRuns}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-xs text-gray-500">Paid Employees</div>
              <div className="text-2xl font-bold text-gray-900">{report.employeeCount}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-xs text-gray-500">Total Gross Pay</div>
              <div className="text-2xl font-bold text-gray-900">${toMoney(report.totals.grossPay)}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-xs text-gray-500">Total Net Pay</div>
              <div className="text-2xl font-bold text-gray-900">${toMoney(report.totals.netPay)}</div>
            </div>
          </div>
        )}
      </div>

      {report && report.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4">
          <div className="font-semibold mb-1">Data Validation Warnings</div>
          <ul className="list-disc ml-5 text-sm">
            {report.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {report && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Paid Employee Summary</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Employee</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Code</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Gross</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Tax</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Deductions</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Net</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Super</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {employeeRollup.map((e) => (
                  <tr key={e.employeeId}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{e.employeeName}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{e.employeeCode || "-"}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">${toMoney(e.grossPay)}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">${toMoney(e.tax)}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">${toMoney(e.deductions)}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">${toMoney(e.netPay)}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">${toMoney(e.superannuation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payroll Runs</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Period</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Employees</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Gross</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Tax</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Net</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Super</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {report.runs.map((r) => (
                  <tr key={r.payrollRunId}>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {r.periodStart} - {r.periodEnd}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.status}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">{r.employeeCount}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">${toMoney(r.totals.grossPay)}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">${toMoney(r.totals.tax)}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">${toMoney(r.totals.netPay)}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">${toMoney(r.totals.superannuation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
