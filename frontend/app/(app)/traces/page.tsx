'use client';

/**
 * Traces (`/traces`) — the Traces-module index per architecture.md v6 §5.7 +
 * `references/design-mockups/ekp-page-trace.jsx:410 PageTracesList`.
 *
 * W22 F7.2 (2026-05-18 D5) — complete rewrite for mockup fidelity per
 * CLAUDE.md §5.7 H7. Pre-W22 W18 F3 baseline (55-line single-Input thin entry)
 * replaced with mockup PageTracesList 9-col table view, consuming W21 F2
 * backend `GET /traces` shipped `55f876b` (`backend/api/routes/debug.py:42`).
 *
 * Backend wins per CLAUDE.md §13 / W22 D9:
 *   - D9.f User column: `TraceSummary` schema doesn't expose user field —
 *     render placeholder "—" preserving 9-col mockup-faithful structure
 *     (visual polish-only migrate per W20 F7.2 precedent; backend extension
 *     to surface user identity = Wave C+ scope).
 *
 * Filter mapping: 4-button seg (All / Success / Error / CRAG triggered) →
 * backend `?filter=all|errors|crag_triggered`. "Last 24h / 7d / 30d" select
 * → `?since=` ISO 8601 lower-bound.
 *
 * Per-trace deep-fetch (9-stage Langfuse pipeline) is /traces/[traceId] (W22
 * F7.3); the row click handler routes there.
 */

import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  Download,
  ExternalLink,
  Filter,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  tracesApi,
  type TraceSummary,
} from '@/lib/api/traces';

// UI-level filter mode. 'success' is client-side post-filter on top of backend
// `?filter=all` (backend `?filter=` only supports all|errors|crag_triggered);
// added per W22 D6 user-eye audit 2026-05-18 H7 fidelity correction — mockup
// 4-button seg (All/Success/Error/CRAG) must render all 4. Showing-N reflects
// the post-filtered count rather than backend `total` (visual fidelity over
// count-accuracy, same precedent as W20 F7.2 visual-polish-only migrate).
type StatusFilter = 'all' | 'success' | 'errors' | 'crag_triggered';
type TimeWindow = '24h' | '7d' | '30d';

function isoSinceForWindow(window: TimeWindow): string {
  const now = Date.now();
  const offset =
    window === '24h'
      ? 24 * 60 * 60 * 1000
      : window === '7d'
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
  return new Date(now - offset).toISOString();
}

