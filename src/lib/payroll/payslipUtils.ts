export type PayslipLike = {
  id?: string;
  employee_id?: string;
  employeeId?: string;
  period_start?: string;
  periodStart?: string;
  period_end?: string;
  periodEnd?: string;
  payment_date?: string;
  paymentDate?: string;
  gross_pay?: number | string | null;
  grossPay?: number | string | null;
  allowances?: number | string | null;
  overtime?: number | string | null;
  tax_withheld?: number | string | null;
  taxWithheld?: number | string | null;
  payg_tax?: number | string | null;
  net_pay?: number | string | null;
  netPay?: number | string | null;
  superannuation?: number | string | null;
  super?: number | string | null;
  status?: string | null;
  payslip_number?: string | null;
  payslipNumber?: string | null;
};

const toNumber = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

export const getPayslipDates = (p: PayslipLike) => {
  const periodStart = String((p as any).period_start ?? (p as any).periodStart ?? '');
  const periodEnd = String((p as any).period_end ?? (p as any).periodEnd ?? '');
  const paymentDate = String((p as any).payment_date ?? (p as any).paymentDate ?? '');
  return { periodStart, periodEnd, paymentDate };
};

export const getPayslipAmounts = (p: PayslipLike) => {
  const grossPay = toNumber((p as any).gross_pay ?? (p as any).grossPay);
  const allowances = toNumber((p as any).allowances);
  const overtime = toNumber((p as any).overtime);
  const taxWithheld = toNumber((p as any).tax_withheld ?? (p as any).taxWithheld ?? (p as any).payg_tax);
  const netPay = toNumber((p as any).net_pay ?? (p as any).netPay);
  const superannuation = toNumber((p as any).superannuation ?? (p as any).super);
  return { grossPay, allowances, overtime, taxWithheld, netPay, superannuation };
};

export const computeBasicPay = (p: PayslipLike) => {
  const { grossPay, allowances, overtime } = getPayslipAmounts(p);
  const basic = grossPay - allowances - overtime;
  return basic > 0 ? basic : 0;
};

export const validatePayslip = (p: PayslipLike) => {
  const issues: string[] = [];
  const { periodStart, periodEnd, paymentDate } = getPayslipDates(p);
  if (!periodStart) issues.push('missing_period_start');
  if (!periodEnd) issues.push('missing_period_end');
  if (!paymentDate) issues.push('missing_payment_date');

  const { grossPay, taxWithheld, netPay, superannuation } = getPayslipAmounts(p);
  if (!Number.isFinite(grossPay)) issues.push('invalid_gross_pay');
  if (!Number.isFinite(taxWithheld)) issues.push('invalid_tax_withheld');
  if (!Number.isFinite(netPay)) issues.push('invalid_net_pay');
  if (!Number.isFinite(superannuation)) issues.push('invalid_superannuation');

  return { isValid: issues.length === 0, issues };
};

export const computeCalendarYearYtdTotals = (payslips: PayslipLike[], asOf: string) => {
  const asOfDate = new Date(asOf);
  const year = asOfDate.getFullYear();
  const yearStart = new Date(year, 0, 1);

  return payslips.reduce<{ gross: number; tax: number; net: number; super: number }>(
    (acc, p) => {
      const { paymentDate } = getPayslipDates(p);
      if (!paymentDate) return acc;
      const d = new Date(paymentDate);
      if (!(d >= yearStart && d <= asOfDate)) return acc;

      const a = getPayslipAmounts(p);
      return {
        gross: acc.gross + a.grossPay,
        tax: acc.tax + a.taxWithheld,
        net: acc.net + a.netPay,
        super: acc.super + a.superannuation,
      };
    },
    { gross: 0, tax: 0, net: 0, super: 0 }
  );
};
