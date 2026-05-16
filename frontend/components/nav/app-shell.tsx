'use client';

/**
 * C09/C10 unified application shell — W18 F1 (per ADR-0024 + architecture.md v6 §5.0);
 * W20 F1 polish (per ADR-0032 absorbed scope):
 *   - F1.1 + topbar `<NotificationsMenu>` between search and language toggle.
 *   - F1.2 Topbar `<WorkspaceSwitcher>` disabled affordance (multi-tenancy is Tier 2
 *     per architecture.md §11 — fixes the W19 F1 §2.3 leak where the prototype showed
 *     an enabled workspace switcher).
 *   - F1.2 Language toggle now wraps its `disabled` button in `<DisabledAffordance>`
 *     (S1 in the W19 F5 catalog — every Tier 2 surface uses the shared component).
 *   - F1.3 Left sidebar grouped into **Main** (Dashboard / Chat / Knowledge Bases) +
 *     **Tools** (Eval Console / Traces) via `<NavGroupHeader>` — same `<nav>` landmark,
 *     visual section headers only.
 *   - F1.4 Labs section deliberately **NOT** rendered (W19 F5.4 Option C — prototype-only;
 *     `/labs/*` routes never ship `frontend/`). Future Tier 2 enablement = add a third
 *     NavSection here behind an env flag, no other change.
 *
 * Generalizes the W12-W15 `<AdminShell>` into the single chrome that wraps
 * **all authenticated views** (Dashboard / Chat / Knowledge Bases / Eval / Traces):
 *   - persistent top bar  : app name → /dashboard + workspace switcher (disabled) +
 *                           global-search trigger (Cmd/Ctrl+K) + notifications +
 *                           disabled language toggle (i18n is Tier 2 §11) + ThemeToggle + UserMenu
 *   - collapsible left sidebar : the 5 functional modules grouped Main + Tools;
 *                                a "focus mode" toggle hides it (persisted) for chat-immersive use
 *   - main content slot
 *   - responsive : the sidebar collapses to an off-canvas Sheet < md
 *
 * Wired into `app/(app)/layout.tsx` by W18 F2. W18 F6 mounted `<GlobalSearch>` here —
 * the top-bar search trigger + the Cmd/Ctrl+K listener both open the quick-jump palette.
 *
 * 100% design-token consumption (Tailwind classes wired to globals.css :root/.dark) —
 * no hardcoded `oklch()` colour arbitrary-values (W15 milestone preserved through W20 F1).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Briefcase,
  ChevronDown,
  Database,
  FlaskConical,
  Languages,
  LayoutDashboard,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from 'lucide-react';

import { UserMenu } from '@/components/auth/user-menu';
import { GlobalSearch } from '@/components/nav/global-search';
import { NotificationsMenu } from '@/components/nav/notifications-menu';
import { ThemeToggle } from '@/components/nav/theme-toggle';
import { Button } from '@/components/ui/button';
import { DisabledAffordance } from '@/components/ui/disabled-affordance';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const APP_NAME = 'EKP';

/** localStorage key for the "focus mode" / sidebar-collapsed preference. */
const SIDEBAR_COLLAPSED_KEY = 'ekp-sidebar-collapsed';

/** Display name for the topbar workspace chip (single-tenant Tier 1 — fixed value). */
const WORKSPACE_LABEL = 'Ricoh · RAPO';

interface NavItem {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
}

interface NavSection {
  /** Section header label shown above the items (small caps, muted). */
  title: string;
  items: NavItem[];
}

/**
 * The 5 functional modules grouped Main + Tools (W20 F1.3 per ADR-0032 absorb).
 * Items still all render under a single `<nav aria-label="Primary">` — section
 * headers are visual organization only, not separate landmarks.
 *
 * Labs section deliberately omitted (W20 F1.4 / F5.4 Option C — no `/labs/*` routes).
 */
const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
      { href: '/chat', label: 'Chat', Icon: MessageSquare },
      { href: '/kb', label: 'Knowledge Bases', Icon: Database },
    ],
  },
  {
    title: 'Tools',
    items: [
      { href: '/eval', label: 'Eval Console', Icon: FlaskConical },
      { href: '/traces', label: 'Traces', Icon: Activity },
    ],
  },
];

