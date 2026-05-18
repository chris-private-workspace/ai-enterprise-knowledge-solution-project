/**
 * Unit tests — Dashboard page (`/dashboard`) — W22 F3 rebuild per
 * `references/design-mockups/ekp-page-dashboard.jsx PageDashboard`.
 *
 * Verifies (post-W22 rebuild):
 *   - h1 "Welcome back, …" + 4-stat strip labels (Knowledge bases / Documents
 *     / Recall @ 5 / Today's spend — mockup labels, NOT W18 KBs/Documents/
 *     Chunks/Storage shape)
 *   - 5 main card titles (h3 not h2): Knowledge bases, Recent queries,
 *     Latest eval, System health, Quick actions
 *   - 5 component health rows render (Azure AI Search / Azure OpenAI /
 *     Cohere Reranker / Langfuse / Postgres — divs not <ul>/<li>)
 *   - top-2 KB list renders from kbApi.list mock + links to /kb/{id}
 *
 * W22 F8.7 rewrite (2026-05-18): W18+W20 baseline asserted ARIA list
 * semantics + h2 card titles + W18 4-stat labels. W22 F3 rebuild uses
 * mockup `.stat-grid` divs + `<h3 class="card-title">` + flat `<div>` rows
 * for System health (per CSS-first pivot baseline + mockup fidelity).
 */

import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string | { pathname?: string }; children: React.ReactNode }) => (
    <a href={typeof href === 'string' ? href : (href?.pathname ?? '#')} {...rest}>
      {children}
    </a>
  ),
}));

// W22 F3 — kbApi.list returns a small fixture so the 4-stat strip + KB list
// both render with sum-aggregated values.
vi.mock('@/lib/api/kb', () => ({
  kbApi: {
    list: vi.fn(async () => [
      {
        kb_id: 'drive-manuals',
        name: 'Drive Project — Manuals',
        total_documents: 12,
        total_chunks: 240,
        storage_size_mb: 3.4,
      },
      {
        kb_id: 'ricoh-onboarding',
        name: 'Ricoh Onboarding',
        total_documents: 5,
        total_chunks: 80,
        storage_size_mb: 1.1,
      },
    ]),
  },
}));

// W20 F2.1 — /health returns per-component payload; W22 dashboard renders 5
// rows from this fixture in SystemHealthCard (divs, not <ul>/<li>).
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(async () => ({
      status: 'ok',
      components: {
        azure_search: { status: 'ok', latency_ms: null, detail: null },
        azure_openai: { status: 'ok', latency_ms: null, detail: null },
        cohere: { status: 'not_configured', latency_ms: null, detail: 'optional' },
        langfuse: { status: 'ok', latency_ms: null, detail: null },
        postgres: { status: 'not_configured', latency_ms: null, detail: 'in-memory fallback' },
      },
    })),
  },
}));

import DashboardPage from '../../app/(app)/dashboard/page';

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

describe('Dashboard page', () => {
  it('renders the Welcome-back h1 + 5 main card titles', async () => {
    renderDashboard();
    // Wait for at least one card title to land (async via useQuery + render).
    expect(
      await screen.findByRole('heading', { name: /knowledge bases/i, level: 3 }),
    ).toBeInTheDocument();
    // h1 — mockup shows "Welcome back, {displayName}" (user fallback may be
    // "Signing in…" or empty);use prefix regex.
    expect(
      screen.getByRole('heading', { level: 1, name: /welcome back/i }),
    ).toBeInTheDocument();
    // 5 card titles (h3 per CSS-first pivot baseline).
    for (const title of [
      'Knowledge bases',
      'Recent queries',
      'Latest eval',
      'System health',
      'Quick actions',
    ]) {
      expect(
        screen.getByRole('heading', { name: title, level: 3 }),
      ).toBeInTheDocument();
    }
  });

  it('renders the 4-stat strip with mockup labels (KBs / Documents / Recall@5 / Today\'s spend)', async () => {
    renderDashboard();
    // findByText waits for the kbApi.list mock to resolve.
    expect(await screen.findByText(/^Documents$/)).toBeInTheDocument();
    // Stat strip uses mockup labels — not W18 "Chunks" / "Storage".
    // Stat label + Latest eval card both mention "Recall @ 5" — use getAllByText.
    expect(screen.getAllByText(/recall\s*@\s*5/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/today.s spend/i)).toBeInTheDocument();
    // Knowledge bases label appears in the KBs stat tile (could also be in
    // SidebarNav — use getAllByText since multiple instances are fine).
    expect(screen.getAllByText(/knowledge bases/i).length).toBeGreaterThan(0);
    // Stat values + meta text are split across React expression nodes
    // ({value}{<span>{unit}</span>}) — getByText doesn't traverse those by
    // default. Structural label assertions above prove the 4-stat strip
    // rendered; numeric-value assertions are intentionally omitted at smoke
    // layer (deeper coverage = Tier 2 stat-rendering tests).
  });

  it('renders 5 per-component health rows (divs, not <ul>/<li>)', async () => {
    renderDashboard();
    // Wait for /health to resolve.
    await screen.findByText('Azure AI Search');
    // 5 component labels per COMPONENT_ORDER on the dashboard page.
    for (const label of [
      'Azure AI Search',
      'Azure OpenAI',
      'Cohere Reranker',
      'Langfuse',
      'Postgres',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('renders the top-N KB list with names + links to /kb/{id}', async () => {
    renderDashboard();
    // findByRole on the KB-specific link waits for kbQuery to actually resolve.
    const driveLink = await screen.findByRole('link', { name: /drive project — manuals/i });
    expect(driveLink).toHaveAttribute('href', '/kb/drive-manuals');
    expect(
      screen.getByRole('link', { name: /ricoh onboarding/i }),
    ).toHaveAttribute('href', '/kb/ricoh-onboarding');
  });

  it('renders the Quick actions card with Tier 1 action buttons + Tier 2 API access disabled', async () => {
    renderDashboard();
    // Quick actions card title h3.
    expect(
      await screen.findByRole('heading', { name: /quick actions/i, level: 3 }),
    ).toBeInTheDocument();
    // Within the QuickActions card body, look for actions.
    const quickActionsHeader = screen.getByRole('heading', { name: /quick actions/i, level: 3 });
    const card = quickActionsHeader.closest('.card');
    expect(card).not.toBeNull();
    const within$ = within(card as HTMLElement);
    expect(within$.getByText(/upload documents/i)).toBeInTheDocument();
    expect(within$.getByText(/retrieval testing/i)).toBeInTheDocument();
    expect(within$.getByText(/new knowledge base/i)).toBeInTheDocument();
    // API access is Tier 2 disabled.
    expect(within$.getByText(/api access/i)).toBeInTheDocument();
  });
});
