'use client';

/**
 * V3 KB List (`/kb`) — W22 F5 direct-copy from mockup
 * `references/design-mockups/ekp-page-kb.jsx:5-137` PageKbList + KbCard +
 * KbTable (per CLAUDE.md §5.7 H7 strict fidelity 2026-05-18).
 *
 * Mockup layout:
 *   - `.page-header` greeting + subtitle (ADR-0018 namespace note) + view toggle
 *     `<seg>` + Export btn + New KB btn
 *   - Filter bar — search wrap + status/tag chips + right-aligned count meta
 *   - `.kb-grid` cards OR `<KbTable>` based on view state
 *
 * Preserved from W20 F4.3 (per W22 plan §0):
 *   - `useQuery(kbApi.list)` for data
 *   - `localStorage['ekp-kb-list-view']` for grid/table preference
 *   - Status filter (indexed / empty / degraded / all) + search + sort
 *
 * Real KbStatus schema lacks mockup fields (status / indexing_progress /
 * recall_at_5 / tags / owner) → graceful defaults: derive `status` from
 * data shape (archived / empty / has-docs) ;recall@5 / tags / owner shown
 * as "—" placeholders until backend ships those fields.
 */

import {
  Database,
  Download,
  FileText,
  Filter,
  Layers,
  MoreHorizontal,
  Plus,
  Search,
  Tag,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { kbApi, type KbStatus } from '@/lib/api/kb';

type StatusKind = 'indexed' | 'empty' | 'archived';
type StatusFilter = StatusKind | 'all';
type ViewKind = 'grid' | 'table';

// i18n keys under the `KbList` message namespace (W103 F4 externalize).
const STATUS_FILTER_KEY: Record<StatusFilter, string> = {
  all: 'statusAll',
  indexed: 'statusIndexed',
  empty: 'statusEmpty',
  archived: 'statusArchived',
};

const VIEW_KEY = 'ekp-kb-list-view';

function deriveStatus(kb: KbStatus): StatusKind {
  if (kb.archived) return 'archived';
  if (kb.total_documents === 0) return 'empty';
  return 'indexed';
}

function formatRelative(
  iso: string | null | undefined,
  t: ReturnType<typeof useTranslations>,
): string {
  if (!iso) return '—';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '—';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return t('relativeJustNow');
  if (mins < 60) return t('relativeMinutes', { mins });
  if (mins < 60 * 24) return t('relativeHours', { hours: Math.floor(mins / 60) });
  return t('relativeDays', { days: Math.floor(mins / 60 / 24) });
}

function sortByLastIndexed(a: KbStatus, b: KbStatus): number {
  const av = a.last_indexed_at ?? '';
  const bv = b.last_indexed_at ?? '';
  return bv.localeCompare(av);
}

export default function KbListPage() {
  const t = useTranslations('KbList');
  const query = useQuery<KbStatus[]>({
    queryKey: ['kb', 'list'],
    queryFn: kbApi.list,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [view, setView] = useState<ViewKind>('grid');

  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_KEY);
    if (stored === 'grid' || stored === 'table') setView(stored);
  }, []);

  function pickView(next: ViewKind) {
    setView(next);
    window.localStorage.setItem(VIEW_KEY, next);
  }

  const visible = useMemo(() => {
    const rows = query.data ?? [];
    const term = search.trim().toLowerCase();
    const filteredBySearch = term
      ? rows.filter((kb) =>
          [kb.name, kb.kb_id, kb.description]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(term)),
        )
      : rows;
    const filteredByStatus =
      statusFilter === 'all'
        ? filteredBySearch
        : filteredBySearch.filter((kb) => deriveStatus(kb) === statusFilter);
    return [...filteredByStatus].sort(sortByLastIndexed);
  }, [query.data, search, statusFilter]);

  const totalDocs = (query.data ?? []).reduce(
    (s, k) => s + k.total_documents,
    0,
  );

  return (
    <div className="content">
      <div className="content-wide">
        {/* Page header — mockup lines 12-31 */}
        <div className="page-header">
          <div>
            <h1 className="page-title">{t('title')}</h1>
            <p className="page-subtitle">
              {t('subtitlePrefix')}
              <span className="mono">ekp-kb-&lt;kb_id&gt;-v1</span>
              {t('subtitleSuffix')}
            </p>
          </div>
          <div className="page-actions">
            <div className="seg">
              <button
                type="button"
                className="seg-btn"
                data-active={view === 'grid'}
                onClick={() => pickView('grid')}
              >
                <Layers size={13} /> {t('viewGrid')}
              </button>
              <button
                type="button"
                className="seg-btn"
                data-active={view === 'table'}
                onClick={() => pickView('table')}
              >
                <Filter size={13} /> {t('viewTable')}
              </button>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled
              title={t('exportTitle')}
              style={{ opacity: 0.5, cursor: 'default' }}
            >
              <Download size={13} /> {t('export')}
            </button>
            <Link href="/kb/new" className="btn btn-primary btn-sm">
              <Plus size={13} /> {t('newKb')}
            </Link>
          </div>
        </div>

        {/* Filter bar — mockup lines 34-43 */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 16,
            alignItems: 'center',
          }}
        >
          <div className="input-search-wrap" style={{ flex: 1, maxWidth: 320 }}>
            <span className="icon-leading">
              <Search size={14} />
            </span>
            <input
              className="input"
              placeholder={t('filterPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter — cycle on click;backend `archived` flag drives the
              filterable set (W22 B-i policy:preserve mockup button + cycle via
              backend-known states until full `status` field lands). */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const order: StatusFilter[] = ['all', 'indexed', 'empty', 'archived'];
              const idx = order.indexOf(statusFilter);
              setStatusFilter(order[(idx + 1) % order.length]!);
            }}
            title={t('statusCycleTitle')}
          >
            <Filter size={13} /> {t(STATUS_FILTER_KEY[statusFilter])}
          </button>

          {/* Tag filter — mockup line 40 (per W22 B-i policy:render mockup
              button + disabled until backend `tags[]` field lands;tag
              filtering is pending-Beta-data,not Tier 2). */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled
            title={t('tagTitle')}
            style={{ opacity: 0.5, cursor: 'default' }}
          >
            <Tag size={13} /> {t('tagAny')}
          </button>

          <div className="spacer" style={{ flex: 1 }} />
          <div className="text-xs muted mono">
            {t('countMeta', {
              visible: visible.length,
              total: (query.data ?? []).length,
              docs: totalDocs,
            })}
          </div>
        </div>

        {/* Body — grid or table */}
        {query.isLoading ? (
          <div
            className="text-xs muted"
            style={{ padding: '48px 18px', textAlign: 'center' }}
          >
            {t('loading')}
          </div>
        ) : visible.length === 0 ? (
          <KbEmpty
            hasFilter={
              search.trim().length > 0 || statusFilter !== 'all'
            }
          />
        ) : view === 'grid' ? (
          <div className="kb-grid">
            {visible.map((kb) => (
              <KbCard key={kb.kb_id} kb={kb} />
            ))}
          </div>
        ) : (
          <KbTable rows={visible} />
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// KbCard — mockup lines 57-86
// ──────────────────────────────────────────────────────────────────────────

function KbCard({ kb }: { kb: KbStatus }) {
  const t = useTranslations('KbList');
  const status = deriveStatus(kb);
  return (
    <Link
      href={`/kb/${kb.kb_id}`}
      className="kb-card"
      style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}
    >
      <div className="kb-card-head">
        <div className="kb-icon">
          <Database size={18} />
        </div>
        {status === 'archived' ? (
          <span className="badge badge-muted">
            <span className="badge-dot" /> ARCHIVED
          </span>
        ) : status === 'empty' ? (
          <span className="badge badge-info">
            <span className="badge-dot" /> EMPTY
          </span>
        ) : (
          <span className="badge badge-success">
            <span className="badge-dot" /> READY
          </span>
        )}
      </div>
      <div>
        <div className="kb-title">{kb.name || kb.kb_id}</div>
        <div className="kb-desc">{kb.description || '—'}</div>
      </div>
      {/* Tags slot — mockup lines 75-77 (W22 B-i:empty until backend `tags[]`
          field lands;preserves mockup DOM slot for spacing fidelity). */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }} />
      <div className="kb-meta">
        <span>
          <FileText size={11} /> {kb.total_documents}
        </span>
        <span>
          <Layers size={11} /> {kb.total_chunks.toLocaleString()}
        </span>
        {/* R@5 — mockup line 81 (W22 B-i:"—%" until backend `recall_at_5` field). */}
        <span>
          <Zap size={11} /> R@5 —%
        </span>
        <span style={{ marginLeft: 'auto' }}>
          {formatRelative(kb.last_indexed_at, t)}
        </span>
      </div>
    </Link>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// KbTable — mockup lines 88-137
// ──────────────────────────────────────────────────────────────────────────

function KbTable({ rows }: { rows: KbStatus[] }) {
  const t = useTranslations('KbList');
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>{t('colName')}</th>
            <th>{t('colStatus')}</th>
            <th>{t('colChunkStrategy')}</th>
            <th className="col-num">{t('colDocs')}</th>
            <th className="col-num">{t('colChunks')}</th>
            <th className="col-num">{t('colStorage')}</th>
            <th className="col-num">R@5</th>
            <th>{t('colOwner')}</th>
            <th className="col-num">{t('colLastIndexed')}</th>
            <th className="col-shrink" aria-label={t('rowActions')} />
          </tr>
        </thead>
        <tbody>
          {rows.map((kb) => {
            const status = deriveStatus(kb);
            const chunkStrategy =
              (kb as KbStatus & { config?: { chunk_strategy?: string } })
                .config?.chunk_strategy ?? '—';
            return (
              <tr key={kb.kb_id}>
                <td>
                  <Link
                    href={`/kb/${kb.kb_id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div className="kb-icon" style={{ width: 26, height: 26 }}>
                      <Database size={13} />
                    </div>
                    <div>
                      <div className="table-row-link">{kb.name || kb.kb_id}</div>
                      <div className="text-xs muted mono">
                        ekp-kb-{kb.kb_id}-v1
                      </div>
                    </div>
                  </Link>
                </td>
                <td>
                  {status === 'archived' ? (
                    <span className="badge badge-muted">
                      <span className="badge-dot" /> ARCHIVED
                    </span>
                  ) : status === 'empty' ? (
                    <span className="badge badge-info">
                      <span className="badge-dot" /> EMPTY
                    </span>
                  ) : (
                    <span className="badge badge-success">
                      <span className="badge-dot" /> READY
                    </span>
                  )}
                </td>
                <td>
                  <span className="badge badge-muted">{chunkStrategy}</span>
                </td>
                <td className="col-num">{kb.total_documents}</td>
                <td className="col-num">{kb.total_chunks.toLocaleString()}</td>
                <td className="col-num">{kb.storage_size_mb.toFixed(1)} MB</td>
                {/* R@5 — W22 B-i placeholder until backend `recall_at_5` field */}
                <td className="col-num">—%</td>
                {/* Owner — W22 B-i placeholder until backend `owner` field */}
                <td>—</td>
                <td className="col-num text-xs">
                  {formatRelative(kb.last_indexed_at, t)}
                </td>
                <td className="col-shrink">
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-xs"
                    title={t('rowActions')}
                    aria-label={t('rowActions')}
                    onClick={(e) => e.preventDefault()}
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function KbEmpty({ hasFilter }: { hasFilter: boolean }) {
  const t = useTranslations('KbList');
  return (
    <div
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        border: '1px dashed oklch(var(--border))',
        borderRadius: 'var(--radius-md)',
        background: 'oklch(var(--muted) / 0.2)',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'oklch(var(--muted))',
          color: 'oklch(var(--muted-foreground))',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 16px',
        }}
      >
        <Database size={22} />
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          marginBottom: 6,
          color: 'oklch(var(--foreground))',
        }}
      >
        {hasFilter ? t('emptyMatchTitle') : t('emptyTitle')}
      </div>
      <div className="text-xs muted" style={{ marginBottom: 16 }}>
        {hasFilter ? t('emptyMatchDesc') : t('emptyDesc')}
      </div>
      {!hasFilter && (
        <Link href="/kb/new" className="btn btn-primary btn-sm">
          <Plus size={13} /> {t('createKb')}
        </Link>
      )}
    </div>
  );
}
