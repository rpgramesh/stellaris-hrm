import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@/services/auditService', () => ({
  auditService: { logAction: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/services/pdfGeneratorService', () => ({
  pdfGeneratorService: { generatePayslipPdf: vi.fn() },
}));

const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
      },
      from: (...args: any[]) => mockFrom(...args),
    },
  };
});

import EmployeePayslipsPage from '@/app/(dashboard)/self-service/payslips/page';

const makeEmployeesQuery = () => {
  const q: any = {
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: 'emp1', first_name: 'Alice', last_name: 'Smith', employee_code: 'EMP001', email: 'a@example.com' },
      error: null,
    }),
  };
  return q;
};

const makePayslipsQuery = () => {
  const q: any = {
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    order: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'ps1',
          employee_id: 'emp1',
          pay_period_start: '2024-02-01',
          pay_period_end: '2024-02-28',
          gross_earnings: 2000,
          net_pay: 1571.46,
          income_tax: 228.54,
          superannuation: 200,
          payment_date: '2024-02-29',
          status: 'Final',
        },
      ],
      error: null,
    }),
  };
  return q;
};

const makePayComponentsQuery = () => {
  const q: any = {
    select: vi.fn(() => q),
    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  return q;
};

describe('EmployeePayslipsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'employees') return makeEmployeesQuery();
      if (table === 'payslips') return makePayslipsQuery();
      if (table === 'pay_components') return makePayComponentsQuery();
      return { select: vi.fn(() => ({}) ) };
    });
  });

  afterEach(() => cleanup());

  it('renders payslip history even when schema uses pay_period_start/pay_period_end', async () => {
    render(<EmployeePayslipsPage />);

    await screen.findByText('Payslip History');
    expect(screen.getByText('Net Pay')).toBeInTheDocument();
    expect(screen.queryByText('No payslips found')).not.toBeInTheDocument();
  });
});

