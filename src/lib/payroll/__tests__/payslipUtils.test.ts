import { describe, expect, it } from 'vitest';
import {
  computeBasicPay,
  computeCalendarYearYtdTotals,
  getPayslipAmounts,
  validatePayslip,
} from '../payslipUtils';

describe('payslipUtils', () => {
  it('normalizes amounts from different field names', () => {
    const p: any = { gross_pay: '1000', payg_tax: '200', net_pay: '800', superannuation: '100', allowances: '50', overtime: '25' };
    expect(getPayslipAmounts(p)).toEqual({
      grossPay: 1000,
      allowances: 50,
      overtime: 25,
      taxWithheld: 200,
      netPay: 800,
      superannuation: 100,
    });
  });

  it('computes basic pay from gross - allowances - overtime', () => {
    const p: any = { gross_pay: 1000, allowances: 100, overtime: 50 };
    expect(computeBasicPay(p)).toBe(850);
  });

  it('validates required dates', () => {
    const bad: any = { gross_pay: 1, net_pay: 1, payg_tax: 0, superannuation: 0 };
    const res = validatePayslip(bad);
    expect(res.isValid).toBe(false);
    expect(res.issues).toContain('missing_period_start');
    expect(res.issues).toContain('missing_payment_date');
  });

  it('computes calendar year YTD totals as of a date', () => {
    const payslips: any[] = [
      { payment_date: '2026-01-15', gross_pay: 100, payg_tax: 10, net_pay: 90, superannuation: 5 },
      { payment_date: '2026-02-15', gross_pay: 200, payg_tax: 20, net_pay: 180, superannuation: 10 },
      { payment_date: '2025-12-31', gross_pay: 999, payg_tax: 999, net_pay: 999, superannuation: 999 },
    ];
    expect(computeCalendarYearYtdTotals(payslips, '2026-02-16')).toEqual({ gross: 300, tax: 30, net: 270, super: 15 });
  });
});

