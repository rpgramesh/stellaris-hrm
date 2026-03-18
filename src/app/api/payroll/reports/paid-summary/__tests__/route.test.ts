import { describe, it, expect, vi, beforeEach } from 'vitest';

const createClient = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: any[]) => createClient(...args),
}));

const makeThenableQuery = (result: { data: any; error: any }) => {
  const q: any = {
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    gte: vi.fn(() => q),
    lte: vi.fn(() => q),
    in: vi.fn(() => q),
    order: vi.fn(() => q),
    insert: vi.fn().mockResolvedValue({ error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: result.data, error: result.error }),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  };
  return q;
};

describe('GET /api/payroll/reports/paid-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  });

  it('returns 401 when missing bearer token', async () => {
    const { GET } = await import('../route');
    const req: any = { url: 'http://localhost/api/payroll/reports/paid-summary', headers: new Headers() };
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns summary data for paid runs', async () => {
    const authClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
      },
    };

    const runs = [
      {
        id: 'run-a2',
        pay_period_start: '2024-02-01',
        pay_period_end: '2024-02-28',
        payment_date: '2024-03-01',
        pay_frequency: 'Monthly',
        status: 'Paid',
        employee_count: 2,
        total_gross_pay: 2000,
        total_tax: 300,
        total_net_pay: 1700,
        total_super: 200,
      },
    ];

    const payslips = [
      {
        id: 'ps1',
        payroll_run_id: 'run-a2',
        employee_id: 'e1',
        gross_pay: 1800,
        net_pay: 1571,
        tax_withheld: 229,
        superannuation: 180,
        employees: { first_name: 'Line', last_name: 'Manager', employee_code: 'EMP0002' },
        pay_components: [],
        deduction_applications: [],
        payroll_runs: { pay_period_start: '2024-02-01', pay_period_end: '2024-02-28', status: 'Paid' },
      },
      {
        id: 'ps2',
        payroll_run_id: 'run-a2',
        employee_id: 'e2',
        gross_pay: 200,
        net_pay: 46,
        tax_withheld: 154,
        superannuation: 20,
        employees: { first_name: 'Ramesh', last_name: 'P', employee_code: 'EMP0007' },
        pay_components: [],
        deduction_applications: [],
        payroll_runs: { pay_period_start: '2024-02-01', pay_period_end: '2024-02-28', status: 'Paid' },
      },
    ];

    const adminClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'employees') {
          const q = makeThenableQuery({ data: { id: 'emp-hr', role: 'HR Admin', system_access_role: null }, error: null });
          q.eq = vi.fn(() => q);
          q.select = vi.fn(() => q);
          q.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'emp-hr', role: 'HR Admin', system_access_role: null }, error: null });
          return q;
        }
        if (table === 'payroll_runs') {
          return makeThenableQuery({ data: runs, error: null });
        }
        if (table === 'payslips') {
          return makeThenableQuery({ data: payslips, error: null });
        }
        if (table === 'audit_logs') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return makeThenableQuery({ data: [], error: null });
      }),
    };

    createClient.mockImplementation((_url: string, key: string) => {
      if (key === 'anon') return authClient as any;
      if (key === 'service') return adminClient as any;
      return {} as any;
    });

    const { GET } = await import('../route');
    const req: any = {
      url: 'http://localhost/api/payroll/reports/paid-summary?startDate=2024-02-01&endDate=2024-02-28',
      headers: new Headers({ authorization: 'Bearer t' }),
    };
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.payrollRuns).toBe(1);
    expect(json.employeeCount).toBe(2);
    expect(json.runs[0].payrollRunId).toBe('run-a2');
    expect(json.runs[0].employees.length).toBe(2);
  });
});

