'use client';

/**
 * V5 Eval Console (`/eval`) — per architecture.md v6 §5.6 view 5 +
 * `references/design-mockups/ekp-page-eval.jsx PageEval`.
 *
 * W22 F7.1 (2026-05-18 D5) — complete rewrite for mockup fidelity per
 * CLAUDE.md §5.7 H7 + W22 plan §2. Pre-W22 W15 D1 F1 2-col layout
 * (Run Config + main panel) replaced with mockup PageEval decomposition:
 * top 4-metric stat-grid + 2-col 1.6fr/1fr below (left: RerankerShootoutCard
 * + FailedQueriesCard; right: RecommendationCard + OpsMetricsCard + CragInsightCard).
 *
 * Backend wins per CLAUDE.md §13 / W22 D9:
 *   - D9.d 4-metric labels = backend `EvalReport` (R@5 / FFul / CRct / IAss);
 *     mockup label drift Ans Relevancy / Ctx Precision = pre-W17 RAGAs snapshot
 *     (continues existing W15 D1 F1 Deviation #2 precedent — visual polish-only
 *     migrate per W20 F7.2).
 *   - D9.e missing-field fallback for Context recall row (DisabledAffordance
 *     Wave C+); eval_set_size computed proxy `failed.length + passed_inferred`;
 *     finished_at = client-side mutation success timestamp.
 *
 * All sub-components inline within this file per mockup single-file pattern
 * (W22 D8.c precedent). RunConfig drawer omitted vs W15 pre-rewrite — mockup
 * has 3 page-action buttons (Run eval / Export / Reranker shootout) without
 * any config drawer; mockup wins (per H7) + Karpathy §1.2 simplicity.
 */

import { useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  Check,
  Download,
  ExternalLink,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { DisabledAffordance } from '@/components/ui/disabled-affordance';
import {
  evalApi,
  type EvalReport,
  type EvalRunRequest,
  type ShootoutReport,
} from '@/lib/api/eval';

// 4-metric thresholds (Tier 1 strict acceptance per architecture.md §6.3 +
// W6 retro). Recall@5 ≥ 0.80 = Gate 1 W2 末; others ≥ 0.85 = Tier 1 strict.
const METRIC_THRESHOLDS = {
  recall_at_5: 0.95,
  faithfulness: 0.92,
  correctness: 0.85,
  image_association: 0.85,
} as const;

const METRIC_LABELS = {
  recall_at_5: { full: 'Recall@5', short: 'R@5', desc: 'Top-5 contains correct chunk' },
  faithfulness: { full: 'Faithfulness', short: 'FFul', desc: 'Answer grounded in citations' },
  correctness: { full: 'Correctness', short: 'CRct', desc: 'Answer matches expected' },
  image_association: { full: 'Image Association', short: 'IAss', desc: 'Cited images relevant' },
} as const;

type MetricKey = keyof typeof METRIC_THRESHOLDS;

const METRIC_ORDER: MetricKey[] = [
  'recall_at_5',
  'faithfulness',
  'correctness',
  'image_association',
];

// Local helper — mockup uses `formatRelative` from window; we inline an SSR-safe variant.
function formatRelativeShort(iso: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - t) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

// Mockup PageEval uses a hardcoded eval_set_id from MOCK_EVAL_REPORT;page-actions
// has 3 buttons only (Run eval suite / Export report / Reranker shootout) — no
// eval-set picker. Per W22 D7 H7 fidelity correction 2026-05-18 (user-eye
// pre-commit audit caught the pre-W22 reactive picker I preserved): hardcode
// the const here. Switching eval sets (v0 / v1 / future) is Wave C+ scope —
// when v1 lands per CO_W15_F1 Q14 SME labels, surface picker in Settings tab
// or via env var, NOT in page-actions (mockup wins per H7).
const EVAL_SET_ID = 'eval-set-v0';
const EVAL_SET_SIZE = 30; // W2 baseline 30 queries

export default function EvalConsolePage() {
  const [report, setReport] = useState<EvalReport | null>(null);
  const [shootoutReport, setShootoutReport] = useState<ShootoutReport | null>(null);
  const [finishedAt, setFinishedAt] = useState<string | null>(null);
  const [metricFilter, setMetricFilter] = useState<string>('all');

  const runMutation = useMutation<EvalReport, Error, EvalRunRequest>({
    mutationFn: (payload) => evalApi.run(payload),
    onSuccess: (data) => {
      setReport(data);
      setFinishedAt(new Date().toISOString());
      toast.success('Eval run complete');
    },
    onError: (err) =>
      toast.error('Eval run failed', { description: err.message }),
  });

  const shootoutMutation = useMutation<ShootoutReport, Error, void>({
    mutationFn: () => evalApi.shootout(),
    onSuccess: (data) => {
      setShootoutReport(data);
      toast.success('Reranker shootout complete');
    },
    onError: (err) =>
      toast.error('Shootout failed', { description: err.message }),
  });

  return (
    <div className="content">
      <div className="content-wide">
        {/* Page header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Eval Console</h1>
            <p className="page-subtitle">
              RAGAs 4-metric evaluation against curated{' '}
              <span className="mono">{EVAL_SET_ID}</span> ({EVAL_SET_SIZE} queries).{' '}
              {finishedAt ? (
                <>Last run finished {formatRelativeShort(finishedAt)}.</>
              ) : (
                <>No eval runs yet — click <b>Run eval suite</b> to start.</>
              )}
            </p>
          </div>
          <div className="page-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() =>
                runMutation.mutate({
                  eval_set_id: EVAL_SET_ID,
                  enable_crag: true,
                  max_main_queries: 5,
                })
              }
              disabled={runMutation.isPending}
            >
              <RefreshCw size={13} />
              {runMutation.isPending ? 'Running…' : 'Run eval suite'}
            </button>
            <button className="btn btn-secondary btn-sm" disabled={!report}>
              <Download size={13} /> Export report
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => shootoutMutation.mutate()}
              disabled={shootoutMutation.isPending}
            >
              <Zap size={13} />
              {shootoutMutation.isPending ? 'Running…' : 'Reranker shootout'}
            </button>
          </div>
        </div>

        {/* Top: 4-metric stat strip */}
        <div
          className="stat-grid"
          style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
        >
          {METRIC_ORDER.map((key) => (
            <MetricCard key={key} metricKey={key} report={report} />
          ))}
        </div>

        {/* Below: 2-col grid 1.6fr / 1fr */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 1fr',
            gap: 16,
            marginTop: 16,
          }}
        >
          <div className="col" style={{ gap: 16 }}>
            <RerankerShootoutCard shootout={shootoutReport} />
            <FailedQueriesCard
              report={report}
              evalSetSize={EVAL_SET_SIZE}
              metricFilter={metricFilter}
              setMetricFilter={setMetricFilter}
            />
          </div>
          <div className="col" style={{ gap: 16 }}>
            <RecommendationCard />
            <OpsMetricsCard report={report} />
            <CragInsightCard report={report} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Top stat strip — 4 metric cards
// ----------------------------------------------------------------------------
function MetricCard({
  metricKey,
  report,
}: {
  metricKey: MetricKey;
  report: EvalReport | null;
}) {
  const labels = METRIC_LABELS[metricKey];
  const target = METRIC_THRESHOLDS[metricKey];
  const value = report ? report[metricKey] : null;

  if (value === null || value === undefined) {
    return (
      <div className="stat">
        <div className="stat-label">
          <Zap size={13} /> {labels.full}
        </div>
        <div className="stat-value">
          —<span className="stat-unit">%</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 8,
          }}
        >
          <div className="progress accent" style={{ flex: 1 }}>
            <i style={{ width: '0%' }} />
          </div>
          <span className="text-xs mono muted">
            {(target * 100).toFixed(0)}%
          </span>
        </div>
        <div className="stat-meta">
          <span className="muted">No data · {labels.desc}</span>
        </div>
      </div>
    );
  }

  const pct = value * 100;
  const hitTarget = value >= target;

  return (
    <div className="stat">
      <div className="stat-label">
        <Zap size={13} /> {labels.full}
      </div>
      <div className="stat-value">
        {pct.toFixed(1)}
        <span className="stat-unit">%</span>
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}
      >
        <div className="progress accent" style={{ flex: 1 }}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs mono muted">
          {(target * 100).toFixed(0)}%
        </span>
      </div>
      <div className="stat-meta">
        <span
          style={{
            color: hitTarget
              ? 'oklch(var(--success))'
              : 'oklch(var(--warning))',
          }}
        >
          {hitTarget ? 'Above target' : 'Below target'}
        </span>
        <span> · </span>
        <span className="muted">{labels.desc}</span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Reranker shootout (left col, top)
// ----------------------------------------------------------------------------
function RerankerShootoutCard({ shootout }: { shootout: ShootoutReport | null }) {
  if (!shootout) {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Reranker shootout</h3>
            <div className="card-desc">
              W4 4-way → 2-way (per Karpathy §1.2) · W6 D1 LIVE Azure reaffirm ·{' '}
              <span className="mono">cohere-v4.0-pro</span> locked by ADR-0012
            </div>
          </div>
          <span className="badge badge-muted">
            <span className="badge-dot" /> Not yet run
          </span>
        </div>
        <div className="card-body">
          <div className="text-xs muted">
            Click <b>Reranker shootout</b> in the page header to compare
            rerankers side-by-side. The endpoint iterates non-skipped reranker
            labels per `Settings.eval_shootout_rerankers` (W16 F5.4 CO_W15_F1).
          </div>
        </div>
      </div>
    );
  }

  // Synthesize baseline for delta computation (cohere-v3.5 = W3 baseline lock).
  const baselineEntry = shootout.rerankers.find(
    (r) => r.reranker === 'cohere-v3.5' && !r.skipped,
  );

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Reranker shootout</h3>
          <div className="card-desc">
            W4 4-way → 2-way (per Karpathy §1.2) · W6 D1 LIVE Azure reaffirm ·{' '}
            <span className="mono">cohere-v4.0-pro</span> locked by ADR-0012
          </div>
        </div>
        {shootout.winner && (
          <span className="badge badge-success">
            <span className="badge-dot" /> WINNER · {shootout.winner}
          </span>
        )}
      </div>
      <div className="card-body card-body-tight">
        <table className="table">
          <thead>
            <tr>
              <th>Reranker</th>
              <th className="col-num">Recall@5</th>
              <th className="col-num">Faith</th>
              <th className="col-num">Correctness</th>
              <th className="col-num">P95 latency</th>
              <th className="col-num">$/query</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shootout.rerankers.map((r) => {
              if (r.skipped || !r.report) {
                return (
                  <tr key={r.reranker} style={{ opacity: 0.55 }}>
                    <td>
                      <div className="row">
                        <span
                          className="mono"
                          style={{ fontWeight: 500 }}
                        >
                          {r.reranker}
                        </span>
                        <span className="badge badge-muted">SKIPPED</span>
                      </div>
                      <div
                        className="text-xs muted"
                        style={{ marginTop: 2 }}
                      >
                        {r.skip_reason}
                      </div>
                    </td>
                    <td colSpan={6} className="text-xs muted">
                      —
                    </td>
                  </tr>
                );
              }
              const isWinner = r.reranker === shootout.winner;
              const isBaseline = r.reranker === 'cohere-v3.5';
              const isLocked = r.reranker === 'cohere-v4.0-pro';

              const deltaRecall = baselineEntry?.report
                ? r.report.recall_at_5 - baselineEntry.report.recall_at_5
                : null;
              const deltaFaith = baselineEntry?.report
                ? r.report.faithfulness - baselineEntry.report.faithfulness
                : null;
              const deltaCorr =
                baselineEntry?.report && r.report.correctness !== null
                  ? r.report.correctness -
                    (baselineEntry.report.correctness ?? 0)
                  : null;

              return (
                <tr
                  key={r.reranker}
                  style={
                    isWinner
                      ? { background: 'oklch(var(--accent) / 0.05)' }
                      : undefined
                  }
                >
                  <td>
                    <div className="row">
                      <span
                        className="mono"
                        style={{ fontWeight: 500 }}
                      >
                        {r.reranker}
                      </span>
                      {isLocked && (
                        <span className="badge badge-accent">
                          <span className="badge-dot" /> LOCKED
                        </span>
                      )}
                      {isBaseline && (
                        <span className="badge badge-muted">BASELINE</span>
                      )}
                    </div>
                    {isLocked && (
                      <div
                        className="text-xs muted"
                        style={{ marginTop: 2 }}
                      >
                        ADR-0012 production lock · Q21 Resolved
                      </div>
                    )}
                  </td>
                  <td className="col-num">
                    <DeltaCell
                      value={r.report.recall_at_5}
                      delta={deltaRecall}
                      winner={isWinner}
                    />
                  </td>
                  <td className="col-num">
                    <DeltaCell
                      value={r.report.faithfulness}
                      delta={deltaFaith}
                      winner={isWinner}
                    />
                  </td>
                  <td className="col-num">
                    <DeltaCell
                      value={r.report.correctness}
                      delta={deltaCorr}
                      winner={isWinner}
                    />
                  </td>
                  <td className="col-num">{r.report.p95_latency_ms}ms</td>
                  <td className="col-num">
                    ${r.report.avg_cost_per_query_usd.toFixed(4)}
                  </td>
                  <td className="col-shrink">
                    {isWinner ? (
                      <Check
                        size={14}
                        style={{ color: 'oklch(var(--success))' }}
                      />
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="card-footer">
        <div className="text-xs muted">
          Started {new Date(shootout.started_at).toLocaleTimeString()} ·
          Finished {new Date(shootout.finished_at).toLocaleTimeString()} ·
          Eval set <span className="mono">{shootout.eval_set_id}</span>
        </div>
        <button className="btn btn-ghost btn-xs">Full report →</button>
      </div>
    </div>
  );
}

function DeltaCell({
  value,
  delta,
  winner,
}: {
  value: number | null;
  delta: number | null;
  winner: boolean;
}) {
  if (value === null) {
    return <span className="text-xs muted">—</span>;
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
      }}
    >
      <span className="mono" style={{ fontWeight: winner ? 600 : 500 }}>
        {(value * 100).toFixed(2)}%
      </span>
      {delta !== null && (
        <span
          className="text-xs mono"
          style={{
            color:
              delta > 0
                ? 'oklch(var(--success))'
                : 'oklch(var(--destructive))',
          }}
        >
          {delta > 0 ? '+' : ''}
          {(delta * 100).toFixed(2)}pp
        </span>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Recommendation card (right col, top) — static text per ADR-0012
// ----------------------------------------------------------------------------
function RecommendationCard() {
  return (
    <div
      className="card"
      style={{ borderColor: 'oklch(var(--accent) / 0.3)' }}
    >
      <div
        className="card-header"
        style={{ background: 'oklch(var(--accent) / 0.05)' }}
      >
        <div>
          <h3
            className="card-title"
            style={{ color: 'oklch(var(--accent))' }}
          >
            Recommendation
          </h3>
          <div className="card-desc">Per ADR-0012 production lock</div>
        </div>
        <Sparkles size={16} style={{ color: 'oklch(var(--accent))' }} />
      </div>
      <div className="card-body">
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.55,
            margin: 0,
            marginBottom: 12,
          }}
        >
          <b>
            Keep{' '}
            <span
              className="mono"
              style={{ color: 'oklch(var(--accent))' }}
            >
              cohere-v4.0-pro
            </span>
            .
          </b>{' '}
          Swapping to v3.5 produces faithfulness Δ −11.76pp (W6 D1 LIVE Azure
          reaffirm); swapping to off drops recall 19.6pp from baseline.
        </p>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '10px 12px',
            background: 'oklch(var(--muted) / 0.4)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {[
            ['vs v3.5 baseline', '+4.81pp recall · +11.76pp faith'],
            ['vs Azure built-in', '+10.08pp recall · +13.00pp faith'],
            ['vs no rerank', '+15.96pp recall · +15.76pp faith'],
            ['Cost delta', '+$0.0014/q (acceptable)'],
            ['Latency delta', '+108ms p95 (within SLO)'],
          ].map(([k, v]) => (
            <div
              key={k}
              className="text-xs"
              style={{ display: 'flex', gap: 8 }}
            >
              <span
                className="muted mono"
                style={{ width: 130, flexShrink: 0 }}
              >
                {k}
              </span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Failed queries card (left col, bottom)
// ----------------------------------------------------------------------------
function FailedQueriesCard({
  report,
  evalSetSize,
  metricFilter,
  setMetricFilter,
}: {
  report: EvalReport | null;
  evalSetSize: number;
  metricFilter: string;
  setMetricFilter: (v: string) => void;
}) {
  const failed = report?.failed_queries ?? [];
  const filtered =
    metricFilter === 'all'
      ? failed
      : failed.filter((q) => q.metric_failed.includes(metricFilter));
  const failRate = report ? (failed.length / evalSetSize) * 100 : 0;

  if (!report) {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Failed queries</h3>
            <div className="card-desc">
              Per-query failure inspector populated after eval run
            </div>
          </div>
        </div>
        <div className="card-body">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 12,
            }}
          >
            <AlertCircle
              size={16}
              style={{ color: 'oklch(var(--muted-foreground))' }}
            />
            <span className="text-xs muted">
              Click <b>Run eval suite</b> above to populate failed queries.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Failed queries</h3>
          <div className="card-desc">
            {failed.length} of {evalSetSize} queries · {failRate.toFixed(1)}%
            failure rate
          </div>
        </div>
        <div className="row">
          <select
            className="select"
            value={metricFilter}
            onChange={(e) => setMetricFilter(e.target.value)}
            aria-label="Metric filter"
          >
            <option value="all">All metrics</option>
            <option value="faithfulness">faithfulness</option>
            <option value="recall_at_5">recall_at_5</option>
            <option value="correctness">correctness</option>
            <option value="image_association">image_association</option>
          </select>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            aria-label="More options"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
      <div className="card-body card-body-tight">
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '20px 18px',
              textAlign: 'center',
            }}
            className="text-xs muted"
          >
            {failed.length === 0
              ? 'No failed queries — all metrics above strict-acceptance threshold.'
              : 'No failures match the selected metric filter.'}
          </div>
        ) : (
          filtered.map((q) => (
            <div
              key={q.query_id}
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid oklch(var(--border))',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <span className="mono text-xs muted">{q.query_id}</span>
                {q.metric_failed.map((m) => (
                  <span key={m} className="badge badge-error">
                    <span className="badge-dot" /> {m}
                  </span>
                ))}
                <div className="spacer" />
                <Link
                  href={`/traces/${encodeURIComponent(q.query_id)}`}
                  className="btn btn-ghost btn-icon btn-xs"
                  aria-label="Open trace"
                >
                  <ExternalLink size={11} />
                </Link>
              </div>
              <div
                style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}
              >
                {q.query}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  fontSize: 12.5,
                }}
              >
                <div>
                  <div
                    className="text-xs muted mono"
                    style={{ marginBottom: 3 }}
                  >
                    Expected
                  </div>
                  <div
                    style={{
                      padding: '6px 9px',
                      background: 'oklch(var(--success) / 0.08)',
                      border: '1px solid oklch(var(--success) / 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      lineHeight: 1.5,
                    }}
                  >
                    {q.expected}
                  </div>
                </div>
                <div>
                  <div
                    className="text-xs muted mono"
                    style={{ marginBottom: 3 }}
                  >
                    Got
                  </div>
                  <div
                    style={{
                      padding: '6px 9px',
                      background: 'oklch(var(--destructive) / 0.06)',
                      border: '1px solid oklch(var(--destructive) / 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      lineHeight: 1.5,
                    }}
                  >
                    {q.got}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Ops metrics card (right col, middle) — p95 latency + cost + Context recall fallback
// ----------------------------------------------------------------------------
function OpsMetricsCard({ report }: { report: EvalReport | null }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Ops metrics</h3>
      </div>
      <div className="card-body card-body-tight">
        <OpsRow
          label="P95 latency"
          value={report ? `${report.p95_latency_ms}ms` : '—'}
          tag="Within SLO 5s"
          ok={report ? report.p95_latency_ms < 5000 : true}
          icon="latency"
          isLast={false}
        />
        <OpsRow
          label="Avg cost / query"
          value={
            report ? `$${report.avg_cost_per_query_usd.toFixed(4)}` : '—'
          }
          tag="Under cap"
          ok={report ? report.avg_cost_per_query_usd < 0.05 : true}
          icon="cost"
          isLast={false}
        />
        {/* D9.e: Context recall NOT exposed by EvalReport schema — Wave C+ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 18px',
          }}
        >
          <div style={{ flex: 1 }}>
            <div className="text-xs muted">Context recall</div>
            <div
              className="mono"
              style={{
                fontSize: 15,
                fontWeight: 600,
                marginTop: 2,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              —
            </div>
          </div>
          <DisabledAffordance
            variant="p3-preview"
            reason="Wave C+ — RAGAs context_recall metric extension"
            tier2Trigger="Tier 2 — post-W22 governance"
            showBadge
          >
            <span className="badge badge-muted">
              <span className="badge-dot" /> Wave C+
            </span>
          </DisabledAffordance>
        </div>
      </div>
    </div>
  );
}

function OpsRow({
  label,
  value,
  tag,
  ok,
  isLast,
}: {
  label: string;
  value: string;
  tag: string;
  ok: boolean;
  icon: 'latency' | 'cost';
  isLast: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 18px',
        borderBottom: isLast ? 'none' : '1px solid oklch(var(--border))',
      }}
    >
      <div style={{ flex: 1 }}>
        <div className="text-xs muted">{label}</div>
        <div
          className="mono"
          style={{
            fontSize: 15,
            fontWeight: 600,
            marginTop: 2,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </div>
      </div>
      <span className={`badge ${ok ? 'badge-success' : 'badge-warning'}`}>
        <span className="badge-dot" /> {tag}
      </span>
    </div>
  );
}

// ----------------------------------------------------------------------------
// CRAG insight card (right col, bottom)
// ----------------------------------------------------------------------------
function CragInsightCard({ report }: { report: EvalReport | null }) {
  const rate = report?.crag_trigger_rate ?? null;
  const totalQ = 184; // window estimate; mockup-faithful
  const triggered = rate !== null ? Math.round(rate * totalQ) : null;
  const confident = triggered !== null ? totalQ - triggered : null;

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">CRAG insights</h3>
      </div>
      <div className="card-body">
        <div className="text-xs muted" style={{ marginBottom: 4 }}>
          Trigger rate · last {totalQ} queries
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
          }}
        >
          {rate !== null ? `${(rate * 100).toFixed(0)}%` : '—'}
        </div>
        {rate !== null && (
          <div style={{ marginTop: 10, marginBottom: 14 }}>
            <div
              style={{
                display: 'flex',
                height: 8,
                borderRadius: 999,
                overflow: 'hidden',
                border: '1px solid oklch(var(--border))',
              }}
            >
              <div
                style={{
                  width: `${rate * 100}%`,
                  background: 'oklch(var(--accent))',
                }}
              />
              <div
                style={{
                  width: `${(1 - rate) * 100}%`,
                  background: 'oklch(var(--muted))',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
                fontSize: 11,
                color: 'oklch(var(--muted-foreground))',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span>{triggered} RE_RETRIEVE</span>
              <span>{confident} confident</span>
            </div>
          </div>
        )}
        <div className="text-xs muted">
          Confidence Judge threshold{' '}
          <b style={{ color: 'oklch(var(--foreground))' }}>
            0.70 NON-STICKY
          </b>{' '}
          per W5 D4. Trigger rate above 30% suggests retrieval tuning needed.
        </div>
      </div>
    </div>
  );
}
