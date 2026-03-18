export type PaidPayrollSummaryInputPayslip = {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  pay_period_start?: string | null;
  pay_period_end?: string | null;
  payment_date?: string | null;
  gross_pay?: number | string | null;
  gross_earnings?: number | string | null;
  net_pay?: number | string | null;
  tax_withheld?: number | string | null;
  income_tax?: number | string | null;
  superannuation?: number | string | null;
  total_deductions?: number | string | null;
  deductions?: number | string | null;
  employees?: {
    first_name?: string | null;
    last_name?: string | null;
    employee_code?: string | null;
  } | null;
  pay_components?: Array<{ component_type?: string | null; amount?: number | string | null; description?: string | null }> | null;
  deduction_applications?: Array<{ amount?: number | string | null }> | null;
  payroll_runs?: { pay_period_start?: string | null; pay_period_end?: string | null; status?: string | null } | null;
};

export type PaidPayrollSummaryInputRun = {
  id: string;
  pay_period_start: string;
  pay_period_end: string;
  payment_date?: string | null;
  pay_frequency?: string | null;
  status: string;
  employee_count?: number | null;
  total_gross_pay?: number | string | null;
  total_tax?: number | string | null;
  total_net_pay?: number | string | null;
  total_super?: number | string | null;
};

export type PaidPayrollEmployeeLine = {
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  payrollRunId: string;
  periodStart: string;
  periodEnd: string;
  paymentDate?: string;
  grossPay: number;
  tax: number;
  deductions: number;
  netPay: number;
  superannuation: number;
  allowances: number;
  overtime: number;
};

export type PaidPayrollRunSummary = {
  payrollRunId: string;
  periodStart: string;
  periodEnd: string;
  paymentDate?: string;
  status: string;
  employeeCount: number;
  totals: {
    grossPay: number;
    tax: number;
    deductions: number;
    netPay: number;
    superannuation: number;
    allowances: number;
    overtime: number;
  };
  employees: PaidPayrollEmployeeLine[];
};

export type PaidPayrollSummaryReport = {
  period: { start: string; end: string };
  runs: PaidPayrollRunSummary[];
  totals: {
    grossPay: number;
    tax: number;
    deductions: number;
    netPay: number;
    superannuation: number;
    allowances: number;
    overtime: number;
  };
  employeeCount: number;
  payrollRuns: number;
  warnings: string[];
};

const toNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const sum = (arr: any[], pick: (x: any) => number) => arr.reduce((acc, x) => acc + pick(x), 0);

