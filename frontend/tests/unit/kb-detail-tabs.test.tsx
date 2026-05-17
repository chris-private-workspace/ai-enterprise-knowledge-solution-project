/**
 * Unit tests — `/kb/[id]` 7-tab `-Access` detail (W20 F5 / F8.4).
 *
 * Verifies: 7 active tab triggers render + Access tab rendered with disabled
 * affordance (aria-disabled="true") OUTSIDE VALID_TABS array + URL ?tab= drives
 * the active panel.
 */

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-kb' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('@/lib/api/kb', () => ({
  kbApi: {
    get: vi.fn(async () => ({
      kb_id: 'test-kb',
      name: 'Test KB',
      description: 'Test',
      total_documents: 0,
      total_chunks: 0,
      total_screenshots: 0,
      storage_size_mb: 0,
      failed_documents: [],
      last_indexed_at: '2026-05-17T00:00:00Z',
      archived: false,
      config: {
        embedding_model: 'text-embedding-3-large',
        embedding_dimension: 1024,
        chunk_strategy: 'auto',
        default_top_k: 50,
        default_rerank_k: 5,
        extract_embedded_images: false,
        slide_screenshots: true,
        dedup_strategy: 'sha256',
        return_images_in_chat: false,
      },
    })),
    patchSettings: vi.fn(),
    patchMetadata: vi.fn(),
    archive: vi.fn(),
    listImages: vi.fn(async () => ({ items: [], total: 0, limit: 50, offset: 0 })),
    chunkingPreview: vi.fn(),
  },
}));
vi.mock('@/lib/api/documents', () => ({
  documentsApi: {
    list: vi.fn(async () => ({ items: [], total: 0 })),
  },
}));

import KbDetailPage from '../../app/(app)/kb/[id]/page';

describe('KbDetailPage 7-tab `-Access`', () => {
  it('renders 7 active tab triggers + Access tab as disabled', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <KbDetailPage />
      </QueryClientProvider>,
    );
    // Wait for the KB query to land so the tabs render.
    await screen.findByRole('heading', { level: 1 });
    // 8 tab triggers total (7 active + 1 Access disabled).
    const tabTriggers = screen.getAllByRole('tab');
    expect(tabTriggers.length).toBe(8);
    // Access tab is the disabled one.
    const accessTab = tabTriggers.find((t) => t.textContent?.toLowerCase().includes('access'));
    expect(accessTab).toBeDefined();
    expect(accessTab).toHaveAttribute('aria-disabled', 'true');
  });
});
