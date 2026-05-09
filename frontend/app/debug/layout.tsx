/**
 * Debug View layout — wraps /debug/[traceId] routes with admin shell
 * (sidebar + breadcrumb + UserMenu) per architecture.md v6 §5.7 V6 +
 * design ref §2.6 wireframe.
 *
 * Mirrors frontend/app/admin/layout.tsx + frontend/app/eval/layout.tsx
 * (AuthProvider + QueryProvider + AdminShell) since /debug shares admin
 * nav + theme context + protected routing. SEGMENT_LABELS in admin-shell.tsx
 * already covers `debug` segment for breadcrumb auto-derivation.
 *
 * W15 D2 F2 deviation logged plan §7 changelog (D2) — /debug previously
 * standalone (W1 skeleton no layout) per actual code grep, plan literal
 * "NEW route" stale (file already exists as W1 skeleton).
 */

import { QueryProvider } from '@/lib/providers/query-provider';
import { AuthProvider } from '@/lib/providers/auth-provider';
import { AdminShell } from '@/components/nav/admin-shell';

export default function DebugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <QueryProvider>
        <AdminShell>{children}</AdminShell>
      </QueryProvider>
    </AuthProvider>
  );
}
