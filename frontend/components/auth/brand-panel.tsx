/**
 * Auth views shared brand panel — V8 Login + V9 Register split layout (per
 * ui-design-reference-v6.md §2.8 "Brand panel(left)" + §2.9 "(left,same V8)").
 *
 * Server Component (no client state). Hidden < md per responsive baseline so
 * mobile auth flows show form area only. Background uses bg-primary token (warm
 * charcoal Option C); subtle dot-grid CSS pattern overlay via currentColor
 * inherited from text-primary-foreground keeps token discipline (no hardcoded
 * oklch values).
 */

import Link from 'next/link';

export function BrandPanel() {
  return (
    <aside
      className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground md:flex"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative z-10">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          EKP
        </Link>
      </div>
      <div className="relative z-10">
        <p className="text-3xl font-semibold leading-tight md:text-4xl">
          Knowledge,
        </p>
        <p className="text-3xl font-semibold leading-tight md:text-4xl">
          on demand.
        </p>
        <p className="mt-4 max-w-xs text-sm opacity-80">
          Cited answers from your internal manuals — Word, PDF, PowerPoint.
        </p>
      </div>
    </aside>
  );
}
