'use client';

/**
 * Citation pill `[n]` with hover popover — W20 F3.10 (per ADR-0031 advanced
 * surfaces; architecture.md v6 §5.2).
 *
 * Used by the `footnote` and `inline` citation placement modes (W20 F3.7).
 * Hovering / focusing the pill opens a popover showing the cited chunk's
 * preview text and a deep-link into the source document. The popover is
 * built from a vanilla `<div>` toggled by `onMouseEnter` / `onFocus` —
 * shadcn has no `<Popover>` primitive shipped to this repo yet (Karpathy
 * §1.2 simplicity:add the primitive later if a second use site appears).
 */

import Link from 'next/link';
import { useRef, useState } from 'react';

import type { Citation } from '@/lib/api/query';
import { cn } from '@/lib/utils';

interface CitationPillProps {
  citation: Citation;
  /** 1-based index — what the pill displays. */
  index: number;
  /** Optional click handler — defaults to no-op (the popover is the affordance). */
  onActivate?: () => void;
}

export function CitationPill({ citation, index, onActivate }: CitationPillProps) {
  const [open, setOpen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setOpen(true);
  }
  function scheduleHide() {
    // Small grace period so users can move the mouse into the popover.
    hideTimer.current = setTimeout(() => setOpen(false), 100);
  }

  const sectionLabel =
    citation.section_path.length > 0 ? citation.section_path.join(' › ') : null;

  return (
    <span
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={scheduleHide}
      onFocus={show}
      onBlur={scheduleHide}
    >
      <button
        type="button"
        onClick={onActivate}
        aria-label={`Citation ${index} from ${citation.doc_title}`}
        aria-expanded={open}
        className={cn(
          'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full',
          'border border-accent/30 bg-accent/10 px-1 text-[10px] font-semibold text-accent',
          'hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        )}
      >
        {index}
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 z-20 mb-1 w-72 -translate-x-1/2 rounded-md border border-border bg-popover p-3 text-xs text-popover-foreground shadow-lg"
          onMouseEnter={show}
          onMouseLeave={scheduleHide}
        >
          <div className="font-semibold">
            {citation.chunk_title || '(untitled chunk)'}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {citation.doc_title}
          </div>
          {sectionLabel && (
            <div
              className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground"
              title={sectionLabel}
            >
              {sectionLabel}
            </div>
          )}
          <div className="mt-2 text-[11px] text-muted-foreground">
            score: {citation.relevance_score.toFixed(3)}
          </div>
          <Link
            href={`/kb/${citation.doc_id ? 'drive_user_manuals' : ''}/docs/${citation.doc_id}`}
            className="mt-2 inline-block text-[11px] font-medium text-accent hover:underline"
          >
            Open source document →
          </Link>
        </div>
      )}
    </span>
  );
}