function formatRelativeShort(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - t) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export default function TracesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h');

  const since = useMemo(() => isoSinceForWindow(timeWindow), [timeWindow]);

  // 'success' is a client-side post-filter mode — backend doesn't have a
  // matching `?filter=` value, so we fetch all and filter locally below.
  const backendFilter: 'all' | 'errors' | 'crag_triggered' =
    statusFilter === 'success' ? 'all' : statusFilter;

  const query = useQuery({
    queryKey: ['traces', backendFilter, since],
    queryFn: () =>
      tracesApi.list({
        filter: backendFilter,
        since,
        limit: 50,
      }),
  });

  const items = useMemo(
    () => query.data?.items ?? [],
    [query.data],
  );

  // Client-side filter pipeline: (1) Success post-filter, (2) search fuzzy match.
  const filtered = useMemo(() => {
    let base = items;
    if (statusFilter === 'success') {
      // Success = backend status 'ok' AND no CRAG iterations (the inverse of
      // both Error and CRAG triggered filter modes).
      base = base.filter(
        (t) => t.status === 'ok' && t.crag_iterations === null,
      );
    }
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (t) =>
        t.trace_id.toLowerCase().includes(q) ||
        (t.kb_id ?? '').toLowerCase().includes(q) ||
        t.query_preview.toLowerCase().includes(q),
    );
  }, [items, search, statusFilter]);

  const langfuseHost =
    (typeof process !== 'undefined' &&
      process.env.NEXT_PUBLIC_LANGFUSE_URL) ||
    'https://cloud.langfuse.com';

  return (
    <div className="content">
      <div className="content-wide">
        {/* Page header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Traces</h1>
            <p className="page-subtitle">
              Every <span className="mono">/query</span> call generates a
              9-stage Langfuse trace. Correlated by{' '}
              <span className="mono">trace_id</span>.
            </p>
          </div>
          <div className="page-actions">
            <button className="btn btn-secondary btn-sm">
              <Filter size={13} /> Filter
            </button>
            <button className="btn btn-secondary btn-sm" disabled={!items.length}>
              <Download size={13} /> Export
            </button>
            <a
              className="btn btn-secondary btn-sm"
              href={langfuseHost}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={13} /> Open Langfuse ↗
            </a>
          </div>
        </div>

        {/* Filter + search row */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div
            className="input-search-wrap"
            style={{ flex: '1 1 240px', maxWidth: 340 }}
          >
            <span className="icon-leading">
              <Search size={14} />
            </span>
            <input
              className="input"
              placeholder="Filter by user, KB, trace_id…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Filter traces"
            />
          </div>
          {/* W22 D6 H7 fidelity correction (2026-05-18): mockup 4-button seg
              (All / Success / Error / CRAG triggered) restored. Backend `?filter=`
              only supports 3 values — 'success' is client-side post-filter on top
              of `?filter=all`. Showing-N footer reflects filtered count over the
              backend's `total` (visual fidelity wins per H7 + W20 F7.2 visual-polish-
              only migrate precedent). Previous "drop Success per backend-wins"
              decision was over-extending §13 — §13 covers contract conflicts, not
              visual element removal. */}
          <div className="seg" role="tablist">
            <button
              type="button"
              role="tab"
              className="seg-btn"
              data-active={statusFilter === 'all'}
              aria-selected={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              className="seg-btn"
              data-active={statusFilter === 'success'}
              aria-selected={statusFilter === 'success'}
              onClick={() => setStatusFilter('success')}
            >
              <span className="status-dot ready" /> Success
            </button>
            <button
              type="button"
              role="tab"
              className="seg-btn"
              data-active={statusFilter === 'errors'}
              aria-selected={statusFilter === 'errors'}
              onClick={() => setStatusFilter('errors')}
            >
              <span className="status-dot failed" /> Error
            </button>
            <button
              type="button"
              role="tab"
              className="seg-btn"
              data-active={statusFilter === 'crag_triggered'}
              aria-selected={statusFilter === 'crag_triggered'}
              onClick={() => setStatusFilter('crag_triggered')}
            >
              <span
                className="badge-dot"
                style={{ background: 'oklch(var(--accent))' }}
              />{' '}
              CRAG triggered
            </button>
          </div>
          <div className="spacer" />
          <select
            className="select"
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value as TimeWindow)}
            aria-label="Time window"
          >
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
            <option value="30d">Last 30d</option>
          </select>
        </div>

        {/* 9-col table */}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Trace</th>
                <th>User</th>
                <th>KB</th>
                <th>Query</th>
                <th>CRAG</th>
                <th className="col-num">Latency</th>
                <th className="col-num">Cost</th>
                <th className="col-num">When</th>
                <th className="col-shrink"></th>
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr>
                  <td colSpan={9} className="text-xs muted" style={{ padding: 18 }}>
                    Loading traces…
                  </td>
                </tr>
              ) : query.isError ? (
                <tr>
                  <td colSpan={9} className="text-xs" style={{ padding: 18, color: 'oklch(var(--destructive))' }}>
                    Failed to load traces:{' '}
                    {(query.error as Error)?.message ?? 'Unknown error'}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-xs muted" style={{ padding: 18 }}>
                    No traces match. Status: {query.data?.status ?? '—'}
                    {query.data?.note ? ` · ${query.data.note}` : ''}
                  </td>
                </tr>
              ) : (
                filtered.map((t) => <TraceRow key={t.trace_id} t={t} />)
              )}
            </tbody>
          </table>
        </div>

        {query.data && (
          <div
            className="text-xs muted"
            style={{
              padding: '12px 4px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>
              Showing {filtered.length} of {query.data.total} traces
            </span>
            {query.data.status !== 'ok' && (
              <>
                <span>·</span>
                <span style={{ color: 'oklch(var(--warning))' }}>
                  Langfuse: {query.data.status}
                  {query.data.note ? ` (${query.data.note})` : ''}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TraceRow({ t }: { t: TraceSummary }) {
  const isCrag = t.crag_iterations !== null;

  return (
    <tr style={{ cursor: 'pointer' }}>
      <td>
        <Link
          href={`/traces/${encodeURIComponent(t.trace_id)}`}
          className="mono text-xs"
          style={{ color: 'oklch(var(--accent))' }}
        >
          {t.trace_id.slice(-16)}
        </Link>
      </td>
      {/* D9.f: TraceSummary schema doesn't expose user — placeholder per backend-wins */}
      <td>
        <span className="mono text-xs muted">—</span>
      </td>
      <td>
        {t.kb_id ? (
          <span className="badge badge-muted">{t.kb_id}</span>
        ) : (
          <span className="text-xs muted">—</span>
        )}
      </td>
      <td style={{ maxWidth: 380 }}>
        <Link
          href={`/traces/${encodeURIComponent(t.trace_id)}`}
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: 13,
            display: 'block',
            color: 'inherit',
          }}
        >
          {t.query_preview || <span className="muted">—</span>}
        </Link>
      </td>
      <td>
        {isCrag ? (
          <span className="badge badge-accent">
            <span className="badge-dot" /> {t.crag_iterations}× loop
          </span>
        ) : (
          <span className="text-xs muted">—</span>
        )}
      </td>
      <td className="col-num">{t.duration_ms}ms</td>
      <td className="col-num">${t.cost_usd.toFixed(4)}</td>
      <td className="col-num text-xs">{formatRelativeShort(t.timestamp)}</td>
      <td className="col-shrink">
        <Link
          href={`/traces/${encodeURIComponent(t.trace_id)}`}
          className="btn btn-ghost btn-icon btn-xs"
          aria-label="Open trace detail"
        >
          <ChevronRight size={13} />
        </Link>
      </td>
    </tr>
  );
}
