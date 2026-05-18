/**
 * Unit tests — `<AppShell>` unified application chrome (W22 F1 rebuild per
 * `references/design-mockups/ekp-shell.jsx` strict fidelity).
 *
 * Covers: (1) the 5 sidebar nav modules render under `<nav aria-label="Primary">`,
 * (2) the active route gets `aria-current="page"`, (3) the sidebar toggle button
 * flips the `data-sidebar` attribute on the root `.app` div (collapsed/expanded),
 * (4) the top-bar global-search trigger is present.
 *
 * W22 F8.7 rewrite (2026-05-18): W18 F8.4 baseline asserted the toggle label
 * flips "Collapse sidebar" ↔ "Expand sidebar" but W22 F1 uses a single
 * aria-label "Toggle sidebar (hides left navigation)" + `data-sidebar` state
 * attribute on the root `.app` div (mockup-faithful pattern).
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string | { pathname?: string }; children: React.ReactNode }) => (
    <a href={typeof href === 'string' ? href : (href?.pathname ?? '#')} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/api/kb', () => ({ kbApi: { list: vi.fn(async () => []) } }));

import { AppShell } from '@/components/nav/app-shell';

function renderShell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AppShell>
        <div>page body</div>
      </AppShell>
    </QueryClientProvider>,
  );
}

describe('AppShell', () => {
  it('renders the 5 sidebar nav modules', () => {
    renderShell();
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
    // Use prefix regex — some links have a `nav-tail` badge (Chat "Cmd↵",
    // Knowledge "5") whose text contributes to the accessible name.
    for (const label of ['Dashboard', 'Chat', 'Knowledge', 'Eval', 'Traces']) {
      expect(
        screen.getByRole('link', { name: new RegExp(`^${label}`) }),
      ).toBeInTheDocument();
    }
  });

  it('marks the active route with aria-current="page"', () => {
    renderShell();
    expect(
      screen.getByRole('link', { name: /^Dashboard/ }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getByRole('link', { name: /^Chat/ }),
    ).not.toHaveAttribute('aria-current');
  });

  it('the sidebar toggle flips data-sidebar attribute on the .app root', async () => {
    const { container } = renderShell();
    const appRoot = container.querySelector('div.app');
    expect(appRoot).not.toBeNull();
    expect(appRoot).toHaveAttribute('data-sidebar', 'expanded');
    await userEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    expect(appRoot).toHaveAttribute('data-sidebar', 'collapsed');
  });

  it('renders the top-bar global-search trigger', () => {
    renderShell();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });
});
