'use client';

/**
 * TanStack Query Provider for Admin views (W2 D5 F9 baseline).
 *
 * Client component — hosts QueryClient context across admin tree. Per CLAUDE.md
 * §3.2 frontend "use client" required for context providers.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
