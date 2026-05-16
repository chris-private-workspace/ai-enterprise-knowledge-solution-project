/**
 * Shared Tier 2 disabled-affordance component — W20 F1.5 (per W19 F5 catalog §4 spec).
 *
 * Encapsulates the 3 main "Tier 2 — coming later" UI patterns so every Wave A-C
 * surface uses one consistent ARIA + tooltip + visual signal:
 *   - **p1-strict** (default) — `pointer-events-none` + `opacity-60`; the wrapped
 *     element MUST itself be a `disabled` native control (button/input/etc).
 *     For features that are genuinely unavailable Tier 1 (S1 / S2 / A1 / K1-K4 / …).
 *   - **p3-preview** — `opacity-75` + optional inline `TIER 2` badge; for features
 *     visible-but-noninteractive (U1 Power User role row / future ST5 etc).
 *
 * The W19 catalog §4 sketch uses `bg-accent/12` for the badge background;
 * Tailwind's default opacity steps (0/5/10/15/20/25/…) include 10 and 15, so we
 * round to `bg-accent/10` (the visual delta is negligible and we avoid adding a
 * one-off custom opacity step to `tailwind.config.ts`).
 *
 * Grep `<DisabledAffordance` to audit every Tier 2 surface across `frontend/`.
 */

import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type DisabledAffordanceVariant = 'p1-strict' | 'p3-preview';

export interface DisabledAffordanceProps {
  /** Visual + interaction pattern. Defaults to `p1-strict`. */
  variant?: DisabledAffordanceVariant;
  /** Required — what the user sees in the tooltip + announced by AT. */
  reason: string;
  /** Optional Tier 2 trigger note appended to the title (e.g. "Tier 2 — post-W12 governance"). */
  tier2Trigger?: string;
  /** `p3-preview` only — render an inline coral `TIER 2` badge after the children. */
  showBadge?: boolean;
  className?: string;
  children: ReactNode;
}

export function DisabledAffordance({
  variant = 'p1-strict',
  reason,
  tier2Trigger,
  showBadge = false,
  className,
  children,
}: DisabledAffordanceProps) {
  const title = tier2Trigger ? `${reason} · ${tier2Trigger}` : reason;

  return (
    <span
      // `role="img"` on p3-preview makes AT announce the wrapped preview as a single
      // unit (so the "Power User" badge + the TIER 2 chip read together).
      role={variant === 'p3-preview' ? 'img' : undefined}
      aria-disabled="true"
      aria-label={title}
      title={title}
      className={cn(
        'inline-flex items-center gap-2',
        // p1-strict: kill all pointer events so the wrapped <button disabled> can't be
        // accidentally re-enabled by parent CSS, and dim it. p3-preview keeps clicks
        // possible (e.g. an inert row in a matrix) but visually retreats.
        variant === 'p1-strict' ? 'opacity-60 pointer-events-none' : 'opacity-75',
        className,
      )}
    >
      {children}
      {showBadge && (
        <Badge
          variant="outline"
          className="bg-accent/10 text-accent border-accent/30"
        >
          TIER 2
        </Badge>
      )}
    </span>
  );
}
