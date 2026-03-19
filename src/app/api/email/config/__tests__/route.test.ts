import { describe, it, expect, vi, beforeEach } from 'vitest';

const createClient = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: any[]) => createClient(...args),
}));

describe('GET /api/email/config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  });

  it('returns config without smtp_password', async () => {
    const authClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    };

    const userClient = {
      from: (table: string) => {
        if (table !== 'employees') throw new Error('unexpected table');
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'HR Admin', system_access_role: null }, error: null }),
            }),
          }),
        };
      },
    };

    const adminClient = {
      from: (table: string) => {
        if (table !== 'email_config') throw new Error('unexpected table');
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'default',
                  smtp_host: 'smtp.example.com',
                  smtp_port: 587,
                  smtp_user: 'u',
                  smtp_password: 'secret',
                  from_address: 'no-reply@example.com',
                  from_name: 'Stellaris HRM',
                  use_webhook: false,
                  webhook_url: null,
                },
                error: null,
              }),
            }),
          }),
        };
      },
    };

    createClient.mockImplementation((_url: string, key: string) => {
      if (key === 'anon') {
        if (createClient.mock.calls.length === 1) return authClient as any;
        return userClient as any;
      }
      if (key === 'service') return adminClient as any;
      return {} as any;
    });

    const { GET } = await import('../route');
    const req: any = {
      url: 'http://localhost/api/email/config',
      headers: new Headers({ authorization: 'Bearer t' }),
    };
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.config.smtp_host).toBe('smtp.example.com');
    expect(json.config.smtp_password).toBeUndefined();
  });
});

