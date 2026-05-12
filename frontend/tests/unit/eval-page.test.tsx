/**
 * Unit tests — Eval Console page (`/eval`) — CH-002 F3.
 *
 * Covers: the page renders without the stale "W4 stub / pending implementation"
 * copy; clicking Run calls `evalApi.run` with a `max_main_queries` cap (spec
 * R2) and renders the 4 metric cards from the returned `EvalReport`; an
 * eval-run error surfaces a `toast.error`. The mutation goes through a real
 * `QueryClientProvider`; `evalApi` / `sonner` / `next/link` are mocked.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/api/eval', () => ({ evalApi: { run: vi.fn(), shootout: vi.fn() } }));

import { toast } from 'sonner';

import { evalApi } from '@/lib/api/eval';
import EvalConsolePage from '../../app/(app)/eval/page';

const FAKE_REPORT = {
  recall_at_5: 0.92,
  faithfulness: 0.88,
  correctness: 0.81,
  image_association: 0.0,
  p95_latency_ms: 1200,
  failed_queries: [
    {
      query_id: 'q-001',
      query: 'how do refunds work',
      expected: '>= 0.7',
      got: 'answer_relevancy=0.30',
      metric_failed: ['answer_relevancy'],
    },
  ],
  crag_trigger_rate: 0.1,
  avg_cost_per_query_usd: 0.002,
};

function renderEval() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EvalConsolePage />
    </QueryClientProvider>,
  );
}

describe('Eval Console page (CH-002 F3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the console + empty state without the stale W4-stub copy', () => {
    renderEval();
    expect(
      screen.getByRole('heading', { name: /evaluation console/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/no eval runs yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/W4 stub/i)).toBeNull();
    expect(screen.queryByText(/pending implementation/i)).toBeNull();
  });

  it('running an eval renders the 4 metric cards from the report', async () => {
    vi.mocked(evalApi.run).mockResolvedValue(FAKE_REPORT);
    renderEval();

    await userEvent.click(screen.getByRole('button', { name: 'Run' }));

    // The four MetricCard short-codes are unique on the page (the full labels
    // collide with the Reranker Shootout table headers).
    for (const code of ['R@5', 'FFul', 'CRct', 'IAss']) {
      expect(await screen.findByText(code)).toBeInTheDocument();
    }
    expect(screen.getByText('0.920')).toBeInTheDocument(); // recall_at_5
    expect(screen.getByText(/failed queries \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('how do refunds work')).toBeInTheDocument();

    expect(evalApi.run).toHaveBeenCalledWith(
      expect.objectContaining({
        eval_set_id: 'eval-set-v0',
        enable_crag: true,
        max_main_queries: expect.any(Number),
      }),
    );
  });

  it('surfaces a toast on eval-run failure', async () => {
    vi.mocked(evalApi.run).mockRejectedValue(new Error('eval orchestrator down'));
    renderEval();

    await userEvent.click(screen.getByRole('button', { name: 'Run' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
