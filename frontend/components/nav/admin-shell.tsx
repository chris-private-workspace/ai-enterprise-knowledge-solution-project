'use client';

/**
 * C09 admin shell — W12 D4 F4.1-F4.3 rebuild with shadcn primitives.
 *
 * Layout: flat sidebar on md+ desktop / off-canvas Sheet on mobile.
 * Header: shadcn Breadcrumb (auto-derived from pathname) + UserMenu Dropdown.
 *
 * All hardcoded oklch removed; consumes tokens via Tailwind classes wired to
 * CSS custom properties (frontend/app/globals.css :root + .dark).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import { Menu } from 'lucide-react';

import { UserMenu } from '@/components/auth/user-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/kb', label: 'Knowledge Bases' },
  { href: '/eval', label: 'Eval Console' },
];

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname() ?? '/';

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile header */}
      <header className="flex items-center justify-between border-b border-border bg-background px-4 py-2 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              className="h-10 w-10"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-4">
            <SheetHeader>
              <SheetTitle className="text-lg">EKP Admin</SheetTitle>
            </SheetHeader>
            <NavLinks pathname={pathname} className="mt-4" />
          </SheetContent>
        </Sheet>
        <Link href="/admin" className="text-base font-semibold">
          EKP Admin
        </Link>
        <UserMenu />
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-border bg-muted/40 p-4 md:block">
        <Link href="/admin" className="mb-6 block text-lg font-semibold">
          EKP Admin
        </Link>
        <NavLinks pathname={pathname} />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        {/* Desktop header */}
        <header className="hidden items-center justify-between border-b border-border bg-background px-8 py-3 md:flex">
          <BreadcrumbNav pathname={pathname} />
          <UserMenu />
        </header>
        <div className="flex-1 p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}

function NavLinks({
  pathname,
  className,
}: {
  pathname: string;
  className?: string;
}) {
  return (
    <nav className={cn('flex flex-col gap-1', className)}>
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex min-h-[40px] items-center rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function BreadcrumbNav({ pathname }: { pathname: string }) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>EKP</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  const trail = segments.map((seg, i) => ({
    href: '/' + segments.slice(0, i + 1).join('/'),
    label: formatSegment(seg),
    isLast: i === segments.length - 1,
  }));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/admin">EKP</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {trail.map((item) => (
          <Fragment key={item.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

const SEGMENT_LABELS: Record<string, string> = {
  admin: 'Admin',
  kb: 'KB',
  eval: 'Eval',
  debug: 'Debug',
  new: 'New',
  upload: 'Upload',
};

function formatSegment(seg: string): string {
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg];
  // Dynamic segments (KB id / trace id) — truncate long values for breadcrumb fit.
  return seg.length > 24 ? `${seg.slice(0, 10)}…${seg.slice(-6)}` : seg;
}
