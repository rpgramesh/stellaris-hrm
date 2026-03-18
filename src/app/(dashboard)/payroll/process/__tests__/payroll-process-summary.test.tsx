import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';

vi.mock('next/navigation', () => {
  return {
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  };
});

vi.mock('@/components/payroll/PayrollConfigurationModal', () => ({
  PayrollConfigurationModal: () => null,
}));

vi.mock('@/components/payroll/ReportDownloadModal', () => ({
  ReportDownloadModal: () => null,
}));

vi.mock('@/components/payroll/EmployeeUpdateModal', () => ({
  default: () => null,
}));

const serviceMocks = vi.hoisted(() => ({
  getCachedPayrollReport: vi.fn(),
  calculatePayrollPreview: vi.fn(),
  validatePayrollRun: vi.fn(),
}));

vi.mock('@/services/comprehensivePayrollService', () => {
  return {
    comprehensivePayrollService: {
      getCachedPayrollReport: serviceMocks.getCachedPayrollReport,
      calculatePayrollPreview: serviceMocks.calculatePayrollPreview,
      validatePayrollRun: serviceMocks.validatePayrollRun,
      upsertCachedPayrollReport: vi.fn(),
      processPayrollRun: vi.fn(),
    },
  };
});

vi.mock('@/services/payrollReportingService', () => ({ payrollReportingService: {} }));
vi.mock('@/services/payrollErrorHandlingService', () => ({ payrollErrorHandlingService: {} }));
vi.mock('@/services/pdfGeneratorService', () => ({ pdfGeneratorService: {} }));

const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 't' } } }),
      },
      from: (...args: any[]) => mockFrom(...args),
    },
  };
});

import PayrollProcessingPage from '@/app/(dashboard)/payroll/process/page';

const makeQuery = (response: any) => {
  const q: any = {
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    in: vi.fn(() => q),
    order: vi.fn().mockResolvedValue(response),
    limit: vi.fn(() => q),
    maybeSingle: vi.fn().mockResolvedValue(response),
  };
  return q;
};

