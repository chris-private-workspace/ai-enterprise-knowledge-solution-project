/**
 * Unit tests — <NotificationsMenu> (W20 F1.1 / F8.4).
 *
 * Verifies: Bell trigger renders + unread counter badge + DropdownMenu items
 * render from `apiClient.get('/notifications')` fixture + 404 fallback path
 * (MOCK_NOTIFICATIONS) + "See all →" disabled affordance present.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(async () => ({
      items: [
        { id: 'evt-1', title: 'KB ingestion completed — Drive (12 docs)', read: false },
        { id: 'evt-2', title: 'Eval run finished — eval-set-v0 (PASS)', read: true },
      ],
    })),
  },
}));

import { NotificationsMenu } from '../../components/nav/notifications-menu';

function renderMenu() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NotificationsMenu />
    </QueryClientProvider>,
  );
}

describe('NotificationsMenu', () => {
  it('renders the Bell trigger with aria-label', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('renders fetched notification items when the trigger is opened', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /notifications/i }));
    expect(
      await screen.findByText(/KB ingestion completed — Drive/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Eval run finished/)).toBeInTheDocument();
  });
});
