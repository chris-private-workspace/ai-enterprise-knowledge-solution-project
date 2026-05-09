'use client';

/**
 * V6 Debug View (`/debug/[traceId]`) — per architecture.md v6 §5.7 view 6 +
 * design ref §2.6 wireframe.
 *
 * W15 D2 F2 implementation — REWRITE replacing W1 skeleton 15-line placeholder.
 * Layout: trace header (Trace ID + Total ms + cost summary) + 6-stage pipeline
 * timeline (custom Collapsible per stage with chevron rotation) + Open in
 * Langfuse link.
 *
 * F2 deviations logged plan §7 changelog 2026-06-10 (D2):
 * 1. F2.1 "NEW route" — file actually exists as W1 skeleton 15-line placeholder
 *    per Karpathy §1.1 think-before-coding upfront grep verification (6th
 *    occurrence of plan literal vs actual code verification gap pattern).
 * 2. F2.2 "9-stage timeline" — design ref §2.6 wireframe + plan F2.2 own
 *    enumeration agree on 6 stages (Query Preprocessor / Hybrid Retrieval /
 *    Reranker / CRAG Confidence Judge / LLM Synthesis / Final Response);
 *    plan internal inconsistency between "9-stage" header + 6-enumerated
 *    stages → align with wireframe 6-stage spec.
 * 3. F2.3 "shadcn Accordion (W12 D3 installed)" — Accordion NOT in W12 D3
 *    19-primitive install list per Glob check; design ref §2.6 explicitly
 *    permits "shadcn Accordion OR custom Collapsible primitive";采 custom
 *    Collapsible (useState + ChevronDown rotation transition) per Karpathy
 *    §1.2 simplicity-first + H2 vendor lock (no new dependency).
 * 4. F2.1 trace data display — backend GET /debug/trace/{trace_id} returns 501
 *    NOT_IMPLEMENTED stub per W3+ implementation per Langfuse correlation;
 *    stub mitigation pattern (placeholder stage scaffold + stub note +
 *    Langfuse link still works using traceId from URL) per W14/W15 F1 precedent.
 */

import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  DollarSign,
  ExternalLink,
  Timer,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api-client';
import { debugApi, type PipelineStageMetric, type TraceData } from '@/lib/api/debug';
import { cn } from '@/lib/utils';

interface PipelineStage {
  id: number;
  name: string;
  vendor?: string;
  description: string;
}

// 6-stage pipeline per architecture.md v6 §3.5 + design ref §2.6 wireframe.
// Plan F2.2 literal "9-stage" inconsistent with own enumeration + wireframe;
// aligned with wireframe spec per Karpathy §1.4 verifiable goal-driven match
// to design ref. Stage names + vendor tags chosen to match plan F2.2
// enumeration verbatim (per W6 demo-prep.md vendor lock context).
const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 1,
    name: 'Query Preprocessor',
    description: 'Tokenize, normalize, optional intent classification',
  },
  {
    id: 2,
    name: 'Hybrid Retrieval',
    description: 'BM25 top-50 + Vector top-50 + RRF fusion → unique candidates',
  },
  {
    id: 3,
    name: 'Reranker',
    vendor: 'Cohere v4.0-pro',
    description: 'Top-50 candidates → top-K rerank (production lock per Q21 Resolved)',
  },
  {
    id: 4,
    name: 'CRAG Confidence Judge',
    description: 'Pass-through OR re-retrieve below threshold (default 0.70)',
  },
  {
    id: 5,
    name: 'LLM Synthesis',
    vendor: 'gpt-5.5',
    description: 'Synthesize answer with citations + refusal logic for OOS',
  },
  {
    id: 6,
    name: 'Final Response',
    description: 'Citation linking + cost calculation + Langfuse trace publish',
  },
];

