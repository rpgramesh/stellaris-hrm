import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';

vi.mock('next/navigation', () => {
  return {
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    useSearchParams: () => ({ get: () => null, toString: () => '' }),
  };
});

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      channel: vi.fn(),
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'Employee', system_access_role: null } }),
      })),
    },
  };
});

vi.mock('@/lib/realtime', async () => {
  const actual: any = await vi.importActual('@/lib/realtime');
  return {
    ...actual,
    subscribeToTableWithClient: vi.fn(() => ({ unsubscribe: vi.fn() })),
  };
});

vi.mock('@/services/timesheetService', () => {
  return {
    timesheetService: {
      listSubmissions: vi.fn(),
      updateSubmission: vi.fn(),
    },
  };
});

vi.mock('recharts', () => {
  const Stub = ({ children }: any) => <div>{children}</div>;
  return {
    ResponsiveContainer: Stub,
    BarChart: Stub,
    PieChart: Stub,
    CartesianGrid: Stub,
    XAxis: Stub,
    YAxis: Stub,
    Tooltip: Stub,
    Bar: Stub,
    Cell: Stub,
    Pie: Stub,
  };
});

vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      text: vi.fn(),
      save: vi.fn(),
    })),
  };
});

vi.mock('jspdf-autotable', () => ({}));

vi.mock('xlsx', () => {
  return {
    utils: {
      json_to_sheet: vi.fn(() => ({})),
      book_new: vi.fn(() => ({})),
      book_append_sheet: vi.fn(),
    },
    write: vi.fn(() => new Uint8Array([1, 2, 3])),
  };
});

import TimesheetDashboard from '@/app/(dashboard)/attendance/timesheets/page';
import { timesheetService } from '@/services/timesheetService';

describe('TimesheetDashboard enhancements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).URL.createObjectURL = vi.fn(() => 'blob:mock');
    (globalThis as any).URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
  });

  it('shows approved hours in Employee column only for Approved status', async () => {
    (timesheetService.listSubmissions as any).mockResolvedValue({
      rows: [
        {
          id: 't-approved',
          employeeId: 'e1',
          employeeName: 'Alice Smith',
          department: 'Engineering',
          status: 'Approved',
          payPeriod: '2026-03-02 - 2026-03-08',
          hoursLogged: 12.5,
        },
        {
          id: 't-draft',
          employeeId: 'e2',
          employeeName: 'Bob Jones',
          department: 'HR',
          status: 'Draft',
          payPeriod: '2026-03-02 - 2026-03-08',
          hoursLogged: 8,
        },
      ],
      total: 2,
    });

    render(<TimesheetDashboard />);

    await screen.findByText('Alice Smith - 12.5 hours');
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.queryByText(/Bob Jones - .* hours/)).not.toBeInTheDocument();
    expect(screen.getByText('Total Headcount')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('uses server-provided headcountTotal when present', async () => {
    (timesheetService.listSubmissions as any).mockResolvedValue({
      rows: [
        {
          id: 't1',
          employeeId: 'e1',
          employeeName: 'Alice Smith',
          department: 'Engineering',
          status: 'Approved',
          payPeriod: '2026-03-02 - 2026-03-08',
          hoursLogged: 8,
        },
      ],
      total: 10,
      headcountTotal: 5,
    });

    render(<TimesheetDashboard />);
    await screen.findByText('Alice Smith - 8 hours');
    expect(screen.getByText('Total Headcount')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('opens edit modal and saves changes via updateSubmission', async () => {
    (timesheetService.listSubmissions as any).mockResolvedValue({
      rows: [
        {
          id: 't1',
          employeeId: 'e1',
          employeeName: 'Alice Smith',
          department: 'Engineering',
          status: 'Draft',
          payPeriod: '2026-03-02 - 2026-03-08',
          hoursLogged: 8,
        },
      ],
      total: 1,
    });

    (timesheetService.updateSubmission as any).mockResolvedValue(undefined);

    render(<TimesheetDashboard />);
    await screen.findByText('Alice Smith');

    const row = screen.getByText('Alice Smith').closest('tr');
    expect(row).toBeTruthy();
    const editBtn = within(row as HTMLElement).getByTitle('Edit');
    fireEvent.click(editBtn);

    await screen.findByText('Edit Timesheet');
    const hoursInput = screen.getByPlaceholderText('Enter hours...');
    fireEvent.change(hoursInput, { target: { value: '40' } });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(timesheetService.updateSubmission).toHaveBeenCalledWith('t1', { status: 'Draft', hoursLogged: 40 });
    });
  });

  it('exports excel when clicking Excel Export', async () => {
    (timesheetService.listSubmissions as any).mockResolvedValue({
      rows: [
        {
          id: 't1',
          employeeId: 'e1',
          employeeName: 'Alice Smith',
          department: 'Engineering',
          status: 'Approved',
          payPeriod: '2026-03-02 - 2026-03-08',
          hoursLogged: 8,
          submittedAt: '2026-03-10T00:00:00.000Z',
        },
      ],
      total: 1,
    });

    const appendSpy = vi.spyOn(document.body, 'appendChild');

    render(<TimesheetDashboard />);
    await screen.findByText('Alice Smith - 8 hours');

    fireEvent.click(screen.getByRole('button', { name: /excel export/i }));

    await waitFor(() => {
      expect(appendSpy).toHaveBeenCalled();
      expect((globalThis as any).URL.createObjectURL).toHaveBeenCalled();
    });
  });
});
