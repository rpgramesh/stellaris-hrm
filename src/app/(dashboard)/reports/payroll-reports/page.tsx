"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { payrollReportingService } from "@/services/payrollReportingService";
import { pdfGeneratorService } from "@/services/pdfGeneratorService";

type ReportTab = "summary" | "tax" | "super" | "compliance";

const toMoney = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const defaultStartEnd = () => {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
};

export default function PayrollReportsPage() {
  const { start, end } = defaultStartEnd();
  const [tab, setTab] = useState<ReportTab>("summary");
  const [startDate, setStartDate] = useState(start);
  const [endDate, setEndDate] = useState(end);
  const [payFrequency, setPayFrequency] = useState<"" | "Weekly" | "Fortnightly" | "Monthly">("");
  const [status, setStatus] = useState<"" | "Draft" | "Approved" | "Processing" | "Paid" | "STPSubmitted">("Paid");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<null | "pdf" | "xlsx">(null);
  const [isHrAdmin, setIsHrAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<any>(null);
  const [tax, setTax] = useState<any>(null);
  const [superReport, setSuperReport] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);

  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    const resolveRole = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user) return;
        const { data: emp } = await supabase
          .from("employees")
          .select("role, system_access_role")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        const role = String((emp as any)?.role || (emp as any)?.system_access_role || "");
        const admin =
          ["HR Admin", "HR Manager", "Employer Admin", "Administrator", "Super Admin"].includes(role) ||
          role.toLowerCase().includes("hr");
        setIsHrAdmin(admin);
      } catch {
        setIsHrAdmin(false);
      }
    };
    resolveRole();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [tab, startDate, endDate, payFrequency, status]);

  const filters = useMemo(() => {
    if (startDate && endDate && startDate > endDate) return null;
    return {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      payFrequency: payFrequency || undefined,
      status: status || undefined,
    };
  }, [startDate, endDate, payFrequency, status]);

  const fetchReports = async () => {
    if (!filters) {
      setError("Invalid date range");
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const shouldLoadSummary = filters.status !== "Draft";

      const [s, t, sp, c] = await Promise.all([
        shouldLoadSummary ? payrollReportingService.generatePayrollSummaryReport(filters) : Promise.resolve(null),
        payrollReportingService.generateTaxReport(filters),
        payrollReportingService.generateSuperannuationReport(filters),
        payrollReportingService.generateComplianceReport(filters),
      ]);

      setSummary(s);
      setTax(t);
      setSuperReport(sp);
      setCompliance(c);
    } catch (e: any) {
      setError(e?.message || "Failed to load reports");
      setSummary(null);
      setTax(null);
      setSuperReport(null);
      setCompliance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filters?.startDate, filters?.endDate, filters?.payFrequency, filters?.status]);

  const activeData = tab === "summary" ? summary : tab === "tax" ? tax : tab === "super" ? superReport : compliance;

  const onDownload = async (format: "pdf" | "xlsx") => {
    if (!activeData) return;
    try {
      setExporting(format);
      if (format === "pdf") {
        if (tab === "summary") pdfGeneratorService.generatePayrollSummaryReport(activeData);
        else if (tab === "tax") pdfGeneratorService.generateTaxReport(activeData);
        else if (tab === "super") pdfGeneratorService.generateSuperReport(activeData);
        else pdfGeneratorService.generateComplianceReport(activeData);
        alert("PDF download started.");
        return;
      }

      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      if (tab === "summary") {
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet([
            { Field: "Period Start", Value: activeData.period?.start || "" },
            { Field: "Period End", Value: activeData.period?.end || "" },
            { Field: "Total Gross", Value: activeData.totals?.grossPay ?? 0 },
            { Field: "Total Tax", Value: activeData.totals?.tax ?? 0 },
            { Field: "Total Deductions", Value: activeData.totals?.deductions ?? 0 },
            { Field: "Total Net", Value: activeData.totals?.netPay ?? 0 },
            { Field: "Total Super", Value: activeData.totals?.superannuation ?? 0 },
            { Field: "Employees", Value: activeData.employeeCount ?? 0 },
            { Field: "Payroll Runs", Value: activeData.payrollRuns ?? 0 },
          ]),
          "Summary"
        );
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(activeData.payDistribution || []), "Distribution");
      } else if (tab === "tax") {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(activeData.taxBreakdown || []), "Tax Breakdown");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(activeData.stpSubmissions || []), "STP");
      } else if (tab === "super") {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(activeData.contributionsByFund || []), "By Fund");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(activeData.employeeContributions || []), "Employees");
      } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ ...activeData }]), "Compliance");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((activeData.recommendations || []).map((r: any) => ({ Recommendation: r }))), "Recommendations");
      }

      const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll_${tab}_report_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      alert("Excel download started.");
    } catch (e: any) {
      alert(e?.message || "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const pageSlice = (rows: any[]) => rows.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = (rows: any[]) => Math.max(1, Math.ceil(rows.length / pageSize));

  const taxRows = useMemo(() => pageSlice(tax?.taxBreakdown || []), [tax, page]);
  const superRows = useMemo(() => pageSlice(superReport?.employeeContributions || []), [superReport, page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll Reports</h1>
          <p className="text-gray-600 mt-1">Summary, Tax, Super, and Compliance reports with PDF/Excel exports</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchReports}
            disabled={loading}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => onDownload("pdf")}
            disabled={!activeData || loading || exporting !== null || !isHrAdmin}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            title={!isHrAdmin ? "Read-only access" : undefined}
          >
            <FileText className="h-4 w-4" />
            {exporting === "pdf" ? "Generating…" : "PDF"}
          </button>
          <button
            onClick={() => onDownload("xlsx")}
            disabled={!activeData || loading || exporting !== null || !isHrAdmin}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            title={!isHrAdmin ? "Read-only access" : undefined}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exporting === "xlsx" ? "Generating…" : "Excel"}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Start Date</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">End Date</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Pay Frequency</span>
            <select value={payFrequency} onChange={(e) => setPayFrequency(e.target.value as any)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <option value="">All</option>
              <option value="Weekly">Weekly</option>
              <option value="Fortnightly">Fortnightly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <option value="">All</option>
              <option value="Draft">Draft</option>
              <option value="Approved">Approved</option>
              <option value="Processing">Processing</option>
              <option value="Paid">Paid</option>
              <option value="STPSubmitted">STP Submitted</option>
            </select>
          </label>
        </div>

        <div className="flex gap-2">
          {(["summary", "tax", "super", "compliance"] as ReportTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border ${tab === t ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
            >
              {t === "summary" ? "Summary" : t === "tax" ? "Tax" : t === "super" ? "Super" : "Compliance"}
            </button>
          ))}
        </div>

        {!isHrAdmin && <div className="text-sm font-semibold text-amber-600">Read-only access. Exports are restricted to HR administrators.</div>}
        {error && <div className="text-sm font-semibold text-rose-600">{error}</div>}
      </div>

      {tab === "summary" && summary && (
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-xs text-gray-500">Total Gross</div>
              <div className="text-2xl font-bold text-gray-900">${toMoney(summary.totals?.grossPay ?? 0)}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-xs text-gray-500">Total Tax</div>
              <div className="text-2xl font-bold text-gray-900">${toMoney(summary.totals?.tax ?? 0)}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-xs text-gray-500">Total Net</div>
              <div className="text-2xl font-bold text-gray-900">${toMoney(summary.totals?.netPay ?? 0)}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-xs text-gray-500">Total Super</div>
              <div className="text-2xl font-bold text-gray-900">${toMoney(summary.totals?.superannuation ?? 0)}</div>
            </div>
          </div>
        </div>
      )}

      {tab === "tax" && tax && (
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Tax Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Employee</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">TFN</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Gross</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Tax</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Super</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {taxRows.map((r: any, idx: number) => (
                  <tr key={`${r.employeeId}-${idx}`}>
                    <td className="px-4 py-2 text-sm text-gray-900">{r.employeeName}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{r.taxFileNumber || "*** *** ***"}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">${toMoney(Number(r.grossPay || 0))}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">${toMoney(Number(r.taxWithheld || 0))}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">${toMoney(Number(r.superannuation || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Page {page} / {pageCount(tax.taxBreakdown || [])}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded" disabled={page === 1}>
                Prev
              </button>
              <button onClick={() => setPage((p) => Math.min(pageCount(tax.taxBreakdown || []), p + 1))} className="px-3 py-1 border rounded" disabled={page >= pageCount(tax.taxBreakdown || [])}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "super" && superReport && (
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Employee Super Contributions</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Employee</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Fund</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Member #</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {superRows.map((r: any, idx: number) => (
                  <tr key={`${r.employeeId}-${idx}`}>
                    <td className="px-4 py-2 text-sm text-gray-900">{r.employeeName}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{r.fundName}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{r.superMemberNumber}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">${toMoney(Number(r.contributions || 0))}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{r.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Page {page} / {pageCount(superReport.employeeContributions || [])}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded" disabled={page === 1}>
                Prev
              </button>
              <button onClick={() => setPage((p) => Math.min(pageCount(superReport.employeeContributions || []), p + 1))} className="px-3 py-1 border rounded" disabled={page >= pageCount(superReport.employeeContributions || [])}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "compliance" && compliance && (
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Compliance</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-xs text-gray-500">Overall Score</div>
              <div className="text-2xl font-bold text-gray-900">{compliance.overallComplianceRate ?? 100}%</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-xs text-gray-500">Min Wage Non-Compliant</div>
              <div className="text-2xl font-bold text-gray-900">{compliance.minimumWageCompliance?.nonCompliantEmployees ?? 0}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-xs text-gray-500">Tax Issues</div>
              <div className="text-2xl font-bold text-gray-900">{(compliance.taxCompliance?.issues || []).length}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="text-xs text-gray-500">Overdue Super</div>
              <div className="text-2xl font-bold text-gray-900">{compliance.superannuationCompliance?.overdueContributions ?? 0}</div>
            </div>
          </div>
          {(compliance.recommendations || []).length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="font-semibold text-yellow-800 mb-2">Recommendations</div>
              <ul className="list-disc ml-5 text-sm text-yellow-900">
                {(compliance.recommendations || []).map((r: string, idx: number) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
