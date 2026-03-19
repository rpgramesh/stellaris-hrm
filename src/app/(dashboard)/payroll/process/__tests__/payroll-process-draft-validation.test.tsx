import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';

vi.mock('next/navigation', () => {
  return {
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  };
});

vi.mock('@/lib/realtime', async () => {
  const actual: any = await vi.importActual('@/lib/realtime');
  return {
    ...actual,
    subscribeToTableWithClient: vi.fn(() => ({ unsubscribe: vi.fn() })),
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
  validatePayrollRun: vi.fn(),
  calculatePayrollPreview: vi.fn(),
  getCachedPayrollReport: vi.fn(),
}));

vi.mock('@/services/comprehensivePayrollService', () => {
  return {
    comprehensivePayrollService: {
      validatePayrollRun: serviceMocks.validatePayrollRun,
      calculatePayrollPreview: serviceMocks.calculatePayrollPreview,
      getCachedPayrollReport: serviceMocks.getCachedPayrollReport,
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

const makePayrollRunsQuery = (runs: any[]) => {
  const state: any = { selectArg: '', eq: {} };
  const q: any = {
    select: vi.fn((arg: string) => {
      state.selectArg = arg;
      return q;
    }),
    eq: vi.fn((k: string, v: any) => {
      state.eq[k] = v;
      return q;
    }),
    order: vi.fn().mockResolvedValue({ data: runs, error: null }),
    then: (resolve: any, reject: any) => {
      const status = state.eq.status;
      if (state.selectArg === 'id' && status === 'Paid') {
        return Promise.resolve({ data: [], error: null }).then(resolve, reject);
      }
      return Promise.resolve({ data: [], error: null }).then(resolve, reject);
    },
  };
  return q;
};

const makeEmployeesQuery = (employeeRows: any[]) => {
  const q: any = {
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    limit: vi.fn(() => q),
    maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'HR Admin', system_access_role: null }, error: null }),
    order: vi.fn().mockResolvedValue({ data: employeeRows, error: null }),
  };
  return q;
};

describe('Payroll processing draft validation + summary restriction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rows: [] }) });
  });

  afterEach(() => cleanup());

  it('shows a timesheet issues warning listing employees when draft selection has timesheet problems', async () => {
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
    ];

    const employees = [
      {
        id: 'e1',
        first_name: 'Alice',
        last_name: 'Smith',
        employee_code: 'EMP001',
        employment_status: 'Active',
        payroll_employees: [{ id: 'pe1', employment_type: 'FullTime', pay_frequency: 'Fortnightly' }],
      },
      {
        id: 'e2',
        first_name: 'Bob',
        last_name: 'Jones',
        employee_code: 'EMP002',
        employment_status: 'Active',
        payroll_employees: [{ id: 'pe2', employment_type: 'FullTime', pay_frequency: 'Fortnightly' }],
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'payroll_runs') return makePayrollRunsQuery(runs);
      if (table === 'employees') return makeEmployeesQuery(employees);
      if (table === 'payslips') return { select: vi.fn(() => ({ in: vi.fn().mockResolvedValue({ data: [], error: null }) })) };
      return { select: vi.fn(() => ({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) })) };
    });

    serviceMocks.validatePayrollRun.mockResolvedValue({
      isValid: false,
      errors: [],
      warnings: [],
      missingTimesheets: ['e2'],
      unapprovedTimesheets: [],
      incompleteTimesheets: ['e1'],
    });

    render(<PayrollProcessingPage />);

    await screen.findByText('Employees');
    await waitFor(() => expect(screen.getByText('Select All')).not.toBeDisabled());

    fireEvent.click(screen.getByText('Alice Smith'));
    fireEvent.click(screen.getByText('Bob Jones'));

    await screen.findByText('Timesheet issues detected');
    const warning = screen.getByTestId('timesheet-issues-warning');
    expect(within(warning).getByText(/Alice Smith/)).toBeInTheDocument();
    expect(within(warning).getByText(/Bob Jones/)).toBeInTheDocument();
    expect(within(warning).getByRole('button', { name: /open timesheets to fix/i })).toBeInTheDocument();
  });

  it('does not render the payroll summary panel while the run is Draft', async () => {
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
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'payroll_runs') return makePayrollRunsQuery(runs);
      if (table === 'employees') return makeEmployeesQuery([]);
      return { select: vi.fn(() => ({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) })) };
    });

    render(<PayrollProcessingPage />);
    await screen.findByText('Payroll Processing');

    await waitFor(() => {
      expect(screen.queryByTestId('payroll-summary-panel')).not.toBeInTheDocument();
    });
  });
});