export const buildPaidPayrollSummary = (args: {
  runs: PaidPayrollSummaryInputRun[];
  payslips: PaidPayrollSummaryInputPayslip[];
  startDate?: string;
  endDate?: string;
  statuses?: string[];
}): PaidPayrollSummaryReport => {
  const warnings: string[] = [];

  const runById = new Map(args.runs.map((r) => [r.id, r]));
  const allowedStatuses = (args.statuses && args.statuses.length > 0 ? args.statuses : ['Paid']).map((s) => s.toLowerCase());
  const includedRuns = args.runs.filter((r) => allowedStatuses.includes(String(r.status || '').toLowerCase()));

  const payslips = args.payslips.filter((p) => runById.has(p.payroll_run_id));

  const runGroups = new Map<string, PaidPayrollEmployeeLine[]>();

  for (const p of payslips) {
    const run = runById.get(p.payroll_run_id);
    if (!run) continue;
    if (!allowedStatuses.includes(String(run.status || '').toLowerCase())) {
      continue;
    }

    const grossPay = toNumber(p.gross_earnings ?? p.gross_pay);
    const netPay = toNumber(p.net_pay);
    const tax = toNumber(p.income_tax ?? p.tax_withheld);
    const superannuation = toNumber(p.superannuation);
    const deductionsFromField = toNumber(p.total_deductions ?? p.deductions);
    const deductionsFromApps = sum(p.deduction_applications || [], (d) => toNumber(d.amount));
    const deductions = deductionsFromField > 0 ? deductionsFromField : deductionsFromApps;

    const allowances = sum(
      (p.pay_components || []).filter((c) => String(c.component_type || '').toLowerCase() === 'allowance'),
      (c) => toNumber(c.amount)
    );
    const overtime = sum(
      (p.pay_components || []).filter((c) => String(c.component_type || '').toLowerCase() === 'overtime'),
      (c) => toNumber(c.amount)
    );

    const employeeName = [p.employees?.first_name, p.employees?.last_name].filter(Boolean).join(' ') || p.employee_id;
    const line: PaidPayrollEmployeeLine = {
      employeeId: p.employee_id,
      employeeName,
      employeeCode: p.employees?.employee_code || undefined,
      payrollRunId: run.id,
      periodStart: run.pay_period_start,
      periodEnd: run.pay_period_end,
      paymentDate: run.payment_date || undefined,
      grossPay,
      tax,
      deductions,
      netPay,
      superannuation,
      allowances,
      overtime,
    };

    const existing = runGroups.get(run.id) || [];
    existing.push(line);
    runGroups.set(run.id, existing);
  }

  const runs: PaidPayrollRunSummary[] = includedRuns.map((run) => {
    const employees = (runGroups.get(run.id) || []).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    const derivedTotals = employees.reduce(
      (acc, e) => ({
        grossPay: acc.grossPay + e.grossPay,
        tax: acc.tax + e.tax,
        deductions: acc.deductions + e.deductions,
        netPay: acc.netPay + e.netPay,
        superannuation: acc.superannuation + e.superannuation,
        allowances: acc.allowances + e.allowances,
        overtime: acc.overtime + e.overtime,
      }),
      { grossPay: 0, tax: 0, deductions: 0, netPay: 0, superannuation: 0, allowances: 0, overtime: 0 }
    );

    const hasDerived = employees.length > 0;
    const totals = hasDerived
      ? derivedTotals
      : {
          grossPay: toNumber(run.total_gross_pay),
          tax: toNumber(run.total_tax),
          deductions: 0,
          netPay: toNumber(run.total_net_pay),
          superannuation: toNumber(run.total_super),
          allowances: 0,
          overtime: 0,
        };

    if (employees.length === 0 && String(run.status || '').toLowerCase() === 'paid') {
      warnings.push(`Paid payroll run ${run.id} (${run.pay_period_start} - ${run.pay_period_end}) has no payslips`);
    }

    return {
      payrollRunId: run.id,
      periodStart: run.pay_period_start,
      periodEnd: run.pay_period_end,
      paymentDate: run.payment_date || undefined,
      status: run.status,
      employeeCount: hasDerived ? new Set(employees.map((e) => e.employeeId)).size : Number(run.employee_count || 0),
      totals,
      employees,
    };
  });

  const totals = runs.reduce(
    (acc, r) => ({
      grossPay: acc.grossPay + r.totals.grossPay,
      tax: acc.tax + r.totals.tax,
      deductions: acc.deductions + r.totals.deductions,
      netPay: acc.netPay + r.totals.netPay,
      superannuation: acc.superannuation + r.totals.superannuation,
      allowances: acc.allowances + r.totals.allowances,
      overtime: acc.overtime + r.totals.overtime,
    }),
    { grossPay: 0, tax: 0, deductions: 0, netPay: 0, superannuation: 0, allowances: 0, overtime: 0 }
  );

  const periodStart = args.startDate || (runs[0]?.periodStart || '');
  const periodEnd = args.endDate || (runs[runs.length - 1]?.periodEnd || '');

  const allEmployees = runs.flatMap((r) => r.employees);

  return {
    period: { start: periodStart, end: periodEnd },
    runs,
    totals,
    employeeCount: new Set(allEmployees.map((e) => e.employeeId)).size,
    payrollRuns: runs.length,
    warnings,
  };
};
