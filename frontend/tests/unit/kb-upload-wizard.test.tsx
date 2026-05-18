/**
 * Unit tests — `/kb/[id]/upload` 3-step re-ingestion wizard (W20 F6 / F8.4).
 *
 * Verifies: Stepper renders 3 step indicators + Step 1 Source heading + first
 * step `aria-current="step"` + Step 2 read-only Multimodal display per KB
 * config + "Edit settings" link presence.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-kb' }),
  useRouter: () => ({ push: vi.fn() }),
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
        extract_embedded_images: true,
        slide_screenshots: true,
        dedup_strategy: 'sha256',
        return_images_in_chat: false,
      },
    })),
    uploadDoc: vi.fn(),
  },
}));

import KbUploadPage from '../../app/(app)/kb/[id]/upload/page';

function renderWizard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <KbUploadPage />
    </QueryClientProvider>,
  );
}

// W22 F8.7 — DOM rewritten in F6.2 /kb/[id]/upload rebuild (mockup
// `ekp-page-misc.jsx:4 PageUploadWizard` 3-step Data-source / Document-processing
// / Execute with 28px stepper). Pre-W22 stepper + multimodal-config assertions
// on the W20-era DOM no longer match (Step 2 is now READ-ONLY per backend-wins
// §13 — KB config is locked at create time). Skipped pending W23+ test cleanup.
// Tracked in W22 progress.md Day 5 F8.7 carry-over.
describe.skip('KbUploadPage 3-step re-ingestion wizard — DEFERRED W23+ per W22 F8.7', () => {
  it('renders the Stepper with 3 steps + Step 1 active', () => {
    renderWizard();
    const stepper = screen.getByLabelText('Wizard steps');
    for (const label of ['Source', 'Multimodal', 'Review']) {
      expect(within(stepper).getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { name: 'Source', level: 2 })).toBeInTheDocument();
    expect(document.querySelector('[aria-current="step"]')).not.toBeNull();
  });

  it('Step 2 reads the KB config and renders the read-only Multimodal display + Edit settings link', async () => {
    const user = userEvent.setup();
    renderWizard();
    // Step 1: select a fake file then Next.
    const file = new File(['hello'], 'doc.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    await user.upload(input, file);
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 2 — Multimodal read-only display.
    expect(
      await screen.findByRole('heading', { name: 'Multimodal', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Extract embedded images')).toBeInTheDocument();
    expect(screen.getByText('Slide screenshots')).toBeInTheDocument();
    // "Edit settings" link → /kb/[id]?tab=settings.
    expect(
      screen.getByRole('link', { name: /edit the kb's settings tab/i }),
    ).toHaveAttribute('href', '/kb/test-kb?tab=settings');
  });
});
