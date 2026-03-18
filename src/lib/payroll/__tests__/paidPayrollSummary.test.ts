import { describe, it, expect } from 'vitest';
import { buildPaidPayrollSummary } from '../paidPayrollSummary';

describe('buildPaidPayrollSummary', () => {
  it('aggregates totals and employeeCount across multiple paid runs', () => {
    const report = buildPaidPayrollSummary({
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      runs: [
        { id: 'r1', pay_period_start: '2026-02-01', pay_period_end: '2026-02-14', payment_date: '2026-02-15', status: 'Paid' },
        { id: 'r2', pay_period_start: '2026-02-15', pay_period_end: '2026-02-28', payment_date: '2026-03-01', status: 'Paid' },
      ],
      payslips: [
        {
          id: 'p1',
          payroll_run_id: 'r1',
          employee_id: 'e1',
          net_pay: 80,
          gross_pay: 100,
          tax_withheld: 10,
          superannuation: 10,
          deduction_applications: [{ amount: 5 }],
          pay_components: [{ component_type: 'Allowance', amount: 3 }, { component_type: 'Overtime', amount: 2 }],
          employees: { first_name: 'Ramesh', last_name: 'P', employee_code: 'EMP0007' },
        },
        {
          id: 'p2',
          payroll_run_id: 'r2',
          employee_id: 'e1',
          net_pay: 160,
          gross_pay: 200,
          tax_withheld: 20,
          superannuation: 20,
          deduction_applications: [{ amount: 10 }],
          pay_components: [{ component_type: 'Allowance', amount: 6 }, { component_type: 'Overtime', amount: 4 }],
          employees: { first_name: 'Ramesh', last_name: 'P', employee_code: 'EMP0007' },
        },
      ],
    });

    expect(report.payrollRuns).toBe(2);
    expect(report.employeeCount).toBe(1);
    expect(report.totals.grossPay).toBe(300);
    expect(report.totals.tax).toBe(30);
    expect(report.totals.netPay).toBe(240);
    expect(report.totals.superannuation).toBe(30);
    expect(report.totals.deductions).toBe(15);
    expect(report.totals.allowances).toBe(9);
    expect(report.totals.overtime).toBe(6);
  });

  it('includes ready-to-process runs when statuses include Draft/Approved and falls back to run totals when payslips are missing', () => {
    const report = buildPaidPayrollSummary({
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      statuses: ['Paid', 'Draft', 'Approved'],
      runs: [
        { id: 'r-draft', pay_period_start: '2026-03-01', pay_period_end: '2026-03-14', status: 'Draft', employee_count: 2, total_gross_pay: 1000, total_tax: 200, total_net_pay: 800, total_super: 110 },
      ],
      payslips: [],
    });

    expect(report.payrollRuns).toBe(1);
    expect(report.runs[0].status).toBe('Draft');
    expect(report.runs[0].employeeCount).toBe(2);
    expect(report.totals.grossPay).toBe(1000);
    expect(report.totals.tax).toBe(200);
    expect(report.totals.netPay).toBe(800);
    expect(report.totals.superannuation).toBe(110);
  });
});
