/**
 * Eval Console layout — wraps /eval routes with admin shell (sidebar +
 * breadcrumb + UserMenu) per architecture.md v6 §5.6 V5 + design ref §2.5
 * wireframe (sidebar shows KB / Eval / Settings nav items).
 *
 * Mirrors frontend/app/admin/layout.tsx (AuthProvider + QueryProvider +
 * AdminShell) since /eval shares admin nav + theme context + protected
 * routing. NavLinks `pathname.startsWith('/eval')` activates "Eval Console"
 * sidebar entry via existing admin-shell NAV_ITEMS.
 *
 * W15 D1 F1 deviation logged plan §7 changelog (D1) — /eval previously
 * standalone (W1 skeleton no layout) per actual code grep, plan literal
 * "rebuild from W12 F4.5 baseline" stale.
 */

import { QueryProvider } from '@/lib/providers/query-provider';
import { AuthProvider } from '@/lib/providers/auth-provider';
import { AdminShell } from '@/components/nav/admin-shell';

export default function EvalLayout({
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
