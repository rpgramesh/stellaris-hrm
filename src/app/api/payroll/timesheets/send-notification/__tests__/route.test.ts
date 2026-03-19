import { describe, it, expect, vi, beforeEach } from 'vitest';

const createClient = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: any[]) => createClient(...args),
}));

const makeThenable = (exec: () => Promise<any>) => {
  const q: any = {};
  q.then = (resolve: any, reject: any) => exec().then(resolve, reject);
  return q;
};

describe('POST /api/payroll/timesheets/send-notification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'm1' }),
      text: async () => '',
    });
  });

  it('skips duplicate notifications within 24h', async () => {
    const authClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    };

    const state: any = { table: '', where: {}, in: {}, select: '' };
    const employeeId = '11111111-1111-4111-8111-111111111111';
    const managerId = '22222222-2222-4222-8222-222222222222';

    const userClient = {
      from: (table: string) => {
        state.table = table;
        state.where = {};
        state.in = {};
        state.select = '';
        const exec = async () => {
          if (table === 'employees' && state.where.user_id) {
            return { data: { role: 'HR Admin', system_access_role: null }, error: null };
          }
          if (table === 'employees' && state.in.id) {
            const ids = state.in.id;
            if (ids.includes(managerId)) {
              return { data: [{ id: managerId, first_name: 'Line', last_name: 'Manager', email: 'mgr@example.com' }], error: null };
            }
            return {
              data: [
                { id: employeeId, first_name: 'Ramesh', last_name: 'P', employee_code: 'EMP0007', line_manager_id: managerId },
              ],
              error: null,
            };
          }
          if (table === 'timesheets') {
            return {
              data: [
                { employee_id: employeeId, week_start_date: '2026-03-03', status: 'Draft', total_hours: 0 },
              ],
              error: null,
            };
          }
          if (table === 'email_template_assignments') {
            return { data: { template_id: 'tpl1', is_enabled: true }, error: null };
          }
          if (table === 'email_templates') {
            return { data: { id: 'tpl1', name: 'T', subject: 'S {{employee_name}}', body: 'B', category: 'Timesheets' }, error: null };
          }
          if (table === 'email_audit_log') {
            return { data: [{ id: 'log1', status: 'SENT', sent_at: new Date().toISOString() }], error: null };
          }
          return { data: [], error: null };
        };

        const q: any = makeThenable(exec);
        q.select = (s: string) => {
          state.select = s;
          return q;
        };
        q.eq = (k: string, v: any) => {
          state.where[k] = v;
          return q;
        };
        q.in = (k: string, v: any) => {
          state.in[k] = v;
          return q;
        };
        q.gte = (k: string, v: any) => {
          state.where[k] = v;
          return q;
        };
        q.order = () => q;
        q.limit = () => q;
        q.maybeSingle = async () => exec();
        q.insert = vi.fn().mockResolvedValue({ error: null });
        return q;
      },
    };

    createClient.mockImplementation((_url: string, key: string) => {
      if (key === 'anon') {
        if (createClient.mock.calls.length === 1) return authClient as any;
        return userClient as any;
      }
      return {} as any;
    });

    const { POST } = await import('../route');
    const req: any = {
      url: 'http://localhost/api/payroll/timesheets/send-notification',
      headers: new Headers({ authorization: 'Bearer t' }),
      json: async () => ({ kind: 'MISSING', employeeIds: [employeeId], startDate: '2026-03-03', endDate: '2026-03-15' }),
    };

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results[0].status).toBe('SKIPPED_DUPLICATE');
    expect((globalThis as any).fetch).not.toHaveBeenCalled();
  });
});
