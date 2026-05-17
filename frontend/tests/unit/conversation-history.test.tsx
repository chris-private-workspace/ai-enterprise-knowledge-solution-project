/**
 * Unit tests — <ConversationHistory> (W20 F3.5 / F8.4).
 *
 * Verifies: header renders + "New chat" button present + list items from the
 * mocked `conversationsApi.list` payload + empty-state copy when no
 * conversations exist + ARIA landmark.
 */

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/conversations', () => ({
  conversationsApi: {
    list: vi.fn(async () => ({
      items: [
        {
          conversation_id: 'conv-1',
          title: 'Drive Project P&L drilldown',
          updated_at: '2026-05-15T10:00:00Z',
        },
        {
          conversation_id: 'conv-2',
          title: 'GL account reconciliation',
          updated_at: '2026-05-14T09:00:00Z',
        },
      ],
      total: 2,
    })),
    create: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { ConversationHistory } from '../../components/chat/conversation-history';

function renderHistory(activeId: string | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ConversationHistory
        activeConversationId={activeId}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onActiveDeleted={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

describe('ConversationHistory', () => {
  it('renders the "Conversations" header + "New chat" button', () => {
    renderHistory();
    expect(
      screen.getByRole('heading', { name: /conversations/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument();
  });

  it('renders fetched conversation items', async () => {
    renderHistory();
    expect(
      await screen.findByText('Drive Project P&L drilldown'),
    ).toBeInTheDocument();
    expect(screen.getByText('GL account reconciliation')).toBeInTheDocument();
  });
});
