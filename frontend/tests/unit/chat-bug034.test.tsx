/**
 * Unit tests — BUG-034 Finding A (chat page).
 *
 * A conversation's kb_id was captured only at creation, so switching the KB
 * selector after opening an existing thread left the persisted kb_id stale
 * while the query used the new KB → re-opening showed the wrong KB. The fix
 * re-binds the conversation's kb_id to the KB actually queried whenever an
 * EXISTING conversation is reused.
 *
 * Test: open a conversation bound to kb-a, switch the selector to kb-b, send a
 * message → conversationsApi.update is called with { kb_id: 'kb-b' }. A second
 * test asserts a brand-new conversation (no reuse) does NOT patch (it is created
 * with the correct kb_id already).
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const { streamQuery, kbList, convList, convGet, convCreate, convUpdate, convAppend } = vi.hoisted(
  () => ({
    streamQuery: vi.fn(),
    kbList: vi.fn(),
    convList: vi.fn(),
    convGet: vi.fn(),
    convCreate: vi.fn(),
    convUpdate: vi.fn(),
    convAppend: vi.fn(),
  }),
);

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/api/kb', () => ({ kbApi: { list: kbList } }));
vi.mock('@/lib/api/query', () => ({ streamQuery }));
vi.mock('@/lib/api/conversations', () => ({
  conversationsApi: {
    list: convList,
    get: convGet,
    create: convCreate,
    update: convUpdate,
    appendMessage: convAppend,
    remove: vi.fn(async () => ({})),
  },
}));

import ChatPage from '@/app/(app)/chat/page';

function kb(id: string, name: string) {
  return {
    kb_id: id,
    name,
    description: name,
    config: {
      embedding_model: 'text-embedding-3-large',
      embedding_dimension: 1024,
      chunk_strategy: 'auto' as const,
      default_top_k: 50,
      default_rerank_k: 5,
    },
    total_documents: 1,
    total_chunks: 10,
    total_screenshots: 0,
    failed_documents: [],
    last_indexed_at: '2026-06-01T00:00:00Z',
    storage_size_mb: 0,
    archived: false,
  };
}

const CONV = {
  id: 'conv-a',
  user_id: 'u1',
  title: 'Alpha thread',
  kb_id: 'kb-a',
  created_at: '2026-06-07T00:00:00Z',
  updated_at: '2026-06-07T00:00:00Z',
  message_count: 1,
};

function renderChat() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ChatPage />
    </QueryClientProvider>,
  );
}

describe('BUG-034 Finding A — conversation kb_id re-binds to the queried KB', () => {
  beforeEach(() => {
    streamQuery.mockReset();
    kbList.mockReset();
    convList.mockReset();
    convGet.mockReset();
    convCreate.mockReset();
    convUpdate.mockReset();
    convAppend.mockReset();
    kbList.mockResolvedValue([kb('kb-a', 'KB Alpha'), kb('kb-b', 'KB Bravo')]);
    convList.mockResolvedValue({ items: [CONV], total: 1, limit: 50, offset: 0 });
    convGet.mockResolvedValue({ conversation: CONV, messages: [] });
    convCreate.mockResolvedValue({ id: 'conv-new', kb_id: 'kb-a' });
    convUpdate.mockResolvedValue({ ...CONV, kb_id: 'kb-b' });
    convAppend.mockResolvedValue({});
    streamQuery.mockImplementation(() => (async function* () {})());
  });

  it('re-binds kb_id when an existing conversation is reused after a KB switch', async () => {
    renderChat();

    const select = (await screen.findByRole('combobox')) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('kb-a'));

    // open the existing conversation (sets activeConvId → subsequent send reuses it)
    await userEvent.click(await screen.findByText('Alpha thread'));
    await waitFor(() => expect(select.value).toBe('kb-a'));

    // user switches the KB selector to kb-b, then sends
    await userEvent.selectOptions(select, 'kb-b');
    expect(select.value).toBe('kb-b');

    const textarea = screen.getByPlaceholderText(/Ask about Ricoh/i);
    await userEvent.type(textarea, 'How do I post a journal entry?');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(convUpdate).toHaveBeenCalledWith('conv-a', { kb_id: 'kb-b' }));
    // the query itself used the switched KB
    expect(streamQuery).toHaveBeenCalledWith(
      expect.objectContaining({ kb_id: 'kb-b' }),
      expect.anything(),
    );
  });

  it('does NOT patch kb_id for a brand-new conversation (created with the right KB)', async () => {
    // no existing conversation opened → first send lazily creates with current kbId
    convList.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
    renderChat();

    const select = (await screen.findByRole('combobox')) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('kb-a'));

    const textarea = screen.getByPlaceholderText(/Ask about Ricoh/i);
    await userEvent.type(textarea, 'first question');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(convCreate).toHaveBeenCalledWith({ kb_id: 'kb-a' }));
    expect(convUpdate).not.toHaveBeenCalled();
  });
});
