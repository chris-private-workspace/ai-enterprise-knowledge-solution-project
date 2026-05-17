/**
 * Unit tests — `/kb/new` 5-step wizard (W20 F4.4 / F8.4).
 *
 * Verifies: Stepper renders 5 step indicators + Step 1 Source heading + first
 * step `aria-current="step"` + Step 4 Multimodal Tier 1 toggles render after
 * navigation + Tier 2 disabled affordances TIER 2 badge.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('@/lib/api/kb', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/kb')>('@/lib/api/kb');
  return { ...actual, kbApi: { ...actual.kbApi, create: vi.fn(), uploadDoc: vi.fn() } };
});

import KbNewPage from '../../app/(app)/kb/new/page';

function renderWizard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <KbNewPage />
    </QueryClientProvider>,
  );
}

describe('KbNewPage 5-step wizard', () => {
  it('renders the Stepper with 5 steps + Step 1 active', () => {
    renderWizard();
    const stepperLabels = ['Source', 'Parsing', 'Chunking', 'Multimodal', 'Review'];
    const stepper = screen.getByLabelText('Wizard steps');
    for (const label of stepperLabels) {
      expect(within(stepper).getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { name: 'Source', level: 2 })).toBeInTheDocument();
    expect(document.querySelector('[aria-current="step"]')).not.toBeNull();
  });

  it('navigates to Step 4 Multimodal and renders Tier 1 + Tier 2 affordances', async () => {
    const user = userEvent.setup();
    renderWizard();

    // Step 1 — fill required fields and click Next.
    await user.type(screen.getByPlaceholderText('e.g. drive_user_manuals'), 'test_kb');
    await user.type(screen.getByPlaceholderText('Drive — User Manuals'), 'Test KB');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 2 — default values valid, click Next.
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 3 — default values valid, click Next.
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 4 Multimodal heading.
    expect(screen.getByRole('heading', { name: 'Multimodal', level: 2 })).toBeInTheDocument();
    // 3 Tier 2 affordances render with TIER 2 badge.
    expect(screen.getAllByText('TIER 2').length).toBeGreaterThanOrEqual(3);
    // Tier 1 active toggle labels.
    expect(screen.getByText('Extract embedded images')).toBeInTheDocument();
    expect(screen.getByText('Slide screenshots')).toBeInTheDocument();
    expect(screen.getByText('Return images in chat')).toBeInTheDocument();
  });
});
