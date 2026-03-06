import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      })
    }
  };
});

vi.mock('@/services/roleBasedAccessService', () => {
  return {
    roleBasedAccessService: {
      getRoles: vi.fn().mockResolvedValue([
        { id: 'r1', name: 'Employee', description: 'Basic', permissions: [], level: 10, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ]),
      getPermissions: vi.fn().mockResolvedValue([
        { id: 'p1', name: 'users:read', description: 'Read users', resource: 'users', action: 'read' }
      ]),
      getPermissionsByRole: vi.fn().mockResolvedValue([]),
      createRole: vi.fn().mockImplementation(async (payload) => ({
        ...payload, id: 'r-new'
      })),
      updateRole: vi.fn().mockImplementation(async (id, updates) => ({
        id, name: updates.name || 'X', description: updates.description || '', is_active: updates.is_active ?? true
      })),
      assignPermissionToRole: vi.fn().mockResolvedValue(undefined),
      removePermissionFromRole: vi.fn().mockResolvedValue(undefined),
      deleteRole: vi.fn().mockResolvedValue(undefined)
    }
  };
});

import Page from '@/app/(dashboard)/employees/hr-roles/page';

describe('Role Management UI', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders table and supports add flow', async () => {
    render(<Page />);
    expect(await screen.findByText('Role Management')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Add Role'));
    const nameInput = await screen.findByLabelText('Role Name');
    fireEvent.change(nameInput, { target: { value: 'Test Role' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Role created successfully')).toBeInTheDocument();
    });
  });

  it('shows delete confirm dialog', async () => {
    render(<Page />);
    expect(await screen.findByText('Employee')).toBeInTheDocument();
    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);
    expect(await screen.findByText('Confirm Delete')).toBeInTheDocument();
  });
});

