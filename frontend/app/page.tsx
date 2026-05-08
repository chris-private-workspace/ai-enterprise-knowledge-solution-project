/**
 * V7 Landing page (`/`) — public entry per architecture.md v6 §5.9 + ADR-0015.
 *
 * W13 D1 F1.2 placeholder stub: F1 only ensures the routing slot is ready —
 * F2 deliverable fills in Hero / 3 feature cards / How-it-works / Footer per
 * ui-design-reference-v6.md §2.7 wireframe. Server Component (no client hooks
 * needed; public route).
 */

import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        Enterprise Knowledge Platform
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Get answers from your documents — with citations.
      </p>
      <p className="mt-8 text-xs text-muted-foreground">
        V7 Landing placeholder — full layout lands W13 F2.
      </p>
      <Link
        href="/chat"
        className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Go to Chat →
      </Link>
    </main>
  );
}