describe('Payroll processing historical run summary rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  afterEach(() => cleanup());

  it('renders the payroll summary panel for a Paid run even when no employees are selected', async () => {
    const runs = [
      {
        id: 'draft-1',
        pay_period_start: '2026-03-02',
        pay_period_end: '2026-03-15',
        pay_frequency: 'Fortnightly',
        status: 'Draft',
        employee_count: 0,
        total_gross_pay: 0,
        total_tax: 0,
        total_net_pay: 0,
        total_super: 0,
        created_at: '2026-03-10T04:46:00.000Z',
      },
      {
        id: 'paid-1',
        pay_period_start: '2026-02-01',
        pay_period_end: '2026-02-28',
        pay_frequency: 'Fortnightly',
        status: 'Paid',
        employee_count: 2,
        total_gross_pay: 2000,
        total_tax: 382.54,
        total_net_pay: 1617.46,
        total_super: 200,
        created_at: '2026-03-10T04:46:00.000Z',
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'payroll_runs') return makeQuery({ data: runs, error: null });
      if (table === 'employees') {
        return makeQuery({
          data: [
            {
              id: 'e1',
              first_name: 'Line',
              last_name: 'Manager',
              employee_code: 'EMP0002',
              employment_status: 'Active',
              payroll_employees: [{ id: 'pe1', employment_type: 'FullTime', pay_frequency: 'Fortnightly' }],
            },
            {
              id: 'e2',
              first_name: 'Ramesh',
              last_name: 'P',
              employee_code: 'EMP0007',
              employment_status: 'Active',
              payroll_employees: [{ id: 'pe2', employment_type: 'FullTime', pay_frequency: 'Fortnightly' }],
            },
          ],
          error: null,
        });
      }
      return makeQuery({ data: [], error: null });
    });

    serviceMocks.getCachedPayrollReport.mockImplementation(async (payrollRunId: string) => {
      if (payrollRunId !== 'paid-1') return null;
      return {
        payrollRunId: 'paid-1',
        periodStart: '2026-02-01',
        periodEnd: '2026-02-28',
        totalEmployees: 2,
        totalGrossPay: 2000,
        totalTax: 382.54,
        totalNetPay: 1617.46,
        totalSuper: 200,
        employeeBreakdown: [
          {
            employeeId: 'e1',
            employeeName: 'Line Manager',
            grossPay: 1800,
            tax: 228.54,
            netPay: 1571.46,
            super: 180,
            hoursWorked: 80,
            status: 'Processed',
            errors: [],
            warnings: [],
          },
          {
            employeeId: 'e2',
            employeeName: 'Ramesh P',
            grossPay: 200,
            tax: 154,
            netPay: 46,
            super: 20,
            hoursWorked: 8,
            status: 'Processed',
            errors: [],
            warnings: [],
          },
        ],
        complianceStatus: { minimumWageCompliant: true, superCompliant: true, taxCompliant: true, issues: [] },
      };
    });

    render(<PayrollProcessingPage />);

    await screen.findByText('Select Payroll Run');
    fireEvent.click(await screen.findByTestId('payroll-run-paid-1'));

    await waitFor(
      () => {
        const panel = screen.getByTestId('payroll-summary-panel');
        expect(panel).toBeInTheDocument();
        expect(within(panel).getByText('Payroll Summary')).toBeInTheDocument();
        expect(within(panel).getByText('Line Manager')).toBeInTheDocument();
        expect(within(panel).getByText('Ramesh P')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('renders the payroll summary panel for every Paid run selected', async () => {
    const runs = [
      {
        id: 'paid-a2',
        pay_period_start: '2024-02-01',
        pay_period_end: '2024-02-28',
        pay_frequency: 'Monthly',
        status: 'Paid',
        employee_count: 2,
        total_gross_pay: 2000,
        total_tax: 300,
        total_net_pay: 1700,
        total_super: 200,
        created_at: '2024-03-01T00:00:00.000Z',
      },
      {
        id: 'paid-b1',
        pay_period_start: '2024-03-01',
        pay_period_end: '2024-03-31',
        pay_frequency: 'Monthly',
        status: 'Paid',
        employee_count: 1,
        total_gross_pay: 100,
        total_tax: 10,
        total_net_pay: 90,
        total_super: 11,
        created_at: '2024-04-01T00:00:00.000Z',
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'payroll_runs') return makeQuery({ data: runs, error: null });
      if (table === 'employees') return makeQuery({ data: [], error: null });
      return makeQuery({ data: [], error: null });
    });

    serviceMocks.getCachedPayrollReport.mockImplementation(async (payrollRunId: string) => {
      if (payrollRunId === 'paid-a2') {
        return {
          payrollRunId,
          periodStart: '2024-02-01',
          periodEnd: '2024-02-28',
          totalEmployees: 2,
          totalGrossPay: 2000,
          totalTax: 300,
          totalNetPay: 1700,
          totalSuper: 200,
          employeeBreakdown: [
            { employeeId: 'e1', employeeName: 'A', grossPay: 1, tax: 0, netPay: 1, super: 0, hoursWorked: 1, status: 'Processed', errors: [], warnings: [] },
          ],
        };
      }
      if (payrollRunId === 'paid-b1') {
        return {
          payrollRunId,
          periodStart: '2024-03-01',
          periodEnd: '2024-03-31',
          totalEmployees: 1,
          totalGrossPay: 100,
          totalTax: 10,
          totalNetPay: 90,
          totalSuper: 11,
          employeeBreakdown: [
            { employeeId: 'e2', employeeName: 'B', grossPay: 100, tax: 10, netPay: 90, super: 11, hoursWorked: 10, status: 'Processed', errors: [], warnings: [] },
          ],
        };
      }
      return null;
    });

    render(<PayrollProcessingPage />);
    await screen.findByText('Select Payroll Run');

    for (const run of runs) {
      fireEvent.click(await screen.findByTestId(`payroll-run-${run.id}`));
      await waitFor(() => expect(screen.getByTestId('payroll-summary-panel')).toBeInTheDocument(), { timeout: 2000 });
    }
  });
});
