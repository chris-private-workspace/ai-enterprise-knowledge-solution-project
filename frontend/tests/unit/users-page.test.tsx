/**
 * Unit tests — `/users` 4-tab page (W24c F9 per ADR-0027).
 *
 * Verifies:
 *  - 4-tab nav renders with mockup-faithful labels (Members / Roles &
 *    permissions / Groups / Audit log) when the caller is a Workspace Admin
 *  - `?tab=` deep link drives the initial active panel + unknown value falls
 *    back to Members
 *  - Tab switch updates `aria-selected` + URL via `router.replace`
 *  - `useRole()` whole-page gate — a non-admin role gets the access-denied
 *    state with no tab nav
 *  - Each tab body mounts without throwing (per-tab render-smoke)
 *
 * Mocks `usersApi` (incl. `getMe`, the `useRole()` data source) + `adminApi`
 * so the data-bound tabs don't hit the real backend. `mockRole` is mutable so
 * one test can exercise the non-admin gate.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { EkpRoleKey } from '@/lib/api/admin';

// next/navigation mock — searchParams + a controllable router.replace spy.
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams('');

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

// `useRole()` reads `usersApi.getMe()` — mockRole drives the resolved role.
let mockRole: EkpRoleKey = 'admin';

vi.mock('@/lib/api/users', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/users')>()),
  usersApi: {
    getMe: vi.fn(async () => ({
      oid: 'o1',
      tid: 't1',
      preferred_username: 'chris.lai@ricoh.com',
      role: mockRole,
      is_mock: true,
    })),
    listUsers: vi.fn(async () => ({
      users: [
        {
          oid: 'u1',
          email: 'chris.lai@ricoh.com',
          display_name: 'Chris Lai',
          role: 'admin',
          status: 'active',
          created_at: '2026-04-01T00:00:00Z',
        },
        {
          oid: 'u2',
          email: 'priya.anand@ricoh.com',
          display_name: 'Priya Anand',
          role: 'editor',
          status: 'active',
          created_at: '2026-04-08T00:00:00Z',
        },
        {
          oid: 'u3',
          email: 'hana.suzuki@ricoh.co.jp',
          display_name: 'Hana Suzuki',
          role: 'user',
          status: 'pending',
          created_at: '2026-05-14T00:00:00Z',
        },
      ],
      total: 3,
    })),
    listRoles: vi.fn(async () => ({
      roles: [
        {
          role_key: 'admin',
          label: 'Workspace Admin',
          description: 'Full platform control',
          tier: 1,
          active: true,
        },
        {
          role_key: 'editor',
          label: 'Knowledge Editor',
          description: 'Create + upload to assigned KBs',
          tier: 1,
          active: true,
        },
        {
          role_key: 'user',
          label: 'End User',
          description: 'Query assigned KBs',
          tier: 1,
          active: true,
        },
        {
          role_key: 'power',
          label: 'Power User',
          description: 'Tier 2 — retrieval tuning',
          tier: 2,
          active: false,
        },
      ],
      total: 4,
    })),
    listPermissions: vi.fn(async () => ({
      permissions: [
        {
          role_key: 'admin',
          permission_key: 'kb.view',
          area: 'Knowledge bases',
          label: 'View assigned KBs',
          granted: true,
        },
        {
          role_key: 'editor',
          permission_key: 'kb.view',
          area: 'Knowledge bases',
          label: 'View assigned KBs',
          granted: true,
        },
        {
          role_key: 'user',
          permission_key: 'kb.view',
          area: 'Knowledge bases',
          label: 'View assigned KBs',
          granted: true,
        },
        {
          role_key: 'power',
          permission_key: 'kb.view',
          area: 'Knowledge bases',
          label: 'View assigned KBs',
          granted: false,
        },
      ],
      total: 4,
    })),
    listGroups: vi.fn(async () => ({
      groups: [
        {
          group_key: 'g1',
          name: 'grp-ekp-admins',
          description: null,
          source: 'entra',
          entra_object_id: 'a7f4b1c4-0000-0000-0000-000000000000',
          synced_at: '2026-05-21T00:00:00Z',
          member_count: 3,
        },
      ],
      total: 1,
    })),
    inviteUser: vi.fn(),
    suspendUser: vi.fn(),
    changeUserRole: vi.fn(),
    syncGroupsFromEntra: vi.fn(),
  },
}));

vi.mock('@/lib/api/admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/admin')>()),
  adminApi: {
    getIdentity: vi.fn(async () => ({
      tenant: {
        tenant_id: '00000000-0000-0000-0000-000000000000',
        tenant_domain: 'ricoh.onmicrosoft.com',
        cloud_instance: 'azure_public',
        authority_url: null,
      },
      app_registration: {
        client_id: '00000000-0000-0000-0000-000000000000',
        client_secret_kv_ref: null,
        client_secret_masked_preview: null,
        client_secret_expires_at: null,
        redirect_uris: [],
        scopes: [],
        sign_in_audience: 'single',
      },
      msal: {
        token_cache_strategy: 'memory',
        session_ttl: '7d',
        refresh_token_rotation: '24h',
        csrf_token_rotation: '1h',
        cookie_settings_preview: '',
      },
      roles: {
        mappings: [
          {
            ekp_role: 'admin',
            entra_group_name: 'grp-ekp-admins',
            entra_group_id: 'a7f4b1c4-0000-0000-0000-000000000000',
            member_count: 3,
            is_tier2_disabled: false,
            tier2_reason: null,
          },
        ],
      },
      policy: {
        allowed_email_domains: ['@ricoh.com'],
        require_mfa_workspace_admin: true,
        require_mfa_all_roles_tier2: false,
        auto_disable_after_days: 90,
      },
      updated_at: '2026-05-21T00:00:00Z',
    })),
    listAuditLog: vi.fn(async () => ({
      entries: [
        {
          id: 1,
          actor: 'chris.lai',
          action: 'role.changed',
          resource: 'users/u2',
          payload: { from: 'editor', to: 'user' },
          created_at: '2026-05-21T00:00:00Z',
        },
      ],
      next_cursor: null,
    })),
  },
}));

import UsersPage from '@/app/(app)/users/page';

function renderUsers() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <UsersPage />
    </QueryClientProvider>,
  );
}

describe('Users 4-tab page (W24c F9)', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSearchParams = new URLSearchParams('');
    mockRole = 'admin';
  });

  it('renders all 4 tab labels for a Workspace Admin', async () => {
    renderUsers();
    // The page header renders in the role-gate loading state too — wait for a
    // tab (admin-resolved full page) rather than the heading.
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /members/i })).toBeInTheDocument();
    });
    expect(
      screen.getByRole('heading', { name: /users & access/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /roles & permissions/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /groups/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /audit log/i })).toBeInTheDocument();
  });

  it('defaults to the Members tab when no ?tab= query param', async () => {
    renderUsers();
    await waitFor(() => {
      const membersTab = screen.getByRole('tab', { name: /members/i });
      expect(membersTab).toHaveAttribute('aria-selected', 'true');
    });
    // Members body — a mock user's email appears.
    await waitFor(() => {
      expect(screen.getByText(/priya\.anand@ricoh\.com/i)).toBeInTheDocument();
    });
  });

  it('honors ?tab=roles deep link', async () => {
    mockSearchParams = new URLSearchParams('tab=roles');
    renderUsers();
    await waitFor(() => {
      const rolesTab = screen.getByRole('tab', {
        name: /roles & permissions/i,
      });
      expect(rolesTab).toHaveAttribute('aria-selected', 'true');
    });
    await waitFor(() => {
      expect(screen.getByText(/permissions matrix/i)).toBeInTheDocument();
    });
  });

  it('honors ?tab=groups deep link', async () => {
    mockSearchParams = new URLSearchParams('tab=groups');
    renderUsers();
    // Wait for the group row — the page subtitle also mentions "Entra ID
    // groups", so target the table content, not loose text.
    await waitFor(() => {
      expect(screen.getByText(/grp-ekp-admins/i)).toBeInTheDocument();
    });
    // Card title (an <h3>, disambiguated from the page subtitle paragraph).
    expect(
      screen.getByRole('heading', { name: /entra id groups/i }),
    ).toBeInTheDocument();
  });

  it('honors ?tab=audit deep link', async () => {
    mockSearchParams = new URLSearchParams('tab=audit');
    renderUsers();
    await waitFor(() => {
      expect(screen.getByText(/workspace audit log/i)).toBeInTheDocument();
    });
    // Audit feed — the mock entry's action chip.
    expect(screen.getByText('role.changed')).toBeInTheDocument();
  });

  it('falls back to Members when ?tab= contains an unknown value', async () => {
    mockSearchParams = new URLSearchParams('tab=bogus');
    renderUsers();
    await waitFor(() => {
      const membersTab = screen.getByRole('tab', { name: /members/i });
      expect(membersTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('updates URL via router.replace on tab click', async () => {
    renderUsers();
    await waitFor(() => {
      expect(
        screen.getByRole('tab', { name: /audit log/i }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('tab', { name: /audit log/i }));
    await waitFor(() => {
      expect(
        screen.getByRole('tab', { name: /audit log/i }),
      ).toHaveAttribute('aria-selected', 'true');
    });
    expect(mockReplace).toHaveBeenCalled();
    const [url] = mockReplace.mock.calls[0]!;
    expect(url).toContain('tab=audit');
  });

  it('gates the page to Workspace Admins — a non-admin sees access-denied', async () => {
    mockRole = 'editor';
    renderUsers();
    await waitFor(() => {
      expect(screen.getByText(/admin access required/i)).toBeInTheDocument();
    });
    // No tab navigation in the denied state.
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('Roles tab renders the role cards + permissions matrix', async () => {
    mockSearchParams = new URLSearchParams('tab=roles');
    renderUsers();
    await waitFor(() => {
      expect(screen.getByText(/permissions matrix/i)).toBeInTheDocument();
    });
    // Pivoted matrix area header from the mock permission rows.
    expect(screen.getByText('Knowledge bases')).toBeInTheDocument();
    // Power role card carries the Tier 2 badge.
    expect(screen.getByText('TIER 2')).toBeInTheDocument();
  });
});
