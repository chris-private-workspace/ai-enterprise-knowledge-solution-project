'use client';

/**
 * CRAG strip indicator — W20 F3.12 (per ADR-0031 advanced surfaces;
 * architecture.md v6 §3.5 CRAG L2).
 *
 * Renders a small horizontal strip above an assistant message when the
 * response was refined by the CRAG L2 correction loop (W4 D1 F1). In Tier 1
 * the SSE streaming path is L3-only per architecture.md §3.5 ("token-by-token
 * UX precludes mid-stream rewrite") — so this strip stays dormant in the
 * /chat surface today but the wiring is in place for the Wave B+ L3 streaming
 * CRAG enable. Non-stream `/query` callers (eg eval) already see the data on
 * `QueryResponse.crag_triggered`.
 *
 * `crag_reasoning` is deliberately omitted per W20 F3.13 (Karpathy §1.2
 * simplicity — Wave B+ candidate).
 */

import { Sparkles } from 'lucide-react';

interface CragStripProps {
  cragTriggered: boolean;
  cragIterations: number;
}

export function CragStrip({ cragTriggered, cragIterations }: CragStripProps) {
  if (!cragTriggered) return null;
  return (
    <div
      role="status"
      className="mb-2 flex items-center gap-2 rounded-sm border border-accent/30 bg-accent/10 px-2 py-1 text-[11px] text-accent"
    >
      <Sparkles className="h-3 w-3" />
      <span>
        CRAG triggered — {cragIterations}{' '}
        {cragIterations === 1 ? 'iteration' : 'iterations'}
      </span>
    </div>
  );
}