export default function DebugTracePage({
  params,
}: {
  params: { traceId: string };
}) {
  const traceId = params.traceId;
  const langfuseUrl = `https://langfuse.example.com/trace/${encodeURIComponent(
    traceId,
  )}`;

  const query = useQuery<TraceData>({
    queryKey: ['debug', 'trace', traceId],
    queryFn: () => debugApi.getTrace(traceId),
    retry: false,
  });

  const stubMode =
    query.error instanceof ApiError && query.error.status === 501;
  const otherError = query.isError && !stubMode;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Button asChild variant="ghost" size="sm">
            <Link href="/eval">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Eval Console
            </Link>
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              Trace inspection
            </h1>
            <p className="mt-1 truncate font-mono text-sm text-muted-foreground">
              {traceId}
            </p>
          </div>
          <Button asChild variant="outline">
            <a
              href={langfuseUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in Langfuse
            </a>
          </Button>
        </div>
      </header>

      <SummaryCard
        report={query.data}
        loading={query.isLoading}
        stubMode={stubMode}
      />

      {otherError && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm">
          Failed to load trace:{' '}
          {String((query.error as Error)?.message ?? 'unknown')}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Pipeline timeline (6 stages)
          </CardTitle>
          <CardDescription>
            Per-stage duration, cost, and data preview per architecture.md v6
            §3.5 + design ref §2.6 wireframe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {PIPELINE_STAGES.map((stage) => (
            <PipelineStageCollapsible
              key={stage.id}
              stage={stage}
              metric={
                query.data?.stages?.[String(stage.id)] ?? null
              }
              loading={query.isLoading}
              stubMode={stubMode}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  report,
  loading,
  stubMode,
}: {
  report: TraceData | undefined;
  loading: boolean;
  stubMode: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (stubMode) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-medium">Trace data pending backend implementation</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Backend `GET /debug/trace/&#123;trace_id&#125;` is W3+ stub —
            pending Langfuse correlation per architecture.md §5.7. Pipeline
            timeline below shows the 6-stage scaffold; per-stage metrics will
            populate once trace API lands. Open in Langfuse link uses traceId
            from URL and works independently.
          </p>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="font-mono text-[10px] uppercase tracking-wide">
            Latency
          </CardDescription>
          <CardTitle className="text-sm">Total duration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-2xl font-semibold">
            <Timer className="h-5 w-5 text-muted-foreground" />
            {report.total_ms.toLocaleString()} ms
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="font-mono text-[10px] uppercase tracking-wide">
            Cost
          </CardDescription>
          <CardTitle className="text-sm">Total spend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-2xl font-semibold">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            {report.total_cost_usd.toFixed(4)}
          </div>
        </CardContent>
      </Card>
      <Card className="sm:col-span-1">
        <CardHeader className="pb-2">
          <CardDescription className="font-mono text-[10px] uppercase tracking-wide">
            Query
          </CardDescription>
          <CardTitle className="line-clamp-2 text-sm">
            {report.query}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            KB: {report.kb_id ?? '—'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function PipelineStageCollapsible({
  stage,
  metric,
  loading,
  stubMode,
}: {
  stage: PipelineStage;
  metric: PipelineStageMetric | null;
  loading: boolean;
  stubMode: boolean;
}) {
  const [open, setOpen] = useState(false);

  const durationLabel = (() => {
    if (loading) return '…';
    if (stubMode || !metric) return '—';
    return `${metric.duration_ms.toLocaleString()} ms`;
  })();

  const costLabel = (() => {
    if (!metric || metric.cost_usd === null || metric.cost_usd === undefined) {
      return null;
    }
    return `$${metric.cost_usd.toFixed(4)}`;
  })();

  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-md p-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <div className="flex min-w-0 items-center gap-3">
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
          <span className="truncate font-medium">
            Stage {stage.id} — {stage.name}
            {stage.vendor ? (
              <span className="ml-1 text-muted-foreground">
                ({stage.vendor})
              </span>
            ) : null}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3 font-mono text-xs text-muted-foreground">
          {costLabel ? <span>{costLabel}</span> : null}
          <span>{durationLabel}</span>
        </div>
      </button>
      {open ? (
        <div className="border-t border-border p-3">
          <p className="text-sm text-muted-foreground">{stage.description}</p>
          {stubMode || !metric ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Stage details pending backend trace API + Langfuse correlation.
            </p>
          ) : (
            <StageDetail metric={metric} />
          )}
        </div>
      ) : null}
    </div>
  );
}

function StageDetail({ metric }: { metric: PipelineStageMetric }) {
  return (
    <div className="mt-3 space-y-3 text-sm">
      {metric.input_preview ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Input
          </p>
          <pre className="mt-1 overflow-x-auto rounded-md bg-muted/40 p-2 font-mono text-xs">
            {metric.input_preview}
          </pre>
        </div>
      ) : null}
      {metric.output_preview ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Output
          </p>
          <pre className="mt-1 overflow-x-auto rounded-md bg-muted/40 p-2 font-mono text-xs">
            {metric.output_preview}
          </pre>
        </div>
      ) : null}
      {metric.details && Object.keys(metric.details).length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Details
          </p>
          <pre className="mt-1 overflow-x-auto rounded-md bg-muted/40 p-2 font-mono text-xs">
            {JSON.stringify(metric.details, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
