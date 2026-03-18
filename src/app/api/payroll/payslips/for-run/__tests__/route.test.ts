import { describe, it, expect, vi, beforeEach } from 'vitest';

const createClient = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: any[]) => createClient(...args),
}));

const makeThenableQuery = (result: { data: any; error: any }) => {
  const q: any = {
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    maybeSingle: vi.fn().mockResolvedValue({ data: result.data, error: result.error }),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  };
  return q;
};

describe('GET /api/payroll/payslips/for-run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('works without service role key by using user-scoped client', async () => {
    const authClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
      },
    };

    const userClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'employees') {
          const q = makeThenableQuery({ data: { id: 'emp-hr', role: 'HR Admin', system_access_role: null }, error: null });
          q.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'emp-hr', role: 'HR Admin', system_access_role: null }, error: null });
          return q;
        }
        if (table === 'payslips') {
          return makeThenableQuery({
            data: [
              { id: 'ps1', payroll_run_id: 'run-a2', employee_id: 'e1', net_pay: 100, superannuation: 10, gross_pay: 120, income_tax: 20, tax_withheld: 20, hours_worked: 8, employees: { first_name: 'A', last_name: 'One' } },
            ],
            error: null,
          });
        }
        return makeThenableQuery({ data: [], error: null });
      }),
    };

    createClient.mockImplementation((_url: string, key: string) => {
      if (key === 'anon') {
        if (createClient.mock.calls.length === 1) return authClient as any;
        return userClient as any;
      }
      return {} as any;
    });

    const { GET } = await import('../route');
    const req: any = {
      url: 'http://localhost/api/payroll/payslips/for-run?payrollRunId=run-a2',
      headers: new Headers({ authorization: 'Bearer t' }),
    };
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.payslips)).toBe(true);
    expect(json.payslips.length).toBe(1);
  });
});

