import { describe, it, expect } from 'vitest';
import { renderEmailTemplate } from '@/lib/email/templateRender';

describe('renderEmailTemplate', () => {
  it('replaces placeholders in subject and body', () => {
    const res = renderEmailTemplate({
      subject: 'Hello {{name}} - {{period}}',
      body: 'Employee {{name}} is missing {{count}} timesheets for {{period}}.',
      variables: { name: 'Ramesh P', period: '2026-03-03 to 2026-03-15', count: '2' },
    });

    expect(res.subject).toBe('Hello Ramesh P - 2026-03-03 to 2026-03-15');
    expect(res.body).toBe('Employee Ramesh P is missing 2 timesheets for 2026-03-03 to 2026-03-15.');
  });
});