function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname() ?? '/';

  // "Focus mode" — collapses the desktop sidebar; persisted to localStorage.
  // Initialised to `false` for SSR-stable hydration; the stored value is read on mount.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1') {
      setCollapsed(true);
    }
  }, []);
  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  // Mobile off-canvas nav (controlled — the trigger lives in the top bar, outside <SheetTrigger>).
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Global search command palette (W18 F6) — opened by the top-bar trigger and by Cmd/Ctrl+K.
  const [searchOpen, setSearchOpen] = useState(false);
  const handleOpenSearch = useCallback(() => setSearchOpen(true), []);
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleOpenSearch();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleOpenSearch]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Persistent top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background px-3 sm:px-4">
        {/* Mobile: hamburger → off-canvas sidebar */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation"
          aria-expanded={mobileNavOpen}
          className="h-9 w-9 md:hidden"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Desktop: focus-mode toggle (collapses the left sidebar — ADR-0024 §5.0) */}
        <Button
          variant="ghost"
          size="icon"
          aria-label={collapsed ? 'Expand sidebar (exit focus mode)' : 'Collapse sidebar (focus mode)'}
          aria-pressed={collapsed}
          title={collapsed ? 'Exit focus mode — show the sidebar' : 'Focus mode — hide the sidebar'}
          className="hidden h-9 w-9 md:inline-flex"
          onClick={toggleCollapsed}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </Button>

        {/* App name → /dashboard (no marketing tagline — internal tool) */}
        <Link
          href="/dashboard"
          className="shrink-0 text-base font-semibold tracking-tight"
        >
          {APP_NAME}
        </Link>

        {/* W20 F1.2 Workspace switcher — disabled affordance (multi-tenancy is Tier 2 per §11).
            Fixes the W19 F1 §2.3 leak where the prototype showed an enabled switcher. */}
        <DisabledAffordance
          reason="Multi-workspace support — Tier 2 per architecture.md §11"
          tier2Trigger="multi-tenancy"
          className="hidden sm:inline-flex"
        >
          <button
            type="button"
            disabled
            aria-label={`Workspace: ${WORKSPACE_LABEL} (multi-workspace coming in a later tier)`}
            className="flex h-9 items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 text-xs text-muted-foreground"
          >
            <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="truncate">{WORKSPACE_LABEL}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </button>
        </DisabledAffordance>

        {/* Global search trigger (centre). Opens <GlobalSearch> (W18 F6); Cmd/Ctrl+K bound above. */}
        {/* `min-w-0` on the button (so the header flex row can shrink it) + on the label span
            (so `truncate` actually truncates within the button's own flex context) — without
            these the label's intrinsic width pushes the top bar past a ≤375px viewport. (BUG-002) */}
        <button
          type="button"
          onClick={handleOpenSearch}
          aria-label="Search (Ctrl+K)"
          className="mx-auto flex h-9 w-full min-w-0 max-w-md items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">Search knowledge bases, traces…</span>
          <kbd className="ml-auto hidden shrink-0 rounded border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
            Ctrl K
          </kbd>
        </button>

        {/* Right cluster */}
        <div className="flex shrink-0 items-center gap-1">
          {/* W20 F1.1 NotificationsMenu (per ADR-0032 absorb; backend optional W19 F2 item 21) */}
          <NotificationsMenu />

          {/* W20 F1.2 Language toggle — now wrapped in <DisabledAffordance> (S1 in W19 F5 catalog).
              i18n (JP/ZH) machinery is Tier 2 per architecture.md §11. */}
          <DisabledAffordance
            reason="Multi-language (JP / ZH) — coming in a later tier"
            tier2Trigger="i18n machinery"
            className="hidden sm:inline-flex"
          >
            <Button
              variant="ghost"
              size="icon"
              disabled
              aria-label="Language (multi-language coming soon)"
              className="h-9 w-9"
            >
              <Languages className="h-5 w-5" />
            </Button>
          </DisabledAffordance>
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar — hidden when focus mode (collapsed) is on */}
        {!collapsed && (
          <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 overflow-y-auto border-r border-border bg-muted/40 p-3 md:block">
            <NavLinks pathname={pathname} />
          </aside>
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-8">
          {children}
        </main>
      </div>

      {/* Mobile off-canvas sidebar */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-4">
          <SheetHeader>
            <SheetTitle className="text-lg">{APP_NAME}</SheetTitle>
          </SheetHeader>
          <NavLinks
            pathname={pathname}
            className="mt-4"
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Global search command palette (Cmd/Ctrl+K) */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

/** Visual-only section header rendered inside the same `<nav>` landmark (W20 F1.3). */
function NavGroupHeader({ title }: { title: string }) {
  return (
    <div
      // `aria-hidden` because this is purely visual organization; the section's
      // items still get their own accessible names via <Link> labels. AT users
      // navigating via the `<nav aria-label="Primary">` landmark hear the items
      // flat, which matches the W18 baseline behaviour the test suite asserts.
      aria-hidden="true"
      className="mt-3 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground first:mt-0"
    >
      {title}
    </div>
  );
}

function NavLinks({
  pathname,
  className,
  onNavigate,
}: {
  pathname: string;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className={cn('flex flex-col gap-1', className)} aria-label="Primary">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="flex flex-col gap-1">
          <NavGroupHeader title={section.title} />
          {section.items.map(({ href, label, Icon }) => {
            const active = isActiveRoute(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                onClick={onNavigate}
                className={cn(
                  'flex min-h-[40px] items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
